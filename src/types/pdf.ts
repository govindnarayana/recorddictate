// Core geometric and text-layer types for PDF processing.
// All coordinates are in PDF "viewport" space (top-left origin, CSS pixels
// at the currently rendered scale) unless explicitly noted otherwise.

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** A single raw text run as reported by PDF.js's text content stream. */
export interface RawTextItem {
  text: string;
  x: number;
  y: number; // top-left y (already converted from PDF.js baseline coords)
  width: number;
  height: number;
  fontName: string;
  fontSize: number;
  hasEOL: boolean;
}

/** One word, positioned individually so multi-rect highlighting is possible. */
export interface PositionedWord {
  text: string;
  boundingBox: BoundingBox;
}

/**
 * A visually-grouped line of text, built by clustering RawTextItems that
 * share (approximately) the same baseline/Y band on a page.
 */
export interface TextLine {
  id: string;
  pageNumber: number;
  text: string;
  words: PositionedWord[];
  boundingBox: BoundingBox;
  fontSize: number;
  isLikelyHeaderFooter: boolean;
}

/**
 * A dictation unit: may correspond 1:1 with a TextLine (Visual Line mode),
 * or span multiple TextLines (Sentence / Paragraph mode). Always carries
 * every bounding box needed to highlight it fully, and the exact original
 * PDF text (untouched) that will be shown/spoken.
 */
export interface DictationUnit {
  id: string;
  pageNumber: number;
  text: string; // exact original text, unmodified
  lineIds: string[];
  boundingBoxes: BoundingBox[];
}

export interface PageTextData {
  pageNumber: number;
  width: number; // page viewport width at scale=1
  height: number; // page viewport height at scale=1
  lines: TextLine[];
  hasTextLayer: boolean;
}

export type PdfLoadStatus =
  | 'idle'
  | 'loading'
  | 'ready'
  | 'error'
  | 'password-required'
  | 'no-text-layer';

export interface PdfDocumentInfo {
  numPages: number;
  fileName: string;
  fileSize: number;
}
