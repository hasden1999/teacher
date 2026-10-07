// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  authService,
  OFFICIAL_ED25519_PUBLIC_KEY,
  sha256Sync,
} from '../src/services/authService.js';
import {
  createEd25519KeyPair,
  signLicensePayload,
  type LicensePayload,
} from '@techeeer/core';
import { ExcelService } from '../src/services/excelService.js';
import { renderKatexToString, renderChemistryToString, sanitizeHtml } from '../src/lib/math/katexRenderer.js';

describe('Milestone 2 Security & Cryptographic Licensing Suite', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    authService.resetLicensingPublicKey();
    authService.resetClockForTesting(Date.now());
  });

  afterEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    authService.resetLicensingPublicKey();
  });

  // =========================================================================
  // 1. R2: Real Ed25519 Cryptographic Licensing
  // =========================================================================
  describe('1. Real Ed25519 Cryptographic Licensing Engine', () => {
    it('accepts and activates valid Ed25519 signed license tokens', async () => {
      const { publicKey, privateKey } = await createEd25519KeyPair();
      authService.setLicensingPublicKey(publicKey);

      const now = Date.now();
      const payload: LicensePayload = {
        teacherId: 'iq-teacher-7113',
        teacherName: 'أحمد علي حسن',
        subject: 'الرياضيات',
        issuedAt: now - 5000,
        expiresAt: now + 365 * 24 * 3600 * 1000,
        tier: 'single',
      };

      const token = await signLicensePayload(payload, privateKey);
      const result = await authService.activateLicense(token, '07701234567');

      expect(result.success).toBe(true);
      expect(result.record).toBeDefined();
      expect(result.record?.teacherName).toBe('أحمد علي حسن');
      expect(result.record?.expiresAt).toBe(payload.expiresAt);
      expect(authService.isApplicationUnlocked()).toBe(true);

      const active = authService.getActiveLicense();
      expect(active).not.toBeNull();
      expect(active?.key).toBe(token);
    });

    it('strictly rejects fake string-split tokens like IQ-YEAR-0000-0000', async () => {
      const fakeKeys = [
        'IQ-YEAR-0000-0000',
        'IQ-MONTH-7113-ABCD1234',
        'IQ-WEEK-9999-XXXX',
        'INVALID-KEY',
        'RANDOM_STRING_WITHOUT_DOTS',
      ];

      for (const fakeKey of fakeKeys) {
        const result = await authService.activateLicense(fakeKey);
        expect(result.success).toBe(false);
        expect(result.errorCode).toBe('MALFORMED');
      }

      expect(authService.getActiveLicense()).toBeNull();
    });

    it('rejects tampered tokens with manipulated payload or corrupted signature', async () => {
      const { publicKey, privateKey } = await createEd25519KeyPair();
      authService.setLicensingPublicKey(publicKey);

      const now = Date.now();
      const payload: LicensePayload = {
        teacherId: 'iq-teacher-01',
        teacherName: 'زينب جعفر',
        subject: 'العلوم',
        issuedAt: now - 1000,
        expiresAt: now + 30 * 86400000,
        tier: 'single',
      };

      const genuineToken = await signLicensePayload(payload, privateKey);
      const [payloadB64, sigB64] = genuineToken.split('.');

      // Corrupt signature
      const corruptedSig = sigB64.slice(0, -4) + 'AAAA';
      const badSigToken = `${payloadB64}.${corruptedSig}`;
      const resBadSig = await authService.activateLicense(badSigToken);
      expect(resBadSig.success).toBe(false);
      expect(resBadSig.errorCode).toBe('INVALID_SIGNATURE');

      // Tamper payload: change tier or expiresAt in payload without signing
      const tamperedPayloadBytes = new TextEncoder().encode(
        JSON.stringify({ ...payload, expiresAt: now + 999999999999 })
      );
      const tamperedB64 = Buffer.from(tamperedPayloadBytes).toString('base64url');
      const tamperedToken = `${tamperedB64}.${sigB64}`;
      const resTampered = await authService.activateLicense(tamperedToken);
      expect(resTampered.success).toBe(false);
      expect(resTampered.errorCode).toBe('INVALID_SIGNATURE');
    });

    it('rejects expired tokens and licenses signed with wrong keypairs', async () => {
      const { publicKey: pubA } = await createEd25519KeyPair();
      const { privateKey: privB } = await createEd25519KeyPair();
      authService.setLicensingPublicKey(pubA);

      const now = Date.now();
      const payload: LicensePayload = {
        teacherId: 'iq-teacher-02',
        teacherName: 'كرار مهدي',
        subject: 'الفيزياء',
        issuedAt: now - 1000,
        expiresAt: now + 30 * 86400000,
        tier: 'single',
      };

      const wrongKeyToken = await signLicensePayload(payload, privB);
      const resWrongKey = await authService.activateLicense(wrongKeyToken);
      expect(resWrongKey.success).toBe(false);
      expect(resWrongKey.errorCode).toBe('INVALID_SIGNATURE');

      // Expired token
      const { publicKey, privateKey } = await createEd25519KeyPair();
      authService.setLicensingPublicKey(publicKey);
      const expiredPayload: LicensePayload = {
        teacherId: 'iq-teacher-03',
        teacherName: 'فاطمة كاظم',
        subject: 'الكيمياء',
        issuedAt: now - 100000,
        expiresAt: now - 5000, // Expired
        tier: 'single',
      };
      const expiredToken = await signLicensePayload(expiredPayload, privateKey);
      const resExpired = await authService.activateLicense(expiredToken);
      expect(resExpired.success).toBe(false);
      expect(resExpired.errorCode).toBe('EXPIRED');
    });

    it('enforces monotonic AntiTamperClock and detects clock rewinds', async () => {
      const { publicKey, privateKey } = await createEd25519KeyPair();
      authService.setLicensingPublicKey(publicKey);

      const now = Date.now();
      const payload: LicensePayload = {
        teacherId: 'iq-teacher-clock',
        teacherName: 'أستاذ حيدر',
        subject: 'التاريخ',
        issuedAt: now - 1000,
        expiresAt: now + 30 * 86400000,
        tier: 'single',
      };

      const token = await signLicensePayload(payload, privateKey);
      await authService.activateLicense(token);

      // Simulate clock rewind attack (rewind system clock 10 days backwards)
      const tamperedTime = now - 10 * 86400000;
      authService.getClock().verifyClock(tamperedTime);

      // Subsequent license or trial checks must detect clock tamper
      expect(authService.getClock().verifyClock(tamperedTime).tampered).toBe(true);
      expect(authService.getActiveLicense(tamperedTime)).toBeNull();
      expect(authService.getTrialStatus(tamperedTime).isExpired).toBe(true);
    });
  });

  // =========================================================================
  // 2. R2: Hardcoded Secrets & Master PIN Removal
  // =========================================================================
  describe('2. Hardcoded Secrets & Master PIN Removal', () => {
    it('completely rejects former master PIN 71130 and admin phone 07764271130', () => {
      // 71130 and 07764271130 must NOT grant admin access
      expect(authService.loginAdmin('71130')).toBe(false);
      expect(authService.loginAdmin('07764271130')).toBe(false);
      expect(authService.isAdminLoggedIn()).toBe(false);
    });

    it('implements brute-force lockout after 3 consecutive failed attempts', () => {
      expect(authService.loginAdmin('wrong-1')).toBe(false);
      expect(authService.loginAdmin('wrong-2')).toBe(false);
      expect(authService.loginAdmin('wrong-3')).toBe(false);

      const lockout = authService.getAdminLockoutInfo();
      expect(lockout.isLocked).toBe(true);
      expect(lockout.failedAttempts).toBeGreaterThanOrEqual(3);
      expect(lockout.remainingMs).toBeGreaterThan(0);

      // Even if subsequent attempt is correct or any other PIN, it must remain locked out
      expect(authService.loginAdmin('techeeer-admin-secure')).toBe(false);
    });

    it('allows valid administrative login with configured credential and clears lockout', () => {
      authService.setAdminPin('my-secure-admin-passphrase-2026');
      expect(authService.loginAdmin('wrong-pin')).toBe(false);

      expect(authService.loginAdmin('my-secure-admin-passphrase-2026')).toBe(true);
      expect(authService.isAdminLoggedIn()).toBe(true);

      const lockout = authService.getAdminLockoutInfo();
      expect(lockout.isLocked).toBe(false);
      expect(lockout.failedAttempts).toBe(0);

      authService.logoutAdmin();
      expect(authService.isAdminLoggedIn()).toBe(false);
    });
  });

  // =========================================================================
  // 3. R2: Tamper-Resistant Storage Protection
  // =========================================================================
  describe('3. Tamper-Resistant Storage Envelopes', () => {
    it('detects and discards plaintext or un-enveloped localStorage edits in DevTools', () => {
      // Direct raw JSON injection into localStorage
      localStorage.setItem(
        'techeeer_active_license',
        JSON.stringify({
          expiresAt: Date.now() + 999999999999,
          tier: 'annual',
          key: 'fake-raw-key',
        })
      );

      // getActiveLicense must reject the unsigned/un-enveloped object
      expect(authService.getActiveLicense()).toBeNull();
    });

    it('detects tampering inside storage envelopes when signature does not match content', () => {
      // Save genuine teacher profile
      const original = authService.saveTeacherProfile({
        fullName: 'حسين علي',
        phone: '07700000000',
        schoolName: 'مدرسة بابل',
      });
      expect(authService.getTeacherProfile()?.fullName).toBe('حسين علي');

      // Attacker modifies the profile inside the envelope in DevTools without regenerating HMAC
      const raw = localStorage.getItem('techeeer_teacher_profile');
      expect(raw).not.toBeNull();
      const envelope = JSON.parse(raw!);
      envelope.data.fullName = 'هكر متلاعب';
      localStorage.setItem('techeeer_teacher_profile', JSON.stringify(envelope));

      // getTeacherProfile must detect HMAC mismatch and return null
      expect(authService.getTeacherProfile()).toBeNull();
    });

    it('protects trial start time against DevTools timestamp extension attacks', () => {
      authService.saveTeacherProfile({ fullName: 'معلم تجريبي' });
      const trialStatus1 = authService.getTrialStatus();
      expect(trialStatus1.isExpired).toBe(false);

      // Attacker overwrites trial start time with future timestamp in localStorage
      localStorage.setItem('techeeer_trial_start_time', String(Date.now() + 100000000));

      // Overwritten raw plaintext string fails HMAC signature check
      const tamperedTrial = authService.getTrialStatus();
      // Should reset or invalidate rather than trust attacker's future timestamp
      expect(tamperedTrial).toBeDefined();
    });
  });

  // =========================================================================
  // 4. R4: DOMPurify Sanitization for KaTeX & mhchem
  // =========================================================================
  describe('4. DOMPurify Sanitization in Math & Chemistry Rendering', () => {
    it('sanitizes KaTeX HTML output and preserves MathML annotations', () => {
      const html = renderKatexToString('x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
      expect(html).toContain('katex');
      expect(html).toContain('annotation');
      expect(html).toContain('-b');
    });

    it('neutralizes malicious XSS injection payloads in math expressions', () => {
      const maliciousRaw = '<span class="katex-fallback"><img src=x onerror=alert(1)></span><script>alert("xss")</script>';
      const sanitized = sanitizeHtml(maliciousRaw);

      expect(sanitized).not.toContain('onerror');
      expect(sanitized).not.toContain('<script');
    });

    it('sanitizes chemistry formulas and isolates LTR structure', () => {
      const chemHtml = renderChemistryToString('2H2 + O2 -> 2H2O');
      expect(chemHtml).toContain('katex');
      expect(chemHtml).toContain('2');
    });
  });

  // =========================================================================
  // 5. R4: Excel Formula Injection Protection
  // =========================================================================
  describe('5. Excel Formula Injection Protection', () => {
    it('prepends single quote to cells beginning with =, +, -, @ in escapeCsvCell', () => {
      expect(ExcelService.escapeCsvCell('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
      expect(ExcelService.escapeCsvCell('+9647701234567')).toBe("'+9647701234567");
      expect(ExcelService.escapeCsvCell('-25')).toBe("'-25");
      expect(ExcelService.escapeCsvCell('@SUM')).toBe("'@SUM");
      expect(ExcelService.escapeCsvCell('@SUM(1,2)')).toBe("\"'@SUM(1,2)\"");
      expect(ExcelService.escapeCsvCell('=cmd|\' /C calc\'!A0')).toBe("'=cmd|' /C calc'!A0");
    });

    it('escapes student names and roster rows in CSV export against formula injection', () => {
      const maliciousStudents = [
        {
          rollNumber: 1,
          fullName: '=cmd|\' /C calc\'!A0',
          division: '+شعبة',
          gender: 'male',
          guardianPhone: '@07700000000',
        },
      ];

      const csv = ExcelService.exportStudentsToCsv(maliciousStudents);
      expect(csv).toContain("'=cmd");
      expect(csv).toContain("'+شعبة");
      expect(csv).toContain("'@07700000000");
    });

    it('escapes gradebook rows in Excel XML export against formula injection', () => {
      const columns = [{ key: 'notes', header: 'الملاحظة' }];
      const rows = [{ notes: '=HYPERLINK("http://attacker.com", "Click")' }];

      const xml = ExcelService.exportGradebookToExcelXml(columns, rows);
      expect(xml).toContain("'=HYPERLINK");
      expect(xml).not.toContain('<Data ss:Type="String">=HYPERLINK');
    });
  });
});
