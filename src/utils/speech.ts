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
  consecutiveErrors: number;
  onEnd?: () => void;
}

const DEFAULT_RATE = 1.0;
const DEFAULT_PITCH = 1.0;
const GAP_MS = 240;
const VI_CHUNK_CHARS = 140;
const MAX_CONSECUTIVE_ERRORS = 3;
const VOICE_WAIT_MS = 1200;

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

const FEMALE_TOKENS = new Set([
  'an', 'mai', 'thao', 'trang', 'linh', 'ngoc', 'lan', 'hoa', 'ngan', 'phuong',
  'my', 'thuy', 'huong', 'ha', 'van', 'hue', 'xuan', 'tham', 'thu', 'chi',
  'hoai', 'hong', 'dao',
]);
const MALE_TOKENS = new Set([
  'nam', 'quang', 'huy', 'trung', 'long', 'hoang', 'tuan', 'duy', 'khoa',
  'phong', 'son', 'viet', 'duc', 'thanh', 'minh', 'manh', 'hung', 'cuong',
]);
const FEMALE_GENERIC = /(female|nữ|woman|giọng nữ|nữ giới)/i;

function normalizeVoiceName(name: string): string {
  return name.toLowerCase().replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
}

function voiceGender(name: string): 'F' | 'M' | null {
  const norm = normalizeVoiceName(name);
  const joined = norm.replace(/\s+/g, '');
  if (/(banmai|hoaimy|hongdao|thuminh|chiminh|thuylinh)/.test(joined)) return 'F';
  if (/minhquang/.test(joined)) return 'M';
  const tokens = norm.split(' ').filter(Boolean);
  const isFemale = tokens.some((t) => FEMALE_TOKENS.has(t));
  const isMale = tokens.some((t) => MALE_TOKENS.has(t));
  if (isFemale && !isMale) return 'F';
  if (isMale && !isFemale) return 'M';
  return null;
}

function voiceScore(v: SpeechSynthesisVoice, langPrefix: string): number {
  const lang = (v.lang ?? '').toLowerCase();
  let score = 0;

  if (langPrefix === 'vi') {
    if (lang === 'vi-vn') score += 8;
    else if (lang.startsWith('vi')) score += 5;
  } else {
    if (lang === 'en-us') score += 6;
    else if (lang === 'en-gb') score += 6;
    else if (lang.startsWith('en')) score += 4;
  }

  const name = v.name.toLowerCase();
  if (/(google|natural|online|neural)/.test(name)) score += 3;
  if (v.localService) score += 1;

  if (langPrefix === 'vi') {
    const gender = voiceGender(v.name);
    if (gender === 'F') score += 6;
    else if (gender === 'M') score -= 7;
    if (FEMALE_GENERIC.test(name)) score += 5;
  } else {
    if (voiceGender(v.name) === 'F') score += 1;
  }
  return score;
}

function pickVoice(voices: SpeechSynthesisVoice[], langPrefix: string): SpeechSynthesisVoice | null {
  if (!voices.length) return null;
  const candidates = voices
    .filter((v) => (v.lang ?? '').toLowerCase().startsWith(langPrefix))
    .sort((a, b) => voiceScore(b, langPrefix) - voiceScore(a, langPrefix));
  return candidates[0] ?? null;
}

function refreshVoices() {
  if (!isSpeechSupported()) return;
  const voices = window.speechSynthesis.getVoices();
  viVoice = pickVoice(voices, 'vi');
  enVoice = pickVoice(voices, 'en');
}

function waitForVoices(timeoutMs: number = VOICE_WAIT_MS): Promise<void> {
  if (!isSpeechSupported()) return Promise.resolve();
  if (window.speechSynthesis.getVoices().length > 0) {
    refreshVoices();
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    let done = false;
    const cleanup = () => {
      window.speechSynthesis.removeEventListener?.('voiceschanged', onChanged);
    };
    const onChanged = () => {
      if (done) return;
      done = true;
      cleanup();
      refreshVoices();
      resolve();
    };
    window.speechSynthesis.addEventListener?.('voiceschanged', onChanged);
    window.setTimeout(onChanged, timeoutMs);
  });
}

