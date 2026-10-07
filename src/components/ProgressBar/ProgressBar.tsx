import type { DictationProgress } from '../../types/dictation';

interface ProgressBarProps {
  progress: DictationProgress;
}

export function ProgressBar({ progress }: ProgressBarProps) {
  const { currentPage, totalPages, currentUnitIndex, totalUnitsOnPage } = progress;
  const pagePct = totalPages > 0 ? (currentPage - 1) / totalPages : 0;
  const withinPagePct = totalUnitsOnPage > 0 ? (currentUnitIndex + 1) / totalUnitsOnPage / totalPages : 0;
  const overallPct = Math.min(100, Math.round((pagePct + withinPagePct) * 100));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
        <span>
          Page {currentPage} / {totalPages}
        </span>
        <span>
          Line {totalUnitsOnPage > 0 ? currentUnitIndex + 1 : 0} / {totalUnitsOnPage}
        </span>
        <span>{overallPct}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-valuenow={overallPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Document progress"
      >
        <div
          className="h-full rounded-full bg-blue-600 transition-all duration-300"
          style={{ width: `${overallPct}%` }}
        />
      </div>
    </div>
  );
}
