/**
 * Types & Canonical Definitions for Virtual Gradebook Studio
 */

export type GradeColumnCategory = 'daily' | 'exam' | 'term' | 'effort' | 'final';

export interface GradeColumnDef {
  key: string;
  label: string;
  shortLabel?: string;
  category: GradeColumnCategory;
  maxScore: number;
  minScore?: number;
  isEditable: boolean;
  isComputed?: boolean;
  width?: number;
  description?: string;
}

export interface StudentRowItem {
  id: string;
  fullName: string;
  rollNumber: number;
  gender?: 'male' | 'female';
  isActive?: boolean;
  guardianPhone?: string;
  notes?: string;
}

export interface CellGradeValue {
  score: number | null;
  isAbsent: boolean;
  notes?: string;
}

export type GradebookMatrix = Record<string, Record<string, CellGradeValue>>;

export interface ActiveCellCoordinate {
  studentId: string;
  studentIndex: number;
  columnKey: string;
  columnTitle?: string;
  maxScore?: number;
  minScore?: number;
}

export const CANONICAL_GRADE_COLUMNS: GradeColumnDef[] = [
  // النشاط اليومي (مفصل 5×20)
  { key: 'component_oral', label: 'الشفوي', maxScore: 20, minScore: 0, category: 'daily', isEditable: true, width: 80 },
  { key: 'component_written', label: 'التحريري', maxScore: 20, minScore: 0, category: 'daily', isEditable: true, width: 80 },
  { key: 'component_homework', label: 'الواجبات', maxScore: 20, minScore: 0, category: 'daily', isEditable: true, width: 80 },
  { key: 'component_behavior', label: 'السلوك', maxScore: 20, minScore: 0, category: 'daily', isEditable: true, width: 80 },
  { key: 'component_participation', label: 'المشاركة', maxScore: 20, minScore: 0, category: 'daily', isEditable: true, width: 80 },
  { key: 'daily_total', label: 'النشاط اليومي', maxScore: 100, minScore: 0, category: 'daily', isEditable: false, isComputed: true, width: 95 },

  // امتحانات الفصل الأول
  { key: 'month_1', label: 'الشهر الأول', maxScore: 100, minScore: 0, category: 'exam', isEditable: true, width: 90 },
  { key: 'month_2', label: 'الشهر الثاني', maxScore: 100, minScore: 0, category: 'exam', isEditable: true, width: 90 },
  { key: 'mid_term', label: 'نصف السنة', maxScore: 100, minScore: 0, category: 'exam', isEditable: true, width: 95 },

  // امتحانات الفصل الثاني والسعي السنوي
  { key: 'month_3', label: 'الشهر الثالث', maxScore: 100, minScore: 0, category: 'exam', isEditable: true, width: 90 },
  { key: 'month_4', label: 'الشهر الرابع', maxScore: 100, minScore: 0, category: 'exam', isEditable: true, width: 90 },
  { key: 'annual_effort', label: 'السعي السنوي', maxScore: 100, minScore: 0, category: 'effort', isEditable: false, isComputed: true, width: 100 },
  { key: 'final_exam', label: 'الامتحان النهائي', maxScore: 100, minScore: 0, category: 'final', isEditable: true, width: 100 },
  { key: 'final_status', label: 'النتيجة', maxScore: 100, minScore: 0, category: 'final', isEditable: false, isComputed: true, width: 85 },
];

export function getGradeBadgeStyle(score: number | null | undefined, isAbsent: boolean) {
  if (isAbsent) {
    return {
      bg: 'bg-slate-100 dark:bg-slate-800',
      text: 'text-slate-700 dark:text-slate-300',
      border: 'border-slate-300 dark:border-slate-700',
      label: 'غائب',
      badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
    };
  }
  if (score === null || score === undefined) {
    return {
      bg: 'bg-transparent',
      text: 'text-slate-400 dark:text-slate-600',
      border: 'border-transparent',
      label: '--',
      badgeClass: 'text-slate-400 dark:text-slate-600',
    };
  }
  if (score < 50) {
    return {
      bg: 'bg-red-50 dark:bg-red-950/40',
      text: 'text-red-700 dark:text-red-300',
      border: 'border-red-200 dark:border-red-800',
      label: 'راسب',
      badgeClass: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800',
    };
  }
  if (score >= 90) {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800',
      label: 'متميز',
      badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    };
  }
  return {
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800',
    label: 'ناجح',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  };
}
