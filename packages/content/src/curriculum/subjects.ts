/**
 * @techeeer/content - Official Iraqi Ministry of Education Subjects Directory
 */

import type {
  EducationalStage,
  AcademicStream,
  SubjectDefinition,
  TeacherProfile,
} from '../types/index.js';

export const IRAQI_SUBJECTS: SubjectDefinition[] = [
  // --- المرحلة الابتدائية ---
  {
    id: 'islamic_primary',
    nameAr: 'التربية الإسلامية والقرآن الكريم',
    nameEn: 'Islamic Education',
    stage: 'primary',
    grades: [1, 2, 3, 4, 5, 6],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 4,
    hasOral: true,
    icon: 'book-open',
  },
  {
    id: 'arabic_primary',
    nameAr: 'اللغة العربية',
    nameEn: 'Arabic Language',
    stage: 'primary',
    grades: [1, 2, 3, 4, 5, 6],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 6,
    hasOral: true,
    icon: 'languages',
  },
  {
    id: 'english_primary',
    nameAr: 'اللغة الإنكليزية',
    nameEn: 'English Language',
    stage: 'primary',
    grades: [1, 2, 3, 4, 5, 6],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 4,
    hasOral: true,
    icon: 'globe',
  },
  {
    id: 'math_primary',
    nameAr: 'الرياضيات',
    nameEn: 'Mathematics',
    stage: 'primary',
    grades: [1, 2, 3, 4, 5, 6],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 5,
    hasOral: false,
    icon: 'calculator',
  },
  {
    id: 'science_primary',
    nameAr: 'العلوم',
    nameEn: 'General Science',
    stage: 'primary',
    grades: [1, 2, 3, 4, 5, 6],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 4,
    hasOral: false,
    icon: 'flask-conical',
  },
  {
    id: 'social_primary',
    nameAr: 'الاجتماعيات',
    nameEn: 'Social Studies',
    stage: 'primary',
    grades: [4, 5, 6],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 3,
    hasOral: false,
    icon: 'map',
  },

  // --- المرحلة المتوسطة ---
  {
    id: 'islamic_intermediate',
    nameAr: 'التربية الإسلامية',
    nameEn: 'Islamic Education',
    stage: 'intermediate',
    grades: [1, 2, 3],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [3],
    weeklyPeriods: 3,
    hasOral: true,
    icon: 'book-open',
  },
  {
    id: 'arabic_intermediate',
    nameAr: 'اللغة العربية',
    nameEn: 'Arabic Language',
    stage: 'intermediate',
    grades: [1, 2, 3],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [3],
    weeklyPeriods: 5,
    hasOral: true,
    icon: 'languages',
  },
  {
    id: 'english_intermediate',
    nameAr: 'اللغة الإنكليزية',
    nameEn: 'English Language',
    stage: 'intermediate',
    grades: [1, 2, 3],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [3],
    weeklyPeriods: 4,
    hasOral: true,
    icon: 'globe',
  },
  {
    id: 'math_intermediate',
    nameAr: 'الرياضيات',
    nameEn: 'Mathematics',
    stage: 'intermediate',
    grades: [1, 2, 3],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [3],
    weeklyPeriods: 5,
    hasOral: false,
    icon: 'calculator',
  },
  {
    id: 'science_intermediate',
    nameAr: 'العلوم العامة',
    nameEn: 'General Science',
    stage: 'intermediate',
    grades: [1, 2],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [],
    weeklyPeriods: 5,
    hasOral: false,
    icon: 'flask-conical',
  },
  {
    id: 'biology_intermediate',
    nameAr: 'علم الأحياء',
    nameEn: 'Biology',
    stage: 'intermediate',
    grades: [3],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [3],
    weeklyPeriods: 3,
    hasOral: false,
    icon: 'dna',
  },
  {
    id: 'chemistry_intermediate',
    nameAr: 'الكيمياء',
    nameEn: 'Chemistry',
    stage: 'intermediate',
    grades: [3],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [3],
    weeklyPeriods: 3,
    hasOral: false,
    icon: 'atom',
  },
  {
    id: 'physics_intermediate',
    nameAr: 'الفيزياء',
    nameEn: 'Physics',
    stage: 'intermediate',
    grades: [3],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [3],
    weeklyPeriods: 3,
    hasOral: false,
    icon: 'zap',
  },
  {
    id: 'social_intermediate',
    nameAr: 'الاجتماعيات',
    nameEn: 'Social Studies',
    stage: 'intermediate',
    grades: [1, 2, 3],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [3],
    weeklyPeriods: 3,
    hasOral: false,
    icon: 'map',
  },
  {
    id: 'computer_intermediate',
    nameAr: 'الحاسوب',
    nameEn: 'Computer Science',
    stage: 'intermediate',
    grades: [1, 2, 3],
    stream: 'general',
    isCore: false,
    isMinisterialGrade: [],
    weeklyPeriods: 1,
    hasOral: false,
    icon: 'laptop',
  },

  // --- المرحلة الإعدادية: الفرع العلمي ---
  {
    id: 'islamic_preparatory',
    nameAr: 'التربية الإسلامية',
    nameEn: 'Islamic Education',
    stage: 'preparatory',
    grades: [4, 5, 6],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 2,
    hasOral: true,
    icon: 'book-open',
  },
  {
    id: 'arabic_preparatory',
    nameAr: 'اللغة العربية (قواعد وأدب)',
    nameEn: 'Arabic Language & Literature',
    stage: 'preparatory',
    grades: [4, 5, 6],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 4,
    hasOral: true,
    icon: 'languages',
  },
  {
    id: 'english_preparatory',
    nameAr: 'اللغة الإنكليزية',
    nameEn: 'English Language',
    stage: 'preparatory',
    grades: [4, 5, 6],
    stream: 'general',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 4,
    hasOral: true,
    icon: 'globe',
  },
  {
    id: 'math_scientific',
    nameAr: 'الرياضيات',
    nameEn: 'Mathematics (Scientific)',
    stage: 'preparatory',
    grades: [4, 5, 6],
    stream: 'scientific',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 5,
    hasOral: false,
    icon: 'calculator',
  },
  {
    id: 'physics_scientific',
    nameAr: 'الفيزياء',
    nameEn: 'Physics',
    stage: 'preparatory',
    grades: [4, 5, 6],
    stream: 'scientific',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 5,
    hasOral: false,
    icon: 'zap',
  },
  {
    id: 'chemistry_scientific',
    nameAr: 'الكيمياء',
    nameEn: 'Chemistry',
    stage: 'preparatory',
    grades: [4, 5, 6],
    stream: 'scientific',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 4,
    hasOral: false,
    icon: 'atom',
  },
  {
    id: 'biology_scientific',
    nameAr: 'علم الأحياء',
    nameEn: 'Biology',
    stage: 'preparatory',
    grades: [4, 5, 6],
    stream: 'scientific',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 4,
    hasOral: false,
    icon: 'dna',
  },

  // --- المرحلة الإعدادية: الفرع الأدبي ---
  {
    id: 'math_literary',
    nameAr: 'الرياضيات',
    nameEn: 'Mathematics (Literary)',
    stage: 'preparatory',
    grades: [4, 5, 6],
    stream: 'literary',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 4,
    hasOral: false,
    icon: 'calculator',
  },
  {
    id: 'history_literary',
    nameAr: 'التاريخ',
    nameEn: 'History',
    stage: 'preparatory',
    grades: [4, 5, 6],
    stream: 'literary',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 4,
    hasOral: false,
    icon: 'scroll',
  },
  {
    id: 'geography_literary',
    nameAr: 'الجغرافيا',
    nameEn: 'Geography',
    stage: 'preparatory',
    grades: [4, 5, 6],
    stream: 'literary',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 4,
    hasOral: false,
    icon: 'compass',
  },
  {
    id: 'economics_literary',
    nameAr: 'الاقتصاد',
    nameEn: 'Economics',
    stage: 'preparatory',
    grades: [5, 6],
    stream: 'literary',
    isCore: true,
    isMinisterialGrade: [6],
    weeklyPeriods: 3,
    hasOral: false,
    icon: 'trending-up',
  },
  {
    id: 'philosophy_literary',
    nameAr: 'الفلسفة وعلم النفس',
    nameEn: 'Philosophy & Psychology',
    stage: 'preparatory',
    grades: [5],
    stream: 'literary',
    isCore: false,
    isMinisterialGrade: [],
    weeklyPeriods: 3,
    hasOral: false,
    icon: 'brain',
  },
];

