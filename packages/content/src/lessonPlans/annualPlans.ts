/**
 * @techeeer/content - Annual Lesson Plans & Verification Helpers
 * Supports 32-week distribution aligned with Iraqi MoE academic calendar.
 */

import type {
  AnnualPlanWeek,
  DailyLessonPlan,
  TeacherProfile,
} from '../types/index.js';

/**
 * Validates lesson plan class duration within standard Iraqi period limits (35 to 50 minutes).
 */
export function validateLessonPlanDuration(durationMinutes: number): boolean {
  return durationMinutes >= 35 && durationMinutes <= 50;
}

/**
 * Checks whether the given week index falls within the valid 32 teaching weeks (1 to 32).
 */
export function isValidAnnualWeek(week: number): boolean {
  return week >= 1 && week <= 32;
}

/**
 * Generates an annual lesson plan distribution across exactly 32 teaching weeks.
 * Weeks 1-16: Semester 1 (Autumn term + midterm reviews)
 * Weeks 17-32: Semester 2 (Spring term + final reviews)
 */
export function createAnnualPlan(
  subjectId: string,
  grade: number,
  options: {
    semesterSplit?: number;
    periodsPerWeek?: number;
  } = {}
): AnnualPlanWeek[] {
  const semesterSplit = options.semesterSplit ?? 16;
  const periodsPerWeek = options.periodsPerWeek ?? 4;

  return Array.from({ length: 32 }, (_, i) => {
    const week = i + 1;
    const unitIndex = Math.floor(i / 4) + 1;
    const semester: 1 | 2 = week <= semesterSplit ? 1 : 2;

    const topics: string[] = [
      `موضوعات الأسبوع ${week} - المادة ${subjectId} (الصف ${grade})`,
    ];

    if (week === 16) {
      topics.push('مراجعة شاملة وامتحانات نصف السنة الدراسية');
    } else if (week === 32) {
      topics.push('مراجعة نهائية وامتحانات نهاية السنة الدراسية');
    }

    return {
      week,
      weekNumber: week,
      semester,
      unit: `الوحدة ${unitIndex}`,
      chapterTitle: `الفصل التعليمي ${Math.floor(i / 2) + 1}`,
      topics,
      periodsPerWeek,
    };
  });
}

/**
 * Clones an existing lesson plan with unique ID, optional target division,
 * and automatic numbering append (e.g. "خطة درس: الذرة (2)") if cloned.
 */
export function cloneLessonPlan(
  original: DailyLessonPlan,
  targetDivision?: string
): DailyLessonPlan {
  const uniqueSuffix = Math.random().toString(36).substring(2, 7);
  const newId = `${original.id}_clone_${uniqueSuffix}`;

  // Check if topic already ends with (N), increment or append (2)
  let updatedTopic = original.topic;
  const match = original.topic.match(/\((\d+)\)$/);
  if (match) {
    const currentNum = parseInt(match[1], 10);
    updatedTopic = original.topic.replace(/\(\d+\)$/, `(${currentNum + 1})`);
  } else {
    updatedTopic = `${original.topic} (2)`;
  }

  return {
    ...original,
    id: newId,
    topic: updatedTopic,
    division: targetDivision ?? original.division,
    objectives: [...original.objectives],
    cognitiveObjectives: original.cognitiveObjectives ? [...original.cognitiveObjectives] : undefined,
    affectiveObjectives: original.affectiveObjectives ? [...original.affectiveObjectives] : undefined,
    psychomotorObjectives: original.psychomotorObjectives ? [...original.psychomotorObjectives] : undefined,
    teachingAids: original.teachingAids ? [...original.teachingAids] : undefined,
    teachingStrategies: original.teachingStrategies ? [...original.teachingStrategies] : undefined,
  };
}

/**
 * Calculates lesson plan syllabus progress percentage.
 */
export function calculateLessonProgress(
  lessons: Array<{ status: 'completed' | 'scheduled' | 'postponed' | 'holiday' }>
): { completedCount: number; totalCount: number; percentage: number } {
  const totalCount = lessons.length;
  if (totalCount === 0) {
    return { completedCount: 0, totalCount: 0, percentage: 0 };
  }

  const completedCount = lessons.filter((l) => l.status === 'completed').length;
  const percentage = Math.round((completedCount / totalCount) * 100);

  return { completedCount, totalCount, percentage };
}

/**
 * Filters curriculum items strictly matching the teacher's registered subject specialization and grade.
 */
export function filterCurriculumForTeacher<
  T extends { subjectId?: string; subject?: string; grade?: number }
>(teacher: TeacherProfile, items: T[]): T[] {
  const allowedSubjects = [
    teacher.subject.toLowerCase().trim(),
    ...(teacher.secondarySubjects || []).map((s) => s.toLowerCase().trim()),
  ];

  return items.filter((item) => {
    // Check subject
    const itemSubject = (item.subject || item.subjectId || '').toLowerCase().trim();
    const subjectMatches = allowedSubjects.some(
      (sub) => itemSubject === sub || itemSubject.includes(sub) || sub.includes(itemSubject)
    );
    if (!subjectMatches) return false;

    // Check grade if specified
    if (item.grade !== undefined && item.grade !== teacher.grade) {
      return false;
    }

    return true;
  });
}
