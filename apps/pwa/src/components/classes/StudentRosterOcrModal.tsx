import React, { useState, useEffect, useRef } from 'react';
import { useToast } from '../common/Toast.js';
import { getActiveGeminiApiKey } from '../../config/aiConfig.js';
import { aiGatewayService } from '../../services/aiGatewayService.js';

export interface StudentRosterOcrModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyStudents: (
    students: Array<{ fullName: string; gender: 'male' | 'female'; rollNumber?: number }>,
    targetDivisionId?: string
  ) => Promise<void> | void;
  divisionName?: string;
  divisionsList?: Array<{ id: string; name: string; gradeLevel?: string | number }>;
  currentDivisionId?: string;
}

export interface ExtractedStudentCandidate {
  id: string;
  fullName: string;
  gender: 'male' | 'female';
  rollNumber: number;
  isSelected: boolean;
}

/**
 * Resilient Arabic Gender Detector
 */
export function detectIsFemaleGender(rawGender: string, name: string): boolean {
  const g = rawGender.toLowerCase().trim();
  if (g === 'female' || g === 'أنثى' || g === 'انثى' || g === 'f') return true;
  if (g === 'male' || g === 'ذكر' || g === 'm') return false;

  const firstName = name.trim().split(/\s+/)[0] || '';
  const femaleNames = new Set([
    'فاطمة', 'زينب', 'مريم', 'زهراء', 'نور', 'هدى', 'سارة', 'تبارك', 'بنين', 'اية', 'آية',
    'روان', 'رغد', 'شهد', 'ضحى', 'ريام', 'حوراء', 'يقين', 'طيبة', 'اسراء', 'إسراء',
    'دعاء', 'ولاء', 'نجلاء', 'خلود', 'سناء', 'شمس', 'مروة', 'صفا', 'صفاء', 'علا', 'منى',
    'سمية', 'بتول', 'خديجة', 'رند', 'تقى', 'هبة', 'نبأ', 'سجى', 'داليا', 'اديان', 'أديان',
    'كوثر', 'تبارك', 'غدير', 'حنين', 'أبرار', 'جنات', 'ملك', 'سدرة', 'ريحانة', 'إيلاف'
  ]);

  if (femaleNames.has(firstName)) return true;
  if (firstName.endsWith('ة') && firstName !== 'حمزة' && firstName !== 'طلحة' && firstName !== 'أسامة' && firstName !== 'قتيبة' && firstName !== 'عكرمة') {
    return true;
  }
  return false;
}

/**
 * Resilient Roster Parser:
 * Parses JSON arrays OR line-by-line Arabic names (with numbers, bullets, commas)
 * Guaranteed to never crash or reject valid student names.
 */
