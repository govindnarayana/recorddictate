import { useCallback, useEffect, useRef, useState } from 'react';
import { useSpeech } from './useSpeech';
import type { SpeechStatus } from '../types/dictation';

/** Splits text into groups of N words. chunkSize <= 0 means "don't split". */
function splitIntoWordChunks(text: string, chunkSize: number): string[] {
  if (chunkSize <= 0) return [text];
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [text];
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += chunkSize) {
    chunks.push(words.slice(i, i + chunkSize).join(' '));
  }
  return chunks;
}

interface ChunkParams {
  chunkSize: number;
  gapSeconds: number;
  rate: number;
  voiceURI: string | null;
}

/**
 * Wraps useSpeech to support "chunked" playback: instead of speaking a full
 * line/sentence/paragraph in one utterance, it speaks a few words at a time
 * with a pause in between — giving a student time to write down what was
 * just said before more arrives, without needing to press Next every 2-3
 * words. The whole sequence still reports as a single "reading" session to
 * the rest of the app; only the final chunk finishing counts as "finished"
 * (so Auto-Next-to-the-next-line logic isn't triggered mid-sentence).
 */
export function useChunkedSpeech() {
  const speech = useSpeech();
  const [status, setStatus] = useState<SpeechStatus>('idle');

  const chunksRef = useRef<string[]>([]);
  const indexRef = useRef(0);
  const paramsRef = useRef<ChunkParams>({ chunkSize: 0, gapSeconds: 1, rate: 1, voiceURI: null });
  const gapTimerRef = useRef<number | null>(null);
  const pausedInGapRef = useRef(false);

  const clearGapTimer = useCallback(() => {
    if (gapTimerRef.current !== null) {
      window.clearTimeout(gapTimerRef.current);
      gapTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearGapTimer, [clearGapTimer]);

  // Advance to the next chunk (or finish) whenever the underlying speech
  // engine reports the current chunk's utterance ended.
  useEffect(() => {
    if (speech.status !== 'finished') {
      setStatus(speech.status);
      return;
    }

    const hasMore = indexRef.current + 1 < chunksRef.current.length;
    if (!hasMore) {
      setStatus('finished');
      return;
    }

    // Keep showing "reading" through the pause so the UI doesn't flicker
    // between chunks — the dictation is still conceptually in progress.
    setStatus('reading');
    clearGapTimer();
    const { gapSeconds, rate, voiceURI } = paramsRef.current;
    gapTimerRef.current = window.setTimeout(() => {
      indexRef.current += 1;
      speech.speak(chunksRef.current[indexRef.current], rate, voiceURI);
    }, gapSeconds * 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.status]);

  const speakChunks = useCallback(
    (text: string, chunkSize: number, gapSeconds: number, rate: number, voiceURI: string | null) => {
      clearGapTimer();
      pausedInGapRef.current = false;
      const chunks = splitIntoWordChunks(text, chunkSize);
      chunksRef.current = chunks;
      indexRef.current = 0;
      paramsRef.current = { chunkSize, gapSeconds, rate, voiceURI };
      speech.speak(chunks[0], rate, voiceURI);
    },
    [speech, clearGapTimer],
  );

  const pause = useCallback(() => {
    if (gapTimerRef.current !== null) {
      // Currently in the gap between chunks — pause the gap itself.
      clearGapTimer();
      pausedInGapRef.current = true;
      setStatus('paused');
    } else {
      speech.pause();
    }
  }, [speech, clearGapTimer]);

  const resume = useCallback(() => {
    if (pausedInGapRef.current) {
      pausedInGapRef.current = false;
      const hasMore = indexRef.current + 1 < chunksRef.current.length;
      if (hasMore) {
        indexRef.current += 1;
        const { rate, voiceURI } = paramsRef.current;
        speech.speak(chunksRef.current[indexRef.current], rate, voiceURI);
      }
    } else {
      speech.resume();
    }
  }, [speech]);

  const stop = useCallback(() => {
    clearGapTimer();
    pausedInGapRef.current = false;
    speech.stop();
    setStatus('idle');
  }, [speech, clearGapTimer]);

  const repeat = useCallback(() => {
    clearGapTimer();
    pausedInGapRef.current = false;
    indexRef.current = 0;
    if (chunksRef.current.length > 0) {
      const { rate, voiceURI } = paramsRef.current;
      speech.speak(chunksRef.current[0], rate, voiceURI);
    }
  }, [speech, clearGapTimer]);

  return {
    status,
    error: speech.error,
    voices: speech.voices,
    isSupported: speech.isSupported,
    speakChunks,
    pause,
    resume,
    stop,
    repeat,
  };
}
