import { useCallback, useEffect, useRef, useState } from 'react';
import { clearSession, loadSession, saveSession, sessionMatchesFile } from '../services/sessionService';
import type { SessionState } from '../types/dictation';

/**
 * Tracks and persists {fileName, fileSize, page, unitIndex} to IndexedDB so
 * a student can pick up where they left off after closing the tab. Debounced
 * so rapid Next/Previous presses don't hammer IndexedDB (Section 28).
 */
export function useSessionResume() {
  const [pendingResume, setPendingResume] = useState<SessionState | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const checkForResume = useCallback(async (file: File): Promise<SessionState | null> => {
    const saved = await loadSession();
    if (saved && sessionMatchesFile(saved, file)) {
      setPendingResume(saved);
      return saved;
    }
    setPendingResume(null);
    return null;
  }, []);

  const persist = useCallback((state: Omit<SessionState, 'savedAt'>) => {
    if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(() => {
      saveSession({ ...state, savedAt: Date.now() });
    }, 400);
  }, []);

  const dismissResume = useCallback(() => setPendingResume(null), []);

  const clear = useCallback(async () => {
    await clearSession();
    setPendingResume(null);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current !== null) window.clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { pendingResume, checkForResume, persist, dismissResume, clear };
}
