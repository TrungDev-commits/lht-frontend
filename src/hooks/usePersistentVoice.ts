import { useCallback, useEffect, useRef, useState } from 'react';
import { useVoiceSTT, type UseVoiceSTTOptions } from './useVoiceSTT';

interface LocalWakeLockSentinel {
  release(): Promise<void>;
  addEventListener(type: string, listener: () => void): void;
}

interface LocalNavigatorWithWakeLock {
  wakeLock?: {
    request(type: 'screen'): Promise<LocalWakeLockSentinel>;
  };
}

export interface UsePersistentVoiceOptions extends UseVoiceSTTOptions {
  keepScreenAwake?: boolean;
}

export interface UsePersistentVoiceResult {
  supported: boolean;
  listening: boolean;
  transcript: string;
  error: string | null;
  wakeLockActive: boolean;
  togglePersistentMode: () => void;
  persistentMode: boolean;
}

export function usePersistentVoice(options: UsePersistentVoiceOptions): UsePersistentVoiceResult {
  const { keepScreenAwake = true, enabled, muted, language, onCommand } = options;

  const [persistentMode, setPersistentMode] = useState(enabled);
  const [wakeLockActive, setWakeLockActive] = useState(false);
  const wakeLockRef = useRef<LocalWakeLockSentinel | null>(null);

  const sttResult = useVoiceSTT({
    enabled: persistentMode,
    muted,
    language,
    onCommand,
  });

  // 1. Quản lý Screen Wake Lock (Giữ màn hình sáng không tắt trong 1-2 tiếng lái xe)
  const requestWakeLock = useCallback(async () => {
    if (typeof navigator === 'undefined') return;
    const nav = navigator as unknown as LocalNavigatorWithWakeLock;
    if (!nav.wakeLock) return;

    try {
      if (wakeLockRef.current) return;
      const sentinel = await nav.wakeLock.request('screen');
      wakeLockRef.current = sentinel;
      setWakeLockActive(true);

      sentinel.addEventListener('release', () => {
        wakeLockRef.current = null;
        setWakeLockActive(false);
      });
    } catch (err) {
      console.warn('[PersistentVoice] Không thể kích hoạt Screen Wake Lock:', err);
    }
  }, []);

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      try {
        await wakeLockRef.current.release();
      } catch {
        // bỏ qua
      }
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  useEffect(() => {
    if (persistentMode && keepScreenAwake && !muted) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }

    return () => {
      releaseWakeLock();
    };
  }, [persistentMode, keepScreenAwake, muted, requestWakeLock, releaseWakeLock]);

  // Re-acquire wake lock khi tab hiển thị trở lại
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && persistentMode && keepScreenAwake && !muted) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [persistentMode, keepScreenAwake, muted, requestWakeLock]);

  const togglePersistentMode = useCallback(() => {
    setPersistentMode((prev) => !prev);
  }, []);

  return {
    supported: sttResult.supported,
    listening: sttResult.listening,
    transcript: sttResult.transcript,
    error: sttResult.error,
    wakeLockActive,
    togglePersistentMode,
    persistentMode,
  };
}
