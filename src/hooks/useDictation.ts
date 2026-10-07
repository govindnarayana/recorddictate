import { useCallback, useEffect, useRef, useState } from 'react';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { useChunkedSpeech } from './useChunkedSpeech';
import { usePDFText } from './usePDFText';
import { toSpeechText } from '../services/textProcessor';
import type { AppSettings, DictationProgress } from '../types/dictation';
import type { DictationUnit } from '../types/pdf';

interface UseDictationArgs {
  doc: PDFDocumentProxy | null;
  pageNumber: number;
  numPages: number;
  goToPage: (n: number) => void;
  settings: AppSettings;
  /** Optional {page, unitIndex} to jump to once, when that page's units finish loading (Section 20 resume). */
  resumeTarget?: { page: number; unitIndex: number } | null;
  onResumeApplied?: () => void;
  onPositionChange?: (page: number, unitIndex: number) => void;
}

export function useDictation({
  doc,
  pageNumber,
  numPages,
  goToPage,
  settings,
  resumeTarget,
  onResumeApplied,
  onPositionChange,
}: UseDictationArgs) {
  const speech = useChunkedSpeech();
  const pdfText = usePDFText(doc);

  const [units, setUnits] = useState<DictationUnit[]>([]);
  const [unitIndex, setUnitIndex] = useState(0);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [scannedMessage, setScannedMessage] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  const autoNextTimerRef = useRef<number | null>(null);
  const pendingPageAdvanceRef = useRef(false);

  const clearAutoNextTimer = useCallback(() => {
    if (autoNextTimerRef.current !== null) {
      window.clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
  }, []);

  // Load dictation units whenever the page or unit-type/header-footer
  // settings change.
  useEffect(() => {
    let cancelled = false;
    if (!doc) {
      setUnits([]);
      return;
    }
    setUnitsLoading(true);
    setScannedMessage(null);

    pdfText
      .getPageTextData(pageNumber)
      .then(async (pageData) => {
        if (cancelled) return;
        if (!pageData.hasTextLayer) {
          setScannedMessage(
            'This PDF appears to be scanned. Text recognition is required to enable dictation for this page.',
          );
          setUnits([]);
          return;
        }
        const newUnits = await pdfText.getDictationUnits(
          pageNumber,
          settings.dictationUnit,
          settings.excludeHeaderFooter,
        );
        if (!cancelled) {
          setUnits(newUnits);
          const shouldResume =
            resumeTarget &&
            resumeTarget.page === pageNumber &&
            resumeTarget.unitIndex >= 0 &&
            resumeTarget.unitIndex < newUnits.length;
          setUnitIndex(shouldResume ? resumeTarget.unitIndex : 0);
          if (shouldResume) onResumeApplied?.();
          pendingPageAdvanceRef.current = false;
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUnits([]);
          setScannedMessage('Could not read text from this page.');
        }
      })
      .finally(() => {
        if (!cancelled) setUnitsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, pageNumber, settings.dictationUnit, settings.excludeHeaderFooter, reloadTick]);

  const currentUnit: DictationUnit | null = units[unitIndex] ?? null;

  const speakUnit = useCallback(
    (unit: DictationUnit) => {
      const speechText = toSpeechText(unit.text, settings.speechMode, settings.symbolMap);
      speech.speakChunks(
        speechText,
        settings.chunkWordCount,
        settings.chunkPauseSeconds,
        settings.speechSpeed,
        settings.voiceURI,
      );
    },
    [
      speech,
      settings.speechMode,
      settings.symbolMap,
      settings.chunkWordCount,
      settings.chunkPauseSeconds,
      settings.speechSpeed,
      settings.voiceURI,
    ],
  );

  const readCurrent = useCallback(() => {
    if (currentUnit) speakUnit(currentUnit);
  }, [currentUnit, speakUnit]);

  const goToNextPageFirstUnit = useCallback(() => {
    if (pageNumber < numPages) {
      pendingPageAdvanceRef.current = true;
      goToPage(pageNumber + 1);
    }
  }, [pageNumber, numPages, goToPage]);

  const next = useCallback(() => {
    clearAutoNextTimer();
    speech.stop();
    setCompletedCount((c) => c + 1);

    if (unitIndex + 1 < units.length) {
      setUnitIndex((i) => i + 1);
    } else {
      goToNextPageFirstUnit();
    }
  }, [clearAutoNextTimer, speech, unitIndex, units.length, goToNextPageFirstUnit]);

  const previous = useCallback(() => {
    clearAutoNextTimer();
    speech.stop();
    if (unitIndex > 0) {
      setUnitIndex((i) => i - 1);
    } else if (pageNumber > 1) {
      pendingPageAdvanceRef.current = false;
      goToPage(pageNumber - 1);
    }
  }, [clearAutoNextTimer, speech, unitIndex, pageNumber, goToPage]);

  const repeat = useCallback(() => {
    clearAutoNextTimer();
    if (currentUnit) speakUnit(currentUnit);
  }, [clearAutoNextTimer, currentUnit, speakUnit]);

  const playPause = useCallback(() => {
    if (speech.status === 'reading') {
      speech.pause();
    } else if (speech.status === 'paused') {
      speech.resume();
    } else {
      readCurrent();
    }
  }, [speech, readCurrent]);

  // Auto-advance handling (Section 11).
  useEffect(() => {
    if (speech.status !== 'finished') return;
    if (settings.autoNextDelay === 'manual') return;

    clearAutoNextTimer();
    autoNextTimerRef.current = window.setTimeout(() => {
      next();
    }, settings.autoNextDelay * 1000);

    return () => clearAutoNextTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speech.status, settings.autoNextDelay]);

  useEffect(() => clearAutoNextTimer, [clearAutoNextTimer]);

  // Read the new current unit automatically when it changes due to
  // navigation (matches "teacher dictating" flow: highlight + speak together).
  const lastSpokenUnitId = useRef<string | null>(null);
  useEffect(() => {
    if (currentUnit && currentUnit.id !== lastSpokenUnitId.current) {
      lastSpokenUnitId.current = currentUnit.id;
      speakUnit(currentUnit);
    }
    if (!currentUnit) lastSpokenUnitId.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUnit]);

  // Notify caller of position changes so it can persist them (Section 20).
  useEffect(() => {
    if (units.length > 0) {
      onPositionChange?.(pageNumber, unitIndex);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageNumber, unitIndex, units.length]);

  const runOcr = useCallback(async () => {
    await pdfText.runOcrForPage(pageNumber);
    setReloadTick((t) => t + 1);
  }, [pdfText, pageNumber]);

  const progress: DictationProgress = {
    currentPage: pageNumber,
    totalPages: numPages,
    currentUnitIndex: unitIndex,
    totalUnitsOnPage: units.length,
    completedUnits: completedCount,
    totalUnitsInDocument: units.length * numPages, // best-effort estimate
  };

  return {
    units,
    unitIndex,
    currentUnit,
    unitsLoading,
    scannedMessage,
    speechStatus: speech.status,
    speechError: speech.error,
    speechSupported: speech.isSupported,
    voices: speech.voices,
    progress,
    next,
    previous,
    repeat,
    playPause,
    stop: speech.stop,
    ocrStatus: pdfText.ocrStatus,
    ocrMessage: pdfText.ocrMessage,
    runOcr,
  };
}
