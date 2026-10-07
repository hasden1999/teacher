export type LicenseTier = 'single' | 'school' | 'pro';

export interface LicensePayload {
  teacherId: string;       // معرّف المعلم الفريد (UUID أو تسلسل وزاري)
  teacherName: string;     // الاسم الكامل للمعلم
  subject: string;         // المادة التخصصية المعتمدة
  issuedAt: number;        // تاريخ الإصدار بتوقيت UTC بالمللي ثانية
  expiresAt: number;       // تاريخ الانتهاء (أو 0 للترخيص مدى الحياة)
  tier: LicenseTier;       // باقة الترخيص
  schoolName?: string;     // اسم المدرسة (اختياري)
  governorate?: string;    // المحافظة (اختياري)
  features?: string[];     // الميزات المرخصة (اختياري)
  maxStudents?: number;    // الحد الأقصى للطلبة (اختياري)
  maxClasses?: number;     // الحد الأقصى للشعب (اختياري)
}

export type LicenseErrorCode =
  | 'INVALID_SIGNATURE'
  | 'EXPIRED'
  | 'CLOCK_TAMPERED'
  | 'MALFORMED';

export interface VerificationResult {
  valid: boolean;
  tampered: boolean;
  payload?: LicensePayload;
  errorCode?: LicenseErrorCode;
  errorMessage?: string;
}

/**
 * تحويل سلسلة Base64URL إلى مصفوفة بايتات Uint8Array بدون أخطاء حشو
 */
