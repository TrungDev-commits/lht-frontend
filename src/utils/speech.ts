// Deep speech module: reads mixed Vietnamese + English/IT text naturally.
//
// Small interface: speakText / pauseSpeech / resumeSpeech / stopSpeech /
// subscribeSpeech / isSpeechSupported.
//
// Implementation hides: language segmentation, per-language voice selection,
// long-utterance chunking, queued playback with gap pauses (avoids Web Speech
// stalls), cancellation, and pause/resume across the queue.

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onEnd?: () => void;
}

export interface SpeechController {
  stop: () => void;
}

export interface SpeechState {
  speaking: boolean;
  paused: boolean;
}

export type SpeechStateListener = (state: SpeechState) => void;

type Lang = 'VI' | 'EN';

interface Segment {
  lang: Lang;
  text: string;
}

interface Session {
  id: number;
  queue: Segment[];
  index: number;
  cancelled: boolean;
  paused: boolean;
  gapTimer: number | null;
  rate: number;
  pitch: number;
  onEnd?: () => void;
}

const DEFAULT_RATE = 1.0;
const DEFAULT_PITCH = 1.0;
const GAP_MS = 240;
const VI_CHUNK_CHARS = 140;

const VI_DIACRITIC_RE =
  /[ăâđêôơưĂÂĐÊÔƠƯáàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵ]/;
