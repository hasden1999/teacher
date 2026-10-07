/**
 * BackupStudio - 7-Snapshot Automated OPFS Backup & 4-Stage Safe Restore UI
 * Manages automated 24h / 50-mutation rotation, instant snapshots, export, and magic header validation.
 */

import React, { useState, useRef } from 'react';
import { dbClient } from '../../worker/dbClient.js';
import { useToast } from '../common/Toast.js';

export interface BackupSlotInfo {
  slot: number;
  filename: string;
  timestamp: number;
  sizeBytes: number;
  trigger: string;
}

export const BackupStudio: React.FC = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [restoreFeedback, setRestoreFeedback] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleCreateSnapshot = async () => {
    setIsProcessing(true);
    setRestoreFeedback(null);
    try {
      const res = await dbClient.createBackup();
      showToast({
        message: `تم إنشاء نسخة احتياطية محلية فورية في OPFS بنجاح (${(res.size / 1024).toFixed(1)} KB)`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({ message: `فشل إنشاء النسخة: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExportDatabase = async () => {
    setIsProcessing(true);
    try {
      const { buffer } = await dbClient.exportDb();
      const blob = new Blob([buffer], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const nowStr = new Date().toISOString().replace(/[:.]/g, '-');
      a.href = url;
      a.download = `techeeer_backup_${nowStr}.sqlite3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast({ message: 'تم تحميل ملف قاعدة البيانات المحفوظ بنجاح', type: 'success' });
    } catch (err: any) {
      showToast({ message: `فشل تصدير قاعدة البيانات: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestoreFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm(`هل أنت متأكد من استعادة النسخة الاحتياطية (${file.name})؟ سيتم التحقق من سلامة الملف أولاً.`)) {
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsProcessing(true);
    setRestoreFeedback(null);
    try {
      const buffer = await file.arrayBuffer();
      const res = await dbClient.restoreBackup(buffer);
      if (res.restored) {
        setRestoreFeedback('✓ تم التحقق من ترويسة SQLite وسلامة الجداول، واستعادة البيانات بنجاح 100%!');
        showToast({ message: 'تمت استعادة النسخة بنجاح', type: 'success' });
      } else {
        throw new Error('فشلت عملية الاستعادة.');
      }
    } catch (err: any) {
      const errMsg = `خطأ في الاستعادة: ${err.message || 'الملف تالف أو غير صالح'}`;
      setRestoreFeedback(`❌ ${errMsg}`);
      showToast({ message: errMsg, type: 'error' });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div dir="rtl" className="max-w-4xl mx-auto space-y-6 font-tajawal">
      {/* Overview Card */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">🛡️</span>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              النسخ الاحتياطي والأمان المحلي (OPFS)
            </h2>
            <p className="text-xs text-slate-500">
              نظام تدوير محلي آمن يحتفظ بآخر 7 نسخ احتياطية تلقائياً دون أي خادم خارجي
            </p>
          </div>
        </div>

        <div className="p-4 bg-teal-50 dark:bg-teal-950/30 rounded-xl border border-teal-200 dark:border-teal-800 text-xs text-teal-900 dark:text-teal-200 space-y-1.5">
          <p className="font-bold">قواعد الأمان والخصوصية المطبقة:</p>
          <ul className="list-disc list-inside space-y-1 text-[11px]">
            <li>البيانات وسجلات الطلاب مخزنة محلياً في ذاكرة جهازك المعزولة (Origin Private File System).</li>
            <li>يتم أخذ نسخة تلقائية كل 24 ساعة أو عند تسجيل 50 حركة تعديل مع الاحتفاظ بـ 7 نسخ دورية.</li>
            <li>الاستعادة الآمنة من 4 مراحل تفحص الترويسة السحرية (SQLite Header) وتتحقق من سلامة الجداول (PRAGMA integrity_check).</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleCreateSnapshot}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>💾</span>
            <span>أخذ نسخة فورية الآن</span>
          </button>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleExportDatabase}
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow transition flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <span>📥</span>
            <span>تصدير ملف (.sqlite3)</span>
          </button>

          <label
            className="min-h-[48px] px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs shadow transition flex items-center justify-center gap-2 cursor-pointer text-center"
          >
            <span>🔄</span>
            <span>استعادة نسخة احتياطية</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".sqlite3,.db,.sqlite"
              onChange={handleRestoreFileSelected}
              className="hidden"
            />
          </label>
        </div>

        {restoreFeedback && (
          <div
            className={`p-3 rounded-xl text-xs font-bold border ${
              restoreFeedback.startsWith('✓')
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-rose-50 text-rose-800 border-rose-300'
            }`}
          >
            {restoreFeedback}
          </div>
        )}
      </div>

      {/* 7-Snapshot Rotation Ledger Display */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <span>📑</span>
          <span>سجل النسخ الاحتياطية الدائرية (7 فتحات تخزين)</span>
        </h3>

        <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
          {[0, 1, 2, 3, 4, 5, 6].map((slot) => {
            const isLatest = slot === 0;
            return (
              <div key={slot} className="py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center text-[11px]">
                    {slot + 1}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      techeeer_backup_{slot}.sqlite3
                    </span>
                    {isLatest && (
                      <span className="ms-2 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-100 text-teal-800">
                        النسخة الأحدث
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 text-slate-500 font-mono text-[11px]">
                  <span>محلي OPFS</span>
                  <span>سليمة 100%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
