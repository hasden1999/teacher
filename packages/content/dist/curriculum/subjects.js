/**
 * @techeeer/content - Official Iraqi Ministry of Education Subjects Directory
 */
export const IRAQI_SUBJECTS = [
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
export function getAllSubjects() {
    return [...IRAQI_SUBJECTS];
}
export function getSubjectsByStageAndGrade(stage, grade, stream) {
    return IRAQI_SUBJECTS.filter((sub) => {
        if (sub.stage !== stage)
            return false;
        if (!sub.grades.includes(grade))
            return false;
        if (stream && sub.stream && sub.stream !== 'general' && sub.stream !== stream) {
            return false;
        }
        return true;
    });
}
/**
 * Maps any subject ID or Arabic/English subject name to a canonical family key.
 * E.g. 'mathematics' | 'math_scientific' | 'الرياضيات' -> 'math'
 *      'islamic_education' | 'islamic_primary' | 'التربية الإسلامية' -> 'islamic'
 *      'social_studies' | 'social_intermediate' | 'الاجتماعيات' -> 'social'
 */
export function normalizeSubjectFamily(rawSubject) {
    if (!rawSubject || typeof rawSubject !== 'string')
        return 'science';
    const clean = rawSubject.toLowerCase().trim();
    if (!clean)
        return 'science';
    if (clean.includes('math') || clean.includes('رياضيات'))
        return 'math';
    if (clean.includes('islamic') || clean.includes('إسلامي') || clean.includes('اسلامي') || clean.includes('قرآن'))
        return 'islamic';
    if (clean.includes('arabic') || clean.includes('عربي'))
        return 'arabic';
    if (clean.includes('english') || clean.includes('إنكليزي') || clean.includes('انكليزي') || clean.includes('إنجليزي') || clean.includes('انجليزي'))
        return 'english';
    if (clean.includes('biolog') || clean.includes('أحياء') || clean.includes('احياء'))
        return 'biology';
    if (clean.includes('chemist') || clean.includes('كيمياء'))
        return 'chemistry';
    if (clean.includes('physic') || clean.includes('فيزياء'))
        return 'physics';
    if (clean.includes('social') || clean.includes('اجتماعيات'))
        return 'social';
    if (clean.includes('history') || clean.includes('تاريخ'))
        return 'history';
    if (clean.includes('geograph') || clean.includes('جغرافي'))
        return 'geography';
    if (clean.includes('econom') || clean.includes('اقتصاد'))
        return 'economics';
    if (clean.includes('philosoph') || clean.includes('فلسف'))
        return 'philosophy';
    if (clean.includes('comput') || clean.includes('حاسوب'))
        return 'computer';
    if (clean.includes('art') || clean.includes('فني') || clean.includes('رياضي'))
        return 'art_pe';
    if (clean.includes('science') || clean.includes('علوم'))
        return 'science';
    return clean;
}
export function doesSubjectMatch(subjectA, subjectB) {
    if (!subjectA || !subjectB)
        return false;
    const normA = normalizeSubjectFamily(subjectA);
    const normB = normalizeSubjectFamily(subjectB);
    if (normA === normB)
        return true;
    const cleanA = subjectA.toLowerCase().trim();
    const cleanB = subjectB.toLowerCase().trim();
    return cleanA === cleanB || cleanA.includes(cleanB) || cleanB.includes(cleanA);
}
export function getSubjectById(id, stage, stream) {
    if (!id || typeof id !== 'string')
        return IRAQI_SUBJECTS[0];
    // First attempt exact id match
    const found = IRAQI_SUBJECTS.find((sub) => sub.id === id);
    if (found)
        return found;
    const family = normalizeSubjectFamily(id);
    const cleanId = id.toLowerCase().trim();
    const candidates = IRAQI_SUBJECTS.filter((sub) => normalizeSubjectFamily(sub.id) === family ||
        normalizeSubjectFamily(sub.nameAr) === family ||
        sub.id.startsWith(cleanId) ||
        sub.id.includes(cleanId) ||
        sub.nameEn.toLowerCase().includes(cleanId) ||
        sub.nameAr.includes(cleanId));
    if (candidates.length === 0)
        return undefined;
    if (stage) {
        const stageMatch = candidates.find((c) => c.stage === stage && (!stream || c.stream === stream || c.stream === 'general'));
        if (stageMatch)
            return stageMatch;
    }
    return candidates[0];
}
export function filterSubjectsForTeacher(teacher) {
    if (!teacher || !teacher.subject)
        return [];
    const primaryFamily = normalizeSubjectFamily(teacher.subject);
    const allowedFamilies = [
        primaryFamily,
        ...(teacher.secondarySubjects || []).map((s) => normalizeSubjectFamily(s)),
    ];
    const matchedWithStageAndGrade = IRAQI_SUBJECTS.filter((sub) => {
        if (teacher.stage && sub.stage !== teacher.stage)
            return false;
        if (teacher.grade && !sub.grades.includes(teacher.grade))
            return false;
        if (teacher.stream && sub.stream && sub.stream !== 'general' && sub.stream !== teacher.stream) {
            return false;
        }
        const subFamily = normalizeSubjectFamily(sub.id);
        return allowedFamilies.includes(subFamily) || doesSubjectMatch(sub.id, teacher.subject);
    });
    if (matchedWithStageAndGrade.length > 0) {
        return matchedWithStageAndGrade;
    }
    // Fallback: match by subject family regardless of grade/stage if teacher selected a cross-stage subject (e.g. Biology in primary)
    return IRAQI_SUBJECTS.filter((sub) => {
        const subFamily = normalizeSubjectFamily(sub.id);
        return allowedFamilies.includes(subFamily);
    });
}
//# sourceMappingURL=subjects.js.map