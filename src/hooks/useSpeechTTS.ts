import { useCallback, useEffect, useRef, useState } from 'react';

export interface SpeechTTSOptions {
  rate?: number;
  pitch?: number;
  lang?: string;
}

export interface UseSpeechTTSResult {
  supported: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  play: (text: string, options?: SpeechTTSOptions) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

const DEFAULT_LANG = 'vi-VN';

function pickVietnameseVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang?.toLowerCase().startsWith('vi')) ??
    voices.find((v) => v.lang?.toLowerCase().includes('vi')) ??
    voices.find((v) => v.default) ??
    null
  );
}

export function useSpeechTTS(): UseSpeechTTSResult {
  const [supported] = useState<boolean>(() => 'speechSynthesis' in window);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const currentTextRef = useRef('');
  const speechInProgressRef = useRef(false);

  const loadVoices = useCallback(() => {
    if (supported) {
      voiceRef.current = pickVietnameseVoice();
    }
  }, [supported]);

  useEffect(() => {
    if (!supported) return;
    loadVoices();
    window.speechSynthesis.getVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      window.speechSynthesis.cancel();
      speechInProgressRef.current = false;
    };
  }, [supported, loadVoices]);

  const stop = useCallback(() => {
    if (!supported) return;
    window.speechSynthesis.cancel();
    speechInProgressRef.current = false;
    setIsSpeaking(false);
    setIsPaused(false);
  }, [supported]);

  const play = useCallback(
    (text: string, options?: SpeechTTSOptions) => {
      if (!supported || !text.trim()) return;

      stop();

      const utterance = new SpeechSynthesisUtterance(text.trim());
      utterance.lang = options?.lang ?? DEFAULT_LANG;
      utterance.rate = options?.rate ?? 1.05;
      utterance.pitch = options?.pitch ?? 1.0;

      if (voiceRef.current) {
        utterance.voice = voiceRef.current;
      }

      currentTextRef.current = text.trim();
      speechInProgressRef.current = true;
      setIsSpeaking(true);
      setIsPaused(false);

      utterance.onend = () => {
        speechInProgressRef.current = false;
        setIsSpeaking(false);
        setIsPaused(false);
      };
      utterance.onerror = () => {
        speechInProgressRef.current = false;
        setIsSpeaking(false);
        setIsPaused(false);
      };

      window.speechSynthesis.speak(utterance);
    },
    [supported, stop]
  );

  const pause = useCallback(() => {
    if (!supported || !speechInProgressRef.current) return;
    window.speechSynthesis.pause();
    setIsPaused(true);
  }, [supported]);

  const resume = useCallback(() => {
    if (!supported || !speechInProgressRef.current) return;
    window.speechSynthesis.resume();
    setIsPaused(false);
  }, [supported]);

  return { supported, isSpeaking, isPaused, play, pause, resume, stop };
}
