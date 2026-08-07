import { API_URL } from './config';

// Session auth via HttpOnly cookie (SameSite=None; Secure) — XSS tidak bisa baca token.
// credentials: 'include' agar cookie terkirim cross-site (vercel.app → workers.dev).

export { API_URL };

export function clearAuth(): void {
  localStorage.removeItem('fluency_user');
}

// Satu-satunya jalur request API: attach cookie + auto-logout saat sesi invalid/expired.
// URL path relatif (mis. '/logs?userId=1') — API_URL di-prepend di sini.
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_URL}${path}`, { ...options, credentials: 'include' });

  if (res.status === 401) {
    clearAuth();
    if (window.location.pathname !== '/') window.location.href = '/';
    throw new Error('Session expired. Please sign in again.');
  }
  return res;
}
