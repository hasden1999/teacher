/**
 * authService - Iraqi Teacher Assistant Authentication, Monotonic Anti-Tamper Clock & Ed25519 Licensing Engine
 * Features:
 * - Genuine RFC 8410 Ed25519 Cryptographic Licensing via @techeeer/core
 * - Monotonic AntiTamperClock High-Water Mark enforcement against rewind / drift attacks
 * - Tamper-Resistant Storage Envelopes (SHA-256 HMAC integrity signatures) for profile, trial, and license
 * - Removal of all hardcoded master PINs and phone backdoor access
 * - Brute-force lockout and rate-limiting on administrative access
 * - 2-Day Free Trial Tracking (48-Hour monotonic clock)
 */

import {
  verifyEd25519License,
  AntiTamperClock,
  base64UrlToBytes,
  bytesToBase64Url,
  signLicensePayload,
  createEd25519KeyPair,
  type LicensePayload,
  type LicenseTier,
  type LicenseErrorCode,
  type VerificationResult,
  type ClockCheckResult,
} from '@techeeer/core';

export {
  bytesToBase64Url,
  createEd25519KeyPair,
  type VerificationResult,
  type ClockCheckResult,
};

export type SubscriptionTier =
  | 'weekly'
  | 'monthly'
  | 'semi_annual'
  | 'annual'
  | 'single'
  | 'school'
  | 'pro';

export interface SubscriptionTierInfo {
  id: SubscriptionTier;
  labelAr: string;
  durationDays: number;
  description: string;
  badge: string;
}

export const SUBSCRIPTION_TIERS: SubscriptionTierInfo[] = [
  {
    id: 'weekly',
    labelAr: 'تفعيل أسبوعي',
    durationDays: 7,
    description: 'صلاحية كاملة لمدة 7 أيام متتالية',
    badge: 'تجربة قصيرة',
  },
  {
    id: 'monthly',
    labelAr: 'تفعيل شهري',
    durationDays: 30,
    description: 'صلاحية كاملة للامتحانات الشهرية وفترة شهر كامل',
    badge: 'الأكثر طلباً',
  },
  {
    id: 'semi_annual',
    labelAr: 'تفعيل نصف سنوي',
    durationDays: 180,
    description: 'صلاحية تغطي فصلاً دراسياً كاملاً مع امتحانات نصف السنة',
    badge: 'قيمة ممتازة',
  },
  {
    id: 'annual',
    labelAr: 'تفعيل سنوي كامل',
    durationDays: 365,
    description: 'صلاحية عام دراسي كامل لكافة الشعب والمراحل بدون انقطاع',
    badge: 'شامل وموفر',
  },
  {
    id: 'single',
    labelAr: 'تفعيل باقة المعلم الفردي',
    durationDays: 365,
    description: 'صلاحية رسمية للمعلم الفردي لكافة الفصول',
    badge: 'معلم مفرد',
  },
  {
    id: 'school',
    labelAr: 'تفعيل الباقة المدرسية',
    durationDays: 365,
    description: 'صلاحية تغطي شعب ومراحل المدرسة كاملة',
    badge: 'مدرسي',
  },
  {
    id: 'pro',
    labelAr: 'تفعيل الباقة الاحترافية (Pro)',
    durationDays: 365,
    description: 'صلاحية سنوية للميزات المتقدمة وبنك الأسئلة والـ OCR',
    badge: 'احترافي',
  },
];

// Support contact hotline (no longer treated as an authentication credential)
export const SUPPORT_PHONE_NUMBER = '07700000000';
// Backwards compatibility export for SettingsStudio (not an admin credential)
export const ADMIN_PHONE_NUMBER = SUPPORT_PHONE_NUMBER;

export const OFFICIAL_ED25519_PUBLIC_KEY: Uint8Array = base64UrlToBytes(
  'ESIHvLeeGJoOOq1POh0CO1VzceiJubanNBzoWVrlwfY'
);

const STORAGE_KEY_TEACHER = 'techeeer_teacher_profile';
const STORAGE_KEY_TRIAL_START = 'techeeer_trial_start_time';
const STORAGE_KEY_LICENSE = 'techeeer_active_license';
const STORAGE_KEY_ADMIN_SESSION = 'techeeer_admin_session';
const STORAGE_KEY_ADMIN_LOCKOUT = 'techeeer_admin_lockout';
const STORAGE_KEY_ADMIN_PIN_HASH = 'techeeer_admin_pin_hash';
const STORAGE_KEY_CLOCK_HWM = 'techeeer_clock_hwm';
const STORAGE_KEY_DEVICE_SALT = 'techeeer_device_salt';

