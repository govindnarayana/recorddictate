import { useCallback, useEffect, useMemo, useState } from 'react';
import { usePDF } from './hooks/usePDF';
import { useDictation } from './hooks/useDictation';
import { useSessionResume } from './hooks/useSessionResume';
import { UploadScreen } from './components/UploadScreen/UploadScreen';
import { PDFViewer } from './components/PDFViewer/PDFViewer';
import { PDFToolbar } from './components/PDFToolbar/PDFToolbar';
import { PageNavigation } from './components/PageNavigation/PageNavigation';
import { DictationPanel } from './components/DictationPanel/DictationPanel';
import { SettingsPanel } from './components/SettingsPanel/SettingsPanel';
import type { AppSettings } from './types/dictation';
import { DEFAULT_SYMBOL_MAP } from './utils/punctuation';

const SETTINGS_STORAGE_KEY = 'recorddictate:settings';

const DEFAULT_SETTINGS: AppSettings = {
  speechMode: 'natural',
  dictationUnit: 'line',
  speechSpeed: 1,
  autoNextDelay: 'manual',
  symbolMap: DEFAULT_SYMBOL_MAP,
  voiceURI: null,
  highlightColor: '#2563eb',
  highlightOpacity: 0.35,
  excludeHeaderFooter: true,
  theme: 'light',
  chunkWordCount: 0,
  chunkPauseSeconds: 1.5,
};

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed, symbolMap: { ...DEFAULT_SYMBOL_MAP, ...parsed.symbolMap } };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export default function App() {
  const pdf = usePDF();
  const sessionResume = useSessionResume();
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [resumeTarget, setResumeTarget] = useState<{ page: number; unitIndex: number } | null>(null);
  const [resumeBannerVisible, setResumeBannerVisible] = useState(false);

  useEffect(() => {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  const handleFileSelected = useCallback(
    async (file: File) => {
      setCurrentFile(file);
      const saved = await sessionResume.checkForResume(file);
      setResumeBannerVisible(!!saved && (saved.pageNumber > 1 || saved.unitIndex > 0));
      pdf.loadFile(file);
    },
    [pdf, sessionResume],
  );

  const handleResumeAccept = useCallback(() => {
    if (!sessionResume.pendingResume) return;
    const { pageNumber, unitIndex } = sessionResume.pendingResume;
    setResumeTarget({ page: pageNumber, unitIndex });
    pdf.goToPage(pageNumber);
    setResumeBannerVisible(false);
  }, [sessionResume, pdf]);

  const handleResumeDismiss = useCallback(() => {
    sessionResume.dismissResume();
    setResumeBannerVisible(false);
  }, [sessionResume]);

  const handlePositionChange = useCallback(
    (page: number, unitIndex: number) => {
      if (!currentFile) return;
      sessionResume.persist({
        fileName: currentFile.name,
        fileSize: currentFile.size,
        pageNumber: page,
        unitIndex,
      });
    },
    [currentFile, sessionResume],
  );

  const dictation = useDictation({
    doc: pdf.doc,
    pageNumber: pdf.pageNumber,
    numPages: pdf.docInfo?.numPages ?? 0,
    goToPage: pdf.goToPage,
    settings,
    resumeTarget,
    onResumeApplied: () => setResumeTarget(null),
    onPositionChange: handlePositionChange,
  });

  const highlightBoxes = useMemo(
    () => dictation.currentUnit?.boundingBoxes ?? [],
    [dictation.currentUnit],
  );

  // Lets the student switch to a different PDF without reloading the page.
  const handleNewFile = useCallback(() => {
    dictation.stop();
    pdf.reset();
    setCurrentFile(null);
    setResumeTarget(null);
    setResumeBannerVisible(false);
    sessionResume.dismissResume();
  }, [dictation, pdf, sessionResume]);

  // Keyboard shortcuts (Section 16) — ignored while typing in inputs.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isTyping =
        target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if (isTyping || !pdf.doc) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          dictation.playPause();
          break;
        case 'ArrowRight':
          dictation.next();
          break;
        case 'ArrowLeft':
          dictation.previous();
          break;
        case 'r':
        case 'R':
          dictation.repeat();
          break;
        case 's':
        case 'S':
          dictation.stop();
          break;
        case 'PageUp':
          e.preventDefault();
          pdf.prevPage();
          break;
        case 'PageDown':
          e.preventDefault();
          pdf.nextPage();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [dictation, pdf]);

  if (!pdf.doc || !pdf.docInfo) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <UploadScreen
          onFileSelected={handleFileSelected}
          isLoading={pdf.status === 'loading'}
          errorMessage={pdf.error}
        />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50 dark:bg-slate-950">
      <PDFToolbar
        fileName={pdf.docInfo.fileName}
        zoom={pdf.zoom}
        onZoomIn={pdf.zoomIn}
        onZoomOut={pdf.zoomOut}
        onResetZoom={pdf.resetZoom}
        onOpenSettings={() => setSettingsOpen(true)}
        onNewFile={handleNewFile}
      />

      {resumeBannerVisible && sessionResume.pendingResume && (
        <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50 px-4 py-2 text-sm text-blue-800 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200">
          <span>
            Resume from Page {sessionResume.pendingResume.pageNumber}, Line{' '}
            {sessionResume.pendingResume.unitIndex + 1}?
          </span>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={handleResumeAccept}
              className="rounded-md bg-blue-600 px-3 py-1 font-medium text-white hover:bg-blue-700"
            >
              Resume
            </button>
            <button
              type="button"
              onClick={handleResumeDismiss}
              className="rounded-md px-3 py-1 font-medium text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/40"
            >
              Start over
            </button>
          </div>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="flex min-h-0 flex-1 flex-col">
          <PDFViewer
            canvasRef={pdf.canvasRef}
            isRendering={pdf.status === 'loading'}
            errorMessage={pdf.status === 'error' ? pdf.error : null}
            highlightBoxes={highlightBoxes}
            zoom={pdf.zoom}
            highlightColor={settings.highlightColor}
            highlightOpacity={settings.highlightOpacity}
          />
          <PageNavigation
            pageNumber={pdf.pageNumber}
            numPages={pdf.docInfo.numPages}
            onGoToPage={pdf.goToPage}
            onPrev={pdf.prevPage}
            onNext={pdf.nextPage}
          />
        </div>

        <DictationPanel
          currentUnit={dictation.currentUnit}
          status={dictation.speechStatus}
          progress={dictation.progress}
          speed={settings.speechSpeed}
          onSpeedChange={(speechSpeed) => setSettings((s) => ({ ...s, speechSpeed }))}
          onPrevious={dictation.previous}
          onRepeat={dictation.repeat}
          onPlayPause={dictation.playPause}
          onNext={dictation.next}
          scannedMessage={dictation.scannedMessage}
          unitsLoading={dictation.unitsLoading}
          ocrStatus={dictation.ocrStatus}
          ocrMessage={dictation.ocrMessage}
          onRunOcr={dictation.runOcr}
        />
      </div>

      {settingsOpen && (
        <SettingsPanel
          settings={settings}
          onChange={setSettings}
          onClose={() => setSettingsOpen(false)}
          voices={dictation.voices}
        />
      )}
    </div>
  );
}
