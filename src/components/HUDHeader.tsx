import React, { useState, useEffect } from 'react';
import { Bluetooth, ShieldCheck, Volume2, VolumeX, Mic, Activity, Radio, Moon } from 'lucide-react';
import { playHudSound } from '../utils/audioSynth';

interface HUDHeaderProps {
  onOpenVoiceModal: () => void;
  audioMuted: boolean;
  onToggleAudioMute: () => void;
  onGoToSleep: () => void;
}

export const HUDHeader: React.FC<HUDHeaderProps> = ({
  onOpenVoiceModal,
  audioMuted,
  onToggleAudioMute,
  onGoToSleep,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [btSynced, setBtSynced] = useState<boolean>(true);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('vi-VN', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleBt = () => {
    playHudSound('click');
    setBtSynced(!btSynced);
  };

  return (
    <header className="relative z-30 w-full px-4 pt-[calc(var(--lht-safe-top)+0.75rem)] pb-2 bg-[#070707]/80 backdrop-blur-md border-b border-[#FF1E1E]/20 flex items-center justify-between select-none">
      {/* Left: Terminal Logo & Bluetooth Sync Badge */}
      <div className="flex items-center gap-3">
        {/* Terminal Logo Badge */}
        <div className="flex items-center gap-2">
          <img
            src="/icons/logo-sm.png"
            alt="L.H.T"
            className="h-5 w-auto drop-shadow-[0_0_8px_rgba(255,30,30,0.6)]"
          />
          <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#FF1E1E] via-[#FF5E00] to-[#FF0055] tracking-widest text-base font-mono drop-shadow-[0_0_8px_rgba(255,30,30,0.6)]">
            L.H.T
          </span>
        </div>

        {/* Bluetooth Headset Status Badge (Required: "ĐÃ ĐỒNG BỘ TAI NGHE") */}
        <button
          onClick={handleToggleBt}
          onMouseEnter={() => setShowTooltip('Tai nghe Bluetooth')}
          onMouseLeave={() => setShowTooltip(null)}
          className={`relative group flex items-center gap-1.5 px-2 py-0.5 rounded-full border transition-all duration-300 ${
            btSynced
              ? 'bg-[#120505] border-[#FF1E1E]/40 text-[#FF5E00] shadow-[0_0_10px_rgba(255,30,30,0.25)]'
              : 'bg-[#121212] border-gray-700 text-gray-500'
          }`}
          title="Bấm để toggle đồng bộ tai nghe"
        >
          <Bluetooth className={`w-3.5 h-3.5 ${btSynced ? 'text-[#FF1E1E] animate-pulse' : 'text-gray-500'}`} />
          <span className="text-[10px] font-mono tracking-wider font-semibold uppercase">
            {btSynced ? 'ĐÃ ĐỒNG BỘ TAI NGHE' : 'NGẮN KẾT NỐI TAI NGHE'}
          </span>
        </button>
      </div>

      {/* Right: Time, Audio Toggle, Mic Trigger */}
      <div className="flex items-center gap-2">
        {/* Time Display */}
        <div className="hidden sm:flex items-center gap-1 font-mono text-[11px] text-[#FF5E00] bg-[#120808] px-2 py-0.5 rounded border border-[#FF1E1E]/20">
          <Radio className="w-3 h-3 text-[#FF1E1E] animate-spin" />
          <span>{timeStr || '12:00:00'}</span>
        </div>

        {/* Mute Audio Button */}
        <button
          onClick={() => {
            playHudSound('click');
            onToggleAudioMute();
          }}
          className={`p-1.5 rounded-lg border transition-all ${
            audioMuted
              ? 'bg-red-950/40 border-red-800 text-red-500'
              : 'bg-[#180808] border-[#FF1E1E]/30 text-[#FF5E00] hover:text-[#FF1E1E] shadow-[0_0_8px_rgba(255,30,30,0.2)]'
          }`}
          title={audioMuted ? 'Mở âm thanh AI' : 'Tắt âm thanh AI'}
        >
          {audioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Mic Voice Quick Trigger */}
        <button
          onClick={() => {
            playHudSound('voice');
            onOpenVoiceModal();
          }}
          className="relative group p-1.5 rounded-lg bg-gradient-to-r from-[#FF1E1E] to-[#FF0055] text-white shadow-[0_0_12px_rgba(255,30,30,0.5)] hover:scale-105 transition-all"
          title="Mở Lệnh Giọng Nói Vietnamese"
        >
          <Mic className="w-4 h-4 animate-pulse" />
        </button>

        {/* Sleep Mode Trigger */}
        <button
          onClick={() => {
            playHudSound('click');
            onGoToSleep();
          }}
          className="p-1.5 rounded-lg bg-[#180808] border border-[#FF1E1E]/30 text-gray-400 hover:text-[#FF5E00] hover:border-[#FF1E1E] transition-all"
          title="Chuyển về chế độ ngủ nền"
        >
          <Moon className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Micro-Tooltip */}
      {showTooltip && (
        <div className="absolute top-12 left-16 z-50 px-2 py-1 bg-[#121212] border border-[#FF1E1E]/40 text-[#FF5E00] text-[10px] font-mono rounded shadow-lg">
          {showTooltip}
        </div>
      )}
    </header>
  );
};
