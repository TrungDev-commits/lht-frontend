import React, { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { ViewMode, LifecycleState, NewsCard, GraphNode, AmmoCard } from './types';
import { INITIAL_GRAPH_NODES, INITIAL_AMMO_CARDS } from './data/mockData';
import { HUDBackground } from './components/HUDBackground';
import { HUDHeader } from './components/HUDHeader';
import { BottomNav } from './components/BottomNav';
import { AmmoArsenalView } from './components/AmmoArsenalView';
import { VoiceControlModal } from './components/VoiceControlModal';
import { IdleSleepScreen } from './components/IdleSleepScreen';
import { HologramCarousel } from './components/HologramCarousel';
import { DebatePanel } from './components/DebatePanel';
import { OfflineStatusBanner } from './components/OfflineStatusBanner';
import { useVoiceSTT, type VoiceCommandEvent } from './hooks/useVoiceSTT';
import { useSpeechTTS } from './hooks/useSpeechTTS';
import { useNewsSync } from './hooks/useNewsSync';
import { playHudSound } from './utils/audioSynth';
import { setBookmarked, type SyncedNews } from './db/indexedDB';
import { apiUrl } from './config/api';
import { DriveMode, type DriveModeHandle } from './views/DriveMode';
import { XRayMode } from './views/XRayMode';

const PreferencesRadar = lazy(() =>
  import('./views/PreferencesRadar').then((m) => ({ default: m.PreferencesRadar }))
);

const AUTO_SLEEP_DELAY_MS = 180_000;

export default function App() {
  const [lifecycle, setLifecycle] = useState<LifecycleState>('IDLE_SLEEP');
  const [currentView, setCurrentView] = useState<ViewMode>('DRIVE');
  const [audioMuted, setAudioMuted] = useState(false);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [debateItem, setDebateItem] = useState<SyncedNews | null>(null);

  const driveModeRef = useRef<DriveModeHandle>(null);

  const newsSync = useNewsSync();
  const tts = useSpeechTTS();

  const [graphNodes] = useState<GraphNode[]>(INITIAL_GRAPH_NODES);
  const [ammoCards, setAmmoCards] = useState<AmmoCard[]>(INITIAL_AMMO_CARDS);

  const sleepTimerRef = useRef<number | null>(null);

  const clearSleepTimer = useCallback(() => {
    if (sleepTimerRef.current !== null) {
      window.clearTimeout(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
  }, []);

  useEffect(() => clearSleepTimer, [clearSleepTimer]);

  const resetSleepTimer = useCallback(() => {
    if (lifecycle !== 'ACTIVE_HUD') return;
    clearSleepTimer();
    sleepTimerRef.current = window.setTimeout(() => {
      setLifecycle('IDLE_SLEEP');
    }, AUTO_SLEEP_DELAY_MS);
  }, [lifecycle, clearSleepTimer]);

  const speakGreeting = useCallback(() => {
    tts.stop();
    const icebreaker = newsSync.items.find((item) => item.icebreaker)?.icebreaker;
    tts.play(
      icebreaker
        ? `Chào sếp! ${icebreaker}`
        : 'Chào sếp! L.H.T đã thức giấc. Hệ thống đang sẵn sàng phục vụ.'
    );
  }, [tts, newsSync.items]);

  const handleWake = useCallback(() => {
    clearSleepTimer();
    setLifecycle('ACTIVE_HUD');
    playHudSound('alert');
    speakGreeting();
    setCurrentView('DRIVE');
  }, [clearSleepTimer, speakGreeting]);

  const handleSleep = useCallback(() => {
    clearSleepTimer();
    tts.stop();
    setIsVoiceModalOpen(false);
    setIsGalleryOpen(false);
    setLifecycle('IDLE_SLEEP');
  }, [clearSleepTimer, tts]);

  const handleVoiceCommand = useCallback(
    (event: VoiceCommandEvent) => {
      const { type } = event;
      resetSleepTimer();

      switch (type) {
        case 'NEXT':
          setCurrentView('DRIVE');
          driveModeRef.current?.goNext();
          break;
        case 'PREV':
          setCurrentView('DRIVE');
          driveModeRef.current?.goPrev();
          break;
        case 'BOOKMARK':
          setCurrentView('DRIVE');
          driveModeRef.current?.toggleBookmark();
          break;
        case 'GALLERY': {
          const first = newsSync.items[0];
          if (first) {
            setGalleryIndex(0);
            setIsGalleryOpen(true);
          }
          break;
        }
        case 'DEBATE': {
          const current = newsSync.items[0];
          if (current) {
            setDebateItem(current);
          }
          break;
        }
        case 'SLEEP':
          handleSleep();
          break;
        case 'NONE':
          break;
      }
    },
    [resetSleepTimer, newsSync.items, handleSleep]
  );

  const voiceMuted = audioMuted || tts.isSpeaking;

  const voiceSTT = useVoiceSTT({
    enabled: lifecycle === 'ACTIVE_HUD' && !isVoiceModalOpen,
    muted: voiceMuted,
    onCommand: handleVoiceCommand,
    language: 'vi-VN',
  });

  const handleToggleVoice = useCallback(() => {
    if (voiceSTT.listening) {
      voiceSTT.stop();
    } else {
      voiceSTT.start();
    }
  }, [voiceSTT.listening, voiceSTT.start, voiceSTT.stop]);

  const handleToggleBookmark = useCallback(async (id: string, bookmarked: boolean) => {
    await setBookmarked(id, bookmarked);
    playHudSound('bookmark');
  }, []);

  const handleOpenGallery = useCallback(
    (item: SyncedNews) => {
      const index = newsSync.items.findIndex((c) => c.id === item.id);
      setGalleryIndex(index >= 0 ? index : 0);
      setIsGalleryOpen(true);
    },
    [newsSync.items]
  );

  const handleXRayActive = useCallback((active: boolean) => {
    void fetch(apiUrl('/api/mqtt/state'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'XRAY_MODE', active }),
    }).catch(() => undefined);
  }, []);

  const handleBookmarkNewsCard = (card: NewsCard) => {
    if (ammoCards.some((a) => a.title === card.keyword || a.title === card.title)) {
      return;
    }
    const newAmmo: AmmoCard = {
      id: `ammo-news-${Date.now()}`,
      title: `${card.keyword} - ${card.category}`,
      category: card.category,
      punchline: card.techPunchline,
      webAnalogy: card.vietnameseSummary,
      timestamp: new Date().toLocaleString('vi-VN'),
      tags: [card.category, 'L.H.T', 'DriveMode'],
      codeSnippet: `// L.H.T Knowledge Snippet\n// Specs: ${card.specs.map((s) => `${s.label}: ${s.value}`).join(' | ')}`,
    };
    setAmmoCards((prev) => [newAmmo, ...prev]);
  };

  const handleBookmarkNode = (node: GraphNode) => {
    if (ammoCards.some((a) => a.title.includes(node.name))) return;
    const newAmmo: AmmoCard = {
      id: `ammo-node-${Date.now()}`,
      title: `${node.name} (${node.type === 'HARDWARE' ? 'Phần cứng' : 'Web Dev'})`,
      category: node.type === 'HARDWARE' ? 'PHẦN CỨNG' : 'LẬP TRÌNH WEB',
      punchline: node.shortDesc,
      webAnalogy: node.webAnalogy,
      timestamp: new Date().toLocaleString('vi-VN'),
      tags: [node.type, 'XRayGraph', node.name.replace(/\s+/g, '')],
      codeSnippet: `// ${node.name} Specifications\n${node.specs.map((s) => `// ${s.label}: ${s.value}`).join('\n')}`,
    };
    setAmmoCards((prev) => [newAmmo, ...prev]);
  };

  const handleDeleteAmmo = (id: string) => {
    setAmmoCards((prev) => prev.filter((a) => a.id !== id));
  };

  const handleAddAmmo = (card: AmmoCard) => {
    setAmmoCards((prev) => [card, ...prev]);
  };

  const icebreakers = newsSync.items
    .filter((item) => item.icebreaker)
    .map((item) => ({ keyword: item.keyword, text: item.icebreaker }));

  if (lifecycle === 'IDLE_SLEEP') {
    return <IdleSleepScreen onStart={handleWake} />;
  }

  return (
    <div
      onClick={resetSleepTimer}
      className="relative min-h-screen w-full bg-[#030303] text-white font-sans overflow-x-hidden antialiased select-none"
    >
      <HUDBackground />
      <OfflineStatusBanner />

      <HUDHeader
        audioMuted={audioMuted}
        onToggleAudioMute={() => {
          const next = !audioMuted;
          setAudioMuted(next);
          if (next) tts.stop();
        }}
        onOpenVoiceModal={() => {
          voiceSTT.stop();
          setIsVoiceModalOpen(true);
        }}
        voiceListening={voiceSTT.listening}
        voiceSupported={voiceSTT.supported}
        onToggleVoice={handleToggleVoice}
        syncing={newsSync.loading}
        onRefreshNews={() => void newsSync.refresh()}
        lastSyncedAt={newsSync.lastSyncedAt}
        onGoToSleep={handleSleep}
      />

      <main className="relative z-10 w-full max-w-lg mx-auto pt-2 pb-[calc(var(--lht-safe-bottom)+5rem)]">
        {currentView === 'DRIVE' && (
          <DriveMode
            ref={driveModeRef}
            items={newsSync.items}
            onToggleBookmark={handleToggleBookmark}
            onOpenGallery={handleOpenGallery}
            onRefresh={() => void newsSync.refresh()}
            syncing={newsSync.loading}
          />
        )}

        {currentView === 'XRAY' && (
          <XRayMode items={newsSync.items} onXRayActive={handleXRayActive} />
        )}

        {currentView === 'AMMO' && (
          <AmmoArsenalView
            ammoCards={ammoCards}
            onDeleteAmmo={handleDeleteAmmo}
            onAddAmmo={handleAddAmmo}
            audioMuted={audioMuted}
            icebreakers={icebreakers}
          />
        )}

        {currentView === 'RADAR' && (
          <Suspense
            fallback={
              <div className="w-full min-h-[60vh] flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-2 border-[#FF1E1E]/40 border-t-[#FF1E1E] animate-spin" />
              </div>
            }
          >
            <PreferencesRadar />
          </Suspense>
        )}
      </main>

      <BottomNav
        currentView={currentView}
        onSelectView={setCurrentView}
        savedCount={ammoCards.length}
      />

      <VoiceControlModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        audioMuted={audioMuted}
      />

      <DebatePanel
        item={debateItem}
        isOpen={debateItem !== null}
        onClose={() => setDebateItem(null)}
      />

      {isGalleryOpen && (
        <HologramCarousel
          items={newsSync.items}
          initialIndex={galleryIndex}
          onClose={() => setIsGalleryOpen(false)}
        />
      )}

      {tts.isSpeaking && (
        <div className="fixed top-[calc(var(--lht-safe-top)+0.25rem)] left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#120606]/90 border border-[#FF1E1E]/40 font-mono text-[9px] text-[#FF0055] animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF1E1E]" />
          <span>{tts.isPaused ? 'TẠM DỪNG GIỌNG NÓI' : 'L.H.T ĐANG NÓI...'}</span>
        </div>
      )}

      {voiceSTT.listening && (
        <div className="fixed bottom-[calc(var(--lht-safe-bottom)+6rem)] left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#120606]/90 border border-[#FF1E1E]/40 font-mono text-[9px] text-[#FF5E00] animate-pulse">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF1E1E] animate-ping" />
          <span>ĐANG NGHE LỆNH GIỌNG NÓI...</span>
        </div>
      )}

      {(voiceSTT.error || !voiceSTT.supported) && lifecycle === 'ACTIVE_HUD' && (
        <div className="fixed bottom-[calc(var(--lht-safe-bottom)+6rem)] left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#120606]/90 border border-[#FF5E00]/30 font-mono text-[9px] text-gray-400">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5E00]" />
          <span>{!voiceSTT.supported ? 'TRÌNH DUYỆT KHÔNG HỖ TRỢ GIỌNG NÓI' : `GIỌNG NÓI: ${voiceSTT.error}`}</span>
        </div>
      )}

      {newsSync.error && (
        <div className="fixed bottom-[calc(var(--lht-safe-bottom)+6rem)] right-3 z-40 px-3 py-1.5 rounded-lg bg-[#120606]/90 border border-[#FF1E1E]/40 font-mono text-[9px] text-[#FF5E00] max-w-[70%]">
          {newsSync.error}
        </div>
      )}
    </div>
  );
}
