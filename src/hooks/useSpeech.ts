import { useCallback, useEffect, useState } from 'react';
import { SpeechService } from '../services/speechService';
import type { SpeechStatus } from '../types/dictation';

export function useSpeech() {
  const [status, setStatus] = useState<SpeechStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  // Lazy one-time construction via useState's initializer (the sanctioned
  // way to create a stable singleton without touching refs during render).
  const [service] = useState(
    () =>
      new SpeechService({
        onStatusChange: setStatus,
        onError: setError,
      }),
  );

  useEffect(() => {
    if (!SpeechService.isSupported()) return;
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  useEffect(() => {
    return () => {
      service.stop();
    };
  }, [service]);

  const speak = useCallback(
    (text: string, rate: number, voiceURI: string | null) => {
      setError(null);
      service.speak(text, rate, voiceURI);
    },
    [service],
  );

  const pause = useCallback(() => service.pause(), [service]);
  const resume = useCallback(() => service.resume(), [service]);
  const stop = useCallback(() => service.stop(), [service]);
  const repeat = useCallback(() => service.repeat(), [service]);

  return {
    status,
    error,
    voices,
    isSupported: SpeechService.isSupported(),
    speak,
    pause,
    resume,
    stop,
    repeat,
  };
}
