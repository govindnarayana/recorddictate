import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useState } from 'react';

interface PageNavigationProps {
  pageNumber: number;
  numPages: number;
  onGoToPage: (n: number) => void;
  onPrev: () => void;
  onNext: () => void;
}

export function PageNavigation({ pageNumber, numPages, onGoToPage, onPrev, onNext }: PageNavigationProps) {
  const [inputValue, setInputValue] = useState(String(pageNumber));

  useEffect(() => {
    setInputValue(String(pageNumber));
  }, [pageNumber]);

  const commit = () => {
    const n = parseInt(inputValue, 10);
    if (!Number.isNaN(n)) {
      onGoToPage(n);
    } else {
      setInputValue(String(pageNumber));
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 border-t border-slate-200 bg-white px-4 py-2 dark:border-slate-800 dark:bg-slate-900">
      <button
        type="button"
        onClick={onPrev}
        disabled={pageNumber <= 1}
        aria-label="Previous page"
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ChevronLeft size={18} />
      </button>

      <div className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
        <span>Page</span>
        <input
          type="text"
          inputMode="numeric"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          aria-label="Page number"
          className="w-10 rounded border border-slate-300 bg-transparent px-1 py-0.5 text-center dark:border-slate-700"
        />
        <span>/ {numPages}</span>
      </div>

      <button
        type="button"
        onClick={onNext}
        disabled={pageNumber >= numPages}
        aria-label="Next page"
        className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}
