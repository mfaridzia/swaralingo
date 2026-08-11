import { Hono } from 'hono';
import { z } from 'zod';
import db from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const chunksRouter = new Hono();

// Identitas dari session token — userId client diabaikan (menutup IDOR)
chunksRouter.use('*', requireAuth);

chunksRouter.get('/', async (c) => {
  try {
    const userId = c.get('authUserId');
    const limitQuery = c.req.query('limit');
    const limit = limitQuery ? Number(limitQuery) : null;

    let query = 'SELECT * FROM sentence_chunks WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC';
    const params: any[] = [userId];
    if (limit !== null) {
      query += ' LIMIT ?';
      params.push(limit);
    }

    const chunks = await db.query(query).all(...params);
    const formattedChunks = chunks.map((chunk: any) => {
      let createdAt = chunk.created_at;
      if (createdAt && typeof createdAt === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(createdAt)) {
        createdAt = createdAt.replace(' ', 'T') + '.000Z';
      }
      return { ...chunk, created_at: createdAt };
    });
    return c.json({ success: true, data: formattedChunks });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

const chunkSchema = z.object({
  phrase: z.string().min(1),
  meaning: z.string().min(1),
  example: z.string().min(1),
  category: z.string().optional(),
});

chunksRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const result = chunkSchema.safeParse(body);

    if (!result.success) {
      return c.json({ success: false, error: 'Invalid input data' }, 400);
    }

    const userId = c.get('authUserId');
    const { phrase, meaning, example, category = 'General' } = result.data;
    const nowMs = Date.now();
    const stmt = db.prepare(
      'INSERT INTO sentence_chunks (user_id, phrase, meaning, example, category, updated_at) VALUES (?, ?, ?, ?, ?, ?)'
    );
    const info = await stmt.run(userId, phrase, meaning, example, category, nowMs);

    return c.json({
      success: true,
      data: { id: info.lastInsertRowid, userId, phrase, meaning, example, category },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default chunksRouter;
