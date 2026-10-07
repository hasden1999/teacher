/**
 * WhatsApp Evaluation Card Formatter & Deep-Link Dispatcher
 * Pure offline service for generating Arabic evaluation cards and secure wa.me links.
 * Complies with Iraqi MoE grading standards and offline privacy mandates (no third-party link shorteners).
 */

import { toWesternNumerals } from '@techeeer/core';
import type { StudentEvaluationCardData, EvaluationCardType } from '../types/gradebook.js';

/**
 * Normalizes Iraqi phone numbers into official international format (9647XXXXXXXXX).
 * Handles domestic 07... prefixes, spaces, dashes, +964, 00964, and Eastern Arabic numerals.
 */
export function normalizeIraqiPhone(rawPhone?: string | null): string | null {
  if (!rawPhone || typeof rawPhone !== 'string') return null;

  // Convert eastern numerals and strip non-digits
  const normalized = toWesternNumerals(rawPhone);
  const digits = normalized.replace(/\D/g, '');
  if (!digits) return null;

  // 009647... -> 9647...
  if (digits.startsWith('00964')) {
    const trimmed = digits.slice(2);
    return trimmed.length >= 12 && trimmed.length <= 13 ? trimmed : null;
  }

  // +9647... or 9647... (12 or 13 digits)
  if (digits.startsWith('964')) {
    return digits.length >= 12 && digits.length <= 13 ? digits : null;
  }

  // 077..., 078..., 075..., 079... (11 digits domestic)
  if (digits.startsWith('07') && digits.length === 11) {
    return '964' + digits.slice(1);
  }

  // 7XXXXXXXXX (10 digits mobile without leading 0)
  if (digits.startsWith('7') && digits.length === 10) {
    return '964' + digits;
  }

  // Fallback if already 10-14 digits valid international
  if (digits.length >= 10 && digits.length <= 14) {
    return digits;
  }

  return null;
}

/**
 * Maps card type to canonical Arabic title
 */
function getCardHeaderTitle(type: EvaluationCardType): string {
  switch (type) {
    case 'monthly':
      return 'بطاقة المتابعة والتقييم الشهري';
    case 'midterm':
      return 'بطاقة درجات امتحان نصف السنة';
    case 'annual_effort':
      return 'بطاقة السعي السنوي للطالب';
    case 'final_result':
      return 'بطاقة النتيجة والتقييم النهائي';
    case 'attendance':
      return 'إشعار المتابعة الميدانية والغياب';
    default:
      return 'بطاقة تقييم ومتابعة الطالب';
  }
}

/**
 * Evaluates student score and returns official Iraqi status badge
 */
export function getStudentStatusText(
  score?: number | null,
  isDecisionApplied?: boolean,
  decisionMarksUsed?: number
): {
  label: string;
  colorClass: string;
} {
  if (score === null || score === undefined) {
    return { label: 'قيد التقييم', colorClass: 'text-slate-500' };
  }

  if (isDecisionApplied && decisionMarksUsed && decisionMarksUsed > 0) {
    return {
      label: `ناجح بموجب درجات القرار الوزاري (${decisionMarksUsed} درجات)`,
      colorClass: 'text-amber-600 dark:text-amber-400',
    };
  }

  if (score >= 90) {
    return { label: 'ناجح ومتميز 🌟', colorClass: 'text-emerald-700 dark:text-emerald-400' };
  }
  if (score >= 70) {
    return { label: 'ناجح بجدارة 👍', colorClass: 'text-teal-700 dark:text-teal-300' };
  }
  if (score >= 50) {
    return { label: 'ناجح ✅', colorClass: 'text-blue-700 dark:text-blue-400' };
  }
  return { label: 'يحتاج إلى متابعة وتكثيف الجهود ⚠️', colorClass: 'text-rose-700 dark:text-rose-400' };
}

/**
 * Formats structured student evaluation into rich WhatsApp markdown text
 */
