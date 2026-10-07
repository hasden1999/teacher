// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { InstallGate } from '../src/components/common/InstallGate.js';
import { InAppEscapeModal } from '../src/components/common/InAppEscapeModal.js';
import { ToastProvider, useToast } from '../src/components/common/Toast.js';
import { BottomSheetKeypad } from '../src/components/common/BottomSheetKeypad.js';
import { OfflineBadge, DbSyncBadge } from '../src/components/common/StatusBadges.js';

// Enable React act() environment in jsdom
(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('React Component Interactive Rendering Suite', () => {
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

  describe('InstallGate Component', () => {
    it('renders children immediately when forcedDisplayMode is standalone', async () => {
      await act(async () => {
        root.render(
          <InstallGate forcedDisplayMode="standalone">
            <div id="test-child">Child Application Content</div>
          </InstallGate>
        );
      });

      expect(container.querySelector('#test-child')).not.toBeNull();
      expect(container.textContent).toContain('Child Application Content');
    });

    it('renders installation prompt modal when forcedDisplayMode is browser', async () => {
      await act(async () => {
        root.render(
          <InstallGate forcedDisplayMode="browser">
            <div id="test-child">Child Application Content</div>
          </InstallGate>
        );
      });

      expect(container.textContent).toContain('مساعد المعلم العراقي');
      expect(container.textContent).toContain('المنظومة التعليمية المستقلة');
      expect(container.textContent).toContain('المتابعة من المتصفح مؤقتاً');
    });

    it('renders iOS instructions when platform is iOS', async () => {
      const iosUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
      await act(async () => {
        root.render(
          <InstallGate forcedDisplayMode="browser" forcedUserAgent={iosUa}>
            <div>Child</div>
          </InstallGate>
        );
      });

      expect(container.textContent).toContain('طريقة التثبيت على أجهزة iPhone / iPad');
      expect(container.textContent).toContain('إضافة إلى الشاشة الرئيسية');
    });
  });

  describe('InAppEscapeModal Component', () => {
    it('returns null when user agent is standard Chrome', async () => {
      const chromeUa = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) Chrome/120.0.0.0 Mobile Safari/537.36';
      await act(async () => {
        root.render(<InAppEscapeModal userAgent={chromeUa} />);
      });

      expect(container.children.length).toBe(0);
    });

    it('renders escape modal with warning when running inside WhatsApp WebView', async () => {
      const waUa = 'Mozilla/5.0 (Linux; Android 13; Mobile; WhatsApp/2.23.20.10)';
      await act(async () => {
        root.render(<InAppEscapeModal userAgent={waUa} targetUrl="https://techeeer.app/gradebook" />);
      });

      expect(container.textContent).toContain('متصفح غير مدعوم (WhatsApp)');
      expect(container.textContent).toContain('SQLite OPFS');
      expect(container.textContent).toContain('فتح مباشرة في Google Chrome');
      expect(container.textContent).toContain('نسخ رابط المنظومة');
    });
  });

  describe('Toast System', () => {
    it('renders undo toast with 8-second countdown and executes undo callback on click', async () => {
      let undoCalled = false;

      const TestTrigger: React.FC = () => {
        const { showUndoToast } = useToast();
        return (
          <button
            id="trigger-btn"
            type="button"
            onClick={() => {
              showUndoToast({
                message: 'تمت تعبئة 50 طالباً',
                undoDurationMs: 8000,
                onUndo: () => {
                  undoCalled = true;
                },
              });
            }}
          >
            Trigger
          </button>
        );
      };

      await act(async () => {
        root.render(
          <ToastProvider>
            <TestTrigger />
          </ToastProvider>
        );
      });

      const button = container.querySelector('#trigger-btn') as HTMLButtonElement;
      expect(button).not.toBeNull();

      // Click trigger
      await act(async () => {
        button.click();
      });

      expect(container.textContent).toContain('تمت تعبئة 50 طالباً');
      expect(container.textContent).toContain('تراجع');

      // Click undo button
      const undoBtn = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.includes('تراجع'));
      expect(undoBtn).toBeDefined();

      await act(async () => {
        undoBtn?.click();
      });

      expect(undoCalled).toBe(true);
    });
  });

  describe('BottomSheetKeypad Component', () => {
    it('does not render when isOpen is false', async () => {
      await act(async () => {
        root.render(
          <BottomSheetKeypad
            isOpen={false}
            studentId="s1"
            studentName="علي حسين"
            columnTitle="الشهر الأول"
            onConfirm={vi.fn()}
            onClose={vi.fn()}
          />
        );
      });

      expect(container.children.length).toBe(0);
    });

    it('renders student info, quick presets, and handles preset clicks', async () => {
      const confirmSpy = vi.fn();
      const nextSpy = vi.fn();

      await act(async () => {
        root.render(
          <BottomSheetKeypad
            isOpen={true}
            studentId="s1"
            studentName="علي حسين"
            columnTitle="الشهر الأول"
            onConfirm={confirmSpy}
            onNext={nextSpy}
            onClose={vi.fn()}
          />
        );
      });

      expect(container.textContent).toContain('علي حسين');
      expect(container.textContent).toContain('الشهر الأول');
      expect(container.textContent).toContain('100');
      expect(container.textContent).toContain('90');
      expect(container.textContent).toContain('80');
      expect(container.textContent).toContain('50');
      expect(container.textContent).toContain('غائب');

      // Click preset 100
      const btn100 = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === '100');
      expect(btn100).toBeDefined();

      await act(async () => {
        btn100?.click();
      });

      expect(confirmSpy).toHaveBeenCalledWith({
        score: 100,
        isAbsent: false,
        studentId: 's1',
      });
      expect(nextSpy).toHaveBeenCalled();
    });

    it('handles "غائب" preset click setting isAbsent true and score 0', async () => {
      const confirmSpy = vi.fn();

      await act(async () => {
        root.render(
          <BottomSheetKeypad
            isOpen={true}
            studentId="s2"
            studentName="فاطمة أحمد"
            columnTitle="الامتحان اليومي"
            onConfirm={confirmSpy}
            onClose={vi.fn()}
          />
        );
      });

      const btnAbsent = Array.from(container.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'غائب');
      expect(btnAbsent).toBeDefined();

      await act(async () => {
        btnAbsent?.click();
      });

      expect(confirmSpy).toHaveBeenCalledWith({
        score: 0,
        isAbsent: true,
        studentId: 's2',
      });
    });
  });

  describe('Status Badges', () => {
    it('renders OfflineBadge and DbSyncBadge correctly', async () => {
      await act(async () => {
        root.render(
          <div>
            <OfflineBadge />
            <DbSyncBadge status="ready" mutationCount={3} />
          </div>
        );
      });

      expect(container.textContent).toContain('متصل');
      expect(container.textContent).toContain('محفوظ محلياً');
      expect(container.textContent).toContain('(3)');
    });
  });
});