export function getAllSubjects(): SubjectDefinition[] {
  return [...IRAQI_SUBJECTS];
}

export function getSubjectsByStageAndGrade(
  stage: EducationalStage,
  grade: number,
  stream?: AcademicStream
): SubjectDefinition[] {
  return IRAQI_SUBJECTS.filter((sub) => {
    if (sub.stage !== stage) return false;
    if (!sub.grades.includes(grade)) return false;
    if (stream && sub.stream && sub.stream !== 'general' && sub.stream !== stream) {
      return false;
    }
    return true;
  });
}

export function getSubjectById(
  id: string,
  stage?: EducationalStage,
  stream?: AcademicStream
): SubjectDefinition | undefined {
  // First attempt exact id match
  let found = IRAQI_SUBJECTS.find((sub) => sub.id === id);
  if (found) return found;

  // Next attempt prefix or fuzzy match by subject base name (e.g. 'chemistry', 'physics', 'math')
  const cleanId = id.toLowerCase().trim();
  const candidates = IRAQI_SUBJECTS.filter(
    (sub) =>
      sub.id.startsWith(cleanId) ||
      sub.id.includes(cleanId) ||
      sub.nameEn.toLowerCase().includes(cleanId) ||
      sub.nameAr.includes(cleanId)
  );

  if (candidates.length === 0) return undefined;

  if (stage) {
    const stageMatch = candidates.find((c) => c.stage === stage && (!stream || c.stream === stream || c.stream === 'general'));
    if (stageMatch) return stageMatch;
  }

  return candidates[0];
}

export function filterSubjectsForTeacher(teacher: TeacherProfile): SubjectDefinition[] {
  const primaryId = teacher.subject.toLowerCase().trim();
  const allowedSubjectKeys = [primaryId, ...(teacher.secondarySubjects || []).map((s) => s.toLowerCase().trim())];

  return IRAQI_SUBJECTS.filter((sub) => {
    if (sub.stage !== teacher.stage) return false;
    if (!sub.grades.includes(teacher.grade)) return false;
    if (teacher.stream && sub.stream && sub.stream !== 'general' && sub.stream !== teacher.stream) {
      return false;
    }

    const matchesKey = allowedSubjectKeys.some(
      (key) =>
        sub.id.includes(key) ||
        sub.nameEn.toLowerCase().includes(key) ||
        sub.nameAr.includes(key)
    );
    return matchesKey;
  });
}