window.speechSynthesis?.addEventListener?.('voiceschanged', refreshVoices);
if (isSpeechSupported()) refreshVoices();

// Danh sách từ kỹ thuật EN phổ biến luôn đọc bằng giọng EN
const EN_TECH_TERMS = new Set([
  'api', 'cpu', 'gpu', 'npu', 'ram', 'rom', 'ssd', 'nvme', 'usb', 'hdmi',
  'ai', 'ml', 'dl', 'llm', 'tts', 'stt', 'sdk', 'ide', 'ui', 'ux',
  'html', 'css', 'sql', 'orm', 'oop', 'cli', 'gui', 'jwt', 'cdn',
  'fps', 'hdr', 'qhd', 'uhd', '4k', '8k', 'rgb', 'oled', 'ips', 'led',
  'wifi', 'lan', 'wan', 'vpn', 'dns', 'tcp', 'http', 'https', 'ssh',
  'react', 'vue', 'node', 'npm', 'git', 'php', 'aws', 'gcp', 'ios',
  'cuda', 'tops', 'tflops', 'gflops', 'lpddr', 'ddr', 'gddr', 'hbm',
  'sram', 'dram', 'pcie', 'arm', 'rtx', 'gtx', 'rx', 'core', 'ultra',
  'max', 'pro', 'plus', 'pc', 'ps5', 'xbox', 'android', 'windows',
  'linux', 'macos', 'ubuntu', 'docker', 'kubernetes', 'k8s',
  'typescript', 'javascript', 'python', 'java', 'golang', 'nginx',
  'redis', 'postgres', 'postgresql', 'mysql', 'mongodb', 'graphql',
  'grpc', 'websocket', 'webgl', 'webgpu', 'wasm', 'electron', 'vite',
  'nextjs', 'nuxt', 'svelte', 'angular', 'astro', 'tailwind', 'flutter',
  'swift', 'kotlin', 'spring', 'django', 'flask', 'fastapi', 'laravel',
  'cors', 'csrf', 'xss', 'seo', 'spa', 'ssr', 'crm', 'erp',
  's3', 'ec2', 'lambda', 'rds', 'vpc', 'azure', 'firebase', 'supabase',
  'vercel', 'netlify', 'cloudflare', 'rocm', 'pytorch', 'tensorflow',
  'keras', 'opencv', 'llama', 'bert', 'gpt', 'transformer', 'bios',
  'uefi', 'raid', 'sata', 'thunderbolt', 'bluetooth', 'nfc', 'zigbee',
  'lora', 'ethernet', 'gigabit', 'bit', 'byte', 'hz', 'ghz', 'mhz',
  'watt', 'mah', 'wh', 'ipc', 'nm', 'cmos', 'fpga', 'asic', 'soc',
  'tpu', 'rdna', 'adreno', 'mali', 'snapdragon', 'dimensity', 'ryzen',
  'xeon', 'epyc', 'geforce', 'radeon', 'ampere', 'hopper', 'turing',
  'volta', 'pascal', 'maxwell', 'kepler', 'vega', 'chipset',
]);

// Từ tiếng Việt không dấu phổ biến — luôn đọc bằng giọng VI (không rơi vào giọng EN)
const VI_WORDS = new Set([
  'la', 'va', 'vao', 'theo', 'cua', 'co', 'cho', 'trong', 'ngoai', 'tren',
  'duoi', 'giua', 'ben', 'khong', 'rat', 'qua', 'lam', 'nay', 'kia', 'do',
  'de', 'duoc', 'se', 'thi', 'nhung', 'that', 'dung', 'sai', 'tot', 'xau',
  'moi', 'cu', 'vai', 'may', 'ban', 'minh', 'em', 'anh', 'chi', 'toi', 'ta',
  'ho', 'nguoi', 'con', 'lon', 'nho', 'nen', 'roi', 'dang', 'da', 'sap',
  'vua', 'thu', 'gi', 'ai', 'doi', 'ngay', 'gio', 'phut', 'giay', 'nam',
  'thang', 'tuan', 'luc', 'khi', 'biet', 'hieu', 'ten', 'loai', 'hang',
  'gia', 'cong', 'nghe', 'khoa', 'hoc', 'ky', 'thuat', 'thong', 'tin',
  'dien', 'tu', 'may', 'tinh', 'phim', 'chuot', 'man', 'hinh', 'loa',
  'tai', 'nghe', 'pin', 'sac', 'nang', 'luong', 'toc', 'do', 'bo', 'nho',
  'o', 'cung', 'ran', 'dong', 'gom', 'ap', 'tich', 'cac', 'mot', 'hai',
  'ba', 'bon', 'sau', 'bay', 'tam', 'chin', 'muoi', 'lai', 'them', 'cung',
  'ca', 'hay', 'neu', 'moi', 'nguoi', 'trong', 'so', 'dau', 'cuoi', 'diem',
  'chuc', 'tram', 'nghin', 'trieu', 'ty', 'san', 'pham', 'moi', 'dung', 'ra',
]);

