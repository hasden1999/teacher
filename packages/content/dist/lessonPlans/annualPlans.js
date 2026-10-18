/**
 * @techeeer/content - Annual Lesson Plans & Verification Helpers
 * Supports 32-week distribution aligned with Iraqi MoE academic calendar.
 */
import { getChaptersBySubject } from '../curriculum/chapters.js';
import { normalizeSubjectFamily, getSubjectById } from '../curriculum/subjects.js';
export const IRAQI_ACADEMIC_MONTHS = {
    1: 'تشرين الأول (الأسبوع ١)',
    2: 'تشرين الأول (الأسبوع ٢)',
    3: 'تشرين الأول (الأسبوع ٣)',
    4: 'تشرين الأول (الأسبوع ٤)',
    5: 'تشرين الثاني (الأسبوع ١)',
    6: 'تشرين الثاني (الأسبوع ٢)',
    7: 'تشرين الثاني (الأسبوع ٣)',
    8: 'تشرين الثاني (الأسبوع ٤)',
    9: 'كانون الأول (الأسبوع ١)',
    10: 'كانون الأول (الأسبوع ٢)',
    11: 'كانون الأول (الأسبوع ٣)',
    12: 'كانون الأول (الأسبوع ٤)',
    13: 'كانون الثاني (الأسبوع ١)',
    14: 'كانون الثاني (الأسبوع ٢)',
    15: 'كانون الثاني (الأسبوع ٣)',
    16: 'كانون الثاني (نصف السنة)',
    17: 'شباط (الأسبوع ١ - الفصل الثاني)',
    18: 'شباط (الأسبوع ٢)',
    19: 'شباط (الأسبوع ٣)',
    20: 'شباط (الأسبوع ٤)',
    21: 'آذار (الأسبوع ١)',
    22: 'آذار (الأسبوع ٢)',
    23: 'آذار (الأسبوع ٣)',
    24: 'آذار (الأسبوع ٤)',
    25: 'نيسان (الأسبوع ١)',
    26: 'نيسان (الأسبوع ٢)',
    27: 'نيسان (الأسبوع ٣)',
    28: 'نيسان (الأسبوع ٤)',
    29: 'أيار (مراجعة وزارية ١)',
    30: 'أيار (مراجعة وزارية ٢)',
    31: 'أيار (مراجعة شاملة)',
    32: 'أيار (امتحانات نهاية السنة)',
};
/**
 * Validates lesson plan class duration within standard Iraqi period limits (35 to 50 minutes).
 */
export function validateLessonPlanDuration(durationMinutes) {
    return durationMinutes >= 35 && durationMinutes <= 50;
}
/**
 * Checks whether the given week index falls within the valid 32 teaching weeks (1 to 32).
 */
export function isValidAnnualWeek(week) {
    return week >= 1 && week <= 32;
}
/**
 * Generates an annual lesson plan distribution across 32 teaching weeks (8 academic months)
 * strictly grounded in the teacher's Iraqi curriculum chapters and topics.
 */
