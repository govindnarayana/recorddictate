import { GraduationCap, Loader2, ScanText, Volume2 } from 'lucide-react';
import { DictationControls } from '../DictationControls/DictationControls';
import { SpeedControl } from '../SpeedControl/SpeedControl';
import { ProgressBar } from '../ProgressBar/ProgressBar';
import type { DictationProgress, SpeechSpeed, SpeechStatus } from '../../types/dictation';
import type { DictationUnit } from '../../types/pdf';
import type { OcrPageStatus } from '../../hooks/usePDFText';

interface DictationPanelProps {
  currentUnit: DictationUnit | null;
  status: SpeechStatus;
  progress: DictationProgress;
  speed: SpeechSpeed;
  onSpeedChange: (s: SpeechSpeed) => void;
  onPrevious: () => void;
  onRepeat: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  scannedMessage: string | null;
  unitsLoading: boolean;
  ocrStatus: OcrPageStatus;
  ocrMessage: string | null;
  onRunOcr: () => void;
}

const STATUS_LABEL: Record<SpeechStatus, string> = {
  idle: 'Ready',
  reading: 'Reading',
  paused: 'Paused',
  finished: 'Finished',
  error: 'Error',
};

export function DictationPanel({
  currentUnit,
  status,
  progress,
  speed,
  onSpeedChange,
  onPrevious,
  onRepeat,
  onPlayPause,
  onNext,
  scannedMessage,
  unitsLoading,
  ocrStatus,
  ocrMessage,
  onRunOcr,
}: DictationPanelProps) {
  return (
    <aside className="flex w-full flex-col gap-5 border-t border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 lg:w-96 lg:border-l lg:border-t-0">
      <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
        <GraduationCap size={20} className="text-blue-600" />
        <h2 className="text-sm font-semibold">Dictation Mode</h2>
      </div>

      {scannedMessage ? (
        <div className="space-y-3">
          <div className="rounded-lg bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            {scannedMessage}
          </div>

          {ocrStatus === 'running' ? (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 p-3 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
              <Loader2 size={16} className="animate-spin" />
              Recognizing text on this page…
            </div>
          ) : (
            <button
              type="button"
              onClick={onRunOcr}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <ScanText size={16} />
              Recognize text on this page (OCR)
            </button>
          )}

          {ocrMessage && ocrStatus !== 'running' && (
            <p
              className={`text-xs ${
                ocrStatus === 'unavailable' || ocrStatus === 'error'
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-slate-500 dark:text-slate-400'
              }`}
            >
              {ocrMessage}
            </p>
          )}
        </div>
      ) : (
        <>
          <div>
            <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">Current line</p>
            <div className="min-h-[4.5rem] rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm leading-relaxed text-slate-800 dark:border-blue-900 dark:bg-blue-950/30 dark:text-slate-100">
              {unitsLoading ? 'Loading…' : currentUnit ? `"${currentUnit.text}"` : 'No line selected'}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            <Volume2 size={16} className={status === 'reading' ? 'text-blue-600' : ''} />
            <span aria-live="polite">{STATUS_LABEL[status]}</span>
          </div>

          <DictationControls
            status={status}
            onPrevious={onPrevious}
            onRepeat={onRepeat}
            onPlayPause={onPlayPause}
            onNext={onNext}
            canPrevious={progress.currentPage > 1 || progress.currentUnitIndex > 0}
            canNext={
              progress.currentPage < progress.totalPages ||
              progress.currentUnitIndex < progress.totalUnitsOnPage - 1
            }
          />

          <SpeedControl speed={speed} onChange={onSpeedChange} />

          <ProgressBar progress={progress} />
        </>
      )}
    </aside>
  );
}