export function base64UrlToBytes(base64Url: string): Uint8Array {
  let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
  const remainder = base64.length % 4;
  if (remainder > 0) {
    base64 += '='.repeat(4 - remainder);
  }
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * تحويل Uint8Array إلى سلسلة Base64URL قياسية بدون علامات الحشو (=)
 */
export function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * توليد زوج مفاتيح Ed25519 أصيل عبر Web Crypto API للاختبارات وتوليد التراخيص
 */
export async function createEd25519KeyPair(): Promise<{
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}> {
  const keyPair = (await globalThis.crypto.subtle.generateKey(
    { name: 'Ed25519' },
    true,
    ['sign', 'verify']
  )) as CryptoKeyPair;

  const pubRaw = await globalThis.crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privPkcs8 = await globalThis.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  const privBytes = new Uint8Array(privPkcs8);
  const privRaw = privBytes.slice(privBytes.length - 32);

  return {
    publicKey: new Uint8Array(pubRaw),
    privateKey: privRaw
  };
}

/**
 * توقيع حمولة الترخيص وتوليد الرمز بصيغة Base64URL (payload.signature)
 */
export async function signLicensePayload(
  payload: LicensePayload,
  privateKeyPkcs8OrRaw: Uint8Array
): Promise<string> {
  const jsonStr = JSON.stringify(payload);
  const payloadB64 = bytesToBase64Url(new TextEncoder().encode(jsonStr));

  let privateKey: CryptoKey;
  if (privateKeyPkcs8OrRaw.length === 32) {
    // PKCS#8 header for Ed25519 (RFC 8410: 16 bytes prefix)
    const pkcs8Header = new Uint8Array([
      0x30, 0x2e, 0x02, 0x01, 0x00, 0x30, 0x05, 0x06, 0x03, 0x2b, 0x65, 0x70,
      0x04, 0x22, 0x04, 0x20
    ]);
    const fullPkcs8 = new Uint8Array(pkcs8Header.length + 32);
    fullPkcs8.set(pkcs8Header, 0);
    fullPkcs8.set(privateKeyPkcs8OrRaw, pkcs8Header.length);

    privateKey = await globalThis.crypto.subtle.importKey(
      'pkcs8',
      fullPkcs8 as unknown as BufferSource,
      { name: 'Ed25519' },
      false,
      ['sign']
    );
  } else {
    privateKey = await globalThis.crypto.subtle.importKey(
      'pkcs8',
      privateKeyPkcs8OrRaw as unknown as BufferSource,
      { name: 'Ed25519' },
      false,
      ['sign']
    );
  }

  const signatureBuffer = await globalThis.crypto.subtle.sign(
    { name: 'Ed25519' },
    privateKey,
    new TextEncoder().encode(payloadB64) as unknown as BufferSource
  );

  const sigB64 = bytesToBase64Url(new Uint8Array(signatureBuffer));
  return `${payloadB64}.${sigB64}`;
}

/**
 * التحقق اللامركزي من رمز ترخيص المعلم عبر المفتاح العام لخوارزمية Ed25519
 *
 * @param token رمز الترخيص بصيغة payload.signature
 * @param publicKeyBytes المفتاح العام الخام (32 بايت)
 * @param currentHwmTime التوقيت الزمني المعتمد المقاوم للتلاعب (High-Water Mark ms)
 */
export async function verifyEd25519License(
  token: string,
  publicKeyBytes: Uint8Array,
  currentHwmTime: number
): Promise<VerificationResult> {
  // 1. التحقق الأولي من هيكل الرمز
  if (!token || typeof token !== 'string') {
    return {
      valid: false,
      tampered: false,
      errorCode: 'MALFORMED',
      errorMessage: 'Token is empty or invalid type'
    };
  }

  const parts = token.trim().split('.');
  if (parts.length !== 2) {
    return {
      valid: false,
      tampered: false,
      errorCode: 'MALFORMED',
      errorMessage: 'Token format must be <payload>.<signature>'
    };
  }

  const [payloadB64, signatureB64] = parts;
  if (!payloadB64 || !signatureB64) {
    return {
      valid: false,
      tampered: false,
      errorCode: 'MALFORMED',
      errorMessage: 'Empty token segment encountered'
    };
  }

  // 2. فك تشفير وفحص حمولة الترخيص (Payload)
  let payload: LicensePayload;
  try {
    const payloadBytes = base64UrlToBytes(payloadB64);
    const jsonStr = new TextDecoder().decode(payloadBytes);
    payload = JSON.parse(jsonStr) as LicensePayload;
  } catch {
    return {
      valid: false,
      tampered: false,
      errorCode: 'MALFORMED',
      errorMessage: 'Payload is not valid Base64URL JSON'
    };
  }

  // التحقق من الحقول الإجبارية للترخيص
  if (
    !payload ||
    typeof payload !== 'object' ||
    !payload.teacherId ||
    !payload.teacherName ||
    !payload.subject ||
    typeof payload.issuedAt !== 'number' ||
    typeof payload.expiresAt !== 'number' ||
    !['single', 'school', 'pro'].includes(payload.tier)
  ) {
    return {
      valid: false,
      tampered: false,
      errorCode: 'MALFORMED',
      errorMessage: 'Payload missing required licensing fields'
    };
  }

  // 3. فحص المفتاح العام وبايتات التوقيع
  if (publicKeyBytes.length !== 32) {
    return {
      valid: false,
      tampered: false,
      errorCode: 'INVALID_SIGNATURE',
      errorMessage: 'Ed25519 raw public key must be exactly 32 bytes'
    };
  }

  let signatureBytes: Uint8Array;
  try {
    signatureBytes = base64UrlToBytes(signatureB64);
  } catch {
    return {
      valid: false,
      tampered: false,
      errorCode: 'INVALID_SIGNATURE',
      errorMessage: 'Signature is not valid Base64URL'
    };
  }

  if (signatureBytes.length !== 64) {
    return {
      valid: false,
      tampered: false,
      errorCode: 'INVALID_SIGNATURE',
      errorMessage: 'Ed25519 signature must be exactly 64 bytes'
    };
  }

  // 4. استيراد المفتاح العام والتحقق التشفيري عبر Web Crypto API
  try {
    const cryptoKey = await globalThis.crypto.subtle.importKey(
      'raw',
      publicKeyBytes as unknown as BufferSource,
      { name: 'Ed25519' },
      false,
      ['verify']
    );

    const dataToVerify = new TextEncoder().encode(payloadB64);
    const isValidSignature = await globalThis.crypto.subtle.verify(
      { name: 'Ed25519' },
      cryptoKey,
      signatureBytes as unknown as BufferSource,
      dataToVerify as unknown as BufferSource
    );

    if (!isValidSignature) {
      return {
        valid: false,
        tampered: false,
        errorCode: 'INVALID_SIGNATURE',
        errorMessage: 'Cryptographic signature verification failed'
      };
    }
  } catch (err) {
    return {
      valid: false,
      tampered: false,
      errorCode: 'INVALID_SIGNATURE',
      errorMessage: `Crypto subtle verification error: ${String(err)}`
    };
  }

  // 5. فحص التلاعب بساعة النظام (Clock Tamper / Skew Check)
  // السماح بتفاوت دقيقة واحدة (60000ms) للأخطاء الطفيفة
  if (currentHwmTime < payload.issuedAt - 60000) {
    return {
      valid: false,
      tampered: true,
      payload,
      errorCode: 'CLOCK_TAMPERED',
      errorMessage: 'Current system time is earlier than license issuance time'
    };
  }

  // 6. فحص انتهاء الصلاحية
  if (payload.expiresAt > 0 && currentHwmTime > payload.expiresAt) {
    return {
      valid: false,
      tampered: false,
      payload,
      errorCode: 'EXPIRED',
      errorMessage: 'License subscription has expired'
    };
  }

  // 7. الترخيص سليم تماماً
  return {
    valid: true,
    tampered: false,
    payload
  };
}
