import { useCallback, useEffect, useRef, useState } from 'react';
import { VoicePrintAnalyzer, type VoicePrintResult } from '../utils/voicePrint';

export type LifecycleState = 'IDLE_SLEEP' | 'ACTIVE_HUD';

export interface UseWakeWordOptions {
  enabled: boolean;
  wakeRegex?: RegExp;
  onWake?: () => void;
  onUnauthorized?: () => void;
  language?: string;
  voicePrintEnabled?: boolean;
}

export interface UseWakeWordResult {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: string | null;
}

const DEFAULT_WAKE_REGEX = /dậy đi (jarvis|lht)/i;
const DEFAULT_LANGUAGE = 'vi-VN';
const RESTART_DELAY_MS = 300;
const SESSION_BUFFER_MAX_LENGTH = 120;
const VOICE_ANALYSIS_MS = 900;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useWakeWord(options: UseWakeWordOptions): UseWakeWordResult {
  const {
    enabled,
    wakeRegex = DEFAULT_WAKE_REGEX,
    onWake,
    onUnauthorized,
    language = DEFAULT_LANGUAGE,
    voicePrintEnabled = false,
  } = options;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const enabledRef = useRef(enabled);
  const listeningRef = useRef(false);
  const regexRef = useRef(wakeRegex);
  const onWakeRef = useRef(onWake);
  const onUnauthorizedRef = useRef(onUnauthorized);
  const sessionBufferRef = useRef('');
  const restartTimerRef = useRef<number | null>(null);
  const voicePrintRef = useRef<VoicePrintAnalyzer | null>(null);
  const analysisTimerRef = useRef<number | null>(null);

  const [supported] = useState<boolean>(() => getRecognitionConstructor() !== null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  regexRef.current = wakeRegex;
  onWakeRef.current = onWake;
  onUnauthorizedRef.current = onUnauthorized;

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (analysisTimerRef.current !== null) {
      window.clearTimeout(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
  }, []);

  const startRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !enabledRef.current) return;
    try {
      recognition.start();
    } catch {
      // InvalidStateError — phiên nhận dạng đang chạy, bỏ qua.
    }
  }, []);

  const stopRecognition = useCallback(() => {
    clearRestartTimer();
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Phiên đã kết thúc, bỏ qua.
      }
    }
    listeningRef.current = false;
    setListening(false);
  }, [clearRestartTimer]);

  const handleWakeWordMatch = useCallback(
    (recognition: SpeechRecognition) => {
      sessionBufferRef.current = '';
      setTranscript('');
      stopRecognition();

      const verifyAndWake = () => {
        const analyzer = voicePrintRef.current;
        if (analyzer?.getEnabled()) {
          let result: VoicePrintResult | null = null;
          try {
            result = analyzer.analyze();
          } catch {
            result = null;
          }
          if (!result || !result.matched) {
            onUnauthorizedRef.current?.();
            return;
          }
        }
        onWakeRef.current?.();
      };

      if (voicePrintRef.current?.getEnabled()) {
        analysisTimerRef.current = window.setTimeout(verifyAndWake, VOICE_ANALYSIS_MS);
      } else {
        verifyAndWake();
      }
    },
    [stopRecognition]
  );

  useEffect(() => {
    if (!supported) {
      setError('Trình duyệt không hỗ trợ nhận dạng giọng nói.');
      return;
    }

    const Ctor = getRecognitionConstructor();
    if (!Ctor) return;

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.lang = language;

    recognition.onstart = () => {
      listeningRef.current = true;
      setListening(true);
    };

    recognition.onend = () => {
      listeningRef.current = false;
      setListening(false);
      if (enabledRef.current) {
        clearRestartTimer();
        restartTimerRef.current = window.setTimeout(() => {
          restartTimerRef.current = null;
          startRecognition();
        }, RESTART_DELAY_MS);
      }
    };

    recognition.onerror = (event) => {
      const { error: errorCode } = event;
      if (errorCode === 'not-allowed' || errorCode === 'service-not-allowed') {
        setError('Quyền truy cập micro bị từ chối. Hãy bật micro để đánh thức L.H.T.');
      } else if (errorCode === 'network') {
        setError('Lỗi mạng khi kết nối dịch vụ nhận dạng giọng nói.');
      }
    };

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalText += chunk;
        } else {
          interimText += chunk;
        }
      }

      const combined = `${finalText} ${interimText}`.trim();
      setTranscript(combined);

      if (combined) {
        sessionBufferRef.current = (
          sessionBufferRef.current + ' ' + combined
        ).trim().slice(-SESSION_BUFFER_MAX_LENGTH);
      }

      const haystack = `${sessionBufferRef.current} ${combined}`.toLowerCase();
      if (regexRef.current.test(haystack)) {
        handleWakeWordMatch(recognition);
      }
    };

    recognitionRef.current = recognition;

    if (voicePrintEnabled) {
      let analyzer: VoicePrintAnalyzer | null = null;
      try {
        analyzer = new VoicePrintAnalyzer({ enabled: true });
        void analyzer.start().catch(() => {
          console.warn('[L.H.T VOICE PRINT] Không thể truy cập micro để phân tích giọng nói.');
        });
        voicePrintRef.current = analyzer;
      } catch (err) {
        console.warn('[L.H.T VOICE PRINT] Không khởi tạo được analyzer:', err);
        voicePrintRef.current = null;
      }
    }

    return () => {
      clearRestartTimer();
      listeningRef.current = false;
      try {
        recognition.abort();
      } catch {
        // Phiên đã kết thúc, bỏ qua.
      }
      recognitionRef.current = null;
      voicePrintRef.current?.dispose();
      voicePrintRef.current = null;
    };
  }, [supported, language, clearRestartTimer, handleWakeWordMatch, startRecognition, voicePrintEnabled]);

  useEffect(() => {
    enabledRef.current = enabled;
    if (enabled) {
      setError(null);
      startRecognition();
    } else {
      stopRecognition();
      setTranscript('');
      sessionBufferRef.current = '';
    }
  }, [enabled, startRecognition, stopRecognition]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && enabledRef.current && !listeningRef.current) {
        startRecognition();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startRecognition]);

  return { supported, listening, transcript, error };
}
