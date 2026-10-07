import type {
  BoundingBox,
  DictationUnit,
  PositionedWord,
  RawTextItem,
  TextLine,
} from '../types/pdf';

/**
 * Groups raw PDF.js text items into visual lines using coordinate clustering.
 *
 * Strategy:
 * 1. Sort items by Y (top), then X (left).
 * 2. Walk through items; an item joins the current line if its vertical
 *    center falls within a tolerance band of the running line's vertical
 *    center. The tolerance scales with font size so both small captions and
 *    large headings cluster correctly.
 * 3. Within a line, items are ordered left-to-right by X to reconstruct
 *    reading order, and spacing between items is inferred from the gap
 *    between consecutive bounding boxes (so we don't rely on the PDF
 *    containing explicit space characters).
 */
export function groupTextItemsIntoLines(
  items: RawTextItem[],
  pageNumber: number,
): TextLine[] {
  const usable = items.filter((item) => item.text.trim().length > 0);
  if (usable.length === 0) return [];

  const sorted = [...usable].sort((a, b) => {
    const centerA = a.y + a.height / 2;
    const centerB = b.y + b.height / 2;
    if (Math.abs(centerA - centerB) > 0.1) return centerA - centerB;
    return a.x - b.x;
  });

  type Cluster = { items: RawTextItem[]; centerY: number; maxHeight: number };
  const clusters: Cluster[] = [];

  for (const item of sorted) {
    const centerY = item.y + item.height / 2;
    const tolerance = Math.max(item.height, 8) * 0.55;

    let target: Cluster | undefined;
    for (let i = clusters.length - 1; i >= 0; i--) {
      const c = clusters[i];
      if (Math.abs(c.centerY - centerY) <= Math.max(tolerance, c.maxHeight * 0.55)) {
        target = c;
        break;
      }
      // Clusters are roughly sorted by Y already; stop scanning back once far away.
      if (centerY - c.centerY > tolerance * 4) break;
    }

    if (target) {
      target.items.push(item);
      target.maxHeight = Math.max(target.maxHeight, item.height);
      // Recompute a running average center to reduce drift across a long line.
      const n = target.items.length;
      target.centerY = target.items.reduce((s, it) => s + it.y + it.height / 2, 0) / n;
    } else {
      clusters.push({ items: [item], centerY, maxHeight: item.height });
    }
  }

  // Sort clusters top-to-bottom, then build TextLine objects.
  clusters.sort((a, b) => a.centerY - b.centerY);

  const lines: TextLine[] = [];
  clusters.forEach((cluster, idx) => {
    const lineItems = [...cluster.items].sort((a, b) => a.x - b.x);

    const words: PositionedWord[] = [];
    let text = '';
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let maxFontSize = 0;

    lineItems.forEach((item, i) => {
      minX = Math.min(minX, item.x);
      minY = Math.min(minY, item.y);
      maxX = Math.max(maxX, item.x + item.width);
      maxY = Math.max(maxY, item.y + item.height);
      maxFontSize = Math.max(maxFontSize, item.fontSize);

      const prev = lineItems[i - 1];
      let needsSpace = false;
      if (prev) {
        const gap = item.x - (prev.x + prev.width);
        const avgCharWidth = (prev.height || 10) * 0.4;
        needsSpace = gap > avgCharWidth * 0.35;
      }

      if (i > 0 && needsSpace && !text.endsWith(' ') && item.text.trim().length > 0) {
        text += ' ';
      }
      text += item.text;

      // Split this item's text into sub-words for word-level bounding boxes.
      const itemWords = item.text.split(/(\s+)/).filter((w) => w.length > 0);
      if (itemWords.length <= 1) {
        words.push({
          text: item.text,
          boundingBox: { x: item.x, y: item.y, width: item.width, height: item.height },
        });
      } else {
        // Approximate per-word width proportionally to character count.
        const totalChars = item.text.length || 1;
        let cursor = item.x;
        for (const w of itemWords) {
          const wWidth = (w.length / totalChars) * item.width;
          if (w.trim().length > 0) {
            words.push({
              text: w,
              boundingBox: { x: cursor, y: item.y, width: wWidth, height: item.height },
            });
          }
          cursor += wWidth;
        }
      }
    });

    text = text.replace(/\s+/g, ' ').trim();
    if (text.length === 0) return;

    const boundingBox: BoundingBox = {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };

    lines.push({
      id: `p${pageNumber}-l${idx}`,
      pageNumber,
      text,
      words,
      boundingBox,
      fontSize: maxFontSize,
      isLikelyHeaderFooter: false,
    });
  });

  return lines;
}

