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
  localStorage.removeItem('swaralingo_token');
}

// Satu-satunya jalur request API: attach cookie + auto-logout saat sesi invalid/expired.
export async function apiFetch(path: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { skipAuthRedirect = false, ...fetchOptions } = options;

  const token = localStorage.getItem('swaralingo_token');
  const headers = {
    ...(fetchOptions.headers || {}),
  } as Record<string, string>;

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...fetchOptions,
      headers,
      credentials: 'include',
    });

    if (res.status === 401 && !skipAuthRedirect) {
      clearAuth();
      if (window.location.pathname !== '/') window.location.href = '/';
      throw new Error('Session expired. Please sign in again.');
    }

    return res;
  } catch (err) {
    // Re-throw network errors — caller handles via TanStack Query retry
    throw err;
  }
}

export function showToast(message: string, type: 'success' | 'error' | 'info' = 'success') {
  window.dispatchEvent(new CustomEvent('showToast', { detail: { message, type } }));
}
