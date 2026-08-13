import React from 'react';
import { ViewMode } from '../types';
import { Navigation2, Network, ShieldAlert, Radar } from 'lucide-react';
import { playHudSound } from '../utils/audioSynth';

interface BottomNavProps {
  currentView: ViewMode;
  onSelectView: (view: ViewMode) => void;
  savedCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  currentView,
  onSelectView,
  savedCount,
}) => {
  const navItems: { id: ViewMode; label: string; icon: React.ReactNode; badge?: number }[] = [
    {
      id: 'DRIVE',
      label: 'TẨU TÁN',
      icon: <Navigation2 className="w-5 h-5" />,
    },
    {
      id: 'XRAY',
      label: 'GIẢI PHẪU',
      icon: <Network className="w-5 h-5" />,
    },
    {
      id: 'AMMO',
      label: 'KHO ĐẠN',
      icon: <ShieldAlert className="w-5 h-5" />,
      badge: savedCount,
    },
    {
      id: 'RADAR',
      label: 'RADAR',
      icon: <Radar className="w-5 h-5" />,
    },
  ];

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-md">
      {/* Floating Glassmorphic Container */}
      <div className="relative p-1.5 rounded-2xl bg-[#0d0707]/85 backdrop-blur-xl border border-[#FF1E1E]/30 shadow-[0_8px_32px_rgba(255,30,30,0.25)] flex items-center justify-around">
        {/* Glow Line Indicator */}
        <div className="absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-[#FF1E1E] to-transparent opacity-60" />

        {navItems.map((item) => {
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                playHudSound('click');
                onSelectView(item.id);
              }}
              className={`relative flex-1 py-2 px-1 rounded-xl flex flex-col items-center justify-center transition-all duration-300 ${
                isActive
                  ? 'text-white'
                  : 'text-gray-500 hover:text-gray-300'
              }`}
            >
              {/* Active Background Pill with Multi-Stop Crimson Gradient */}
              {isActive && (
                <div 
                  className="absolute inset-0 rounded-xl opacity-90 shadow-[0_0_15px_rgba(255,30,30,0.5)] transition-all"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,30,30,0.3) 0%, rgba(255,94,0,0.2) 50%, rgba(139,0,0,0.4) 100%)',
                    border: '1px solid rgba(255, 30, 30, 0.5)'
                  }}
                />
              )}

              {/* Icon with Glowing Gradient when Active */}
              <div className="relative z-10 flex items-center justify-center">
                <span className={`transition-transform duration-300 ${isActive ? 'scale-110 text-[#FF1E1E]' : ''}`}>
                  {item.icon}
                </span>

                {/* Badge Count for Ammo Arsenal */}
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="absolute -top-1.5 -right-2 px-1.5 py-0.2 bg-[#FF0055] text-white text-[9px] font-mono font-bold rounded-full shadow-[0_0_8px_#FF0055]">
                    {item.badge}
                  </span>
                )}
              </div>

              {/* Label in Vietnamese */}
              <span className={`relative z-10 mt-1 font-mono text-[10px] tracking-wider uppercase transition-all ${
                isActive ? 'text-[#FF5E00] font-bold' : 'text-gray-400 font-medium'
              }`}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
