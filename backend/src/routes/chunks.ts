import { Hono } from 'hono';
import { z } from 'zod';
import db from '../database.js';

const chunksRouter = new Hono();

chunksRouter.get('/', async (c) => {
  try {
    const userId = c.req.query('userId');
    if (!userId) {
      return c.json({ success: false, error: 'Unauthorized: Missing userId parameter' }, 400);
    }
    const chunks = await db.query('SELECT * FROM sentence_chunks WHERE user_id = ? ORDER BY created_at DESC').all(userId);
    return c.json({ success: true, data: chunks });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

const chunkSchema = z.object({
  phrase: z.string().min(1),
  meaning: z.string().min(1),
  example: z.string().min(1),
  category: z.string().optional(),
  userId: z.number()
});

chunksRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const result = chunkSchema.safeParse(body);

    if (!result.success) {
      return c.json({ success: false, error: 'Invalid input data' }, 400);
    }

    const { phrase, meaning, example, category = 'General', userId } = result.data;
    const stmt = db.prepare(
      'INSERT INTO sentence_chunks (user_id, phrase, meaning, example, category) VALUES (?, ?, ?, ?, ?)'
    );
    const info = await stmt.run(userId, phrase, meaning, example, category);

    return c.json({
      success: true,
      data: { id: info.lastInsertRowid, userId, phrase, meaning, example, category },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default chunksRouter;
