# L.H.T Frontend

> **L.H.T — Logical Heuristic Terminal** là trợ lý AI cá nhân kiểu J.A.R.V.I.S / Cyberpunk: PWA Sci-Fi Red HUD với màn hình khởi động bằng nút bấm, **offline-first**, pipeline tin tức tự động và tích hợp IoT. React 19 + Vite 8 + Tailwind CSS v4, deploy lên **Netlify**.

## Tính năng

- **Khởi động bằng nút bấm**: màn hình `IDLE_SLEEP` có nút **KHỞI ĐỘNG J.A.R.V.I.S** — nhấn để đánh thức hệ thống (thay cho wake word giọng nói).
- **Drive Mode**: HUD đỏ AMOLED, TTS đọc tin, cử chỉ chạm/vuốt, bookmark "đạn dược".
- **X-Ray Mode**: graph 3D tương tác (node phần cứng ↔ Web Dev), chế độ họp R&D → `POST /api/ai/meeting-note`.
- **Debate Mode**: L.H.T đặt câu hỏi phản biện → mic 10s → chấm điểm.
- **Preferences Radar**: radar ECharts kéo đỉnh để điều chỉnh chủ đề ưu tiên.
- **Offline-first**: mọi dữ liệu đọc từ **Dexie (IndexedDB)**; backend chỉ là nguồn đồng bộ khi online.
- **PWA**: Service Worker (Workbox `generateSW`), precache toàn bộ app shell + `navigateFallback: /index.html`, đăng ký tự động ngay khi load.

## Cấu trúc

```
src/
├── config/api.ts        # API_BASE_URL từ VITE_API_BASE_URL + helper apiUrl()
├── db/indexedDB.ts      # Dexie DB — nguồn dữ liệu DUY NHẤT
├── hooks/               # useVoiceSTT, useSpeechTTS, useMediaSession, useNewsSync...
├── views/               # DriveMode, XRayMode, PreferencesRadar
├── components/          # HUD*, HologramCarousel, DebatePanel, BottomSheet...
└── main.tsx             # registerSW({ immediate: true })
```

## Cài đặt & chạy local

```bash
npm install
npm run dev              # Vite dev server → http://localhost:5173
```

Mặc định Vite proxy mọi `/api/*` về `http://localhost:3001` (backend L.H.T). Muốn đổi target:

```bash
# Windows PowerShell
$env:VITE_API_PROXY_TARGET="http://localhost:3001"; npm run dev
```

Typecheck & build:

```bash
npm run typecheck
npm run build            # tsc --noEmit && vite build (sinh dist/sw.js + manifest)
npm run preview
```

## Biến môi trường

| Biến | Mô tả |
| --- | --- |
| `VITE_API_BASE_URL` | URL gốc backend (Render), vd `https://lht-backend.onrender.com`. **Để trống = gọi API tương đối** (chỉ dùng khi dev có proxy). **Bắt buộc trên Netlify**. |
| `VITE_API_PROXY_TARGET` | (dev) Target proxy `/api` của Vite, default `http://localhost:3001` |

## Deploy — Netlify

Repo đi kèm `netlify.toml` (build `npm ci && npm run build`, publish `dist`, SPA redirect `/* → /index.html`) + `.github/workflows/deploy.yml`:

1. Tạo site trên Netlify hoặc liên kết qua `nwtgck/actions-netlify`.
2. Cấu hình trong GitHub repo:
   - **Secrets**: `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`
   - **Variables**: `VITE_API_BASE_URL=https://lht-backend.onrender.com`
3. Push lên `main` → GitHub Actions build (inject `VITE_API_BASE_URL`) → deploy production.

## Kiểm thử PWA (online/offline)

1. Mở app trên **Chrome/Edge** (HTTP local cũng được; production nên dùng HTTPS).
2. Load online → DevTools → **Application → Service Workers** → thấy `sw.js` activated; **Cache Storage** có precache app shell.
3. Bật **Offline** trong DevTools (Network tab) → **reload** → app shell + dữ liệu Dexie vẫn hiển thị, banner "Đang ngoại tuyến".
4. Tắt Offline → app tự đồng bộ lại (useNewsSync lắng nghe sự kiện `online`).