export function parseRawRosterText(text: string): ExtractedStudentCandidate[] {
  if (!text || !text.trim()) return [];

  // 1. Try parsing JSON if structured
  try {
    const cleaned = text.replace(/```json/gi, '').replace(/```/g, '').trim();
    if (cleaned.startsWith('[') || cleaned.startsWith('{')) {
      const parsed = JSON.parse(cleaned);
      let rawArray: any[] = [];
      if (Array.isArray(parsed)) {
        rawArray = parsed;
      } else if (parsed && typeof parsed === 'object') {
        const possible =
          parsed.students ||
          parsed.roster ||
          parsed.candidates ||
          parsed.items ||
          Object.values(parsed).find((v) => Array.isArray(v));
        if (Array.isArray(possible)) {
          rawArray = possible;
        }
      }

      if (rawArray.length > 0) {
        const items = rawArray
          .map((p: any, idx: number): ExtractedStudentCandidate => {
            const rawName =
              p.fullName ||
              p.name ||
              p.studentName ||
              p.student_name ||
              p['اسم الطالب'] ||
              p['الاسم'] ||
              '';
            const isFemale = detectIsFemaleGender(String(p.gender || ''), String(rawName));
            return {
              id: `std_ocr_${Date.now()}_${idx}`,
              fullName: String(rawName).trim(),
              gender: isFemale ? 'female' : 'male',
              rollNumber: Number(p.rollNumber) || idx + 1,
              isSelected: true,
            };
          })
          .filter((item) => item.fullName.length > 0);

        if (items.length > 0) return items;
      }
    }
  } catch {
    // Non-JSON format, fall through to line-by-line regex parsing
  }

  // 2. Resilient Line-by-Line Regex Fallback Parser
  const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
  const results: ExtractedStudentCandidate[] = [];
  let currentRoll = 1;

  for (const line of lines) {
    if (line.startsWith('```') || line.startsWith('#') || line.startsWith('===') || line.startsWith('---')) continue;
    if (/^(اسماء|أسماء|قائمة|سجل|الرقم|تسلسل|ملاحظات|المجموع|اسم الطالب|الاسم الثلاثي)/i.test(line)) continue;

    // Strip leading numbering: "1-", "1.", "[1]", "1)", "1 "
    let cleanLine = line.replace(/^\s*\[?\d+[\.\-\)\:\s\]]+\s*/, '').trim();
    // Strip bullets: "•", "-", "*", "·", ">"
    cleanLine = cleanLine.replace(/^[\u2022\u25E6\u2219\*\-\+\>\#\•\–]+\s*/, '').trim();

    // Check trailing gender indicators: "علي حسين - ذكر" / "مريم - أنثى"
    let detectedGender: 'male' | 'female' | null = null;
    if (/[\-\,\/\|\t]+\s*(ذكر|طالب|ولد|male|m)\s*$/i.test(cleanLine)) {
      detectedGender = 'male';
      cleanLine = cleanLine.replace(/[\-\,\/\|\t]+\s*(ذكر|طالب|ولد|male|m)\s*$/i, '').trim();
    } else if (/[\-\,\/\|\t]+\s*(أنثى|انثى|طالبة|بنت|female|f)\s*$/i.test(cleanLine)) {
      detectedGender = 'female';
      cleanLine = cleanLine.replace(/[\-\,\/\|\t]+\s*(أنثى|انثى|طالبة|بنت|female|f)\s*$/i, '').trim();
    }

    cleanLine = cleanLine.replace(/^["'«\(\[]+|["'»\)\]]+$/g, '').trim();

    if (cleanLine.length >= 2 && !cleanLine.startsWith('{') && !cleanLine.startsWith('}')) {
      const isFemale = detectedGender !== null
        ? detectedGender === 'female'
        : detectIsFemaleGender('', cleanLine);

      results.push({
        id: `std_parsed_${Date.now()}_${currentRoll}`,
        fullName: cleanLine,
        gender: isFemale ? 'female' : 'male',
        rollNumber: currentRoll,
        isSelected: true,
      });
      currentRoll++;
    }
  }

  return results;
}

export const StudentRosterOcrModal: React.FC<StudentRosterOcrModalProps> = ({
  isOpen,
  onClose,
  onApplyStudents,
  divisionName = 'الشعبة',
  divisionsList,
  currentDivisionId,
}) => {
  const [activeTab, setActiveTab] = useState<'paste' | 'camera'>('paste');
  const [pastedText, setPastedText] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isApplying, setIsApplying] = useState<boolean>(false);
  const [candidates, setCandidates] = useState<ExtractedStudentCandidate[]>([]);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const [selectedTargetDivId, setSelectedTargetDivId] = useState<string>(() => {
    if (currentDivisionId) return currentDivisionId;
    if (divisionsList && divisionsList.length > 0) {
      const match = divisionsList.find((d) => d.name === divisionName);
      return match ? match.id : divisionsList[0].id;
    }
    return 'div_1';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (currentDivisionId) {
      setSelectedTargetDivId(currentDivisionId);
    } else if (divisionsList && divisionsList.length > 0) {
      const match = divisionsList.find((d) => d.name === divisionName);
      if (match) setSelectedTargetDivId(match.id);
    }
  }, [currentDivisionId, divisionName, divisionsList]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedImage(null);
      setPastedText('');
      setCandidates([]);
      setIsProcessing(false);
      setIsApplying(false);
      setStatusMessage('');
      setActiveTab('paste');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const targetDivisionObj = divisionsList?.find((d) => d.id === selectedTargetDivId);
  const activeTargetDivisionName = targetDivisionObj?.name || divisionName || 'الشعبة';

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
      setActiveTab('camera');
    };
    reader.readAsDataURL(file);
  };

  // Instant Offline Text Extraction from Pasted Input
  const handleExtractFromPastedText = () => {
    if (!pastedText.trim()) {
      showToast({ message: 'يرجى لصق أو كتابة أسماء الطلاب أولاً', type: 'warning' });
      return;
    }

    const extracted = parseRawRosterText(pastedText);
    if (extracted.length === 0) {
      showToast({ message: 'لم يتم العثور على أسماء واضحة في النص الملصق', type: 'warning' });
      return;
    }

    setCandidates(extracted);
    showToast({
      message: `تم استخراج ${extracted.length} طالباً بنجاح وبدون أي أخطاء!`,
      type: 'success',
    });
  };

  // Resilient Image OCR Processing via aiGatewayService
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
          message: 'مفتاح التحليل غير متوفر، يمكنك استخدام تبويب "لصق نص الأسماء" مباشرة وبدون اتصال.',
          type: 'warning',
        });
        setIsProcessing(false);
        setActiveTab('paste');
        return;
      }

      const { base64: base64Data, mimeType } = await optimizeImage(selectedImage);

      const promptText = `أنت ماسح ضوئي حرفي لقوائم وسجلات الطلاب في المدارس العراقية.
استخرج كل اسم مكتوب في الورقة سطراً بسطر بدقة تامة.
اكتب الأسماء فقط سطراً بسطر كالتالي:
1- اسم الطالب
2- اسم الطالبة`;

      let rawResponse = '';
      try {
        rawResponse = await aiGatewayService.callGeminiText({
          feature: 'student_list_ocr',
          systemInstruction: 'أنت نظام ماسح ضوئي حرفي لقوائم الطلاب في العراق.',
          parts: [
            { text: promptText },
            { inline_data: { mime_type: mimeType, data: base64Data } },
          ],
        });
      } catch (gatewayErr: any) {
        console.warn('aiGatewayService OCR attempt failed, checking fallback:', gatewayErr);
        // Fallback direct flash models
        const wireModels = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];
        for (const m of wireModels) {
          try {
            const res = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${encodeURIComponent(activeKey)}`,
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
                  generationConfig: { temperature: 0.0 },
                }),
              }
            );
            if (res.ok) {
              const data = await res.json();
              rawResponse = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
              if (rawResponse) break;
            }
          } catch {}
        }
      }

      if (rawResponse) {
        const extracted = parseRawRosterText(rawResponse);
        if (extracted.length > 0) {
          setCandidates(extracted);
          showToast({
            message: `تم التعرف على ${extracted.length} طالباً بنجاح! راجع الأسماء قبل الاعتماد.`,
            type: 'success',
          });
          return;
        }
      }

      showToast({
        message: 'لم يتم التعرف على أسماء كافية من الصورة. يمكنك لصق الأسماء كنص مباشرة.',
        type: 'warning',
      });
      setActiveTab('paste');
    } catch (err: any) {
      showToast({
        message: `تعذر إتمام التحليل البصري: ${err.message || 'خطأ في الشبكة'}. يمكنك لصق الأسماء مباشرة.`,
        type: 'warning',
      });
      setActiveTab('paste');
    } finally {
      setIsProcessing(false);
      setStatusMessage('');
    }
  };

  const handleUpdateCandidate = (id: string, updates: Partial<ExtractedStudentCandidate>) => {
    setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  };

  const handleDeleteCandidate = (id: string) => {
    setCandidates((prev) => prev.filter((c) => c.id !== id));
  };

  const handleAddNewCandidate = () => {
    const newItem: ExtractedStudentCandidate = {
      id: `ocr_manual_${Date.now()}`,
      fullName: '',
      gender: 'male',
      rollNumber: candidates.length + 1,
      isSelected: true,
    };
    setCandidates((prev) => [...prev, newItem]);
  };

  const handleConfirmAndApply = async () => {
    const activeSelected = candidates.filter((c) => c.isSelected && c.fullName.trim().length > 0);
    if (activeSelected.length === 0) {
      showToast({ message: 'يرجى تحديد طالب واحد على الأقل للاعتماد', type: 'warning' });
      return;
    }

    setIsApplying(true);
    try {
      await onApplyStudents(
        activeSelected.map((c) => ({
          fullName: c.fullName.trim(),
          gender: c.gender,
          rollNumber: c.rollNumber,
        })),
        selectedTargetDivId
      );
      showToast({
        message: `تم اعتماد وإضافة ${activeSelected.length} طالباً إلى ${activeTargetDivisionName} بنجاح!`,
        type: 'success',
      });
      onClose();
    } catch (err: any) {
      showToast({
        message: `فشل حفظ وإضافة الطلاب: ${err.message || 'حدث خطأ أثناء الحفظ'}`,
        type: 'error',
      });
    } finally {
      setIsApplying(false);
    }
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
              👥
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold">
                إدراج الطلاب عبر مسح خط اليد أو اللصق السريع
              </h2>
              <p className="text-xs text-teal-100">
                أدخل أسماء الطلبة بسهولة ودون أي تعقيد إلى {activeTargetDivisionName}
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
          {/* Target Division Selector */}
          <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 rounded-2xl border border-teal-200/70 dark:border-teal-800/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏫</span>
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  الشعبة المستهدفة للإضافة:
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  سيتم حفظ الطلاب المستخرجين مباشرة في هذه الشعبة
                </span>
              </div>
            </div>
            {divisionsList && divisionsList.length > 0 ? (
              <select
                value={selectedTargetDivId}
                onChange={(e) => setSelectedTargetDivId(e.target.value)}
                className="w-full sm:w-auto px-3 py-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-100 text-xs sm:text-sm font-bold shadow-xs cursor-pointer focus:ring-2 focus:ring-teal-500"
              >
                {divisionsList.map((div) => (
                  <option key={div.id} value={div.id}>
                    {div.name} {div.gradeLevel ? `(${div.gradeLevel})` : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span className="px-3 py-1 bg-teal-100 dark:bg-teal-900/60 text-teal-800 dark:text-teal-200 rounded-lg text-xs font-bold">
                {activeTargetDivisionName}
              </span>
            )}
          </div>

          {/* Simple 2-Way Tab Bar: Paste (Reliable 100%) vs Camera OCR */}
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('paste')}
              className={`min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'paste'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>📋</span>
              <span>لصق نص الأسماء (سريع وبدون أخطاء)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('camera')}
              className={`min-h-[44px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === 'camera'
                  ? 'bg-white dark:bg-slate-700 text-teal-800 dark:text-teal-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>📸</span>
              <span>تصوير ورقة الأسماء (تحليل ذكي)</span>
            </button>
          </div>

          {/* Tab 1: Instant Direct Paste */}
          {activeTab === 'paste' && (
            <div className="space-y-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  الصق أسماء الطلاب هنا (من واتساب، تلكرام، أو ملف نصي):
                </label>
                <span className="text-[11px] text-teal-700 dark:text-teal-400 font-medium">
                  يعمل 100% بدون إنترنت وبدون أخطاء
                </span>
              </div>
              <textarea
                rows={5}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder={`مثال:\n1- أحمد علي حسن\n2- كرار جاسم محمد\n3- فاطمة حيدر\n4- زينب عادل`}
                className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs sm:text-sm font-sans focus:ring-2 focus:ring-teal-500 leading-relaxed"
              />
              <button
                type="button"
                onClick={handleExtractFromPastedText}
                className="w-full min-h-[46px] py-2.5 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-xs sm:text-sm shadow-sm transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>⚡ استخراج أسماء الطلبة فوراً</span>
              </button>
            </div>
          )}

          {/* Tab 2: Camera / Image OCR */}
          {activeTab === 'camera' && (
            <div className="space-y-3">
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
                          <span>{statusMessage || 'جاري التحليل واستخراج الأسماء...'}</span>
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
            </div>
          )}

          {/* Extracted Candidates Table for Review and Editing */}
          {candidates.length > 0 && (
            <div className="space-y-3 pt-2">
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
              disabled={isApplying}
              onClick={handleConfirmAndApply}
              className="min-h-[44px] px-6 py-2 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-xs sm:text-sm font-bold shadow-sm transition flex items-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isApplying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>جاري إضافة وحفظ الطلاب في {activeTargetDivisionName}...</span>
                </>
              ) : (
                <>
                  <span>✓ اعتماد الطلاب وإضافتهم إلى {activeTargetDivisionName} ({candidates.filter((c) => c.isSelected && c.fullName.trim()).length})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
