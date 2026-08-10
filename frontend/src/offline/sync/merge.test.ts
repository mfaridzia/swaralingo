import { describe, it, expect } from 'vitest';
import { coalesceMutations, mergeServerResponse } from './merge';
import type { PendingMutation } from '../db/dexie';

function makeMut(overrides: Partial<PendingMutation> = {}): PendingMutation {
  return {
    id: 1,
    table: 'logs',
    operation: 'insert',
    clientId: 'a1b2c3d4-e5f6-4789-abcd-ef1234567890',
    data: { user_input: 'Hello' },
    clientUpdatedAt: 1754841600000,
    retries: 0,
    status: 'pending',
    createdAt: 1754841600000,
    ...overrides,
  };
}

describe('coalesceMutations', () => {
  it('returns single mutation unchanged', () => {
    const result = coalesceMutations([makeMut()]);
    expect(result).toHaveLength(1);
    expect(result[0].operation).toBe('insert');
  });

  it('insert + update on same clientId → single insert with merged data', () => {
    const mutations = [
      makeMut({ operation: 'insert', clientUpdatedAt: 1000, data: { user_input: 'A' } }),
      makeMut({ operation: 'update', clientUpdatedAt: 2000, data: { ai_feedback: 'B' } }),
    ];
    const result = coalesceMutations(mutations);
    expect(result).toHaveLength(1);
    expect(result[0].operation).toBe('insert');
    expect(result[0].data).toEqual({ user_input: 'A', ai_feedback: 'B' });
    expect(result[0].clientUpdatedAt).toBe(2000);
  });

  it('insert + delete on same clientId → dropped (nothing to sync)', () => {
    const mutations = [
      makeMut({ operation: 'insert' }),
      makeMut({ operation: 'delete' }),
    ];
    const result = coalesceMutations(mutations);
    expect(result).toHaveLength(0);
  });

  it('update + update → single update with latest data', () => {
    const mutations = [
      makeMut({ operation: 'update', clientUpdatedAt: 1000, data: { user_input: 'Old' } }),
      makeMut({ operation: 'update', clientUpdatedAt: 2000, data: { user_input: 'New' } }),
    ];
    const result = coalesceMutations(mutations);
    expect(result).toHaveLength(1);
    expect(result[0].operation).toBe('update');
    expect(result[0].data.user_input).toBe('New');
    expect(result[0].clientUpdatedAt).toBe(2000);
  });

  it('update + delete → single delete', () => {
    const mutations = [
      makeMut({ operation: 'update' }),
      makeMut({ operation: 'delete' }),
    ];
    const result = coalesceMutations(mutations);
    expect(result).toHaveLength(1);
    expect(result[0].operation).toBe('delete');
  });

  it('delete + insert → update (re-create)', () => {
    const mutations = [
      makeMut({ operation: 'delete' }),
      makeMut({ operation: 'insert', data: { user_input: 'Recreated' } }),
    ];
    const result = coalesceMutations(mutations);
    expect(result).toHaveLength(1);
    expect(result[0].operation).toBe('update');
  });

  it('different clientIds stay separate', () => {
    const mutations = [
      makeMut({ clientId: 'a1b2c3d4-e5f6-4789-abcd-ef1234567890', operation: 'insert' }),
      makeMut({ clientId: 'b2c3d4e5-f6a7-4890-bcde-f12345678901', operation: 'insert' }),
    ];
    const result = coalesceMutations(mutations);
    expect(result).toHaveLength(2);
  });

  it('different tables stay separate even with same clientId', () => {
    const mutations = [
      makeMut({ table: 'logs', clientId: 'a1b2c3d4-e5f6-4789-abcd-ef1234567890' }),
      makeMut({ table: 'chunks', clientId: 'a1b2c3d4-e5f6-4789-abcd-ef1234567890' }),
    ];
    const result = coalesceMutations(mutations);
    expect(result).toHaveLength(2);
  });
});

describe('mergeServerResponse', () => {
  it('partitions synced, failed, conflict clientIds', () => {
    const data = {
      synced: [{ table: 'logs', clientId: 'a', serverId: 1 }],
      conflicts: [{ table: 'logs', clientId: 'b', serverRow: {} }],
      errors: [{ clientId: 'c', message: 'fail' }],
    };
    const result = mergeServerResponse(data);
    expect(result.resolvedClientIds.has('a')).toBe(true);
    expect(result.conflictClientIds.has('b')).toBe(true);
    expect(result.failedClientIds.has('c')).toBe(true);
  });

  it('empty response', () => {
    const result = mergeServerResponse({ synced: [], conflicts: [], errors: [] });
    expect(result.resolvedClientIds.size).toBe(0);
    expect(result.failedClientIds.size).toBe(0);
    expect(result.conflictClientIds.size).toBe(0);
  });
});
