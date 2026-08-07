import { API_URL } from './config';

// Session token (JWT) — semua request API wajib bawa Bearer token
const TOKEN_KEY = 'fluency_token';

export { API_URL };

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem('fluency_user');
}

// Satu-satunya jalur request API: attach Bearer token + auto-logout saat sesi invalid/expired.
// URL path relatif (mis. '/logs?userId=1') — API_URL di-prepend di sini.
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers);
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearAuth();
    if (window.location.pathname !== '/') window.location.href = '/';
    throw new Error('Session expired. Please sign in again.');
  }
  return res;
}
