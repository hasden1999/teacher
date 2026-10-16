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
  const isIslamic =
    subjectId.toLowerCase().includes('islamic') ||
    subjectId.includes('إسلامية') ||
    subjectId.includes('اسلامية');

  // Authentic Iraqi Islamic Education 32-Week Curriculum Syllabus Distribution
  const ISLAMIC_WEEK_TOPICS: Record<number, { unit: string; chapter: string; topics: string[] }> = {
    1: { unit: 'الوحدة الأولى: القرآن الكريم وأحكام التلاوة', chapter: 'أحكام التلاوة', topics: ['أحكام لام (ال) التعريف (الإظهار القمري والإدغام الشمسي) وقواعد النطق'] },
    2: { unit: 'الوحدة الأولى: القرآن الكريم وأحكام التلاوة', chapter: 'السورة المقررة للحفظ', topics: ['تلاوة الآيات الكريمة المقررة وشرح معاني الكلمات والمفردات الصعبة'] },
    3: { unit: 'الوحدة الأولى: القرآن الكريم وأحكام التلاوة', chapter: 'تفسير الآيات الكريمة', topics: ['الشرح والإيضاح للآيات الكريمة والدروس المستنبطة'] },
    4: { unit: 'الوحدة الأولى: القرآن الكريم وأحكام التلاوة', chapter: 'المناقشة والتطبيقات', topics: ['حل أسئلة المناقشة وتدريبات عملية على أحكام التلاوة والتجويد'] },
    5: { unit: 'الوحدة الثانية: الحديث النبوي الشريف', chapter: 'الحديث النبوي الأول', topics: ['قراءة وحفظ نص الحديث النبوي الشريف في فضائل الأعمال وصلة الرحم'] },
    6: { unit: 'الوحدة الثانية: الحديث النبوي الشريف', chapter: 'شرح معاني الحديث', topics: ['بيان معاني المفردات وأهم ما يرشد إليه الحديث النبوي الشريف'] },
    7: { unit: 'الوحدة الثانية: الحديث النبوي الشريف', chapter: 'الحديث النبوي الثاني', topics: ['حفظ وفهم الحديث الثاني في التعاون وحرمة الاعتداء على الآخرين'] },
    8: { unit: 'الوحدة الثانية: الحديث النبوي الشريف', chapter: 'التقويم الشهري الأول', topics: ['تطبيقات عملية، حل مناقشة الحديث، واختبار الشهر الأول الشفهي والتحريري'] },
    9: { unit: 'الوحدة الثالثة: العقيدة الإسلامية', chapter: 'أركان الإيمان والتوحيد', topics: ['الإيمان بالله تعالى وتوحيده ودلائل القدرة الإلهية في الكون'] },
    10: { unit: 'الوحدة الثالثة: العقيدة الإسلامية', chapter: 'أسماء الله الحسنى', topics: ['الإيمان بالملائكة الكرام والكتب السماوية المنزلة'] },
    11: { unit: 'الوحدة الثالثة: العقيدة الإسلامية', chapter: 'اليوم الآخر والبعث', topics: ['الإيمان بالرسل والأنبياء والإيمان باليوم الآخر والجزاء العادل'] },
    12: { unit: 'الوحدة الثالثة: العقيدة الإسلامية', chapter: 'القضاء والقدر', topics: ['مفهوم القضاء والقدر مع السعي والعمل والأخذ بالأسباب'] },
    13: { unit: 'مراجعة منتصف العام', chapter: 'مراجعة الوحدات الثلاث الأولى', topics: ['مراجعة مركزة لأحكام التلاوة والسور والآيات القرآنية المقررة'] },
    14: { unit: 'مراجعة منتصف العام', chapter: 'مراجعة الأحاديث والعقيدة', topics: ['مراجعة شاملة لنصوص الأحاديث النبوية ومفاهيم العقيدة الإسلامية'] },
    15: { unit: 'مراجعة منتصف العام', chapter: 'نماذج امتحانات تجريبية', topics: ['حل أسئلة امتحانية نموذجية وتدريب التلاميذ على توزيع الدرجات'] },
    16: { unit: 'امتحانات نصف السنة', chapter: 'التقويم النصف سنوي', topics: ['مراجعة شاملة وامتحانات نصف السنة الدراسية والعطلة الربيعية'] },
    17: { unit: 'الوحدة الرابعة: السيرة النبوية المطهرة', chapter: 'أحداث الهجرة النبوية', topics: ['الهجرة النبوية الشريفة وأسس بناء المجتمع الإسلامي في المدينة'] },
    18: { unit: 'الوحدة الرابعة: السيرة النبوية المطهرة', chapter: 'غزوات ومعاهدات خالدة', topics: ['الدروس التربوية من غزوات النبي ﷺ وصلح الحديبية'] },
    19: { unit: 'الوحدة الرابعة: السيرة النبوية المطهرة', chapter: 'شخصيات إسلامية رائدة', topics: ['سير الصحابة الأجلاء ومواقفهم المشرقة في التضحية والوفاء'] },
    20: { unit: 'الوحدة الرابعة: السيرة النبوية المطهرة', chapter: 'المناقشة والتطبيقات', topics: ['حل أسئلة المناقشة للوحدة الرابعة وربط قيم السيرة بالحياة اليومية'] },
    21: { unit: 'الوحدة الخامسة: التهذيب والآداب الإسلامية', chapter: 'مكارم الأخلاق', topics: ['خلق الصدق، الأمانة، الحياء، وعفة اللسان'] },
    22: { unit: 'الوحدة الخامسة: التهذيب والآداب الإسلامية', chapter: 'الحقوق والواجبات', topics: ['بر الوالدين، حقوق الجار، وآداب معاملة الزملاء والمعلمين'] },
    23: { unit: 'الوحدة الخامسة: التهذيب والآداب الإسلامية', chapter: 'الآداب الاجتماعية', topics: ['النظافة والمحافظة على البيئة والممتلكات العامة والخاصة'] },
    24: { unit: 'الوحدة الخامسة: التهذيب والآداب الإسلامية', chapter: 'التقويم الشهري الثاني', topics: ['حل أسئلة التهذيب واختبار الشهر الأول للفصل الدراسي الثاني'] },
    25: { unit: 'الوحدة السادسة: الفقه والقضايا المعاصرة', chapter: 'العبادات وأحكامها', topics: ['أحكام الطهارة والصلاة وفقه المعاملات اليومية'] },
    26: { unit: 'الوحدة السادسة: الفقه والقضايا المعاصرة', chapter: 'حقوق الإنسان والتكافل', topics: ['مفهوم التكافل الاجتماعي وحرمة الدماء والأموال في الإسلام'] },
    27: { unit: 'الوحدة السادسة: الفقه والقضايا المعاصرة', chapter: 'التسامح ومكافحة الشائعات', topics: ['قيم التسامح والتعايش السلمي والتحذير من الغيبة ونشر الشائعات'] },
    28: { unit: 'الوحدة السادسة: الفقه والقضايا المعاصرة', chapter: 'حل المناقشات الشاملة', topics: ['حل أسئلة الوحدة السادسة واختبار الشهر الثاني للفصل الثاني'] },
    29: { unit: 'المراجعة الوزارية النهائية', chapter: 'مراجعة القرآن الكريم والتلاوة', topics: ['مراجعة شاملة ودقيقة لأحكام التلاوة ونصوص السور المقررة حفظاً وتفسيراً'] },
    30: { unit: 'المراجعة الوزارية النهائية', chapter: 'مراجعة الحديث والعقيدة', topics: ['مراجعة نصوص وشروح الأحاديث النبوية ومسائل العقيدة الإسلامية'] },
    31: { unit: 'المراجعة الوزارية النهائية', chapter: 'مراجعة السيرة والتهذيب', topics: ['مراجعة محاور السيرة النبوية والأخلاق ونماذج الأسئلة الوزارية الشاملة'] },
    32: { unit: 'امتحانات نهاية السنة', chapter: 'التقويم النهائي', topics: ['مراجعة نهائية وامتحانات نهاية السنة الدراسية'] },
  };

  return Array.from({ length: 32 }, (_, i) => {
    const week = i + 1;
    const semester: 1 | 2 = week <= semesterSplit ? 1 : 2;

    if (isIslamic && ISLAMIC_WEEK_TOPICS[week]) {
      const info = ISLAMIC_WEEK_TOPICS[week];
      return {
        week,
        weekNumber: week,
        semester,
        unit: info.unit,
        chapterTitle: info.chapter,
        topics: info.topics,
        periodsPerWeek,
      };
    }

    const unitIndex = Math.floor(i / 4) + 1;
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
