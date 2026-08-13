import React from 'react';

export const HUDBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#030303]">
      {/* Radial Crimson Glows */}
      <div 
        className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[560px] h-[560px] rounded-full blur-2xl opacity-25 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF1E1E 0%, #FF0055 40%, transparent 70%)' }}
      />
      <div 
        className="absolute bottom-[-10%] left-[-10%] w-[460px] h-[460px] rounded-full blur-2xl opacity-20 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #8B0000 0%, #FF5E00 50%, transparent 70%)' }}
      />
      <div 
        className="absolute top-[40%] right-[-15%] w-[360px] h-[360px] rounded-full blur-2xl opacity-15 pointer-events-none"
        style={{ background: 'radial-gradient(circle, #FF0055 0%, #FF1E1E 60%, transparent 80%)' }}
      />

      {/* Futuristic Grid Lines */}
      <div 
        className="absolute inset-0 opacity-[0.07] bg-[linear-gradient(to_right,#FF1E1E_1px,transparent_1px),linear-gradient(to_bottom,#FF1E1E_1px,transparent_1px)] bg-[size:32px_32px]"
      />

      {/* Cyber Scanline Overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,30,30,0.03)_50%,transparent_50%)] bg-[size:100%_4px] pointer-events-none" />

      {/* Corner Bracket Reticles */}
      <div className="absolute top-3 left-3 w-6 h-6 border-t-2 border-l-2 border-[#FF1E1E]/60 rounded-tl-sm" />
      <div className="absolute top-3 right-3 w-6 h-6 border-t-2 border-r-2 border-[#FF1E1E]/60 rounded-tr-sm" />
      <div className="absolute bottom-16 left-3 w-6 h-6 border-b-2 border-l-2 border-[#FF1E1E]/60 rounded-bl-sm" />
      <div className="absolute bottom-16 right-3 w-6 h-6 border-b-2 border-r-2 border-[#FF1E1E]/60 rounded-br-sm" />

      {/* Sci-Fi Watermark Status */}
      <div className="absolute top-16 right-4 font-mono text-[9px] text-[#FF5E00]/40 tracking-widest uppercase pointer-events-none select-none">
        L.H.T SYSTEM // OS-V4.09 // LATENCY 1.2ms
      </div>
    </div>
  );
};
