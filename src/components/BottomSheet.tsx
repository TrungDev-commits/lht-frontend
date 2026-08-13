import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X } from 'lucide-react';

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
        >
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-0 left-0 right-0 max-w-lg mx-auto max-h-[75vh] overflow-y-auto rounded-t-3xl border-t border-x border-[#FF1E1E]/40 bg-[#0a0303]/95 backdrop-blur-xl shadow-[0_-10px_60px_rgba(255,30,30,0.25)]"
          >
            <div className="sticky top-0 z-10 flex items-center justify-between px-5 pt-4 pb-3 bg-[#0a0303]/95 backdrop-blur-xl border-b border-[#FF1E1E]/20">
              <div className="flex flex-col gap-1.5">
                <div className="w-10 h-1 rounded-full bg-[#FF1E1E]/60 mx-auto mb-1" />
                {title && (
                  <h2 className="font-mono text-sm font-bold text-[#FF5E00] uppercase tracking-widest">
                    {title}
                  </h2>
                )}
              </div>
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-[#180a0a] border border-[#FF1E1E]/30 text-[#FF5E00] hover:text-white transition-all"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
