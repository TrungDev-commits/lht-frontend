const configured = (import.meta.env.VITE_API_BASE_URL ?? '').trim();

// Mặc định trỏ về backend Render khi build production (deploy Netlify/GH Actions)
// mà không inject VITE_API_BASE_URL. Vẫn override được qua biến env.
const base = configured || (import.meta.env.PROD ? 'https://lht-backend.onrender.com' : '');

export const API_BASE_URL = base.replace(/\/+$/, '');

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}
