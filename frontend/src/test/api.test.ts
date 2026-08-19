import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiFetch, showToast, clearAuth } from '../api';

describe('Frontend API Fetch Interceptor & Helpers', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('should attach Bearer Authorization header when token exists in localStorage', async () => {
    localStorage.setItem('swaralingo_token', 'test-jwt-token-xyz');

    const mockFetch = vi.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    await apiFetch('/api/test');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toContain('/api/test');
    expect(options.headers['Authorization']).toBe('Bearer test-jwt-token-xyz');
    expect(options.credentials).toBe('include');
  });

  it('should clearAuth and redirect on 401 when skipAuthRedirect is false', async () => {
    localStorage.setItem('swaralingo_token', 'expired-token');
    localStorage.setItem('fluency_user', JSON.stringify({ id: 1 }));

    const mockFetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ success: false, error: 'Unauthorized' }),
    });
    global.fetch = mockFetch;

    await expect(apiFetch('/api/protected')).rejects.toThrow('Session expired');

    expect(localStorage.getItem('swaralingo_token')).toBeNull();
    expect(localStorage.getItem('fluency_user')).toBeNull();
  });

  it('should NOT redirect and NOT throw session expired error on 401 when skipAuthRedirect is true (e.g. login failed)', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      status: 401,
      json: async () => ({ success: false, error: 'Invalid password' }),
    });
    global.fetch = mockFetch;

    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      skipAuthRedirect: true,
    });

    expect(res.status).toBe(401);
  });

  it('should dispatch custom showToast event', () => {
    const listener = vi.fn();
    window.addEventListener('showToast', listener);

    showToast('Practice saved successfully!', 'success');

    expect(listener).toHaveBeenCalledTimes(1);
    const event = listener.mock.calls[0][0] as CustomEvent;
    expect(event.detail.message).toBe('Practice saved successfully!');
    expect(event.detail.type).toBe('success');

    window.removeEventListener('showToast', listener);
  });
});
