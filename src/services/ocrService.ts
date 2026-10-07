import { createWorker, type Worker } from 'tesseract.js';
import type { PDFPageProxy } from 'pdfjs-dist';
import type { PageTextData, TextLine } from '../types/pdf';

/**
 * OCR SUPPORT for scanned PDFs (Section 21).
 *
 * RecordDictate's primary pipeline relies on PDF.js's real text layer for
 * guaranteed-accurate coordinates. Scanned PDFs (image-only pages) have no
 * such text layer, so this module provides a genuine fallback using
 * Tesseract.js, which returns real per-word bounding boxes from the
 * rendered page image — never fabricated or guessed coordinates.
 *
 * This is isolated from the text-layer pipeline entirely: usePDFText only
 * calls into here when a page has no usable text layer, and a failure here
 * never breaks normal PDF processing.
 */

export interface OcrWordResult {
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface OcrPageResult {
  pageNumber: number;
  words: OcrWordResult[];
  engineAvailable: boolean;
  message?: string;
}

export function pdfHasUsableTextLayer(pageData: PageTextData): boolean {
  return pageData.hasTextLayer && pageData.lines.some((l) => l.text.trim().length > 3);
}

/** Renders a page to an off-screen canvas at a resolution suitable for OCR. */
export async function renderPageToCanvas(
  page: PDFPageProxy,
  scale = 2,
): Promise<HTMLCanvasElement> {
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not create canvas context for OCR rendering.');

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas;
}

// Tesseract workers are expensive to spin up (they load WASM + language
// data), so a single worker is reused across pages/OCR calls rather than
// recreated each time (Section 28 performance guidance).
let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng').catch((err) => {
      workerPromise = null; // allow retry on next call
      throw err;
    });
  }
  return workerPromise;
}

export async function terminateOcrWorker(): Promise<void> {
  if (workerPromise) {
    try {
      const worker = await workerPromise;
      await worker.terminate();
    } catch {
      // no-op
    } finally {
      workerPromise = null;
    }
  }
}

/**
 * Runs real OCR on a page: renders it to a canvas (scale=2 for legibility),
 * then recognizes text with Tesseract.js, mapping its word-level bounding
 * boxes (given in image-pixel space) back into the page's viewport
 * coordinate space (scale=1) so they line up with the same coordinate
 * system the text-layer pipeline uses for highlighting.
 */
export async function runOcrOnPage(page: PDFPageProxy, pageNumber: number): Promise<OcrPageResult> {
  const ocrScale = 2;

  try {
    const canvas = await renderPageToCanvas(page, ocrScale);
    const worker = await getWorker();
    const { data } = await worker.recognize(canvas);

    const rawWords: Array<{
      text: string;
      confidence: number;
      bbox: { x0: number; y0: number; x1: number; y1: number };
    }> = (data as unknown as { words?: typeof rawWords }).words ?? [];

    const words: OcrWordResult[] = rawWords
      .filter((w) => w.text.trim().length > 0)
      .map((w) => ({
        text: w.text,
        confidence: w.confidence,
        // Divide by ocrScale to convert from the rendered image's pixel
        // space back to the page's scale=1 viewport space.
        x: w.bbox.x0 / ocrScale,
        y: w.bbox.y0 / ocrScale,
        width: (w.bbox.x1 - w.bbox.x0) / ocrScale,
        height: (w.bbox.y1 - w.bbox.y0) / ocrScale,
      }));

    return { pageNumber, words, engineAvailable: true };
  } catch (err) {
    return {
      pageNumber,
      words: [],
      engineAvailable: false,
      message:
        'OCR could not run on this page (' +
        ((err as { message?: string })?.message ?? 'unknown error') +
        '). The page may still be viewed, but dictation is unavailable for it.',
    };
  }
}

/** Groups OCR word boxes into lines using the same clustering idea as the text-layer path. */
export function groupOcrWordsIntoLines(words: OcrWordResult[], pageNumber: number): TextLine[] {
  if (words.length === 0) return [];
  const sorted = [...words].sort((a, b) => {
    const cA = a.y + a.height / 2;
    const cB = b.y + b.height / 2;
    if (Math.abs(cA - cB) > 0.1) return cA - cB;
    return a.x - b.x;
  });

  const lines: TextLine[] = [];
  let buffer: OcrWordResult[] = [];
  let bufferCenter = sorted[0].y + sorted[0].height / 2;

  const flush = (idx: number) => {
    if (buffer.length === 0) return;
    const minX = Math.min(...buffer.map((w) => w.x));
    const minY = Math.min(...buffer.map((w) => w.y));
    const maxX = Math.max(...buffer.map((w) => w.x + w.width));
    const maxY = Math.max(...buffer.map((w) => w.y + w.height));
    lines.push({
      id: `p${pageNumber}-ocr${idx}`,
      pageNumber,
      text: buffer.map((w) => w.text).join(' '),
      words: buffer.map((w) => ({
        text: w.text,
        boundingBox: { x: w.x, y: w.y, width: w.width, height: w.height },
      })),
      boundingBox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      fontSize: Math.max(...buffer.map((w) => w.height)),
      isLikelyHeaderFooter: false,
    });
    buffer = [];
  };

  sorted.forEach((word, i) => {
    const center = word.y + word.height / 2;
    if (Math.abs(center - bufferCenter) > word.height * 0.6 && buffer.length > 0) {
      flush(lines.length);
      bufferCenter = center;
    } else {
      bufferCenter = (bufferCenter * buffer.length + center) / (buffer.length + 1);
    }
    buffer.push(word);
    if (i === sorted.length - 1) flush(lines.length);
  });

  return lines;
}
