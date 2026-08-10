import type { Context, Next } from 'hono';

// Minimal CSP for PWA: permits service worker + manifest loading.
// Full CSP (scripts, connect-src) is set via meta tag in index.html for the FE host.
export async function securityHeaders(c: Context, next: Next) {
  await next();
  c.res.headers.set(
    'Content-Security-Policy',
    "manifest-src 'self'; worker-src 'self'"
  );
}
