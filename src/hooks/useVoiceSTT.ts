import { useCallback, useEffect, useRef, useState } from 'react';

export type VoiceCommandType = 'NEXT' | 'PREV' | 'BOOKMARK' | 'GALLERY' | 'DEBATE' | 'SLEEP' | 'NONE';

export interface VoiceCommandEvent {
  type: VoiceCommandType;
  transcript: string;
}

export interface UseVoiceSTTOptions {
  enabled: boolean;
  muted: boolean;
  language?: string;
  onCommand?: (event: VoiceCommandEvent) => void;
}

export interface UseVoiceSTTResult {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: string | null;
  start: () => void;
  stop: () => void;
}

const COMMAND_PATTERNS: Array<{ type: VoiceCommandType; pattern: RegExp }> = [
  { type: 'NEXT', pattern: /(tiếp|qua bài|tiếp theo|bài tiếp|sau nữa)/i },
  { type: 'PREV', pattern: /(quay lại|trước đó|bài trước|ngược lại)/i },
  { type: 'BOOKMARK', pattern: /(lưu|đạn|bookmark|save|nhớ)/i },
  { type: 'GALLERY', pattern: /(hình ảnh|video|thư viện|ảnh)/i },
  { type: 'DEBATE', pattern: /(thách thức|thử thách|debate|challeng)/i },
  { type: 'SLEEP', pattern: /(ngủ|đi ngủ|tạm biệt|sleep)/i },
];

const DEFAULT_LANGUAGE = 'vi-VN';
const RESTART_DELAY_MS = 250;
const SESSION_BUFFER_MAX_LENGTH = 80;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

export function useVoiceSTT(options: UseVoiceSTTOptions): UseVoiceSTTResult {
  const { enabled, muted, language = DEFAULT_LANGUAGE, onCommand } = options;

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const enabledRef = useRef(enabled);
  const mutedRef = useRef(muted);
  const listeningRef = useRef(false);
  const onCommandRef = useRef(onCommand);
  const sessionBufferRef = useRef('');
  const restartTimerRef = useRef<number | null>(null);
  const manualStopRef = useRef(false);
  const prevEnabledRef = useRef(enabled);

  const [supported] = useState<boolean>(() => getRecognitionConstructor() !== null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  enabledRef.current = enabled;
  mutedRef.current = muted;
  onCommandRef.current = onCommand;

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
  }, []);

  const startRecognition = useCallback(() => {
    const recognition = recognitionRef.current;
    if (!recognition || !enabledRef.current || mutedRef.current || manualStopRef.current) return;
    try {
      recognition.start();
    } catch {
      // Phiên nhận dạng đang chạy — bỏ qua.
    }
  }, []);

  const stopRecognition = useCallback(() => {
    clearRestartTimer();
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Phiên đã kết thúc — bỏ qua.
      }
    }
    listeningRef.current = false;
    setListening(false);
  }, [clearRestartTimer]);

  const matchCommand = useCallback((text: string): VoiceCommandType => {
    const haystack = text.toLowerCase();
    for (const rule of COMMAND_PATTERNS) {
      if (rule.pattern.test(haystack)) {
        return rule.type;
      }
    }
    return 'NONE';
  }, []);

  const start = useCallback(() => {
    manualStopRef.current = false;
    startRecognition();
  }, [startRecognition]);

  const stop = useCallback(() => {
    manualStopRef.current = true;
    stopRecognition();
  }, [stopRecognition]);

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
      if (enabledRef.current && !mutedRef.current && !manualStopRef.current) {
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
        setError('Quyền truy cập micro bị từ chối.');
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
        sessionBufferRef.current = (sessionBufferRef.current + ' ' + combined)
          .trim()
          .slice(-SESSION_BUFFER_MAX_LENGTH);
      }

      const command = matchCommand(`${sessionBufferRef.current} ${combined}`);
      if (command !== 'NONE') {
        sessionBufferRef.current = '';
        onCommandRef.current?.({ type: command, transcript: combined });
      }
    };

    recognitionRef.current = recognition;

    return () => {
      clearRestartTimer();
      listeningRef.current = false;
      try {
        recognition.abort();
      } catch {
        // Phiên đã kết thúc — bỏ qua.
      }
      recognitionRef.current = null;
    };
  }, [supported, language, clearRestartTimer, matchCommand, startRecognition]);

  useEffect(() => {
    if (enabled && !prevEnabledRef.current) {
      manualStopRef.current = false;
    }
    prevEnabledRef.current = enabled;

    if (muted) {
      stopRecognition();
      setTranscript('');
      sessionBufferRef.current = '';
    } else if (enabled) {
      setError(null);
      startRecognition();
    }
  }, [enabled, muted, startRecognition, stopRecognition]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        enabledRef.current &&
        !mutedRef.current &&
        !listeningRef.current
      ) {
        startRecognition();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [startRecognition]);

  return { supported, listening, transcript, error, start, stop };
}
