#!/usr/bin/env node
/**
 * Standalone Offline License Generator CLI Tool for Techeeer
 * Used strictly in offline administrator environments. Never bundled into PWA client.
 *
 * Usage:
 *   npx tsx scripts/gen-license/index.ts <phone> <tier> [teacherName]
 * Example:
 *   npx tsx scripts/gen-license/index.ts 07701234567 annual "أ. أحمد علي"
 */

import {
  signLicensePayload,
  base64UrlToBytes,
  type LicensePayload,
  type LicenseTier,
} from '../../packages/core/src/index.js';

import fs from 'node:fs';
import path from 'node:path';

// Automatically load local .env file if present
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    for (const line of envContent.split('\n')) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        const val = match[2]?.trim().replace(/^['"](.*)['"]$/, '$1') || '';
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
} catch {}

// Rotated Official Master Private Key for Administrator Offline Signing (RFC 8410 PKCS#8)
const MASTER_SIGNING_PRIVATE_KEY_B64URL =
  process.env.TECHEER_ADMIN_SIGNING_KEY ||
  process.env.ADMIN_SIGNING_KEY;

const DURATION_DAYS: Record<string, number> = {
  weekly: 7,
  monthly: 30,
  semi_annual: 180,
  annual: 365,
  single: 365,
  school: 365,
  pro: 365,
};

const CORE_TIER_MAP: Record<string, LicenseTier> = {
  weekly: 'single',
  monthly: 'single',
  semi_annual: 'single',
  annual: 'single',
  single: 'single',
  school: 'school',
  pro: 'pro',
};

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: tsx scripts/gen-license/index.ts <phone> <tier> [teacherName]');
    console.error('Tiers: weekly | monthly | semi_annual | annual | single | school | pro');
    process.exit(1);
  }

  const [phone, rawTier, teacherName = 'الأستاذ المعتمد'] = args;
  const tier = rawTier.toLowerCase();
  const days = DURATION_DAYS[tier] || 365;
  const now = Date.now();

  const payload: LicensePayload = {
    teacherId: `iq_teacher_${phone.replace(/\D/g, '').slice(-6) || '7113'}`,
    teacherName,
    subject: 'عام',
    issuedAt: now,
    expiresAt: now + days * 24 * 60 * 60 * 1000,
    tier: CORE_TIER_MAP[tier] || 'single',
  };

  if (!MASTER_SIGNING_PRIVATE_KEY_B64URL) {
    console.error('❌ خطأ أمني: لم يتم العثور على مفتاح التوقيع الإداري.');
    console.error('يرجى تحديد TECHEER_ADMIN_SIGNING_KEY في ملف .env أو كمتغير بيئة.');
    process.exit(1);
  }

  const privateKeyBytes = base64UrlToBytes(MASTER_SIGNING_PRIVATE_KEY_B64URL);
  const token = await signLicensePayload(payload, privateKeyBytes);

  console.log('\n========================================');
  console.log('   🎉 تم إصدار الترخيص الرقمي بنجاح');
  console.log('========================================');
  console.log(`المعلم:       ${teacherName}`);
  console.log(`الهاتف:       ${phone}`);
  console.log(`الباقة:       ${tier} (${days} يوم)`);
  console.log(`تاريخ النفاذ: ${new Date(payload.expiresAt).toLocaleDateString('ar-IQ')}`);
  console.log('----------------------------------------');
  console.log('رمز التفعيل (Ed25519 Token):');
  console.log(token);
  console.log('========================================\n');
}

main().catch((err) => {
  console.error('فشل توليد الترخيص:', err);
  process.exit(1);
});
