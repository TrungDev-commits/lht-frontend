import Dexie, { type EntityTable } from 'dexie';

export interface GraphNodeData {
  id: string;
  label: string;
  category: 'HARDWARE' | 'SOFTWARE';
  desc?: string;
}

export interface GraphEdgeData {
  source: string;
  target: string;
  relation?: string;
}

export interface GraphData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

export interface SyncedNews {
  id: string;
  source_url: string;
  keyword: string;
  audio_script: string;
  web_dev_analogy: string;
  graph_data: GraphData;
  title_hash: string;
  icebreaker: string;
  created_at: string;
  bookmarked: boolean;
  listened_fully: boolean;
  skipped: boolean;
  synced_at: number;
}

export interface PreferenceSnapshot {
  id: string;
  topics: string[];
  scores: Record<string, number>;
  suggested_rss_urls: string[];
  updated_at: number;
}

export interface ConversationRecord {
  id?: number;
  session_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: number;
}

export interface OfflineCacheEntry {
  key: string;
  value: string;
  expires_at: number;
}

class LHTDatabase extends Dexie {
  news!: EntityTable<SyncedNews, 'id'>;
  preferences!: EntityTable<PreferenceSnapshot, 'id'>;
  conversations!: EntityTable<ConversationRecord, 'id'>;
  offlineCache!: EntityTable<OfflineCacheEntry, 'key'>;

  constructor() {
    super('lht-terminal');
    this.version(1).stores({
      news: 'id, keyword, title_hash, created_at, bookmarked, synced_at',
      preferences: 'id, updated_at',
    });
    this.version(2).stores({
      news: 'id, keyword, title_hash, created_at, bookmarked, synced_at',
      preferences: 'id, updated_at',
      conversations: '++id, session_id, role, content, created_at',
      offlineCache: 'key, expires_at',
    });
  }
}

export const lhtDb = new LHTDatabase();

function toSyncedNews(raw: Record<string, unknown>): SyncedNews {
  const id =
    typeof raw._id === 'string'
      ? raw._id
      : typeof (raw as { _id?: { $oid?: string } })._id === 'object'
        ? ((raw as { _id: { $oid?: string } })._id?.$oid ?? String(raw._id))
        : String(raw._id ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

  const created_at = typeof raw.created_at === 'string' ? raw.created_at : new Date().toISOString();

  return {
    id,
    source_url: String(raw.source_url ?? ''),
    keyword: String(raw.keyword ?? ''),
    audio_script: String(raw.audio_script ?? ''),
    web_dev_analogy: String(raw.web_dev_analogy ?? ''),
    graph_data: (raw.graph_data ?? { nodes: [], edges: [] }) as GraphData,
    title_hash: String(raw.title_hash ?? raw.keyword ?? id),
    icebreaker: String(raw.icebreaker ?? ''),
    created_at,
    bookmarked: Boolean(raw.bookmarked),
    listened_fully: Boolean(raw.listened_fully),
    skipped: Boolean(raw.skipped),
    synced_at: Date.now(),
  };
}

export async function saveNewsBatch(items: unknown[]): Promise<number> {
  if (!items || items.length === 0) return 0;
  const normalized = items.map((item) => toSyncedNews(item as Record<string, unknown>));
  await lhtDb.transaction('rw', lhtDb.news, async () => {
    await lhtDb.news.bulkPut(normalized);
  });
  return normalized.length;
}

export async function getAllNews(): Promise<SyncedNews[]> {
  return lhtDb.news.orderBy('created_at').reverse().toArray();
}

export async function getNewsById(id: string): Promise<SyncedNews | undefined> {
  return lhtDb.news.get(id);
}

export async function getNewsToday(): Promise<SyncedNews[]> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  return lhtDb.news
    .where('synced_at')
    .aboveOrEqual(todayStart.getTime())
    .reverse()
    .sortBy('created_at');
}

export async function setBookmarked(id: string, bookmarked: boolean): Promise<void> {
  await lhtDb.news.update(id, { bookmarked });
}

export async function markListened(id: string, fully: boolean): Promise<void> {
  await lhtDb.news.update(id, { listened_fully: fully, skipped: !fully });
}

export async function markSkipped(id: string): Promise<void> {
  await lhtDb.news.update(id, { skipped: true });
}

export async function savePreferenceSnapshot(snapshot: PreferenceSnapshot): Promise<void> {
  await lhtDb.preferences.put(snapshot);
}

export async function getPreferenceSnapshot(): Promise<PreferenceSnapshot | undefined> {
  const all = await lhtDb.preferences.orderBy('updated_at').reverse().toArray();
  return all[0];
}

export async function saveConversationMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<number> {
  return lhtDb.conversations.add({
    session_id: sessionId,
    role,
    content,
    created_at: Date.now(),
  });
}

export async function getRecentConversations(sessionId: string, limit = 10): Promise<ConversationRecord[]> {
  return lhtDb.conversations
    .where('session_id')
    .equals(sessionId)
    .reverse()
    .limit(limit)
    .toArray();
}

export async function getOfflineCache(key: string): Promise<string | null> {
  const item = await lhtDb.offlineCache.get(key);
  if (!item) return null;
  if (item.expires_at < Date.now()) {
    await lhtDb.offlineCache.delete(key);
    return null;
  }
  return item.value;
}

export async function setOfflineCache(key: string, value: string, ttlMs = 24 * 60 * 60 * 1000): Promise<void> {
  await lhtDb.offlineCache.put({
    key,
    value,
    expires_at: Date.now() + ttlMs,
  });
}
