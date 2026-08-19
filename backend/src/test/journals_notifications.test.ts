import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { signToken, AUTH_COOKIE } from '../middleware/auth.js';
import { initDB, db } from '../database.js';
import { app } from '../index.js';

const mockGenerateContent = vi.fn();

vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn().mockImplementation(() => ({
      getGenerativeModel: vi.fn().mockReturnValue({
        generateContent: mockGenerateContent,
      }),
    })),
  };
});

describe('Journals & Web Push Notifications Tests', () => {
  let userId: number;
  let authCookie: string;

  beforeAll(async () => {
    await initDB();
    process.env.GEMINI_API_KEY = 'mock-test-key';

    const res = await db.prepare(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
    ).run(`journal_user_${Date.now()}@test.com`, 'Journal Tester', 'hash');
    userId = res.lastInsertRowid!;

    authCookie = `${AUTH_COOKIE}=${await signToken(userId)}`;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Journals API (/api/journals)', () => {
    it('should generate a dynamic reflective prompt via Gemini', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'What was a technical challenge you resolved today?',
        },
      });

      const res = await app.request('/api/journals/prompt?targetLanguage=English', {
        method: 'GET',
        headers: { Cookie: authCookie },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.prompt).toContain('technical challenge');
    });

    it('should submit a journal entry and detect mood & AI reflection', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({
            mood: 'Proud',
            reflection: 'Great job completing your sprint goal today! Your dedication shines through.',
          }),
        },
      });

      const res = await app.request('/api/journals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          prompt: 'What was your victory today?',
          content: 'I successfully deployed the Kubernetes cluster and fixed all unit tests!',
          targetLanguage: 'English',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.mood).toBe('Proud');
      expect(json.data.ai_reflection).toContain('sprint goal');
    });

    it('should reject short journal content (< 5 chars)', async () => {
      const res = await app.request('/api/journals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          content: 'Hey',
        }),
      });

      expect(res.status).toBe(400);
    });
  });

  describe('Web Push Notifications (/api/notifications)', () => {
    const testEndpoint = `https://fcm.googleapis.com/fcm/send/test-sub-${Date.now()}`;

    it('should return VAPID public key', async () => {
      const res = await app.request('/api/notifications/vapid-public-key', {
        method: 'GET',
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.publicKey).toBeDefined();
    });

    it('should subscribe user to daily push notifications', async () => {
      const res = await app.request('/api/notifications/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          subscription: {
            endpoint: testEndpoint,
            keys: {
              p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM=',
              auth: 'tBHItJI5svbpez7KI4CCXg==',
            },
          },
          alarmTime: '12:00',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toBe('Subscribed successfully');

      // Verify in DB
      const sub = await db.query('SELECT * FROM push_subscriptions WHERE endpoint = ?').get(testEndpoint);
      expect(sub).toBeDefined();
      expect(sub.alarm_time).toBe('12:00');
    });

    it('should unsubscribe user from push notifications', async () => {
      const res = await app.request('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          endpoint: testEndpoint,
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.message).toBe('Unsubscribed successfully');

      // Verify removed from DB (null or undefined)
      const sub = await db.query('SELECT * FROM push_subscriptions WHERE endpoint = ?').get(testEndpoint);
      expect(!sub).toBe(true);
    });
  });
});
