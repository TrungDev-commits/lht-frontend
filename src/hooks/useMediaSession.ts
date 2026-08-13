import { useCallback, useEffect, useRef } from 'react';

export interface MediaSessionBindings {
  title: string;
  artist?: string;
  album?: string;
  artwork?: { src: string; sizes?: string; type?: string }[];
  isPlaying: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onStop?: () => void;
}

export function useMediaSession(bindings: MediaSessionBindings): void {
  const handlersRef = useRef(bindings);

  useEffect(() => {
    handlersRef.current = bindings;
  }, [bindings]);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;

    const mediaSession = navigator.mediaSession;

    const syncMetadata = () => {
      const { title, artist = 'L.H.T Terminal', album = 'Bản tin công nghệ' } =
        handlersRef.current;

      if ('MediaMetadata' in window) {
        mediaSession.metadata = new MediaMetadata({
          title,
          artist,
          album,
          artwork: handlersRef.current.artwork ?? [],
        });
      }
    };

    syncMetadata();

    const handlers: Array<[MediaSessionAction, MediaSessionActionHandler | null]> = [
      ['play', () => handlersRef.current.onPlay?.()],
      ['pause', () => handlersRef.current.onPause?.()],
      ['nexttrack', () => handlersRef.current.onNext?.()],
      ['previoustrack', () => handlersRef.current.onPrevious?.()],
      ['stop', () => handlersRef.current.onStop?.()],
    ];

    const registered: Array<MediaSessionAction | null> = [];
    for (const [action, handler] of handlers) {
      try {
        if (handler) {
          mediaSession.setActionHandler(action, handler);
          registered.push(action);
        } else {
          mediaSession.setActionHandler(action, null);
          registered.push(null);
        }
      } catch {
        registered.push(null);
      }
    }

    return () => {
      for (const action of registered) {
        if (action) {
          try {
            mediaSession.setActionHandler(action, null);
          } catch {
            // Bỏ qua nếu trình duyệt không hỗ trợ.
          }
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    const mediaSession = navigator.mediaSession;
    try {
      mediaSession.playbackState = bindings.isPlaying ? 'playing' : 'paused';
    } catch {
      // Không phải trình duyệt nào cũng hỗ trợ playbackState.
    }
  }, [bindings.isPlaying]);

  const updatePosition = useCallback((position: number, duration: number) => {
    if (!('mediaSession' in navigator)) return;
    try {
      navigator.mediaSession.setPositionState({ position, duration });
    } catch {
      // Bỏ qua nếu không hỗ trợ.
    }
  }, []);

  useEffect(() => {
    updatePosition(0, 0);
  }, [updatePosition]);
}
