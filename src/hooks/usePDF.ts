import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy, RenderTask } from 'pdfjs-dist';
import { PdfError, loadPdfDocument } from '../services/pdfService';
import type { PdfDocumentInfo, PdfLoadStatus } from '../types/pdf';

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export function usePDF() {
  const [doc, setDoc] = useState<PDFDocumentProxy | null>(null);
  const [docInfo, setDocInfo] = useState<PdfDocumentInfo | null>(null);
  const [status, setStatus] = useState<PdfLoadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [zoom, setZoom] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<RenderTask | null>(null);

  const loadFile = useCallback(async (file: File) => {
    setStatus('loading');
    setError(null);
    try {
      const pdfDoc = await loadPdfDocument(file);
      setDoc(pdfDoc);
      setDocInfo({ numPages: pdfDoc.numPages, fileName: file.name, fileSize: file.size });
      setPageNumber(1);
      setStatus('ready');
    } catch (err) {
      if (err instanceof PdfError) {
        setError(err.message);
        setStatus(err.code === 'password' ? 'password-required' : 'error');
      } else {
        setError('An unexpected error occurred while opening this PDF.');
        setStatus('error');
      }
      setDoc(null);
      setDocInfo(null);
    }
  }, []);

  const renderPage = useCallback(
    async (pageNum: number, scale: number) => {
      if (!doc || !canvasRef.current) return;
      try {
        const page = await doc.getPage(pageNum);
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;

        // Cancel any prior in-flight render before starting a new one to
        // avoid "cannot re-render while render in progress" errors on
        // rapid zoom/page changes.
        if (renderTaskRef.current) {
          try {
            renderTaskRef.current.cancel();
          } catch {
            /* no-op: previous task may have already finished */
          }
        }

        const task = page.render({ canvasContext: ctx, viewport, canvas });
        renderTaskRef.current = task;
        await task.promise;
      } catch (err) {
        const name = (err as { name?: string })?.name;
        if (name !== 'RenderingCancelledException') {
          setError('Failed to render this page.');
        }
      }
    },
    [doc],
  );

  useEffect(() => {
    if (doc && pageNumber) {
      renderPage(pageNumber, zoom);
    }
  }, [doc, pageNumber, zoom, renderPage]);

  const goToPage = useCallback(
    (n: number) => {
      if (!docInfo) return;
      const clamped = Math.min(Math.max(1, n), docInfo.numPages);
      setPageNumber(clamped);
    },
    [docInfo],
  );

  const nextPage = useCallback(() => goToPage(pageNumber + 1), [goToPage, pageNumber]);
  const prevPage = useCallback(() => goToPage(pageNumber - 1), [goToPage, pageNumber]);

  const zoomIn = useCallback(() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(2))), []);
  const zoomOut = useCallback(() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(2))), []);
  const resetZoom = useCallback(() => setZoom(1), []);
  const fitWidth = useCallback(
    async (containerWidth: number) => {
      if (!doc) return;
      const page = await doc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const scale = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, containerWidth / viewport.width));
      setZoom(+scale.toFixed(2));
    },
    [doc, pageNumber],
  );

  const reset = useCallback(() => {
    setDoc(null);
    setDocInfo(null);
    setStatus('idle');
    setError(null);
    setPageNumber(1);
    setZoom(1);
  }, []);

  return {
    doc,
    docInfo,
    status,
    error,
    pageNumber,
    zoom,
    canvasRef,
    loadFile,
    goToPage,
    nextPage,
    prevPage,
    zoomIn,
    zoomOut,
    resetZoom,
    fitWidth,
    reset,
  };
}
