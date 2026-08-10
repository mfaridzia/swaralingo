import { db } from '../db/dexie';
import type { PendingMutation } from '../db/dexie';
import { API_URL } from '../../config';
import { coalesceMutations, mergeServerResponse } from './merge';
import type { SyncResponseData } from './merge';
import { retryDelay, isDead } from './retry';
import { updateSyncState, isOnline } from '../store';

let isSyncing = false;

/**
 * Push all pending mutations to the server.
 * Handles audio upload first, then batch-syncs data.
 * Called by triggers (online, visibility, periodic, manual).
 */
export async function syncNow(): Promise<void> {
  if (isSyncing || !isOnline()) return;

  isSyncing = true;
  try {
    const pending = await db.pendingSync
      .where('status')
      .anyOf(['pending', 'failed'])
      .filter(m => m.retries < 10)
      .toArray();

    if (pending.length === 0) {
      updateSyncState(0, null);
      return;
    }

    // Mark as syncing
    await db.pendingSync.bulkPut(pending.map(m => ({ ...m, status: 'syncing' as const })));

    // Upload any pending audio first
    const audioMutations = pending.filter(m => m.audioBlobId != null);
    for (const mut of audioMutations) {
      try {
        const audioRecord = await db.audioBlobs.get(mut.audioBlobId!);
        if (audioRecord && audioRecord.status === 'local') {
          const formData = new FormData();
          // Backend expects raw binary, not FormData. POST blob directly.
          const uploadRes = await fetch(`${API_URL}/audio`, {
            method: 'POST',
            headers: { 'Content-Type': audioRecord.contentType },
            body: audioRecord.blob,
            credentials: 'include',
          });
          if (uploadRes.ok) {
            const json = await uploadRes.json();
            if (json.success) {
              // Patch audio_key into mutation data
              mut.data = { ...mut.data, audio_key: json.data.audioKey };
              await db.audioBlobs.update(audioRecord.id!, { status: 'uploaded', audioKey: json.data.audioKey });
            }
          }
        }
      } catch {
        // Audio upload failed — proceed without audio, mutation text still syncs
      }
    }

    // Coalesce and build batch
    const coalesced = coalesceMutations(pending);
    const mutations = coalesced.map(m => ({
      table: m.table,
      operation: m.operation,
      clientId: m.clientId,
      data: m.data,
      clientUpdatedAt: m.clientUpdatedAt,
    }));

    // POST to sync endpoint (raw fetch, bypassing apiFetch interceptor)
    const idempotencyKey = crypto.randomUUID();
    const res = await fetch(`${API_URL}/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Sync-Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify({ mutations, idempotencyKey }),
      credentials: 'include',
    });

    if (res.status === 401) {
      // Session expired — clear auth and stop syncing
      updateSyncState(pending.length, 'Session expired');
      return;
    }

    if (!res.ok) {
      throw new Error(`Sync failed: ${res.status}`);
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error || 'Sync failed');
    }

    const serverData: SyncResponseData = json.data;
    const { resolvedClientIds, failedClientIds, conflictClientIds } = mergeServerResponse(serverData);

    // Update local Dexie: mark resolved rows as synced, update serverIds
    const modifyOps: Promise<any>[] = [];
    for (const s of serverData.synced) {
      if (s.serverId > 0) {
        const dexieTable = s.table === 'logs' ? db.logs : s.table === 'chunks' ? db.chunks : db.journals;
        modifyOps.push(
          (dexieTable.where('clientId').equals(s.clientId) as any).modify({ serverId: s.serverId, synced: true })
        );
      }
    }
    await Promise.all(modifyOps);

    // Remove resolved and dead-letter mutations from pendingSync
    for (const mut of pending) {
      if (resolvedClientIds.has(mut.clientId)) {
        await db.pendingSync.delete(mut.id!);
      } else if (failedClientIds.has(mut.clientId)) {
        const errorMsg = serverData.errors.find(e => e.clientId === mut.clientId)?.message || 'Unknown error';
        // Unrecoverable errors: delete immediately (data is corrupt, no retry can fix)
        const isFatal = /NOT NULL|SQLITE_CONSTRAINT|no such column/i.test(errorMsg);
        if (isFatal) {
          await db.pendingSync.delete(mut.id!);
        } else if (isDead(mut.retries + 1)) {
          await db.pendingSync.update(mut.id!, { status: 'dead', lastError: errorMsg, retries: mut.retries + 1 });
        } else {
          await db.pendingSync.update(mut.id!, { status: 'failed', lastError: errorMsg, retries: mut.retries + 1 });
        }
      } else if (conflictClientIds.has(mut.clientId)) {
        // Conflict — mark as synced anyway (server version kept, we discard client version on LWW)
        await db.pendingSync.delete(mut.id!);
        // Set synced = false to signal to UI that a refetch is needed
        const dexieTable = mut.table === 'logs' ? db.logs : mut.table === 'chunks' ? db.chunks : db.journals;
        (dexieTable.where('clientId').equals(mut.clientId) as any).modify({ synced: false });
      }
    }

    // Update store with remaining count
    const remaining = await db.pendingSync.where('status').anyOf(['pending', 'failed']).count();
    updateSyncState(remaining, null);

    // Notify UI that sync completed — React Query should refetch
    if (typeof window !== 'undefined' && serverData.synced.length > 0) {
      window.dispatchEvent(new CustomEvent('swaralingo:synced', { detail: { count: serverData.synced.length } }));
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sync error';
    // Re-mark all syncing rows as failed
    await db.pendingSync.where('status').equals('syncing').modify({ status: 'failed', lastError: msg });
    const remaining = await db.pendingSync.where('status').anyOf(['pending', 'failed']).count();
    updateSyncState(remaining, msg);
  } finally {
    isSyncing = false;
  }
}

// Normalize camelCase keys to snake_case for Dexie storage
const LOGS_KEY_MAP: Record<string, string> = {
  userInput: 'user_input',
  aiFeedback: 'ai_feedback',
  improvedVersion: 'improved_version',
  audioKey: 'audio_key',
  audioBase64: 'audio_base64',
  mistakeCategory: 'mistake_category',
};

function normalizeLogData(data: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const mapped = LOGS_KEY_MAP[key] || key;
    normalized[mapped] = value;
  }
  return normalized;
}

/**
 * Enqueue a mutation to the pendingSync table and write optimistically to the local Dexie table.
 */
export async function enqueueMutation(
  table: 'logs' | 'chunks' | 'journals',
  operation: 'insert' | 'update' | 'delete',
  data: Record<string, unknown>,
  audioBlobId?: number,
): Promise<string> {
  const clientId = crypto.randomUUID();
  const clientUpdatedAt = Date.now();
  // Normalize camelCase → snake_case for logs table
  const cleanData = table === 'logs' ? normalizeLogData(data) : data;

  try {
    // Write optimistically to local table
    if (operation === 'insert') {
      const record: any = {
        clientId,
        userId: cleanData.userId as number,
        ...cleanData,
        updatedAt: clientUpdatedAt,
        synced: false,
      };
      if (table === 'logs' && audioBlobId != null) {
        record.audioBlobId = audioBlobId;
      }
      if (table === 'logs') await db.logs.put(record);
      else if (table === 'chunks') await db.chunks.put(record as any);
      else if (table === 'journals') await db.journals.put(record as any);
    } else if (operation === 'update') {
      const dexieTable = table === 'logs' ? db.logs : table === 'chunks' ? db.chunks : db.journals;
      (dexieTable.where('clientId').equals(clientId) as any).modify({ ...cleanData, updatedAt: clientUpdatedAt, synced: false } as any);
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new Error('Storage full. Clear old offline data in Settings.');
    }
    throw err;
  }

  // Queue for sync (store cleanData so server receives correct keys)
  await db.pendingSync.put({
    table,
    operation,
    clientId,
    data: cleanData,
    clientUpdatedAt,
    retries: 0,
    status: 'pending',
    audioBlobId,
    createdAt: Date.now(),
  });

  // Update store
  const pendingCount = await db.pendingSync.where('status').anyOf(['pending', 'failed']).count();
  updateSyncState(pendingCount, null);

  return clientId;
}

/**
 * Store audio blob locally and return ID for linking with a mutation.
 */
export async function enqueueAudio(blob: Blob, contentType = 'audio/webm'): Promise<number> {
  try {
    const id = await db.audioBlobs.put({
      blob,
      contentType,
      size: blob.size,
      status: 'local',
      createdAt: Date.now(),
    });
    return id;
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'QuotaExceededError') {
      throw new Error('Storage full. Clear old offline data in Settings.');
    }
    throw err;
  }
}

export async function getPendingCount(): Promise<number> {
  return db.pendingSync.where('status').anyOf(['pending', 'failed']).count();
}
