import React from 'react';

interface IdleSleepScreenProps {
  supported: boolean;
  listening: boolean;
  error: string | null;
  onTapWake: () => void;
}

export const IdleSleepScreen: React.FC<IdleSleepScreenProps> = ({
  supported,
  listening,
  error,
  onTapWake,
}) => {
  return (
    <div
      onClick={onTapWake}
      role="button"
      aria-label="Chạm để đánh thức L.H.T"
      className="fixed inset-0 z-50 bg-[#000000] flex flex-col items-center justify-center select-none cursor-pointer"
    >
      <div className="relative w-16 h-16 rounded-full border border-[#FF1E1E]/30 flex items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-[#FF1E1E]/10 animate-pulse" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#FF0055] shadow-[0_0_12px_#FF1E1E]" />
      </div>

      <h1 className="mt-6 font-mono text-sm font-black tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-[#FF1E1E] to-[#FF5E00]">
        L.H.T
      </h1>

      <p className="mt-3 font-mono text-[10px] text-gray-500 tracking-widest">
        {!supported
          ? 'TRÌNH DUYỆT KHÔNG HỖ TRỢ NHẬN DẠNG GIỌNG NÓI'
          : listening
            ? 'ĐANG LẮNG NGHE TỪ KHÓA ĐÁNH THỨC...'
            : 'ĐANG KHỞI ĐỘNG CẢM BIẾN GIỌNG NÓI...'}
      </p>

      <p className="mt-2 font-mono text-[10px] text-[#FF5E00]/80 tracking-widest">
        NÓI: "DẬY ĐI L.H.T" HOẶC CHẠM VÀO MÀN HÌNH
      </p>

      {error && (
        <p className="mt-4 px-3 py-1.5 rounded-lg bg-[#120606] border border-[#FF1E1E]/40 text-[10px] font-mono text-[#FF5E00] max-w-xs text-center">
          {error}
        </p>
      )}

      <div className="absolute bottom-8 left-0 right-0 text-center font-mono text-[9px] text-gray-700 tracking-widest">
        L.H.T SLEEP MODE // TẠM NGƯNG HỆ THỐNG
      </div>
    </div>
  );
};
