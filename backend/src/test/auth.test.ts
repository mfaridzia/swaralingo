import { describe, it, expect, beforeAll } from 'vitest';
import { hashPassword, verifyPassword } from '../routes/auth.js';
import { signToken, verifyToken, AUTH_COOKIE } from '../middleware/auth.js';
import { initDB } from '../database.js';
import { app } from '../index.js';

describe('Auth Security Unit & Integration Tests', () => {
  beforeAll(async () => {
    await initDB();
  });

  describe('Password Hashing (Web Crypto PBKDF2)', () => {
    it('should correctly hash and verify valid password', async () => {
      const password = 'mySecretPassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toContain(':');
      const [salt, key] = hash.split(':');
      expect(salt.length).toBe(32); // 16 bytes in hex
      expect(key.length).toBe(64);  // 32 bytes (256 bits) in hex

      const isValid = await verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'mySecretPassword123!';
      const hash = await hashPassword(password);

      const isValid = await verifyPassword('wrongPassword456!', hash);
      expect(isValid).toBe(false);
    });

    it('should produce unique salts for identical passwords', async () => {
      const password = 'samePassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(await verifyPassword(password, hash1)).toBe(true);
      expect(await verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe('JWT Session Tokens (Web Crypto HMAC-SHA256)', () => {
    it('should sign and verify valid user token', async () => {
      const userId = 42;
      const token = await signToken(userId);

      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const verifiedUserId = await verifyToken(token);
      expect(verifiedUserId).toBe(userId);
    });

    it('should return null for tampered or invalid token', async () => {
      const token = await signToken(99);
      const tampered = token.slice(0, -5) + 'abcde';

      const result = await verifyToken(tampered);
      expect(result).toBeNull();

      const malformed = await verifyToken('not.a.valid.jwt');
      expect(malformed).toBeNull();
    });
  });

  describe('Auth Endpoints Integration', () => {
    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'Password123!';
    const testName = 'Test User';
    let sessionCookie = '';

    it('should register a new user successfully (201 Created)', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: testName,
        }),
      });

      expect(res.status).toBe(201);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.email).toBe(testEmail);
      expect(json.data.name).toBe(testName);
      expect(json.data.password_hash).toBeUndefined(); // never leak password
    });

    it('should prevent registering duplicate email', async () => {
      const res = await app.request('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
          name: testName,
        }),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.error).toMatch(/already registered/i);
    });

    it('should fail login with wrong password', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: 'WrongPassword!',
        }),
      });

      expect(res.status).toBe(401);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('should login successfully with correct credentials and set auth cookie', async () => {
      const res = await app.request('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testEmail,
          password: testPassword,
        }),
      });

      expect(res.status).toBe(200);
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toBeTruthy();
      expect(setCookie).toContain(AUTH_COOKIE);
      expect(setCookie).toContain('HttpOnly');

      const match = setCookie?.match(new RegExp(`${AUTH_COOKIE}=([^;]+)`));
      sessionCookie = match ? match[1] : '';

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.email).toBe(testEmail);
      expect(json.token).toBeDefined();
    });

    it('should update profile with valid session cookie', async () => {
      const res = await app.request('/api/auth/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: `${AUTH_COOKIE}=${sessionCookie}`,
        },
        body: JSON.stringify({
          name: 'Updated Name',
          target_language: 'English (US)',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.name).toBe('Updated Name');
      expect(json.data.target_language).toBe('English (US)');
    });

    it('should reject update-profile without cookie or token (401)', async () => {
      const res = await app.request('/api/auth/update-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hacker',
        }),
      });

      expect(res.status).toBe(401);
    });

    it('should logout and clear auth cookie', async () => {
      const res = await app.request('/api/auth/logout', {
        method: 'POST',
        headers: {
          Cookie: `${AUTH_COOKIE}=${sessionCookie}`,
        },
      });

      expect(res.status).toBe(200);
      const setCookie = res.headers.get('set-cookie');
      expect(setCookie).toContain('Max-Age=0');
    });
  });
});
