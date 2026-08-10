import { Hono } from 'hono';
import { z } from 'zod';
import db from '../database.js';
import { requireAuth } from '../middleware/auth.js';

const syncRouter = new Hono();

syncRouter.use('*', requireAuth);

// --- Zod schema ---
const mutationSchema = z.object({
  table: z.enum(['logs', 'chunks', 'journals']),
  operation: z.enum(['insert', 'update', 'delete']),
  clientId: z.string().uuid(),
  data: z.record(z.string(), z.unknown()),
  clientUpdatedAt: z.number().int().positive(), // epoch ms
});

const syncRequestSchema = z.object({
  mutations: z.array(mutationSchema).max(100),
  idempotencyKey: z.string().uuid().optional(),
});

// --- Per-table column whitelist (never accept user_id) ---
const TABLE_CONFIG: Record<string, { table: string; columns: string[] }> = {
  logs: {
    table: 'practice_logs',
    columns: ['user_input', 'ai_feedback', 'improved_version', 'audio_key', 'audio_base64', 'mistake_category', 'created_at', 'client_uuid', 'updated_at'],
  },
  chunks: {
    table: 'sentence_chunks',
    columns: ['phrase', 'meaning', 'example', 'category', 'next_review_at', 'interval', 'repetition', 'easiness', 'created_at', 'client_uuid', 'updated_at'],
  },
  journals: {
    table: 'journals',
    columns: ['prompt', 'content', 'mood', 'ai_reflection', 'created_at', 'client_uuid', 'updated_at'],
  },
};

// CamelCase → snake_case fallback map (frontend may send either format)
const KEY_ALIASES: Record<string, string[]> = {
  user_input: ['userInput'],
  ai_feedback: ['aiFeedback'],
  improved_version: ['improvedVersion'],
  audio_key: ['audioKey'],
  audio_base64: ['audioBase64'],
  mistake_category: ['mistakeCategory'],
  next_review_at: ['nextReviewAt'],
  created_at: ['createdAt'],
  updated_at: ['updatedAt'],
  client_uuid: ['clientUuid', 'client_uuid'],
};

function whitelistData(data: Record<string, unknown>, allowed: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in data) {
      out[key] = data[key];
    } else {
      // Try camelCase aliases
      const aliases = KEY_ALIASES[key];
      if (aliases) {
        for (const alias of aliases) {
          if (alias in data && alias !== key) {
            out[key] = data[alias];
            break;
          }
        }
      }
    }
  }
  return out;
}

function pickColumns(columns: string[]): string {
  return columns.join(', ');
}

function pickPlaceholders(columns: string[]): string {
  return columns.map(() => '?').join(', ');
}

function pickSetClause(columns: string[]): string {
  return columns.map(c => `${c} = ?`).join(', ');
}

function pickValues<T>(data: Record<string, unknown>, columns: string[], extras: T[]): (unknown)[] {
  const vals: unknown[] = columns.map(c => data[c] ?? null);
  return [...vals, ...extras];
}