function classifyWord(token: string): Lang {
  // Có dấu tiếng Việt → VI
  if (VI_DIACRITIC_RE.test(token)) return 'VI';
  // Chứa ký tự kỹ thuật đặc biệt → EN
  if (/[\d_.#/@'\\+-]/.test(token)) return 'EN';
  // Toàn chữ hoa (viết tắt kỹ thuật) → EN
  if (/^[A-Z]{2,}[0-9]*$/.test(token)) return 'EN';
  const lower = token.toLowerCase();
  // Từ kỹ thuật phổ biến (không phân biệt hoa thường) → EN
  if (EN_TECH_TERMS.has(lower)) return 'EN';
  // Từ Latinh có số xen kẽ (LPDDR5X, RTX4090...) → EN
  if (/^[a-z]+[0-9]+[a-z]*$/.test(lower)) return 'EN';
  // Từ tiếng Việt không dấu phổ biến → VI
  if (VI_WORDS.has(lower)) return 'VI';
  // Từ Latinh ngắn (1-3 ký tự) thường là viết tắt → EN
  if (/^[A-Za-z]{1,3}$/.test(token)) return 'EN';
  // Còn lại: Latinh dài không dấu, giữ là EN (đọc bằng giọng EN)
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
  const isVi = seg.lang === 'VI';

  // Gán voice trước lang để tránh conflict trên một số browser
  const chosenVoice = isVi ? viVoice : enVoice;
  if (chosenVoice) {
    utterance.voice = chosenVoice;
    utterance.lang = chosenVoice.lang; // dùng đúng lang của voice được chọn
  } else {
    // Fallback khi chưa load được voice
    utterance.lang = isVi ? 'vi-VN' : 'en-US';
  }
  utterance.rate = current.rate;
  utterance.pitch = current.pitch;

  utterance.onstart = () => {
    if (session?.id === myId && !session.cancelled) session.consecutiveErrors = 0;
  };

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
    // Lỗi vĩnh viễn hoặc lỗi lặp lại liên tiếp → bỏ dở phiên thay vì retry vô hạn
    if (session.consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
      console.warn('[speech] bỏ dở phiên do quá nhiều lỗi liên tiếp:', event.error);
      finish();
      return;
    }
    console.warn('[speech] utterance error:', event.error, '| text:', seg.text.slice(0, 40));
    session.consecutiveErrors += 1;
    if (session.gapTimer !== null) window.clearTimeout(session.gapTimer);
    session.gapTimer = window.setTimeout(() => {
      speakNext(myId);
    }, GAP_MS);
  };

  // Chrome bug workaround: TTS thường bị treo sau ~15 giây
  // Giải pháp: pause/resume mỗi 10 giây để duy trì phiên
  const keepAlive = window.setInterval(() => {
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      window.speechSynthesis.resume();
    }
  }, 10_000);

  const origOnEnd = utterance.onend;
  utterance.onend = (ev) => {
    window.clearInterval(keepAlive);
    (origOnEnd as any)?.(ev);
  };
  const origOnError = utterance.onerror;
  utterance.onerror = (ev) => {
    window.clearInterval(keepAlive);
    (origOnError as any)?.(ev);
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
    consecutiveErrors: 0,
    onEnd,
  };
  emitState();

  const sessionId = session.id;
  void waitForVoices().then(() => speakNext(sessionId));

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
