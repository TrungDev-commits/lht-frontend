import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { lhtDb, getAllNews, saveNewsBatch, type SyncedNews } from '../db/indexedDB';
import { apiUrl } from '../config/api';

const API_TODAY_URL = apiUrl('/api/news/today');
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

export interface SyncState {
  items: SyncedNews[];
  loading: boolean;
  error: string | null;
  online: boolean;
  lastSyncedAt: number | null;
  sync: () => Promise<boolean>;
}

export function useNewsSync(): SyncState {
  const items = useLiveQuery<SyncedNews[]>(() => getAllNews(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const syncInFlight = useRef(false);

  const sync = useCallback(async (): Promise<boolean> => {
    if (syncInFlight.current) return false;
    if (!navigator.onLine) {
      setError('Đang ngoại tuyến — dữ liệu đọc từ bộ nhớ cục bộ.');
      setLoading(false);
      return false;
    }

    syncInFlight.current = true;
    try {
      const response = await fetch(API_TODAY_URL, {
        headers: { Accept: 'application/json' },
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Lỗi máy chủ: HTTP ${response.status}`);
      }

      const payload = (await response.json()) as { items?: unknown[] };
      const stored = await saveNewsBatch(payload.items ?? []);
      setLastSyncedAt(Date.now());
      setError(null);
      setLoading(false);
      return stored > 0;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đồng bộ tin tức.');
      setLoading(false);
      return false;
    } finally {
      syncInFlight.current = false;
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      setError(null);
      void sync();
    };
    const handleOffline = () => {
      setOnline(false);
      setError('Đang ngoại tuyến — dữ liệu đọc từ bộ nhớ cục bộ.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    void sync();

    const interval = window.setInterval(() => {
      void sync();
    }, SYNC_INTERVAL_MS);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.clearInterval(interval);
    };
  }, [sync]);

  return {
    items: items ?? [],
    loading,
    error,
    online,
    lastSyncedAt,
    sync,
  };
}
