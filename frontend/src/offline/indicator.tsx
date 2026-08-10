import React, { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db/dexie';
import { getOfflineStore, subscribe, isOnline } from './store';
import { syncNow } from './sync/engine';

export const SyncBanner: React.FC = () => {
  const [store, setStore] = useState(() => getOfflineStore());
  const [online, setOnline] = useState(() => isOnline());
  const pendingCount = store.pendingCount;
  const offlineMode = store.offlineModeEnabled;

  useEffect(() => {
    return subscribe(() => setStore(getOfflineStore()));
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!offlineMode) return null;

  let bg = 'bg-zinc-800/50';
  let text = 'text-zinc-300';
  let icon = '🟢';
  let message = 'Synced';

  if (!online && pendingCount > 0) {
    bg = 'bg-amber-900/30';
    text = 'text-amber-300';
    icon = '🟡';
    message = `Offline — ${pendingCount} pending`;
  } else if (!online) {
    bg = 'bg-amber-900/30';
    text = 'text-amber-300';
    icon = '🟡';
    message = 'Offline — changes saved locally';
  } else if (pendingCount > 0) {
    bg = 'bg-amber-900/20';
    text = 'text-amber-200';
    icon = '📤';
    message = `${pendingCount} pending sync${pendingCount > 1 ? 's' : ''}`;
  }

  return (
    <div className={`${bg} ${text} text-xs px-3 py-1.5 text-center flex items-center justify-center gap-2 border-b border-zinc-800/30`}>
      <span>{icon}</span>
      <span>{message}</span>
      {pendingCount > 0 && online && (
        <button
          onClick={() => syncNow()}
          className="underline hover:text-white transition-colors ml-1"
        >
          Sync now
        </button>
      )}
      {store.lastError && (
        <span className="text-red-400 ml-2 truncate max-w-[200px]" title={store.lastError}>
          • {store.lastError.slice(0, 50)}
        </span>
      )}
    </div>
  );
};

export const SyncDot: React.FC<{ clientId: string }> = ({ clientId }) => {
  const record = useLiveQuery(
    () => db.logs.where('clientId').equals(clientId).first(),
    [clientId]
  );
  const pending = useLiveQuery(
    () => db.pendingSync.where('clientId').equals(clientId).first(),
    [clientId]
  );

  const offlineMode = getOfflineStore().offlineModeEnabled;
  if (!offlineMode) return null;

  if (pending && pending.status !== 'dead') {
    return <span className="inline-block w-2 h-2 rounded-full bg-amber-400 animate-pulse" title="Pending sync" />;
  }
  if (pending && pending.status === 'dead') {
    return <span className="inline-block w-2 h-2 rounded-full bg-red-500" title="Sync failed" />;
  }
  if (record && !record.synced) {
    return <span className="inline-block w-2 h-2 rounded-full bg-amber-400" title="Not synced" />;
  }
  return <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" title="Synced" />;
};
