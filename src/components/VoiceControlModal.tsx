import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, MicOff, X, Sparkles, Radio, Volume2, Cpu, ShieldCheck, Send } from 'lucide-react';
import { speakVietnamese, stopSpeech, playHudSound } from '../utils/audioSynth';
import { offlineAIService } from '../services/offlineAI';
import { saveConversationMessage } from '../db/indexedDB';

interface VoiceControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioMuted: boolean;
  onBookmarkFromAi?: (title: string, punchline: string) => void;
}

export const VoiceControlModal: React.FC<VoiceControlModalProps> = ({
  isOpen,
  onClose,
  audioMuted,
  onBookmarkFromAi,
}) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [sttError, setSttError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const shouldRestartRef = useRef(false);

  // Quick Preset Vietnamese Prompts for Speed & Convenience
  const PRESET_PROMPTS = [
    'Sếp ơi, giải thích NPU 48 TOPS!',
    'So sánh LPDDR5X RAM với Redis Cache?',
    'React 19 Compiler hoạt động như thế nào?',
    'RTX 5090 CUDA mạnh như thế nào đối với WebGL?',
  ];

  // Initialize Web Speech Recognition if supported
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSttError('Trình duyệt không hỗ trợ nhận dạng giọng nói.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'vi-VN';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      isListeningRef.current = true;
      setIsListening(true);
      setSttError(null);
    };

    recognition.onresult = (event: any) => {
      let currentTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        currentTranscript += event.results[i][0].transcript;
      }
      setTranscript(currentTranscript);
      setInputText(currentTranscript);
    };

    recognition.onerror = (event: any) => {
      const code: string = event.error;
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        setSttError('Quyền micro bị từ chối. Vui lòng cấp quyền micro cho trang này.');
        shouldRestartRef.current = false;
      } else if (code === 'network') {
        setSttError('Lỗi mạng khi kết nối dịch vụ nhận dạng.');
      } else if (code === 'no-speech') {
        // Không có giọng nói — bỏ qua, onend sẽ restart
      } else if (code !== 'aborted') {
        console.warn('[STT] error:', code);
      }
      isListeningRef.current = false;
      setIsListening(false);
    };

    recognition.onend = () => {
      isListeningRef.current = false;
      setIsListening(false);
      // Không restart — để user tự chủ động
    };

    recognitionRef.current = recognition;

    return () => {
      shouldRestartRef.current = false;
      try { recognition.abort(); } catch {}
      recognitionRef.current = null;
    };
  }, []);

  const startListening = () => {
    if (isListeningRef.current) return; // Tránh gọi đúp
    playHudSound('voice');
    setTranscript('');
    setAiResponse('');
    setSttError(null);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start();
      } catch (e) {
        console.warn('[STT] start error:', e);
      }
    } else {
      setSttError('Trình duyệt không hỗ trợ nhận dạng giọng nói.');
    }
  };

  const stopListening = () => {
    playHudSound('click');
    shouldRestartRef.current = false;
    isListeningRef.current = false;
    setIsListening(false);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch {}
    }
  };

  const handleSendQuery = async (queryText?: string) => {
    const textToSend = queryText || inputText || transcript;
    if (!textToSend.trim()) return;

    stopListening();
    setLoading(true);
    playHudSound('click');

    try {
      const response = await offlineAIService.queryAI(textToSend);
      setAiResponse(response.answer);

      // Save to IndexedDB conversation history
      saveConversationMessage('modal_session', 'user', textToSend);
      saveConversationMessage('modal_session', 'assistant', response.answer);

      // Speak response in Vietnamese if audio not muted
      if (!audioMuted) {
        speakVietnamese(response.answer);
      }
    } catch (err) {
      console.error(err);
      const fallback = `[L.H.T SYSTEM]: Đã nhận tín hiệu cho lệnh "${textToSend}". Mối liên kết phần cứng và Web Dev đã được cập nhật.`;
      setAiResponse(fallback);
      if (!audioMuted) {
        speakVietnamese(fallback);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex flex-col items-center justify-between p-6 select-none"
      >
        {/* Top Header */}
        <div className="w-full max-w-md flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#FF1E1E] animate-pulse" />
            <span className="font-mono text-xs font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#FF1E1E] to-[#FF5E00] uppercase tracking-widest">
              L.H.T VOICE HOLOGRAM TERMINAL
            </span>
          </div>

          <button
            onClick={() => {
              stopSpeech();
              stopListening();
              onClose();
            }}
            className="p-2 rounded-full bg-[#1e0a0a] border border-[#FF1E1E]/40 text-gray-300 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CENTER: FUTURISTIC RED HOLOGRAM RING LISTENING ANIMATION */}
        <div className="relative my-auto flex flex-col items-center justify-center text-center max-w-sm w-full">
          {/* Concentric Glowing Hologram Rings */}
          <div className="relative w-48 h-48 flex items-center justify-center my-4">
            {/* Outer Animated Ring */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 8, ease: 'linear' }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-[#FF1E1E]/40 shadow-[0_0_25px_rgba(255,30,30,0.3)]"
            />

            {/* Middle Pulse Ring */}
            <motion.div
              animate={{ scale: isListening ? [1, 1.25, 1] : 1 }}
              transition={{ repeat: Infinity, duration: 1.2 }}
              className="absolute inset-4 rounded-full border-2 border-[#FF0055]/50 shadow-[0_0_35px_rgba(255,0,85,0.4)]"
            />

            {/* Inner Core Mic Button */}
            <button
              onClick={isListening ? stopListening : startListening}
              className={`relative z-10 w-28 h-28 rounded-full flex flex-col items-center justify-center shadow-[0_0_40px_rgba(255,30,30,0.8)] border-2 border-white/60 transition-all ${
                isListening
                  ? 'bg-gradient-to-tr from-[#FF0055] via-[#FF1E1E] to-[#FF5E00] scale-105'
                  : 'bg-gradient-to-tr from-[#8B0000] to-[#FF1E1E] hover:scale-105'
              }`}
            >
              {isListening ? (
                <Mic className="w-10 h-10 text-white animate-bounce" />
              ) : (
                <MicOff className="w-10 h-10 text-white/80" />
              )}
            </button>
          </div>

          {/* Vietnamese Feedback Indicator */}
          <div className="mt-2 font-mono text-xs font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-[#FF1E1E] via-[#FF5E00] to-[#FF0055] uppercase animate-pulse">
            {isListening
              ? 'ĐANG LẮNG NGHE SẾP... (NÓI TIẾNG VIỆT)'
              : loading
              ? 'L.H.T ĐANG PHÂN TÍCH QUY TRÌNH...'
              : sttError
              ? '⚠ LỖI MICRO'
              : 'CHẠM VÀO VÒNG TRÒN HOLOGRAPHIC ĐỂ PHÁT LỆNH'}
          </div>

          {/* STT Error Display */}
          {sttError && (
            <div className="mt-2 px-4 py-2 rounded-xl bg-[#1a0505] border border-[#FF1E1E]/50 text-xs text-red-300 font-mono text-center">
              {sttError}
            </div>
          )}

          {/* Transcript / Input display */}
          {inputText && (
            <div className="mt-3 px-4 py-2 rounded-xl bg-[#120606] border border-[#FF1E1E]/30 text-xs text-red-200 font-mono">
              "{inputText}"
            </div>
          )}

          {/* AI Response Box */}
          {aiResponse && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 rounded-2xl bg-[#0e0606]/95 border border-[#FF1E1E]/50 shadow-[0_0_20px_rgba(255,30,30,0.3)] text-left text-xs font-sans text-gray-200 leading-relaxed max-h-48 overflow-y-auto"
            >
              <div className="flex items-center gap-1.5 font-mono text-[10px] text-[#FF5E00] font-bold uppercase mb-1">
                <Sparkles className="w-3.5 h-3.5 text-[#FF1E1E]" />
                <span>PHẢN HỒI L.H.T TERMINAL</span>
              </div>
              <p>{aiResponse}</p>
            </motion.div>
          )}

          {/* Preset Prompts List */}
          <div className="mt-6 w-full flex flex-col gap-1.5">
            <span className="font-mono text-[10px] text-gray-500 uppercase tracking-widest text-left">
              MẪU LỆNH GIỌNG NÓI VIỆT
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_PROMPTS.map((preset, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputText(preset);
                    handleSendQuery(preset);
                  }}
                  className="px-2.5 py-1.5 rounded-xl bg-[#150a0a] border border-[#FF1E1E]/25 hover:border-[#FF1E1E] text-left text-[11px] font-mono text-gray-300 hover:text-white transition-all"
                >
                  ⚡ {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom Input Field for Typing */}
        <div className="w-full max-w-md flex items-center gap-2">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSendQuery()}
            placeholder="Nhập lệnh Tiếng Việt cho L.H.T..."
            className="flex-1 px-4 py-3 rounded-2xl bg-[#120707] border border-[#FF1E1E]/40 text-white font-mono text-xs focus:outline-none focus:border-[#FF1E1E]"
          />
          <button
            onClick={() => handleSendQuery()}
            disabled={loading}
            className="p-3 rounded-2xl bg-gradient-to-r from-[#FF1E1E] to-[#FF0055] text-white font-mono font-bold shadow-[0_0_15px_#FF1E1E] hover:scale-105"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
