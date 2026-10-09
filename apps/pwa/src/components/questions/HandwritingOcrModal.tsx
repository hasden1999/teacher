/**
 * HandwritingOcrModal - AI Handwriting OCR & Formula Extractor
 * Powered by Google Gemini 2.5 Flash Vision.
 * Strict Anti-Hallucination: Extracts only authentic text and formulas written in the image.
 * No user API key input required: Fully powered by central platform key managed by Admin.
 */

import React, { useState, useRef } from 'react';
import { useToast } from '../common/Toast.js';
import { getActiveGeminiApiKey } from '../../config/aiConfig.js';

export interface HandwritingOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyQuestions: (extractedText: string) => void;
  subjectName?: string;
}

export const HandwritingOcrModal: React.FC<HandwritingOcrModalProps> = ({
  isOpen,
  onClose,
  onApplyQuestions,
  subjectName = 'العلوم',
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [extractedResult, setExtractedResult] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({ message: 'يرجى اختيار ملف صورة صالح', type: 'error' });
      return;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setExtractedResult('');
    };
    reader.readAsDataURL(file);
  };

  const handleProcessOcr = async () => {
    if (!selectedImage) {
      showToast({ message: 'يرجى التقاط أو رفع صورة ورقة الأسئلة أولاً', type: 'error' });
      return;
    }

    setIsProcessing(true);

    try {
      const activeKey = getActiveGeminiApiKey();
      if (!activeKey) {
        showToast({
          message: 'مفتاح الذكاء الاصطناعي المركزي غير مضبوط في لوحة الإدارة',
          type: 'error',
        });
        setIsProcessing(false);
        return;
      }

      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(';')[0].split(':')[1] || 'image/jpeg';

      const promptText = `أنت نظام ذكاء اصطناعي فائق الدقة متخصص في قراءة واستخراج الأسئلة المكتوبة بخط اليد من أوراق الامتحانات المدرسية العراقية لمادة (${subjectName}).

تعليمات صارمة لمنع التخمين والاختلاق (Strict Anti-Hallucination Rules):
1. استخرج فقط وحصراً الكلمات والمعادلات المكتوبة بخط اليد في هذه الورقة بدقة متناهية 100%.
2. ممنوع منعاً باتاً اختلاق أو تخمين أو إكمال أي أسئلة أو أفرع أو معادلات غير ظاهرة في الصورة.
3. إذا كانت الصورة غير واضحة أو لا تحتوي على أسئلة مقروءة، اكتب فقط: "الصورة غير واضحة بما يكفي لاستخراج الأسئلة بدقة، يرجى إعادة التصوير بزاوية مستقيمة وإضاءة جيدة".
4. التزم بالتنسيق العراقي لما هو مكتوب فقط:
- س1: نص السؤال (الدرجة إن وجدت)
- فرع أ: نص الفرع
- فرع ب: نص الفرع
- استخرج أي معادلات رياضية أو فيزيائية بصيغة LaTeX محاطة بـ $ مثل $x = \\frac{a}{b}$
- استخرج أي معادلات كيميائية بصيغة \\ce{...}
أعد فقط نص الأسئلة الصافي بدون أي مقدمات أو شروحات أو اختلاق.`;

      // Try primary model gemini-2.5-flash, fallback to gemini-flash-latest
      const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest'];
      let candidateText = '';
      let lastErrorStatus = 0;

      for (const model of modelsToTry) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(activeKey)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: promptText },
                      {
                        inline_data: {
                          mime_type: mimeType,
                          data: base64Data,
                        },
                      },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.0,
                },
              }),
            }
          );

          if (response.ok) {
            const data = await response.json();
            candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            if (candidateText) break;
          } else {
            lastErrorStatus = response.status;
          }
        } catch {
          // try next model
        }
      }

      if (candidateText) {
        setExtractedResult(candidateText);
        showToast({
          message: 'تم استخراج نصوص ومعادلات خط اليد بدقة عبر الذكاء الاصطناعي!',
          type: 'success',
        });
      } else {
        showToast({
          message: lastErrorStatus
            ? `تعذر استخراج النص (رمز الخطأ: ${lastErrorStatus}). يرجى التحقق من وضوح الصورة.`
            : 'لم يتم التعرف على أي نصوص واضحة في الصورة، يرجى إعادة التصوير بوضوح أعلى.',
          type: 'warning',
        });
      }
    } catch (err: any) {
      showToast({
        message: `تعذر الاتصال بخدمة الذكاء الاصطناعي: ${err.message}`,
        type: 'error',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApply = () => {
    if (!extractedResult.trim()) {
      showToast({ message: 'لا يوجد نص مستخرج لإدراجه', type: 'error' });
      return;
    }
    onApplyQuestions(extractedResult.trim());
    showToast({ message: 'تم إدراج الأسئلة المستخرجة في ورقة الامتحان بنجاح!', type: 'success' });
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-md font-tajawal animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Mobile Drag Indicator */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden bg-teal-900">
          <div className="w-12 h-1.5 rounded-full bg-white/40" />
        </div>

        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-teal-800 to-cyan-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-xl shadow-inner">
              📸
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-extrabold flex items-center gap-2">
                <span>استخراج الأسئلة من خط اليد</span>
                <span className="text-[10px] bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded-full border border-teal-400/40">
                  Gemini Vision 2.5
                </span>
              </h2>
              <p className="text-teal-200 text-xs mt-0.5">
                التعرف الفوري الصارم على الأسئلة والمعادلات العلمية والرموز الرياضية والكيميائية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition"
          >
            ✕
          </button>
        </div>

        {/* Action Controls Bar */}
        <div className="p-3 sm:p-4 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[42px] px-4 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs shadow transition flex items-center gap-2 active:scale-95"
            >
              <span>📷</span>
              <span>رفع صورة / التقاط بالكاميرا</span>
            </button>
            {fileName && (
              <span className="text-xs text-slate-500 truncate max-w-[180px]">
                {fileName}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!selectedImage || isProcessing}
              onClick={handleProcessOcr}
              className={`min-h-[42px] px-5 py-2 rounded-xl font-extrabold text-xs shadow transition flex items-center gap-2 ${
                !selectedImage || isProcessing
                  ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95 cursor-pointer'
              }`}
            >
              <span>{isProcessing ? 'جارِ التحليل والتعرف الصارم...' : 'بدء الاستخراج الذكي ⚡'}</span>
            </button>
          </div>
        </div>

        {/* Main Work Area: 2 Columns */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-5 overflow-y-auto">
          {/* Column 1: Image Preview */}
          <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50 dark:bg-slate-900/60 min-h-[260px]">
            <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
              <span>🖼️</span>
              <span>معاينة صورة خط اليد:</span>
            </h3>
            {selectedImage ? (
              <div className="flex-1 flex items-center justify-center overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 p-2">
                <img
                  src={selectedImage}
                  alt="ورقة الأسئلة المكتوبة بخط اليد"
                  className="max-h-[340px] object-contain rounded-lg shadow-sm"
                />
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center p-8 text-center cursor-pointer hover:border-teal-500 transition-colors"
              >
                <span className="text-4xl mb-2">📸</span>
                <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  اضغط هنا لاختيار أو التقاط صورة ورقة الامتحان
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  يدعم خط اليد العراقي، المعادلات الرياضية، والكيميائية
                </p>
              </div>
            )}
          </div>

          {/* Column 2: Extracted Text Editor */}
          <div className="flex flex-col border border-slate-200 dark:border-slate-800 rounded-2xl p-3 bg-slate-50 dark:bg-slate-900/60 min-h-[260px]">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <span>📝</span>
                <span>النص المستخرج فعلياً (قابل للتعديل):</span>
              </h3>
              {extractedResult && (
                <button
                  type="button"
                  onClick={() => setExtractedResult('')}
                  className="text-[11px] text-rose-600 hover:underline"
                >
                  مسح
                </button>
              )}
            </div>

            <textarea
              value={extractedResult}
              onChange={(e) => setExtractedResult(e.target.value)}
              placeholder="سيظهر هنا النص المستخرج من الصورة حرفياً وبدون أي تأليف... يمكنك مراجعته وتعديل أي كلمة قبل اعتماده."
              rows={12}
              className="flex-1 w-full p-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 transition"
          >
            إلغاء
          </button>

          <button
            type="button"
            disabled={!extractedResult.trim()}
            onClick={handleApply}
            className={`min-h-[44px] px-6 py-2 rounded-xl font-extrabold text-xs shadow-md transition flex items-center gap-2 ${
              !extractedResult.trim()
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-teal-700 hover:bg-teal-800 text-white active:scale-95 cursor-pointer'
            }`}
          >
            <span>إدراج الأسئلة في ورقة الامتحان</span>
            <span>✓</span>
          </button>
        </div>
      </div>
    </div>
  );
};
