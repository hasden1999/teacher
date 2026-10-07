/**
 * @techeeer/content - Educational Stages & Grade Definitions
 * Official Iraqi Ministry of Education structure:
 * - Primary: Grades 1 to 6 (Grade 6 is ministerial)
 * - Intermediate: Grades 1 to 3 (Grade 3 is ministerial)
 * - Preparatory: Grades 4 to 6, split into Scientific and Literary (Grade 6 is ministerial)
 */

import type {
  EducationalStage,
  AcademicStream,
  StageDefinition,
  GradeDefinition,
} from '../types/index.js';

export const IRAQI_STAGES: StageDefinition[] = [
  {
    id: 'primary',
    nameAr: 'المرحلة الابتدائية',
    nameEn: 'Primary Stage',
    grades: [1, 2, 3, 4, 5, 6],
    allowedStreams: ['general'],
  },
  {
    id: 'intermediate',
    nameAr: 'المرحلة المتوسطة',
    nameEn: 'Intermediate Stage',
    grades: [1, 2, 3],
    allowedStreams: ['general'],
  },
  {
    id: 'preparatory',
    nameAr: 'المرحلة الإعدادية',
    nameEn: 'Preparatory Stage',
    grades: [4, 5, 6],
    allowedStreams: ['scientific', 'literary'],
  },
];

export const IRAQI_GRADES: GradeDefinition[] = [
  // Primary (الابتدائي)
  {
    id: 'primary_1',
    stage: 'primary',
    grade: 1,
    stream: 'general',
    nameAr: 'الأول الابتدائي',
    nameEn: 'Primary Grade 1',
    isMinisterial: false,
  },
  {
    id: 'primary_2',
    stage: 'primary',
    grade: 2,
    stream: 'general',
    nameAr: 'الثاني الابتدائي',
    nameEn: 'Primary Grade 2',
    isMinisterial: false,
  },
  {
    id: 'primary_3',
    stage: 'primary',
    grade: 3,
    stream: 'general',
    nameAr: 'الثالث الابتدائي',
    nameEn: 'Primary Grade 3',
    isMinisterial: false,
  },
  {
    id: 'primary_4',
    stage: 'primary',
    grade: 4,
    stream: 'general',
    nameAr: 'الرابع الابتدائي',
    nameEn: 'Primary Grade 4',
    isMinisterial: false,
  },
  {
    id: 'primary_5',
    stage: 'primary',
    grade: 5,
    stream: 'general',
    nameAr: 'الخامس الابتدائي',
    nameEn: 'Primary Grade 5',
    isMinisterial: false,
  },
  {
    id: 'primary_6',
    stage: 'primary',
    grade: 6,
    stream: 'general',
    nameAr: 'السادس الابتدائي',
    nameEn: 'Primary Grade 6',
    isMinisterial: true, // الوزاري العام للابتدائية
  },

  // Intermediate (المتوسط)
  {
    id: 'intermediate_1',
    stage: 'intermediate',
    grade: 1,
    stream: 'general',
    nameAr: 'الأول المتوسط',
    nameEn: 'Intermediate Grade 1',
    isMinisterial: false,
  },
  {
    id: 'intermediate_2',
    stage: 'intermediate',
    grade: 2,
    stream: 'general',
    nameAr: 'الثاني المتوسط',
    nameEn: 'Intermediate Grade 2',
    isMinisterial: false,
  },
  {
    id: 'intermediate_3',
    stage: 'intermediate',
    grade: 3,
    stream: 'general',
    nameAr: 'الثالث المتوسط',
    nameEn: 'Intermediate Grade 3',
    isMinisterial: true, // الوزاري العام للمتوسطة
  },

  // Preparatory (الإعدادي - علمي وأدبي)
  {
    id: 'preparatory_4_scientific',
    stage: 'preparatory',
    grade: 4,
    stream: 'scientific',
    nameAr: 'الرابع العلمي',
    nameEn: 'Preparatory Grade 4 (Scientific)',
    isMinisterial: false,
  },
  {
    id: 'preparatory_4_literary',
    stage: 'preparatory',
    grade: 4,
    stream: 'literary',
    nameAr: 'الرابع الأدبي',
    nameEn: 'Preparatory Grade 4 (Literary)',
    isMinisterial: false,
  },
  {
    id: 'preparatory_5_scientific',
    stage: 'preparatory',
    grade: 5,
    stream: 'scientific',
    nameAr: 'الخامس العلمي',
    nameEn: 'Preparatory Grade 5 (Scientific)',
    isMinisterial: false,
  },
  {
    id: 'preparatory_5_literary',
    stage: 'preparatory',
    grade: 5,
    stream: 'literary',
    nameAr: 'الخامس الأدبي',
    nameEn: 'Preparatory Grade 5 (Literary)',
    isMinisterial: false,
  },
  {
    id: 'preparatory_6_scientific',
    stage: 'preparatory',
    grade: 6,
    stream: 'scientific',
    nameAr: 'السادس العلمي',
    nameEn: 'Preparatory Grade 6 (Scientific)',
    isMinisterial: true, // البكالوريا العامة
  },
  {
    id: 'preparatory_6_literary',
    stage: 'preparatory',
    grade: 6,
    stream: 'literary',
    nameAr: 'السادس الأدبي',
    nameEn: 'Preparatory Grade 6 (Literary)',
    isMinisterial: true, // البكالوريا العامة
  },
];

export function getAllGrades(): GradeDefinition[] {
  return [...IRAQI_GRADES];
}

export function getAllStages(): StageDefinition[] {
  return [...IRAQI_STAGES];
}

export function getStageDefinition(stage: EducationalStage): StageDefinition | undefined {
  return IRAQI_STAGES.find((s) => s.id === stage);
}

export function getGradesByStage(stage: EducationalStage): GradeDefinition[] {
  return IRAQI_GRADES.filter((g) => g.stage === stage);
}

export function isMinisterialGrade(stage: EducationalStage, grade: number, stream?: AcademicStream): boolean {
  const match = IRAQI_GRADES.find(
    (g) => g.stage === stage && g.grade === grade && (!stream || g.stream === stream || g.stream === 'general')
  );
  return match?.isMinisterial ?? false;
}

export function getGradeTitle(stage: EducationalStage, grade: number, stream?: AcademicStream): string {
  const match = IRAQI_GRADES.find(
    (g) => g.stage === stage && g.grade === grade && (!stream || g.stream === stream || g.stream === 'general')
  );
  return match?.nameAr ?? `الصف ${grade}`;
}