const WORD_RE = /[\p{L}\p{N}]+(?:[._/#@'-][\p{L}\p{N}]+)*/gu;

export function isSpeechSupported(): boolean {
  return 'speechSynthesis' in window;
}

let session: Session | null = null;
let sessionCounter = 0;
const listeners = new Set<SpeechStateListener>();

let viVoice: SpeechSynthesisVoice | null = null;
let enVoice: SpeechSynthesisVoice | null = null;

function voiceScore(v: SpeechSynthesisVoice, langPrefix: string): number {
  const name = v.name.toLowerCase();
  const lang = (v.lang ?? '').toLowerCase();
  let score = 0;
  if (name.includes('google') || name.includes('natural')) score += 4;
  if (langPrefix === 'vi') {
    const viNames = ['ban mai', 'hồng đào', 'hoaimy', 'linh', 'minh-quang', 'thu minh', 'chi minh', 'ngọc'];
    if (viNames.some((n) => name.includes(n))) score += 3;
  } else {
    if (lang.includes('en-us') || name.includes('us english')) score += 2;
    if (lang.includes('en-gb') || name.includes('uk english')) score += 2;
  }
  if (v.localService) score += 0.5;
  return score;
}

function pickVoice(langPrefix: string): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const candidates = voices
    .filter((v) => (v.lang ?? '').toLowerCase().startsWith(langPrefix))
    .sort((a, b) => voiceScore(b, langPrefix) - voiceScore(a, langPrefix));
  return candidates[0] ?? null;
}

function refreshVoices() {
  if (!isSpeechSupported()) return;
  viVoice = pickVoice('vi');
  enVoice = pickVoice('en');
}

function ensureVoiceListener() {
  if (isSpeechSupported()) {
    window.speechSynthesis.addEventListener?.('voiceschanged', refreshVoices);
  }
}
ensureVoiceListener();

function classifyWord(token: string): Lang {
  if (VI_DIACRITIC_RE.test(token)) return 'VI';
  if (/[\d_.#/@'\\-]/.test(token)) return 'EN';
  if (/^[A-Z]{2,}[0-9]*$/.test(token)) return 'EN';
  return 'EN';
}

function chunkVietnamese(text: string): string[] {
  if (text.length <= VI_CHUNK_CHARS) return [text];
  const parts = text.split(/(?<=[.?!])\s+/);
  const chunks: string[] = [];
  let buf = '';
  for (const part of parts) {
    const next = buf ? `${buf} ${part}` : part;
    if (next.length > VI_CHUNK_CHARS && buf) {
      chunks.push(buf.trim());
      buf = part;
    } else {
      buf = next;
    }
  }
  if (buf.trim()) chunks.push(buf.trim());
  return chunks;
}

function buildSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  let current: Segment | null = null;
  let pos = 0;

  for (const match of text.matchAll(WORD_RE)) {
    const index = match.index ?? 0;
    const separator = text.slice(pos, index);
    const word = match[0];
    const lang = classifyWord(word);

    if (current && current.lang === lang) {
      current.text += separator + word;
    } else {
      if (current) segments.push(current);
      current = { lang, text: separator + word };
    }
    pos = index + word.length;
  }
  if (current) segments.push(current);

  const expanded: Segment[] = [];
  for (const seg of segments) {
    const trimmed = seg.text.trim();
    if (!trimmed) continue;
    if (seg.lang === 'VI') {
      for (const chunk of chunkVietnamese(trimmed)) expanded.push({ lang: 'VI', text: chunk });
    } else {
      expanded.push({ lang: 'EN', text: trimmed });
    }
  }
  return expanded;
}

function emitState() {
  const active = session !== null && !session.cancelled;
  const paused = active && session!.paused;
  for (const listener of listeners) listener({ speaking: active, paused });
}

function finish() {
  if (!session) return;
  if (session.gapTimer !== null) {
    window.clearTimeout(session.gapTimer);
    session.gapTimer = null;
  }
  if (session.onEnd) {
    const cb = session.onEnd;
    session.onEnd = undefined;
    cb();
  }
  session = null;
  emitState();
}

function speakNext(sessionId?: number) {
  const current = session;
  if (!current || current.cancelled) return;
  if (sessionId !== undefined && current.id !== sessionId) return;
  const myId = current.id;

  if (current.index >= current.queue.length) {
    finish();
    return;
  }

  const seg = current.queue[current.index++];
  const utterance = new SpeechSynthesisUtterance(seg.text);
  utterance.lang = seg.lang === 'VI' ? 'vi-VN' : 'en-US';
  utterance.voice = seg.lang === 'VI' ? viVoice : enVoice;
  utterance.rate = current.rate;
  utterance.pitch = current.pitch;

  utterance.onend = () => {
    if (session?.id !== myId || session.cancelled) return;
    if (session.gapTimer !== null) window.clearTimeout(session.gapTimer);
    session.gapTimer = window.setTimeout(() => {
      speakNext(myId);
    }, GAP_MS);
  };

  utterance.onerror = (event) => {
    if (session?.id !== myId) return;
    if (event.error === 'canceled' || event.error === 'interrupted') {
      if (session.cancelled) finish();
      return;
    }
    if (session.cancelled) return;
    if (session.gapTimer !== null) window.clearTimeout(session.gapTimer);
    session.gapTimer = window.setTimeout(() => {
      speakNext(myId);
    }, GAP_MS);
  };

  window.speechSynthesis.speak(utterance);
}

export function speakText(text: string, options?: SpeakOptions): SpeechController | null {
  const onEnd = options?.onEnd;
  if (!isSpeechSupported() || !text.trim()) {
    if (onEnd) onEnd();
    return null;
  }

  stopSpeech();

  const segments = buildSegments(text.trim());
  if (segments.length === 0) {
    if (onEnd) onEnd();
    return null;
  }

  session = {
    id: ++sessionCounter,
    queue: segments,
    index: 0,
    cancelled: false,
    paused: false,
    gapTimer: null,
    rate: options?.rate ?? DEFAULT_RATE,
    pitch: options?.pitch ?? DEFAULT_PITCH,
    onEnd,
  };
  emitState();

  const sessionId = session.id;
  window.setTimeout(() => speakNext(sessionId), 0);

  return { stop: stopSpeech };
}

export function pauseSpeech() {
  if (!session || session.cancelled || session.paused) return;
  session.paused = true;
  window.speechSynthesis.pause();
  emitState();
}

export function resumeSpeech() {
  if (!session || session.cancelled || !session.paused) return;
  session.paused = false;
  window.speechSynthesis.resume();
  emitState();
}

export function stopSpeech() {
  if (!session) {
    window.speechSynthesis.cancel();
    return;
  }
  session.cancelled = true;
  if (session.gapTimer !== null) {
    window.clearTimeout(session.gapTimer);
    session.gapTimer = null;
  }
  window.speechSynthesis.cancel();
  finish();
}

export function subscribeSpeech(listener: SpeechStateListener): () => void {
  listeners.add(listener);
  listener({ speaking: session !== null && !session.cancelled, paused: session !== null && !session.cancelled && session.paused });
  return () => {
    listeners.delete(listener);
  };
}
