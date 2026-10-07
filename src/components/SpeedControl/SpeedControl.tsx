import { SPEECH_SPEEDS, type SpeechSpeed } from '../../types/dictation';

interface SpeedControlProps {
  speed: SpeechSpeed;
  onChange: (speed: SpeechSpeed) => void;
}

export function SpeedControl({ speed, onChange }: SpeedControlProps) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">Speed</p>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Speech speed">
        {SPEECH_SPEEDS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onChange(s)}
            aria-pressed={s === speed}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              s === speed
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}
