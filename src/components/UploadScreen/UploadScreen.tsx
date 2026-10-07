import { useCallback, useRef, useState } from 'react';
import { FileText, Upload, AlertCircle, Loader2 } from 'lucide-react';

interface UploadScreenProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  errorMessage: string | null;
}

export function UploadScreen({ onFileSelected, isLoading, errorMessage }: UploadScreenProps) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFileSelected(file);
    },
    [onFileSelected],
  );

  const onDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles],
  );

  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
          <FileText size={32} />
        </div>
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">RecordDictate</h1>
        <p className="mt-2 max-w-sm text-sm text-slate-500 dark:text-slate-400">
          Upload a PDF and it will be read aloud, line by line, in sync with a highlight — so you can
          write it into your record without looking back and forth.
        </p>
      </div>

      <div
        role="button"
        tabIndex={0}
        aria-label="Upload PDF file"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        className={`flex w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-10 transition-colors ${
          isDragging
            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30'
            : 'border-slate-300 bg-white hover:border-blue-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {isLoading ? (
          <>
            <Loader2 className="mb-3 animate-spin text-blue-600" size={32} />
            <p className="text-sm text-slate-600 dark:text-slate-300">Loading PDF…</p>
          </>
        ) : (
          <>
            <Upload className="mb-3 text-slate-400" size={32} />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-slate-400">PDF files only</p>
          </>
        )}
      </div>

      {errorMessage && (
        <div className="mt-4 flex max-w-md items-start gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
}
