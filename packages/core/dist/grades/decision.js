import { GradeValidationError, validateGradeRange } from './errors.js';
/**
 * تطبيق درجات القرار الوزاري على المواد الدراسية بالطريقة الجشعة المثلى
 * يمنح الأولوية للمواد الأقرب للنجاح ويمنع هدر أي درجات لا تحقق النجاح (قاعدة منع الهدر).
 *
 * @param grades مصفوفة الدرجات الأصلية للمواد
 * @param decisionPool رصيد درجات القرار المتاح (الافتراضي 5)
 */
export function applyDecisionMarks(grades, decisionPool = 5) {
    if (typeof decisionPool !== 'number' || !Number.isFinite(decisionPool) || decisionPool < 0) {
        throw new GradeValidationError(`Decision pool must be a non-negative number, received: ${decisionPool}`);
    }
    for (const g of grades) {
        validateGradeRange(g.score, `Grade for subject ${g.subjectId}`);
    }
    const failingCandidates = grades
        .map((g, originalIndex) => ({
        subjectId: g.subjectId,
        score: g.score,
        needed: 50 - g.score,
        originalIndex
    }))
        .filter(item => item.score < 50)
        .sort((a, b) => {
        if (a.needed !== b.needed) {
            return a.needed - b.needed;
        }
        return a.originalIndex - b.originalIndex;
    });
    let remaining = Math.floor(decisionPool);
    const adjustedMap = new Map(grades.map(g => [g.subjectId, g.score]));
    const benefited = [];
    for (const candidate of failingCandidates) {
        if (candidate.needed <= remaining) {
            adjustedMap.set(candidate.subjectId, 50);
            remaining -= candidate.needed;
            benefited.push(candidate.subjectId);
        }
    }
    const adjustedGrades = grades.map(g => ({
        subjectId: g.subjectId,
        score: adjustedMap.get(g.subjectId)
    }));
    const used = Math.floor(decisionPool) - remaining;
    return {
        adjustedGrades,
        usedMarks: used,
        remainingMarks: remaining,
        benefitedSubjectIds: benefited,
        statusChanged: benefited.length > 0
    };
}
//# sourceMappingURL=decision.js.map