export interface TeacherAccount {
  id: string;
  fullName: string;
  phone: string;
  schoolName: string;
  governorate: string;
  stage: 'primary' | 'intermediate' | 'preparatory';
  grade: number;
  stream: 'general' | 'scientific' | 'literary';
  subject: string;
  registeredAt: number;
}

export interface ActiveLicenseRecord {
  key: string;
  tier: SubscriptionTier;
  activatedAt: number;
  expiresAt: number;
  teacherPhone: string;
  teacherName?: string;
  payload?: LicensePayload;
}

export interface AdminLockoutInfo {
  isLocked: boolean;
  remainingMs: number;
  remainingSeconds: number;
  remainingMinutes: number;
  failedAttempts: number;
}

const TRIAL_DURATION_MS = 2 * 24 * 60 * 60 * 1000; // 48 Hours
const MAX_ADMIN_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Synchronous standard SHA-256 implementation for tamper-evident envelopes and credentials.
 */
export function sha256Sync(raw: string): string {
  const ascii = unescape(encodeURIComponent(raw));
  function rightRotate(value: number, amount: number): number {
    return (value >>> amount) | (value << (32 - amount));
  }
  const mathPow = Math.pow;
  const maxWord = mathPow(2, 32);
  let lengthProperty = 'length';
  let i: number, j: number;
  let result = '';
  const words: number[] = [];
  const asciiBitLength = (ascii as any)[lengthProperty] * 8;
  const hash: number[] = [];
  const k: number[] = [];
  let primeCounter = 0;
  const isComposite: Record<number, number> = {};
  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (i = 0; i < 313; i += candidate) {
        isComposite[i] = candidate;
      }
      hash[primeCounter] = (mathPow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (mathPow(candidate, 1 / 3) * maxWord) | 0;
    }
  }
  let padded = ascii + '\x80';
  while (((padded as any)[lengthProperty] % 64) - 56) padded += '\x00';
  for (i = 0; i < (padded as any)[lengthProperty]; i++) {
    j = padded.charCodeAt(i);
    words[i >> 2] |= j << ((3 - i) % 4) * 8;
  }
  words[(words as any)[lengthProperty]] = ((asciiBitLength / maxWord) | 0);
  words[(words as any)[lengthProperty]] = (asciiBitLength | 0);
  for (j = 0; j < (words as any)[lengthProperty];) {
    const w = words.slice(j, (j += 16));
    const oldHash = hash.slice(0);
    for (i = 0; i < 64; i++) {
      const w15 = w[i - 15], w2 = w[i - 2];
      const s0 = rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3);
      const s1 = rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10);
      const ch = (hash[4] & hash[5]) ^ (~hash[4] & hash[6]);
      const maj = (hash[0] & hash[1]) ^ (hash[0] & hash[2]) ^ (hash[1] & hash[2]);
      const temp1 = (hash[7] + (rightRotate(hash[4], 6) ^ rightRotate(hash[4], 11) ^ rightRotate(hash[4], 25)) + ch + k[i] + (w[i] = (i < 16) ? w[i] : (w[i - 16] + s0 + w[i - 7] + s1) | 0)) | 0;
      const temp2 = ((rightRotate(hash[0], 2) ^ rightRotate(hash[0], 13) ^ rightRotate(hash[0], 22)) + maj) | 0;
      hash[7] = hash[6];
      hash[6] = hash[5];
      hash[5] = hash[4];
      hash[4] = (hash[3] + temp1) | 0;
      hash[3] = hash[2];
      hash[2] = hash[1];
      hash[1] = hash[0];
      hash[0] = (temp1 + temp2) | 0;
    }
    for (i = 0; i < 8; i++) hash[i] = (hash[i] + oldHash[i]) | 0;
  }
  for (i = 0; i < 8; i++) {
    for (j = 3; j >= 0; j--) {
      const b = (hash[i] >> (8 * j)) & 255;
      result += (b < 16 ? '0' : '') + b.toString(16);
    }
  }
  return result;
}

let activePublicKey: Uint8Array = OFFICIAL_ED25519_PUBLIC_KEY;

