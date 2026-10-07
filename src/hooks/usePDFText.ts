import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { detectRepeatedHeaderFooterText, extractPageTextData, isRepeatedHeaderFooter } from '../services/pdfService';
import { groupOcrWordsIntoLines, runOcrOnPage } from '../services/ocrService';
import type { DictationUnit, PageTextData } from '../types/pdf';
import type { DictationUnitType } from '../types/dictation';
import { buildLineUnits, buildParagraphUnits, buildSentenceUnits } from '../utils/textSegmentation';

export type OcrPageStatus = 'idle' | 'running' | 'done' | 'unavailable' | 'error';

interface UsePDFTextResult {
  getPageTextData: (pageNumber: number) => Promise<PageTextData>;
  getDictationUnits: (
    pageNumber: number,
    unitType: DictationUnitType,
    excludeHeaderFooter: boolean,
  ) => Promise<DictationUnit[]>;
  isScannedPdf: boolean | null; // null until first page has been checked
  ocrStatus: OcrPageStatus;
  ocrMessage: string | null;
  runOcrForPage: (pageNumber: number) => Promise<void>;
  clearCache: () => void;
}

/**
 * Caches per-page text extraction so speed changes / re-renders don't
 * trigger recomputation of coordinates (Section 28 performance requirement).
 * Falls back to OCR (Tesseract.js) for pages with no PDF.js text layer,
 * isolated behind an explicit user-triggered action since it's comparatively
 * slow and CPU-intensive.
 */
export function usePDFText(doc: PDFDocumentProxy | null): UsePDFTextResult {
  const cacheRef = useRef<Map<number, PageTextData>>(new Map());
  const repeatedSetRef = useRef<Set<string> | null>(null);
  const [isScannedPdf, setIsScannedPdf] = useState<boolean | null>(null);
  const [ocrStatus, setOcrStatus] = useState<OcrPageStatus>('idle');
  const [ocrMessage, setOcrMessage] = useState<string | null>(null);

  useEffect(() => {
    cacheRef.current.clear();
    repeatedSetRef.current = null;
    setIsScannedPdf(null);
    setOcrStatus('idle');
    setOcrMessage(null);
  }, [doc]);

  const getPageTextData = useCallback(
    async (pageNumber: number): Promise<PageTextData> => {
      const cached = cacheRef.current.get(pageNumber);
      if (cached) return cached;
      if (!doc) throw new Error('No PDF document loaded.');

      const page = await doc.getPage(pageNumber);
      const data = await extractPageTextData(page, pageNumber);
      cacheRef.current.set(pageNumber, data);

      if (pageNumber === 1) {
        setIsScannedPdf(!data.hasTextLayer);
      }

      return data;
    },
    [doc],
  );

  const runOcrForPage = useCallback(
    async (pageNumber: number): Promise<void> => {
      if (!doc) return;
      setOcrStatus('running');
      setOcrMessage(null);
      try {
        const page = await doc.getPage(pageNumber);
        const result = await runOcrOnPage(page, pageNumber);

        if (!result.engineAvailable) {
          setOcrStatus('unavailable');
          setOcrMessage(result.message ?? 'OCR is unavailable for this page.');
          return;
        }
        if (result.words.length === 0) {
          setOcrStatus('done');
          setOcrMessage('No text could be recognized on this page.');
          // Still cache an empty-but-marked-processed result so we don't retry endlessly.
          const viewport = page.getViewport({ scale: 1 });
          cacheRef.current.set(pageNumber, {
            pageNumber,
            width: viewport.width,
            height: viewport.height,
            lines: [],
            hasTextLayer: false,
          });
          return;
        }

        const lines = groupOcrWordsIntoLines(result.words, pageNumber);
        const viewport = page.getViewport({ scale: 1 });
        cacheRef.current.set(pageNumber, {
          pageNumber,
          width: viewport.width,
          height: viewport.height,
          lines,
          hasTextLayer: true,
        });
        setOcrStatus('done');
      } catch (err) {
        setOcrStatus('error');
        setOcrMessage((err as { message?: string })?.message ?? 'OCR failed unexpectedly.');
      }
    },
    [doc],
  );

  const ensureRepeatedSet = useCallback(async () => {
    if (repeatedSetRef.current || !doc) return repeatedSetRef.current ?? new Set<string>();

    // Sample up to 8 pages spread across the document to detect repeated
    // headers/footers without extracting the entire (possibly huge) PDF.
    const sampleCount = Math.min(8, doc.numPages);
    const step = Math.max(1, Math.floor(doc.numPages / sampleCount));
    const samples: PageTextData[] = [];
    for (let i = 0; i < sampleCount; i++) {
      const pageNum = Math.min(doc.numPages, 1 + i * step);
      try {
        samples.push(await getPageTextData(pageNum));
      } catch {
        /* skip unreadable page */
      }
    }
    const repeated = detectRepeatedHeaderFooterText(samples);
    repeatedSetRef.current = repeated;
    return repeated;
  }, [doc, getPageTextData]);

  const getDictationUnits = useCallback(
    async (
      pageNumber: number,
      unitType: DictationUnitType,
      excludeHeaderFooter: boolean,
    ): Promise<DictationUnit[]> => {
      const pageData = await getPageTextData(pageNumber);
      let lines = pageData.lines;

      if (excludeHeaderFooter) {
        const repeated = await ensureRepeatedSet();
        lines = lines.map((l) => ({
          ...l,
          isLikelyHeaderFooter: l.isLikelyHeaderFooter && isRepeatedHeaderFooter(l.text, repeated),
        }));
      } else {
        lines = lines.map((l) => ({ ...l, isLikelyHeaderFooter: false }));
      }

      if (unitType === 'sentence') return buildSentenceUnits(lines, pageNumber);
      if (unitType === 'paragraph') return buildParagraphUnits(lines, pageNumber);
      return buildLineUnits(lines);
    },
    [getPageTextData, ensureRepeatedSet],
  );

  const clearCache = useCallback(() => {
    cacheRef.current.clear();
    repeatedSetRef.current = null;
  }, []);

  return {
    getPageTextData,
    getDictationUnits,
    isScannedPdf,
    ocrStatus,
    ocrMessage,
    runOcrForPage,
    clearCache,
  };
}
