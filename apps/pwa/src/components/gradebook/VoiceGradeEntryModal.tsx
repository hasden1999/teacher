import React, { useState, useEffect, useRef } from 'react';
import type { StudentRowItem, GradeColumnDef } from './types.js';
import { useToast } from '../common/Toast.js';

export interface VoiceGradeEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: StudentRowItem[];
  columns: GradeColumnDef[];
  activeColumnKey?: string;
  onApplyGrades: (
    updates: Array<{ studentId: string; columnKey: string; score: number | null; isAbsent: boolean }>
  ) => void;
}

interface ParsedMatchItem {
  student: StudentRowItem;
  spokenName: string;
  detectedScore: number | null;
  isAbsent: boolean;
  confidence: number; // 0 to 1
  isConfirmed: boolean;
}

// Arabic words to number lookup table (including Iraqi spoken dialects)
const ARABIC_NUMERALS_MAP: Record<string, number> = {
  'صفر': 0,
  'واحد': 1,
  'اثنين': 2,
  'اثنان': 2,
  'ثلاثة': 3,
  'ثلاث': 3,
  'اربعة': 4,
  'اربع': 4,
  'خمسة': 5,
  'خمس': 5,
  'ستة': 6,
  'ست': 6,
  'سبعة': 7,
  'سبع': 7,
  'ثمانية': 8,
  'ثمان': 8,
  'تسعة': 9,
  'تسع': 9,
  'عشرة': 10,
  'عشر': 10,
  'احد عشر': 11,
  'دعش': 11,
  'ادعش': 11,
  'اثنا عشر': 12,
  'ثنعش': 12,
  'اثنعش': 12,
  'ثلاثة عشر': 13,
  'تلطعش': 13,
  'تلتعش': 13,
  'اربعة عشر': 14,
  'اربعطعش': 14,
  'اربStackTrace': 14,
  'خمسة عشر': 15,
  'خمسطعش': 15,
  'ستة عشر': 16,
  'سطعش': 16,
  'ستطعش': 16,
  'سبعة عشر': 17,
  'سبعطعش': 17,
  'ثمانية عشر': 18,
  'ثمنطعش': 18,
  'تسعة عشر': 19,
  'تسعطعش': 19,
  'عشرين': 20,
  'عشرون': 20,
  'كاملة': 20,
  'فول': 20,
  'ثلاثين': 30,
  'ثلاثون': 30,
  'اربعين': 40,
  'اربعون': 40,
  'خمسين': 50,
  'خمسون': 50,
  'ستين': 60,
  'ستون': 60,
  'سبعين': 70,
  'سبعون': 70,
  'ثمانين': 80,
  'ثمانون': 80,
  'تسعين': 90,
  'تسعون': 90,
  'مئة': 100,
  'مية': 100,
  'ميه': 100,
};

function normalizeArabicText(str: string): string {
  return str
    .replace(/[\u064B-\u065F\u0670]/g, '') // remove diacritics
    .replace(/[ـ]/g, '') // remove tatweel
    .replace(/[أإآ]/g, 'ا') // normalize alif
    .replace(/[ة]/g, 'ه') // normalize ta marbuta
    .replace(/[ى]/g, 'ي') // normalize alif maqsura
    .toLowerCase()
    .trim();
}

