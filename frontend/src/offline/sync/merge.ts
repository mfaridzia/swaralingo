import type { PendingMutation } from '../db/dexie';

/**
 * Coalesce pending mutations: per (table, clientId), keep only the latest.
 * Insert + later update → single insert with merged data.
 * Insert + later delete → dropped (nothing to sync).
 * Update + later update → single update with latest data.
 * Update + later delete → single delete.
 */
export function coalesceMutations(mutations: PendingMutation[]): PendingMutation[] {
  const latest = new Map<string, PendingMutation>();

  for (const mut of mutations) {
    const key = `${mut.table}:${mut.clientId}`;
    const existing = latest.get(key);

    if (!existing) {
      latest.set(key, { ...mut });
      continue;
    }

    // Coalesce rules
    if (mut.operation === 'delete') {
      if (existing.operation === 'insert') {
        // insert + delete = nothing to sync → remove
        latest.delete(key);
      } else {
        // update + delete = just delete (keep latest data for tombstone)
        latest.set(key, { ...mut });
      }
    } else if (mut.operation === 'update') {
      if (existing.operation === 'insert') {
        // insert + update = single insert with merged data
        latest.set(key, { ...existing, operation: 'insert', data: { ...existing.data, ...mut.data }, clientUpdatedAt: mut.clientUpdatedAt });
      } else if (existing.operation === 'update') {
        // update + update = single update with latest data
        latest.set(key, { ...existing, data: { ...existing.data, ...mut.data }, clientUpdatedAt: mut.clientUpdatedAt });
      } else if (existing.operation === 'delete') {
        // delete + update = ignore (row already deleted)
        // keep delete
      }
    } else if (mut.operation === 'insert') {
      if (existing.operation === 'delete') {
        // delete + insert = update (re-create)
        latest.set(key, { ...mut, operation: 'update' });
      } else {
        latest.set(key, { ...mut });
      }
    }
  }

  return Array.from(latest.values());
}

export interface SyncResponseData {
  synced: { table: string; clientId: string; serverId: number }[];
  conflicts: { table: string; clientId: string; serverRow?: unknown }[];
  errors: { clientId: string; message: string }[];
}

export function mergeServerResponse(
  data: SyncResponseData,
): { resolvedClientIds: Set<string>; failedClientIds: Set<string>; conflictClientIds: Set<string> } {
  const resolved = new Set(data.synced.map(s => s.clientId));
  const failed = new Set(data.errors.map(e => e.clientId));
  const conflict = new Set(data.conflicts.map(c => c.clientId));
  return { resolvedClientIds: resolved, failedClientIds: failed, conflictClientIds: conflict };
}
