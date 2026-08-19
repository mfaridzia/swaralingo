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

describe('Audio Storage & Transcription Integration Tests', () => {
  let userAId: number;
  let userBId: number;
  let cookieA: string;
  let cookieB: string;

  beforeAll(async () => {
    await initDB();
    process.env.GEMINI_API_KEY = 'mock-test-gemini-key';

    const resA = await db.prepare(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
    ).run(`audio_user_a_${Date.now()}@test.com`, 'Audio User A', 'hash');
    userAId = resA.lastInsertRowid!;

    const resB = await db.prepare(
      'INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)'
    ).run(`audio_user_b_${Date.now()}@test.com`, 'Audio User B', 'hash');
    userBId = resB.lastInsertRowid!;

    cookieA = `${AUTH_COOKIE}=${await signToken(userAId)}`;
    cookieB = `${AUTH_COOKIE}=${await signToken(userBId)}`;
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Audio Storage CRUD (/api/audio)', () => {
    let uploadedKey = '';

    it('should upload an audio blob and return an audioKey', async () => {
      const dummyAudioBytes = new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]); // dummy webm header

      const res = await app.request('/api/audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'audio/webm',
          Cookie: cookieA,
        },
        body: dummyAudioBytes,
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.audioKey).toBeDefined();
      expect(json.data.audioKey).toContain(`audio/${userAId}/`);
      uploadedKey = json.data.audioKey;
    });

    it('should fetch the uploaded audio blob', async () => {
      const res = await app.request(`/api/audio/${uploadedKey}`, {
        method: 'GET',
        headers: { Cookie: cookieA },
      });

      expect(res.status).toBe(200);
      const contentType = res.headers.get('Content-Type');
      expect(contentType).toContain('audio');
    });

    it('should reject deleting audio belonging to User A when requested by User B (IDOR protected)', async () => {
      const res = await app.request(`/api/audio/${uploadedKey}`, {
        method: 'DELETE',
        headers: { Cookie: cookieB },
      });

      expect(res.status).toBe(403);
    });

    it('should allow User A to delete their own audio', async () => {
      const res = await app.request(`/api/audio/${uploadedKey}`, {
        method: 'DELETE',
        headers: { Cookie: cookieA },
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe('Audio Transcription (/api/transcribe)', () => {
    it('should transcribe audio base64 via Gemini fallback when AI binding is absent', async () => {
      mockGenerateContent.mockResolvedValueOnce({
        response: {
          text: () => 'I am testing the voice transcription engine.',
        },
      });

      const res = await app.request('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieA,
        },
        body: JSON.stringify({
          audioBase64: 'GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwH/////////FUmpZ+kBAAAAAA==',
          targetLanguage: 'English',
        }),
      });

      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.transcription).toBe('I am testing the voice transcription engine.');
      expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    });

    it('should reject invalid input data with 400', async () => {
      const res = await app.request('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: cookieA,
        },
        body: JSON.stringify({}),
      });

      expect(res.status).toBe(400);
    });
  });
});
