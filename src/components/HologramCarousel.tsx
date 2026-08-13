import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight, ExternalLink, Globe, X, RefreshCw } from 'lucide-react';
import type { SyncedNews } from '../db/indexedDB';

export interface HologramCarouselProps {
  items: SyncedNews[];
  initialIndex?: number;
  onClose: () => void;
}

const FAN_ANGLE = 18;
const LOAD_TIMEOUT_MS = 8000;

function buildCoverUrl(item: SyncedNews): string {
  try {
    const host = new URL(item.source_url || 'https://genk.vn').hostname;
    return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(host)}`;
  } catch {
    return 'https://www.google.com/s2/favicons?sz=128&domain=genk.vn';
  }
}

export function HologramCarousel({ items, initialIndex = 0, onClose }: HologramCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [browserFailed, setBrowserFailed] = useState(false);
  const currentItem = items[currentIndex] ?? items[0] ?? null;

  const wheelTimeoutRef = useRef<number | null>(null);
  const loadTimerRef = useRef<number | null>(null);
  const swipeRef = useRef<{ startX: number | null; active: boolean }>({ startX: null, active: false });
  const suppressClickRef = useRef(false);

  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current !== null) window.clearTimeout(wheelTimeoutRef.current);
      if (loadTimerRef.current !== null) window.clearTimeout(loadTimerRef.current);
    };
  }, []);

  const goNext = () => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const goPrev = () => {
    if (items.length === 0) return;
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const openBrowser = (item: SyncedNews) => {
    if (!item.source_url) return;
    setBrowserUrl(item.source_url);
    setBrowserFailed(false);
    setIsLoading(true);
    if (loadTimerRef.current !== null) window.clearTimeout(loadTimerRef.current);
    loadTimerRef.current = window.setTimeout(() => setIsLoading(false), LOAD_TIMEOUT_MS);
  };

  const openExternal = () => {
    if (!browserUrl) return;
    window.open(browserUrl, '_blank', 'noopener,noreferrer');
  };

  const handleIframeLoad = () => {
    if (loadTimerRef.current !== null) window.clearTimeout(loadTimerRef.current);
    setIsLoading(false);
  };

  const handleIframeError = () => {
    if (loadTimerRef.current !== null) window.clearTimeout(loadTimerRef.current);
    setIsLoading(false);
    setBrowserFailed(true);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (wheelTimeoutRef.current !== null) window.clearTimeout(wheelTimeoutRef.current);
    wheelTimeoutRef.current = window.setTimeout(() => {
      if (e.deltaY > 30) goNext();
      else if (e.deltaY < -30) goPrev();
      wheelTimeoutRef.current = null;
    }, 80);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse') return;
    swipeRef.current = { startX: e.clientX, active: true };
    suppressClickRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!swipeRef.current.active) return;
    if (Math.abs(e.clientX - swipeRef.current.startX!) > 12) suppressClickRef.current = true;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!swipeRef.current.active) return;
    const dx = e.clientX - swipeRef.current.startX!;
    swipeRef.current.active = false;
    if (Math.abs(dx) > 60) {
      suppressClickRef.current = true;
      if (dx < 0) goNext();
      else goPrev();
    }
  };

  const handleCardClick = (index: number) => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (index === currentIndex) {
      openBrowser(items[index]);
    } else {
      setCurrentIndex(index);
    }
  };

  if (!currentItem) {
    return (
      <div className="fixed inset-0 z-40 bg-[#030303]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-4">
        <p className="font-mono text-sm text-[#FF5E00]">CHƯA CÓ HÌNH ẢNH NÀO</p>
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-xl bg-[#180a0a] border border-[#FF1E1E]/40 text-[#FF5E00] font-mono text-xs"
        >
          ĐÓNG
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-[#030303]/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full max-w-md flex items-center justify-between px-5 pt-5">
        <span className="font-mono text-xs text-[#FF5E00] tracking-widest">
          HOLOGRAM CAROUSEL • {currentIndex + 1}/{items.length}
        </span>
        <button
          onClick={onClose}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-full bg-[#180a0a] border border-[#FF1E1E]/40 text-[#FF5E00] hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className="flex-1 w-full flex items-center justify-center"
        style={{ perspective: '1200px', touchAction: 'pan-y' }}
      >
        {items.map((item, index) => {
          const offset = index - currentIndex;
          const clamped = ((offset % items.length) + items.length) % items.length;
          const distance = clamped > items.length / 2 ? clamped - items.length : clamped;

          const abs = Math.min(Math.abs(distance), items.length / 2);
          const rotateY = distance * FAN_ANGLE;
          const translateX = distance * 120;
          const translateZ = -abs * 160;
          const opacity = 1 - (abs / (items.length / 2)) * 0.8;
          const isCurrent = distance === 0;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: isCurrent ? 1 : opacity, x: translateX, zIndex: 30 - abs }}
              transition={{ type: 'spring', stiffness: 220, damping: 26 }}
              style={{
                transform: `perspective(1200px) rotateY(${rotateY}deg) translateZ(${translateZ}px)`,
                transformStyle: 'preserve-3d',
              }}
              className="absolute"
            >
              <button
                onClick={() => handleCardClick(index)}
                className={`relative w-64 h-80 rounded-2xl overflow-hidden border bg-black/40 backdrop-blur-md transition-all ${
                  isCurrent
                    ? 'border-[#FF1E1E] shadow-[0_0_40px_rgba(255,30,30,0.45)]'
                    : 'border-[#FF1E1E]/30 opacity-40'
                }`}
              >
                <img
                  src={buildCoverUrl(item)}
                  alt={item.keyword}
                  loading="lazy"
                  className="absolute top-0 left-0 w-full h-full object-cover opacity-25"
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
                  <div className="w-16 h-16 rounded-full border-2 border-[#FF1E1E]/50 flex items-center justify-center text-[#FF5E00] font-mono text-[10px] uppercase">
                    L.H.T
                  </div>
                  <h3 className="font-mono font-bold text-white uppercase tracking-wider text-sm leading-snug">
                    {item.keyword}
                  </h3>
                  <p className="text-[10px] text-gray-400 font-mono line-clamp-3">
                    {item.web_dev_analogy}
                  </p>
                </div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 font-mono text-[9px] text-[#FF5E00]">
                  <ExternalLink className="w-3 h-3" />
                  <span>{isCurrent ? 'CHẠM ĐỂ MỞ NGUỒN' : 'CHẠM ĐỂ XEM'}</span>
                </div>
              </button>
            </motion.div>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-6 w-full max-w-md pb-6">
        <button
          onClick={goPrev}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-full bg-[#180a0a] border border-[#FF1E1E]/40 text-[#FF5E00] hover:text-white transition-all"
          title="Hình trước"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-mono text-[10px] text-gray-500">
          CUỘN / VUỐT ĐỂ XOAY • CHẠM ĐỂ MỞ NGUỒN
        </span>
        <button
          onClick={goNext}
          className="min-w-11 min-h-11 flex items-center justify-center rounded-full bg-[#180a0a] border border-[#FF1E1E]/40 text-[#FF5E00] hover:text-white transition-all"
          title="Hình tiếp theo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {browserUrl && (
        <div className="fixed inset-0 z-50 bg-black/95 flex flex-col">
          <div className="w-full flex items-center justify-between px-4 py-3 bg-[#0a0303] border-b border-[#FF1E1E]/30 gap-2">
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <Globe className="w-3.5 h-3.5 text-[#FF1E1E] shrink-0" />
              <div className="truncate font-mono text-[10px] text-[#FF5E00]">{browserUrl}</div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={openExternal}
                className="min-w-11 min-h-11 flex items-center justify-center gap-1.5 rounded-lg bg-[#FF1E1E]/20 border border-[#FF1E1E]/40 text-[#FF5E00] hover:text-white font-mono text-[9px] font-bold transition-all"
                title="Mở bằng trình duyệt ngoài"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">TRÌNH DUYỆT</span>
              </button>
              <button
                onClick={() => {
                  setBrowserUrl(null);
                  setBrowserFailed(false);
                }}
                className="min-w-11 min-h-11 flex items-center justify-center rounded-lg text-[#FF5E00] hover:text-white"
                title="Đóng trình duyệt"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {browserFailed && (
            <div className="px-4 py-2 bg-[#1a0606] border-b border-[#FF1E1E]/40 font-mono text-[10px] text-[#FFB4B4]">
              TRANG NÀY TỪ CHỐI NHÚNG TRONG APP (X-FRAME-OPTIONS). BẤM "TRÌNH DUYỆT" ĐỂ MỞ NGOÀI.
            </div>
          )}

          <div className="relative flex-1 bg-white">
            <iframe
              key={browserUrl}
              src={browserUrl}
              title="L.H.T In-App Browser"
              className="w-full h-full"
              onLoad={handleIframeLoad}
              onError={handleIframeError}
              referrerPolicy="no-referrer"
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
            {isLoading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-[#FF1E1E] animate-spin" />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
