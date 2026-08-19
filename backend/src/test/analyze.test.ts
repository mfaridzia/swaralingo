import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import { signToken, AUTH_COOKIE } from '../middleware/auth.js';
import { initDB, db } from '../database.js';
import { app } from '../index.js';

// Setup Mock for @google/generative-ai
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

describe('AI Analyze & Daily Challenge Mock Tests', () => {
  let userId: number;
  let authCookie: string;

  beforeAll(async () => {
    await initDB();
    process.env.GEMINI_API_KEY = 'mock-test-gemini-key';

    const res = await db.prepare(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
    ).run(`ai_test_${Date.now()}@test.com`, 'AI User', 'hash');
    userId = res.lastInsertRowid!;

    const token = await signToken(userId);
    authCookie = `${AUTH_COOKIE}=${token}`;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/analyze (Grammar Analysis & Cache)', () => {
    it('should reject unauthenticated requests with 401', async () => {
      const res = await app.request('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence: 'I goes home.' }),
      });

      expect(res.status).toBe(401);
    });

    it('should reject missing sentence with 400', async () => {
      const res = await app.request('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.success).toBe(false);
    });

    it('should analyze sentence via Gemini AI and save to analysis_cache', async () => {
      const inputSentence = `I goes to the store yesterday ${Date.now()}`;
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({
            improved: 'I went to the store yesterday.',
            feedback: 'Use past tense "went" instead of "goes".',
          }),
        },
      });

      const res = await app.request('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          sentence: inputSentence,
          targetLanguage: 'English',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.improved).toBe('I went to the store yesterday.');
      expect(json.data.feedback).toContain('went');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);

      // Verify cached in database
      const cached = await db.query('SELECT * FROM analysis_cache WHERE sentence = ?').get(inputSentence);
      expect(cached).toBeDefined();
      expect(cached.improved).toBe('I went to the store yesterday.');
    });

    it('should return from analysis_cache on second call without hitting Gemini', async () => {
      const inputSentence = `I is a developer ${Date.now()}`;
      // Pre-insert into cache
      await db.prepare(
        'INSERT INTO analysis_cache (sentence, improved, feedback) VALUES (?, ?, ?)'
      ).run(inputSentence, 'I am a developer.', 'Use "am" with first-person "I".');

      const res = await app.request('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          sentence: inputSentence,
          targetLanguage: 'English',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.improved).toBe('I am a developer.');
      // Gemini should NOT have been called due to cache hit
      expect(mockGenerateContent).not.toHaveBeenCalled();
    });

    it('should gracefully handle raw non-JSON response from AI', async () => {
      const inputSentence = `Perfect sentence ${Date.now()}`;
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Your sentence is grammatically correct and natural.',
        },
      });

      const res = await app.request('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({ sentence: inputSentence }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.feedback).toBe('Your sentence is grammatically correct');
    });
  });

  describe('POST /api/analyze/challenge (Personalized Daily Challenge)', () => {
    it('should generate personalized daily challenge from user mistakes', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => JSON.stringify({
            challenge: 'Describe what you did in yesterday’s sprint meeting using past tense verbs.',
          }),
        },
      });

      const res = await app.request('/api/analyze/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({
          mistakesContext: 'Tenses error: used "goes" instead of "went"',
          targetLanguage: 'English',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.challenge).toContain('sprint meeting');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should return error 502 when AI response cannot be parsed as JSON', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'Random unparseable text without JSON braces',
        },
      });

      const res = await app.request('/api/analyze/challenge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: authCookie,
        },
        body: JSON.stringify({ mistakesContext: '' }),
      });

      expect(res.status).toBe(502);
      const json = await res.json();
      expect(json.success).toBe(false);
    });
  });
});
