import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
}

function isPWAStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true; // iOS old WebKit
}

/**
 * Shows install banner with two strategies:
 * - Android/Chrome: native `beforeinstallprompt` event
 * - iOS/Safari: instructional banner (Share → "Add to Home Screen")
 *
 * Hidden if already installed (display-mode: standalone) or dismissed this session.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');

  useEffect(() => {
    if (isPWAStandalone()) return;

    const dismissed = sessionStorage.getItem('swaralingo_install_dismissed');
    if (dismissed === '1') return;

    // Detect platform
    if (isIOS()) {
      setPlatform('ios');
      // Delay banner so user has time to engage first (iOS: no native event)
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    // Android / Chrome: wait for beforeinstallprompt
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setPlatform('android');
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    window.addEventListener('appinstalled', () => {
      setVisible(false);
      setDeferredPrompt(null);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (platform === 'android' && deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
      }
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem('swaralingo_install_dismissed', '1');
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 animate-slide-up md:left-auto md:right-4 md:w-96">
      <div className="glass-panel rounded-2xl border border-[#22c55e]/20 bg-[#09090b]/95 backdrop-blur-md p-4 flex items-center gap-3 shadow-2xl">
        <span className="text-2xl flex-shrink-0">📲</span>

        {platform === 'ios' ? (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">Add to Home Screen</p>
            <p className="text-[10px] text-[#a1a1aa] leading-relaxed">
              Tap <span className="text-white font-semibold">Share</span>{' '}
              <svg className="inline-block w-3.5 h-3.5 align-text-bottom" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              {' '}then <span className="text-white font-semibold">Add to Home Screen</span>
            </p>
          </div>
        ) : (
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-white">Install SwaraLingo</p>
            <p className="text-[10px] text-[#a1a1aa]">Quick access from your home screen</p>
          </div>
        )}

        <div className="flex gap-1.5 flex-shrink-0">
          {platform === 'android' && (
            <button
              onClick={handleInstall}
              className="px-3 py-1.5 rounded-lg bg-[#22c55e] text-[#09090b] text-[10px] font-bold uppercase tracking-wider hover:bg-[#4ade80] transition-colors cursor-pointer"
            >
              Install
            </button>
          )}
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
