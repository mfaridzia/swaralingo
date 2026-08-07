import { Hono } from 'hono';
import { z } from 'zod';
import db from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const logsRouter = new Hono();

// Identitas dari session token — userId client diabaikan (menutup IDOR)
logsRouter.use('*', requireAuth);

logsRouter.get('/', async (c) => {
  try {
    const userId = c.get('authUserId');
    // audio_base64 hanya dikembalikan untuk log legacy (audio_key masih null) — data baru via R2
    const logs = await db.query(
      `SELECT id, user_id, user_input, ai_feedback, improved_version, created_at, audio_key,
              CASE WHEN audio_key IS NULL THEN audio_base64 END AS audio_base64
       FROM practice_logs WHERE user_id = ? ORDER BY created_at DESC`
    ).all(userId);
    return c.json({ success: true, data: logs });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

const practiceLogSchema = z.object({
  userInput: z.string().min(1),
  aiFeedback: z.string().min(1),
  improvedVersion: z.string().min(1),
  audioKey: z.string().nullable().optional(),
  audioBase64: z.string().nullable().optional() // diterima dari client lama; tidak di-echo kembali
});

logsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const result = practiceLogSchema.safeParse(body);

    if (!result.success) {
      return c.json({ success: false, error: 'Invalid input data' }, 400);
    }

    const userId = c.get('authUserId');
    const { userInput, aiFeedback, improvedVersion, audioKey = null, audioBase64 = null } = result.data;
    const stmt = db.prepare(
      'INSERT INTO practice_logs (user_id, user_input, ai_feedback, improved_version, audio_key, audio_base64) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const info = await stmt.run(userId, userInput, aiFeedback, improvedVersion, audioKey, audioBase64);

    return c.json({
      success: true,
      data: { id: info.lastInsertRowid, userId, userInput, aiFeedback, improvedVersion, audioKey },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default logsRouter;
