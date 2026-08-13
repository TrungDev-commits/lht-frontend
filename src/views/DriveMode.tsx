import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from 'motion/react';
import { Volume2, VolumeX, Bookmark, ChevronLeft, ChevronRight, Radio, AlertOctagon, ArrowDown, Hand, CheckCircle2 } from 'lucide-react';
import type { SyncedNews } from '../db/indexedDB';
import { useSpeechTTS } from '../hooks/useSpeechTTS';
import { useMediaSession } from '../hooks/useMediaSession';

export interface DriveModeProps {
  items: SyncedNews[];
  onToggleBookmark: (id: string, bookmarked: boolean) => void;
  onOpenGallery: (item: SyncedNews) => void;
}

const WAVE_BARS = [40, 70, 35, 90, 60, 100, 45, 80, 55, 95, 30, 75, 50, 85, 40, 65];

export function DriveMode({ items, onToggleBookmark, onOpenGallery }: DriveModeProps) {
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
        <div className="w-20 h-20 rounded-full border-2 border-[#FF1E1E]/40 border-t-[#FF1E1E] animate-spin" />
        <p className="font-mono text-sm text-[#FF5E00] tracking-widest">ĐANG ĐỒNG BỘ BẢN TIN...</p>
        <p className="text-xs text-gray-500">Chưa có tin tức hôm nay trong bộ nhớ cục bộ.</p>
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

      <div className="w-full max-w-md grid grid-cols-3 gap-2 py-2 px-3 rounded-2xl bg-[#0c0606]/80 backdrop-blur-md border border-[#FF1E1E]/25 shadow-[0_0_15px_rgba(255,30,30,0.15)] font-mono text-xs">
        <div className="flex flex-col items-center justify-center p-1 border-r border-[#FF1E1E]/20">
          <div className="text-[9px] text-gray-400 tracking-wider">TỐC ĐỘ</div>
          <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF1E1E] to-[#FF5E00]">
            {speed} <span className="text-[10px] text-gray-400 font-normal">KM/H</span>
          </div>
        </div>
        <div className="flex flex-col items-center justify-center p-1 border-r border-[#FF1E1E]/20">
          <div className="text-[9px] text-gray-400 tracking-wider">VÒNG TUA</div>
          <div className="text-sm font-bold text-[#FF5E00]">{rpm} RPM</div>
        </div>
        <div className="flex flex-col items-center justify-center p-1">
          <div className="text-[9px] text-gray-400 tracking-wider">BẢN TIN</div>
          <div className="text-sm font-bold text-[#FF0055]">
            {currentIndex + 1}/{items.length}
          </div>
        </div>
      </div>

      <div className="w-full max-w-md my-1 flex items-center justify-center gap-2 font-mono text-[9px] text-[#FF5E00]/80 bg-[#120808]/80 py-1.5 px-3 rounded-full border border-[#FF1E1E]/30 shadow-[0_0_10px_rgba(255,30,30,0.15)]">
        <Hand className="w-3.5 h-3.5 text-[#FF1E1E] animate-pulse" />
        <span>VUỐT NGANG: ĐỔI TIN • VUỐT XUỐNG: LƯU ĐẠN • CHẠM: BẬT/TẮT GIỌNG NÓI</span>
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
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c0808] border border-[#FF1E1E]/40 text-[#FF5E00] text-[10px] font-mono tracking-widest font-bold uppercase mb-3 shadow-[0_0_10px_rgba(255,30,30,0.2)]">
              <Radio className="w-3 h-3 text-[#FF1E1E] animate-pulse" />
              <span>{currentItem.bookmarked ? 'ĐÃ LƯU' : 'TIN MỚI'}</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-black tracking-tight leading-none uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#FF1E1E] via-[#FF5E00] to-[#FF0055] drop-shadow-[0_0_20px_rgba(255,30,30,0.6)] my-2 transition-transform">
              {currentItem.keyword}
            </h1>

            <div className="mt-4 p-3.5 rounded-xl bg-[#0e0707]/90 border border-[#FF1E1E]/30 backdrop-blur-md shadow-[0_0_20px_rgba(255,30,30,0.15)] max-w-sm mx-auto text-left">
              <div className="text-[11px] font-mono text-[#FF5E00] uppercase tracking-wider mb-1 font-bold flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5 text-[#FF1E1E]" />
                <span>ẨN DỤ WEB DEV L.H.T</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed">
                {currentItem.web_dev_analogy || 'Chưa có phân tích ẩn dụ.'}
              </p>
            </div>

            {currentItem.icebreaker && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-[#0a0f0a]/80 border border-[#00FF88]/20 text-[11px] text-[#00FF88]/90 font-mono">
                💬 {currentItem.icebreaker}
              </div>
            )}

            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenGallery(currentItem);
              }}
              className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#180a0a] border border-[#FF1E1E]/30 text-[10px] font-mono text-[#FF5E00] hover:text-white transition-all"
            >
              <ArrowDown className="w-3 h-3 rotate-180" />
              MỞ THƯ VIỆN HÌNH ẢNH
            </button>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center justify-between w-full max-w-sm mt-6 px-4">
          <button
            onClick={goPrev}
            className="p-2.5 rounded-full bg-[#180a0a] border border-[#FF1E1E]/30 text-[#FF5E00] hover:text-white hover:bg-[#FF1E1E]/20 transition-all shadow-[0_0_10px_rgba(255,30,30,0.2)]"
            title="Tin trước"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <button
            onClick={triggerBookmark}
            className="group flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF1E1E] to-[#8B0000] text-white font-mono text-xs font-bold shadow-[0_0_15px_rgba(255,30,30,0.4)] hover:scale-105 active:scale-95 transition-all"
            title="Vuốt xuống hoặc bấm để lưu tin"
          >
            <Bookmark className={`w-4 h-4 ${currentItem.bookmarked ? 'text-white fill-white' : ''}`} />
            <span>{currentItem.bookmarked ? 'ĐÃ LƯU' : 'LƯU ĐẠN DƯỢC'}</span>
            <ArrowDown className="w-3.5 h-3.5 text-white/80 animate-bounce" />
          </button>

          <button
            onClick={goNext}
            className="p-2.5 rounded-full bg-[#180a0a] border border-[#FF1E1E]/30 text-[#FF5E00] hover:text-white hover:bg-[#FF1E1E]/20 transition-all shadow-[0_0_10px_rgba(255,30,30,0.2)]"
            title="Tin tiếp theo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="w-full max-w-md px-2">
        <div
          onClick={togglePlayPause}
          className="cursor-pointer p-3 rounded-2xl bg-[#0c0606]/90 border border-[#FF1E1E]/30 backdrop-blur-md shadow-[0_0_20px_rgba(255,30,30,0.2)] flex flex-col items-center"
        >
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
}
