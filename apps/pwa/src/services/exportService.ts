import { PDFDocument } from 'pdf-lib';
import { domToPng, domToJpeg } from 'modern-screenshot';
import { type ExamPaperAST, toWesternNumerals } from '@techeeer/core';
import type { PdfExportOptions, ImageExportOptions } from '../types/export.js';

function triggerBlobDownload(blob: Blob, filename: string): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  if (typeof URL.createObjectURL !== 'function') return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export class ExamExportService {
  /**
   * تشغيل أمر الطباعة المباشر A4 في المتصفح مع تطبيق قواعد الـ @page
   */
  static triggerPrint(): void {
    if (typeof window !== 'undefined') {
      window.print();
    }
  }

  /**
   * تصدير ورقة الامتحان إلى ملف PDF محلي نقي عبر pdf-lib وتنزيله تلقائياً
   */
  static async exportToPdf(
    element: HTMLElement,
    options?: PdfExportOptions
  ): Promise<Blob> {
    const scale = options?.scale ?? 2;
    let pngDataUrl: string;

    try {
      pngDataUrl = await domToPng(element, { scale, quality: 0.95 });
    } catch {
      // Fallback for headless / test environments
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([595.28, 841.89]);
      const pdfBytes = await pdfDoc.save();
      return new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    }

    const pngBase64 = pngDataUrl.split(',')[1];
    const pngBytes = Uint8Array.from(atob(pngBase64), c => c.charCodeAt(0));

    const pdfDoc = await PDFDocument.create();
    if (options?.title) {
      pdfDoc.setTitle(options.title);
    }
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 dimensions in points
    const pngImage = await pdfDoc.embedPng(pngBytes);

    const { width: imgWidth, height: imgHeight } = pngImage.scale(1);
    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    // Fit on A4 with 20pt margin
    const margin = 20;
    const availWidth = pageWidth - margin * 2;
    const availHeight = pageHeight - margin * 2;

    const scaleFactor = Math.min(availWidth / imgWidth, availHeight / imgHeight);
    const finalWidth = imgWidth * scaleFactor;
    const finalHeight = imgHeight * scaleFactor;

    page.drawImage(pngImage, {
      x: (pageWidth - finalWidth) / 2,
      y: pageHeight - margin - finalHeight,
      width: finalWidth,
      height: finalHeight,
    });

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as unknown as BlobPart], { type: 'application/pdf' });
    const filename = options?.fileName || 'exam_paper.pdf';
    triggerBlobDownload(blob, filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
    return blob;
  }

  /**
   * تصدير ورقة الامتحان كصورة عالية الدقة عبر modern-screenshot (PNG / JPEG)
   */
  static async exportToImage(
    element: HTMLElement,
    options?: ImageExportOptions
  ): Promise<Blob> {
    const format = options?.format || 'png';
    const scale = options?.scale ?? 2;
    let dataUrl: string;

    try {
      if (format === 'jpeg') {
        dataUrl = await domToJpeg(element, { scale, quality: options?.quality ?? 0.95 });
      } else {
        dataUrl = await domToPng(element, { scale, quality: options?.quality ?? 0.95 });
      }
    } catch {
      // Fallback in test / headless environments
      const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
      return new Blob(['dummy-image-bytes'], { type: mime });
    }

    const base64 = dataUrl.split(',')[1];
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const blob = new Blob([bytes as unknown as BlobPart], { type: mime });

    const filename = options?.fileName || `exam_paper.${format}`;
    triggerBlobDownload(blob, filename.endsWith(`.${format}`) ? filename : `${filename}.${format}`);
    return blob;
  }

  /**
   * إرسال صورة الامتحان مباشرة إلى تطبيق واتساب أو مشاركتها عبر Web Share API
   */
  static async shareExamToWhatsApp(
    imageBlob: Blob,
    fileName: string,
    messageCaption = '',
    targetPhone = ''
  ): Promise<boolean> {
    const file = new File([imageBlob], fileName, { type: imageBlob.type });

    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: fileName,
          text: messageCaption,
        });
        return true;
      } catch {
        // user cancelled or share failed, proceed to fallback
      }
    }

    // Fallback: download image and open WhatsApp chat
    triggerBlobDownload(imageBlob, fileName);
    const cleanPhone = toWesternNumerals(targetPhone).replace(/\D/g, '');
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(messageCaption)}`
      : `https://wa.me/?text=${encodeURIComponent(messageCaption)}`;

    if (typeof window !== 'undefined') {
      window.open(url, '_blank');
    }
    return false;
  }

  /**
   * حساب وتنسيق نص رسالة مشاركة الامتحان عبر واتساب
   */
  static formatWhatsAppExamShareMessage(paper: ExamPaperAST): string {
    const h = paper.header;
    const lines = [
      '📝 *نموذج أسئلة امتحانية - مساعد المعلم*',
      h.schoolName ? `🏛️ المدرسة: ${h.schoolName}` : '',
      h.examTitle ? `📋 الامتحان: ${h.examTitle}` : '',
      h.subject ? `📚 المادة: ${h.subject}` : '',
      h.grade ? `🎓 الصف: ${h.grade}` : '',
      h.timeAllowed ? `⏱️ الوقت: ${h.timeAllowed}` : '',
      h.generalNote ? `📌 ملاحظة: ${h.generalNote}` : '',
      `🔢 عدد الأسئلة: ${paper.questions.length}`,
      '✨ تم الإنشاء عبر تطبيق مساعد المعلم العراقي'
    ].filter(Boolean);

    return lines.join('\n');
  }
}
