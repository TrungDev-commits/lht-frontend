import React from 'react';

interface IdleSleepScreenProps {
  onStart: () => void;
}

export const IdleSleepScreen: React.FC<IdleSleepScreenProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 z-50 bg-[#000000] flex flex-col items-center justify-center select-none">
      <div className="relative w-16 h-16 rounded-full border border-[#FF1E1E]/30 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#FF1E1E]/10 animate-pulse" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FF0055] shadow-[0_0_12px_#FF1E1E]" />
      </div>

      <h1 className="mt-6 font-mono text-sm font-black tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-[#FF1E1E] to-[#FF5E00]">
        L.H.T
      </h1>

      <p className="mt-3 font-mono text-[10px] text-gray-500 tracking-widest">
        HỆ THỐNG ĐANG Ở CHẾ ĐỘ NGỦ
      </p>

      <button
        type="button"
        onClick={onStart}
        aria-label="Khởi động J.A.R.V.I.S"
        className="group mt-8 inline-flex items-center gap-3 rounded-xl border border-[#FF1E1E]/50 bg-[#120606] px-8 py-4 font-mono text-xs font-black tracking-[0.25em] text-[#FF1E1E] transition-colors duration-200 hover:border-[#FF1E1E] hover:bg-[#1f0909] active:scale-95"
      >
        <span className="inline-flex h-2 w-2 rounded-full bg-[#FF1E1E] shadow-[0_0_10px_#FF1E1E] animate-pulse" />
        KHỞI ĐỘNG J.A.R.V.I.S
      </button>

      <p className="mt-3 font-mono text-[9px] text-gray-600 tracking-widest">
        NHẤN NÚT ĐỂ THỨC GIẤC HỆ THỐNG
      </p>

      <div className="absolute bottom-8 left-0 right-0 text-center font-mono text-[9px] text-gray-700 tracking-widest">
        L.H.T SLEEP MODE // TẠM NGƯNG HỆ THỐNG
      </div>
    </div>
  );
};
