import { Hono } from 'hono';
import { z } from 'zod';
import db from '../database.js';

const logsRouter = new Hono();

logsRouter.get('/', async (c) => {
  try {
    const userId = c.req.query('userId');
    if (!userId) {
      return c.json({ success: false, error: 'Unauthorized: Missing userId parameter' }, 400);
    }
    const logs = await db.query('SELECT * FROM practice_logs WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    return c.json({ success: true, data: logs });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

const practiceLogSchema = z.object({
  userInput: z.string().min(1),
  aiFeedback: z.string().min(1),
  improvedVersion: z.string().min(1),
  userId: z.number(),
  audioBase64: z.string().optional().nullable()
});

logsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const result = practiceLogSchema.safeParse(body);

    if (!result.success) {
      return c.json({ success: false, error: 'Invalid input data' }, 400);
    }

    const { userInput, aiFeedback, improvedVersion, userId, audioBase64 = null } = result.data;
    const stmt = db.prepare(
      'INSERT INTO practice_logs (user_id, user_input, ai_feedback, improved_version, audio_base64) VALUES (?, ?, ?, ?, ?)'
    );
    const info = await stmt.run(userId, userInput, aiFeedback, improvedVersion, audioBase64);

    return c.json({
      success: true,
      data: { id: info.lastInsertRowid, userId, userInput, aiFeedback, improvedVersion, audioBase64 },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default logsRouter;
