export type SpeechMode = 'natural' | 'dictation' | 'exact';

export type DictationUnitType = 'line' | 'sentence' | 'paragraph';

export type SpeechStatus = 'idle' | 'reading' | 'paused' | 'finished' | 'error';

export type AutoNextDelay = 'manual' | 2 | 3 | 5 | 10;

// Extra slow speeds added at the low end for students who need more time
// per word (Section 12 request: "add some more slow motion option").
export const SPEECH_SPEEDS = [0.4, 0.5, 0.6, 0.7, 0.85, 1, 1.15, 1.3, 1.5] as const;
export type SpeechSpeed = (typeof SPEECH_SPEEDS)[number];

// 0 means "off" — speak the whole dictation unit (line/sentence/paragraph)
// in one go, as before. Any other value speaks that many words, pauses for
// chunkPauseSeconds, then continues with the next words of the SAME unit —
// this gives the student time to write a few words before more arrive,
// without requiring a manual Next press for every 2-3 words.
export const CHUNK_WORD_OPTIONS = [0, 2, 3, 4, 5] as const;
export type ChunkWordCount = (typeof CHUNK_WORD_OPTIONS)[number];

export const CHUNK_PAUSE_OPTIONS = [1, 1.5, 2, 3] as const;
export type ChunkPauseSeconds = (typeof CHUNK_PAUSE_OPTIONS)[number];

export interface SymbolMap {
  [symbol: string]: string;
}

export interface AppSettings {
  speechMode: SpeechMode;
  dictationUnit: DictationUnitType;
  speechSpeed: SpeechSpeed;
  autoNextDelay: AutoNextDelay;
  symbolMap: SymbolMap;
  voiceURI: string | null;
  highlightColor: string;
  highlightOpacity: number;
  excludeHeaderFooter: boolean;
  theme: 'light' | 'dark';
  chunkWordCount: ChunkWordCount;
  chunkPauseSeconds: ChunkPauseSeconds;
}

export interface DictationProgress {
  currentPage: number;
  totalPages: number;
  currentUnitIndex: number; // index within current page's units
  totalUnitsOnPage: number;
  completedUnits: number;
  totalUnitsInDocument: number; // best-effort, may grow as pages are visited
}

export interface SessionState {
  fileName: string;
  fileSize: number;
  pageNumber: number;
  unitIndex: number;
  savedAt: number;
}