// --- POST /api/sync ---
syncRouter.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = syncRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ success: false, error: 'Invalid sync request format' }, 400);
    }

    // Accept idempotency key from header or body
    const headerKey = c.req.header('X-Sync-Idempotency-Key');
    const idempotencyKey = headerKey || parsed.data.idempotencyKey;
    // Idempotency key is validated for format but not enforced (per-row idempotency via client_uuid is the real guard)

    const userId = c.get('authUserId');
    const now = Date.now();
    const synced: { table: string; clientId: string; serverId: number }[] = [];
    const conflicts: { table: string; clientId: string; serverRow?: unknown }[] = [];
    const errors: { clientId: string; message: string }[] = [];

    for (const mut of parsed.data.mutations) {
      try {
        const cfg = TABLE_CONFIG[mut.table];
        if (!cfg) {
          errors.push({ clientId: mut.clientId, message: `Unknown table: ${mut.table}` });
          continue;
        }

        const allowed = cfg.columns;
        const clean = whitelistData(mut.data, allowed);
        // Inject clientId + timestamp into data (not trusted from client data object)
        clean['client_uuid'] = mut.clientId;
        clean['updated_at'] = mut.clientUpdatedAt;

        if (mut.operation === 'insert') {
          // Idempotent: check if client_uuid already exists
          const existing = await db.query(
            `SELECT id FROM ${cfg.table} WHERE client_uuid = ?`
          ).get(mut.clientId) as { id: number } | undefined;

          if (existing) {
            synced.push({ table: mut.table, clientId: mut.clientId, serverId: existing.id });
            continue;
          }

          // New insert — client_uuid + updated_at + user_id
          const insertCols = [...allowed, 'user_id'];
          const placeholders = pickPlaceholders(insertCols);
          const stmt = db.prepare(
            `INSERT INTO ${cfg.table} (${pickColumns(insertCols)}) VALUES (${placeholders})`
          );
          const vals = pickValues(clean, allowed, [userId]);
          const info = await stmt.run(...vals);
          synced.push({ table: mut.table, clientId: mut.clientId, serverId: Number(info.lastInsertRowid) });

        } else if (mut.operation === 'update') {
          // LWW: only update if server updated_at < client updated_at
          // Only SET columns actually present in client data (skip injected fields)
          const dataKeys = Object.keys(mut.data).filter(k => allowed.includes(k) && k !== 'client_uuid' && k !== 'created_at' && k !== 'updated_at');
          if (dataKeys.length === 0) {
            errors.push({ clientId: mut.clientId, message: 'No valid columns to update' });
            continue;
          }
          const setClause = pickSetClause([...dataKeys, 'updated_at']);
          const stmt = db.prepare(
            `UPDATE ${cfg.table} SET ${setClause} WHERE client_uuid = ? AND user_id = ? AND deleted_at IS NULL AND (updated_at IS NULL OR updated_at < ?)`
          );
          const setVals: unknown[] = dataKeys.map(k => clean[k] ?? null);
          const info = await stmt.run(...setVals, mut.clientUpdatedAt, mut.clientId, userId, mut.clientUpdatedAt);

          if (info.changes === 0) {
            // Check if row exists (for better error)
            const row = await db.query(
              `SELECT id FROM ${cfg.table} WHERE client_uuid = ? AND user_id = ?`
            ).get(mut.clientId, userId) as { id: number } | undefined;

            if (row) {
              conflicts.push({ table: mut.table, clientId: mut.clientId, serverRow: row });
            } else {
              errors.push({ clientId: mut.clientId, message: 'Row not found for update (may have been deleted on server)' });
            }
          } else {
            synced.push({ table: mut.table, clientId: mut.clientId, serverId: 0 }); // serverId = 0 for updates (no new id)
          }

        } else if (mut.operation === 'delete') {
          // Soft delete with LWW guard
          const stmt = db.prepare(
            `UPDATE ${cfg.table} SET deleted_at = ? WHERE client_uuid = ? AND user_id = ? AND deleted_at IS NULL AND (updated_at IS NULL OR updated_at < ?)`
          );
          const info = await stmt.run(now, mut.clientId, userId, mut.clientUpdatedAt);

          if (info.changes === 0) {
            const row = await db.query(
              `SELECT id FROM ${cfg.table} WHERE client_uuid = ? AND user_id = ?`
            ).get(mut.clientId, userId) as { id: number } | undefined;

            if (row) {
              conflicts.push({ table: mut.table, clientId: mut.clientId, serverRow: row });
            } else {
              errors.push({ clientId: mut.clientId, message: 'Row not found for delete' });
            }
          } else {
            synced.push({ table: mut.table, clientId: mut.clientId, serverId: 0 });
          }
        }
      } catch (err: any) {
        // Catch unique-violation on client_uuid (race condition — another request inserted between check and insert)
        if (err.message?.includes('UNIQUE') && mut.operation === 'insert') {
          try {
            const existing = await db.query(
              `SELECT id FROM ${TABLE_CONFIG[mut.table].table} WHERE client_uuid = ?`
            ).get(mut.clientId) as { id: number } | undefined;
            if (existing) {
              synced.push({ table: mut.table, clientId: mut.clientId, serverId: existing.id });
              continue;
            }
          } catch {}
        }
        errors.push({ clientId: mut.clientId, message: err.message || 'Unknown error' });
      }
    }

    return c.json({
      success: true,
      data: { synced, conflicts, errors, idempotencyKey: idempotencyKey ?? null },
    });
  } catch (error: any) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default syncRouter;
