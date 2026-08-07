import { createClient } from "@libsql/client";

const isProd = process.env.NODE_ENV === 'production';

let localDb: any = null;
let tursoClient: any = null;

if (isProd) {
  tursoClient = createClient({
    url: process.env.TURSO_DATABASE_URL || '',
    authToken: process.env.TURSO_AUTH_TOKEN || '',
  });
} else {
  const { Database } = await import("bun:sqlite");
  localDb = new Database("sqlite.db", { create: true });
}

export const db = {
  run: async (sql: string, ...params: any[]): Promise<any> => {
    if (isProd) {
      return await tursoClient.execute({ sql, args: params });
    } else {
      return localDb!.run(sql, ...params);
    }
  },

  query: (sql: string) => {
    return {
      all: async (...params: any[]): Promise<any[]> => {
        if (isProd) {
          const res = await tursoClient.execute({ sql, args: params });
          return res.rows as any[];
        } else {
          return localDb!.query(sql).all(...params) as any[];
        }
      },
      get: async (...params: any[]): Promise<any | undefined> => {
        if (isProd) {
          const res = await tursoClient.execute({ sql, args: params });
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
        if (isProd) {
          const res = await tursoClient.execute({ sql, args: params });
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
        if (isProd) {
          const res = await tursoClient.execute({ sql, args: params });
          return res.rows[0] as any;
        } else {
          return localDb!.prepare(sql).get(...params) as any;
        }
      },
      all: async (...params: any[]): Promise<any[]> => {
        if (isProd) {
          const res = await tursoClient.execute({ sql, args: params });
          return res.rows as any[];
        } else {
          return localDb!.prepare(sql).all(...params) as any[];
        }
      }
    };
  }
};

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

  try {
    await db.run(`ALTER TABLE users ADD COLUMN target_language TEXT DEFAULT 'English'`);
  } catch (e) {
    // Diabaikan jika kolom target_language sudah ada
  }

  // Tambahkan kolom user_id jika tabel logs lama sudah ada sebelumnya tanpa kolom tersebut
  try {
    await db.run(`ALTER TABLE practice_logs ADD COLUMN user_id INTEGER`);
  } catch (e) {
    // Diabaikan jika kolom user_id sudah ada
  }

  // Tambahkan kolom audio_base64 jika belum ada
  try {
    await db.run(`ALTER TABLE practice_logs ADD COLUMN audio_base64 TEXT`);
  } catch (e) {
    // Diabaikan jika kolom audio_base64 sudah ada
  }

  // Tambahkan kolom mistake_category jika belum ada
  try {
    await db.run(`ALTER TABLE practice_logs ADD COLUMN mistake_category TEXT DEFAULT 'None'`);
  } catch (e) {
    // Diabaikan jika kolom mistake_category sudah ada
  }

  // 3. Buat tabel sentence_chunks (dengan referensi user_id)
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

  try {
    await db.run(`ALTER TABLE sentence_chunks ADD COLUMN user_id INTEGER`);
  } catch (e) {
    // Diabaikan jika kolom user_id sudah ada
  }

  // Tambahkan kolom review jika tabel lama sudah terlanjur dibuat tanpa review columns
  try {
    await db.run(`ALTER TABLE sentence_chunks ADD COLUMN next_review_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
  } catch (e) { }
  try {
    await db.run(`ALTER TABLE sentence_chunks ADD COLUMN interval INTEGER DEFAULT 0`);
  } catch (e) { }
  try {
    await db.run(`ALTER TABLE sentence_chunks ADD COLUMN repetition INTEGER DEFAULT 0`);
  } catch (e) { }
  try {
    await db.run(`ALTER TABLE sentence_chunks ADD COLUMN easiness REAL DEFAULT 2.5`);
  } catch (e) { }

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
}

export default db;
