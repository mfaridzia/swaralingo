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
    const logs = await db.query(
      `SELECT id, user_id, user_input, ai_feedback, improved_version, created_at, audio_key,
              CASE WHEN audio_key IS NULL THEN audio_base64 END AS audio_base64
       FROM practice_logs WHERE user_id = ? AND deleted_at IS NULL ORDER BY created_at DESC`
    ).all(userId);

    const formattedLogs = logs.map((log: any) => {
      let createdAt = log.created_at;
      if (createdAt && typeof createdAt === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(createdAt)) {
        createdAt = createdAt.replace(' ', 'T') + '.000Z';
      }
      return { ...log, created_at: createdAt };
    });

    return c.json({ success: true, data: formattedLogs });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

const practiceLogSchema = z.object({
  userInput: z.string().min(1),
  aiFeedback: z.string().min(1),
  improvedVersion: z.string().min(1),
  audioKey: z.string().nullable().optional(),
  audioBase64: z.string().nullable().optional(), // diterima dari client lama; tidak di-echo kembali
  clientUuid: z.string().uuid().optional(),       // offline-first sync idempotency
});

logsRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const result = practiceLogSchema.safeParse(body);

    if (!result.success) {
      return c.json({ success: false, error: 'Invalid input data' }, 400);
    }

    const userId = c.get('authUserId');
    const { userInput, aiFeedback, improvedVersion, audioKey = null, audioBase64 = null, clientUuid = null } = result.data;
    const nowMs = Date.now();
    if (clientUuid) {
      // Offline-first: idempotent insert — check if this client row already exists
      const existing = await db.query(
        'SELECT id FROM practice_logs WHERE client_uuid = ?'
      ).get(clientUuid) as { id: number } | undefined;
      if (existing) {
        return c.json({
          success: true,
          data: { id: existing.id, userId, userInput, aiFeedback, improvedVersion, audioKey },
        });
      }
    }
    const stmt = db.prepare(
      'INSERT INTO practice_logs (user_id, user_input, ai_feedback, improved_version, audio_key, audio_base64, client_uuid, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );
    const info = await stmt.run(userId, userInput, aiFeedback, improvedVersion, audioKey, audioBase64, clientUuid, nowMs);

    return c.json({
      success: true,
      data: { id: info.lastInsertRowid, userId, userInput, aiFeedback, improvedVersion, audioKey },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default logsRouter;
