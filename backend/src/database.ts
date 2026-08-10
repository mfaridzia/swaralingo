import { createClient } from "@libsql/client";
import { getEnvVar, isBunRuntime } from "./config.js";

// Runtime Bun (local dev) → bun:sqlite; workerd (wrangler dev / deploy) → Turso.
// NODE_ENV dari [vars] tidak diandalkan karena tidak reliable di wrangler dev.
const useLocalDb = isBunRuntime;

let localDb: any = null;
let tursoClient: any = null;

const getTursoClient = () => {
  if (!useLocalDb) {
    if (!tursoClient) {
      const url = getEnvVar("TURSO_DATABASE_URL");
      const authToken = getEnvVar("TURSO_AUTH_TOKEN");
      if (!url) {
        // Return dummy client to prevent crash during Cloudflare's compile-time validation
        return {
          execute: async () => {
            throw new Error("Database configuration TURSO_DATABASE_URL is missing.");
          }
        };
      }
      tursoClient = createClient({
        url,
        authToken: authToken || '',
      });
    }
    return tursoClient;
  }
  return null;
};

if (useLocalDb) {
  try {
    const bunSqliteLib = "bun:sqlite";
    const { Database } = await import(bunSqliteLib);
    localDb = new Database(process.env.DATABASE_PATH || "sqlite.db", { create: true });
  } catch (e) {
    // Runtime Bun tanpa bun:sqlite — luar biasa, biarkan useLocalDb tetap true tapi localDb null
    // dan method db melempar error jelas daripada crash saat import.
    console.warn("bun:sqlite unavailable, database calls will fail:", e);
  }
}

export const db = {
  run: async (sql: string, ...params: any[]): Promise<any> => {
    if (!useLocalDb) {
      return await getTursoClient().execute({ sql, args: params });
    } else {
      return localDb!.run(sql, ...params);
    }
  },

  query: (sql: string) => {
    return {
      all: async (...params: any[]): Promise<any[]> => {
        if (!useLocalDb) {
          const res = await getTursoClient().execute({ sql, args: params });
          return res.rows as any[];
        } else {
          return localDb!.query(sql).all(...params) as any[];
        }
      },
      get: async (...params: any[]): Promise<any | undefined> => {
        if (!useLocalDb) {
          const res = await getTursoClient().execute({ sql, args: params });
          return res.rows[0] as any;
        } else {
          return localDb!.query(sql).get(...params) as any;
        }
      }
    };
  },

  prepare: (sql: string) => {
    return {
      run: async (...params: any[]): Promise<{ lastInsertRowid: number | null, changes: number }> => {
        if (!useLocalDb) {
          const res = await getTursoClient().execute({ sql, args: params });
          const rowId = typeof res.lastInsertRowid === 'bigint' 
            ? Number(res.lastInsertRowid) 
            : (res.lastInsertRowid as number | null);
          return {
            lastInsertRowid: rowId,
            changes: Number(res.rowsAffected)
          };
        } else {
          const info = localDb!.prepare(sql).run(...params);
          const rowId = typeof info.lastInsertRowid === 'bigint'
            ? Number(info.lastInsertRowid)
            : (info.lastInsertRowid as number | null);
          return {
            lastInsertRowid: rowId,
            changes: info.changes
          };
        }
      },
      get: async (...params: any[]): Promise<any | undefined> => {
        if (!useLocalDb) {
          const res = await getTursoClient().execute({ sql, args: params });
          return res.rows[0] as any;
        } else {
          return localDb!.prepare(sql).get(...params) as any;
        }
      },
      all: async (...params: any[]): Promise<any[]> => {
        if (!useLocalDb) {
          const res = await getTursoClient().execute({ sql, args: params });
          return res.rows as any[];
        } else {
          return localDb!.prepare(sql).all(...params) as any[];
        }
      }
    };
  }
};

// Helper: run migration SQL, only ignore "already exists" errors, re-throw real errors
async function migrate(sql: string, label?: string): Promise<void> {
  try {
    await db.run(sql);
    if (label) console.log(`[migrate] OK: ${label}`);
  } catch (e: any) {
    const msg = e?.message ?? String(e);
    // SQLite/Turso "duplicate column" / "already exists" — safe to ignore
    if (/duplicate column|already exists|SQLITE_ERROR.*no such/.test(msg)) {
      if (label) console.log(`[migrate] SKIP (already applied): ${label}`);
      return;
    }
    console.error(`[migrate] FAIL: ${label || sql.slice(0, 80)} — ${msg}`);
    throw e;
  }
}

