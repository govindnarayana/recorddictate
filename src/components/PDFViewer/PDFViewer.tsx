import { AlertCircle, Loader2 } from 'lucide-react';
import type { RefObject } from 'react';
import { TextHighlight } from '../TextHighlight/TextHighlight';
import type { BoundingBox } from '../../types/pdf';

interface PDFViewerProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  isRendering: boolean;
  errorMessage: string | null;
  highlightBoxes: BoundingBox[];
  zoom: number;
  highlightColor: string;
  highlightOpacity: number;
}

export function PDFViewer({
  canvasRef,
  isRendering,
  errorMessage,
  highlightBoxes,
  zoom,
  highlightColor,
  highlightOpacity,
}: PDFViewerProps) {
  return (
    <div className="relative flex flex-1 items-start justify-center overflow-auto bg-slate-100 p-6 dark:bg-slate-950">
      <div className="relative inline-block shadow-lg">
        <canvas ref={canvasRef} className="block bg-white" />
        <div className="pointer-events-none absolute inset-0">
          <TextHighlight
            boxes={highlightBoxes}
            scale={zoom}
            color={highlightColor}
            opacity={highlightOpacity}
          />
        </div>

        {isRendering && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-slate-900/60">
            <Loader2 className="animate-spin text-blue-600" size={28} />
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700 shadow dark:bg-red-950/60 dark:text-red-300">
          <AlertCircle size={16} />
          {errorMessage}
        </div>
      )}
    </div>
  );
}
