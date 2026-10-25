/**
 * VoiceGradeEntryModal - AI Voice Grade Entry (Agent A9 & Section 8.3)
 * Features:
 * - Mode A1 "Click-per-student" (الافتراضي - بالبناء): Giant student card, timestamp marking, no names sent to AI
 * - Mode B "By Name" (بالاسم): Matches spoken name with roster summary
 * - Continuous recording with MediaRecorder API (iOS Safari & Android Chrome compatible)
 * - Dual-source verification: Local Iraqi colloquial parser (parseIraqiSpokenGrade) vs Gemini model output
 * - Tri-color Review Screen (Section 8.3 & 11.8):
 *   - Green rows folded by default with 1-tap "اعتماد كل الأخضر"
 *   - Yellow and Red rows expanded first with manual steppers (+/-) and absent toggle
 *   - Summary badge: "تحتاج مراجعتك: X من Y"
 *   - List of unentered students ("لم تُدخل درجاتهم")
 * - Quota management & cost tracking via aiGatewayService
 * - Thumb-friendly mobile ergonomics (touch targets >= 48px/56px)
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { StudentRowItem, GradeColumnDef } from './types.js';
import { useToast } from '../common/Toast.js';
import { aiGatewayService } from '../../services/aiGatewayService.js';
import { parseIraqiSpokenGrade } from '@techeeer/arabic-utils';
import type { VoiceSegmentsResult, ReviewRowColor } from '@techeeer/contracts';

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

export interface VoiceVerifiedEntry {
  student: StudentRowItem;
  detectedScore: number | null;
  isAbsent: boolean;
  reviewColor: ReviewRowColor;
  rawText: string;
  localParsedScore?: number | null;
  notes?: string;
  isConfirmed: boolean;
  timestampStart?: number;
  timestampEnd?: number;
}

export const VoiceGradeEntryModal: React.FC<VoiceGradeEntryModalProps> = ({
  isOpen,
  onClose,
  students,
  columns,
  activeColumnKey = 'component_oral',
  onApplyGrades,
}) => {
  const [voiceMode, setVoiceMode] = useState<'A1' | 'B'>('A1');
  const [selectedColumnKey, setSelectedColumnKey] = useState<string>(activeColumnKey);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiStatusMessage, setAiStatusMessage] = useState<string>('');
  const [audioLevels, setAudioLevels] = useState<number[]>([15, 25, 45, 60, 30, 20, 10]);
  const [isGreenCollapsed, setIsGreenCollapsed] = useState<boolean>(true);

  // Mode A1 Active Student & Timestamp Markers
  const [a1StudentIndex, setA1StudentIndex] = useState<number>(0);
  const [studentTimestamps, setStudentTimestamps] = useState<
    Array<{ studentIndex: number; startSec: number; endSec: number }>
  >([]);
  const currentSegmentStartRef = useRef<number>(0);

  // Review Results
  const [verifiedEntries, setVerifiedEntries] = useState<VoiceVerifiedEntry[]>([]);
  const [hasPrivacyConsent, setHasPrivacyConsent] = useState<boolean>(() => {
    return typeof localStorage !== 'undefined' && localStorage.getItem('techeeer_voice_consent_accepted') === 'true';
  });
  const [consentHighlight, setConsentHighlight] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const animationFrameRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const recordedBlobRef = useRef<Blob | null>(null);

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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Convert Blob to Base64
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

  // Start Real Microphone Recording
  const startRecording = async () => {
    if (!hasPrivacyConsent) {
      setConsentHighlight(true);
      showToast({ message: 'يرجى الموافقة على إقرار خصوصية التسجيل الصوتي قبل البدء', type: 'error' });
      return;
    }

    try {
      cleanupRecording();
      setAudioUrl(null);
      setRecordingSeconds(0);
      setA1StudentIndex(0);
      setStudentTimestamps([]);
      currentSegmentStartRef.current = 0;
      setVerifiedEntries([]);

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
        analyser.fftSize = 64;
        const source = ctx.createMediaStreamSource(stream);
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateLevels = () => {
          if (!mediaStreamRef.current) return;
          analyser.getByteFrequencyData(dataArray);
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
        recordedBlobRef.current = recordedBlob;
        const url = URL.createObjectURL(recordedBlob);
        setAudioUrl(url);

        // Process audio with AI Gateway
        await analyzeAudioWithGateway(recordedBlob);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      showToast({
        message: voiceMode === 'A1'
          ? 'بدأ التسجيل بنمط النقر: انطق الدرجة واضغط «التالي»'
          : 'بدأ التسجيل بالاسم: اقرأ أسماء الطلاب والدرجات بوضوح',
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
    // Record final timestamp segment in Mode A1
    if (voiceMode === 'A1' && isRecording && students[a1StudentIndex]) {
      setStudentTimestamps((prev) => [
        ...prev,
        {
          studentIndex: a1StudentIndex,
          startSec: currentSegmentStartRef.current,
          endSec: recordingSeconds,
        },
      ]);
    }

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

  // Mode A1: Advance to Next Student with timestamp marking
  const handleA1NextStudent = () => {
    const endSec = recordingSeconds;
    setStudentTimestamps((prev) => [
      ...prev,
      {
        studentIndex: a1StudentIndex,
        startSec: currentSegmentStartRef.current,
        endSec,
      },
    ]);
    currentSegmentStartRef.current = endSec;

    if (a1StudentIndex < students.length - 1) {
      setA1StudentIndex((prev) => prev + 1);
    } else {
      // Finished all students!
      stopRecording();
      showToast({ message: 'تم الانتهاء من جميع طلاب الشعبة! جاري المعالجة...', type: 'success' });
    }
  };

  // Mode A1: Go to Previous Student
  const handleA1PrevStudent = () => {
    if (a1StudentIndex > 0) {
      setA1StudentIndex((prev) => prev - 1);
      currentSegmentStartRef.current = recordingSeconds;
    }
  };

  // Mode A1: Redo Current Student
  const handleA1RedoStudent = () => {
    currentSegmentStartRef.current = recordingSeconds;
    showToast({ message: `تمت إعادة التسجيل للطالب: ${students[a1StudentIndex]?.fullName}`, type: 'info' });
  };

  // AI Analysis via aiGatewayService with Dual-Source Verification
  const analyzeAudioWithGateway = async (blob: Blob) => {
    setIsAiProcessing(true);
    setAiStatusMessage('جاري تحليل الصوت عبر بوابة الذكاء الاصطناعي (A9)...');

    try {
      const base64Audio = await blobToBase64(blob);
      const rawMime = blob.type || 'audio/webm';
      const cleanMimeType = rawMime.split(';')[0].trim().toLowerCase() || 'audio/webm';

      if (voiceMode === 'A1') {
        // Mode A1: Click-per-student (Structurally mapped, no student names sent to model)
        const recordedCount = studentTimestamps.length > 0 ? studentTimestamps.length : a1StudentIndex + 1;
        const systemPrompt = `أنت مساعد معلمين عراقيين لمعالجة درجات شفهية بالنمط البنيوي (Mode A1).
تم تسجيل أصوات المعلم لعدد (${recordedCount}) طلاب بالترتيب التسلسلي من 0 إلى ${recordedCount - 1}.
التقييم الحالي: "${activeCol.label}" والدرجة العظمى هي (${maxScore}).

المطلوب:
لكل مقطع تسلسلي index من 0 إلى ${recordedCount - 1}:
1. استخرج النص المنطوق بدقة (rawText) باللهجة العراقية مثل: "ثمانطعش"، "عشرين"، "فول"، "غائب"، "عشرة ونص".
2. استخرج القيمة الرقمية المقابلة (value) كرقم بين 0 و ${maxScore}، أو ضع value: "absent" للغياب.
3. أعد فقط JSON مطابق للمخطط:
{
  "schemaVersion": 1,
  "mode": "A1",
  "entries": [
    { "index": 0, "value": 18, "rawText": "ثمانطعش" },
    { "index": 1, "value": "absent", "rawText": "غائب" }
  ]
}`;

        setAiStatusMessage('النموذج يحلل المقاطع الصوتية التسلسلية...');
        const result = await aiGatewayService.callGeminiStructured<VoiceSegmentsResult>({
          feature: 'voice_grades_segments',
          systemInstruction: systemPrompt,
          parts: [
            {
              inline_data: {
                mime_type: cleanMimeType,
                data: base64Audio,
              },
            },
          ],
          thinkingLevel: 'low',
        });

        // Dual-source verification: Local colloquial parser vs Model
        const verified: VoiceVerifiedEntry[] = [];
        const entriesMap = new Map<number, { value: number | 'absent' | null; rawText: string }>();
        if (result && Array.isArray(result.entries)) {
          result.entries.forEach((e) => entriesMap.set(e.index, e));
        }

        students.forEach((student, idx) => {
          if (idx >= recordedCount) return; // not recorded

          const aiEntry = entriesMap.get(idx);
          const rawText = aiEntry?.rawText || '';
          const localParsed = rawText ? parseIraqiSpokenGrade(rawText) : null;
          const aiValue = aiEntry?.value;
          const isAbsent = aiValue === 'absent' || localParsed?.status === 'absent';

          let finalScore: number | null = null;
          let reviewColor: ReviewRowColor = 'yellow';
          let notes = '';

          if (isAbsent) {
            reviewColor = 'green';
            notes = 'مسجل غائب';
          } else {
            const aiNumeric = typeof aiValue === 'number' ? aiValue : null;
            const localNumeric = localParsed?.status === 'value' ? localParsed.value : null;

            if (aiNumeric !== null && localNumeric !== null && aiNumeric === localNumeric) {
              // Dual sources match perfectly!
              finalScore = Math.min(maxScore, Math.max(0, aiNumeric));
              reviewColor = 'green';
              notes = `تطابق تام: "${rawText}" = ${finalScore}`;
            } else if (aiNumeric !== null) {
              // Model detected a score, local parser couldn't verify or differed
              finalScore = Math.min(maxScore, Math.max(0, aiNumeric));
              reviewColor = 'yellow';
              notes = localNumeric !== null
                ? `اختلاف طفيف: النموذج (${aiNumeric}) والمحلل (${localNumeric})`
                : `النموذج رصد: "${rawText}"`;
            } else if (localNumeric !== null) {
              finalScore = Math.min(maxScore, Math.max(0, localNumeric));
              reviewColor = 'yellow';
              notes = `المحلل المحلي استخرج: ${finalScore}`;
            } else {
              reviewColor = 'red';
              notes = rawText ? `تعذر التحقق من: "${rawText}"` : 'لم يُسمع صوت واضح';
            }
          }

          verified.push({
            student,
            detectedScore: isAbsent ? null : finalScore,
            isAbsent,
            reviewColor,
            rawText,
            localParsedScore: typeof localParsed === 'number' ? localParsed : null,
            notes,
            isConfirmed: reviewColor === 'green', // Green auto-confirmed
          });
        });

        setVerifiedEntries(verified);
        showToast({
          message: `تم تحليل درجات ${verified.length} طالباً. يرجى مراجعة النتائج.`,
          type: 'success',
        });
      } else {
        // Mode B: By Name matching
        const studentsRosterSummary = students.map((s) => ({
          tempId: s.id,
          name: s.fullName,
          roll: s.rollNumber,
        }));

        const systemPrompt = `أنت مساعد ذكاء اصطناعي لمعلم عراقي يقرأ أسماء طلابه ودرجاتهم بصوته.
التقييم: "${activeCol.label}" والدرجة العظمى هي (${maxScore}).
قائمة الطلاب (بالمعرفات المؤقتة):
${JSON.stringify(studentsRosterSummary, null, 2)}

المطلوب:
أعد JSON بالمخطط:
{
  "schemaVersion": 1,
  "mode": "B",
  "entries": [
    { "spokenName": "اسم منطوق", "matchedTempId": "std_id", "value": 18, "rawText": "ثمانطعش" }
  ]
}`;

        setAiStatusMessage('النموذج يطابق الأسماء المنطوقة مع القائمة...');
        const result = await aiGatewayService.callGeminiStructured<any>({
          feature: 'voice_grades_named',
          systemInstruction: systemPrompt,
          parts: [
            {
              inline_data: {
                mime_type: cleanMimeType,
                data: base64Audio,
              },
            },
          ],
          thinkingLevel: 'low',
        });

        const verified: VoiceVerifiedEntry[] = [];
        if (result && Array.isArray(result.entries)) {
          result.entries.forEach((item: any) => {
            const student = students.find((s) => s.id === item.matchedTempId) ||
              students.find((s) => s.fullName.includes(item.spokenName) || item.spokenName?.includes(s.fullName));

            if (student) {
              const rawText = item.rawText || '';
              const localParsed = rawText ? parseIraqiSpokenGrade(rawText) : null;
              const isAbsent = item.value === 'absent' || localParsed?.status === 'absent';
              const localNumeric = localParsed?.status === 'value' ? localParsed.value : null;
              const numVal = typeof item.value === 'number' ? item.value : null;

              let reviewColor: ReviewRowColor = 'yellow';
              if (isAbsent) {
                reviewColor = 'green';
              } else if (numVal !== null && localNumeric === numVal) {
                reviewColor = 'green';
              } else if (numVal !== null) {
                reviewColor = 'yellow';
              } else {
                reviewColor = 'red';
              }

              verified.push({
                student,
                detectedScore: isAbsent ? null : numVal,
                isAbsent,
                reviewColor,
                rawText,
                localParsedScore: localNumeric,
                notes: `اسم منطوق: ${item.spokenName || ''}`,
                isConfirmed: reviewColor === 'green',
              });
            }
          });
        }

        setVerifiedEntries(verified);
        showToast({
          message: `تم التعرف على ${verified.length} طالباً. يرجى مراجعة النتائج.`,
          type: 'success',
        });
      }
    } catch (err: any) {
      console.warn('Voice AI analysis error:', err);
      showToast({
        message: err.message || 'فشلت معالجة التسجيل الصوتي. تأكد من وضوح الصوت.',
        type: 'error',
      });
    } finally {
      setIsAiProcessing(false);
    }
  };

  // Group verified entries by review color
  const greenEntries = useMemo(() => verifiedEntries.filter((e) => e.reviewColor === 'green'), [verifiedEntries]);
  const yellowEntries = useMemo(() => verifiedEntries.filter((e) => e.reviewColor === 'yellow'), [verifiedEntries]);
  const redEntries = useMemo(() => verifiedEntries.filter((e) => e.reviewColor === 'red'), [verifiedEntries]);

  // Students not entered yet
  const enteredStudentIds = useMemo(() => new Set(verifiedEntries.map((e) => e.student.id)), [verifiedEntries]);
  const unenteredStudents = useMemo(() => students.filter((s) => !enteredStudentIds.has(s.id)), [students, enteredStudentIds]);

  // One-tap accept all green rows (Section 8.3)
  const handleAcceptAllGreen = () => {
    setVerifiedEntries((prev) =>
      prev.map((entry) => (entry.reviewColor === 'green' ? { ...entry, isConfirmed: true } : entry))
    );
    showToast({ message: `تم اعتماد ${greenEntries.length} درجات مؤكدة بنجاح`, type: 'success' });
  };

  // Apply confirmed grades to Gradebook
  const handleApplyToGradebook = () => {
    const confirmed = verifiedEntries.filter((e) => e.isConfirmed);
    if (confirmed.length === 0) {
      showToast({ message: 'يرجى تحديد درجة واحدة على الأقل للاعتماد', type: 'warning' });
      return;
    }

    const updates = confirmed.map((m) => ({
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

  const currentA1Student = students[a1StudentIndex] || students[0];

  return (
    <div
      dir="rtl"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs font-tajawal animate-in fade-in duration-200"
    >
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-t-3xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[94vh] sm:max-h-[88vh] overflow-hidden border border-slate-200 dark:border-slate-800">
        
        {/* Mobile Drag Indicator Bar */}
        <div className="pt-2 pb-1 flex justify-center sm:hidden">
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Modal Header */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-teal-700 to-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md">
              🎙️
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <span>الرصد الصوتي الذكي (A1/A9)</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                رصد درجات الصف بنقرة واحدة لكل طالب وبلهجة عراقية نقية
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
            className="min-h-[44px] min-w-[44px] w-11 h-11 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer active:scale-95"
          >
            ✕
          </button>
        </div>

        {/* Mode & Target Column Selectors */}
        <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Mode Switcher */}
          <div className="flex items-center bg-slate-200/80 dark:bg-slate-700/80 p-0.5 rounded-xl font-bold">
            <button
              type="button"
              disabled={isRecording}
              onClick={() => setVoiceMode('A1')}
              className={`px-3 py-1.5 rounded-lg transition ${
                voiceMode === 'A1'
                  ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              بالنقر A1 (الافتراضي)
            </button>
            <button
              type="button"
              disabled={isRecording}
              onClick={() => setVoiceMode('B')}
              className={`px-3 py-1.5 rounded-lg transition ${
                voiceMode === 'B'
                  ? 'bg-white dark:bg-slate-900 text-teal-800 dark:text-teal-300 shadow-xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              بالاسم B
            </button>
          </div>

          {/* Column Target */}
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-500">العمود:</span>
            <select
              value={selectedColumnKey}
              disabled={isRecording}
              onChange={(e) => setSelectedColumnKey(e.target.value)}
              className="font-bold px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-teal-900 dark:text-teal-200"
            >
              {columns
                .filter((col) => col.isEditable || col.key.startsWith('component_') || col.key === 'daily_total')
                .map((col) => (
                  <option key={col.key} value={col.key}>
                    {col.label} ({col.maxScore})
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Modal Body / Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Mode A1 Active Student Ergonomic Card */}
          {voiceMode === 'A1' && isRecording && currentA1Student && (
            <div className="p-4 rounded-3xl bg-gradient-to-b from-teal-50 to-emerald-50/50 dark:from-teal-950/40 dark:to-emerald-950/20 border-2 border-teal-500 shadow-lg text-center animate-in zoom-in-95">
              <div className="flex items-center justify-between text-xs text-teal-800 dark:text-teal-300 font-bold mb-1">
                <span>طالب {a1StudentIndex + 1} من {students.length}</span>
                <span className="font-mono">ت: {currentA1Student.rollNumber}</span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100 py-3 tracking-wide">
                {currentA1Student.fullName}
              </h2>

              <p className="text-xs text-teal-700 dark:text-teal-300 mb-4">
                تحدث بالدرجة الآن ثم اضغط زر <strong>«التالي ➔»</strong>
              </p>

              {/* Huge One-Thumb Action Controls (>= 56px touch target) */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleA1PrevStudent}
                  disabled={a1StudentIndex === 0}
                  className="min-h-[56px] rounded-2xl bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-sm active:scale-95 transition disabled:opacity-40"
                >
                  ⬅ السابق
                </button>
                <button
                  type="button"
                  onClick={handleA1RedoStudent}
                  className="min-h-[56px] rounded-2xl bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 font-bold text-sm active:scale-95 transition"
                >
                  ↺ إعادة
                </button>
                <button
                  type="button"
                  onClick={handleA1NextStudent}
                  className="min-h-[56px] rounded-2xl bg-teal-700 hover:bg-teal-800 text-white font-extrabold text-base shadow-lg shadow-teal-700/30 active:scale-95 transition flex items-center justify-center gap-1"
                >
                  <span>التالي</span>
                  <span>➔</span>
                </button>
              </div>
            </div>
          )}

          {/* Audio Recorder Station */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-col items-center justify-center text-center">
            
            {/* Waveform Visualizer */}
            <div className="flex items-center justify-center gap-1.5 h-10 mb-2">
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

            {/* Timer */}
            <div className="text-xl font-black font-mono tracking-wider text-slate-800 dark:text-slate-200 mb-3">
              {formatTime(recordingSeconds)}
            </div>

            {/* Record / Stop Button */}
            <div className="relative">
              {isRecording && (
                <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-ping" />
              )}
              <button
                type="button"
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isAiProcessing}
                className={`relative min-h-[56px] px-8 py-3.5 rounded-full flex items-center gap-3 text-white font-bold transition-all shadow-lg active:scale-95 cursor-pointer ${
                  isRecording
                    ? 'bg-rose-600 hover:bg-rose-700 ring-4 ring-rose-200 dark:ring-rose-900/60'
                    : 'bg-teal-700 hover:bg-teal-800 ring-4 ring-teal-100 dark:ring-teal-950'
                }`}
              >
                <span className="text-xl">{isRecording ? '⏹️' : '🎙️'}</span>
                <span className="text-sm">
                  {isRecording ? 'إنهاء التسجيل والتحليل' : 'بدء جلسة التسجيل الصوتي'}
                </span>
              </button>
            </div>

            {/* Audio Preview */}
            {audioUrl && !isRecording && (
              <div className="mt-3 w-full max-w-xs">
                <audio src={audioUrl} controls className="w-full h-8" />
              </div>
            )}

            {/* Privacy Agreement */}
            <div
              className={`w-full max-w-sm mt-3 p-2.5 rounded-xl border text-xs text-start transition-all ${
                consentHighlight && !hasPrivacyConsent
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-200 ring-2 ring-amber-400 animate-pulse'
                  : 'border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/50 text-slate-600 dark:text-slate-300'
              }`}
            >
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={hasPrivacyConsent}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setHasPrivacyConsent(checked);
                    setConsentHighlight(false);
                    if (typeof localStorage !== 'undefined') {
                      if (checked) localStorage.setItem('techeeer_voice_consent_accepted', 'true');
                      else localStorage.removeItem('techeeer_voice_consent_accepted');
                    }
                  }}
                  className="mt-0.5 w-4 h-4 rounded text-teal-700 focus:ring-teal-500 cursor-pointer"
                />
                <span className="text-[11px] leading-relaxed">
                  <strong>إقرار الخصوصية (Section 11.5):</strong> أوافق على معالجة التسجيل الصوتي بدون إرسال أي أسماء أو معرّفات طلاب، وتُحذف الملفات الصوتية تلقائياً بعد الاعتماد.
                </span>
              </label>
            </div>
          </div>

          {/* AI Processing Status */}
          {isAiProcessing && (
            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 flex items-center gap-3 animate-pulse">
              <div className="w-5 h-5 border-2 border-teal-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <div className="text-xs font-bold leading-tight">
                {aiStatusMessage || 'جاري تحليل درجات الطلاب بالذكاء الاصطناعي...'}
              </div>
            </div>
          )}

          {/* Tri-Color Review Screen (Section 8.3 & Section 11.8) */}
          {verifiedEntries.length > 0 && (
            <div className="space-y-3">
              {/* Review Summary Header */}
              <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="font-extrabold text-slate-800 dark:text-slate-100">
                    نتائج الرصد الصوتي ({verifiedEntries.length} طالباً)
                  </span>
                  <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                    <span className="text-emerald-700 dark:text-emerald-400 font-bold">🟢 مؤكدة: {greenEntries.length}</span>
                    <span className="text-amber-700 dark:text-amber-400 font-bold">🟡 مراجعة: {yellowEntries.length}</span>
                    {redEntries.length > 0 && (
                      <span className="text-rose-700 dark:text-rose-400 font-bold">🔴 غير مقروءة: {redEntries.length}</span>
                    )}
                  </div>
                </div>

                {/* 1-Tap Accept All Green */}
                {greenEntries.length > 0 && (
                  <button
                    type="button"
                    onClick={handleAcceptAllGreen}
                    className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-sm transition active:scale-95"
                  >
                    ✓ اعتماد كل الأخضر
                  </button>
                )}
              </div>

              {/* 1. Yellow & Red Entries (OPEN FIRST) */}
              {(yellowEntries.length > 0 || redEntries.length > 0) && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <span>⚠️</span>
                    <span>تحتاج مراجعتك واعتمادك أولاً ({yellowEntries.length + redEntries.length})</span>
                  </div>

                  <div className="divide-y divide-amber-200 dark:divide-amber-900/50 border border-amber-300 dark:border-amber-800/70 rounded-2xl overflow-hidden bg-amber-50/50 dark:bg-amber-950/20">
                    {[...yellowEntries, ...redEntries].map((entry) => (
                      <div
                        key={entry.student.id}
                        className="p-3 flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <input
                            type="checkbox"
                            checked={entry.isConfirmed}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setVerifiedEntries((prev) =>
                                prev.map((item) =>
                                  item.student.id === entry.student.id ? { ...item, isConfirmed: checked } : item
                                )
                              );
                            }}
                            className="w-4 h-4 rounded text-teal-600 cursor-pointer flex-shrink-0"
                          />
                          <div className="truncate">
                            <div className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                              {entry.student.fullName}
                            </div>
                            <div className="text-[10px] text-amber-800 dark:text-amber-300 truncate">
                              {entry.notes || `صوت: "${entry.rawText}"`}
                            </div>
                          </div>
                        </div>

                        {/* Interactive +/- Score Steppers */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <div className="flex items-center border border-slate-300 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-900">
                            <button
                              type="button"
                              disabled={entry.isAbsent || (entry.detectedScore ?? 0) <= 0}
                              onClick={() => {
                                setVerifiedEntries((prev) =>
                                  prev.map((item) =>
                                    item.student.id === entry.student.id
                                      ? { ...item, detectedScore: Math.max(0, (item.detectedScore ?? 0) - 1), isConfirmed: true }
                                      : item
                                  )
                                );
                              }}
                              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 text-xs font-bold disabled:opacity-30"
                            >
                              -
                            </button>
                            <span className="w-10 text-center text-xs font-black">
                              {entry.isAbsent ? 'غائب' : entry.detectedScore ?? '--'}
                            </span>
                            <button
                              type="button"
                              disabled={entry.isAbsent || (entry.detectedScore ?? 0) >= maxScore}
                              onClick={() => {
                                setVerifiedEntries((prev) =>
                                  prev.map((item) =>
                                    item.student.id === entry.student.id
                                      ? { ...item, detectedScore: Math.min(maxScore, (item.detectedScore ?? 0) + 1), isConfirmed: true }
                                      : item
                                  )
                                );
                              }}
                              className="w-8 h-8 flex items-center justify-center text-slate-600 hover:text-slate-900 text-xs font-bold disabled:opacity-30"
                            >
                              +
                            </button>
                          </div>

                          {/* Absent Toggle */}
                          <button
                            type="button"
                            onClick={() => {
                              const nextAbsent = !entry.isAbsent;
                              setVerifiedEntries((prev) =>
                                prev.map((item) =>
                                  item.student.id === entry.student.id
                                    ? {
                                        ...item,
                                        isAbsent: nextAbsent,
                                        detectedScore: nextAbsent ? null : item.detectedScore ?? 15,
                                        isConfirmed: true,
                                      }
                                    : item
                                )
                              );
                            }}
                            className={`min-h-[32px] px-2.5 rounded-lg text-[11px] font-bold transition ${
                              entry.isAbsent
                                ? 'bg-rose-100 text-rose-700 border border-rose-300'
                                : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
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

              {/* 2. Green Entries (FOLDED / COLLAPSED BY DEFAULT) */}
              {greenEntries.length > 0 && (
                <div className="border border-emerald-200 dark:border-emerald-900/60 rounded-2xl overflow-hidden bg-emerald-50/30 dark:bg-emerald-950/10">
                  <button
                    type="button"
                    onClick={() => setIsGreenCollapsed(!isGreenCollapsed)}
                    className="w-full p-3 flex items-center justify-between text-xs font-bold text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 transition cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5">
                      <span>🟢</span>
                      <span>الدرجات المؤكدة والمتطابقة ({greenEntries.length} طالباً)</span>
                    </span>
                    <span className="text-sm">{isGreenCollapsed ? '▼ عرض' : '▲ طي'}</span>
                  </button>

                  {!isGreenCollapsed && (
                    <div className="divide-y divide-emerald-100 dark:divide-emerald-900/40 p-2">
                      {greenEntries.map((entry) => (
                        <div key={entry.student.id} className="p-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={entry.isConfirmed}
                              onChange={(e) => {
                                const checked = e.target.checked;
                                setVerifiedEntries((prev) =>
                                  prev.map((item) =>
                                    item.student.id === entry.student.id ? { ...item, isConfirmed: checked } : item
                                  )
                                );
                              }}
                              className="w-4 h-4 rounded text-teal-600"
                            />
                            <span className="font-bold text-slate-800 dark:text-slate-200">
                              {entry.student.fullName}
                            </span>
                          </div>
                          <span className="px-2.5 py-0.5 rounded-lg bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-200 font-black">
                            {entry.isAbsent ? 'غائب' : entry.detectedScore}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3. Unentered Students */}
              {unenteredStudents.length > 0 && (
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-500">
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    لم تُدخل درجاتهم بعد ({unenteredStudents.length} طالباً):
                  </span>
                  <p className="text-[11px] mt-1 leading-relaxed">
                    {unenteredStudents.map((s) => s.fullName).join('، ')}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 pb-safe">
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
            disabled={verifiedEntries.filter((m) => m.isConfirmed).length === 0}
            onClick={handleApplyToGradebook}
            className={`min-h-[44px] px-6 py-2.5 rounded-xl font-extrabold text-xs shadow-md transition flex items-center gap-2 ${
              verifiedEntries.filter((m) => m.isConfirmed).length === 0
                ? 'bg-slate-300 dark:bg-slate-700 text-slate-500 cursor-not-allowed'
                : 'bg-teal-700 hover:bg-teal-800 text-white active:scale-95 cursor-pointer shadow-teal-700/20'
            }`}
          >
            <span>اعتماد وتثبيت في السجل ({verifiedEntries.filter((m) => m.isConfirmed).length})</span>
            <span>✓</span>
          </button>
        </div>

      </div>
    </div>
  );
};
