import { API_URL } from './config';

// Session auth via HttpOnly cookie (SameSite=None; Secure; Partitioned) — XSS tidak bisa baca token.
// credentials: 'include' agar cookie terkirim cross-site (vercel.app → workers.dev).

export { API_URL };

export interface ApiFetchOptions extends RequestInit {
  // Endpoint auth (login/register/google) memakai 401 untuk "credentials salah" —
  // bukan sesi expired. Set true agar apiFetch tidak me-redirect ke landing.
  skipAuthRedirect?: boolean;
}

export function clearAuth(): void {
  localStorage.removeItem('fluency_user');
}

// Satu-satunya jalur request API: attach cookie + auto-logout saat sesi invalid/expired.
// URL path relatif (mis. '/logs?userId=1') — API_URL di-prepend di sini.
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { skipAuthRedirect = false, ...fetchOptions } = options;
  const res = await fetch(`${API_URL}${path}`, { ...fetchOptions, credentials: 'include' });

  if (res.status === 401 && !skipAuthRedirect) {
    clearAuth();
    if (window.location.pathname !== '/') window.location.href = '/';
    throw new Error('Session expired. Please sign in again.');
  }
  return res;
}
