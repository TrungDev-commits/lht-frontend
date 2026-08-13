import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from 'motion/react';
import { Volume2, VolumeX, Bookmark, ChevronLeft, ChevronRight, Radio, AlertOctagon, ArrowDown, Hand, CheckCircle2, Sparkles, RefreshCw } from 'lucide-react';
import type { SyncedNews } from '../db/indexedDB';
import { useSpeechTTS } from '../hooks/useSpeechTTS';
import { useMediaSession } from '../hooks/useMediaSession';

export interface DriveModeHandle {
  goNext: () => void;
  goPrev: () => void;
  toggleBookmark: () => void;
}

export interface DriveModeProps {
  items: SyncedNews[];
  onToggleBookmark: (id: string, bookmarked: boolean) => void;
  onOpenGallery: (item: SyncedNews) => void;
  onRefresh?: () => void;
  syncing?: boolean;
}

const WAVE_BARS = [40, 70, 35, 90, 60, 100, 45, 80, 55, 95, 30, 75, 50, 85, 40, 65];

function HUDCorners({ className = '' }: { className?: string }) {
  return (
    <>
      <span className={`lht-corner lht-corner-tl ${className}`} />
      <span className={`lht-corner lht-corner-tr ${className}`} />
      <span className={`lht-corner lht-corner-bl ${className}`} />
      <span className={`lht-corner lht-corner-br ${className}`} />
    </>
  );
}

function SpeedGauge({ value, max = 160, size = 96 }: { value: number; max?: number; size?: number }) {
  const cx = 60;
  const cy = 60;
  const r = 48;
  const aMin = 140;
  const aMax = 40;
  const clamp = Math.max(0, Math.min(max, value));
  const angle = aMin - (clamp / max) * (aMin - aMax);

  const pt = (deg: number, radius: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  };
  const arcPath = (fromDeg: number, toDeg: number) => {
    const f = pt(fromDeg, r);
    const t = pt(toDeg, r);
    return `M ${f.x.toFixed(2)} ${f.y.toFixed(2)} A ${r} ${r} 0 0 1 ${t.x.toFixed(2)} ${t.y.toFixed(2)}`;
  };
  const ticks = Array.from({ length: 11 }, (_, i) => {
    const a = aMin - (i / 10) * (aMin - aMax);
    const outer = pt(a, r);
    const inner = pt(a, r - (i % 5 === 0 ? 8 : 5));
    return { x: outer.x, y: outer.y, ix: inner.x, iy: inner.y, major: i % 5 === 0 };
  });

  return (
    <svg width={size} height={(size * 70) / 120} viewBox="0 0 120 70" fill="none" aria-hidden="true">
      <path d={arcPath(aMin, aMax)} stroke="rgba(255,94,0,0.25)" strokeWidth="3" strokeLinecap="round" />
      <path d={arcPath(aMin, angle)} stroke="#FF5E00" strokeWidth="3" strokeLinecap="round" />
      {ticks.map((t, i) => (
        <line
          key={i}
          x1={t.x.toFixed(2)}
          y1={t.y.toFixed(2)}
          x2={t.ix.toFixed(2)}
          y2={t.iy.toFixed(2)}
          stroke={t.major ? 'rgba(255,190,90,0.9)' : 'rgba(255,94,0,0.5)'}
          strokeWidth={t.major ? 1.6 : 1}
        />
      ))}
      <g className="lht-needle" style={{ transform: `rotate(${angle - 270}deg)` }}>
        <line x1={cx} y1={cy} x2={cx} y2={cy - r + 12} stroke="#FF5E00" strokeWidth="2" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="3.5" fill="#FFE3A3" />
      </g>
    </svg>
  );
}

function RpmRing({ value, max = 9000, size = 64 }: { value: number; max?: number; size?: number }) {
  const r = 30;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" aria-hidden="true">
      <circle cx="40" cy="40" r={r} fill="none" stroke="rgba(255,30,30,0.2)" strokeWidth="4" />
      <circle
        className="lht-arc-progress"
        cx="40"
        cy="40"
        r={r}
        fill="none"
        stroke="#FF1E1E"
        strokeWidth="4"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform="rotate(-90 40 40)"
      />
      <text
        x="40"
        y="45"
        textAnchor="middle"
        fill="#FF5E00"
        fontSize="16"
        fontWeight="800"
        fontFamily="ui-monospace, monospace"
      >
        {(value / 1000).toFixed(1)}k
      </text>
    </svg>
  );
}

