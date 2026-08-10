import { describe, it, expect, beforeEach } from 'vitest';
import { db } from './dexie';

describe('SwaraLingoDB', () => {
  beforeEach(async () => {
    // Clean state for each test
    await db.logs.clear();
    await db.chunks.clear();
    await db.journals.clear();
    await db.audioBlobs.clear();
    await db.pendingSync.clear();
  });

  it('opens database and creates tables', async () => {
    const count = await db.logs.count();
    expect(count).toBe(0);
    expect(db.tables.map(t => t.name)).toContain('logs');
    expect(db.tables.map(t => t.name)).toContain('pendingSync');
  });

  it('stores and retrieves a log record', async () => {
    const id = await db.logs.put({
      clientId: 'a1b2c3d4-e5f6-4789-abcd-ef1234567890',
      userId: 1,
      user_input: 'Hello world',
      ai_feedback: 'Good',
      improved_version: 'Hello world!',
      created_at: new Date().toISOString(),
      updatedAt: Date.now(),
      synced: false,
    });
    expect(id).toBeGreaterThan(0);

    const record = await db.logs.get(id);
    expect(record).toBeDefined();
    expect(record!.user_input).toBe('Hello world');
    expect(record!.synced).toBe(false);
  });

  it('stores and retrieves a blob in audioBlobs', async () => {
    // Note: fake-indexeddb serializes to JSON, so Blob becomes {} in tests.
    // Real IndexedDB handles Blobs natively. Test schema + round-trip works.
    const text = 'test audio data';
    const blob = new Blob([text], { type: 'audio/webm' });
    const id = await db.audioBlobs.put({
      blob,
      contentType: 'audio/webm',
      size: blob.size,
      status: 'local',
      createdAt: Date.now(),
    });
    const record = await db.audioBlobs.get(id);
    expect(record).toBeDefined();
    expect(record!.contentType).toBe('audio/webm');
    expect(record!.status).toBe('local');
    // blob identity check skipped — fake-indexeddb limitation
  });

  it('creates and queries pending mutations', async () => {
    const id = await db.pendingSync.put({
      table: 'logs',
      operation: 'insert',
      clientId: 'a1b2c3d4-e5f6-4789-abcd-ef1234567890',
      data: { user_input: 'Test' },
      clientUpdatedAt: Date.now(),
      retries: 0,
      status: 'pending',
      createdAt: Date.now(),
    });
    expect(id).toBeGreaterThan(0);

    const pending = await db.pendingSync.where('status').equals('pending').toArray();
    expect(pending).toHaveLength(1);
    expect(pending[0].table).toBe('logs');
  });

  it('indexes logs by clientId', async () => {
    const clientId = 'a1b2c3d4-e5f6-4789-abcd-ef1234567890';
    await db.logs.put({
      clientId,
      userId: 1,
      user_input: 'Test',
      ai_feedback: 'fb',
      improved_version: 'Test',
      created_at: new Date().toISOString(),
      updatedAt: Date.now(),
      synced: false,
    });
    const found = await db.logs.where('clientId').equals(clientId).first();
    expect(found).toBeDefined();
    expect(found!.clientId).toBe(clientId);
  });
});
