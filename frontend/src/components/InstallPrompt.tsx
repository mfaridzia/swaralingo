import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Listens for the native `beforeinstallprompt` event and shows a custom
 * install banner. Dismissal is stored in sessionStorage so it doesn't
 * re-appear in the same browser session.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if already dismissed this session
    if (sessionStorage.getItem('swaralingo_install_dismissed')) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Also hide if app is already installed
    window.addEventListener('appinstalled', () => {
      setVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('swaralingo_install_dismissed', '1');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 animate-slide-up md:left-auto md:right-4 md:w-96">
      <div className="glass-panel rounded-2xl border border-[#22c55e]/20 bg-[#09090b]/95 backdrop-blur-md p-4 flex items-center gap-3 shadow-2xl">
        <span className="text-2xl">📲</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white">Install SwaraLingo</p>
          <p className="text-[10px] text-[#a1a1aa]">Quick access from your home screen</p>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={handleInstall}
            className="px-3 py-1.5 rounded-lg bg-[#22c55e] text-[#09090b] text-[10px] font-bold uppercase tracking-wider hover:bg-[#4ade80] transition-colors cursor-pointer"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="px-2 py-1.5 rounded-lg text-[10px] text-[#52525b] hover:text-white transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
