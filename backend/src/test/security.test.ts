import { describe, it, expect, beforeAll } from 'vitest';
import { signToken, AUTH_COOKIE } from '../middleware/auth.js';
import { initDB, db } from '../database.js';
import { app } from '../index.js';

describe('Security Middleware Tests (CSRF Protection & Rate Limiting)', () => {
  let userToken: string;

  beforeAll(async () => {
    await initDB();
    const res = await db.prepare(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
    ).run(`sec_user_${Date.now()}@test.com`, 'Sec User', 'hash');
    userToken = await signToken(res.lastInsertRowid!);
  });

  describe('CSRF Protection Middleware', () => {
    it('should allow GET requests from any origin', async () => {
      const res = await app.request('/api/notifications/vapid-public-key', {
        method: 'GET',
        headers: {
          Origin: 'http://malicious-site.com',
        },
      });
      expect(res.status).not.toBe(403);
    });

    it('should reject state-changing POST from untrusted origin with 403 Forbidden', async () => {
      const res = await app.request('/api/logs', {
        method: 'POST',
        headers: {
          Origin: 'http://evil-hacker-domain.com',
          'Content-Type': 'application/json',
          Cookie: `${AUTH_COOKIE}=${userToken}`,
        },
        body: JSON.stringify({
          userInput: 'hack',
          aiFeedback: 'hack',
          improvedVersion: 'hack',
        }),
      });

      expect(res.status).toBe(403);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Forbidden');
    });

    it('should allow POST from trusted origin (e.g. http://localhost:5173)', async () => {
      const res = await app.request('/api/logs', {
        method: 'POST',
        headers: {
          Origin: 'http://localhost:5173',
          'Content-Type': 'application/json',
          Cookie: `${AUTH_COOKIE}=${userToken}`,
        },
        body: JSON.stringify({
          userInput: 'Legitimate request',
          aiFeedback: 'Good grammar',
          improvedVersion: 'Legitimate request.',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('Auth Rate Limiter Middleware', () => {
    it('should trigger 429 Too Many Requests when exceeding max auth attempts', async () => {
      const spoofedIp = `192.168.100.${Math.floor(Math.random() * 200) + 10}`;
      let triggered429 = false;

      for (let i = 0; i < 20; i++) {
        const res = await app.request('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-forwarded-for': spoofedIp,
          },
          body: JSON.stringify({ email: 'nonexistent@test.com', password: 'wrong' }),
        });
        if (res.status === 429) {
          triggered429 = true;
          break;
        }
      }

      expect(triggered429).toBe(true);
    });
  });
});
