import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy, PDFPageProxy } from 'pdfjs-dist';
import type { PageTextData, RawTextItem } from '../types/pdf';
import { flagHeaderFooterCandidates, groupTextItemsIntoLines } from '../utils/textSegmentation';

// Worker is served as a static asset copied from node_modules at build time
// (see public/pdf.worker.min.mjs). This keeps PDF.js's actual parsing engine
// as the source of truth for text positions — nothing here is approximated.
pdfjsLib.GlobalWorkerOptions.workerSrc = `${import.meta.env.BASE_URL}pdf.worker.min.mjs`;

export class PdfError extends Error {
  code:
    | 'invalid'
    | 'password'
    | 'corrupted'
    | 'empty'
    | 'too-large'
    | 'unknown';
  constructor(code: PdfError['code'], message: string) {
    super(message);
    this.code = code;
    this.name = 'PdfError';
  }
}

const MAX_BYTES = 150 * 1024 * 1024; // 150MB safety ceiling

export async function loadPdfDocument(file: File): Promise<PDFDocumentProxy> {
  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    throw new PdfError('invalid', 'The selected file is not a PDF.');
  }
  if (file.size === 0) {
    throw new PdfError('empty', 'The selected file is empty.');
  }
  if (file.size > MAX_BYTES) {
    throw new PdfError('too-large', 'This PDF is too large to process in the browser (150MB limit).');
  }

  const buffer = await file.arrayBuffer();

  try {
    const loadingTask = pdfjsLib.getDocument({ data: buffer });
    const doc = await loadingTask.promise;
    if (doc.numPages === 0) {
      throw new PdfError('empty', 'This PDF has no pages.');
    }
    return doc;
  } catch (err: unknown) {
    if (err instanceof PdfError) throw err;
    const name = (err as { name?: string })?.name ?? '';
    const message = (err as { message?: string })?.message ?? '';
    if (name === 'PasswordException') {
      throw new PdfError('password', 'This PDF is password-protected.');
    }
    if (/invalid pdf structure/i.test(message) || name === 'InvalidPDFException') {
      throw new PdfError('corrupted', 'This PDF appears to be corrupted and cannot be read.');
    }
    throw new PdfError('unknown', 'Could not open this PDF. It may be corrupted or unsupported.');
  }
}

/** Extracts positioned text for one page using the real PDF.js text-content stream. */
export async function extractPageTextData(
  page: PDFPageProxy,
  pageNumber: number,
): Promise<PageTextData> {
  const viewport = page.getViewport({ scale: 1 });
  const textContent = await page.getTextContent();

  const rawItems: RawTextItem[] = [];

  for (const item of textContent.items) {
    // TextMarkedContent items (no `str`) are structural markers, not text runs.
    if (!('str' in item) || item.str === undefined) continue;
    const ti = item as {
      str: string;
      transform: number[];
      width: number;
      height: number;
      fontName: string;
      hasEOL: boolean;
    };
    if (ti.str.length === 0) continue;

    // item.transform is [a, b, c, d, e, f] in PDF user space; PDF.js's
    // viewport.convertToViewportPoint / transform utilities map this to
    // top-left-origin CSS pixel space consistent with how the canvas renders.
    const [a, b, c, d, e, f] = ti.transform;
    const fontSize = Math.hypot(a, b) || Math.hypot(c, d) || 1;

    // Convert the glyph origin (e, f) from PDF space to viewport space.
    const [vx, vyBaseline] = viewport.convertToViewportPoint(e, f);
    // Viewport Y increases downward and the baseline sits at the bottom of
    // the glyph box, so the top of the text box is baseline minus height,
    // scaled by the same factor PDF.js uses internally for line height.
    const heightPx = Math.hypot(c, d) || fontSize;
    const topY = vyBaseline - heightPx;

    // ti.width is already expressed in PDF user-space units for this text
    // run; since we built the viewport at scale=1, user-space units map
    // 1:1 to viewport CSS pixels, so no further scaling is required here.
    // (If the caller ever renders at a different scale, positions are
    // multiplied by that scale uniformly at draw time — see usePDF.ts.)
    rawItems.push({
      text: ti.str,
      x: vx,
      y: topY,
      width: ti.width,
      height: heightPx,
      fontName: ti.fontName,
      fontSize,
      hasEOL: ti.hasEOL ?? false,
    });
  }

  const lines = groupTextItemsIntoLines(rawItems, pageNumber);
  flagHeaderFooterCandidates(lines, viewport.height);

  return {
    pageNumber,
    width: viewport.width,
    height: viewport.height,
    lines,
    hasTextLayer: lines.length > 0,
  };
}

/**
 * Detects repeated header/footer lines across multiple sampled pages so the
 * "exclude repeated headers/footers" setting can work document-wide, not just
 * per-page. Confirms only lines already flagged as position-based candidates.
 */
export function detectRepeatedHeaderFooterText(pagesData: PageTextData[]): Set<string> {
  const textFrequency = new Map<string, number>();

  for (const page of pagesData) {
    const seenOnPage = new Set<string>();
    for (const line of page.lines) {
      if (!line.isLikelyHeaderFooter) continue;
      const normalized = line.text.replace(/\d+/g, '#').trim().toLowerCase();
      if (normalized.length === 0 || seenOnPage.has(normalized)) continue;
      seenOnPage.add(normalized);
      textFrequency.set(normalized, (textFrequency.get(normalized) ?? 0) + 1);
    }
  }

  const threshold = Math.max(2, Math.ceil(pagesData.length * 0.5));
  const repeated = new Set<string>();
  for (const [text, count] of textFrequency.entries()) {
    if (count >= threshold) repeated.add(text);
  }
  return repeated;
}

export function isRepeatedHeaderFooter(lineText: string, repeatedSet: Set<string>): boolean {
  const normalized = lineText.replace(/\d+/g, '#').trim().toLowerCase();
  return repeatedSet.has(normalized);
}
