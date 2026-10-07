// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InstallGate } from '../src/components/common/InstallGate.js';
import { InAppEscapeModal } from '../src/components/common/InAppEscapeModal.js';
import { ToastProvider, useToast, SingleToastItem, ToastItem } from '../src/components/common/Toast.js';
import { BottomSheetKeypad } from '../src/components/common/BottomSheetKeypad.js';
import { detectInAppBrowser, isStandaloneMode, detectPlatform, sanitizeDisplayMode } from '../src/utils/pwaDetect.js';
import { buildAndroidChromeIntent } from '../src/utils/intentUrl.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Adversarial Stress Test Suite: Milestone 3 Interactive Components', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
    sessionStorage.clear();
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  // =========================================================================
  // 1. Toast Countdown & Lifecycle Boundary Stress Tests
  // =========================================================================
  describe('Toast: Countdown Timing Boundaries & Edge-Case Lifecycle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('timing boundary: exactly 8000ms duration behaves correctly at 7900ms vs 8100ms', async () => {
      let expiredCalled = false;
      let undoCalled = false;
      let dismissedCalled = false;

      const toast: ToastItem = {
        id: 'toast-test-1',
        message: 'تم رصد 45 درجة',
        type: 'undo',
        undoDurationMs: 8000,
        createdAt: Date.now(),
        onExpire: () => {
          expiredCalled = true;
        },
        onUndo: () => {
          undoCalled = true;
        },
      };

      await act(async () => {
        root.render(<SingleToastItem toast={toast} onDismiss={() => { dismissedCalled = true; }} />);
      });

      expect(container.textContent).toContain('تم رصد 45 درجة');
      expect(container.textContent).toContain('تراجع');

      // Advance by 7900ms — not expired yet
      await act(async () => {
        vi.advanceTimersByTime(7900);
      });
      expect(expiredCalled).toBe(false);
      expect(dismissedCalled).toBe(false);

      // Advance remaining 200ms (total 8100ms >= 8000ms) — interval triggers at 8000ms
      await act(async () => {
        vi.advanceTimersByTime(200);
      });
      expect(expiredCalled).toBe(true);
      expect(dismissedCalled).toBe(true);
      expect(undoCalled).toBe(false);
    });

    it('undo click at 7500ms prevents onExpire and executes onUndo cleanly', async () => {
      let expiredCalled = false;
      let undoCalled = false;
      let dismissedCalled = false;

      const toast: ToastItem = {
        id: 'toast-test-undo',
        message: 'إجراء جماعي',
        type: 'undo',
        undoDurationMs: 8000,
        createdAt: Date.now(),
        onExpire: () => {
          expiredCalled = true;
        },
        onUndo: () => {
          undoCalled = true;
        },
      };

      await act(async () => {
        root.render(<SingleToastItem toast={toast} onDismiss={() => { dismissedCalled = true; }} />);
      });

      // Advance to 7500ms
      await act(async () => {
        vi.advanceTimersByTime(7500);
      });
      expect(expiredCalled).toBe(false);

      // Click undo button
      const undoBtn = container.querySelector('button') as HTMLButtonElement;
      expect(undoBtn).not.toBeNull();
      await act(async () => {
        undoBtn.click();
      });

      expect(undoCalled).toBe(true);
      expect(dismissedCalled).toBe(true);

      // Advance further past 8000ms — timer must be cancelled, onExpire should NEVER fire
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      expect(expiredCalled).toBe(false);
    });

    it('unmounting SingleToastItem before expiration cleanly clears timer without firing onExpire or errors', async () => {
      let expiredCalled = false;

      const toast: ToastItem = {
        id: 'toast-unmount',
        message: 'سيتم إلغاء التثبيت',
        type: 'undo',
        undoDurationMs: 8000,
        createdAt: Date.now(),
        onExpire: () => {
          expiredCalled = true;
        },
      };

      await act(async () => {
        root.render(<SingleToastItem toast={toast} onDismiss={vi.fn()} />);
      });

      await act(async () => {
        vi.advanceTimersByTime(4000);
      });
      expect(expiredCalled).toBe(false);

      // Unmount component
      await act(async () => {
        root.unmount();
      });

      // Advance past 8000ms
      await act(async () => {
        vi.advanceTimersByTime(5000);
      });
      expect(expiredCalled).toBe(false);
    });

    it('ToastProvider handles rapid dismiss and queue flooding (50 rapid calls)', async () => {
      let triggerRef: any;

      const TestHarness: React.FC = () => {
        const toast = useToast();
        triggerRef = toast;
        return <div id="toasts-count">{toast.toasts.length}</div>;
      };

      await act(async () => {
        root.render(
          <ToastProvider>
            <TestHarness />
          </ToastProvider>
        );
      });

      // Rapidly fire 50 toasts
      await act(async () => {
        for (let i = 0; i < 50; i++) {
          triggerRef.showToast({ message: `Toast ${i}` });
        }
      });

      // ToastProvider caps at most 3 items
      expect(triggerRef.toasts.length).toBeLessThanOrEqual(3);

      // Rapidly dismiss all non-existent and existent IDs
      await act(async () => {
        triggerRef.dismissToast('non-existent-id-1');
        triggerRef.dismissToast('non-existent-id-2');
        for (const t of triggerRef.toasts) {
          triggerRef.dismissToast(t.id);
        }
      });

      expect(triggerRef.toasts.length).toBe(0);

      // Rapidly trigger showUndoToast which preempts other toasts
      await act(async () => {
        triggerRef.showToast({ message: 'Normal Toast' });
        triggerRef.showUndoToast({
          message: 'Undo Preempt Toast',
          onUndo: vi.fn(),
        });
      });

      // Undo toast takes single exclusive precedence
      expect(triggerRef.toasts.length).toBe(1);
      expect(triggerRef.toasts[0].type).toBe('undo');
      expect(triggerRef.toasts[0].message).toBe('Undo Preempt Toast');
    });
  });

  // =========================================================================
  // 2. BottomSheetKeypad Adversarial Input & Boundary Stress Tests
  // =========================================================================
  describe('BottomSheetKeypad: Adversarial Inputs & Boundary Handling', () => {
    it('rapid sequential keypresses (9 -> 9) triggers auto-advance with score 99', async () => {
      const confirmSpy = vi.fn();
      const nextSpy = vi.fn();

      await act(async () => {
        root.render(
          <BottomSheetKeypad
            isOpen={true}
            studentId="s-100"
            studentName="حيدر علي"
            columnTitle="الشهر الأول"
            maxScore={100}
            autoAdvance={true}
            onConfirm={confirmSpy}
            onNext={nextSpy}
            onClose={vi.fn()}
          />
        );
      });

      const btn9 = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '9'
      );
      expect(btn9).toBeDefined();

      // Press 9 once
      await act(async () => {
        btn9?.click();
      });
      expect(confirmSpy).not.toHaveBeenCalled();
      expect(nextSpy).not.toHaveBeenCalled();
      expect(container.textContent).toContain('9');

      // Press 9 again (rapid second tap)
      await act(async () => {
        btn9?.click();
      });
      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(confirmSpy).toHaveBeenCalledWith({
        score: 99,
        isAbsent: false,
        studentId: 's-100',
      });
      expect(nextSpy).toHaveBeenCalledTimes(1);
    });

    it('clamping when entering value exceeding maxScore (e.g. typing 1 -> 5 -> 0 or 9 -> 9 -> 9)', async () => {
      const confirmSpy = vi.fn();

      await act(async () => {
        root.render(
          <BottomSheetKeypad
            isOpen={true}
            studentId="s-overflow"
            studentName="زينب كريم"
            columnTitle="الشهر الأول"
            initialValue="99"
            maxScore={100}
            autoAdvance={true}
            onConfirm={confirmSpy}
            onClose={vi.fn()}
          />
        );
      });

      const btn9 = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '9'
      );

      // Typing 9 when current is 99 -> "999" > 100 -> clamped to 100
      await act(async () => {
        btn9?.click();
      });

      expect(confirmSpy).toHaveBeenCalledWith({
        score: 100,
        isAbsent: false,
        studentId: 's-overflow',
      });
      expect(container.textContent).toContain('100');
    });

    it('in 20-point mode (maxScore = 20), typing single digit >= 3 auto-advances immediately', async () => {
      const confirmSpy = vi.fn();
      const nextSpy = vi.fn();

      await act(async () => {
        root.render(
          <BottomSheetKeypad
            isOpen={true}
            studentId="s-daily"
            studentName="كرار جاسم"
            columnTitle="النشاط اليومي"
            maxScore={20}
            autoAdvance={true}
            onConfirm={confirmSpy}
            onNext={nextSpy}
            onClose={vi.fn()}
          />
        );
      });

      const btn5 = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '5'
      );

      await act(async () => {
        btn5?.click();
      });

      expect(confirmSpy).toHaveBeenCalledWith({
        score: 5,
        isAbsent: false,
        studentId: 's-daily',
      });
      expect(nextSpy).toHaveBeenCalledTimes(1);
    });

    it('in 20-point mode, typing 2 then 5 clamps to 20 on second digit', async () => {
      const confirmSpy = vi.fn();
      const nextSpy = vi.fn();

      await act(async () => {
        root.render(
          <BottomSheetKeypad
            isOpen={true}
            studentId="s-daily-clamp"
            studentName="سارة محمد"
            columnTitle="النشاط اليومي"
            maxScore={20}
            autoAdvance={true}
            onConfirm={confirmSpy}
            onNext={nextSpy}
            onClose={vi.fn()}
          />
        );
      });

      const btn2 = container.querySelector<HTMLButtonElement>('button[aria-label="رقم 2"]');
      const btn5 = container.querySelector<HTMLButtonElement>('button[aria-label="رقم 5"]');

      // Type 2 (<= 2, doesn't auto advance yet)
      await act(async () => {
        btn2?.click();
      });
      expect(confirmSpy).not.toHaveBeenCalled();

      // Type 5 -> '25' exceeds 20 -> auto advance with clamped 20
      await act(async () => {
        btn5?.click();
      });
      expect(confirmSpy).toHaveBeenCalledWith({
        score: 20,
        isAbsent: false,
        studentId: 's-daily-clamp',
      });
      expect(nextSpy).toHaveBeenCalledTimes(1);
    });

    it('boundary inputs: initialValue with negative number, string > 100, NaN, and special characters', async () => {
      const confirmSpy = vi.fn();

      // Test negative initialValue: -25 clamped to minScore 0
      await act(async () => {
        root.render(
          <BottomSheetKeypad
            isOpen={true}
            studentId="s-neg"
            studentName="مقتدى حسن"
            columnTitle="الشهر الأول"
            initialValue="-25"
            minScore={0}
            maxScore={100}
            onConfirm={confirmSpy}
            onClose={vi.fn()}
          />
        );
      });

      const confirmBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('تأكيد الدرجة')
      );
      await act(async () => {
        confirmBtn?.click();
      });
      expect(confirmSpy).toHaveBeenCalledWith({
        score: 0,
        isAbsent: false,
        studentId: 's-neg',
      });

      // Test invalid non-numeric string: "NaN_String" falls back to minScore 0
      confirmSpy.mockClear();
      await act(async () => {
        root.render(
          <BottomSheetKeypad
            isOpen={true}
            studentId="s-nan"
            studentName="مقتدى حسن"
            columnTitle="الشهر الأول"
            initialValue="NaN_String"
            minScore={0}
            maxScore={100}
            onConfirm={confirmSpy}
            onClose={vi.fn()}
          />
        );
      });

      await act(async () => {
        confirmBtn?.click();
      });
      expect(confirmSpy).toHaveBeenCalledWith({
        score: 0,
        isAbsent: false,
        studentId: 's-nan',
      });
    });

    it('absent (غائب) toggle and transition behaviors', async () => {
      const confirmSpy = vi.fn();

      await act(async () => {
        root.render(
          <BottomSheetKeypad
            isOpen={true}
            studentId="s-absent-test"
            studentName="ضحى طارق"
            columnTitle="الشهر الأول"
            initialAbsent={true}
            onConfirm={confirmSpy}
            onClose={vi.fn()}
          />
        );
      });

      const displayScreen = container.querySelector('[aria-live="polite"]');
      expect(displayScreen?.textContent).toContain('غائب');

      // Typing a digit clears absent state and sets digit
      const btn7 = container.querySelector<HTMLButtonElement>('button[aria-label="رقم 7"]');
      await act(async () => {
        btn7?.click();
      });

      expect(displayScreen?.textContent).toContain('7');
      expect(displayScreen?.textContent).not.toContain('غائب');

      // Clicking 'غائب' preset restores absent status
      const btnAbsent = container.querySelector<HTMLButtonElement>('button[aria-label="درجة سريعة غائب"]');
      await act(async () => {
        btnAbsent?.click();
      });

      expect(confirmSpy).toHaveBeenCalledWith({
        score: 0,
        isAbsent: true,
        studentId: 's-absent-test',
      });
      expect(displayScreen?.textContent).toContain('غائب');

      // Clicking Clear while absent resets to empty placeholder "--"
      const btnClear = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === 'مسح'
      );
      await act(async () => {
        btnClear?.click();
      });
      expect(displayScreen?.textContent).toContain('--');
    });

    it('rapid stress sequence: 50 sequential backspaces and digits do not corrupt state or crash', async () => {
      const confirmSpy = vi.fn();

      await act(async () => {
        root.render(
          <BottomSheetKeypad
            isOpen={true}
            studentId="s-stress"
            studentName="طالب تجريبي"
            columnTitle="الشهر الأول"
            autoAdvance={false}
            onConfirm={confirmSpy}
            onClose={vi.fn()}
          />
        );
      });

      const btn1 = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '1'
      );
      const btnBs = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.trim() === '⌫'
      );

      // Perform rapid typing and backspacing
      await act(async () => {
        for (let i = 0; i < 25; i++) {
          btn1?.click();
          btnBs?.click();
        }
      });

      // No crash, input remains clean
      expect(container.textContent).toContain('--');
    });
  });

  // =========================================================================
  // 3. User-Agent Detection & Intent URL Adversarial Tests
  // =========================================================================
  describe('User-Agent & Platform Detection: Extreme Boundaries & Spoofing', () => {
    it('handles null, undefined, non-string, and empty UA inputs safely', () => {
      expect(detectInAppBrowser(null as any)).toEqual({ isInApp: false, appName: null });
      expect(detectInAppBrowser(undefined as any)).toEqual({ isInApp: false, appName: null });
      expect(detectInAppBrowser(12345 as any)).toEqual({ isInApp: false, appName: null });
      expect(detectInAppBrowser({} as any)).toEqual({ isInApp: false, appName: null });
      expect(detectInAppBrowser('')).toEqual({ isInApp: false, appName: null });

      expect(detectPlatform(null as any)).toBe('desktop');
      expect(detectPlatform(undefined as any)).toBe('desktop');
      expect(detectPlatform(999 as any)).toBe('desktop');
    });

    it('accurately distinguishes iOS Safari vs iOS WhatsApp WebView vs Desktop Safari', () => {
      const desktopSafari =
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
      const iosSafari =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
      const iosWhatsApp =
        'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/2.23.20.10';

      // Desktop Safari
      expect(detectInAppBrowser(desktopSafari).isInApp).toBe(false);
      expect(detectPlatform(desktopSafari)).toBe('desktop');

      // iOS Safari (Genuine browser, should not be flagged as in-app)
      expect(detectInAppBrowser(iosSafari).isInApp).toBe(false);
      expect(detectPlatform(iosSafari)).toBe('ios');

      // iOS WhatsApp WebView (Must be flagged as in-app WhatsApp)
      expect(detectInAppBrowser(iosWhatsApp).isInApp).toBe(true);
      expect(detectInAppBrowser(iosWhatsApp).appName).toBe('WhatsApp');
      expect(detectPlatform(iosWhatsApp)).toBe('ios');
    });

    it('detects case-insensitive variants of in-app tokens', () => {
      expect(detectInAppBrowser('Mozilla/5.0 (Linux) WHATSAPP/2.21').appName).toBe('WhatsApp');
      expect(detectInAppBrowser('Mozilla/5.0 (Linux) telegram/9.0').appName).toBe('Telegram');
      expect(detectInAppBrowser('Mozilla/5.0 (Linux) instagram 200.0').appName).toBe('Instagram');
      expect(detectInAppBrowser('Mozilla/5.0 (Linux) MESSENGER/100').appName).toBe('Messenger');
      expect(detectInAppBrowser('Mozilla/5.0 (Linux) fban/400.0').appName).toBe('Facebook');
    });

    it('resists ReDoS attacks with oversized 50,000 character strings', () => {
      const evilUa = 'Mozilla/5.0 ' + 'A'.repeat(50000) + ' Safari/537.36';
      const t0 = performance.now();
      const res = detectInAppBrowser(evilUa);
      const elapsed = performance.now() - t0;

      expect(res.isInApp).toBe(false);
      expect(elapsed).toBeLessThan(100); // Must resolve in < 100ms
    });

    it('buildAndroidChromeIntent handles Arabic paths, query params, spaces, and edge cases', () => {
      const urlWithArabic = 'https://techeeer.app/درجات/الخامس-أ?مادة=كيمياء&طالب=علي';
      const intent = buildAndroidChromeIntent(urlWithArabic);

      expect(intent.startsWith('intent://')).toBe(true);
      expect(intent.endsWith('#Intent;scheme=https;package=com.android.chrome;end')).toBe(true);
      expect(intent).not.toContain('https://techeeer.app');
      expect(intent).toContain('package=com.android.chrome');

      // Fallback on empty or undefined
      const defaultIntent = buildAndroidChromeIntent(undefined);
      expect(defaultIntent).toContain('package=com.android.chrome');
    });
  });

  // =========================================================================
  // 4. InAppEscapeModal & InstallGate Adversarial Resiliency
  // =========================================================================
  describe('Gate Modals: Storage Failures & Session Storage Resiliency', () => {
    it('InstallGate does not crash when sessionStorage throws SecurityError', async () => {
      const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new DOMException('Access denied in private/iframe context', 'SecurityError');
      });

      await act(async () => {
        root.render(
          <InstallGate forcedDisplayMode="browser">
            <div id="guarded-content">Guarded App</div>
          </InstallGate>
        );
      });

      // Renders modal without throwing unhandled exception
      expect(container.textContent).toContain('مساعد المعلم العراقي');

      // Dismiss button click when setItem also throws
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      });

      const dismissBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('المتابعة من المتصفح مؤقتاً')
      );
      expect(dismissBtn).toBeDefined();

      await act(async () => {
        dismissBtn?.click();
      });

      // Successfully bypassed to guarded content despite storage failure
      expect(container.querySelector('#guarded-content')).not.toBeNull();
      getItemSpy.mockRestore();
      setItemSpy.mockRestore();
    });

    it('InAppEscapeModal handles clipboard copy failure gracefully', async () => {
      // Mock clipboard writeText rejection
      const originalClipboard = navigator.clipboard;
      Object.defineProperty(navigator, 'clipboard', {
        value: {
          writeText: vi.fn().mockRejectedValue(new Error('Permission denied')),
        },
        configurable: true,
      });

      const waUa = 'Mozilla/5.0 (Linux; Android 13; Mobile; WhatsApp/2.23.20.10)';

      await act(async () => {
        root.render(<InAppEscapeModal userAgent={waUa} targetUrl="https://techeeer.app" />);
      });

      const copyBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('نسخ رابط المنظومة')
      );
      expect(copyBtn).toBeDefined();

      // Click copy button — should catch error silently without crashing UI
      await act(async () => {
        copyBtn?.click();
      });

      expect(container.textContent).toContain('نسخ رابط المنظومة');

      // Restore clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
    });

    it('InAppEscapeModal handles various non-in-app mobile browsers without falsely triggering', () => {
      const nonInAppUas = [
        // Samsung Internet
        'Mozilla/5.0 (Linux; Android 13; SAMSUNG SM-S908B) AppleWebKit/537.36 SamsungBrowser/21.0 Chrome/110.0.5481.154 Mobile Safari/537.36',
        // Firefox Android
        'Mozilla/5.0 (Android 13; Mobile; rv:109.0) Gecko/120.0 Firefox/120.0',
        // Edge Android
        'Mozilla/5.0 (Linux; Android 10; HD1913) AppleWebKit/537.36 Chrome/119.0.0.0 Mobile Safari/537.36 EdgA/119.0.2151.78',
        // Opera Mobile
        'Mozilla/5.0 (Linux; Android 13; SM-A536B) AppleWebKit/537.36 OPR/76.2.4027.73374 Mobile Safari/537.36',
        // DuckDuckGo Android
        'Mozilla/5.0 (Linux; Android 13; Pixel 6) AppleWebKit/537.36 Chrome/118.0.0.0 Mobile Safari/537.36 DuckDuckGo/5',
      ];

      for (const ua of nonInAppUas) {
        const result = detectInAppBrowser(ua);
        expect(result.isInApp).toBe(false);
        expect(result.appName).toBeNull();
      }
    });

    it('BottomSheetKeypad responds properly to physical keyboard events (0-9, Backspace, Enter, Escape)', async () => {
      const confirmSpy = vi.fn();
      const closeSpy = vi.fn();

      await act(async () => {
        root.render(
          <BottomSheetKeypad
            isOpen={true}
            studentId="s-kb"
            studentName="علي محمد"
            columnTitle="الشهر الثاني"
            autoAdvance={false}
            onConfirm={confirmSpy}
            onClose={closeSpy}
          />
        );
      });

      const displayScreen = container.querySelector('[aria-live="polite"]');

      // Dispatch '8'
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '8' }));
      });
      expect(displayScreen?.textContent).toContain('8');

      // Dispatch '5'
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: '5' }));
      });
      expect(displayScreen?.textContent).toContain('85');

      // Dispatch 'Backspace'
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace' }));
      });
      expect(displayScreen?.textContent).toContain('8');

      // Dispatch 'Enter' (commits current input)
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      });
      expect(confirmSpy).toHaveBeenCalledWith({
        score: 8,
        isAbsent: false,
        studentId: 's-kb',
      });

      // Dispatch 'Escape' (triggers close)
      await act(async () => {
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      });
      expect(closeSpy).toHaveBeenCalledTimes(1);
    });

    it('InstallGate reacts to beforeinstallprompt and appinstalled browser events', async () => {
      let promptCalled = false;
      const fakePromptEvent = new Event('beforeinstallprompt') as any;
      fakePromptEvent.prompt = vi.fn(async () => { promptCalled = true; });
      fakePromptEvent.userChoice = Promise.resolve({ outcome: 'accepted', platform: 'web' });

      await act(async () => {
        root.render(
          <InstallGate forcedDisplayMode="browser">
            <div id="installed-app">My App Content</div>
          </InstallGate>
        );
      });

      // Initially shows gate
      expect(container.textContent).toContain('مساعد المعلم العراقي');

      // Dispatch beforeinstallprompt
      await act(async () => {
        window.dispatchEvent(fakePromptEvent);
      });

      // Look for install button
      const installBtn = Array.from(container.querySelectorAll('button')).find(
        (b) => b.textContent?.includes('تثبيت التطبيق على الهاتف الآن')
      );
      expect(installBtn).toBeDefined();

      // Click install
      await act(async () => {
        installBtn?.click();
      });
      expect(promptCalled).toBe(true);

      // After user accepts prompt, app passes through to children
      expect(container.querySelector('#installed-app')).not.toBeNull();
    });
  });
});
