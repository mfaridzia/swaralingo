export interface OfflineStore {
  offlineModeEnabled: boolean;
  lastSyncedAt: number | null;
  pendingCount: number;
  lastError: string | null;
}

type Listener = () => void;

const listeners = new Set<Listener>();

function notify() {
  listeners.forEach(fn => fn());
}

export function getOfflineStore(): OfflineStore {
  return {
    offlineModeEnabled: false, // Temporarily disabled by default
    lastSyncedAt: Number(localStorage.getItem('swaralingo_last_sync')) || null,
    pendingCount: Number(localStorage.getItem('swaralingo_pending_count')) || 0,
    lastError: localStorage.getItem('swaralingo_last_error') || null,
  };
}

export function setOfflineModeEnabled(v: boolean): void {
  localStorage.setItem('swaralingo_offline_enabled', String(v));
  if (!v) {
    // Clear stored sync state on disable
    localStorage.removeItem('swaralingo_last_sync');
    localStorage.removeItem('swaralingo_pending_count');
    localStorage.removeItem('swaralingo_last_error');
  }
  notify();
}

export function updateSyncState(pendingCount: number, error?: string | null): void {
  localStorage.setItem('swaralingo_last_sync', String(Date.now()));
  localStorage.setItem('swaralingo_pending_count', String(pendingCount));
  if (error !== undefined) {
    if (error) {
      localStorage.setItem('swaralingo_last_error', error);
    } else {
      localStorage.removeItem('swaralingo_last_error');
    }
  }
  notify();
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}