export function formatWhatsAppCard(data: StudentEvaluationCardData): string {
  const lines: string[] = [];

  // 1. Header & School
  lines.push(`📚 *${getCardHeaderTitle(data.cardType)}*`);
  if (data.schoolName) {
    lines.push(`🏫 *مدرسة:* ${data.schoolName}`);
  }
  lines.push('────────────────────────');

  // 2. Student & Course Identity
  lines.push(`👤 *الطالب:* ${data.studentName}`);
  lines.push(`🏷️ *الصف والشعبة:* ${data.className} / شعبة (${data.divisionName})`);
  lines.push(`📖 *المادة:* ${data.subjectName}`);
  lines.push(`🗓️ *العام الدراسي:* ${data.academicYear}${data.termName ? ` (${data.termName})` : ''}`);
  lines.push('────────────────────────');

  // 3. Grades Breakdown
  if (data.components) {
    lines.push('📊 *تفاصيل درجات النشاط اليومي (من 100):*');
    lines.push(`▫️ الشفوي: ${data.components.oral}/20`);
    lines.push(`▫️ التحريري والأنشطة: ${data.components.written}/20`);
    lines.push(`▫️ الواجبات البيتية: ${data.components.homework}/20`);
    lines.push(`▫️ السلوك والانضباط: ${data.components.behavior}/20`);
    lines.push(`▫️ المشاركة الصفية: ${data.components.participation}/20`);
    lines.push(`⭐️ مجموع النشاط اليومي: ${data.components.total}%`);
  } else if (data.score !== undefined && data.score !== null) {
    lines.push(`📊 *الدرجة المقيدة:* ${data.score}%`);
  }

  // Multi-term progression for annual or final
  if (data.cardType === 'annual_effort' || data.cardType === 'final_result') {
    if (data.term1Average !== undefined) lines.push(`🔹 معدل الفصل الأول: ${data.term1Average}%`);
    if (data.midtermScore !== undefined) lines.push(`🔹 درجة نصف السنة: ${data.midtermScore}%`);
    if (data.term2Average !== undefined) lines.push(`🔹 معدل الفصل الثاني: ${data.term2Average}%`);
    if (data.annualEffort !== undefined) lines.push(`⭐️ *السعي السنوي:* ${data.annualEffort}%`);
    if (data.finalExamScore !== undefined) lines.push(`📝 الامتحان النهائي: ${data.finalExamScore}%`);
    if (data.finalResult !== undefined) lines.push(`🏆 *النتيجة النهائية:* ${data.finalResult}%`);
  }

  // Decision marks notification
  if (data.decisionMarks?.applied) {
    lines.push('');
    lines.push(`⚖️ *تطبيق القرار الوزاري:*`);
    lines.push(`▫️ الدرجة قبل القرار: ${data.decisionMarks.originalScore}%`);
    lines.push(`▫️ الدرجة بعد القرار: *${data.decisionMarks.adjustedScore}%*`);
    lines.push(`▫️ الدرجات المستهلكة: ${data.decisionMarks.usedMarks} من رصيد ${data.decisionMarks.pool}`);
  }

  // Absences and Attendance Penalties
  if (data.absencesCount !== undefined && data.absencesCount > 0) {
    lines.push('');
    let absenceText = `⚠️ أيام الغياب: ${data.absencesCount} يوم`;
    if (data.absencePenaltyMarks && data.absencePenaltyMarks > 0) {
      absenceText += ` | خصم الغياب: ${data.absencePenaltyMarks} درجات`;
    }
    lines.push(absenceText);
  }

  // 4. Status
  const currentTotal = data.components?.total ?? data.score;
  const status = getStudentStatusText(
    data.decisionMarks?.applied ? data.decisionMarks.adjustedScore : currentTotal,
    data.decisionMarks?.applied,
    data.decisionMarks?.usedMarks
  );
  lines.push('');
  lines.push(`🎯 *النتيجة / الحالة:* *${data.statusLabel || status.label}*`);

  // 5. Teacher Notes
  if (data.teacherNotes && data.teacherNotes.trim()) {
    lines.push('');
    lines.push(`💬 *ملاحظات المعلم:*`);
    lines.push(`"${data.teacherNotes.trim()}"`);
  }

  // 6. Encouraging Closing & Signature
  lines.push('────────────────────────');
  lines.push(data.encouragingClosing || '🌟 دعواتنا لابننا العزيز بدوام التوفيق والتفوق الباهر 🌟');
  if (data.teacherName) {
    lines.push(`✍️ *مدرس المادة:* ${data.teacherName}`);
  }
  lines.push(`📱 *تم الإصدار بواسطة مساعد المعلم العراقي*`);

  return lines.join('\n');
}

/**
 * Generates direct wa.me link without any third-party URL shorteners (T2.14.4 compliant).
 */
export function generateWhatsAppUrl(rawPhone?: string | null, message: string = ''): string {
  const cleanPhone = normalizeIraqiPhone(rawPhone);
  const encodedMsg = encodeURIComponent(message);

  if (cleanPhone) {
    return `https://wa.me/${cleanPhone}?text=${encodedMsg}`;
  }
  // If no phone or invalid, open general WhatsApp share link
  return `https://wa.me/?text=${encodedMsg}`;
}

/**
 * Copies formatted text to clipboard with modern API and reliable fallback
 */
export async function copyCardToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback below
    }
  }

  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      return successful;
    } catch {
      return false;
    }
  }

  return false;
}
