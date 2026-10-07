import { GradeValidationError } from './errors.js';
/**
 * ترتيب الأولوية التربوية والامتحانية المعتمد في العراق
 */
export const COMPONENT_PRIORITY = [
    'written',
    'oral',
    'participation',
    'homework',
    'behavior'
];
/**
 * حساب مجموع المكونات التفصيلية مع التحقق الصارم من الحدود
 */
export function calculateDetailedTotal(components) {
    if (!components || typeof components !== 'object') {
        throw new GradeValidationError('Grade components object must be provided');
    }
    let total = 0;
    for (const key of COMPONENT_PRIORITY) {
        const val = components[key];
        if (typeof val !== 'number' || !Number.isFinite(val)) {
            throw new GradeValidationError(`Component ${key} must be a finite number, received: ${val}`);
        }
        if (val < 0 || val > 20) {
            throw new GradeValidationError(`Component ${key} must be between 0 and 20, received: ${val}`);
        }
        total += val;
    }
    return total;
}
/**
 * تجزئة درجة مبسطة إلى 5 مكونات تفصيلية عادلة تماماً
 * يضمن: المجموع = score، وكل مكون صحيح بين [0, 20]
 */
export function decomposeSimplifiedScore(score) {
    if (typeof score !== 'number' || !Number.isFinite(score)) {
        throw new GradeValidationError(`Score must be a finite number, received: ${score}`);
    }
    const rounded = Math.round(score);
    if (rounded < 0 || rounded > 100) {
        throw new GradeValidationError(`Simplified score must be between 0 and 100, received: ${rounded}`);
    }
    const base = Math.floor(rounded / 5);
    const remainder = rounded % 5;
    const result = {
        oral: base,
        written: base,
        homework: base,
        behavior: base,
        participation: base
    };
    for (let i = 0; i < remainder; i++) {
        const key = COMPONENT_PRIORITY[i];
        result[key] += 1;
    }
    return result;
}
/**
 * إعادة موازنة المكونات التفصيلية لمطابقة المجموع الجديد بدون فقدان أو انحراف
 */
export function rebalanceComponentsToTotal(current, newTotal) {
    const currentTotal = calculateDetailedTotal(current);
    if (typeof newTotal !== 'number' || !Number.isFinite(newTotal)) {
        throw new GradeValidationError(`New total must be a finite number, received: ${newTotal}`);
    }
    const target = Math.round(newTotal);
    if (target < 0 || target > 100) {
        throw new GradeValidationError(`New total must be between 0 and 100, received: ${target}`);
    }
    // 1. التطابق التام: انعدام التغيير يعني الاحتفاظ الكامل بالقيم الأصلية (Lossless Identity)
    if (currentTotal === target) {
        return { ...current };
    }
    // 2. إذا كانت القيمة الحالية 0: التوزيع من جديد
    if (currentTotal === 0) {
        return decomposeSimplifiedScore(target);
    }
    // 3. إذا كان الهدف 0 أو 100: حالات قصوى صريحة
    if (target === 0) {
        return { oral: 0, written: 0, homework: 0, behavior: 0, participation: 0 };
    }
    if (target === 100) {
        return { oral: 20, written: 20, homework: 20, behavior: 20, participation: 20 };
    }
    let delta = target - currentTotal;
    const updated = { ...current };
    if (delta > 0) {
        // زيادة الدرجة: توزيع نسبي للفارق الموجب
        while (delta > 0) {
            const eligible = COMPONENT_PRIORITY.filter(k => updated[k] < 20);
            /* v8 ignore start */
            if (eligible.length === 0)
                break;
            /* v8 ignore stop */
            const sumWeights = eligible.reduce((acc, k) => acc + (updated[k] > 0 ? updated[k] : 1), 0);
            let allocatedThisRound = 0;
            const shares = [];
            for (const key of eligible) {
                const weight = updated[key] > 0 ? updated[key] : 1;
                const cap = 20 - updated[key];
                const rawShare = Math.min(cap, (delta * weight) / sumWeights);
                const intShare = Math.floor(rawShare);
                shares.push({ key, share: intShare, frac: rawShare - intShare });
                updated[key] += intShare;
                allocatedThisRound += intShare;
            }
            delta -= allocatedThisRound;
            if (delta > 0 && allocatedThisRound > 0) {
                shares.sort((a, b) => {
                    if (Math.abs(b.frac - a.frac) > 0.0001)
                        return b.frac - a.frac;
                    return COMPONENT_PRIORITY.indexOf(a.key) - COMPONENT_PRIORITY.indexOf(b.key);
                });
                for (const item of shares) {
                    if (delta > 0 && updated[item.key] < 20) {
                        updated[item.key] += 1;
                        delta -= 1;
                    }
                }
            }
            if (allocatedThisRound === 0 && delta > 0) {
                for (const key of COMPONENT_PRIORITY) {
                    if (delta > 0 && updated[key] < 20) {
                        updated[key] += 1;
                        delta -= 1;
                    }
                }
            }
        }
    }
    else {
        // إنقاص الدرجة: توزيع نسبي للفارق السالب
        let toDeduct = Math.abs(delta);
        while (toDeduct > 0) {
            const eligible = COMPONENT_PRIORITY.filter(k => updated[k] > 0);
            /* v8 ignore start */
            if (eligible.length === 0)
                break;
            /* v8 ignore stop */
            const sumWeights = eligible.reduce((acc, k) => acc + updated[k], 0);
            let deductedThisRound = 0;
            const shares = [];
            for (const key of eligible) {
                const rawShare = Math.min(updated[key], (toDeduct * updated[key]) / sumWeights);
                const intShare = Math.floor(rawShare);
                shares.push({ key, share: intShare, frac: rawShare - intShare });
                updated[key] -= intShare;
                deductedThisRound += intShare;
            }
            toDeduct -= deductedThisRound;
            if (toDeduct > 0 && deductedThisRound > 0) {
                const reversePriority = [...COMPONENT_PRIORITY].reverse();
                shares.sort((a, b) => {
                    if (Math.abs(b.frac - a.frac) > 0.0001)
                        return b.frac - a.frac;
                    return reversePriority.indexOf(a.key) - reversePriority.indexOf(b.key);
                });
                for (const item of shares) {
                    if (toDeduct > 0 && updated[item.key] > 0) {
                        updated[item.key] -= 1;
                        toDeduct -= 1;
                    }
                }
            }
            if (deductedThisRound === 0 && toDeduct > 0) {
                const reversePriority = [...COMPONENT_PRIORITY].reverse();
                for (const key of reversePriority) {
                    if (toDeduct > 0 && updated[key] > 0) {
                        updated[key] -= 1;
                        toDeduct -= 1;
                    }
                }
            }
        }
    }
    // تأكيد نهائي على صفرية الانحراف
    const finalSum = calculateDetailedTotal(updated);
    /* v8 ignore start */
    if (finalSum !== target) {
        throw new Error(`Sanity failure: resulting sum (${finalSum}) does not match target (${target})`);
    }
    /* v8 ignore stop */
    return updated;
}
//# sourceMappingURL=conversion.js.map