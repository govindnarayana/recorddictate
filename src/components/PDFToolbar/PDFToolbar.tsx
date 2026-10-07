import { FileUp, Minus, Plus, RotateCcw, Settings } from 'lucide-react';

interface PDFToolbarProps {
  fileName: string;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onOpenSettings: () => void;
  onNewFile: () => void;
}

export function PDFToolbar({
  fileName,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onOpenSettings,
  onNewFile,
}: PDFToolbarProps) {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-2.5 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex min-w-0 items-center gap-2">
        <span className="text-base font-semibold text-slate-900 dark:text-slate-100">RecordDictate</span>
        <span className="truncate text-sm text-slate-400" title={fileName}>
          {fileName}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onNewFile}
          className="mr-2 flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <FileUp size={14} />
          Upload new PDF
        </button>
        <button
          type="button"
          onClick={onZoomOut}
          aria-label="Zoom out"
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Minus size={16} />
        </button>
        <button
          type="button"
          onClick={onResetZoom}
          aria-label="Reset zoom"
          className="w-14 rounded-md py-1 text-center text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {Math.round(zoom * 100)}%
        </button>
        <button
          type="button"
          onClick={onZoomIn}
          aria-label="Zoom in"
          className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Plus size={16} />
        </button>
        <button
          type="button"
          onClick={onResetZoom}
          aria-label="Fit to 100%"
          className="ml-1 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Open settings"
          className="ml-2 rounded-md p-1.5 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
}
