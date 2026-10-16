import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../common/Toast.js';
import { getActiveGeminiApiKey } from '../../config/aiConfig.js';

export interface StudentRosterOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStudents: (students: Array<{ fullName: string; gender: 'male' | 'female'; rollNumber?: number }>) => void;
  divisionName?: string;
}

export interface ExtractedStudentCandidate {
  id: string;
  fullName: string;
  gender: 'male' | 'female';
  rollNumber: number;
  isSelected: boolean;
}

export const StudentRosterOcrModal: React.FC<StudentRosterOcrModalProps> = ({
  isOpen,
  onClose,
  onApplyStudents,
  divisionName = 'الشعبة',
}) => {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<ExtractedStudentCandidate[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!isOpen) {
      setSelectedImage(null);
      setCandidates([]);
      setIsProcessing(false);
      setStatusMessage('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const optimizeImage = (dataUrl: string): Promise<{ base64: string; mimeType: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 2048;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
          const optimized = canvas.toDataURL('image/jpeg', 0.92);
          resolve({ base64: optimized.split(',')[1], mimeType: 'image/jpeg' });
          return;
        }
        resolve({
          base64: dataUrl.split(',')[1],
          mimeType: (dataUrl.split(';')[0].split(':')[1] || 'image/jpeg').trim(),
        });
      };
      img.onerror = () => {
        resolve({
          base64: dataUrl.split(',')[1],
          mimeType: (dataUrl.split(';')[0].split(':')[1] || 'image/jpeg').trim(),
        });
      };
      img.src = dataUrl;
    });
  };

  const handleFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast({ message: 'يرجى اختيار ملف صورة صالح', type: 'error' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setCandidates([]);
    };
    reader.readAsDataURL(file);
  };

  const handleProcessOcr = async () => {
    if (!selectedImage) {
      showToast({ message: 'يرجى التقاط أو رفع صورة القائمة أولاً', type: 'error' });
      return;
    }

    setIsProcessing(true);
    setStatusMessage('جاري تحليل خط اليد واستخراج أسماء الطلبة...');

    try {
      const activeKey = getActiveGeminiApiKey();
      if (!activeKey) {
        showToast({
          message: 'مفتاح التحليل غير متوفر، يرجى التحقق من إعدادات النظام',
          type: 'error',
        });
        setIsProcessing(false);
        return;
      }

      const { base64: base64Data, mimeType } = await optimizeImage(selectedImage);

      const promptText = `أنت ماسح ضوئي حرفي دقيق جداً لقوائم وسجلات الطلاب المكتوبة بخط اليد في المدارس العراقية.
مهمتك: استخراج أسماء الطلاب المكتوبة في الصورة بدقة ونقلها حرفياً دون أي تأليف أو تخمين.

شروط وقواعد صارمة:
1. اقرأ فقط الأسماء المكتوبة فعلياً في الورقة. لا تبتكر أي اسم من عندك نهائياً.
2. إذا كان هناك رقم تسلسل مكتوب بجانب الاسم، استخرجه. إذا لم يوجد رقم، قم بالترقيم تلقائياً بدءاً من 1.
3. حدد الجنس (ذكر أو أنثى) بناءً على الأسماء العراقية الشائعة (مثال: أحمد، علي، حيدر، كرار، محمد -> ذكر | فاطمة، زينب، مريم، زهراء، نور -> أنثى).
4. أخرج النتيجة بصيغة JSON فقط كصفوف كالتالي بدون أي شروحات أو ماركداون:
[
  {"rollNumber": 1, "fullName": "اسم الطالب الثلاثي أو الرباعي", "gender": "male"},
  {"rollNumber": 2, "fullName": "اسم الطالبة الثلاثي", "gender": "female"}
]`;

      const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest'];
      let candidateJson = '';

      for (const model of modelsToTry) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(activeKey)}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: promptText },
                      { inline_data: { mime_type: mimeType, data: base64Data } },
                    ],
                  },
                ],
                generationConfig: {
                  temperature: 0.0,
                  response_mime_type: 'application/json',
                },
              }),
            }
          );

          if (res.ok) {
            const data = await res.json();
            candidateJson = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
            if (candidateJson) break;
          }
        } catch {
          // fallback to next model
        }
      }

      if (candidateJson) {
        try {
          const cleaned = candidateJson.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const items: ExtractedStudentCandidate[] = parsed.map((p: any, idx: number): ExtractedStudentCandidate => ({
              id: `ocr_std_${Date.now()}_${idx}`,
              fullName: String(p.fullName || '').trim(),
              gender: (p.gender === 'female' ? 'female' : 'male') as 'male' | 'female',
              rollNumber: Number(p.rollNumber) || idx + 1,
              isSelected: true,
            })).filter((item: ExtractedStudentCandidate) => item.fullName.length > 0);

            if (items.length > 0) {
              setCandidates(items);
              showToast({
                message: `تم التعرف على ${items.length} طالباً بنجاح! راجع الأسماء قبل الاعتماد.`,
                type: 'success',
              });
              setIsProcessing(false);
              return;
            }
          }
        } catch (jsonErr) {
          console.warn('Failed to parse OCR response:', jsonErr);
        }
      }

      showToast({
        message: 'لم يتم التعرف على أسماء واضحة، يرجى التأكد من استقامة الصورة والإضاءة الجيدة.',
        type: 'warning',
      });
    } catch (err: any) {
      showToast({ message: `فشلت المعالجة: ${err.message}`, type: 'error' });
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleUpdateCandidate = (id: string, updates: Partial<ExtractedStudentCandidate>) => {
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const handleDeleteCandidate = (id: string) => {
    setCandidates(prev => prev.filter(c => c.id !== id));
  };

  const handleAddNewCandidate = () => {
    const nextNum = candidates.length + 1;
    const newItem: ExtractedStudentCandidate = {
      id: `ocr_std_${Date.now()}_new`,
      fullName: '',
      gender: 'male',
      rollNumber: nextNum,
      isSelected: true,
    };
    setCandidates(prev => [...prev, newItem]);
  };

  const handleConfirmAndApply = () => {
    const activeSelected = candidates.filter(c => c.isSelected && c.fullName.trim().length > 0);
    if (activeSelected.length === 0) {
      showToast({ message: 'يرجى تحديد طالب واحد على الأقل للاعتماد', type: 'warning' });
      return;
    }

    onApplyStudents(
      activeSelected.map(c => ({
        fullName: c.fullName.trim(),
        gender: c.gender,
        rollNumber: c.rollNumber,
      }))
    );
    showToast({
      message: `تم اعتماد وإضافة ${activeSelected.length} طالباً إلى ${divisionName} بنجاح!`,
      type: 'success',
    });
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/75 backdrop-blur-sm font-tajawal animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-t-3xl sm:rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-teal-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-xl shadow-inner">
              📸
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                إدراج الطلاب عبر مسح خط اليد
              </h2>
              <p className="text-xs text-teal-100">
                التقط صورة لقائمة الطلاب بخط اليد أو اختر صورة من جهازك لإدراجهم في {divisionName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق"
            className="w-10 h-10 rounded-xl hover:bg-white/20 flex items-center justify-center font-bold text-lg cursor-pointer transition"
          >
            ✕
          </button>
        </div>

        {/* Hidden File / Camera Inputs */}
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          className="hidden"
          onChange={handleFilePicked}
        />
        <input
          type="file"
          ref={cameraInputRef}
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFilePicked}
        />

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {/* Capture / Select Buttons */}
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className="min-h-[50px] p-3 rounded-2xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition shadow-xs"
            >
              <span className="text-xl">📷</span>
              <span>فتح الكاميرا المباشرة</span>
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[50px] p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 cursor-pointer transition shadow-xs"
            >
              <span className="text-xl">🖼️</span>
              <span>اختيار صورة من الجهاز</span>
            </button>
          </div>

          {/* Image Preview & Processing Status */}
          {selectedImage && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  الصورة المحددة:
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedImage(null)}
                  className="text-xs text-red-600 hover:text-red-700 font-bold cursor-pointer"
                >
                  إلغاء الصورة
                </button>
              </div>
              <div className="max-h-48 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 flex justify-center bg-black/10">
                <img
                  src={selectedImage}
                  alt="ورقة الطلاب"
                  className="object-contain max-h-48 w-auto rounded-lg"
                />
              </div>

              {candidates.length === 0 && (
                <button
                  type="button"
                  onClick={handleProcessOcr}
                  disabled={isProcessing}
                  className="w-full min-h-[48px] py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>{statusMessage || 'جاري التحليل...'}</span>
                    </>
                  ) : (
                    <>
                      <span>🔍 البدء في قراءة الأسماء من خط اليد</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Extracted Candidates Table for Review and Editing */}
          {candidates.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    مراجعة وتعديل قائمة الطلاب ({candidates.length} طالب)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    تحقق من صحة الأسماء والجنس، يمكنك التعديل المباشر قبل الاعتماد
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddNewCandidate}
                  className="text-xs bg-teal-50 dark:bg-teal-950 text-teal-800 dark:text-teal-200 border border-teal-200 dark:border-teal-800 px-3 py-1.5 rounded-lg font-bold hover:bg-teal-100 cursor-pointer"
                >
                  + إضافة اسم
                </button>
              </div>

              <div className="max-h-72 overflow-y-auto border border-slate-200 dark:border-slate-700 rounded-2xl divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                {candidates.map((c, index) => (
                  <div
                    key={c.id}
                    className="p-2.5 sm:p-3 flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition"
                  >
                    <input
                      type="checkbox"
                      checked={c.isSelected}
                      onChange={(e) => handleUpdateCandidate(c.id, { isSelected: e.target.checked })}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 cursor-pointer"
                    />
                    <span className="w-6 text-xs font-bold text-slate-400 text-center shrink-0">
                      {index + 1}
                    </span>
                    <input
                      type="text"
                      value={c.fullName}
                      onChange={(e) => handleUpdateCandidate(c.id, { fullName: e.target.value })}
                      placeholder="اسم الطالب الكامل"
                      className="flex-1 text-xs sm:text-sm font-bold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:bg-white focus:ring-1 focus:ring-teal-500"
                    />
                    <select
                      value={c.gender}
                      onChange={(e) => handleUpdateCandidate(c.id, { gender: e.target.value as 'male' | 'female' })}
                      className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 shrink-0 font-medium cursor-pointer"
                    >
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleDeleteCandidate(c.id)}
                      aria-label="حذف"
                      className="w-8 h-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center text-sm font-bold cursor-pointer shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            إلغاء
          </button>
          {candidates.length > 0 && (
            <button
              type="button"
              onClick={handleConfirmAndApply}
              className="min-h-[44px] px-6 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>✓ اعتماد الطلاب وإضافتهم للشعبة ({candidates.filter(c => c.isSelected && c.fullName.trim()).length})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
