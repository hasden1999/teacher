import React, { useState, useEffect, useCallback } from 'react';
import { IconClose, IconCheck } from './Icons.js';

export interface KeypadConfirmResult {
  score: number | null;
  isAbsent: boolean;
  studentId: string;
}

export interface BottomSheetKeypadProps {
  isOpen: boolean;
  studentId: string;
  studentName: string;
  studentIndex?: number;
  totalStudents?: number;
  columnTitle: string;
  initialValue?: number | string | null;
  initialAbsent?: boolean;
  minScore?: number;
  maxScore?: number;
  presets?: (number | 'غائب')[];
  autoAdvance?: boolean;
  onConfirm: (result: KeypadConfirmResult) => void;
  onNext?: () => void;
  onPrev?: () => void;
  onClose: () => void;
}

export const BottomSheetKeypad: React.FC<BottomSheetKeypadProps> = ({
  isOpen,
  studentId,
  studentName,
  studentIndex,
  totalStudents,
  columnTitle,
  initialValue = null,
  initialAbsent = false,
  minScore = 0,
  maxScore = 100,
  presets,
  autoAdvance = true,
  onConfirm,
  onNext,
  onPrev,
  onClose,
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const [isAbsent, setIsAbsent] = useState<boolean>(initialAbsent);

  // Safe Haptic feedback helper
  const triggerHaptic = (duration = 20) => {
    try {
      if (typeof window !== 'undefined' && 'vibrate' in navigator) {
        navigator.vibrate(duration);
      }
    } catch {}
  };

  // Determine presets based on maxScore if not explicitly provided
  const activePresets: (number | 'غائب')[] =
    presets ||
    (maxScore === 20
      ? [20, 15, 10, 5, 'غائب']
      : [100, 90, 80, 50, 'غائب']); // Matches T1.13.1

  // Reset internal input state on student change
  useEffect(() => {
    if (initialAbsent) {
      setIsAbsent(true);
      setInputValue('');
    } else if (initialValue !== null && initialValue !== undefined) {
      setIsAbsent(false);
      setInputValue(String(initialValue));
    } else {
      setIsAbsent(false);
      setInputValue('');
    }
  }, [studentId, initialValue, initialAbsent]);

  // Commit and Auto-Advance Helper
  const commitValue = useCallback(
    (score: number | null, absent: boolean) => {
      triggerHaptic(25);
      onConfirm({ score, isAbsent: absent, studentId });
      if (autoAdvance && onNext) {
        onNext();
      }
    },
    [autoAdvance, onConfirm, onNext, studentId]
  );

  // Clamping Helper (T1.13.5)
  const clampScore = useCallback(
    (rawVal: string): number => {
      const parsed = parseInt(rawVal, 10);
      if (isNaN(parsed)) return minScore;
      return Math.min(maxScore, Math.max(minScore, parsed));
    },
    [minScore, maxScore]
  );

  // Digit Press Handler (T1.13.2)
  const handleDigit = useCallback(
    (digit: string) => {
      triggerHaptic(15);
      if (isAbsent) setIsAbsent(false);

      const nextVal = inputValue + digit;
      const parsed = parseInt(nextVal, 10);

      // Check Clamping & trigger warning haptic on overflow
      if (!isNaN(parsed) && parsed > maxScore) {
        triggerHaptic(50); // Warning vibration
        const clamped = clampScore(nextVal);
        setInputValue(String(clamped));
        if (autoAdvance) {
          commitValue(clamped, false);
        }
        return;
      }

      setInputValue(nextVal);

      // Auto-advance checks (T1.13.2, T1.13.3)
      if (autoAdvance) {
        if (maxScore === 100) {
          // Reaching 2 digits (e.g. '85') or exact '100' triggers auto advance
          if (nextVal.length === 2 || nextVal === '100') {
            commitValue(parsed, false);
          }
        } else if (maxScore <= 20) {
          // In 0-20 Mode:
          if (nextVal.length === 1 && parsed >= 3) {
            commitValue(parsed, false);
          } else if (nextVal.length === 2) {
            commitValue(Math.min(maxScore, parsed), false);
          }
        }
      }
    },
    [inputValue, isAbsent, maxScore, clampScore, autoAdvance, commitValue]
  );

  // Quick Preset Press Handler (T1.13.3, T1.13.4)
  const handlePreset = useCallback(
    (val: number | 'غائب') => {
      triggerHaptic(20);
      if (val === 'غائب') {
        setIsAbsent(true);
        setInputValue('');
        commitValue(0, true); // Absent sets score: 0, isAbsent: true (T1.13.4)
      } else {
        setIsAbsent(false);
        setInputValue(String(val));
        commitValue(val, false); // Auto advance immediately on preset (T1.13.3)
      }
    },
    [commitValue]
  );

  // Backspace & Clear
  const handleBackspace = () => {
    triggerHaptic(20);
    setIsAbsent(false);
    setInputValue((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    triggerHaptic(30);
    setIsAbsent(false);
    setInputValue('');
  };

  // Explicit Confirm (Manual Commit)
  const handleManualConfirm = () => {
    triggerHaptic(30);
    if (isAbsent) {
      commitValue(0, true);
    } else {
      const score = inputValue === '' ? null : clampScore(inputValue);
      commitValue(score, false);
    }
  };

  // Keyboard accessibility
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Enter') {
        handleManualConfirm();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleDigit, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop with quick click to close */}
      <div
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="لوحة المفاتيح الرقمية لتدوين الدرجات"
        className="fixed inset-x-0 bottom-0 z-40 bg-white dark:bg-slate-900 rounded-t-3xl shadow-2xl border-t border-slate-200 dark:border-slate-800 pb-safe transition-transform duration-200 ease-out transform translate-y-0 max-w-lg mx-auto"
      >
        {/* Drag Handle Bar */}
        <div className="flex justify-center pt-2 pb-1 cursor-grab" onClick={onClose}>
          <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>

        {/* Sheet Header: Student & Score Context */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 dark:text-white text-base truncate">
                {studentName}
              </span>
              {studentIndex !== undefined && totalStudents !== undefined && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                  {studentIndex} من {totalStudents}
                </span>
              )}
            </div>
            <span className="text-xs text-teal-700 dark:text-teal-400 font-bold">
              {columnTitle} (الحد الأقصى: {maxScore})
            </span>
          </div>

          {/* Student Navigation Controls - Minimum 48px touch targets */}
          <div className="flex items-center gap-1">
            {onPrev && (
              <button
                type="button"
                onClick={onPrev}
                aria-label="الطالب السابق"
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold active:scale-95 transition-all"
              >
                ◀
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                aria-label="الطالب التالي"
                className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold active:scale-95 transition-all"
              >
                ▶
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق لوحة المفاتيح"
              className="min-h-[48px] min-w-[48px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white text-base font-bold active:scale-95 transition-all"
            >
              <IconClose size={20} />
            </button>
          </div>
        </div>

        {/* Display Screen */}
        <div className="flex items-center justify-center py-2.5 bg-slate-50 dark:bg-slate-950/50">
          <div
            aria-live="polite"
            className="flex items-center justify-center min-w-[140px] h-14 px-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-inner"
          >
            {isAbsent ? (
              <span className="text-rose-600 dark:text-rose-400 font-bold text-2xl">غائب</span>
            ) : inputValue !== '' ? (
              <span className="text-3xl font-black text-teal-800 dark:text-teal-300 tracking-wider">
                {inputValue}
              </span>
            ) : (
              <span className="text-3xl font-light text-slate-300 dark:text-slate-700">--</span>
            )}
          </div>
        </div>

        {/* Quick Presets Row (T1.13.1) */}
        <div className="flex items-center justify-between gap-1.5 px-3 py-1.5 overflow-x-auto no-scrollbar">
          {activePresets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => handlePreset(preset)}
              aria-label={`درجة سريعة ${preset}`}
              className={`flex-1 min-h-[44px] px-2 rounded-xl font-bold text-xs sm:text-sm transition-all transform active:scale-95 shadow-xs whitespace-nowrap ${
                preset === 'غائب'
                  ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800'
                  : 'bg-teal-50 hover:bg-teal-100 text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>

        {/* Ergonomic 4-Column Touch Numeric Grid */}
        <div className="grid grid-cols-4 gap-2 px-3 py-2">
          {/* Row 1 */}
          <button
            type="button"
            onClick={() => handleDigit('1')}
            aria-label="رقم 1"
            className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-xl font-bold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => handleDigit('2')}
            aria-label="رقم 2"
            className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-xl font-bold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => handleDigit('3')}
            aria-label="رقم 3"
            className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-xl font-bold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => handleDigit('10')}
            aria-label="درجة سريعة 10"
            className="h-13 rounded-2xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-extrabold text-sm active:scale-95 transition-all shadow-xs"
          >
            +10
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => handleDigit('4')}
            aria-label="رقم 4"
            className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-xl font-bold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => handleDigit('5')}
            aria-label="رقم 5"
            className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-xl font-bold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => handleDigit('6')}
            aria-label="رقم 6"
            className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-xl font-bold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => handleDigit('20')}
            aria-label="درجة سريعة 20"
            className="h-13 rounded-2xl bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-300 font-extrabold text-sm active:scale-95 transition-all shadow-xs"
          >
            +20
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => handleDigit('7')}
            aria-label="رقم 7"
            className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-xl font-bold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => handleDigit('8')}
            aria-label="رقم 8"
            className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-xl font-bold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => handleDigit('9')}
            aria-label="رقم 9"
            className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-xl font-bold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => handleDigit('00')}
            aria-label="إضافة 00"
            className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-base font-bold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
          >
            00
          </button>

          {/* Row 4: Controls */}
          <button
            type="button"
            onClick={handleClear}
            aria-label="مسح"
            className="h-13 rounded-2xl bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100 text-amber-800 dark:text-amber-300 font-bold text-xs active:scale-95 transition-all border border-amber-200/60 dark:border-amber-900/60"
          >
            مسح
          </button>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            aria-label="رقم 0"
            className="h-13 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 text-xl font-bold text-slate-800 dark:text-slate-100 transition-all shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            aria-label="⌫"
            className="h-13 rounded-2xl bg-slate-200 dark:bg-slate-800/80 hover:bg-slate-300 text-slate-700 dark:text-slate-300 text-xl font-bold active:scale-95 transition-all flex items-center justify-center"
          >
            ⌫
          </button>
          <button
            type="button"
            onClick={() => handlePreset('غائب')}
            aria-label="تسجيل غياب الطالب"
            className="h-13 rounded-2xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 font-bold text-xs active:scale-95 transition-all"
          >
            غائب
          </button>
        </div>

        {/* Bottom Prominent Confirm Action - Thumb Zone */}
        <div className="px-3 pt-1 pb-3">
          <button
            type="button"
            onClick={handleManualConfirm}
            aria-label="تأكيد الدرجة والانتقال للطالب التالي"
            className="w-full min-h-[48px] rounded-2xl bg-teal-700 hover:bg-teal-800 active:bg-teal-900 text-white font-extrabold text-sm shadow-md shadow-teal-700/20 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
          >
            <span>تأكيد الدرجة والانتقال</span>
            <IconCheck size={18} />
          </button>
        </div>
      </div>
    </>
  );
};
