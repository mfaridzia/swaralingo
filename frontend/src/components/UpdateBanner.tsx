import { useRegisterSW } from 'virtual:pwa-register/react';

/**
 * Shows a banner when a new version of the app is available.
 * Uses vite-plugin-pwa's `virtual:pwa-register` with `registerType: 'prompt'`.
 */
export function UpdateBanner() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      // Check for updates every hour
      if (r) {
        setInterval(() => r.update(), 60 * 60 * 1000);
      }
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="bg-[#22c55e]/10 border-b border-[#22c55e]/20 text-xs px-3 py-1.5 text-center flex items-center justify-center gap-2">
      <span>🔄</span>
      <span className="text-[#a1a1aa]">A new version is available</span>
      <button
        onClick={() => updateServiceWorker(true)}
        className="underline text-[#22c55e] hover:text-[#4ade80] font-semibold transition-colors ml-1 cursor-pointer"
      >
        Update
      </button>
      <button
        onClick={() => setNeedRefresh(false)}
        className="text-[#52525b] hover:text-white transition-colors ml-2 cursor-pointer"
        title="Dismiss"
      >
        ✕
      </button>
    </div>
  );
}
