import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react';
import type { SpeechStatus } from '../../types/dictation';

interface DictationControlsProps {
  status: SpeechStatus;
  onPrevious: () => void;
  onRepeat: () => void;
  onPlayPause: () => void;
  onNext: () => void;
  canPrevious: boolean;
  canNext: boolean;
}

export function DictationControls({
  status,
  onPrevious,
  onRepeat,
  onPlayPause,
  onNext,
  canPrevious,
  canNext,
}: DictationControlsProps) {
  const isReading = status === 'reading';

  return (
    <div className="flex items-center justify-center gap-2" role="group" aria-label="Dictation controls">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!canPrevious}
        aria-label="Previous line"
        title="Previous (←)"
        className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ChevronLeft size={20} />
      </button>

      <button
        type="button"
        onClick={onRepeat}
        aria-label="Repeat current line"
        title="Repeat (R)"
        className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <RotateCcw size={20} />
      </button>

      <button
        type="button"
        onClick={onPlayPause}
        aria-label={isReading ? 'Pause' : 'Play'}
        title="Play/Pause (Space)"
        className="rounded-full bg-blue-600 p-3.5 text-white shadow-sm hover:bg-blue-700"
      >
        {isReading ? <Pause size={22} /> : <Play size={22} />}
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        aria-label="Next line"
        title="Next (→)"
        className="rounded-lg border border-slate-200 p-2.5 text-slate-600 hover:bg-slate-50 disabled:opacity-30 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
