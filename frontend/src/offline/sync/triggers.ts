import { syncNow } from './engine';
import { isOnline, updateSyncState } from '../store';
import { db } from '../db/dexie';

const AUTO_CLEANUP_DONE_KEY = '__swaralingo_cleanup_v1';

let triggersInitialized = false;

/**
 * Initialize sync triggers: online event, visibility change, periodic timer.
 * Idempotent — safe to call multiple times (StrictMode).
 */
export function initSyncTriggers(): void {
  if (triggersInitialized || typeof window === 'undefined') return;
  triggersInitialized = true;

  // One-time cleanup: remove dead mutations from previous versions
  if (!sessionStorage.getItem(AUTO_CLEANUP_DONE_KEY)) {
    sessionStorage.setItem(AUTO_CLEANUP_DONE_KEY, '1');
    db.pendingSync.where('status').equals('dead').delete().then(() => {
      db.pendingSync.where('status').anyOf(['pending', 'failed']).count().then(n => {
        updateSyncState(n, null);
      });
    });
  }

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
