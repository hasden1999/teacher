// @vitest-environment jsdom
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  TodayStudio,
  formatIraqiTodayDate,
} from '../src/features/today/TodayStudio.js';
import { ToastProvider } from '../src/components/common/Toast.js';
import { AppHeader } from '../src/components/layout/AppHeader.js';
import { triggerAppInstall } from '../src/components/common/InstallGate.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('TodayStudio & Pure Mobile Header Suite (Sections 9.1 & 9.2)', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.restoreAllMocks();
  });

  describe('formatIraqiTodayDate', () => {
    it('formats dates with Iraqi month names and detects Sunday weekday correctly', () => {
      // 2026-10-25 is Sunday in October (تشرين الأول)
      const d = new Date(2026, 9, 25);
      const res = formatIraqiTodayDate(d);
      expect(res.dayName).toBe('الأحد');
      expect(res.formattedDate).toContain('الأحد');
      expect(res.formattedDate).toContain('تشرين الأول');
      expect(res.formattedDate).toContain('2026');
      expect(res.isWeekend).toBe(false);
    });

    it('detects Friday and Saturday as Iraqi school weekend', () => {
      const friday = new Date(2026, 9, 23); // Friday
      const saturday = new Date(2026, 9, 24); // Saturday
      expect(formatIraqiTodayDate(friday).isWeekend).toBe(true);
      expect(formatIraqiTodayDate(saturday).isWeekend).toBe(true);
    });
  });

  describe('TodayStudio Component', () => {
    it('renders schedule slots and opens quick daily recording modal', async () => {
      await act(async () => {
        root.render(
          <ToastProvider>
            <TodayStudio
              teacherName="علي"
              subjectName="الفيزياء"
              assignedClasses={[{ id: 'c1', label: 'الخامس العلمي (أ)', division: 'أ' }]}
            />
          </ToastProvider>
        );
      });

      expect(container.textContent).toContain('جدول حصص اليوم');
      expect(container.textContent).toContain('الحصة الأولى');
      expect(container.textContent).toContain('الحصة الثانية');
      expect(container.textContent).toContain('تسجيل الحضور');

      // Click "تسجيل الحضور" button on the first period
      const recordButtons = Array.from(container.querySelectorAll('button')).filter((b) =>
        b.textContent?.includes('تسجيل الحضور')
      );
      expect(recordButtons.length).toBeGreaterThan(0);

      await act(async () => {
        recordButtons[0].click();
      });

      // Quick Daily Recording modal should open
      expect(container.textContent).toContain('التسجيل اليومي:');
      expect(container.textContent).toContain('الحضور');
      expect(container.textContent).toContain('المشاركة');
      expect(container.textContent).toContain('الواجب');
      expect(container.textContent).toContain('حفظ واعتماد الحصة ✓');
    });

    it('opens monthly component proposals modal and displays derived values', async () => {
      await act(async () => {
        root.render(
          <ToastProvider>
            <TodayStudio
              teacherName="علي"
              subjectName="الفيزياء"
            />
          </ToastProvider>
        );
      });

      const proposalsBtn = Array.from(container.querySelectorAll('button')).find((b) =>
        b.textContent?.includes('مقترحات درجات الشهر')
      );
      expect(proposalsBtn).toBeDefined();

      await act(async () => {
        proposalsBtn?.click();
      });

      expect(container.textContent).toContain('مقترحات المكونات الشهرية المشتقة');
      expect(container.textContent).toContain('النشاط');
      expect(container.textContent).toContain('السلوك');
      expect(container.textContent).toContain('الحضور');
      expect(container.textContent).toContain('التحضير اليومي');
    });
  });

  describe('Pure Mobile Header & Install App Trigger', () => {
    it('dispatches custom event on triggerAppInstall', () => {
      const listenerSpy = vi.fn();
      window.addEventListener('techeeer:trigger-install', listenerSpy);

      triggerAppInstall();
      expect(listenerSpy).toHaveBeenCalled();

      window.removeEventListener('techeeer:trigger-install', listenerSpy);
    });

    it('renders prominent mobile install app button in AppHeader when not standalone', async () => {
      await act(async () => {
        root.render(
          <AppHeader
            currentSectionTitle="اليوم"
            teacherName="الأستاذ أحمد"
            subjectName="الفيزياء"
          />
        );
      });

      const installBtn = container.querySelector('button[aria-label="تثبيت التطبيق على الهاتف"]');
      expect(installBtn).not.toBeNull();
      expect(installBtn?.textContent).toContain('تثبيت التطبيق');
    });
  });
});
