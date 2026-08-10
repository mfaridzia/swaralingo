import { syncNow } from './engine';
import { isOnline } from '../store';

let triggersInitialized = false;

/**
 * Initialize sync triggers: online event, visibility change, periodic timer.
 * Idempotent — safe to call multiple times (StrictMode).
 */
export function initSyncTriggers(): void {
  if (triggersInitialized || typeof window === 'undefined') return;
  triggersInitialized = true;

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
