import { useState, useEffect, useCallback } from 'react';
import { X, Smartphone, Share } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { QRCodeSVG } from 'qrcode.react';

const APK_URL = 'https://github.com/levixticus67-lab/Lugazi-system/releases/download/latest-build/DCLugazi.apk';

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

function isAndroidBrowser() {
  return /android/i.test(window.navigator.userAgent);
}

function isMobile() {
  return isIosSafari() || isAndroidBrowser();
}

export function PwaInstallBanner() {
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);

  useEffect(() => {
    // Never show inside the native app
    if (Capacitor.isNativePlatform()) return;
    if (isStandaloneMode() || isDismissed()) return;

    const ios = isIosSafari();
    const android = isAndroidBrowser();
    setIsIOS(ios);
    setIsAndroid(android);

    // Show on mobile (iOS / Android) and desktop alike — after a short delay
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

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
          {/* Top bar — identical on all platforms */}
          <div className="flex items-center gap-3 px-4 pt-4 pb-3">
            <img
              loading="lazy"
              src="/icons/icon-96x96.png"
              alt="DC Lugazi"
              className="w-12 h-12 rounded-xl shadow-sm flex-shrink-0"
            />
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground leading-tight">DC Lugazi</p>
              <p className="text-xs text-muted-foreground leading-snug mt-0.5">
                {isIOS
                  ? 'Add to your Home Screen for the best experience'
                  : isAndroid
                  ? 'Get the full experience with push notifications'
                  : 'Scan with your phone camera to download the app'}
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
            /* ── iOS: step-by-step home screen guide ── */
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
                    Scroll down and tap <span className="font-medium">"Add to Home Screen"</span>
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
          ) : isAndroid ? (
            /* ── Android browser: download APK ── */
            <div className="flex items-center gap-2 px-4 pb-4">
              <button
                onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-muted transition-colors"
              >
                Not now
              </button>
              <a
                href={APK_URL}
                onClick={handleDismiss}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-opacity"
                style={{ backgroundColor: '#6D1F3C' }}
              >
                <Smartphone className="w-4 h-4" />
                Download App
              </a>
            </div>
          ) : (
            /* ── Desktop: QR code pointing to APK download ── */
            <div className="px-4 pb-4">
              <div className="flex items-center gap-4">
                {/* QR code */}
                <div className="flex-shrink-0 p-2 bg-white rounded-xl border border-border/40 shadow-sm">
                  <QRCodeSVG
                    value={APK_URL}
                    size={104}
                    bgColor="#ffffff"
                    fgColor="#1e293b"
                    level="M"
                    imageSettings={{
                      src: '/icons/icon-96x96.png',
                      x: undefined,
                      y: undefined,
                      height: 20,
                      width: 20,
                      excavate: true,
                    }}
                  />
                </div>
                {/* Instructions */}
                <div className="flex-1 min-w-0 space-y-1.5">
                  <p className="text-xs text-foreground font-medium leading-snug">
                    Point your phone camera at the QR code
                  </p>
                  <p className="text-xs text-muted-foreground leading-snug">
                    Opens the download page for the Android app — free, no Play Store needed.
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
          )}
        </div>
      </div>
    </div>
  );
}

export function PwaUpdateBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Native app handles its own updates via UpdateChecker — skip here
    if (Capacitor.isNativePlatform()) return;
    if (!('serviceWorker' in navigator)) return;

    const hadController = Boolean(navigator.serviceWorker.controller);

    const handleControllerChange = () => {
      if (!hadController) return;
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
          <div className="w-4 h-4 text-white flex-shrink-0 animate-spin" style={{ borderRadius: '50%', border: '2px solid rgba(255,255,255,0.3)', borderTopColor: 'white' }} />
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
