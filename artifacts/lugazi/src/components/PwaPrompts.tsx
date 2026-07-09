import { useState, useEffect, useCallback } from 'react';
import { X, Download, RefreshCw, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
  prompt(): Promise<void>;
}

const DISMISSED_KEY = 'pwa_install_dismissed_until';
const DISMISS_DAYS = 4;

function isDismissed() {
  const until = localStorage.getItem(DISMISSED_KEY);
  if (!until) return false;
  return Date.now() < Number(until);
}

function dismiss() {
  const until = Date.now() + DISMISS_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(DISMISSED_KEY, String(until));
}

function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    ('standalone' in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true)
  );
}

function isIosSafari() {
  const ua = window.navigator.userAgent;
  const isIOS = /iphone|ipad|ipod/i.test(ua);
  const isWebkit = /webkit/i.test(ua) && !/crios|fxios|opios|mercury/i.test(ua);
  return isIOS && isWebkit;
}

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    if (isStandaloneMode() || isDismissed()) return;

    const ios = isIosSafari();
    setIsIOS(ios);

    if (ios) {
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      const timer = setTimeout(() => setVisible(true), 3000);
      return () => clearTimeout(timer);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalling(false);
    if (outcome === 'accepted') {
      setVisible(false);
    } else {
      dismiss();
      setVisible(false);
    }
  }, [deferredPrompt]);

  const handleDismiss = useCallback(() => {
    dismiss();
    setVisible(false);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300"
      role="dialog"
      aria-label="Install DC Lugazi"
    >
      <div className="mx-auto max-w-lg">
        <div className="m-3 rounded-2xl shadow-2xl border border-border/60 bg-card overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <img loading="lazy"
              src="/icons/icon-96x96.png"
              alt="DC Lugazi"
              className="w-12 h-12 rounded-xl shadow-sm flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground leading-tight">DC Lugazi</p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                {isIOS
                  ? 'Add to your Home Screen for the best experience'
                  : 'Install the app for quick access, even offline'}
              </p>
            </div>
            <button
              onClick={handleDismiss}
              className="flex-shrink-0 p-1.5 rounded-full text-muted-foreground hover:bg-muted transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {isIOS ? (
            /* iOS step-by-step guide */
            <div className="px-4 pb-4">
              <div className="rounded-xl bg-muted/60 p-3 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#6D1F3C] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">1</span>
                  <p className="text-xs text-foreground">
                    Tap the{' '}
                    <span className="inline-flex items-center gap-0.5 font-medium">
                      <Share className="w-3 h-3" /> Share
                    </span>{' '}
                    button at the bottom of Safari
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#6D1F3C] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">2</span>
                  <p className="text-xs text-foreground">
                    Scroll down and tap{' '}
                    <span className="font-medium">"Add to Home Screen"</span>
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#6D1F3C] text-white text-[10px] font-bold flex items-center justify-center mt-0.5">3</span>
                  <p className="text-xs text-foreground">
                    Tap <span className="font-medium">"Add"</span> in the top-right corner
                  </p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="w-full mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Not now
              </button>
            </div>
          ) : (
            /* Android / Chrome install button */
            <div className="flex items-center gap-2 px-4 pb-4">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Not now
              </button>
              <button
                onClick={handleInstall}
                disabled={installing}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity disabled:opacity-70"
                style={{ backgroundColor: '#6D1F3C' }}
              >
                <Download className="w-4 h-4" />
                {installing ? 'Installing…' : 'Install'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    // Capture BEFORE the event fires — if there was no existing controller
    // this is a first-time SW install, not an update. Don't show the banner.
    const hadController = Boolean(navigator.serviceWorker.controller);

    const handleControllerChange = () => {
      if (!hadController) return; // first install — skip
      setVisible(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    return () => navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top duration-300">
      <div className="mx-auto max-w-lg px-3 pt-3">
        <div
          className="rounded-xl shadow-lg border border-white/20 px-4 py-3 flex items-center gap-3"
          style={{ backgroundColor: '#6D1F3C' }}
        >
          <RefreshCw className="w-4 h-4 text-white flex-shrink-0" />
          <p className="flex-1 text-sm text-white font-medium">
            A new version of DC Lugazi is ready
          </p>
          <button
            onClick={() => window.location.reload()}
            className="flex-shrink-0 px-3 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-white text-xs font-semibold transition-colors"
          >
            Refresh
          </button>
          <button
            onClick={() => setVisible(false)}
            className="flex-shrink-0 p-1 rounded-full text-white/70 hover:text-white transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
