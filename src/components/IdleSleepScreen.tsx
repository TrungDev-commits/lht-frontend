import React from 'react';

interface IdleSleepScreenProps {
  onStart: () => void;
}

function ReactorIcon() {
  return (
    <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="lht-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE3A3" />
          <stop offset="45%" stopColor="#FFC554" />
          <stop offset="100%" stopColor="#FF7A00" />
        </linearGradient>
        <linearGradient id="lht-core" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFF6E0" />
          <stop offset="55%" stopColor="#FFB347" />
          <stop offset="100%" stopColor="#FF1E1E" />
        </linearGradient>
        <radialGradient id="lht-glass" cx="0.35" cy="0.3" r="0.9">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="46" stroke="url(#lht-gold)" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="46" fill="url(#lht-glass)" />
      <circle cx="50" cy="50" r="39" stroke="#FF1E1E" strokeOpacity="0.4" strokeWidth="1" />

      {Array.from({ length: 24 }).map((_, i) => {
        const angle = (i * 360) / 24;
        const rad = (angle * Math.PI) / 180;
        const inner = 42.5;
        const outer = 45;
        return (
          <line
            key={i}
            x1={50 + inner * Math.cos(rad)}
            y1={50 + inner * Math.sin(rad)}
            x2={50 + outer * Math.cos(rad)}
            y2={50 + outer * Math.sin(rad)}
            stroke="url(#lht-gold)"
            strokeWidth="1.4"
          />
        );
      })}

      <path
        d="M50 82 L76 37 L24 37 Z"
        fill="url(#lht-core)"
        stroke="#FFF6E0"
        strokeWidth="1.5"
      />
      <line x1="50" y1="82" x2="50" y2="96" stroke="#FFC554" strokeWidth="5" strokeLinecap="round" />
      <line x1="50" y1="50" x2="91.3" y2="29.3" stroke="#FFC554" strokeWidth="5" strokeLinecap="round" />
      <line x1="50" y1="50" x2="8.7" y2="29.3" stroke="#FFC554" strokeWidth="5" strokeLinecap="round" />

      <circle cx="50" cy="50" r="8" fill="#FFF6E0" />
      <circle cx="50" cy="50" r="5" fill="#FF1E1E" />
    </svg>
  );
}

export const IdleSleepScreen: React.FC<IdleSleepScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#000000] flex flex-col items-center justify-center select-none">
      <div className="lht-reactor-halo absolute pointer-events-none w-80 h-80 rounded-full bg-[#FF1E1E]/10 blur-3xl" />

      <div className="relative flex flex-col items-center">
        <p className="lht-blink font-mono text-[9px] text-[#FF5E00] tracking-[0.4em] mb-8">
          J.A.R.V.I.S // STANDBY
        </p>

        <button
          type="button"
          onClick={onStart}
          aria-label="Khởi động J.A.R.V.I.S"
          className="lht-reactor-btn relative flex items-center justify-center"
        >
          <span className="lht-arc-orbit absolute -inset-3 rounded-full" />
          <span className="lht-reactor-notch absolute -inset-1.5 rounded-full" />
          <span className="lht-core-glow relative block w-24 h-24 md:w-28 md:h-28">
            <ReactorIcon />
          </span>
        </button>

        <p className="mt-10 font-mono text-xs font-black tracking-[0.3em] text-[#FF1E1E]">
          KHỞI ĐỘNG J.A.R.V.I.S
        </p>
        <p className="mt-1.5 font-mono text-[9px] text-gray-500 tracking-[0.3em]">
          NHẤN VÀO LÕI REACTOR
        </p>
      </div>

      <div className="absolute bottom-8 left-0 right-0 text-center font-mono text-[9px] text-gray-700 tracking-widest">
        L.H.T SLEEP MODE // TẠM NGƯNG HỆ THỐNG
      </div>
    </div>
  );
};