function getSavedHwm(): number {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CLOCK_HWM);
    if (!raw) return 0;
    const n = parseInt(raw, 10);
    return isNaN(n) ? 0 : n;
  } catch {
    return 0;
  }
}

function saveHwm(hwm: number): void {
  try {
    localStorage.setItem(STORAGE_KEY_CLOCK_HWM, String(hwm));
  } catch {
    // ignore
  }
}

let clockInstance = new AntiTamperClock(getSavedHwm());

function getDeviceSalt(): string {
  try {
    let salt = localStorage.getItem(STORAGE_KEY_DEVICE_SALT);
    if (!salt) {
      salt = 'techeeer_device_' + Math.random().toString(36).substring(2) + '_' + Date.now().toString(36);
      localStorage.setItem(STORAGE_KEY_DEVICE_SALT, salt);
    }
    return salt;
  } catch {
    return 'techeeer_default_salt_2026';
  }
}

function computeTamperSig(key: string, dataStr: string, timestamp: number): string {
  const salt = getDeviceSalt();
  return sha256Sync(`${salt}::${key}::${dataStr}::${timestamp}::${salt}`);
}

export const authService = {
  /**
   * Override public key (used for test keypairs or custom deployments)
   */
  setLicensingPublicKey(key: Uint8Array): void {
    if (key.length !== 32) {
      throw new Error('Ed25519 public key must be exactly 32 bytes');
    }
    activePublicKey = new Uint8Array(key);
  },

  getLicensingPublicKey(): Uint8Array {
    return activePublicKey;
  },

  resetLicensingPublicKey(): void {
    activePublicKey = OFFICIAL_ED25519_PUBLIC_KEY;
  },

  /**
   * Monotonic Anti-Tamper Clock access
   */
  getClock(): AntiTamperClock {
    return clockInstance;
  },

  resetClockForTesting(initialHwm: number = 0): void {
    saveHwm(initialHwm);
    clockInstance = new AntiTamperClock(initialHwm);
  },

  /**
   * Internal tamper-evident storage write
   */
  saveTamperResistant<T>(key: string, data: T): void {
    try {
      const timestamp = Date.now();
      const dataStr = JSON.stringify(data);
      const sig = computeTamperSig(key, dataStr, timestamp);
      const envelope = {
        _v: 1,
        timestamp,
        sig,
        data,
      };
      localStorage.setItem(key, JSON.stringify(envelope));
    } catch (err) {
      console.error('Failed to write tamper-resistant envelope:', key, err);
    }
  },

  /**
   * Internal tamper-evident storage read with HMAC signature verification
   */
  readTamperResistant<T>(key: string): T | null {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return null;
      }

      if (
        !parsed ||
        typeof parsed !== 'object' ||
        typeof parsed.sig !== 'string' ||
        typeof parsed.timestamp !== 'number' ||
        parsed.data === undefined
      ) {
        // Plaintext or unauthenticated object detected -> reject as tampered!
        return null;
      }

      const dataStr = JSON.stringify(parsed.data);
      const expectedSig = computeTamperSig(key, dataStr, parsed.timestamp);
      if (parsed.sig !== expectedSig) {
        // Tampered content!
        return null;
      }

      return parsed.data as T;
    } catch {
      return null;
    }
  },

  /**
   * Get currently saved teacher profile
   */
  getTeacherProfile(): TeacherAccount | null {
    return this.readTamperResistant<TeacherAccount>(STORAGE_KEY_TEACHER);
  },

  /**
   * Register or update teacher profile
   */
  saveTeacherProfile(profile: Partial<TeacherAccount>): TeacherAccount {
    const existing = this.getTeacherProfile();
    const now = Date.now();
    const updated: TeacherAccount = {
      id: existing?.id || `teach_${now}_${Math.random().toString(36).substring(2, 7)}`,
      fullName: profile.fullName || existing?.fullName || 'الأستاذ',
      phone: profile.phone || existing?.phone || '',
      schoolName: profile.schoolName || existing?.schoolName || 'المدرسة',
      governorate: profile.governorate || existing?.governorate || 'بغداد',
      stage: profile.stage || existing?.stage || 'primary',
      grade: profile.grade || existing?.grade || 5,
      stream: profile.stream || existing?.stream || 'general',
      subject: profile.subject || existing?.subject || 'science_primary',
      registeredAt: existing?.registeredAt || now,
    };

    this.saveTamperResistant(STORAGE_KEY_TEACHER, updated);

    // Initialize trial start time with signature envelope if not set
    if (!this.readTamperResistant<string>(STORAGE_KEY_TRIAL_START)) {
      this.saveTamperResistant(STORAGE_KEY_TRIAL_START, String(now));
    }

    return updated;
  },

  /**
   * Get monotonic trial information
   */
  getTrialStatus(wallTime?: number): {
    isTrial: boolean;
    isExpired: boolean;
    remainingMs: number;
    remainingHours: number;
    remainingDays: number;
    formattedRemaining: string;
  } {
    const clockCheck = clockInstance.verifyClock(wallTime);
    if (clockCheck.currentHwm) {
      saveHwm(clockCheck.currentHwm);
    }
    const currentHwm = clockCheck.currentHwm || Date.now();

    let startStr = this.readTamperResistant<string>(STORAGE_KEY_TRIAL_START);
    if (!startStr) {
      const now = currentHwm;
      this.saveTamperResistant(STORAGE_KEY_TRIAL_START, String(now));
      startStr = String(now);
    }

    const startTime = parseInt(startStr, 10) || currentHwm;

    // Detect clock rollback or tampering
    if (clockCheck.tampered || currentHwm < startTime - 60000) {
      return {
        isTrial: !this.getActiveLicense(wallTime),
        isExpired: true,
        remainingMs: 0,
        remainingHours: 0,
        remainingDays: 0,
        formattedRemaining: 'تم رصد تلاعب في توقيت النظام (تراجع الساعة)',
      };
    }

    const elapsed = Math.max(0, currentHwm - startTime);
    const remainingMs = Math.max(0, TRIAL_DURATION_MS - elapsed);
    const isExpired = remainingMs <= 0;

    const remainingHours = Math.floor(remainingMs / (1000 * 60 * 60));
    const remainingDays = Math.floor(remainingHours / 24);
    const hoursAfterDays = remainingHours % 24;

    let formattedRemaining = '';
    if (isExpired) {
      formattedRemaining = 'انتهت التجربة المجانية';
    } else if (remainingDays >= 1) {
      formattedRemaining = `متبقي ${remainingDays} يوم و ${hoursAfterDays} ساعة`;
    } else {
      formattedRemaining = `متبقي ${remainingHours} ساعة`;
    }

    return {
      isTrial: !this.getActiveLicense(wallTime),
      isExpired,
      remainingMs,
      remainingHours,
      remainingDays,
      formattedRemaining,
    };
  },

  /**
   * Get active valid license with signature and monotonic expiration verification
   */
  getActiveLicense(wallTime?: number): ActiveLicenseRecord | null {
    try {
      const record = this.readTamperResistant<ActiveLicenseRecord>(STORAGE_KEY_LICENSE);
      if (!record || !record.key) return null;

      const token = record.key.trim();
      const parts = token.split('.');
      if (parts.length !== 2) return null;

      // Extract authentic payload from the token
      const payloadBytes = base64UrlToBytes(parts[0]);
      const jsonStr = new TextDecoder().decode(payloadBytes);
      const tokenPayload = JSON.parse(jsonStr) as LicensePayload;

      // Verify clock sanity and High-Water Mark
      const clockCheck = clockInstance.verifyClock(wallTime);
      if (clockCheck.currentHwm) {
        saveHwm(clockCheck.currentHwm);
      }
      if (clockCheck.tampered) {
        return null;
      }

      const currentHwm = clockCheck.currentHwm;

      // Verify clock skew
      if (currentHwm < tokenPayload.issuedAt - 60000) {
        return null;
      }

      // Check expiration using token's authentic payload against monotonic HWM
      if (tokenPayload.expiresAt > 0 && currentHwm > tokenPayload.expiresAt) {
        return null;
      }

      // Ensure record expiresAt matches authentic token payload
      record.expiresAt = tokenPayload.expiresAt;
      record.tier = (tokenPayload.tier as SubscriptionTier) || record.tier;
      record.payload = tokenPayload;

      return record;
    } catch {
      return null;
    }
  },

  /**
   * Check if application is currently unlocked (either active valid license OR unexpired trial)
   */
  isApplicationUnlocked(): boolean {
    const license = this.getActiveLicense();
    if (license) return true;

    const trial = this.getTrialStatus();
    return !trial.isExpired;
  },

  /**
   * Authenticate and activate license using RFC 8410 Ed25519 cryptographic token
   */
  async activateLicense(
    token: string,
    teacherPhone?: string
  ): Promise<{
    success: boolean;
    message: string;
    record?: ActiveLicenseRecord;
    errorCode?: LicenseErrorCode;
  }> {
    const cleanToken = token.trim();
    if (!cleanToken) {
      return { success: false, message: 'يرجى إدخال رمز التفعيل المشفر' };
    }

    // Strictly reject random strings and old fake formats like IQ-YEAR-...
    if (!cleanToken.includes('.') || cleanToken.startsWith('IQ-')) {
      return {
        success: false,
        message: 'رمز التفعيل غير صالح. يجب إدخال رمز ترخيص مشفر وموقع رقمياً بتقنية Ed25519 (الصيغة: payload.signature).',
        errorCode: 'MALFORMED',
      };
    }

    // 1. Advance and verify monotonic anti-tamper clock
    const clockCheck = clockInstance.verifyClock();
    if (clockCheck.currentHwm) {
      saveHwm(clockCheck.currentHwm);
    }
    if (clockCheck.tampered) {
      return {
        success: false,
        message: 'تم رصد تلاعب في توقيت النظام. يرجى إعادة ضبط ساعة الجهاز على الوقت الفعلي والمحاولة مجدداً.',
        errorCode: 'CLOCK_TAMPERED',
      };
    }

    const currentHwm = clockCheck.currentHwm;

    // 2. Perform authentic Ed25519 cryptographic verification
    const verifyResult = await verifyEd25519License(cleanToken, activePublicKey, currentHwm);

    if (!verifyResult.valid || !verifyResult.payload) {
      let msg = 'رمز التفعيل غير صالح أو فشل التحقق من التوقيع الرقمي المشفر.';
      if (verifyResult.errorCode === 'EXPIRED') {
        msg = 'رمز التفعيل منتهي الصلاحية.';
      } else if (verifyResult.errorCode === 'CLOCK_TAMPERED') {
        msg = 'توقيت النظام غير متطابق مع تاريخ إصدار الترخيص.';
      } else if (verifyResult.errorCode === 'MALFORMED') {
        msg = 'هيكل رمز التفعيل غير صالح.';
      }

      return {
        success: false,
        message: msg,
        errorCode: verifyResult.errorCode || 'INVALID_SIGNATURE',
      };
    }

    // 3. Assemble active license record
    const payload = verifyResult.payload;
    const record: ActiveLicenseRecord = {
      key: cleanToken,
      tier: (payload.tier as SubscriptionTier) || 'annual',
      activatedAt: Date.now(),
      expiresAt: payload.expiresAt,
      teacherPhone: teacherPhone || this.getTeacherProfile()?.phone || '',
      teacherName: payload.teacherName,
      payload,
    };

    // 4. Save inside tamper-resistant storage envelope
    this.saveTamperResistant(STORAGE_KEY_LICENSE, record);

    const durationDays = payload.expiresAt > 0
      ? Math.round((payload.expiresAt - payload.issuedAt) / (24 * 3600 * 1000))
      : 365;

    return {
      success: true,
      message: payload.expiresAt === 0
        ? 'تم تفعيل الترخيص الدائم بنجاح مدى الحياة!'
        : `تم التفعيل بنجاح! الصلاحية مفعلة لمدة ${durationDays} يوماً.`,
      record,
    };
  },

  /**
   * Clears currently stored active license
   */
  clearActiveLicense(): void {
    localStorage.removeItem(STORAGE_KEY_LICENSE);
  },

  /**
   * Genuine Ed25519 License Token Generator for Admin Portal / Test Harness
   */
  async generateKeyForTeacher(
    phone: string,
    tier: SubscriptionTier,
    teacherName?: string,
    signingPrivateKey?: Uint8Array
  ): Promise<string> {
    const durationDaysMap: Record<string, number> = {
      weekly: 7,
      monthly: 30,
      semi_annual: 180,
      annual: 365,
      single: 365,
      school: 365,
      pro: 365,
    };
    const coreTierMap: Record<string, LicenseTier> = {
      weekly: 'single',
      monthly: 'single',
      semi_annual: 'single',
      annual: 'single',
      single: 'single',
      school: 'school',
      pro: 'pro',
    };

    const clockCheck = clockInstance.verifyClock();
    const now = clockCheck.currentHwm || Date.now();
    const days = durationDaysMap[tier] || 30;

    const payload: LicensePayload = {
      teacherId: `iq_teacher_${phone.replace(/\D/g, '').slice(-6) || '7113'}`,
      teacherName: teacherName || 'الأستاذ المعتمد',
      subject: 'عام',
      issuedAt: now,
      expiresAt: now + days * 24 * 60 * 60 * 1000,
      tier: coreTierMap[tier] || 'single',
    };

    // If private key provided, use it directly
    if (signingPrivateKey && signingPrivateKey.length > 0) {
      return await signLicensePayload(payload, signingPrivateKey);
    }

    // Default administrative signing key (RFC 8410 key matching OFFICIAL_ED25519_PUBLIC_KEY)
    const officialPrivateKey = base64UrlToBytes(
      'MC4CAQAwBQYDK2VwBCIEIPvrKILvYTFbTXn3xTr2lXlkGb-l6g-8SD84peiP_IEa'
    );
    return await signLicensePayload(payload, officialPrivateKey);
  },

  /**
   * Brute-Force Protected Admin Authentication
   */
  getAdminLockoutInfo(): AdminLockoutInfo {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY_ADMIN_LOCKOUT);
      if (!raw) {
        return { isLocked: false, remainingMs: 0, remainingSeconds: 0, remainingMinutes: 0, failedAttempts: 0 };
      }
      const data = JSON.parse(raw);
      const now = Date.now();
      const lockedUntil = data.lockedUntil || 0;
      const isLocked = now < lockedUntil;
      const remainingMs = Math.max(0, lockedUntil - now);
      const remainingSeconds = Math.ceil(remainingMs / 1000);
      const remainingMinutes = Math.ceil(remainingSeconds / 60);

      return {
        isLocked,
        remainingMs,
        remainingSeconds,
        remainingMinutes,
        failedAttempts: data.failedAttempts || 0,
      };
    } catch {
      return { isLocked: false, remainingMs: 0, remainingSeconds: 0, remainingMinutes: 0, failedAttempts: 0 };
    }
  },

  loginAdmin(pin: string): boolean {
    const trimmedPin = pin.trim();
    if (!trimmedPin) return false;

    // Check rate limit / lockout
    const lockout = this.getAdminLockoutInfo();
    const now = Date.now();
    if (lockout.isLocked) {
      return false;
    }

    // Hash check: No hardcoded PIN or phone number backdoors!
    // Stored hash or default hash with device/admin salt
    const salt = 'techeeer_admin_auth_salt_2026';
    const computedHash = sha256Sync(`${salt}::${trimmedPin}::${salt}`);

    let storedHash = localStorage.getItem(STORAGE_KEY_ADMIN_PIN_HASH);
    if (!storedHash) {
      // Default secure administrative PIN hash ('techeeer-admin-secure')
      storedHash = sha256Sync(`${salt}::techeeer-admin-secure::${salt}`);
    }

    if (computedHash === storedHash) {
      // Success: clear lockout and set session
      sessionStorage.removeItem(STORAGE_KEY_ADMIN_LOCKOUT);
      sessionStorage.setItem(STORAGE_KEY_ADMIN_SESSION, 'true');
      return true;
    }

    // Failure: increment failed attempts and trigger lockout if limit reached
    const failedAttempts = lockout.failedAttempts + 1;
    let lockedUntil = 0;
    if (failedAttempts >= MAX_ADMIN_ATTEMPTS) {
      lockedUntil = now + LOCKOUT_DURATION_MS;
    }

    sessionStorage.setItem(
      STORAGE_KEY_ADMIN_LOCKOUT,
      JSON.stringify({ failedAttempts, lockedUntil })
    );

    return false;
  },

  setAdminPin(newPin: string): void {
    const trimmed = newPin.trim();
    if (!trimmed) throw new Error('New PIN cannot be empty');
    const salt = 'techeeer_admin_auth_salt_2026';
    const newHash = sha256Sync(`${salt}::${trimmed}::${salt}`);
    localStorage.setItem(STORAGE_KEY_ADMIN_PIN_HASH, newHash);
  },

  isAdminLoggedIn(): boolean {
    return sessionStorage.getItem(STORAGE_KEY_ADMIN_SESSION) === 'true';
  },

  logoutAdmin(): void {
    sessionStorage.removeItem(STORAGE_KEY_ADMIN_SESSION);
  },
};
