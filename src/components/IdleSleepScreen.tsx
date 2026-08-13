import React from 'react';

interface IdleSleepScreenProps {
  onStart: () => void;
}

function HexMesh() {
  return (
    <svg className="absolute inset-0 h-full w-full opacity-[0.06] pointer-events-none" aria-hidden="true">
      <defs>
        <pattern id="lht-hex-mesh" width="28" height="48.5" patternUnits="userSpaceOnUse">
          <path
            d="M13.99 9.25 L27 16.75 V31.75 L13.99 39.25 L1 31.75 V16.75 Z"
            fill="none"
            stroke="#FF5E00"
            strokeWidth="1"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#lht-hex-mesh)" />
    </svg>
  );
}

function HexFrame() {
  return (
    <svg
      className="lht-spin-slow absolute -inset-6 md:-inset-7 h-[calc(100%+3rem)] w-[calc(100%+3rem)] md:h-[calc(100%+3.5rem)] md:w-[calc(100%+3.5rem)]"
      viewBox="0 0 100 100"
      fill="none"
      aria-hidden="true"
    >
      <polygon
        points="50,2 93.3,26 93.3,74 50,98 6.7,74 6.7,26"
        stroke="url(#lht-hex-grad)"
        strokeWidth="1"
        strokeOpacity="0.55"
      />
      <polygon
        points="50,8 87.3,28.7 87.3,71.3 50,92 12.7,71.3 12.7,28.7"
        stroke="#FF1E1E"
        strokeWidth="0.75"
        strokeOpacity="0.3"
      />
      <defs>
        <linearGradient id="lht-hex-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE3A3" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#FF5E00" stopOpacity="0.4" />
        </linearGradient>
      </defs>
    </svg>
  );
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
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="lht-center">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#FFF6E0" />
          <stop offset="100%" stopColor="#FF1E1E" />
        </radialGradient>
      </defs>

      <circle cx="50" cy="50" r="46" stroke="url(#lht-gold)" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="46" fill="url(#lht-glass)" />
      <circle cx="50" cy="50" r="38.5" stroke="#FF1E1E" strokeOpacity="0.4" strokeWidth="1" />

      {Array.from({ length: 36 }).map((_, i) => {
        const angle = (i * 360) / 36;
        const rad = (angle * Math.PI) / 180;
        const inner = 42.8;
        const outer = 45;
        return (
          <line
            key={i}
            x1={50 + inner * Math.cos(rad)}
            y1={50 + inner * Math.sin(rad)}
            x2={50 + outer * Math.cos(rad)}
            y2={50 + outer * Math.sin(rad)}
            stroke="url(#lht-gold)"
            strokeWidth="1.2"
          />
        );
      })}

      <polygon
        points="74,50 62,70.8 38,70.8 26,50 38,29.2 62,29.2"
        stroke="url(#lht-gold)"
        strokeWidth="1"
        strokeOpacity="0.7"
      />
      <polygon
        points="65,50 57.5,63 42.5,63 35,50 42.5,37 57.5,37"
        stroke="#FF1E1E"
        strokeWidth="1"
        strokeOpacity="0.45"
        strokeDasharray="2 2"
      />

      <path
        className="lht-circuit"
        d="M83.5 44.1 A34 34 0 0 1 61.6 82.0"
        stroke="url(#lht-gold)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="2 4"
      />
      <path
        className="lht-circuit"
        d="M38.4 82.0 A34 34 0 0 1 16.5 44.1"
        stroke="url(#lht-gold)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="2 4"
      />
      <path
        className="lht-circuit"
        d="M28.1 24.0 A34 34 0 0 1 71.9 24.0"
        stroke="url(#lht-gold)"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeDasharray="2 4"
      />

      <line x1="50" y1="82" x2="50" y2="96" stroke="#FFC554" strokeWidth="5" strokeLinecap="round" />
      <line x1="50" y1="50" x2="91.3" y2="29.3" stroke="#FFC554" strokeWidth="5" strokeLinecap="round" />
      <line x1="50" y1="50" x2="8.7" y2="29.3" stroke="#FFC554" strokeWidth="5" strokeLinecap="round" />

      <path d="M50 82 L76 37 L24 37 Z" fill="url(#lht-core)" stroke="#FFF6E0" strokeWidth="1.5" />
      <path d="M50 76 L70 41.5 L30 41.5 Z" fill="none" stroke="#FF1E1E" strokeOpacity="0.7" strokeWidth="1" />

      <circle cx="50" cy="50" r="10" fill="url(#lht-center)" opacity="0.9" />
      <circle cx="50" cy="50" r="4.5" fill="#FFFFFF" />
    </svg>
  );
}

export const IdleSleepScreen: React.FC<IdleSleepScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#000000] flex flex-col items-center justify-center select-none overflow-hidden">
      <HexMesh />

      <div className="lht-reactor-halo absolute pointer-events-none w-80 h-80 rounded-full bg-[#FF1E1E]/10 blur-3xl" />

      <div className="relative flex flex-col items-center">
        <img
          src="/icons/logo-sm.png"
          alt="L.H.T"
          className="h-10 w-auto mb-5 opacity-90 drop-shadow-[0_0_15px_rgba(255,30,30,0.5)]"
        />
        <p className="lht-blink font-mono text-[9px] text-[#FF5E00] tracking-[0.4em] mb-8">
          J.A.R.V.I.S // NANOTECH
        </p>

        <div className="lht-reactor-stage relative w-44 h-44 md:w-48 md:h-48 flex items-center justify-center">
          <HexFrame />

          <span className="lht-ring lht-ring-red absolute -inset-5" />
          <span className="lht-ring lht-ring-gold absolute -inset-2" />
          <span className="lht-sweep absolute -inset-6" />

          <span className="lht-orbit" style={{ '--r': 82, '--d': '9s' } as React.CSSProperties}>
            <span className="lht-nano" />
          </span>
          <span
            className="lht-orbit"
            style={{ '--r': 68, '--d': '13s', '--delay': '-4s' } as React.CSSProperties}
          >
            <span
              className="lht-nano"
              style={{ width: 4, height: 4, marginLeft: -2, background: '#FF5E5E' }}
            />
          </span>
          <span
            className="lht-orbit"
            style={{ '--r': 56, '--d': '17s', '--delay': '-9s' } as React.CSSProperties}
          >
            <span
              className="lht-nano"
              style={{ width: 3, height: 3, marginLeft: -1.5, background: '#FF7A00' }}
            />
          </span>

          <button
            type="button"
            onClick={onStart}
            aria-label="Khởi động vỏ giáp nanotech J.A.R.V.I.S"
            className="lht-reactor-btn relative flex items-center justify-center w-24 h-24 md:w-28 md:h-28"
          >
            <span className="lht-core-glow relative block w-full h-full">
              <ReactorIcon />
            </span>
          </button>
        </div>

        <p className="mt-9 font-mono text-xs font-black tracking-[0.3em] text-[#FF1E1E]">
          KHỞI ĐỘNG VỎ GIÁP NANOTECH
        </p>
        <p className="mt-1.5 font-mono text-[9px] text-gray-500 tracking-[0.3em]">
          CHẠM VÀO LÕI REACTOR // TỰ ĐỘNG LẮP RÁP
        </p>
      </div>

      <div className="absolute bottom-[calc(var(--lht-safe-bottom)+2rem)] left-0 right-0 text-center font-mono text-[9px] text-gray-700 tracking-widest">
        L.H.T SLEEP MODE // TẠM NGƯNG HỆ THỐNG
      </div>
    </div>
  );
};
