import { describe, it, expect, beforeAll } from 'vitest';
import { signToken, AUTH_COOKIE } from '../middleware/auth.js';
import { initDB, db } from '../database.js';
import { app } from '../index.js';

describe('CRUD & User Isolation Integration Tests', () => {
  let userAId: number;
  let userBId: number;
  let cookieA: string;
  let cookieB: string;

  beforeAll(async () => {
    await initDB();

    // Create 2 distinct test users directly in DB
    const resA = await db.prepare(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
    ).run(`user_a_${Date.now()}@test.com`, 'User A', 'dummy_hash_a');
    userAId = resA.lastInsertRowid!;

    const resB = await db.prepare(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
    ).run(`user_b_${Date.now()}@test.com`, 'User B', 'dummy_hash_b');
    userBId = resB.lastInsertRowid!;

    const tokenA = await signToken(userAId);
    const tokenB = await signToken(userBId);
    cookieA = `${AUTH_COOKIE}=${tokenA}`;
    cookieB = `${AUTH_COOKIE}=${tokenB}`;
  });

  describe('Practice Logs CRUD & IDOR Prevention', () => {
    let logAId: number;

    it('should allow User A to create a practice log', async () => {
      const res = await app.request('/api/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieA,
        },
        body: JSON.stringify({
          userInput: 'I goes to office yesterday.',
          aiFeedback: 'Use past tense "went" instead of "goes".',
          improvedVersion: 'I went to the office yesterday.',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.userInput).toBe('I goes to office yesterday.');
      logAId = json.data.id;
    });

    it('should return User A logs when queried by User A', async () => {
      const res = await app.request('/api/logs', {
        method: 'GET',
        headers: { Cookie: cookieA },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBeGreaterThanOrEqual(1);
      const found = json.data.some((l: any) => l.id === logAId);
      expect(found).toBe(true);
    });

    it('should NOT return User A logs when queried by User B (IDOR isolated)', async () => {
      const res = await app.request('/api/logs', {
        method: 'GET',
        headers: { Cookie: cookieB },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      const found = json.data.some((l: any) => l.id === logAId);
      expect(found).toBe(false);
    });

    it('should respect pagination limit parameter', async () => {
      // Add more logs for User A
      await app.request('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Cookie: cookieA },
        body: JSON.stringify({
          userInput: 'Second log',
          aiFeedback: 'Feedback 2',
          improvedVersion: 'Second log.',
        }),
      });

      const res = await app.request('/api/logs?limit=1', {
        method: 'GET',
        headers: { Cookie: cookieA },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.length).toBe(1);
    });
  });

  describe('Sentence Chunks CRUD & Isolation', () => {
    let chunkAId: number;

    it('should allow User A to create a sentence chunk', async () => {
      const res = await app.request('/api/chunks', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieA,
        },
        body: JSON.stringify({
          phrase: 'Hit the ground running',
          meaning: 'Mulai bekerja dengan cepat dan antusias',
          example: 'We need someone who can hit the ground running.',
          category: 'Workplace',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.phrase).toBe('Hit the ground running');
      chunkAId = json.data.id;
    });

    it('should return User A chunks when queried by User A', async () => {
      const res = await app.request('/api/chunks', {
        method: 'GET',
        headers: { Cookie: cookieA },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      const found = json.data.some((c: any) => c.id === chunkAId);
      expect(found).toBe(true);
    });

    it('should NOT return User A chunks to User B', async () => {
      const res = await app.request('/api/chunks', {
        method: 'GET',
        headers: { Cookie: cookieB },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      const found = json.data.some((c: any) => c.id === chunkAId);
      expect(found).toBe(false);
    });
  });

  describe('Journals CRUD & Isolation', () => {
    let journalAId: number;

    it('should allow User A to create a journal entry directly in DB or endpoint', async () => {
      const insert = await db.prepare(
        'INSERT INTO journals (user_id, prompt, content, mood, ai_reflection) VALUES (?, ?, ?, ?, ?)'
      ).run(userAId, 'Daily prompt', 'Today was productive.', 'Happy', 'Great reflection.');
      journalAId = insert.lastInsertRowid!;

      const res = await app.request('/api/journals', {
        method: 'GET',
        headers: { Cookie: cookieA },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      const found = json.data.some((j: any) => j.id === journalAId);
      expect(found).toBe(true);
    });

    it('should NOT show User A journals to User B', async () => {
      const res = await app.request('/api/journals', {
        method: 'GET',
        headers: { Cookie: cookieB },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      const found = json.data.some((j: any) => j.id === journalAId);
      expect(found).toBe(false);
    });
  });

  describe('Stats Endpoint Aggregations', () => {
    it('should calculate fluency stats for User A', async () => {
      const res = await app.request('/api/stats?range=7d', {
        method: 'GET',
        headers: { Cookie: cookieA },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data).toHaveProperty('averageFluencyScore');
      expect(json.data).toHaveProperty('weeklyGrowth');
      expect(json.data).toHaveProperty('chartData');
      expect(Array.isArray(json.data.chartData)).toBe(true);
      expect(json.data.chartData.length).toBe(7);
    });
  });
});
