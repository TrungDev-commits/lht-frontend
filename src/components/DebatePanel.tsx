import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Swords, Mic, Square, Loader2, X } from 'lucide-react';
import { useSpeechTTS } from '../hooks/useSpeechTTS';
import type { SyncedNews } from '../db/indexedDB';
import { apiUrl } from '../config/api';

export interface DebatePanelProps {
  item: SyncedNews | null;
  isOpen: boolean;
  onClose: () => void;
}

type DebateStage = 'IDLE' | 'QUESTION' | 'LISTENING' | 'SCORING' | 'SCORED' | 'ERROR';

const LISTEN_DURATION_MS = 10_000;

export function DebatePanel({ item, isOpen, onClose }: DebatePanelProps) {
  const [stage, setStage] = useState<DebateStage>('IDLE');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  const tts = useSpeechTTS();
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const listenTimerRef = useRef<number | null>(null);
  const mutedRef = useRef(true);

  useEffect(() => {
    mutedRef.current = stage !== 'LISTENING' || tts.isSpeaking;
  }, [stage, tts.isSpeaking]);

  const stopRecognition = useCallback(() => {
    if (listenTimerRef.current !== null) {
      window.clearTimeout(listenTimerRef.current);
      listenTimerRef.current = null;
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  }, []);

  const startChallenge = useCallback(async () => {
    if (!item) return;
    setStage('QUESTION');
    setQuestion('');
    setAnswer('');
    setScore(null);
    setFeedback('');
    setError('');

    try {
      const response = await fetch(apiUrl('/api/ai/debate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context: `${item.keyword}\n${item.web_dev_analogy}\n${item.audio_script}`,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = (await response.json()) as { question?: string };
      const q = data.question ?? '';
      setQuestion(q);
      tts.play(q, { rate: 1.0 });

      setStage('LISTENING');
      beginListening();
    } catch (err) {
      setStage('ERROR');
      setError(err instanceof Error ? err.message : 'Không kết nối được bộ xử lý AI.');
    }
  }, [item, tts]);

  const beginListening = useCallback(() => {
    const Ctor = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Ctor) {
      setStage('ERROR');
      setError('Trình duyệt không hỗ trợ nhận dạng giọng nói.');
      return;
    }

    const recognition = new Ctor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'vi-VN';

    let finalAnswer = '';

    recognition.onresult = (event) => {
      let finalText = '';
      let interimText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const chunk = result[0]?.transcript ?? '';
        if (result.isFinal) {
          finalText += chunk;
        } else {
          interimText += chunk;
        }
      }
      finalAnswer = (finalAnswer + ' ' + finalText).trim();
      setAnswer((prev) => `${prev} ${finalText}`.trim() || interimText);
    };

    recognition.onend = () => {
      if (stage === 'LISTENING' && listenTimerRef.current !== null) {
        void submitAnswer(finalAnswer);
      }
    };

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setStage('ERROR');
        setError('Quyền truy cập micro bị từ chối.');
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      setStage('ERROR');
      setError('Không khởi động được micro.');
    }

    listenTimerRef.current = window.setTimeout(() => {
      recognition.stop();
    }, LISTEN_DURATION_MS);
  }, [stage]);

  const submitAnswer = useCallback(
    async (finalAnswer: string) => {
      if (listenTimerRef.current !== null) {
        window.clearTimeout(listenTimerRef.current);
        listenTimerRef.current = null;
      }
      if (!finalAnswer.trim()) {
        setStage('ERROR');
        setError('Không nghe thấy câu trả lời. Hãy thử lại.');
        return;
      }

      setAnswer(finalAnswer.trim());
      setStage('SCORING');
      try {
        const response = await fetch(apiUrl('/api/ai/debate'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            context: `${item?.keyword ?? ''}\n${item?.web_dev_analogy ?? ''}`,
            answer: finalAnswer.trim(),
          }),
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = (await response.json()) as { score?: number; feedback?: string };
        const finalScore = typeof data.score === 'number' ? data.score : 0;
        setScore(finalScore);
        setFeedback(data.feedback ?? '');

        const feedbackText = `Điểm của sếp là ${finalScore} trên 100. ${data.feedback ?? ''}`;
        tts.play(feedbackText, { rate: 1.0 });
        setStage('SCORED');
      } catch (err) {
        setStage('ERROR');
        setError(err instanceof Error ? err.message : 'Lỗi chấm điểm.');
      }
    },
    [item, tts]
  );

  const handleClose = useCallback(() => {
    stopRecognition();
    tts.stop();
    setStage('IDLE');
    onClose();
  }, [stopRecognition, tts, onClose]);

  useEffect(() => {
    if (!isOpen) {
      handleClose();
    }
  }, [isOpen, handleClose]);

  useEffect(() => {
    return () => {
      stopRecognition();
    };
  }, [stopRecognition]);

  return (
    <AnimatePresence>
      {isOpen && item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center px-4"
        >
          <motion.div
            initial={{ scale: 0.85, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 260, damping: 26 }}
            className="relative w-full max-w-md rounded-3xl border border-[#FF1E1E]/40 bg-[#0a0303]/95 backdrop-blur-xl shadow-[0_0_60px_rgba(255,30,30,0.3)] p-5"
          >
            <button
              onClick={handleClose}
              className="absolute top-3 right-3 p-2 rounded-full bg-[#180a0a] border border-[#FF1E1E]/30 text-[#FF5E00] hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 font-mono text-sm text-[#FF5E00] uppercase tracking-widest mb-1">
              <Swords className="w-5 h-5 text-[#FF1E1E]" />
              <span>THÁCH THỨC KỸ THUẬT</span>
            </div>
            <p className="font-mono text-[10px] text-gray-500 mb-4">
              {item.keyword} — kết nối phần cứng với Web Backend
            </p>

            {stage === 'IDLE' && (
              <button
                onClick={startChallenge}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF1E1E] to-[#8B0000] text-white font-mono font-bold tracking-widest shadow-[0_0_25px_rgba(255,30,30,0.5)] hover:scale-[1.02] active:scale-95 transition-all"
              >
                BẮT ĐẦU THÁCH THỨC
              </button>
            )}

            {stage === 'QUESTION' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <Loader2 className="w-8 h-8 text-[#FF1E1E] animate-spin" />
                <p className="font-mono text-xs text-gray-400">L.H.T ĐANG ĐẶT CÂU HỎI...</p>
              </div>
            )}

            {stage === 'LISTENING' && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="p-4 rounded-2xl bg-gradient-to-r from-[#FF1E1E]/15 to-[#8B0000]/15 border border-[#FF1E1E]/40 text-sm text-gray-100 leading-relaxed">
                  {question}
                </div>
                <div className="flex items-center gap-3 font-mono text-[11px] text-[#FF0055] animate-pulse">
                  <Mic className="w-4 h-4" />
                  <span>ĐANG NGHE CÂU TRẢ LỜI CỦA SẾP (10 GIÂY)...</span>
                </div>
                {answer && (
                  <p className="text-xs text-gray-300 italic max-h-24 overflow-y-auto">"{answer}"</p>
                )}
                <button
                  onClick={() => submitAnswer(answer)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#180a0a] border border-[#FF1E1E]/40 text-[#FF5E00] font-mono text-xs hover:text-white transition-all"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  GỬI CÂU TRẢ LỜI NGAY
                </button>
              </div>
            )}

            {stage === 'SCORING' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <Loader2 className="w-8 h-8 text-[#FF1E1E] animate-spin" />
                <p className="font-mono text-xs text-gray-400">L.H.T ĐANG CHẤM ĐIỂM...</p>
              </div>
            )}

            {stage === 'SCORED' && score !== null && (
              <div className="flex flex-col items-center gap-4 py-4">
                <div
                  className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#FF1E1E] via-[#FF5E00] to-[#FF0055] drop-shadow-[0_0_20px_rgba(255,30,30,0.6)]"
                >
                  {score}
                  <span className="text-xl text-gray-400">/100</span>
                </div>
                <p className="text-sm text-gray-100 leading-relaxed text-center">{feedback}</p>
                <button
                  onClick={startChallenge}
                  className="px-5 py-2.5 rounded-xl bg-[#180a0a] border border-[#FF1E1E]/40 text-[#FF5E00] font-mono text-xs hover:text-white transition-all"
                >
                  THÁCH THỨC MỚI
                </button>
              </div>
            )}

            {stage === 'ERROR' && (
              <div className="flex flex-col items-center gap-4 py-6">
                <p className="text-sm text-[#FF0055] text-center">{error}</p>
                <button
                  onClick={() => setStage('IDLE')}
                  className="px-5 py-2.5 rounded-xl bg-[#180a0a] border border-[#FF1E1E]/40 text-[#FF5E00] font-mono text-xs hover:text-white transition-all"
                >
                  THỬ LẠI
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
