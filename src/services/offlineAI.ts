import { getAllNews, getOfflineCache, setOfflineCache, type SyncedNews } from '../db/indexedDB';
import { apiUrl } from '../config/api';

export interface AIResponse {
  answer: string;
  source: 'cloud' | 'chrome_nano' | 'indexeddb_fallback';
}

declare global {
  interface Window {
    ai?: {
      languageModel?: {
        capabilities?: () => Promise<{ available: 'readily' | 'after-download' | 'no' }>;
        create?: (options?: { systemPrompt?: string }) => Promise<{
          prompt: (input: string) => Promise<string>;
          destroy: () => void;
        }>;
      };
    };
  }
}

export class OfflineAIService {
  private isOnline(): boolean {
    return typeof navigator !== 'undefined' && navigator.onLine;
  }

  async checkChromeAiAvailable(): Promise<boolean> {
    if (typeof window === 'undefined' || !window.ai?.languageModel?.capabilities) return false;
    try {
      const caps = await window.ai.languageModel.capabilities();
      return caps.available === 'readily';
    } catch {
      return false;
    }
  }

  async queryAI(userPrompt: string): Promise<AIResponse> {
    const trimmed = userPrompt.trim();
    if (!trimmed) {
      return { answer: 'Tôi chưa nghe rõ câu hỏi của bạn.', source: 'indexeddb_fallback' };
    }

    // 1. Nếu Online: Gọi API Cloud Gemini
    if (this.isOnline()) {
      try {
        const res = await fetch(apiUrl('/api/lht/query'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ query: trimmed }),
        });
        if (res.ok) {
          const data = await res.json();
          const answer = data.reply || data.answer || data.summary || 'Đã xử lý thành công.';
          // Cache kết quả online để dự phòng offline sau này
          await setOfflineCache(`query_${trimmed}`, answer);
          return { answer, source: 'cloud' };
        }
      } catch (err) {
        console.warn('[OfflineAIService] API Cloud ngắt kết nối, chuyển sang chế độ Offline Fallback:', err);
      }
    }

    // 2. Kiểm tra cache offline gần nhất
    const cached = await getOfflineCache(`query_${trimmed}`);
    if (cached) {
      return { answer: `[Dữ liệu lưu trữ] ${cached}`, source: 'indexeddb_fallback' };
    }

    // 3. Nếu Offline và có Chrome Built-in Gemini Nano (`window.ai`)
    const hasChromeAi = await this.checkChromeAiAvailable();
    if (hasChromeAi && window.ai?.languageModel?.create) {
      try {
        const newsList = await getAllNews();
        const topNewsContext = newsList
          .slice(0, 5)
          .map((n) => `[Tin tức: ${n.keyword}] ${n.audio_script} (Ẩn dụ web: ${n.web_dev_analogy})`)
          .join('\n');

        const session = await window.ai.languageModel.create({
          systemPrompt: `Bạn là trợ lý ảo LHT terminal chuyên nghiệp. Bạn đang hoạt động ngoại mạng (Offline). Hãy trả lời câu hỏi bằng tiếng Việt ngắn gọn, súc tích dựa trên các tin tức đã lưu trong bộ nhớ:\n${topNewsContext}`,
        });

        const reply = await session.prompt(trimmed);
        session.destroy();
        return { answer: reply, source: 'chrome_nano' };
      } catch (nanoErr) {
        console.warn('[OfflineAIService] Chrome Nano AI lỗi:', nanoErr);
      }
    }

    // 4. Fallback cuối cùng: Tìm kiếm tin tức khớp từ khóa trong IndexedDB
    return this.queryIndexedDbFallback(trimmed);
  }

  private async queryIndexedDbFallback(prompt: string): Promise<AIResponse> {
    const allNews = await getAllNews();
    if (!allNews || allNews.length === 0) {
      return {
        answer: 'Thiết bị đang offline và chưa có tin tức nào được lưu trữ trong bộ nhớ đệm.',
        source: 'indexeddb_fallback',
      };
    }

    const words = prompt.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const matched = allNews.filter((n) => {
      const text = `${n.keyword} ${n.audio_script} ${n.web_dev_analogy}`.toLowerCase();
      return words.some((w) => text.includes(w));
    });

    const targetNews = matched.length > 0 ? matched[0] : allNews[0];

    const answer = `[Offline Mode] Theo thông tin mới nhất lưu trữ về "${targetNews.keyword}": ${targetNews.audio_script} (Bản chất kỹ thuật: ${targetNews.web_dev_analogy})`;

    return { answer, source: 'indexeddb_fallback' };
  }
}

export const offlineAIService = new OfflineAIService();