export const DriveMode = forwardRef<DriveModeHandle, DriveModeProps>(function DriveMode(
  { items, onToggleBookmark, onOpenGallery, onRefresh, syncing },
  ref
) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flashFeedback, setFlashFeedback] = useState(false);
  const [speed, setSpeed] = useState(68);
  const [rpm, setRpm] = useState(4800);

  const tts = useSpeechTTS();
  const currentItem = items[currentIndex] ?? items[0] ?? null;

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const dragOpacity = useTransform(y, [0, 150], [1, 0.4]);

  const playingKeyRef = useRef<string | null>(null);
  const currentItemRef = useRef<SyncedNews | null>(null);
  currentItemRef.current = currentItem;

  const togglePlayPause = useCallback(() => {
    const item = currentItemRef.current;
    if (!item) return;

    if (tts.isSpeaking) {
      if (tts.isPaused) {
        tts.resume();
      } else {
        tts.pause();
      }
      return;
    }

    if (playingKeyRef.current === item.id) {
      tts.stop();
      playingKeyRef.current = null;
      return;
    }

    const text = item.audio_script || item.keyword;
    playingKeyRef.current = item.id;
    tts.play(text);
  }, [tts]);

  useEffect(() => {
    if (!currentItem) return;
    playingKeyRef.current = null;
  }, [currentIndex, currentItem]);

  const goNext = useCallback(() => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  }, [items.length]);

  const goPrev = useCallback(() => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  }, [items.length]);

  const triggerBookmark = useCallback(() => {
    const item = currentItemRef.current;
    if (!item) return;

    onToggleBookmark(item.id, !item.bookmarked);
    setFlashFeedback(true);
    window.setTimeout(() => setFlashFeedback(false), 350);

    if ('vibrate' in navigator) {
      navigator.vibrate([40, 30, 40]);
    }
  }, [onToggleBookmark]);

  const handleSwipeDown = useCallback(() => {
    triggerBookmark();
  }, [triggerBookmark]);

  useImperativeHandle(
    ref,
    () => ({
      goNext,
      goPrev,
      toggleBookmark: triggerBookmark,
    }),
    [goNext, goPrev, triggerBookmark]
  );

  const onSelectFromMediaSession = useCallback(
    (action: 'play' | 'pause' | 'next' | 'prev' | 'stop') => {
      switch (action) {
        case 'play':
          tts.resume();
          break;
        case 'pause':
          tts.pause();
          break;
        case 'next':
          goNext();
          break;
        case 'prev':
          goPrev();
          break;
        case 'stop':
          tts.stop();
          break;
      }
    },
    [tts, goNext, goPrev]
  );

  useMediaSession({
    title: currentItem ? currentItem.keyword : 'L.H.T Terminal',
    artist: 'L.H.T Bản tin công nghệ',
    album: 'Drive Mode',
    isPlaying: tts.isSpeaking && !tts.isPaused,
    onPlay: () => onSelectFromMediaSession('play'),
    onPause: () => onSelectFromMediaSession('pause'),
    onNext: () => onSelectFromMediaSession('next'),
    onPrevious: () => onSelectFromMediaSession('prev'),
    onStop: () => onSelectFromMediaSession('stop'),
  });

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSpeed((prev) => Math.min(85, Math.max(52, prev + (Math.floor(Math.random() * 5) - 2))));
      setRpm((prev) => Math.min(7200, Math.max(3200, prev + (Math.floor(Math.random() * 200) - 100))));
    }, 1200);
    return () => window.clearInterval(interval);
  }, []);

  if (items.length === 0) {
    return (
      <div className="relative w-full min-h-[calc(100vh-120px)] flex flex-col items-center justify-center gap-4 px-6 text-center">
        <div className="lht-chamfer-lg relative bg-[#0c0606]/70 border border-[#FF1E1E]/25 p-8 flex flex-col items-center gap-4 drop-shadow-[0_0_20px_rgba(255,30,30,0.15)]">
          <HUDCorners />
          <div className="w-20 h-20 rounded-full border-2 border-[#FF1E1E]/40 border-t-[#FF1E1E] animate-spin" />
          <p className="font-mono text-sm text-[#FF5E00] tracking-widest">
            {syncing ? 'ĐANG ĐỒNG BỘ BẢN TIN...' : 'CHƯA CÓ BẢN TIN TRONG KHO'}
          </p>
          <p className="text-xs text-gray-500">Chưa có tin tức hôm nay trong bộ nhớ cục bộ.</p>
          {onRefresh && !syncing && (
            <button
              onClick={onRefresh}
              className="lht-chamfer inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-[#FF1E1E] to-[#8B0000] text-white font-mono text-xs font-bold drop-shadow-[0_0_15px_rgba(255,30,30,0.4)] hover:scale-105 active:scale-95 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              CẬP NHẬT BẢN TIN
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full min-h-[calc(100vh-120px)] flex flex-col justify-between items-center px-4 pt-2 pb-24 overflow-hidden select-none">
      <AnimatePresence>
        {flashFeedback && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-[#FF1E1E] pointer-events-none flex items-center justify-center"
          >
            <div className="px-6 py-3 rounded-2xl bg-black/80 border-2 border-[#FF1E1E] text-[#FF5E00] font-mono text-lg font-extrabold tracking-widest shadow-[0_0_30px_#FF1E1E] flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-[#FF1E1E] animate-bounce" />
              <span>{currentItem?.bookmarked ? 'ĐÃ LƯU KHO ĐẠN DƯỢC!' : 'ĐÃ BỎ LƯU ĐẠN!'}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-md">
        <div className="flex items-center justify-between font-mono text-[9px] tracking-[0.2em] text-[#FF5E00]/80 mb-1.5 px-1">
          <span className="flex items-center gap-1.5">
            <span className="relative inline-flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-[#FF1E1E] opacity-60 animate-ping" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#FF0055]" />
            </span>
            ARC REACTOR ONLINE
          </span>
          <span className="lht-blink hidden sm:inline">SUIT L.H.T // J.A.R.V.I.S</span>
          <span>MISSION {currentIndex + 1}/{items.length}</span>
        </div>

        <div className="lht-chamfer-lg relative bg-[#0c0606]/85 border border-[#FF1E1E]/30 drop-shadow-[0_0_20px_rgba(255,30,30,0.2)] px-3 pt-2 pb-2.5">
          <HUDCorners />
          <div className="flex items-center justify-around">
            <div className="flex flex-col items-center">
              <SpeedGauge value={speed} />
              <div className="mt-0.5 font-mono text-[10px] font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FF1E1E] to-[#FF5E00]">
                {speed} <span className="text-[8px] text-gray-400 font-normal">KM/H</span>
              </div>
            </div>
            <div className="flex flex-col items-center">
              <RpmRing value={rpm} />
              <div className="mt-0.5 font-mono text-[9px] text-gray-400 tracking-widest">VÒNG TUA</div>
            </div>
            <div className="flex flex-col items-start gap-1 font-mono text-[8px] text-[#FF5E00]/80 tracking-wider">
              <span className="text-gray-500 tracking-[0.25em] mb-0.5">THÔNG SỐ</span>
              <span><span className="text-[#FF1E1E]">▸</span> SUIT 100%</span>
              <span><span className="text-[#FF1E1E]">▸</span> NANO READY</span>
              <span><span className="text-[#FF1E1E]">▸</span> SYS.SYNC 97%</span>
            </div>
          </div>
        </div>

        <div className="lht-chamfer relative w-full mt-2 flex items-center justify-center gap-2 font-mono text-[9px] text-[#FF5E00]/80 bg-[#120808]/85 border border-[#FF1E1E]/25 px-3 py-1.5">
          <Hand className="w-3.5 h-3.5 text-[#FF1E1E] animate-pulse" />
          <span>VUỐT NGANG: ĐỔI TIN • VUỐT XUỐNG: LƯU ĐẠN • CHẠM: GIỌNG NÓI</span>
        </div>
      </div>

      <div className="w-full max-w-md my-auto flex flex-col items-center justify-center text-center relative py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentItem.id}
            style={{ x, y, rotate, opacity: dragOpacity }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70) goNext();
              else if (info.offset.x > 70) goPrev();
              else if (info.offset.y > 60) handleSwipeDown();
            }}
            onTap={togglePlayPause}
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full relative px-2 cursor-grab active:cursor-grabbing touch-pan-y"
          >
            <div className="inline-flex items-center mb-3">
              <span className="lht-hex-chip inline-flex items-center gap-1.5 px-3 py-1 bg-[#1c0808] border border-[#FF1E1E]/40 text-[#FF5E00] text-[10px] font-mono tracking-widest font-bold uppercase drop-shadow-[0_0_10px_rgba(255,30,30,0.25)]">
                <Radio className="w-3 h-3 text-[#FF1E1E] animate-pulse" />
                <span>{currentItem.bookmarked ? 'ĐÃ LƯU' : 'TIN MỚI'}</span>
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#FF1E1E] via-[#FF5E00] to-[#FF0055] drop-shadow-[0_0_20px_rgba(255,30,30,0.6)] my-2 transition-transform">
              {currentItem.keyword}
            </h1>

            <div className="lht-chamfer-lg relative max-w-sm mx-auto text-left mt-4 p-3.5 bg-[#0e0707]/95 border border-[#FF1E1E]/35 drop-shadow-[0_0_20px_rgba(255,30,30,0.2)]">
              <HUDCorners />
              <span className="lht-scanline" />
              <div className="flex items-center justify-between mb-1.5">
                <div className="text-[11px] font-mono text-[#FF5E00] uppercase tracking-wider font-bold flex items-center gap-1">
                  <AlertOctagon className="w-3.5 h-3.5 text-[#FF1E1E]" />
                  <span>ẨN DỤ WEB DEV</span>
                </div>
                <span className="text-[8px] font-mono text-gray-500 tracking-[0.2em]">NANOTECH.ANALYSIS</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                {currentItem.web_dev_analogy || 'Chưa có phân tích ẩn dụ.'}
              </p>
            </div>

            {currentItem.icebreaker && (
              <div className="lht-chamfer relative mt-3 px-3 py-2 bg-[#0a0f0a]/85 border border-[#00FF88]/25 text-[11px] text-[#00FF88]/90 font-mono drop-shadow-[0_0_12px_rgba(0,255,136,0.15)]">
                <div className="flex items-center gap-1.5 mb-0.5 text-[8px] tracking-[0.2em] text-[#00FF88]/70 font-bold">
                  <Sparkles className="w-3 h-3" />
                  <span>HOLO NOTE // ICEBREAKER</span>
                </div>
                {currentItem.icebreaker}
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenGallery(currentItem);
              }}
              className="lht-chamfer mt-4 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-11 bg-[#180a0a] border border-[#FF1E1E]/35 text-[10px] font-mono text-[#FF5E00] hover:text-white transition-all drop-shadow-[0_0_10px_rgba(255,30,30,0.15)]"
            >
              <ArrowDown className="w-3 h-3 rotate-180" />
              MỞ THƯ VIỆN HÌNH ẢNH
            </button>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between w-full max-w-sm mt-6 px-4">
          <button
            onClick={goPrev}
            className="min-w-12 min-h-12 flex items-center justify-center rounded-full bg-[#180a0a] border border-[#FF1E1E]/30 text-[#FF5E00] hover:text-white hover:bg-[#FF1E1E]/20 transition-all shadow-[0_0_10px_rgba(255,30,30,0.2)]"
            title="Tin trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={triggerBookmark}
            className="group flex items-center justify-center gap-1.5 px-4 py-2 min-h-11 rounded-xl bg-gradient-to-r from-[#FF1E1E] to-[#8B0000] text-white font-mono text-xs font-bold shadow-[0_0_15px_rgba(255,30,30,0.4)] hover:scale-105 active:scale-95 transition-all"
            title="Vuốt xuống hoặc bấm để lưu tin"
          >
            <Bookmark className={`w-4 h-4 ${currentItem.bookmarked ? 'text-white fill-white' : ''}`} />
            <span>{currentItem.bookmarked ? 'ĐÃ LƯU' : 'LƯU TIN'}</span>
            <ArrowDown className="w-3.5 h-3.5 text-white/80 animate-bounce" />
          </button>

          <button
            onClick={goNext}
            className="min-w-12 min-h-12 flex items-center justify-center rounded-full bg-[#180a0a] border border-[#FF1E1E]/30 text-[#FF5E00] hover:text-white hover:bg-[#FF1E1E]/20 transition-all shadow-[0_0_10px_rgba(255,30,30,0.2)]"
            title="Tin tiếp theo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="w-full max-w-md px-2">
        <div
          onClick={togglePlayPause}
          className="lht-chamfer-lg relative cursor-pointer p-3 bg-[#0c0606]/90 border border-[#FF1E1E]/30 backdrop-blur-md drop-shadow-[0_0_20px_rgba(255,30,30,0.2)] flex flex-col items-center"
        >
          <HUDCorners />
          <div className="w-full flex items-center justify-between px-1 mb-1 font-mono text-[8px] tracking-[0.2em] text-gray-500">
            <span>REACTOR // AUDIO</span>
            <span className="text-[#FF5E00]">L.H.T.VOICE</span>
          </div>
          <div className="flex items-end justify-center gap-1.5 h-8 w-full px-2">
            {WAVE_BARS.map((height, i) => (
              <div
                key={i}
                className="wave-bar w-1.5 rounded-full"
                style={{
                  height: tts.isSpeaking ? `${Math.max(15, Math.min(100, height))}%` : '20%',
                  background:
                    tts.isSpeaking && !tts.isPaused
                      ? 'linear-gradient(to top, #8B0000, #FF1E1E, #FF0055)'
                      : '#3a1212',
                  animationPlayState: tts.isSpeaking && !tts.isPaused ? 'running' : 'paused',
                  animationDelay: `${i * 0.05}s`,
                }}
              />
            ))}
          </div>

          <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-[#FF5E00]">
            {tts.isSpeaking ? (
              <>
                <Volume2 className={`w-3.5 h-3.5 text-[#FF1E1E] ${tts.isPaused ? '' : 'animate-pulse'}`} />
                <span className="font-bold tracking-wider text-[#FF0055]">
                  {tts.isPaused ? 'ĐÃ TẠM DỪNG GIỌNG NÓI' : 'ĐANG ĐỌC BẢN TIN TIẾNG VIỆT...'}
                </span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-gray-500" />
                <span className="text-gray-400">CHẠM ĐỂ BẬT GIỌNG NÓI L.H.T</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
