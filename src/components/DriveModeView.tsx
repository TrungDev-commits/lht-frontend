import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'motion/react';
import { NewsCard } from '../types';
import { 
  Volume2, VolumeX, Bookmark, ChevronLeft, ChevronRight, 
  Gauge, Radio, Zap, Compass, CheckCircle2, AlertOctagon, ArrowDown, Hand
} from 'lucide-react';
import { speakVietnamese, stopSpeech, playHudSound } from '../utils/audioSynth';

interface DriveModeViewProps {
  cards: NewsCard[];
  onBookmarkCard: (card: NewsCard) => void;
  audioMuted: boolean;
}

export const DriveModeView: React.FC<DriveModeViewProps> = ({
  cards,
  onBookmarkCard,
  audioMuted,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [flashFeedback, setFlashFeedback] = useState(false);
  const [speed, setSpeed] = useState(68);
  const [rpm, setRpm] = useState(4800);
  const [gForce, setGForce] = useState('1.2G');

  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const dragOpacity = useTransform(y, [0, 150], [1, 0.4]);

  const currentCard = cards[currentIndex] || cards[0];

  // Telemetry fluctuation simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setSpeed(prev => Math.min(85, Math.max(52, prev + (Math.floor(Math.random() * 5) - 2))));
      setRpm(prev => Math.min(7200, Math.max(3200, prev + (Math.floor(Math.random() * 200) - 100))));
      setGForce((1.1 + (Math.random() * 0.4)).toFixed(1) + 'G');
    }, 1200);
    return () => clearInterval(interval);
  }, []);

  // Play audio for current card when changed if not muted
  useEffect(() => {
    if (isPlayingAudio && !audioMuted && currentCard) {
      speakVietnamese(currentCard.audioText, () => setIsPlayingAudio(false));
    } else {
      stopSpeech();
    }
  }, [currentIndex, isPlayingAudio, audioMuted]);

  const handleTogglePlayPause = () => {
    playHudSound('click');
    if (isPlayingAudio) {
      stopSpeech();
      setIsPlayingAudio(false);
    } else {
      if (!audioMuted && currentCard) {
        setIsPlayingAudio(true);
        speakVietnamese(currentCard.audioText, () => setIsPlayingAudio(false));
      }
    }
  };

  const handleNext = () => {
    playHudSound('click');
    setCurrentIndex((prev) => (prev + 1) % cards.length);
  };

  const handlePrev = () => {
    playHudSound('click');
    setCurrentIndex((prev) => (prev - 1 + cards.length) % cards.length);
  };

  const handleTriggerBookmark = () => {
    if (!currentCard) return;
    playHudSound('bookmark');
    onBookmarkCard(currentCard);

    // Red screen flash feedback
    setFlashFeedback(true);
    setTimeout(() => setFlashFeedback(false), 350);

    // Haptic feedback if supported
    if ('vibrate' in navigator) {
      navigator.vibrate([40, 30, 40]);
    }
  };

  // Touch gesture handling
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const deltaX = e.changedTouches[0].clientX - touchStartRef.current.x;
    const deltaY = e.changedTouches[0].clientY - touchStartRef.current.y;

    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > 40) {
        if (deltaX < 0) {
          handleNext();
        } else {
          handlePrev();
        }
      }
    } else {
      if (deltaY > 50) {
        // Swipe Down -> Bookmark
        handleTriggerBookmark();
      }
    }
    touchStartRef.current = null;
  };

  return (
    <div 
      className="relative w-full min-h-[calc(100vh-120px)] flex flex-col justify-between items-center px-4 pt-2 pb-24 overflow-hidden select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Red Screen Flash Feedback overlay on bookmark */}
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
              <span>ĐÃ LƯU KHO ĐẠN DƯỢC!</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP MOTORCYCLE TELEMETRY HUD */}
      <div className="w-full max-w-md grid grid-cols-3 gap-2 py-2 px-3 rounded-2xl bg-[#0c0606]/80 backdrop-blur-md border border-[#FF1E1E]/25 shadow-[0_0_15px_rgba(255,30,30,0.15)] font-mono text-xs">
        {/* Speedometer */}
        <div className="flex flex-col items-center justify-center p-1 border-r border-[#FF1E1E]/20">
          <div className="flex items-center gap-1 text-gray-400 text-[9px]">
            <Gauge className="w-3 h-3 text-[#FF1E1E]" />
            <span>TỐC ĐỘ</span>
          </div>
          <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF1E1E] to-[#FF5E00]">
            {speed} <span className="text-[10px] text-gray-400 font-normal">KM/H</span>
          </div>
        </div>

        {/* RPM Gauge */}
        <div className="flex flex-col items-center justify-center p-1 border-r border-[#FF1E1E]/20">
          <div className="flex items-center gap-1 text-gray-400 text-[9px]">
            <Zap className="w-3 h-3 text-[#FF0055]" />
            <span>VÒNG TUA</span>
          </div>
          <div className="text-sm font-bold text-[#FF5E00]">
            {rpm} <span className="text-[9px] text-gray-400 font-normal">RPM</span>
          </div>
        </div>

        {/* G-Force & GPS */}
        <div className="flex flex-col items-center justify-center p-1">
          <div className="flex items-center gap-1 text-gray-400 text-[9px]">
            <Compass className="w-3 h-3 text-[#FF1E1E]" />
            <span>G-FORCE</span>
          </div>
          <div className="text-sm font-bold text-[#FF0055]">
            {gForce}
          </div>
        </div>
      </div>

      {/* GESTURE HUD HINT INDICATOR */}
      <div className="w-full max-w-md my-1 flex items-center justify-center gap-2 font-mono text-[9px] text-[#FF5E00]/80 bg-[#120808]/80 py-1.5 px-3 rounded-full border border-[#FF1E1E]/30 shadow-[0_0_10px_rgba(255,30,30,0.15)]">
        <Hand className="w-3.5 h-3.5 text-[#FF1E1E] animate-pulse" />
        <span>VUỐT TRÁI/PHẢI: ĐỔI THẺ • VUỐT XUỐNG: LƯU ĐẠN • CHẠM: PHÁT ÂM</span>
      </div>

      {/* CENTER HUD: HIGH-IMPACT DRAGGABLE CARD */}
      <div className="w-full max-w-md my-auto flex flex-col items-center justify-center text-center relative py-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentCard.id}
            style={{ x, y, rotate, opacity: dragOpacity }}
            drag
            dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
            dragElastic={0.6}
            onDragEnd={(_, info) => {
              if (info.offset.x < -70) {
                // Swipe Left -> Next
                handleNext();
              } else if (info.offset.x > 70) {
                // Swipe Right -> Prev
                handlePrev();
              } else if (info.offset.y > 60) {
                // Swipe Down -> Bookmark
                handleTriggerBookmark();
              }
            }}
            initial={{ opacity: 0, scale: 0.9, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -15 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-full relative px-2 cursor-grab active:cursor-grabbing touch-pan-y"
          >
            {/* Category Tag */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1c0808] border border-[#FF1E1E]/40 text-[#FF5E00] text-[10px] font-mono tracking-widest font-bold uppercase mb-3 shadow-[0_0_10px_rgba(255,30,30,0.2)]">
              <Radio className="w-3 h-3 text-[#FF1E1E] animate-pulse" />
              <span>{currentCard.category}</span>
            </div>

            {/* Extremely Bold Red Gradient Keyword */}
            <h1 
              onClick={handleTogglePlayPause}
              className="cursor-pointer text-3xl sm:text-4xl font-black tracking-tight leading-none uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#FF1E1E] via-[#FF5E00] to-[#FF0055] drop-shadow-[0_0_20px_rgba(255,30,30,0.6)] my-2 hover:scale-105 transition-transform"
            >
              {currentCard.keyword}
            </h1>

            {/* Vietnamese Title */}
            <p className="text-sm font-bold text-gray-200 mt-2 px-4 max-w-sm mx-auto leading-snug">
              {currentCard.title}
            </p>

            {/* Concise Punchline */}
            <div className="mt-4 p-3.5 rounded-xl bg-[#0e0707]/90 border border-[#FF1E1E]/30 backdrop-blur-md shadow-[0_0_20px_rgba(255,30,30,0.15)] max-w-sm mx-auto text-left">
              <div className="text-[11px] font-mono text-[#FF5E00] uppercase tracking-wider mb-1 font-bold flex items-center gap-1">
                <AlertOctagon className="w-3.5 h-3.5 text-[#FF1E1E]" />
                <span>ĐIỂM CHÍ MẠNG L.H.T</span>
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                {currentCard.techPunchline}
              </p>
            </div>

            {/* Specs Quick Tags */}
            <div className="flex flex-wrap justify-center gap-2 mt-4 max-w-sm mx-auto">
              {currentCard.specs.map((spec, idx) => (
                <div key={idx} className="px-2.5 py-1 rounded-md bg-[#150a0a] border border-[#FF1E1E]/20 text-[10px] font-mono text-gray-300">
                  <span className="text-gray-500">{spec.label}:</span> <span className="text-[#FF5E00] font-bold">{spec.value}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows for Desktop / Quick Tap */}
        <div className="flex items-center justify-between w-full max-w-sm mt-6 px-4">
          <button
            onClick={handlePrev}
            className="p-2.5 rounded-full bg-[#180a0a] border border-[#FF1E1E]/30 text-[#FF5E00] hover:text-white hover:bg-[#FF1E1E]/20 transition-all shadow-[0_0_10px_rgba(255,30,30,0.2)]"
            title="Thẻ trước đó"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          {/* Swipe Down Hint & Bookmark FAB */}
          <button
            onClick={handleTriggerBookmark}
            className="group flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-[#FF1E1E] to-[#8B0000] text-white font-mono text-xs font-bold shadow-[0_0_15px_rgba(255,30,30,0.4)] hover:scale-105 active:scale-95 transition-all"
            title="Vuốt xuống hoặc bấm để lưu tin tức"
          >
            <Bookmark className="w-4 h-4 text-white fill-white" />
            <span>LƯU ĐẠN DƯỢC</span>
            <ArrowDown className="w-3.5 h-3.5 text-white/80 animate-bounce" />
          </button>

          <button
            onClick={handleNext}
            className="p-2.5 rounded-full bg-[#180a0a] border border-[#FF1E1E]/30 text-[#FF5E00] hover:text-white hover:bg-[#FF1E1E]/20 transition-all shadow-[0_0_10px_rgba(255,30,30,0.2)]"
            title="Thẻ tiếp theo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Counter Indicator */}
        <div className="mt-3 font-mono text-[10px] text-gray-500 tracking-widest">
          THẺ {currentIndex + 1} / {cards.length} • [CHẠM ĐỂ BẬT/TẮT GIỌNG NÓI • VUỐT XUỐNG ĐỂ LƯU]
        </div>
      </div>

      {/* BOTTOM RED DYNAMIC AUDIO WAVEFORM VISUALIZER */}
      <div className="w-full max-w-md px-2">
        <div 
          onClick={handleTogglePlayPause}
          className="cursor-pointer p-3 rounded-2xl bg-[#0c0606]/90 border border-[#FF1E1E]/30 backdrop-blur-md shadow-[0_0_20px_rgba(255,30,30,0.2)] flex flex-col items-center"
        >
          {/* Audio Waveform Bars */}
          <div className="flex items-end justify-center gap-1.5 h-8 w-full px-2">
            {[40, 70, 35, 90, 60, 100, 45, 80, 55, 95, 30, 75, 50, 85, 40, 65].map((height, i) => (
              <div
                key={i}
                className="w-1.5 rounded-full transition-all duration-150"
                style={{
                  height: isPlayingAudio 
                    ? `${Math.max(15, Math.min(100, height + (Math.sin(Date.now() / 100 + i) * 30)))}%` 
                    : '20%',
                  background: isPlayingAudio
                    ? 'linear-gradient(to top, #8B0000, #FF1E1E, #FF0055)'
                    : '#3a1212',
                  boxShadow: isPlayingAudio ? '0 0 8px #FF1E1E' : 'none'
                }}
              />
            ))}
          </div>

          {/* Audio Status & Tap hint */}
          <div className="mt-2 flex items-center gap-2 font-mono text-[11px] text-[#FF5E00]">
            {isPlayingAudio ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-[#FF1E1E] animate-pulse" />
                <span className="font-bold tracking-wider text-[#FF0055]">ĐANG ĐỌC BẢN TIN TIẾNG VIỆT...</span>
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
};
