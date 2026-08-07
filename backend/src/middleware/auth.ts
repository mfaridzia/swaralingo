import type { Context, Next } from 'hono';
import { getEnvVar, isBunRuntime } from '../config.js';

// JWT session (HMAC-SHA256 via Web Crypto — kompatibel Bun & workerd, zero-dep, pola ADR-044).
// Identitas user berasal dari token, bukan dari body/query client (menutup IDOR).

const TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60; // 7 hari

function getJwtSecret(): string {
  const secret = getEnvVar('JWT_SECRET');
  if (secret) return secret;
  if (isBunRuntime) return 'dev-local-secret'; // fallback khusus local dev
  throw new Error('JWT_SECRET is not configured');
}

function base64UrlEncode(bytes: Uint8Array): string {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(str: string): Uint8Array<ArrayBuffer> {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacSha256(message: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message)));
}

export async function signToken(userId: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const payload = base64UrlEncode(new TextEncoder().encode(JSON.stringify({ sub: userId, iat: now, exp: now + TOKEN_TTL_SECONDS })));
  const signature = base64UrlEncode(await hmacSha256(`${header}.${payload}`, getJwtSecret()));
  return `${header}.${payload}.${signature}`;
}

export async function verifyToken(token: string): Promise<number | null> {
  try {
    const [header, payload, signature] = token.split('.');
    if (!header || !payload || !signature) return null;

    // crypto.subtle.verify — perbandingan constant-time
    const secret = getJwtSecret();
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      base64UrlDecode(signature),
      new TextEncoder().encode(`${header}.${payload}`)
    );
    if (!valid) return null;

    const data = JSON.parse(new TextDecoder().decode(base64UrlDecode(payload)));
    if (typeof data.exp !== 'number' || data.exp * 1000 < Date.now()) return null;
    return typeof data.sub === 'number' ? data.sub : null;
  } catch {
    return null;
  }
}

// Middleware: ambil identitas dari Bearer token — semua route data user wajib lewat sini.
export const requireAuth = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const userId = await verifyToken(token);
  if (userId === null) {
    return c.json({ success: false, error: 'Unauthorized: invalid or expired session token' }, 401);
  }
  c.set('authUserId', userId);
  await next();
};

declare module 'hono' {
  interface ContextVariableMap {
    authUserId: number;
  }
}
