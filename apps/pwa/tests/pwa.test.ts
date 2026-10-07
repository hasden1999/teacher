import { describe, it, expect } from 'vitest';
import {
  detectInAppBrowser,
  isStandaloneMode,
  detectPlatform,
  sanitizeDisplayMode,
} from '../src/utils/pwaDetect.js';
import { buildAndroidChromeIntent } from '../src/utils/intentUrl.js';

describe('PWA Core Infrastructure & Detection Suite', () => {
  describe('In-App Browser Detection (F02 & B02)', () => {
    it('detects WhatsApp on Android', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 13; Mobile; WhatsApp/2.23.20.10)';
      const result = detectInAppBrowser(ua);
      expect(result.isInApp).toBe(true);
      expect(result.appName).toBe('WhatsApp');
    });

    it('detects Telegram on iOS', () => {
      const ua = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) Mobile/15E148 Telegram/9.6.2';
      const result = detectInAppBrowser(ua);
      expect(result.isInApp).toBe(true);
      expect(result.appName).toBe('Telegram');
    });

    it('detects Facebook and Instagram webviews', () => {
      const fbUa = 'Mozilla/5.0 (Linux; Android 12; Mobile; FBAN/FBAV/400.0.0.0)';
      const igUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0; Instagram 250.0)';
      expect(detectInAppBrowser(fbUa).appName).toBe('Facebook');
      expect(detectInAppBrowser(igUa).appName).toBe('Instagram');
    });

    it('detects Messenger webview', () => {
      const msgUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0; Messenger 380.0)';
      expect(detectInAppBrowser(msgUa).appName).toBe('Messenger');
    });

    it('handles empty User-Agent gracefully (B02 boundary)', () => {
      expect(detectInAppBrowser('').isInApp).toBe(false);
      expect(detectInAppBrowser('').appName).toBeNull();
    });

    it('handles spoofed UA containing both Telegram and Chrome (B02 boundary)', () => {
      const ua = 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/118.0 Telegram/9.6.2 Mobile';
      const result = detectInAppBrowser(ua);
      expect(result.isInApp).toBe(true);
      expect(result.appName).toBe('Telegram');
    });

    it('returns false for standard Chrome and Safari', () => {
      const chromeUa = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36';
      const safariUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1';
      expect(detectInAppBrowser(chromeUa).isInApp).toBe(false);
      expect(detectInAppBrowser(safariUa).isInApp).toBe(false);
    });
  });

  describe('Android Chrome Intent Builder (F02 & B02)', () => {
    it('constructs standard Android Chrome intent URL', () => {
      const url = 'https://techeeer.app/gradebook';
      const intent = buildAndroidChromeIntent(url);
      expect(intent).toBe('intent://techeeer.app/gradebook#Intent;scheme=https;package=com.android.chrome;end');
    });

    it('encodes special and Arabic query parameters safely (B02 boundary)', () => {
      const url = 'https://techeeer.app/exam?subject=كيمياء&grade=5';
      const intent = buildAndroidChromeIntent(url);
      expect(intent).toContain('subject=%D9%83%D9%8A%D9%85%D9%8A%D8%A7%D8%A1');
      expect(intent).toContain('package=com.android.chrome');
    });
  });

  describe('Platform & Standalone Mode Detection', () => {
    it('identifies iOS and Android user agents', () => {
      expect(detectPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)')).toBe('ios');
      expect(detectPlatform('Mozilla/5.0 (Linux; Android 13; SM-G991B)')).toBe('android');
      expect(detectPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('desktop');
    });

    it('sanitizes invalid display mode with fallback to standalone (B01 boundary)', () => {
      expect(sanitizeDisplayMode('minimal-ui')).toBe('minimal-ui');
      expect(sanitizeDisplayMode('invalid-mode')).toBe('standalone');
      expect(sanitizeDisplayMode(undefined)).toBe('standalone');
    });

    it('detects standalone mode across matchMedia and navigator.standalone', () => {
      const originalWindowDesc = Object.getOwnPropertyDescriptor(globalThis, 'window');
      const originalNavDesc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');

      try {
        // Test media match standalone
        Object.defineProperty(globalThis, 'window', {
          value: {
            matchMedia: (query: string) => ({
              matches: query.includes('display-mode: standalone'),
            }),
          },
          configurable: true,
          writable: true,
        });
        expect(isStandaloneMode()).toBe(true);

        // Test navigator.standalone (iOS)
        Object.defineProperty(globalThis, 'window', {
          value: {
            matchMedia: () => ({ matches: false }),
          },
          configurable: true,
          writable: true,
        });
        Object.defineProperty(globalThis, 'navigator', {
          value: { standalone: true },
          configurable: true,
          writable: true,
        });
        expect(isStandaloneMode()).toBe(true);
      } finally {
        if (originalWindowDesc) {
          Object.defineProperty(globalThis, 'window', originalWindowDesc);
        } else {
          delete (globalThis as any).window;
        }
        if (originalNavDesc) {
          Object.defineProperty(globalThis, 'navigator', originalNavDesc);
        } else {
          delete (globalThis as any).navigator;
        }
      }
    });
  });
});
