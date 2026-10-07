/**
 * Authoritative Ed25519 Cryptographic Licensing & Monotonic Anti-Tamper Clock Oracle
 * Uses standard Web Crypto API (supported in Node.js 20+ and modern browsers)
 */

import { webcrypto } from 'node:crypto';
import { AntiTamperClock } from '@techeeer/core';

const crypto = globalThis.crypto || webcrypto;

export interface LicensePayload {
  teacherId: string;
  teacherName: string;
  subject: string;
  issuedAt: number; // UTC unix ms
  expiresAt: number; // UTC unix ms
  tier: 'single' | 'school' | 'pro';
}

export interface VerificationResult {
  valid: boolean;
  tampered: boolean;
  payload?: LicensePayload;
  errorCode?: 'INVALID_SIGNATURE' | 'EXPIRED' | 'CLOCK_TAMPERED' | 'MALFORMED';
}

/**
 * Base64URL encoding / decoding helpers
 */
export function base64UrlEncode(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return Buffer.from(binary, 'binary')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = Buffer.from(base64, 'base64').toString('binary');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Keypair generation for testing Ed25519 licensing
 */
export async function generateTestKeypair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  );
  const rawPublic = await crypto.subtle.exportKey('raw', keyPair.publicKey);
  return {
    keyPair,
    publicKeyBytes: new Uint8Array(rawPublic),
  };
}

/**
 * Issue a signed license token: <payloadBase64Url>.<signatureBase64Url>
 */
export async function createSignedLicenseToken(
  payload: LicensePayload,
  privateKey: CryptoKey
): Promise<string> {
  const payloadJson = JSON.stringify(payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);
  const payloadBase64 = base64UrlEncode(payloadBytes);

  const signature = await crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    new TextEncoder().encode(payloadBase64)
  );

  const signatureBase64 = base64UrlEncode(new Uint8Array(signature));
  return `${payloadBase64}.${signatureBase64}`;
}

/**
 * Offline Ed25519 license verification
 */
export async function verifyEd25519License(
  token: string,
  publicKeyBytes: Uint8Array,
  currentHwmTime: number,
  systemTimeNow: number = Date.now()
): Promise<VerificationResult> {
  if (!token || typeof token !== 'string') {
    return { valid: false, tampered: false, errorCode: 'MALFORMED' };
  }

  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, tampered: false, errorCode: 'MALFORMED' };
  }

  const [payloadBase64, sigBase64] = parts;

  // 1. Monotonic Clock Anti-Tamper Check
  // If system time is rolled backwards before persistent HWM by more than 60 seconds (1 minute tolerance)
  if (systemTimeNow < currentHwmTime - 60_000) {
    return {
      valid: false,
      tampered: true,
      errorCode: 'CLOCK_TAMPERED',
    };
  }

  // 2. Decode payload
  let payload: LicensePayload;
  try {
    const payloadBytes = base64UrlDecode(payloadBase64);
    const jsonStr = new TextDecoder().decode(payloadBytes);
    payload = JSON.parse(jsonStr);
  } catch {
    return { valid: false, tampered: false, errorCode: 'MALFORMED' };
  }

  // 3. Verify Ed25519 Signature
  try {
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      publicKeyBytes,
      { name: 'Ed25519' },
      false,
      ['verify']
    );

    const sigBytes = base64UrlDecode(sigBase64);
    const isValid = await crypto.subtle.verify(
      { name: 'Ed25519' },
      cryptoKey,
      sigBytes,
      new TextEncoder().encode(payloadBase64)
    );

    if (!isValid) {
      return { valid: false, tampered: false, errorCode: 'INVALID_SIGNATURE' };
    }
  } catch {
    return { valid: false, tampered: false, errorCode: 'INVALID_SIGNATURE' };
  }

  // 4. Verify Expiration against monotonic time
  const effectiveTime = Math.max(systemTimeNow, currentHwmTime);
  if (payload.expiresAt && effectiveTime > payload.expiresAt) {
    return {
      valid: false,
      tampered: false,
      payload,
      errorCode: 'EXPIRED',
    };
  }

  return {
    valid: true,
    tampered: false,
    payload,
  };
}

/**
 * In-memory Monotonic Clock Anti-Tamper Tracker for testing
 */
export class MonotonicClockTracker {
  private highWaterMark: number;
  private sessionStartSys: number;
  private sessionStartPerf: number;

  constructor(initialHwm: number = Date.now(), initialSysTime?: number) {
    this.highWaterMark = initialHwm;
    this.sessionStartSys = initialSysTime !== undefined ? initialSysTime : Date.now();
    this.sessionStartPerf = performance.now();
  }

  getHighWaterMark(): number {
    return this.highWaterMark;
  }

  getSessionStartPerf(): number {
    return this.sessionStartPerf;
  }

  checkClockStatus(currentSysTime: number, currentPerfTime?: number): {
    isTampered: boolean;
    reason?: 'ROLLBACK' | 'DRIFT';
  } {
    // 1. Persistent Rollback Check (tolerance 60s)
    if (currentSysTime < this.highWaterMark - 60_000) {
      return { isTampered: true, reason: 'ROLLBACK' };
    }

    // 2. Intra-session Fast-forward / Skew Check via performance.now() (if checked)
    if (currentPerfTime !== undefined) {
      const deltaSys = currentSysTime - this.sessionStartSys;
      const deltaPerf = currentPerfTime - this.sessionStartPerf;
      if (Math.abs(deltaSys - deltaPerf) > 5_000) {
        return { isTampered: true, reason: 'DRIFT' };
      }
    }

    // Update HWM monotonically
    if (currentSysTime > this.highWaterMark) {
      this.highWaterMark = currentSysTime;
    }

    return { isTampered: false };
  }

  forceSetHwm(time: number) {
    this.highWaterMark = time;
  }
}
