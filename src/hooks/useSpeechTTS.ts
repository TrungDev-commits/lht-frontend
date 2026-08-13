import { useCallback, useEffect, useState } from 'react';
import {
  isSpeechSupported,
  pauseSpeech,
  resumeSpeech,
  speakText,
  stopSpeech,
  subscribeSpeech,
} from '../utils/speech';

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

export function useSpeechTTS(): UseSpeechTTSResult {
  const [supported] = useState<boolean>(() => isSpeechSupported());
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    return subscribeSpeech((state) => {
      setIsSpeaking(state.speaking);
      setIsPaused(state.paused);
    });
  }, []);

  const play = useCallback((text: string, options?: SpeechTTSOptions) => {
    speakText(text, options);
  }, []);

  const pause = useCallback(() => {
    pauseSpeech();
  }, []);

  const resume = useCallback(() => {
    resumeSpeech();
  }, []);

  const stop = useCallback(() => {
    stopSpeech();
  }, []);

  return { supported, isSpeaking, isPaused, play, pause, resume, stop };
}
