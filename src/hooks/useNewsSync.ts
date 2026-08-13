import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { lhtDb, getAllNews, saveNewsBatch, type SyncedNews } from '../db/indexedDB';
import { apiUrl } from '../config/api';

const API_TODAY_URL = apiUrl('/api/news/today');
const PIPELINE_RUN_URL = apiUrl('/api/pipeline/run');
const PIPELINE_SECRET =
  typeof import.meta.env.VITE_PIPELINE_SECRET === 'string'
    ? import.meta.env.VITE_PIPELINE_SECRET
    : undefined;
const SYNC_INTERVAL_MS = 30 * 60 * 1000;

export interface PipelineSummary {
  processed: number;
  created: number;
  duplicatesSkipped: number;
  failed: number;
  errors: string[];
  sourcesProcessed: number;
}

export interface SyncState {
  items: SyncedNews[];
  loading: boolean;
  error: string | null;
  online: boolean;
  lastSyncedAt: number | null;
  sync: () => Promise<boolean>;
  refresh: () => Promise<boolean>;
}

export function useNewsSync(): SyncState {
  const items = useLiveQuery<SyncedNews[]>(() => getAllNews(), []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const syncInFlight = useRef(false);

  const setOfflineError = useCallback(() => {
    setError('Đang ngoại tuyến — dữ liệu đọc từ bộ nhớ cục bộ.');
    setLoading(false);
  }, []);

  const fetchTodayAndStore = useCallback(async (): Promise<boolean> => {
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
    return stored > 0;
  }, []);

  const sync = useCallback(async (): Promise<boolean> => {
    if (syncInFlight.current) return false;
    if (!navigator.onLine) {
      setOfflineError();
      return false;
    }

    syncInFlight.current = true;
    setLoading(true);
    try {
      const stored = await fetchTodayAndStore();
      setError(null);
      return stored;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể đồng bộ tin tức.');
      return false;
    } finally {
      syncInFlight.current = false;
      setLoading(false);
    }
  }, [fetchTodayAndStore, setOfflineError]);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (syncInFlight.current) return false;
    if (!navigator.onLine) {
      setOfflineError();
      return false;
    }

    syncInFlight.current = true;
    setLoading(true);
    try {
      const pipelineResponse = await fetch(PIPELINE_RUN_URL, {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(PIPELINE_SECRET ? { secret: PIPELINE_SECRET } : {}),
        cache: 'no-store',
      });

      if (!pipelineResponse.ok) {
        throw new Error(
          pipelineResponse.status === 401
            ? 'Pipeline từ chối: thiếu bí mật X-LHT-Pipeline-Secret.'
            : `Pipeline lỗi: HTTP ${pipelineResponse.status}`
        );
      }

      const pipeline = (await pipelineResponse.json()) as { success?: boolean; result?: PipelineSummary };
      const stored = await fetchTodayAndStore();
      setError(null);
      if (!stored && pipeline?.result) {
        const { created, duplicatesSkipped, failed } = pipeline.result;
        setError(
          `Pipeline xong: ${created} tin mới, ${duplicatesSkipped} trùng lặp, ${failed} lỗi — chưa có tin mới trên kênh.`
        );
      }
      return stored;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không thể chạy pipeline tin tức.');
      return false;
    } finally {
      syncInFlight.current = false;
      setLoading(false);
    }
  }, [fetchTodayAndStore, setOfflineError]);

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
    refresh,
  };
}
