import { describe, it, expect, vi } from 'vitest';
import {
  verifyEd25519License,
  createEd25519KeyPair,
  signLicensePayload,
  base64UrlToBytes,
  bytesToBase64Url,
  type LicensePayload
} from '../../src/crypto/ed25519.js';

describe('ed25519.ts - Offline Cryptographic Licensing', () => {
  it('should roundtrip Base64URL encoding and decoding without padding loss', () => {
    const raw = new Uint8Array([0, 1, 2, 255, 254, 128, 64, 32, 16, 8, 4]);
    const b64 = bytesToBase64Url(raw);
    expect(b64).not.toContain('+');
    expect(b64).not.toContain('/');
    expect(b64).not.toContain('=');

    const decoded = base64UrlToBytes(b64);
    expect(decoded).toEqual(raw);
  });

  it('should generate valid 32-byte Ed25519 keypairs', async () => {
    const { publicKey, privateKey } = await createEd25519KeyPair();
    expect(publicKey.length).toBe(32);
    expect(privateKey.length).toBe(32);
  });

  it('should verify a genuinely signed license token successfully', async () => {
    const { publicKey, privateKey } = await createEd25519KeyPair();

    const now = Date.now();
    const payload: LicensePayload = {
      teacherId: 'teacher-101',
      teacherName: 'أحمد علي',
      subject: 'الرياضيات',
      issuedAt: now - 10000,
      expiresAt: now + 365 * 24 * 3600 * 1000,
      tier: 'pro'
    };

    const token = await signLicensePayload(payload, privateKey);
    const result = await verifyEd25519License(token, publicKey, now);

    expect(result.valid).toBe(true);
    expect(result.tampered).toBe(false);
    expect(result.payload?.teacherId).toBe('teacher-101');
    expect(result.payload?.teacherName).toBe('أحمد علي');
    expect(result.payload?.tier).toBe('pro');
  });

  it('should reject a token when signature bytes are corrupted', async () => {
    const { publicKey, privateKey } = await createEd25519KeyPair();
    const now = Date.now();

    const payload: LicensePayload = {
      teacherId: 'teacher-101',
      teacherName: 'أحمد علي',
      subject: 'الرياضيات',
      issuedAt: now - 10000,
      expiresAt: now + 1000000,
      tier: 'single'
    };

    const token = await signLicensePayload(payload, privateKey);
    const [pB64, sB64] = token.split('.');

    // Corrupt one character in signature
    const corruptedChar = sB64[0] === 'A' ? 'B' : 'A';
    const corruptedSig = corruptedChar + sB64.slice(1);
    const corruptedToken = `${pB64}.${corruptedSig}`;

    const result = await verifyEd25519License(corruptedToken, publicKey, now);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('INVALID_SIGNATURE');
  });

  it('should reject a token verified against the wrong public key', async () => {
    const pairA = await createEd25519KeyPair();
    const pairB = await createEd25519KeyPair();
    const now = Date.now();

    const payload: LicensePayload = {
      teacherId: 'teacher-101',
      teacherName: 'أحمد علي',
      subject: 'الرياضيات',
      issuedAt: now - 1000,
      expiresAt: now + 100000,
      tier: 'school'
    };

    const token = await signLicensePayload(payload, pairA.privateKey);
    const result = await verifyEd25519License(token, pairB.publicKey, now);

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('INVALID_SIGNATURE');
  });

  it('should reject malformed tokens', async () => {
    const { publicKey } = await createEd25519KeyPair();

    expect((await verifyEd25519License('', publicKey, 1000)).errorCode).toBe('MALFORMED');
    expect((await verifyEd25519License('nodots', publicKey, 1000)).errorCode).toBe('MALFORMED');
    expect((await verifyEd25519License('part1.part2.part3', publicKey, 1000)).errorCode).toBe('MALFORMED');
    expect((await verifyEd25519License('.signature', publicKey, 1000)).errorCode).toBe('MALFORMED');
    expect((await verifyEd25519License('payload.', publicKey, 1000)).errorCode).toBe('MALFORMED');
    expect((await verifyEd25519License('%%%invalidb64%%%.sig', publicKey, 1000)).errorCode).toBe('MALFORMED');

    // Valid Base64 but invalid JSON
    const notJsonB64 = bytesToBase64Url(new TextEncoder().encode('this-is-not-json'));
    expect((await verifyEd25519License(`${notJsonB64}.sig`, publicKey, 1000)).errorCode).toBe('MALFORMED');

    // Valid JSON but missing required fields
    const missingFieldsB64 = bytesToBase64Url(new TextEncoder().encode(JSON.stringify({ some: 'data' })));
    expect((await verifyEd25519License(`${missingFieldsB64}.sig`, publicKey, 1000)).errorCode).toBe('MALFORMED');
  });

  it('should reject signatures or keys of invalid length', async () => {
    const { publicKey, privateKey } = await createEd25519KeyPair();
    const now = Date.now();
    const payload: LicensePayload = {
      teacherId: 't1',
      teacherName: 'اسم',
      subject: 'مادة',
      issuedAt: now,
      expiresAt: now + 100000,
      tier: 'single'
    };

    const token = await signLicensePayload(payload, privateKey);

    // 16-byte invalid public key
    const invalidPubKey = new Uint8Array(16);
    expect((await verifyEd25519License(token, invalidPubKey, now)).errorCode).toBe('INVALID_SIGNATURE');

    // Corrupted signature that is not 64 bytes
    const [pB64] = token.split('.');
    const shortSigB64 = bytesToBase64Url(new Uint8Array(32));
    expect((await verifyEd25519License(`${pB64}.${shortSigB64}`, publicKey, now)).errorCode).toBe('INVALID_SIGNATURE');
  });

  it('should detect expired licenses', async () => {
    const { publicKey, privateKey } = await createEd25519KeyPair();
    const issuedAt = 1700000000000;
    const expiresAt = 1710000000000;
    const currentHwm = 1720000000000; // time is after expiresAt

    const payload: LicensePayload = {
      teacherId: 't1',
      teacherName: 'اسم',
      subject: 'مادة',
      issuedAt,
      expiresAt,
      tier: 'single'
    };

    const token = await signLicensePayload(payload, privateKey);
    const result = await verifyEd25519License(token, publicKey, currentHwm);

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('EXPIRED');
  });

  it('should allow lifetime licenses with expiresAt = 0', async () => {
    const { publicKey, privateKey } = await createEd25519KeyPair();
    const issuedAt = 1700000000000;
    const expiresAt = 0; // Lifetime
    const currentHwm = 1800000000000;

    const payload: LicensePayload = {
      teacherId: 't1',
      teacherName: 'اسم',
      subject: 'مادة',
      issuedAt,
      expiresAt,
      tier: 'pro'
    };

    const token = await signLicensePayload(payload, privateKey);
    const result = await verifyEd25519License(token, publicKey, currentHwm);

    expect(result.valid).toBe(true);
    expect(result.errorCode).toBeUndefined();
  });

  it('should detect clock tampering when system time is set earlier than issuance', async () => {
    const { publicKey, privateKey } = await createEd25519KeyPair();
    const issuedAt = 1700000000000;
    const expiresAt = 1800000000000;
    const tamperedTime = issuedAt - 120000; // 2 minutes before issuance (> 60s tolerance)

    const payload: LicensePayload = {
      teacherId: 't1',
      teacherName: 'اسم',
      subject: 'مادة',
      issuedAt,
      expiresAt,
      tier: 'single'
    };

    const token = await signLicensePayload(payload, privateKey);
    const result = await verifyEd25519License(token, publicKey, tamperedTime);

    expect(result.valid).toBe(false);
    expect(result.tampered).toBe(true);
    expect(result.errorCode).toBe('CLOCK_TAMPERED');
  });

  it('should allow minor clock skew within 60-second tolerance window', async () => {
    const { publicKey, privateKey } = await createEd25519KeyPair();
    const issuedAt = 1700000000000;
    const expiresAt = 1800000000000;
    const slightlyBehind = issuedAt - 30000; // 30s before issuance (within 60s tolerance)

    const payload: LicensePayload = {
      teacherId: 't1',
      teacherName: 'اسم',
      subject: 'مادة',
      issuedAt,
      expiresAt,
      tier: 'school'
    };

    const token = await signLicensePayload(payload, privateKey);
    const result = await verifyEd25519License(token, publicKey, slightlyBehind);

    expect(result.valid).toBe(true);
    expect(result.tampered).toBe(false);
  });

  it('should support signing with full 48-byte PKCS8 private key directly', async () => {
    const { publicKey, privateKey } = await createEd25519KeyPair();
    const pkcs8Header = new Uint8Array([
      0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06,
      0x03, 0x2b, 0x65, 0x70, 0x04, 0x22, 0x04, 0x20
    ]);
    const fullPkcs8 = new Uint8Array(48);
    fullPkcs8.set(pkcs8Header, 0);
    fullPkcs8.set(privateKey, 16);

    const payload: LicensePayload = {
      teacherId: 't-pkcs8',
      teacherName: 'اسم',
      subject: 'مادة',
      issuedAt: 1700000000000,
      expiresAt: 1800000000000,
      tier: 'pro'
    };

    const token = await signLicensePayload(payload, fullPkcs8);
    const result = await verifyEd25519License(token, publicKey, 1700000000000);

    expect(result.valid).toBe(true);
    expect(result.payload?.teacherId).toBe('t-pkcs8');
  });

  it('should reject tokens with non-base64 characters in signature', async () => {
    const { publicKey, privateKey } = await createEd25519KeyPair();
    const payload: LicensePayload = {
      teacherId: 't1',
      teacherName: 'اسم',
      subject: 'مادة',
      issuedAt: 1700000000000,
      expiresAt: 1800000000000,
      tier: 'single'
    };
    const token = await signLicensePayload(payload, privateKey);
    const [pB64] = token.split('.');
    const badToken = `${pB64}.!@#invalid$%^`;

    const result = await verifyEd25519License(badToken, publicKey, 1700000000000);
    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('INVALID_SIGNATURE');
    expect(result.errorMessage).toContain('Signature is not valid Base64URL');
  });

  it('should handle exceptions from crypto.subtle gracefully', async () => {
    const { publicKey, privateKey } = await createEd25519KeyPair();
    const payload: LicensePayload = {
      teacherId: 't1',
      teacherName: 'اسم',
      subject: 'مادة',
      issuedAt: 1700000000000,
      expiresAt: 1800000000000,
      tier: 'single'
    };
    const token = await signLicensePayload(payload, privateKey);

    const verifySpy = vi.spyOn(globalThis.crypto.subtle, 'verify').mockRejectedValueOnce(new Error('Subtle hardware exception'));
    const result = await verifyEd25519License(token, publicKey, 1700000000000);

    expect(result.valid).toBe(false);
    expect(result.errorCode).toBe('INVALID_SIGNATURE');
    expect(result.errorMessage).toContain('Subtle hardware exception');

    verifySpy.mockRestore();
  });
});
