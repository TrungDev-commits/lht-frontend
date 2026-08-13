import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, ExternalLink, X, RefreshCw } from 'lucide-react';
import type { SyncedNews } from '../db/indexedDB';

export interface HologramCarouselProps {
  items: SyncedNews[];
  initialIndex?: number;
  onClose: () => void;
}

const FAN_ANGLE = 18;

function buildCoverUrl(item: SyncedNews): string {
  return `https://www.google.com/s2/favicons?sz=128&domain=${encodeURIComponent(
    new URL(item.source_url || 'https://genk.vn').hostname
  )}`;
}

export function HologramCarousel({ items, initialIndex = 0, onClose }: HologramCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const currentItem = items[currentIndex] ?? items[0] ?? null;

  const wheelTimeoutRef = useRef<number | null>(null);

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
    setIsLoading(true);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (wheelTimeoutRef.current !== null) {
      window.clearTimeout(wheelTimeoutRef.current);
    }
    wheelTimeoutRef.current = window.setTimeout(() => {
      if (e.deltaY > 30) goNext();
      else if (e.deltaY < -30) goPrev();
      wheelTimeoutRef.current = null;
    }, 80);
  };

  useEffect(() => {
    return () => {
      if (wheelTimeoutRef.current !== null) {
        window.clearTimeout(wheelTimeoutRef.current);
      }
    };
  }, []);

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

  const visibleIndices = Array.from({ length: items.length }, (_, i) => i);

  return (
    <div className="fixed inset-0 z-40 bg-[#030303]/95 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden">
      <div className="w-full max-w-md flex items-center justify-between px-5 pt-5">
        <span className="font-mono text-xs text-[#FF5E00] tracking-widest">
          HOLOGRAM CAROUSEL • {currentIndex + 1}/{items.length}
        </span>
        <button
          onClick={onClose}
          className="p-2 rounded-full bg-[#180a0a] border border-[#FF1E1E]/40 text-[#FF5E00] hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div
        onWheel={handleWheel}
        className="flex-1 w-full flex items-center justify-center perspective-1000"
        style={{ perspective: '1200px' }}
      >
        <AnimatePresence mode="wait">
          {visibleIndices.map((index) => {
            const offset = index - currentIndex;
            const clamped = ((offset % items.length) + items.length) % items.length;
            const distance = clamped > items.length / 2 ? clamped - items.length : clamped;

            const abs = Math.min(Math.abs(distance), items.length / 2);
            const rotateY = distance * FAN_ANGLE;
            const translateX = distance * 120;
            const translateZ = -abs * 160;
            const opacity = 1 - abs / (items.length / 2) * 0.8;
            const isCurrent = distance === 0;

            return (
              <motion.div
                key={`${currentItem.id}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: isCurrent ? 1 : opacity,
                  x: translateX,
                  zIndex: 30 - abs,
                }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 26 }}
                style={{
                  transform: `perspective(1200px) rotateY(${rotateY}deg) translateZ(${translateZ}px)`,
                  transformStyle: 'preserve-3d',
                  pointerEvents: isCurrent ? 'auto' : 'none',
                }}
                className="absolute"
              >
                <button
                  onClick={() => (isCurrent ? openBrowser(items[index]) : setCurrentIndex(index))}
                  className={`relative w-64 h-80 rounded-2xl overflow-hidden border bg-black/40 backdrop-blur-md transition-all ${
                    isCurrent
                      ? 'border-[#FF1E1E] shadow-[0_0_40px_rgba(255,30,30,0.45)]'
                      : 'border-[#FF1E1E]/30 opacity-40'
                  }`}
                >
                  <img
                    src={buildCoverUrl(items[index])}
                    alt={items[index].keyword}
                    loading="lazy"
                    className="absolute top-0 left-0 w-full h-full object-cover opacity-25"
                  />
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-4 text-center">
                    <div className="w-16 h-16 rounded-full border-2 border-[#FF1E1E]/50 flex items-center justify-center text-[#FF5E00] font-mono text-[10px] uppercase">
                      L.H.T
                    </div>
                    <h3 className="font-mono font-bold text-white uppercase tracking-wider text-sm leading-snug">
                      {items[index].keyword}
                    </h3>
                    <p className="text-[10px] text-gray-400 font-mono line-clamp-3">
                      {items[index].web_dev_analogy}
                    </p>
                  </div>
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 font-mono text-[9px] text-[#FF5E00]">
                    <ExternalLink className="w-3 h-3" />
                    <span>CHẠM ĐỂ MỞ NGUỒN</span>
                  </div>
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-center gap-6 w-full max-w-md pb-6">
        <button
          onClick={goPrev}
          className="p-3 rounded-full bg-[#180a0a] border border-[#FF1E1E]/40 text-[#FF5E00] hover:text-white transition-all"
          title="Hình trước"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="font-mono text-[10px] text-gray-500">
          CUỘN CHUỘT / VUỐT ĐỂ XOAY • CHẠM ĐỂ MỞ TRÌNH DUYỆT
        </span>
        <button
          onClick={goNext}
          className="p-3 rounded-full bg-[#180a0a] border border-[#FF1E1E]/40 text-[#FF5E00] hover:text-white transition-all"
          title="Hình tiếp theo"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <AnimatePresence>
        {browserUrl && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            className="fixed inset-0 z-50 bg-black/95"
          >
            <div className="w-full flex items-center justify-between px-4 py-3 bg-[#0a0303] border-b border-[#FF1E1E]/30">
              <div className="flex-1 truncate font-mono text-[10px] text-[#FF5E00] px-2">
                {browserUrl}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsLoading(true)}
                  className="p-1.5 text-[#FF5E00] hover:text-white"
                  title="Tải lại"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setBrowserUrl(null)}
                  className="p-1.5 text-[#FF5E00] hover:text-white"
                  title="Đóng trình duyệt"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <iframe
              src={browserUrl}
              title="L.H.T In-App Browser"
              className="w-full h-[calc(100%-48px)] bg-white"
              onLoad={() => setIsLoading(false)}
              sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
            />
            {isLoading && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <RefreshCw className="w-8 h-8 text-[#FF1E1E] animate-spin" />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
