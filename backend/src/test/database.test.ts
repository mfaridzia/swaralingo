import { describe, it, expect } from 'vitest';
import { initDB, db } from '../database.js';

describe('Database Schema & Query Tests', () => {
  it('should initialize all database tables idempotently without throwing', async () => {
    let error: any = null;
    try {
      await initDB();
    } catch (e) {
      error = e;
    }
    expect(error).toBeNull();
  });

  it('should execute db.prepare, run, and query correctly', async () => {
    const testEmail = `db_test_${Date.now()}@example.com`;
    const stmt = db.prepare('INSERT INTO users (email, name, password_hash) VALUES (?, ?, ?)');
    const res = await stmt.run(testEmail, 'DB Test User', 'test_hash');

    expect(res.lastInsertRowid).toBeDefined();
    expect(typeof res.lastInsertRowid).toBe('number');
    expect(res.changes).toBe(1);

    const user = await db.query('SELECT * FROM users WHERE id = ?').get(res.lastInsertRowid);
    expect(user).toBeDefined();
    expect(user.email).toBe(testEmail);
    expect(user.name).toBe('DB Test User');
  });

  it('should support db.run for direct execution', async () => {
    const res = await db.run('SELECT 1 as val');
    expect(res).toBeDefined();
  });
});