/**
 * Marks lines near the very top/bottom of the page as "likely header/footer"
 * candidates. Actual cross-page repetition detection happens in pdfService
 * (it needs data from multiple pages), this just flags position-based
 * candidates that the repetition pass can confirm.
 */
export function flagHeaderFooterCandidates(
  lines: TextLine[],
  pageHeight: number,
  topBandRatio = 0.08,
  bottomBandRatio = 0.08,
): void {
  for (const line of lines) {
    const centerY = line.boundingBox.y + line.boundingBox.height / 2;
    if (centerY < pageHeight * topBandRatio || centerY > pageHeight * (1 - bottomBandRatio)) {
      line.isLikelyHeaderFooter = true;
    }
  }
}

const SENTENCE_END_RE = /[.!?]["')\]]*\s*$/;

/**
 * Merge visual lines into sentence-level DictationUnits. A sentence may span
 * multiple TextLines (e.g. wrapped text); we keep every contributing line's
 * bounding box so the caller can highlight the full sentence.
 */
export function buildSentenceUnits(lines: TextLine[], pageNumber: number): DictationUnit[] {
  const units: DictationUnit[] = [];
  let buffer: TextLine[] = [];
  let unitIdx = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    units.push({
      id: `p${pageNumber}-s${unitIdx++}`,
      pageNumber,
      text: buffer.map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim(),
      lineIds: buffer.map((l) => l.id),
      boundingBoxes: buffer.map((l) => l.boundingBox),
    });
    buffer = [];
  };

  for (const line of lines) {
    if (line.isLikelyHeaderFooter) continue;
    buffer.push(line);
    if (SENTENCE_END_RE.test(line.text)) {
      flush();
    }
  }
  flush();

  return units;
}

/** Merge visual lines into paragraph-level DictationUnits (blank-gap heuristic). */
export function buildParagraphUnits(lines: TextLine[], pageNumber: number): DictationUnit[] {
  const filtered = lines.filter((l) => !l.isLikelyHeaderFooter);
  if (filtered.length === 0) return [];

  const units: DictationUnit[] = [];
  let buffer: TextLine[] = [];
  let unitIdx = 0;

  const flush = () => {
    if (buffer.length === 0) return;
    units.push({
      id: `p${pageNumber}-para${unitIdx++}`,
      pageNumber,
      text: buffer.map((l) => l.text).join(' ').replace(/\s+/g, ' ').trim(),
      lineIds: buffer.map((l) => l.id),
      boundingBoxes: buffer.map((l) => l.boundingBox),
    });
    buffer = [];
  };

  for (let i = 0; i < filtered.length; i++) {
    const line = filtered[i];
    const prev = filtered[i - 1];
    if (prev) {
      const gap = line.boundingBox.y - (prev.boundingBox.y + prev.boundingBox.height);
      const typicalLineGap = Math.max(prev.boundingBox.height, line.boundingBox.height) * 0.9;
      if (gap > typicalLineGap * 1.6) {
        flush();
      }
    }
    buffer.push(line);
  }
  flush();

  return units;
}

/** Simple 1:1 line -> DictationUnit conversion (Visual Line mode, the default). */
export function buildLineUnits(lines: TextLine[]): DictationUnit[] {
  return lines
    .filter((l) => !l.isLikelyHeaderFooter)
    .map((line) => ({
      id: line.id,
      pageNumber: line.pageNumber,
      text: line.text,
      lineIds: [line.id],
      boundingBoxes: [line.boundingBox],
    }));
}
