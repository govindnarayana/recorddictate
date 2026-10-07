import type { SpeechStatus } from '../types/dictation';

export interface SpeechServiceCallbacks {
  onStatusChange: (status: SpeechStatus) => void;
  onError?: (message: string) => void;
}

/**
 * Thin, stateful wrapper around window.speechSynthesis so the rest of the
 * app can call speak/pause/resume/stop without touching the raw API.
 */
export class SpeechService {
  private callbacks: SpeechServiceCallbacks;
  private currentText = '';
  private currentRate = 1;
  private currentVoiceURI: string | null = null;

  constructor(callbacks: SpeechServiceCallbacks) {
    this.callbacks = callbacks;
  }

  static isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  getVoices(): SpeechSynthesisVoice[] {
    if (!SpeechService.isSupported()) return [];
    return window.speechSynthesis.getVoices();
  }

  speak(text: string, rate: number, voiceURI: string | null): void {
    if (!SpeechService.isSupported()) {
      this.callbacks.onError?.('Speech synthesis is not supported in this browser.');
      this.callbacks.onStatusChange('error');
      return;
    }

    // Cancel any in-flight speech first; SpeechSynthesis queues otherwise.
    window.speechSynthesis.cancel();

    this.currentText = text;
    this.currentRate = rate;
    this.currentVoiceURI = voiceURI;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;

    if (voiceURI) {
      const voice = this.getVoices().find((v) => v.voiceURI === voiceURI);
      if (voice) utterance.voice = voice;
    }

    utterance.onstart = () => this.callbacks.onStatusChange('reading');
    utterance.onend = () => this.callbacks.onStatusChange('finished');
    utterance.onpause = () => this.callbacks.onStatusChange('paused');
    utterance.onresume = () => this.callbacks.onStatusChange('reading');
    utterance.onerror = (e) => {
      // "interrupted" and "canceled" are expected when we intentionally
      // cancel to start new speech (e.g. Next/Repeat) — not real errors.
      if (e.error === 'interrupted' || e.error === 'canceled') return;
      this.callbacks.onError?.(`Speech error: ${e.error}`);
      this.callbacks.onStatusChange('error');
    };

    window.speechSynthesis.speak(utterance);
  }

  pause(): void {
    if (!SpeechService.isSupported()) return;
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
    }
  }

  resume(): void {
    if (!SpeechService.isSupported()) return;
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  }

  stop(): void {
    if (!SpeechService.isSupported()) return;
    window.speechSynthesis.cancel();
    this.callbacks.onStatusChange('idle');
  }

  repeat(): void {
    if (!this.currentText) return;
    this.speak(this.currentText, this.currentRate, this.currentVoiceURI);
  }

  isPaused(): boolean {
    return SpeechService.isSupported() && window.speechSynthesis.paused;
  }

  isSpeaking(): boolean {
    return SpeechService.isSupported() && window.speechSynthesis.speaking;
  }
}
