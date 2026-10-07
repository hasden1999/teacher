export type LicenseTier = 'single' | 'school' | 'pro';
export interface LicensePayload {
    teacherId: string;
    teacherName: string;
    subject: string;
    issuedAt: number;
    expiresAt: number;
    tier: LicenseTier;
    schoolName?: string;
    governorate?: string;
    features?: string[];
    maxStudents?: number;
    maxClasses?: number;
}
export type LicenseErrorCode = 'INVALID_SIGNATURE' | 'EXPIRED' | 'CLOCK_TAMPERED' | 'MALFORMED';
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
export declare function base64UrlToBytes(base64Url: string): Uint8Array;
/**
 * تحويل Uint8Array إلى سلسلة Base64URL قياسية بدون علامات الحشو (=)
 */
export declare function bytesToBase64Url(bytes: Uint8Array): string;
/**
 * توليد زوج مفاتيح Ed25519 أصيل عبر Web Crypto API للاختبارات وتوليد التراخيص
 */
export declare function createEd25519KeyPair(): Promise<{
    publicKey: Uint8Array;
    privateKey: Uint8Array;
}>;
/**
 * توقيع حمولة الترخيص وتوليد الرمز بصيغة Base64URL (payload.signature)
 */
export declare function signLicensePayload(payload: LicensePayload, privateKeyPkcs8OrRaw: Uint8Array): Promise<string>;
/**
 * التحقق اللامركزي من رمز ترخيص المعلم عبر المفتاح العام لخوارزمية Ed25519
 *
 * @param token رمز الترخيص بصيغة payload.signature
 * @param publicKeyBytes المفتاح العام الخام (32 بايت)
 * @param currentHwmTime التوقيت الزمني المعتمد المقاوم للتلاعب (High-Water Mark ms)
 */
export declare function verifyEd25519License(token: string, publicKeyBytes: Uint8Array, currentHwmTime: number): Promise<VerificationResult>;
//# sourceMappingURL=ed25519.d.ts.map