/**
 * VoiceGradeEntryModal - AI Voice Grade Entry (Gemini Multimodal Audio Engine)
 * Features:
 * - Direct microphone recording via MediaRecorder API (100% Mobile iOS & Android compatible, no browser SpeechRecognition dependency)
 * - Multimodal Audio Processing via Gemini 1.5 Flash (understands Iraqi dialect, numbers, student names, and absences)
 * - Real-time visual audio waveform bars & recording timer
 * - Audio playback preview before or after analysis
 * - Mobile-first Bottom Sheet dialog with drag handle and thumb-friendly touch targets
 * - Instant review list with quick score adjustments (+/-) and absent toggle
 */

import React, { useState, useEffect, useRef } from 'react';
import type { StudentRowItem, GradeColumnDef } from './types.js';
import { useToast } from '../common/Toast.js';
import { getActiveGeminiApiKey } from '../../config/aiConfig.js';

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

export interface ParsedMatchItem {
  student: StudentRowItem;
  spokenName: string;
  detectedScore: number | null;
  isAbsent: boolean;
  confidence: number;
  isConfirmed: boolean;
  notes?: string;
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
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string>('');
  const [matches, setMatches] = useState<ParsedMatchItem[]>([]);
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 45, 60, 30, 20, 10]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const animationFrameRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const { showToast } = useToast();

  const activeCol = columns.find((c) => c.key === selectedColumnKey) || columns[0];
  const maxScore = activeCol?.maxScore || 20;

  // Clean up audio & timers on unmount
  useEffect(() => {
    return () => {
      cleanupRecording();
    };
  }, []);

  const cleanupRecording = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
  };

  if (!isOpen) return null;

  // Format timer
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Start Real Microphone Recording
  const startRecording = async () => {
    try {
      cleanupRecording();
      setAudioUrl(null);
      setRecordingSeconds(0);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      mediaStreamRef.current = stream;

      // Audio visualizer setup
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        audioContextRef.current = ctx;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 32;
        analyserRef.current = analyser;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const updateLevels = () => {
          if (!analyserRef.current) return;
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          analyserRef.current.getByteFrequencyData(dataArray);
          const sampled = [
            Math.max(15, (dataArray[1] || 0) * 0.4),
            Math.max(20, (dataArray[2] || 0) * 0.5),
            Math.max(25, (dataArray[4] || 0) * 0.6),
            Math.max(30, (dataArray[6] || 0) * 0.7),
            Math.max(20, (dataArray[8] || 0) * 0.5),
            Math.max(15, (dataArray[10] || 0) * 0.4),
            Math.max(10, (dataArray[12] || 0) * 0.3),
          ];
          setAudioLevels(sampled);
          animationFrameRef.current = requestAnimationFrame(updateLevels);
        };
        animationFrameRef.current = requestAnimationFrame(updateLevels);
      } catch {
        // Fallback visualizer if Web Audio is restricted
      }

      // Check supported MIME types
      let mimeType = 'audio/webm';
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4';
        } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
          mimeType = 'audio/ogg';
        } else {
          mimeType = '';
        }
      }

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const recordedBlob = new Blob(audioChunksRef.current, {
          type: mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);

        // Immediately trigger Gemini Multimodal AI processing
        await analyzeAudioWithGemini(recordedBlob);
      };

      recorder.start(250); // Slice data every 250ms
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      showToast({
        message: 'بدأ التسجيل... اقرأ أسماء الطلاب والدرجات بوضوح',
        type: 'info',
      });
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      showToast({
        message: 'تعذر الوصول إلى الميكروفون: تأكد من منح الإذن للموقع في المتصفح',
        type: 'error',
      });
      setIsRecording(false);
    }
  };

  // Stop Recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
    }
    if (timerRef.current) clearInterval(timerRef.current);
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    setIsRecording(false);
  };

  // Helper: Convert Blob to Base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || '';
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Multimodal Gemini AI Analysis
  const analyzeAudioWithGemini = async (blob: Blob) => {
    setIsAiProcessing(true);
    setAiStatusMessage('جاري إرسال المقطع إلى الذكاء الاصطناعي (Gemini Multimodal Audio)...');

    const apiKey = getActiveGeminiApiKey();

    if (!apiKey) {
      setAiStatusMessage('مفتاح الذكاء الاصطناعي غير مضبوط في لوحة الإدارة');
      showToast({ message: 'مفتاح الذكاء الاصطناعي غير مضبوط في لوحة الإدارة', type: 'error' });
      setMatches([]);
      setIsAiProcessing(false);
      return;
    }

    try {
      const base64Audio = await blobToBase64(blob);
      const rawMime = blob.type || 'audio/webm';
      const cleanMimeType = rawMime.split(';')[0].trim().toLowerCase() || 'audio/webm';

      const studentsRosterSummary = students.map((s) => ({
        id: s.id,
        name: s.fullName,
        roll: s.rollNumber,
      }));

      const systemPrompt = `أنت مساعد ذكاء اصطناعي لمعلم عراقي يقرأ درجات طلابه بصوته لمادة تقييمها: "${activeCol.label}" والدرجة العظمى هي (${maxScore}).
استمع للملف الصوتي المرفق بدقة بالغة. المعلم يتحدث باللهجة العراقية الدارجة أو الفصحى، ويذكر أسماء الطلاب ودرجاتهم أو حالات الغياب.

تعليمات صارمة لمنع التخمين أو التأليف (Strict Anti-Hallucination Rules):
1. استخرج فقط وحصراً ما تسمعه في المقطع الصوتي بدقة متناهية. ممنوع منعاً باتاً اختلاق أو تخمين أو إكمال أي اسم أو درجة لم تُذكر بوضوح.
2. إذا لم يُذكر أي طالب في التسجيل، أو كان التسجيل صامتاً أو غير مفهوم، أعد فقط مصفوفة فارغة [] ولا تؤلف أي بيانات نهائياً.
3. طابق كل اسم منطوق فقط مع قائمة الطلاب الرسمية في هذه الشعبة:
${JSON.stringify(studentsRosterSummary, null, 2)}

مصطلحات ومفردات عراقية متوقعة لما هو منطوق:
- الأرقام: "صفر" (0)، "واحد" (1)، "اثنين" (2)، "ثلاثة" (3)، "اربعة" (4)، "خمسة" (5)، "ستة" (6)، "سبعة" (7)، "ثمانية" (8)، "تسعة" (9)، "عشرة" (10)، "دعش/ادعش" (11)، "ثنعش/اثنعش" (12)، "تلطعش/تلتعش" (13)، "اربعطعش" (14)، "خمسطعش" (15)، "سطعش/ستطعش" (16)، "سبعطعش" (17)، "ثمنطعش" (18)، "تسعطعش" (19)، "عشرين" (20)، "فول" أو "كاملة" تعني الدرجة الكاملة (${maxScore})، "مية" تعني 100.
- الغياب: "غائب"، "غايب"، "ماكو"، "ما مداوم"، "مجاز".

المطلوب:
1. طابق فقط الأسماء المذكورة فعلياً في الصوت مع الطالب الأقرب له في القائمة.
2. استخرج الدرجة كرقم صحيح، أو حدد isAbsent: true و detectedScore: null في حال ذكر غيابه.
3. أعد فقط مصفوفة JSON صالحة مطابقة لهذا النمط وبدون أي علامات Markdown أخرى:
[
  {
    "studentId": "std_01",
    "studentName": "أحمد علي حسن",
    "detectedScore": 18,
    "isAbsent": false,
    "confidence": 0.95,
    "notes": "تم التعرف على 'ثمانطعش'"
  }
]`;

      setAiStatusMessage('الذكاء الاصطناعي يستمع للصوت ويطابق أسماء الطلاب والدرجات...');

      const modelsToTry = ['gemini-2.5-flash', 'gemini-flash-latest'];
      let parsedArray: any[] | null = null;
      let lastErrorStatus = 0;

      for (const model of modelsToTry) {
        try {
          const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      { text: systemPrompt },
                      {
                        inline_data: {
                          mime_type: cleanMimeType,
                          data: base64Audio,
                        },
                      },
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

          if (response.ok) {
            const result = await response.json();
            const rawText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
            const cleanedJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
            const parsed = JSON.parse(cleanedJson);
            if (Array.isArray(parsed)) {
              parsedArray = parsed;
              break;
            }
          } else {
            lastErrorStatus = response.status;
          }
        } catch {
          // try next model
        }
      }

      if (parsedArray && parsedArray.length > 0) {
        const mappedMatches: ParsedMatchItem[] = [];

        parsedArray.forEach((item: any) => {
          const student = students.find((s) => s.id === item.studentId) ||
            students.find((s) => s.fullName.includes(item.studentName) || item.studentName?.includes(s.fullName));

          if (student) {
            let score = item.detectedScore !== null && item.detectedScore !== undefined
              ? Number(item.detectedScore)
              : null;
            if (score !== null) {
              score = Math.max(0, Math.min(maxScore, score));
            }

            mappedMatches.push({
              student,
              spokenName: item.studentName || student.fullName,
              detectedScore: item.isAbsent ? null : score,
              isAbsent: !!item.isAbsent,
              confidence: item.confidence ?? 0.95,
              isConfirmed: true,
              notes: item.notes || '',
            });
          }
        });

        if (mappedMatches.length > 0) {
          setMatches(mappedMatches);
          showToast({
            message: `تم التعرف بنجاح على ${mappedMatches.length} طالباً بالذكاء الاصطناعي!`,
            type: 'success',
          });
          setIsAiProcessing(false);
          return;
        }
      }

      // No matches found or quiet/unrecognized audio
      setMatches([]);
      showToast({
        message: lastErrorStatus
          ? `تعذر الاتصال بالذكاء الاصطناعي (رمز: ${lastErrorStatus}). يرجى التحقق من اتصال الإنترنت.`
          : 'لم يتم رصد أسماء أو درجات واضحة في التسجيل. يرجى التحدث بوضوح والتأكد من ذكر أسماء الطلاب المسجلين.',
        type: 'info',
      });
    } catch (err: any) {
      console.warn('Gemini Audio API analysis failed:', err);
      setMatches([]);
      showToast({
        message: 'فشلت معالجة الصوت: تأكد من وضوح التسجيل واستقرار اتصال الإنترنت',
        type: 'error',
      });
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Apply grades into Gradebook
  const handleApplyToGradebook = () => {
    const confirmedMatches = matches.filter((m) => m.isConfirmed);
    if (confirmedMatches.length === 0) {
      showToast({ message: 'يرجى تحديد طالب واحد على الأقل للتثبيت', type: 'warning' });
      return;
    }

    const updates = confirmedMatches.map((m) => ({
      studentId: m.student.id,
      columnKey: selectedColumnKey,
      score: m.detectedScore,
      isAbsent: m.isAbsent,
    }));

    onApplyGrades(updates);
    showToast({
      message: `تم تثبيت درجات ${updates.length} طالباً في السجل بنجاح!`,
      type: 'success',
    });
    cleanupRecording();
    onClose();
  };

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs font-tajawal animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh] overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Mobile Drag Indicator Bar */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              🎙️
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>الرصد الصوتي بالذكاء الاصطناعي</span>
                <span className="text-[10px] bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-300 dark:border-teal-800 font-bold">
                  Gemini Audio
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                سجل صوتك لقراءة أسماء الطلاب والدرجات باللهجة العراقية
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              cleanupRecording();
              onClose();
            }}
            aria-label="إغلاق النافذة"
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            ✕
          </button>
        </div>

        {/* Column Target Selector */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              العمود المستهدف:
            </span>
            <select
              value={selectedColumnKey}
              onChange={(e) => setSelectedColumnKey(e.target.value)}
              className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-200 shadow-xs focus:ring-2 focus:ring-teal-500"
            >
              {columns
                .filter((col) => col.isEditable || col.key.startsWith('component_') || col.key === 'daily_total')
                .map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label} (الدرجة: {col.maxScore})
                  </option>
                ))}
            </select>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            عدد الطلاب: {students.length}
          </span>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {/* Audio Recorder Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-b from-slate-50 to-teal-50/30 dark:from-slate-800/60 dark:to-teal-950/20 border border-teal-100 dark:border-teal-900/40 flex flex-col items-center justify-center text-center relative overflow-hidden">
            
            {/* Waveform Visualizer */}
            <div className="flex items-center justify-center gap-1.5 h-12 mb-3">
              {audioLevels.map((lvl, idx) => (
                <div
                  key={idx}
                  style={{ height: `${isRecording ? Math.max(8, lvl) : 8}px` }}
                  className={`w-1.5 rounded-full transition-all duration-75 ${
                    isRecording
                      ? 'bg-gradient-to-t from-teal-600 to-emerald-400 animate-pulse'
                      : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Timer Display */}
            <div className="text-xl font-black font-mono tracking-wider text-slate-800 dark:text-slate-200 mb-2">
              {formatTime(recordingSeconds)}
            </div>

            {/* Main Action Button (Record / Stop) */}
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
              )}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isAiProcessing}
                className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center text-white font-bold transition-all shadow-lg active:scale-95 cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-700 ring-4 ring-rose-200 dark:ring-rose-900/60'
                    : 'bg-teal-700 hover:bg-teal-800 ring-4 ring-teal-100 dark:ring-teal-950'
                }`}
              >
                <span className="text-2xl">{isRecording ? '⏹️' : '🎙️'}</span>
                <span className="text-[10px] mt-0.5">
                  {isRecording ? 'إيقاف' : 'اضغط للتحدث'}
                </span>
              </button>
            </div>

            {/* Audio Playback Preview if recorded */}
            {audioUrl && !isRecording && (
              <div className="mt-3 w-full max-w-xs">
                <audio src={audioUrl} controls className="w-full h-8" />
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed max-w-sm">
              {isRecording ? (
                <span className="text-rose-600 dark:text-rose-400 font-bold flex items-center justify-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                  جاري الاستماع... اذكر اسم الطالب والدرجة (مثال: "كرار حسين 18، زينب محمد غائبة")
                </span>
              ) : (
                'الذكاء الاصطناعي مدرب على اللهجة العراقية والأرقام ("ثمنطعش"، "دعش"، "فول").'
              )}
            </p>
          </div>

          {/* AI Processing Banner */}
          {isAiProcessing && (
            <div className="p-4 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 flex items-center gap-3 animate-pulse">
              <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <div className="text-xs font-bold leading-tight">
                {aiStatusMessage || 'جاري معالجة الصوت بالذكاء الاصطناعي...'}
              </div>
            </div>
          )}

          {/* Detected Matches List */}
          {matches.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <span>📋</span>
                  <span>النتائج المستخرجة ({matches.length})</span>
                </span>
                <span className="text-[11px] text-teal-700 dark:text-teal-400">
                  يمكنك مراجعة وتعديل أي درجة قبل التثبيت
                </span>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                {matches.map((item, idx) => (
                  <div
                    key={item.student.id}
                    className={`p-3 flex items-center justify-between gap-2 transition-colors ${
                      item.isConfirmed
                        ? 'bg-white dark:bg-slate-900'
                        : 'bg-slate-50 dark:bg-slate-800/40 opacity-60'
                    }`}
                  >
                    {/* Student Info */}
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={item.isConfirmed}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setMatches((prev) =>
                            prev.map((m, i) => (i === idx ? { ...m, isConfirmed: checked } : m))
                          );
                        }}
                        className="w-4 h-4 rounded text-teal-600 cursor-pointer flex-shrink-0"
                      />
                      <div className="truncate">
                        <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                          {item.student.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 flex items-center gap-1.5">
                          <span>ت: {item.student.rollNumber}</span>
                          {item.notes && <span className="text-teal-600 dark:text-teal-400">({item.notes})</span>}
                        </div>
                      </div>
                    </div>

                    {/* Score & Absent Controls */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-800">
                        <button
                          type="button"
                          disabled={item.isAbsent || (item.detectedScore ?? 0) <= 0}
                          onClick={() => {
                            setMatches((prev) =>
                              prev.map((m, i) =>
                                i === idx ? { ...m, detectedScore: Math.max(0, (m.detectedScore ?? 0) - 1) } : m
                              )
                            );
                          }}
                          className="w-7 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 text-xs font-bold disabled:opacity-30"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={0}
                          max={maxScore}
                          value={item.isAbsent ? '' : item.detectedScore ?? ''}
                          disabled={item.isAbsent}
                          placeholder={item.isAbsent ? 'غ' : '0'}
                          onChange={(e) => {
                            const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                            setMatches((prev) =>
                              prev.map((m, i) => (i === idx ? { ...m, detectedScore: val } : m))
                            );
                          }}
                          className="w-12 h-8 text-center text-xs font-black bg-white dark:bg-slate-900 border-x border-slate-200 dark:border-slate-700"
                        />
                        <button
                          type="button"
                          disabled={item.isAbsent || (item.detectedScore ?? 0) >= maxScore}
                          onClick={() => {
                            setMatches((prev) =>
                              prev.map((m, i) =>
                                i === idx ? { ...m, detectedScore: Math.min(maxScore, (m.detectedScore ?? 0) + 1) } : m
                              )
                            );
                          }}
                          className="w-7 h-8 flex items-center justify-center text-slate-500 hover:text-slate-900 text-xs font-bold disabled:opacity-30"
                        >
                          +
                        </button>
                      </div>

                      {/* Absent Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextAbsent = !item.isAbsent;
                          setMatches((prev) =>
                            prev.map((m, i) =>
                              i === idx
                                ? {
                                    ...m,
                                    isAbsent: nextAbsent,
                                    detectedScore: nextAbsent ? null : m.detectedScore ?? 15,
                                  }
                                : m
                            )
                          );
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                          item.isAbsent
                            ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        غائب
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 pb-safe">
          <button
            type="button"
            onClick={() => {
              cleanupRecording();
              onClose();
            }}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-400 transition"
          >
            إلغاء
          </button>
          
          <button
            type="button"
            disabled={matches.filter((m) => m.isConfirmed).length === 0}
            onClick={handleApplyToGradebook}
            className={`min-h-[44px] px-6 py-2 rounded-xl font-extrabold text-xs shadow-md transition flex items-center gap-2 ${
              matches.filter((m) => m.isConfirmed).length === 0
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-teal-700 hover:bg-teal-800 text-white active:scale-95 cursor-pointer'
            }`}
          >
            <span>تثبيت في السجل ({matches.filter((m) => m.isConfirmed).length})</span>
            <span>✓</span>
          </button>
        </div>

      </div>
    </div>
  );
};
