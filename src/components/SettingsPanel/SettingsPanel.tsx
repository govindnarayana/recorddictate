import { X } from 'lucide-react';
import { SymbolSettings } from '../SymbolSettings/SymbolSettings';
import {
  CHUNK_PAUSE_OPTIONS,
  CHUNK_WORD_OPTIONS,
  type AppSettings,
  type AutoNextDelay,
  type DictationUnitType,
  type SpeechMode,
} from '../../types/dictation';

interface SettingsPanelProps {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onClose: () => void;
  voices: SpeechSynthesisVoice[];
}

const SPEECH_MODES: { value: SpeechMode; label: string; example: string }[] = [
  { value: 'natural', label: 'Natural', example: '"...device, used for..."' },
  { value: 'dictation', label: 'Dictation', example: '"...device, comma, used for..."' },
  { value: 'exact', label: 'Exact', example: '"V equals I R"' },
];

const UNIT_TYPES: { value: DictationUnitType; label: string }[] = [
  { value: 'line', label: 'Visual Line' },
  { value: 'sentence', label: 'Sentence' },
  { value: 'paragraph', label: 'Paragraph' },
];

const AUTO_NEXT_OPTIONS: { value: AutoNextDelay; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 2, label: '2 sec' },
  { value: 3, label: '3 sec' },
  { value: 5, label: '5 sec' },
  { value: 10, label: '10 sec' },
];

export function SettingsPanel({ settings, onChange, onClose, voices }: SettingsPanelProps) {
  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Settings"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-xl dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Speech mode</p>
            <div className="space-y-1.5">
              {SPEECH_MODES.map((m) => (
                <label
                  key={m.value}
                  className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-200 p-2.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  <input
                    type="radio"
                    name="speechMode"
                    checked={settings.speechMode === m.value}
                    onChange={() => update('speechMode', m.value)}
                    className="mt-0.5"
                  />
                  <span>
                    <span className="font-medium text-slate-800 dark:text-slate-100">{m.label}</span>
                    <span className="ml-1 text-xs text-slate-400">{m.example}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Dictation unit</p>
            <div className="flex gap-1.5">
              {UNIT_TYPES.map((u) => (
                <button
                  key={u.value}
                  type="button"
                  onClick={() => update('dictationUnit', u.value)}
                  aria-pressed={settings.dictationUnit === u.value}
                  className={`flex-1 rounded-md px-2 py-1.5 text-sm ${
                    settings.dictationUnit === u.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Automatic next</p>
            <div className="flex flex-wrap gap-1.5">
              {AUTO_NEXT_OPTIONS.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => update('autoNextDelay', opt.value)}
                  aria-pressed={settings.autoNextDelay === opt.value}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    settings.autoNextDelay === opt.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
              Word-by-word pacing
            </p>
            <p className="mb-2 text-xs text-slate-400">
              Instead of reading a whole line at once, speak a few words, pause, then continue —
              gives you time to write as it goes.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {CHUNK_WORD_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => update('chunkWordCount', n)}
                  aria-pressed={settings.chunkWordCount === n}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                    settings.chunkWordCount === n
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {n === 0 ? 'Off (whole line)' : `${n} words`}
                </button>
              ))}
            </div>

            {settings.chunkWordCount > 0 && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                  Pause between word groups
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {CHUNK_PAUSE_OPTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => update('chunkPauseSeconds', s)}
                      aria-pressed={settings.chunkPauseSeconds === s}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                        settings.chunkPauseSeconds === s
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {voices.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Voice</p>
              <select
                value={settings.voiceURI ?? ''}
                onChange={(e) => update('voiceURI', e.target.value || null)}
                className="w-full rounded-md border border-slate-300 bg-transparent px-2 py-1.5 text-sm dark:border-slate-700"
              >
                <option value="">Browser default</option>
                {voices.map((v) => (
                  <option key={v.voiceURI} value={v.voiceURI}>
                    {v.name} ({v.lang})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Highlight</p>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                Color
                <input
                  type="color"
                  value={settings.highlightColor}
                  onChange={(e) => update('highlightColor', e.target.value)}
                  className="h-7 w-10 cursor-pointer rounded border border-slate-300 dark:border-slate-700"
                />
              </label>
              <label className="flex flex-1 items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                Opacity
                <input
                  type="range"
                  min={0.1}
                  max={0.8}
                  step={0.05}
                  value={settings.highlightOpacity}
                  onChange={(e) => update('highlightOpacity', parseFloat(e.target.value))}
                  className="flex-1"
                />
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
            <input
              type="checkbox"
              checked={settings.excludeHeaderFooter}
              onChange={(e) => update('excludeHeaderFooter', e.target.checked)}
            />
            Exclude repeated headers/footers from dictation
          </label>

          <SymbolSettings
            symbolMap={settings.symbolMap}
            onChange={(map) => update('symbolMap', map)}
          />

          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Keyboard shortcuts</p>
            <ul className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
              <li><kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">Space</kbd> Play/Pause</li>
              <li><kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">→</kbd> Next line</li>
              <li><kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">←</kbd> Previous line</li>
              <li><kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">R</kbd> Repeat</li>
              <li><kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">S</kbd> Stop</li>
              <li><kbd className="rounded bg-slate-100 px-1.5 py-0.5 text-xs dark:bg-slate-800">Page Up/Down</kbd> Change PDF page</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