export async function initDB() {
  // 1. Buat tabel users
  await db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      target_language TEXT DEFAULT 'English',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. Buat tabel practice_logs (dengan referensi user_id)
  await db.run(`
    CREATE TABLE IF NOT EXISTS practice_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      user_input TEXT NOT NULL,
      ai_feedback TEXT NOT NULL,
      improved_version TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // Migrations — idempotent dengan helper migrate()
  await migrate(`ALTER TABLE users ADD COLUMN target_language TEXT DEFAULT 'English'`, 'users.target_language');
  await migrate(`ALTER TABLE practice_logs ADD COLUMN user_id INTEGER`, 'logs.user_id');
  await migrate(`ALTER TABLE practice_logs ADD COLUMN audio_base64 TEXT`, 'logs.audio_base64');
  await migrate(`ALTER TABLE practice_logs ADD COLUMN audio_key TEXT`, 'logs.audio_key');
  await migrate(`ALTER TABLE practice_logs ADD COLUMN mistake_category TEXT DEFAULT 'None'`, 'logs.mistake_category');

  // Offline-first sync: practice_logs
  await migrate(`ALTER TABLE practice_logs ADD COLUMN updated_at INTEGER`, 'logs.updated_at');
  await migrate(`ALTER TABLE practice_logs ADD COLUMN client_uuid TEXT`, 'logs.client_uuid');
  await migrate(`CREATE UNIQUE INDEX IF NOT EXISTS idx_logs_client_uuid ON practice_logs(client_uuid)`, 'logs.idx_client_uuid (unique)');
  await migrate(`ALTER TABLE practice_logs ADD COLUMN deleted_at INTEGER`, 'logs.deleted_at');
  await migrate(`UPDATE practice_logs SET updated_at = (strftime('%s', created_at) * 1000) WHERE updated_at IS NULL`, 'logs.backfill updated_at');
  await migrate(`CREATE INDEX IF NOT EXISTS idx_logs_client_uuid ON practice_logs(client_uuid)`, 'logs.idx_client_uuid');

  // 3. Buat tabel sentence_chunks
  await db.run(`
    CREATE TABLE IF NOT EXISTS sentence_chunks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      phrase TEXT NOT NULL,
      meaning TEXT NOT NULL,
      example TEXT NOT NULL,
      category TEXT DEFAULT 'General',
      next_review_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      interval INTEGER DEFAULT 0,
      repetition INTEGER DEFAULT 0,
      easiness REAL DEFAULT 2.5,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  await migrate(`ALTER TABLE sentence_chunks ADD COLUMN user_id INTEGER`, 'chunks.user_id');
  await migrate(`ALTER TABLE sentence_chunks ADD COLUMN next_review_at DATETIME DEFAULT CURRENT_TIMESTAMP`, 'chunks.next_review_at');
  await migrate(`ALTER TABLE sentence_chunks ADD COLUMN interval INTEGER DEFAULT 0`, 'chunks.interval');
  await migrate(`ALTER TABLE sentence_chunks ADD COLUMN repetition INTEGER DEFAULT 0`, 'chunks.repetition');
  await migrate(`ALTER TABLE sentence_chunks ADD COLUMN easiness REAL DEFAULT 2.5`, 'chunks.easiness');

  // Offline-first sync: sentence_chunks
  await migrate(`ALTER TABLE sentence_chunks ADD COLUMN updated_at INTEGER`, 'chunks.updated_at');
  await migrate(`ALTER TABLE sentence_chunks ADD COLUMN client_uuid TEXT`, 'chunks.client_uuid');
  await migrate(`CREATE UNIQUE INDEX IF NOT EXISTS idx_chunks_client_uuid ON sentence_chunks(client_uuid)`, 'chunks.idx_client_uuid (unique)');
  await migrate(`ALTER TABLE sentence_chunks ADD COLUMN deleted_at INTEGER`, 'chunks.deleted_at');
  await migrate(`UPDATE sentence_chunks SET updated_at = (strftime('%s', created_at) * 1000) WHERE updated_at IS NULL`, 'chunks.backfill updated_at');
  await migrate(`CREATE INDEX IF NOT EXISTS idx_chunks_client_uuid ON sentence_chunks(client_uuid)`, 'chunks.idx_client_uuid');

  // 4. Buat tabel analysis_cache
  await db.run(`
    CREATE TABLE IF NOT EXISTS analysis_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sentence TEXT UNIQUE,
      improved TEXT,
      feedback TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Buat tabel journals
  await db.run(`
    CREATE TABLE IF NOT EXISTS journals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER REFERENCES users(id),
      prompt TEXT,
      content TEXT,
      mood TEXT,
      ai_reflection TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Offline-first sync: journals
  await migrate(`ALTER TABLE journals ADD COLUMN updated_at INTEGER`, 'journals.updated_at');
  await migrate(`ALTER TABLE journals ADD COLUMN client_uuid TEXT`, 'journals.client_uuid');
  await migrate(`CREATE UNIQUE INDEX IF NOT EXISTS idx_journals_client_uuid ON journals(client_uuid)`, 'journals.idx_client_uuid (unique)');
  await migrate(`ALTER TABLE journals ADD COLUMN deleted_at INTEGER`, 'journals.deleted_at');
  await migrate(`UPDATE journals SET updated_at = (strftime('%s', created_at) * 1000) WHERE updated_at IS NULL`, 'journals.backfill updated_at');
  await migrate(`CREATE INDEX IF NOT EXISTS idx_journals_client_uuid ON journals(client_uuid)`, 'journals.idx_client_uuid');

  // 6. Buat tabel push_subscriptions
  await db.run(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      endpoint TEXT UNIQUE NOT NULL,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      alarm_time TEXT DEFAULT '19:00',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
}

export default db;
