export type InAppName = 'WhatsApp' | 'Telegram' | 'Facebook' | 'Instagram' | 'Messenger' | null;

export interface InAppBrowserResult {
  isInApp: boolean;
  appName: InAppName;
}

export type PlatformType = 'ios' | 'android' | 'desktop';

/**
 * Detects whether the current User-Agent is running inside an embedded WebView.
 * Handles empty strings, spoofed dual-token strings, and case insensitivity.
 */
export function detectInAppBrowser(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): InAppBrowserResult {
  if (!ua || typeof ua !== 'string') {
    return { isInApp: false, appName: null };
  }

  // Priority detection: specific messaging and social apps
  if (/WhatsApp/i.test(ua)) {
    return { isInApp: true, appName: 'WhatsApp' };
  }
  if (/Telegram/i.test(ua)) {
    return { isInApp: true, appName: 'Telegram' };
  }
  if (/Instagram/i.test(ua)) {
    return { isInApp: true, appName: 'Instagram' };
  }
  if (/Messenger|FB_IAB/i.test(ua)) {
    return { isInApp: true, appName: 'Messenger' };
  }
  if (/FBAN|FBAV/i.test(ua)) {
    return { isInApp: true, appName: 'Facebook' };
  }

  return { isInApp: false, appName: null };
}

/**
 * Detects whether the app is executing inside a standalone PWA display window.
 */
export function isStandaloneMode(): boolean {
  if (typeof window === 'undefined') return false;

  const isMediaStandalone = typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  const isNavStandalone = typeof navigator !== 'undefined' && (navigator as any).standalone === true;
  const isAndroidApp = typeof document !== 'undefined' && document.referrer.includes('android-app://');

  return Boolean(isMediaStandalone || isNavStandalone || isAndroidApp);
}

/**
 * Detects client OS platform for tailored installation instructions.
 */
export function detectPlatform(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): PlatformType {
  if (!ua || typeof ua !== 'string') return 'desktop';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

/**
 * Validates and falls back display mode according to W3C manifest specs.
 */
export function sanitizeDisplayMode(mode?: string): 'standalone' | 'minimal-ui' | 'fullscreen' | 'browser' {
  const validModes = ['standalone', 'minimal-ui', 'fullscreen', 'browser'];
  if (mode && validModes.includes(mode)) {
    return mode as any;
  }
  return 'standalone';
}