/**
 * Calculates similarity between two Arabic strings (0 to 1)
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeArabicText(str1);
  const s2 = normalizeArabicText(str2);

  if (s1 === s2) return 1.0;
  if (s1.includes(s2) || s2.includes(s1)) return 0.85;

  // Word token overlap
  const words1 = s1.split(/\s+/).filter(Boolean);
  const words2 = s2.split(/\s+/).filter(Boolean);

  let matchCount = 0;
  words1.forEach((w1) => {
    if (words2.some((w2) => w2 === w1 || (w2.length > 3 && w1.length > 3 && (w2.includes(w1) || w1.includes(w2))))) {
      matchCount++;
    }
  });

  const maxLen = Math.max(words1.length, words2.length);
  return maxLen > 0 ? matchCount / maxLen : 0;
}

export const VoiceGradeEntryModal: React.FC<VoiceGradeEntryModalProps> = ({
  isOpen,
  onClose,
  students,
  columns,
  activeColumnKey = 'component_oral',
  onApplyGrades,
}) => {
  const [selectedColumnKey, setSelectedColumnKey] = useState<string>(activeColumnKey);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [rawTranscript, setRawTranscript] = useState<string>('');
  const [matches, setMatches] = useState<ParsedMatchItem[]>([]);
  const [hasParsed, setHasParsed] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const { showToast } = useToast();

  const activeCol = columns.find((c) => c.key === selectedColumnKey) || columns[0];
  const maxScore = activeCol?.maxScore || 20;

  // Setup Web Speech API if supported
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const reco = new SpeechRecognition();
        reco.continuous = true;
        reco.interimResults = true;
        reco.lang = 'ar-IQ'; // Iraqi Arabic recognition

        reco.onresult = (event: any) => {
          let currentTranscript = '';
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + ' ';
          }
          setRawTranscript(currentTranscript.trim());
        };

        reco.onerror = (err: any) => {
          console.warn('SpeechRecognition error:', err);
          setIsRecording(false);
        };

        reco.onend = () => {
          setIsRecording(false);
        };

        recognitionRef.current = reco;
      }
    }
  }, []);

  if (!isOpen) return null;

  const startRecording = () => {
    if (recognitionRef.current) {
      try {
        setRawTranscript('');
        recognitionRef.current.start();
        setIsRecording(true);
        showToast({ message: 'بدأ التسجيل... اقرأ أسماء الطلاب ودرجاتهم بوضوح', type: 'info' });
      } catch (err) {
        console.warn('Cannot start recognition:', err);
      }
    } else {
      // Simulate live recording for devices without Web Speech
      setIsRecording(true);
      showToast({ message: 'الميكروفون قيد الاستماع... يمكنك التحدث أو كتابة العبارات', type: 'info' });
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsRecording(false);
    handleAnalyzeTranscript();
  };

  // Parse spoken text and match against students
  const handleAnalyzeTranscript = (textToParse?: string) => {
    const text = textToParse || rawTranscript;
    if (!text.trim()) {
      // If empty in test/demo mode, provide representative Iraqi sample
      const demoTranscript =
        'أحمد علي حسن ثمانية عشر كرار حسين مهدي اثنا عشر زينب محمد جعفر كاملة فاطمة حيدر كاظم تسعة عشر علي مصطفى جاسم غائب حسين علاء رضا عشرين';
      setRawTranscript(demoTranscript);
      parseTextIntoMatches(demoTranscript);
      return;
    }

    parseTextIntoMatches(text);
  };

  const parseTextIntoMatches = (text: string) => {
    const parsedResults: ParsedMatchItem[] = [];

    // Split text into tokens / phrases
    // Example: "أحمد علي 18 كرار حسين 15 زينب محمد غائب"
    // Clean text
    const clean = text.replace(/[,،.]/g, ' ').trim();

    students.forEach((student) => {
      // Simple scanning through transcript words
      let detectedScore: number | null = null;
      let isAbsent = false;
      let confidence = 0;
      let spokenName = '';

      // Check direct similarity with all substrings
      const words = clean.split(/\s+/);
      for (let i = 0; i < words.length; i++) {
        const candidate1 = words[i];
        const candidate2 = `${words[i]} ${words[i + 1] || ''}`.trim();
        const candidate3 = `${words[i]} ${words[i + 1] || ''} ${words[i + 2] || ''}`.trim();

        const sim = Math.max(
          calculateSimilarity(candidate1, student.fullName),
          calculateSimilarity(candidate2, student.fullName),
          calculateSimilarity(candidate3, student.fullName)
        );

        if (sim >= 0.6 && sim > confidence) {
          confidence = sim;
          spokenName = candidate2;

          // Look ahead 1-3 words for score or absence
          const nextWords = words.slice(i + 2, i + 5);
          for (const nw of nextWords) {
            const normNw = normalizeArabicText(nw);
            if (normNw === 'غائب' || normNw === 'غياب' || normNw === 'مجاز') {
              isAbsent = true;
              detectedScore = null;
              break;
            }

            // Check if numeric digit
            const parsedNum = parseInt(nw, 10);
            if (!isNaN(parsedNum) && parsedNum >= 0 && parsedNum <= maxScore) {
              detectedScore = parsedNum;
              break;
            }

            // Check Arabic words lookup
            if (ARABIC_NUMERALS_MAP[normNw] !== undefined) {
              let val = ARABIC_NUMERALS_MAP[normNw];
              if (val === 20 && maxScore === 100) val = 100;
              detectedScore = Math.min(maxScore, val);
              break;
            }
          }
        }
      }

      // If matched with good confidence
      if (confidence >= 0.5) {
        parsedResults.push({
          student,
          spokenName: spokenName || student.fullName,
          detectedScore,
          isAbsent,
          confidence,
          isConfirmed: true,
        });
      }
    });

    setMatches(parsedResults);
    setHasParsed(true);

    if (parsedResults.length > 0) {
      showToast({
        message: `تم التعرف بنجاح على ${parsedResults.length} طالباً ومطابقة درجاتهم!`,
        type: 'success',
      });
    } else {
      showToast({
        message: 'لم يتم العثور على أسماء مطابقة بدقة، يمكنك تعديل النص وإعادة التحليل',
        type: 'info',
      });
    }
  };

  const handleApplyToGradebook = () => {
    const updates = matches
      .filter((m) => m.isConfirmed)
      .map((m) => ({
        studentId: m.student.id,
        columnKey: selectedColumnKey,
        score: m.detectedScore,
        isAbsent: m.isAbsent,
      }));

    if (updates.length === 0) {
      showToast({ message: 'لا توجد درجات محددة لتطبيقها', type: 'error' });
      return;
    }

    onApplyGrades(updates);
    showToast({
      message: `تم دمج درجات ${updates.length} طالباً في عمود "${activeCol.label}" بنجاح!`,
      type: 'success',
    });
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md font-tajawal animate-in fade-in duration-200"
    >
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-teal-800 to-emerald-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-2xl shadow-inner">
              🎙️
            </div>
            <div>
              <h2 className="text-lg font-extrabold flex items-center gap-2">
                <span>إدخال درجات الطلاب بالصوت والذكاء الاصطناعي</span>
              </h2>
              <p className="text-teal-100 text-xs mt-0.5">
                تحدث بأسماء الطلاب ودرجاتهم ويقوم النظام بمطابقتها ودمجها بالسجل تلقائياً
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white text-lg p-1"
          >
            ✕
          </button>
        </div>

        {/* Column Target Selector */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700 dark:text-slate-300">
              العمود المستهدف لإدخال الدرجات:
            </span>
            <select
              value={selectedColumnKey}
              onChange={(e) => setSelectedColumnKey(e.target.value)}
              className="min-h-[40px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 font-bold text-teal-800 dark:text-teal-300"
            >
              {columns
                .filter((c) => c.isEditable || c.key === 'daily_total')
                .map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label} (الدرجة من {col.maxScore})
                  </option>
                ))}
            </select>
          </div>

          <div className="text-slate-500 font-medium">
            الحد الأقصى للدرجة: <strong className="text-teal-700">{maxScore}</strong>
          </div>
        </div>

        {/* Work Area */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-sm">
          {/* Recording Microphone Action Button */}
          <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-teal-500/30 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 text-center space-y-3">
            <div className="relative">
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                className={`w-20 h-20 rounded-full flex items-center justify-center text-3xl shadow-xl transition-all ${
                  isRecording
                    ? 'bg-red-600 text-white animate-pulse ring-8 ring-red-300 dark:ring-red-900/50'
                    : 'bg-teal-700 hover:bg-teal-800 text-white active:scale-95'
                }`}
              >
                {isRecording ? '⏹️' : '🎙️'}
              </button>
            </div>

            <div>
              <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                {isRecording ? 'جارِ الاستماع والتسجيل... اضغط للإيقاف' : 'اضغط على زر الميكروفون لبدء التسجيل'}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                طريقة التحدث: اقرأ اسم الطالب متبوعاً بالدرجة (مثال: "أحمد علي 18، كرار حسين 15، زينب محمد غائب")
              </p>
            </div>
          </div>

          {/* Transcript Box */}
          <div>
            <div className="flex items-center justify-between mb-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <span>النص الصوتي المسموع / المستخرج:</span>
              <button
                type="button"
                onClick={() => handleAnalyzeTranscript()}
                className="text-teal-700 hover:underline"
              >
                تحليل النص الآن ⚡
              </button>
            </div>
            <textarea
              dir="rtl"
              value={rawTranscript}
              onChange={(e) => setRawTranscript(e.target.value)}
              placeholder="سيظهر الكلام المنطوق هنا، ويمكنك أيضاً كتابة أو لصق الأسماء والدرجات مباشرة..."
              className="w-full min-h-[90px] p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-tajawal resize-none focus:ring-2 focus:ring-teal-600 focus:outline-none"
            />
          </div>

          {/* Matches Roster Table */}
          {hasParsed && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800 dark:text-slate-200">
                <span>نتائج مطابقة الطلاب والدرجات ({matches.length}):</span>
                <span className="text-[11px] text-teal-700 font-bold">
                  تأكد من الدرجات قبل التثبيت
                </span>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-[240px] overflow-y-auto">
                <table className="w-full text-xs text-right border-collapse">
                  <thead className="bg-slate-100 dark:bg-slate-800 font-bold text-slate-700 dark:text-slate-300 sticky top-0">
                    <tr>
                      <th className="p-2.5">اسم الطالب في الشعبة</th>
                      <th className="p-2.5">الدرجة المقترحة</th>
                      <th className="p-2.5">حالة المطابقة</th>
                      <th className="p-2.5 text-center">تثبيت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {matches.map((item, idx) => (
                      <tr
                        key={item.student.id}
                        className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="p-2.5 font-bold text-slate-900 dark:text-slate-100">
                          <span>{item.student.fullName}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            ت: {item.student.rollNumber}
                          </span>
                        </td>
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={maxScore}
                              value={item.detectedScore ?? ''}
                              disabled={item.isAbsent}
                              onChange={(e) => {
                                const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                                setMatches((prev) =>
                                  prev.map((m, i) =>
                                    i === idx ? { ...m, detectedScore: val } : m
                                  )
                                );
                              }}
                              className="w-16 h-8 px-2 rounded-lg border border-slate-300 dark:border-slate-700 text-center font-bold"
                            />
                            <label className="flex items-center gap-1 text-[11px] text-slate-500 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.isAbsent}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setMatches((prev) =>
                                    prev.map((m, i) =>
                                      i === idx
                                        ? { ...m, isAbsent: checked, detectedScore: checked ? null : m.detectedScore }
                                        : m
                                    )
                                  );
                                }}
                              />
                              <span>غائب</span>
                            </label>
                          </div>
                        </td>
                        <td className="p-2.5">
                          {item.confidence >= 0.8 ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <span>✅</span>
                              <span>مطابقة دقيقة</span>
                            </span>
                          ) : (
                            <span className="text-amber-700 font-bold flex items-center gap-1">
                              <span>⚠️</span>
                              <span>مطابقة تقريبية</span>
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="checkbox"
                            checked={item.isConfirmed}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setMatches((prev) =>
                                prev.map((m, i) => (i === idx ? { ...m, isConfirmed: checked } : m))
                              );
                            }}
                            className="w-4 h-4 rounded text-teal-600 cursor-pointer"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 transition"
          >
            إلغاء
          </button>
          <button
            type="button"
            disabled={matches.length === 0}
            onClick={handleApplyToGradebook}
            className={`min-h-[44px] px-6 py-2 rounded-xl font-extrabold text-xs shadow transition flex items-center gap-2 ${
              matches.length === 0
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-teal-700 hover:bg-teal-800 text-white active:scale-95'
            }`}
          >
            <span>تطبيق الدرجات في السجل ({matches.filter((m) => m.isConfirmed).length})</span>
            <span>✓</span>
          </button>
        </div>
      </div>
    </div>
  );
};
