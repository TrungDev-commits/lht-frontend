import React, { useEffect, useState } from 'react';
import { offlineAIService } from '../services/offlineAI';

export const OfflineStatusBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(() => typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [hasChromeAi, setHasChromeAi] = useState<boolean>(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    offlineAIService.checkChromeAiAvailable().then(setHasChromeAi);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) return null; // Không hiển thị khi có mạng online bình thường

  return (
    <div className="fixed top-[calc(var(--lht-safe-top)+3.5rem)] left-0 right-0 z-50 px-4 py-2 bg-amber-950/90 border-b border-amber-500/50 backdrop-blur-md text-amber-200 text-xs flex items-center justify-between shadow-lg">
      <div className="flex items-center space-x-2">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
        </span>
        <span className="font-mono font-bold tracking-wide">CHẾ ĐỘ OFFLINE</span>
      </div>
      <div className="text-right text-[11px] opacity-90 font-mono">
        {hasChromeAi ? (
          <span className="text-emerald-400">⚡ Engine: Chrome Gemini Nano (Local AI)</span>
        ) : (
          <span className="text-amber-300">📦 Engine: IndexedDB Local Cache</span>
        )}
      </div>
    </div>
  );
};
