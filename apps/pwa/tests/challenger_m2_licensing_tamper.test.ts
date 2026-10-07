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

describe('Empirical Challenger 1: Milestone 2 Licensing & Storage Tamper Suite', () => {
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
  // Task 1.1: Random & Malformed License Keys Are Strictly Rejected
  // =========================================================================
  describe('1. Random & Malformed License Keys Strictly Rejected', () => {
    const maliciousAndMalformedKeys = [
      'IQ-YEAR-0000-0000',
      'IQ-YEAR-7113-ABCD',
      'IQ-MONTH-1234-5678',
      'IQ-WEEK-9999-XXXX',
      'random-string-xyz',
      'not_a_valid_token_at_all',
      'eyJhIjoxfQ', // No signature dot
      'eyJhIjoxfQ.bm90YXNpZw.extra_part', // Multiple dots
      '',
      '   ',
      '   IQ-YEAR-0000-0000   ',
      "' OR '1'='1",
      '<script>alert(1)</script>',
      '../../../../etc/passwd',
      'null',
      'undefined',
    ];

    it.each(maliciousAndMalformedKeys)(
      'strictly rejects malformed / non-Ed25519 token: "%s"',
      async (key) => {
        const result = await authService.activateLicense(key);
        expect(result.success).toBe(false);
        expect(authService.getActiveLicense()).toBeNull();
        expect(result.message).toBeDefined();
      }
    );

    it('rejects tokens with syntactically valid Base64URL payload but forged random signature', async () => {
      const now = Date.now();
      const fakePayload: LicensePayload = {
        teacherId: 'iq-hacker-001',
        teacherName: 'مخترق مزيف',
        subject: 'عام',
        issuedAt: now,
        expiresAt: now + 365 * 86400000,
        tier: 'pro',
      };

      const payloadB64 = Buffer.from(JSON.stringify(fakePayload)).toString('base64url');
      // Forged random 64-byte signature encoded as base64url
      const forgedSig = Buffer.from(new Uint8Array(64).fill(0x5a)).toString('base64url');
      const forgedToken = `${payloadB64}.${forgedSig}`;

      const result = await authService.activateLicense(forgedToken);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_SIGNATURE');
      expect(authService.getActiveLicense()).toBeNull();
    });

    it('rejects tokens signed by an unauthorized / foreign Ed25519 keypair', async () => {
      // Attacker generates their own private/public keypair
      const attackerKeyPair = await createEd25519KeyPair();
      const now = Date.now();
      const payload: LicensePayload = {
        teacherId: 'iq-rogue-001',
        teacherName: 'أستاذ غير معتمد',
        subject: 'عام',
        issuedAt: now,
        expiresAt: now + 365 * 86400000,
        tier: 'school',
      };

      // Attacker signs payload with their own private key
      const rogueToken = await signLicensePayload(payload, attackerKeyPair.privateKey);

      // Verify that default official public key rejects this token
      const result = await authService.activateLicense(rogueToken);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_SIGNATURE');
      expect(authService.getActiveLicense()).toBeNull();
    });

    it('detects payload tampering when genuine signature is paired with altered payload bytes', async () => {
      const keyPair = await createEd25519KeyPair();
      authService.setLicensingPublicKey(keyPair.publicKey);

      const now = Date.now();
      const authenticPayload: LicensePayload = {
        teacherId: 'iq-auth-123',
        teacherName: 'أستاذ حقيقي',
        subject: 'رياضيات',
        issuedAt: now,
        expiresAt: now + 7 * 86400000, // 7 days
        tier: 'single',
      };

      const genuineToken = await signLicensePayload(authenticPayload, keyPair.privateKey);
      const [genuinePayloadB64, genuineSigB64] = genuineToken.split('.');

      // Attacker alters payload to pro tier and 10-year validity
      const tamperedPayload: LicensePayload = {
        ...authenticPayload,
        tier: 'pro',
        expiresAt: now + 3650 * 86400000,
      };
      const tamperedPayloadB64 = Buffer.from(JSON.stringify(tamperedPayload)).toString('base64url');
      const tamperedToken = `${tamperedPayloadB64}.${genuineSigB64}`;

      const result = await authService.activateLicense(tamperedToken);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_SIGNATURE');
      expect(authService.getActiveLicense()).toBeNull();
    });

    it('rejects tokens with expired validity timestamp (expiresAt in the past)', async () => {
      const keyPair = await createEd25519KeyPair();
      authService.setLicensingPublicKey(keyPair.publicKey);

      const now = Date.now();
      const expiredPayload: LicensePayload = {
        teacherId: 'iq-expired-01',
        teacherName: 'أستاذ منتهي',
        subject: 'فيزياء',
        issuedAt: now - 60 * 86400000,
        expiresAt: now - 1 * 86400000, // Expired 1 day ago
        tier: 'single',
      };

      const expiredToken = await signLicensePayload(expiredPayload, keyPair.privateKey);
      const result = await authService.activateLicense(expiredToken);
      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('EXPIRED');
      expect(authService.getActiveLicense()).toBeNull();
    });

    it('rejects tokens with issuedAt timestamp in the distant future (clock skew attack)', async () => {
      const keyPair = await createEd25519KeyPair();
      authService.setLicensingPublicKey(keyPair.publicKey);

      const now = Date.now();
      const futurePayload: LicensePayload = {
        teacherId: 'iq-future-01',
        teacherName: 'أستاذ مستقبلي',
        subject: 'كيمياء',
        issuedAt: now + 3600 * 1000, // 1 hour in the future (> 60s skew limit)
        expiresAt: now + 30 * 86400000,
        tier: 'single',
      };

      const futureToken = await signLicensePayload(futurePayload, keyPair.privateKey);
      const result = await authService.activateLicense(futureToken);
      expect(result.success).toBe(false);
      expect(authService.getActiveLicense()).toBeNull();
    });
  });

  // =========================================================================
  // Task 1.2: Legacy PIN 71130 and Phone 07764271130 Fail Authentication
  // =========================================================================
  describe('2. Elimination of Backdoor Credentials & Legacy Master PIN', () => {
    it('completely rejects legacy master PIN 71130 and variations', () => {
      expect(authService.loginAdmin('71130')).toBe(false);
      expect(authService.loginAdmin(' 71130 ')).toBe(false);
      expect(authService.loginAdmin('071130')).toBe(false);
      expect(authService.isAdminLoggedIn()).toBe(false);
    });

    it('completely rejects phone number 07764271130 and variations as administrative credentials', () => {
      expect(authService.loginAdmin('07764271130')).toBe(false);
      expect(authService.loginAdmin(' 07764271130 ')).toBe(false);
      expect(authService.loginAdmin('+9647764271130')).toBe(false);
      expect(authService.loginAdmin('9647764271130')).toBe(false);
      expect(authService.isAdminLoggedIn()).toBe(false);
    });

    it('rejects support phone hotline and common default administrative passwords', () => {
      const forbiddenCredentials = [
        '07700000000',
        'admin',
        'ADMIN',
        '123456',
        '0000',
        '00000',
        'password',
        'root',
        'master',
        '',
        '   ',
        "' OR 1=1 --",
      ];

      for (const cred of forbiddenCredentials) {
        expect(authService.loginAdmin(cred)).toBe(false);
      }
      expect(authService.isAdminLoggedIn()).toBe(false);
    });

    it('verifies that ADMIN_MASTER_PIN is NOT exposed as an export or property', () => {
      expect((authService as any).ADMIN_MASTER_PIN).toBeUndefined();
      expect((window as any).ADMIN_MASTER_PIN).toBeUndefined();
    });
  });

  // =========================================================================
  // Task 1.3: Brute-Force Rate Limiting & Lockout
  // =========================================================================
  describe('3. Brute-Force Protection & Lockout Triggering', () => {
    it('triggers lockout after exactly 3 failed attempts and blocks subsequent login attempts', () => {
      expect(authService.getAdminLockoutInfo().isLocked).toBe(false);

      // Attempt 1: Failed
      const res1 = authService.loginAdmin('bad-pin-1');
      expect(res1).toBe(false);
      let lockout = authService.getAdminLockoutInfo();
      expect(lockout.isLocked).toBe(false);
      expect(lockout.failedAttempts).toBe(1);

      // Attempt 2: Failed
      const res2 = authService.loginAdmin('bad-pin-2');
      expect(res2).toBe(false);
      lockout = authService.getAdminLockoutInfo();
      expect(lockout.isLocked).toBe(false);
      expect(lockout.failedAttempts).toBe(2);

      // Attempt 3: Failed -> LOCKOUT ACTIVATED
      const res3 = authService.loginAdmin('bad-pin-3');
      expect(res3).toBe(false);
      lockout = authService.getAdminLockoutInfo();
      expect(lockout.isLocked).toBe(true);
      expect(lockout.failedAttempts).toBe(3);
      expect(lockout.remainingMs).toBeGreaterThan(0);
      expect(lockout.remainingSeconds).toBeGreaterThan(0);
      expect(lockout.remainingMinutes).toBeGreaterThanOrEqual(1);

      // Attempt 4: Even with the legitimate default admin PIN, access is strictly BLOCKED during lockout
      const res4 = authService.loginAdmin('techeeer-admin-secure');
      expect(res4).toBe(false);
      expect(authService.isAdminLoggedIn()).toBe(false);

      // Attempt 5: Another bad PIN is also blocked
      const res5 = authService.loginAdmin('another-pin');
      expect(res5).toBe(false);
    });

    it('allows successful login after lockout duration expires and resets failedAttempts counter', () => {
      // Trigger lockout
      authService.loginAdmin('bad-1');
      authService.loginAdmin('bad-2');
      authService.loginAdmin('bad-3');
      expect(authService.getAdminLockoutInfo().isLocked).toBe(true);

      // Simulate passage of 5 minutes by modifying lockedUntil in sessionStorage to the past
      const stored = JSON.parse(sessionStorage.getItem('techeeer_admin_lockout') || '{}');
      stored.lockedUntil = Date.now() - 1000;
      sessionStorage.setItem('techeeer_admin_lockout', JSON.stringify(stored));

      // Lockout should now be expired
      const expiredLockout = authService.getAdminLockoutInfo();
      expect(expiredLockout.isLocked).toBe(false);

      // Legitimate admin PIN should now succeed
      const success = authService.loginAdmin('techeeer-admin-secure');
      expect(success).toBe(true);
      expect(authService.isAdminLoggedIn()).toBe(true);

      // Lockout state in storage should be completely cleared
      expect(authService.getAdminLockoutInfo().isLocked).toBe(false);
      expect(authService.getAdminLockoutInfo().failedAttempts).toBe(0);
    });

    it('supports setting a custom salted administrative PIN and verifies hash isolation', () => {
      authService.setAdminPin('SuperSecretCustomPin2026!#');
      // Default PIN should no longer work
      expect(authService.loginAdmin('techeeer-admin-secure')).toBe(false);

      // Custom PIN should work
      expect(authService.loginAdmin('SuperSecretCustomPin2026!#')).toBe(true);
      expect(authService.isAdminLoggedIn()).toBe(true);

      authService.logoutAdmin();
      expect(authService.isAdminLoggedIn()).toBe(false);
    });
  });

  // =========================================================================
  // Task 1.4: LocalStorage Tamper Resistance & Session Invalidation
  // =========================================================================
  describe('4. LocalStorage Tamper Resistance & Signature Integrity', () => {
    it('detects and invalidates raw un-enveloped JSON injection into techeeer_active_license', () => {
      // Attacker attempts DevTools injection of fake active license
      const forgedLicense = {
        key: 'fake.token.forged',
        tier: 'annual',
        activatedAt: Date.now(),
        expiresAt: Date.now() + 365 * 86400000,
        teacherPhone: '07700000000',
      };
      localStorage.setItem('techeeer_active_license', JSON.stringify(forgedLicense));

      // authService must reject un-enveloped raw object
      expect(authService.getActiveLicense()).toBeNull();
    });

    it('detects and invalidates manual editing of expiresAt inside the authentic storage envelope', async () => {
      const keyPair = await createEd25519KeyPair();
      authService.setLicensingPublicKey(keyPair.publicKey);

      const now = Date.now();
      const payload: LicensePayload = {
        teacherId: 'iq-tamper-target',
        teacherName: 'أستاذ حقيقي',
        subject: 'تاريخ',
        issuedAt: now - 1000,
        expiresAt: now + 30 * 86400000,
        tier: 'single',
      };

      const token = await signLicensePayload(payload, keyPair.privateKey);
      const actRes = await authService.activateLicense(token);
      expect(actRes.success).toBe(true);

      // Verify authentic license is initially active
      const initialActive = authService.getActiveLicense();
      expect(initialActive).not.toBeNull();
      expect(initialActive?.key).toBe(token);

      // Simulate DevTools attack: read the envelope, modify expiresAt to year 2099, save back
      const rawEnvelope = localStorage.getItem('techeeer_active_license');
      expect(rawEnvelope).not.toBeNull();
      const envelope = JSON.parse(rawEnvelope!);

      // Tamper: extend expiration by 50 years without valid HMAC signature
      envelope.data.expiresAt = now + 50 * 365 * 86400000;
      localStorage.setItem('techeeer_active_license', JSON.stringify(envelope));

      // authService MUST detect signature mismatch and invalidate session (return null)
      const tamperedResult = authService.getActiveLicense();
      expect(tamperedResult).toBeNull();
    });

    it('detects and invalidates manual editing of payload tier inside the envelope', async () => {
      const keyPair = await createEd25519KeyPair();
      authService.setLicensingPublicKey(keyPair.publicKey);

      const now = Date.now();
      const payload: LicensePayload = {
        teacherId: 'iq-tamper-tier',
        teacherName: 'أستاذ حقيقي',
        subject: 'جغرافيا',
        issuedAt: now - 1000,
        expiresAt: now + 30 * 86400000,
        tier: 'single',
      };

      const token = await signLicensePayload(payload, keyPair.privateKey);
      await authService.activateLicense(token);

      // Tamper envelope data.tier: promote 'single' to 'pro'
      const envelope = JSON.parse(localStorage.getItem('techeeer_active_license')!);
      envelope.data.tier = 'pro';
      localStorage.setItem('techeeer_active_license', JSON.stringify(envelope));

      // Signature verification must fail
      expect(authService.getActiveLicense()).toBeNull();
    });

    it('detects signature bit-flip or signature manipulation in the storage envelope', async () => {
      const keyPair = await createEd25519KeyPair();
      authService.setLicensingPublicKey(keyPair.publicKey);

      const now = Date.now();
      const payload: LicensePayload = {
        teacherId: 'iq-sig-tamper',
        teacherName: 'أستاذ حقيقي',
        subject: 'أحياء',
        issuedAt: now - 1000,
        expiresAt: now + 30 * 86400000,
        tier: 'single',
      };

      const token = await signLicensePayload(payload, keyPair.privateKey);
      await authService.activateLicense(token);

      // Tamper with envelope HMAC signature
      const envelope = JSON.parse(localStorage.getItem('techeeer_active_license')!);
      const originalSig = envelope.sig;
      envelope.sig = originalSig.slice(0, -2) + (originalSig.endsWith('a') ? 'b' : 'a') + '0';
      localStorage.setItem('techeeer_active_license', JSON.stringify(envelope));

      expect(authService.getActiveLicense()).toBeNull();
    });

    it('detects envelope timestamp replay manipulation', async () => {
      const keyPair = await createEd25519KeyPair();
      authService.setLicensingPublicKey(keyPair.publicKey);

      const now = Date.now();
      const payload: LicensePayload = {
        teacherId: 'iq-ts-tamper',
        teacherName: 'أستاذ حقيقي',
        subject: 'لغة عربية',
        issuedAt: now - 1000,
        expiresAt: now + 30 * 86400000,
        tier: 'single',
      };

      const token = await signLicensePayload(payload, keyPair.privateKey);
      await authService.activateLicense(token);

      // Modify envelope timestamp
      const envelope = JSON.parse(localStorage.getItem('techeeer_active_license')!);
      envelope.timestamp = envelope.timestamp + 10000;
      localStorage.setItem('techeeer_active_license', JSON.stringify(envelope));

      expect(authService.getActiveLicense()).toBeNull();
    });

    it('detects tampering with teacher profile and rejects forged account data', () => {
      authService.saveTeacherProfile({
        fullName: 'أحمد محمود',
        phone: '07712345678',
        schoolName: 'مدرسة بغداد',
      });

      expect(authService.getTeacherProfile()?.fullName).toBe('أحمد محمود');

      // Tamper in localStorage
      const envelope = JSON.parse(localStorage.getItem('techeeer_teacher_profile')!);
      envelope.data.fullName = 'مستخدم غير مصرح';
      localStorage.setItem('techeeer_teacher_profile', JSON.stringify(envelope));

      expect(authService.getTeacherProfile()).toBeNull();
    });

    it('invalidates storage when device salt is reset or modified', async () => {
      const keyPair = await createEd25519KeyPair();
      authService.setLicensingPublicKey(keyPair.publicKey);

      const now = Date.now();
      const payload: LicensePayload = {
        teacherId: 'iq-salt-test',
        teacherName: 'أستاذ تجريبي',
        subject: 'إسلامية',
        issuedAt: now - 1000,
        expiresAt: now + 30 * 86400000,
        tier: 'single',
      };

      const token = await signLicensePayload(payload, keyPair.privateKey);
      await authService.activateLicense(token);
      expect(authService.getActiveLicense()).not.toBeNull();

      // Mutate device salt (simulating transfer to another device or salt regeneration)
      localStorage.setItem('techeeer_device_salt', 'tampered_rogue_salt_xyz');

      // Previous signature is now invalid under new salt
      expect(authService.getActiveLicense()).toBeNull();
    });
  });

  // =========================================================================
  // Task 1.5: Monotonic Clock Rewind & High-Water Mark Defense
  // =========================================================================
  describe('5. Monotonic AntiTamperClock High-Water Mark Defense', () => {
    it('detects sudden intra-session clock jumps (INTRA_SESSION_JUMP) during active session', async () => {
      const keyPair = await createEd25519KeyPair();
      authService.setLicensingPublicKey(keyPair.publicKey);

      const now = Date.now();
      const payload: LicensePayload = {
        teacherId: 'iq-clock-target',
        teacherName: 'أستاذ حيدر',
        subject: 'رياضيات',
        issuedAt: now - 1000,
        expiresAt: now + 30 * 86400000,
        tier: 'single',
      };

      const token = await signLicensePayload(payload, keyPair.privateKey);
      await authService.activateLicense(token);

      // Verify active license initially valid
      expect(authService.getActiveLicense()).not.toBeNull();

      // Sudden jump in wall time while perfTime remains constant
      const suddenJump = now + 10 * 86400000;
      const check = authService.getClock().verifyClock(suddenJump);
      expect(check.tampered).toBe(true);
      expect(check.reason).toBe('INTRA_SESSION_JUMP');

      // License check rejects tampered state
      expect(authService.getActiveLicense(suddenJump)).toBeNull();
    });

    it('detects clock rewind attacks (CLOCK_REWIND) against persisted High-Water Mark', async () => {
      const keyPair = await createEd25519KeyPair();
      authService.setLicensingPublicKey(keyPair.publicKey);

      const now = Date.now();
      const payload: LicensePayload = {
        teacherId: 'iq-rewind-target',
        teacherName: 'أستاذ حيدر',
        subject: 'رياضيات',
        issuedAt: now - 1000,
        expiresAt: now + 30 * 86400000,
        tier: 'single',
      };

      const token = await signLicensePayload(payload, keyPair.privateKey);
      await authService.activateLicense(token);

      // Simulate clock rewind attack (rewind system clock 10 days backwards)
      const tamperedTime = now - 10 * 86400000;
      const clockCheck = authService.getClock().verifyClock(tamperedTime);

      expect(clockCheck.tampered).toBe(true);
      expect(clockCheck.reason).toBe('CLOCK_REWIND');

      // License must be blocked
      expect(authService.getActiveLicense(tamperedTime)).toBeNull();
      // Trial must be expired with tamper warning
      const trial = authService.getTrialStatus(tamperedTime);
      expect(trial.isExpired).toBe(true);
      expect(trial.formattedRemaining).toContain('تلاعب');
    });
  });
});
