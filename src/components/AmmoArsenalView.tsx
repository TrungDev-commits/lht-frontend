import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AmmoCard } from '../types';
import { 
  Trash2, Volume2, Search, Plus, ShieldAlert, Sparkles, Code, 
  Tag, Clock, CheckCircle2, ChevronRight, Share2, Copy
} from 'lucide-react';
import { playHudSound, speakVietnamese } from '../utils/audioSynth';

interface AmmoArsenalViewProps {
  ammoCards: AmmoCard[];
  onDeleteAmmo: (id: string) => void;
  onAddAmmo: (card: AmmoCard) => void;
  audioMuted: boolean;
  icebreakers?: { keyword: string; text: string }[];
}

export const AmmoArsenalView: React.FC<AmmoArsenalViewProps> = ({
  ammoCards,
  onDeleteAmmo,
  onAddAmmo,
  audioMuted,
  icebreakers = [],
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New Custom Ammo Form State
  const [newTitle, setNewTitle] = useState('');
  const [newPunchline, setNewPunchline] = useState('');
  const [newAnalogy, setNewAnalogy] = useState('');
  const [newCode, setNewCode] = useState('');

  // All unique tags
  const allTags = Array.from(new Set(ammoCards.flatMap((c) => c.tags)));

  // Filtered Cards
  const filtered = ammoCards.filter((card) => {
    if (selectedTag && !card.tags.includes(selectedTag)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        card.title.toLowerCase().includes(q) ||
        card.punchline.toLowerCase().includes(q) ||
        card.category.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    playHudSound('alert');
    onDeleteAmmo(id);
  };

  const handleSpeakCard = (card: AmmoCard) => {
    playHudSound('click');
    if (!audioMuted) {
      speakVietnamese(`${card.title}. ${card.punchline}`);
    }
  };

  const handleCopyCode = (id: string, code: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    playHudSound('click');
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCreateCustomAmmo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newPunchline.trim()) return;

    playHudSound('bookmark');
    const newCard: AmmoCard = {
      id: `ammo-custom-${Date.now()}`,
      title: newTitle,
      category: 'L.H.T TÙY CHỈNH',
      punchline: newPunchline,
      webAnalogy: newAnalogy || 'Khái niệm lập trình web cá nhân hóa.',
      timestamp: new Date().toLocaleString('vi-VN'),
      tags: ['LHT', 'Custom', 'Knowledge'],
      codeSnippet: newCode || undefined,
    };

    onAddAmmo(newCard);
    setNewTitle('');
    setNewPunchline('');
    setNewAnalogy('');
    setNewCode('');
    setShowAddModal(false);
  };

  return (
    <div className="relative w-full min-h-[calc(100vh-120px)] flex flex-col justify-start items-center px-4 pt-2 pb-28 overflow-x-hidden select-none">
      {/* HEADER SECTION */}
      <div className="w-full max-w-md flex flex-col gap-2 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[#FF1E1E] animate-pulse" />
            <h2 className="text-lg font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#FF1E1E] via-[#FF5E00] to-[#FF0055] font-mono uppercase">
              KHO ĐẠN DƯỢC AI ({ammoCards.length})
            </h2>
          </div>

          <button
            onClick={() => {
              playHudSound('click');
              setShowAddModal(true);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#FF1E1E] to-[#FF0055] text-white font-mono text-xs font-bold shadow-[0_0_12px_rgba(255,30,30,0.4)] hover:scale-105 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>THÊM ĐẠN</span>
          </button>
        </div>

        {/* SEARCH & TAG FILTER */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-[#0e0707]/90 border border-[#FF1E1E]/30 text-xs">
          <Search className="w-4 h-4 text-[#FF1E1E]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm kiếm đạn dược kiến thức..."
            className="w-full bg-transparent text-white font-mono placeholder-gray-500 focus:outline-none"
          />
        </div>

        {/* Tag Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-[10px] font-mono">
          <button
            onClick={() => {
              playHudSound('click');
              setSelectedTag(null);
            }}
            className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
              selectedTag === null
                ? 'bg-[#FF1E1E] text-white font-bold shadow-[0_0_8px_#FF1E1E]'
                : 'bg-[#150a0a] text-gray-400 border border-[#FF1E1E]/20'
            }`}
          >
            TẤT CẢ T THẺ
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                playHudSound('click');
                setSelectedTag(selectedTag === tag ? null : tag);
              }}
              className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-all ${
                selectedTag === tag
                  ? 'bg-[#FF5E00] text-white font-bold shadow-[0_0_8px_#FF5E00]'
                  : 'bg-[#150a0a] text-gray-400 border border-[#FF1E1E]/20'
              }`}
            >
              #{tag}
            </button>
          ))}
        </div>
      </div>

      {/* ICE-BREAKER HIGHLIGHT CARD (TOP OF AMMO ARSENAL) */}
      {icebreakers.length > 0 && (
        <div className="w-full max-w-md mb-4">
          <div className="relative overflow-hidden rounded-2xl border-2 border-[#FF5E00]/60 bg-gradient-to-r from-[#FF1E1E]/20 via-[#8B0000]/25 to-[#FF1E1E]/10 p-4 shadow-[0_0_30px_rgba(255,94,0,0.25)]">
            <div className="absolute right-0 top-0 opacity-10 font-mono text-[48px] font-black text-[#FF5E00] select-none pointer-events-none">
              L.H.T
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-md bg-[#FF5E00] text-black text-[9px] font-mono font-black uppercase tracking-widest shadow-[0_0_10px_#FF5E00]">
                ✦ Ice-breaker Hôm Nay
              </span>
              <span className="text-[9px] font-mono text-[#FF5E00]/70 uppercase tracking-wider">
                {icebreakers[0].keyword}
              </span>
            </div>
            <p className="text-sm text-white font-medium leading-relaxed">
              "{icebreakers[0].text}"
            </p>
            <p className="mt-2 text-[10px] font-mono text-[#FF5E00]/80">
              → Đưa câu này ra "chém gió" với anh em R&D đầu giờ sáng
            </p>
          </div>
        </div>
      )}

      {/* 3D STACKED CARD CAROUSEL / PARALLAX LIST */}
      <div 
        className="w-full max-w-md flex flex-col gap-4"
        style={{ perspective: '1000px' }}
      >
        {filtered.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-3xl bg-[#0d0606] border border-[#FF1E1E]/20 text-gray-400 font-mono text-xs">
            <ShieldAlert className="w-10 h-10 text-[#FF1E1E] mx-auto mb-2 opacity-50" />
            <p className="font-bold text-gray-300">KHÔNG CÓ ĐẠN DƯỢC NÀO TRONG KHO</p>
            <p className="text-[11px] text-gray-500 mt-1">Hãy lưu thêm kiến thức từ Chế Độ Tẩu Tán hoặc Chế Độ Giải Phẫu.</p>
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((card, index) => (
              <motion.div
                key={card.id}
                layout
                initial={{ opacity: 0, scale: 0.9, rotateX: 10, y: 20 }}
                animate={{ opacity: 1, scale: 1, rotateX: 0, y: 0 }}
                exit={{ 
                  opacity: 0, 
                  x: 300, 
                  scale: 0.7, 
                  rotateZ: 15,
                  filter: 'blur(10px)',
                  transition: { duration: 0.35 } 
                }}
                transition={{ type: 'spring', stiffness: 260, damping: 22, delay: index * 0.05 }}
                drag="x"
                dragConstraints={{ left: 0, right: 200 }}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 100) {
                    // Swipe right to delete with particle dissolution
                    playHudSound('alert');
                    onDeleteAmmo(card.id);
                  }
                }}
                className="relative group p-4 rounded-2xl bg-[#121212] border-y border-r border-[#FF1E1E]/30 shadow-[0_8px_25px_rgba(255,30,30,0.15)] hover:shadow-[0_8px_30px_rgba(255,30,30,0.3)] transition-all cursor-grab active:cursor-grabbing overflow-hidden"
                style={{
                  borderLeft: '4px solid #FF1E1E', // REQUIRED Crimson Red Gradient Accent line
                }}
              >
                {/* Background Cyber Pattern */}
                <div className="absolute right-0 top-0 opacity-5 font-mono text-[60px] font-black text-[#FF1E1E] select-none pointer-events-none">
                  L.H.T
                </div>

                {/* Card Top Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-[#220a0a] border border-[#FF1E1E]/40 text-[#FF5E00] text-[9px] font-mono font-bold uppercase">
                      {card.category}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#FF1E1E]" />
                      {card.timestamp}
                    </span>
                  </div>

                  {/* Top Action Icons */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleSpeakCard(card)}
                      className="p-1.5 rounded-lg bg-[#1a0a0a] text-[#FF5E00] hover:text-white border border-[#FF1E1E]/30"
                      title="Đọc bằng giọng nói AI Tiếng Việt"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(card.id, e)}
                      className="p-1.5 rounded-lg bg-[#1a0a0a] text-red-500 hover:text-red-300 border border-red-900/40"
                      title="Vuốt sang phải hoặc bấm để xóa đạn dược"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Card Title */}
                <h3 className="text-base font-bold text-white tracking-wide">
                  {card.title}
                </h3>

                {/* 1-Sentence Vietnamese Punchline (REQUIRED) */}
                <div className="mt-2.5 p-2.5 rounded-xl bg-[#0a0505] border border-[#FF1E1E]/25 text-xs text-[#FFD7D7] font-sans leading-relaxed">
                  <span className="text-[#FF1E1E] font-bold font-mono mr-1">⚡ ĐIỂM CHÍ MẠNG:</span>
                  {card.punchline}
                </div>

                {/* Web Analogy */}
                {card.webAnalogy && (
                  <p className="mt-2 text-[11px] text-gray-400 italic">
                    💡 <span className="text-[#FF5E00]">Giải phẫu Web:</span> {card.webAnalogy}
                  </p>
                )}

                {/* Code Snippet Box if available */}
                {card.codeSnippet && (
                  <div className="mt-3 relative rounded-xl bg-[#060303] border border-gray-800 p-2.5 font-mono text-[10px] text-emerald-400 overflow-x-auto">
                    <div className="flex items-center justify-between border-b border-gray-800 pb-1 mb-1 text-gray-500 text-[9px]">
                      <span className="flex items-center gap-1">
                        <Code className="w-3 h-3 text-[#FF1E1E]" /> MÃ MINH HỌA
                      </span>
                      <button
                        onClick={(e) => handleCopyCode(card.id, card.codeSnippet!, e)}
                        className="text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedId === card.id ? 'ĐÃ CHÉP' : 'SAO CHÉP'}
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap">{card.codeSnippet}</pre>
                  </div>
                )}

                {/* Tags Footer */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-900">
                  <div className="flex flex-wrap gap-1">
                    {card.tags.map((t) => (
                      <span key={t} className="text-[9px] font-mono text-gray-400 bg-[#180a0a] px-2 py-0.5 rounded border border-[#FF1E1E]/15">
                        #{t}
                      </span>
                    ))}
                  </div>
                  <span className="text-[9px] font-mono text-gray-500 italic">
                    [VUỐT SANG PHẢI ĐỂ XÓA]
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* ADD CUSTOM AMMO MODAL */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-md p-5 rounded-3xl bg-[#120808] border border-[#FF1E1E] shadow-[0_0_30px_rgba(255,30,30,0.5)] font-sans"
            >
              <div className="flex items-center justify-between border-b border-[#FF1E1E]/30 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-[#FF1E1E]" />
                  <h3 className="font-mono text-base font-bold text-white uppercase">THÊM ĐẠN DƯỢC MỚI</h3>
                </div>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateCustomAmmo} className="flex flex-col gap-3 text-xs">
                <div>
                  <label className="font-mono text-gray-400 uppercase text-[10px]">Tiêu đề đạn dược</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="VD: WebAssembly Threading vs CPU Multi-core"
                    className="w-full mt-1 p-2.5 rounded-xl bg-[#090404] border border-[#FF1E1E]/40 text-white font-mono focus:outline-none focus:border-[#FF1E1E]"
                  />
                </div>

                <div>
                  <label className="font-mono text-gray-400 uppercase text-[10px]">Câu Punchline Chí Mạng (1 Câu)</label>
                  <input
                    type="text"
                    required
                    value={newPunchline}
                    onChange={(e) => setNewPunchline(e.target.value)}
                    placeholder="VD: WASM cho phép chạy thuật toán ma trận trực tiếp trên GPU."
                    className="w-full mt-1 p-2.5 rounded-xl bg-[#090404] border border-[#FF1E1E]/40 text-white font-mono focus:outline-none focus:border-[#FF1E1E]"
                  />
                </div>

                <div>
                  <label className="font-mono text-gray-400 uppercase text-[10px]">Phép so sánh Web Dev</label>
                  <input
                    type="text"
                    value={newAnalogy}
                    onChange={(e) => setNewAnalogy(e.target.value)}
                    placeholder="VD: Tương tự Web Worker chạy background thread không khựng UI."
                    className="w-full mt-1 p-2.5 rounded-xl bg-[#090404] border border-[#FF1E1E]/40 text-white font-mono focus:outline-none focus:border-[#FF1E1E]"
                  />
                </div>

                <div>
                  <label className="font-mono text-gray-400 uppercase text-[10px]">Mã minh họa (Không bắt buộc)</label>
                  <textarea
                    rows={3}
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    placeholder="// Ví dụ code JavaScript / Rust"
                    className="w-full mt-1 p-2.5 rounded-xl bg-[#090404] border border-[#FF1E1E]/40 text-emerald-400 font-mono text-[11px] focus:outline-none focus:border-[#FF1E1E]"
                  />
                </div>

                <div className="flex items-center gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-900 text-gray-300 font-mono text-xs font-bold"
                  >
                    HỦY BỎ
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#FF1E1E] to-[#FF0055] text-white font-mono text-xs font-bold shadow-[0_0_15px_#FF1E1E]"
                  >
                    LƯU VÀO KHO
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
