import { syncNow } from './engine';
import { isOnline, updateSyncState } from '../store';
import { db } from '../db/dexie';

let triggersInitialized = false;

/**
 * Initialize sync triggers: online event, visibility change, periodic timer.
 * Idempotent — safe to call multiple times (StrictMode).
 */
export function initSyncTriggers(): void {
  if (triggersInitialized || typeof window === 'undefined') return;
  triggersInitialized = true;

  // Cleanup on every init: remove dead + corrupted mutations from buggy versions
  db.pendingSync.where('status').equals('dead').delete();
  db.pendingSync.toArray().then(all => {
    const corrupted = all.filter(m => {
      const d = m.data || {};
      // Logs need user_input/ai_feedback/improved_version, chunks need phrase, journals need content
      if (m.table === 'logs') return !(d.user_input || d.userInput) || !(d.created_at || d.createdAt);
      if (m.table === 'chunks') return !d.phrase || !(d.created_at || d.createdAt);
      if (m.table === 'journals') return !d.content || !(d.created_at || d.createdAt);
      return false;
    });
    return Promise.all(corrupted.map(m => db.pendingSync.delete(m.id!)));
  }).then(() => {
    db.pendingSync.where('status').anyOf(['pending', 'failed']).count().then(n => {
      updateSyncState(n, null);
    });
  });

  // Online: sync when connectivity returns
  window.addEventListener('online', () => {
    syncNow();
  });

  // Visibility: sync when user returns to tab
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && isOnline()) {
      syncNow();
    }
  });

  // Periodic: sync every 60s while online
  setInterval(() => {
    if (isOnline()) {
      syncNow();
    }
  }, 60_000);
}