export function createAnnualPlan(subjectId, grade, options = {}) {
    const safeSubjectId = subjectId || 'science';
    const safeGrade = grade || 5;
    const semesterSplit = options.semesterSplit ?? 16;
    const subDef = getSubjectById(safeSubjectId);
    const periodsPerWeek = options.periodsPerWeek ?? subDef?.weeklyPeriods ?? 4;
    const family = normalizeSubjectFamily(safeSubjectId);
    const isIslamic = family === 'islamic';
    // Authentic Iraqi Islamic Education 32-Week Curriculum Syllabus Distribution
    const ISLAMIC_WEEK_TOPICS = {
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
    // Build syllabus sequence from official chapters for this subject
    const subjectChapters = getChaptersBySubject(safeSubjectId, safeGrade);
    const syllabusPool = [];
    for (const ch of subjectChapters) {
        for (const t of ch.topics) {
            syllabusPool.push({
                unit: `الوحدة ${ch.unitNumber}: ${ch.unitTitle}`,
                chapter: `الفصل ${ch.chapterNumber}: ${ch.chapterTitle}`,
                topic: t,
            });
        }
        syllabusPool.push({
            unit: `الوحدة ${ch.unitNumber}: ${ch.unitTitle}`,
            chapter: `الفصل ${ch.chapterNumber}: ${ch.chapterTitle}`,
            topic: `حل أسئلة ومناقشة وتمارين ${ch.chapterTitle} وتطبيقات تقويمية`,
        });
    }
    const subjectNameAr = subDef?.nameAr || subjectChapters[0]?.subjectNameAr || safeSubjectId;
    return Array.from({ length: 32 }, (_, i) => {
        const week = i + 1;
        const semester = week <= semesterSplit ? 1 : 2;
        const monthNameAr = IRAQI_ACADEMIC_MONTHS[week] || `الأسبوع ${week}`;
        const unitIndex = Math.floor(i / 4) + 1;
        const canonicalUnit = `الوحدة ${unitIndex}`;
        if (isIslamic && ISLAMIC_WEEK_TOPICS[week]) {
            const info = ISLAMIC_WEEK_TOPICS[week];
            return {
                week,
                weekNumber: week,
                semester,
                monthNameAr,
                unit: info.unit,
                chapterTitle: info.chapter,
                topics: info.topics,
                periodsPerWeek,
            };
        }
        if (week === 8) {
            return {
                week,
                weekNumber: week,
                semester,
                monthNameAr,
                unit: canonicalUnit,
                chapterTitle: 'مراجعة واختبار الشهر الأول للفصل الأول (تشرين الثاني)',
                topics: [`مراجعة مفردات الشهر الأول لمادة ${subjectNameAr} وإجراء امتحان الشهر الأول التحريري`],
                periodsPerWeek,
            };
        }
        if (week === 15) {
            return {
                week,
                weekNumber: week,
                semester,
                monthNameAr,
                unit: canonicalUnit,
                chapterTitle: 'مراجعة شاملة لمفردات الفصل الدراسي الأول (كانون الثاني)',
                topics: [`مراجعة مركزة وحل نماذج أسئلة امتحانية لمادة ${subjectNameAr}`],
                periodsPerWeek,
            };
        }
        if (week === 16) {
            return {
                week,
                weekNumber: week,
                semester,
                monthNameAr,
                unit: canonicalUnit,
                chapterTitle: 'امتحانات نصف السنة الدراسية والتقويم النصف سنوي',
                topics: ['مراجعة شاملة وامتحانات نصف السنة الدراسية والعطلة الربيعية'],
                periodsPerWeek,
            };
        }
        if (week === 24) {
            return {
                week,
                weekNumber: week,
                semester,
                monthNameAr,
                unit: canonicalUnit,
                chapterTitle: 'مراجعة واختبار الشهر الأول للفصل الثاني (آذار)',
                topics: [`حل تطبيقات شاملة وامتحان الشهر الأول للفصل الدراسي الثاني في ${subjectNameAr}`],
                periodsPerWeek,
            };
        }
        if (week >= 29 && week <= 31) {
            return {
                week,
                weekNumber: week,
                semester,
                monthNameAr,
                unit: canonicalUnit,
                chapterTitle: `مراجعة فصول ${subjectNameAr} وحل الأسئلة الوزارية (أيار)`,
                topics: [`مراجعة مركزة لفصول المنهج المقرر وحل نماذج الأسئلة الوزارية المعتمدة لمادة ${subjectNameAr}`],
                periodsPerWeek,
            };
        }
        if (week === 32) {
            return {
                week,
                weekNumber: week,
                semester,
                monthNameAr,
                unit: canonicalUnit,
                chapterTitle: 'امتحانات نهاية السنة الدراسية والتقويم النهائي العام',
                topics: ['مراجعة نهائية وامتحانات نهاية السنة الدراسية'],
                periodsPerWeek,
            };
        }
        if (syllabusPool.length > 0) {
            const poolItem = syllabusPool[i % syllabusPool.length];
            return {
                week,
                weekNumber: week,
                semester,
                monthNameAr,
                unit: canonicalUnit,
                chapterTitle: poolItem.chapter,
                topics: [poolItem.topic],
                periodsPerWeek,
            };
        }
        return {
            week,
            weekNumber: week,
            semester,
            monthNameAr,
            unit: `الوحدة ${unitIndex}`,
            chapterTitle: `الفصل التعليمي ${Math.floor(i / 2) + 1}`,
            topics: [`مفردات الأسبوع ${week} - مادة ${subjectNameAr} (الصف ${safeGrade})`],
            periodsPerWeek,
        };
    });
}
/**
 * Clones an existing lesson plan with unique ID, optional target division,
 * and automatic numbering append (e.g. "خطة درس: الذرة (2)") if cloned.
 */
export function cloneLessonPlan(original, targetDivision) {
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const newId = `${original.id}_clone_${uniqueSuffix}`;
    const safeTopic = original.topic || 'خطة درس يومية';
    let updatedTopic = safeTopic;
    const match = safeTopic.match(/\((\d+)\)$/);
    if (match) {
        const currentNum = parseInt(match[1], 10);
        updatedTopic = safeTopic.replace(/\(\d+\)$/, `(${currentNum + 1})`);
    }
    else {
        updatedTopic = `${safeTopic} (2)`;
    }
    return {
        ...original,
        id: newId,
        topic: updatedTopic,
        division: targetDivision ?? original.division ?? 'أ',
        objectives: Array.isArray(original.objectives) ? [...original.objectives] : [],
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
export function calculateLessonProgress(lessons) {
    const safeLessons = Array.isArray(lessons) ? lessons : [];
    const totalCount = safeLessons.length;
    if (totalCount === 0) {
        return { completedCount: 0, totalCount: 0, percentage: 0 };
    }
    const completedCount = safeLessons.filter((l) => l.status === 'completed').length;
    const percentage = Math.round((completedCount / totalCount) * 100);
    return { completedCount, totalCount, percentage };
}
/**
 * Filters curriculum items strictly matching the teacher's registered subject specialization and grade.
 * Safely handles subject aliases (e.g. 'mathematics' <-> 'math', 'islamic_education' <-> 'islamic').
 */
export function filterCurriculumForTeacher(teacher, items) {
    if (!Array.isArray(items) || items.length === 0)
        return [];
    if (!teacher || !teacher.subject)
        return items;
    const primaryFamily = normalizeSubjectFamily(teacher.subject);
    const allowedFamilies = [
        primaryFamily,
        ...(teacher.secondarySubjects || []).map((s) => normalizeSubjectFamily(s)),
    ];
    const allowedRaw = [
        teacher.subject.toLowerCase().trim(),
        ...(teacher.secondarySubjects || []).map((s) => (s || '').toLowerCase().trim()),
    ].filter(Boolean);
    const subjectMatched = items.filter((item) => {
        const rawItemSub = (item.subject || item.subjectId || '').toLowerCase().trim();
        if (!rawItemSub)
            return false;
        const itemFamily = normalizeSubjectFamily(rawItemSub);
        if (allowedFamilies.includes(itemFamily))
            return true;
        return allowedRaw.some((sub) => rawItemSub === sub || rawItemSub.includes(sub) || sub.includes(rawItemSub));
    });
    if (teacher.grade !== undefined) {
        const exactGradeMatches = subjectMatched.filter((item) => item.grade === undefined || item.grade === teacher.grade);
        if (exactGradeMatches.length > 0) {
            return exactGradeMatches;
        }
    }
    return subjectMatched;
}
//# sourceMappingURL=annualPlans.js.map