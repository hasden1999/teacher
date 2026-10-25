/**
 * @techeeer/grading-engine
 * Pure JSON-scheme driven grading engine (Section 6 of PLAN.md).
 * Zero UI or database dependencies. No dynamic string eval.
 */
export const IRAQ_DEFAULT_V1_SCHEME = {
    id: 'iraq-default-v1',
    version: 1,
    source: null,
    scale: 100,
    passMark: 50,
    absentPolicy: 'incomplete',
    rounding: { display: 2, inputStep: 0.5, roundToInteger: false },
    components: [
        {
            id: 'activity',
            label: 'النشاط',
            max: 20,
            mode: 'derived',
            rule: { type: 'counter', event: 'participation', target: 10 },
        },
        {
            id: 'behavior',
            label: 'السلوك',
            max: 20,
            mode: 'derived',
            rule: { type: 'deduction', event: 'behavior', start: 20, perNegative: 1 },
        },
        {
            id: 'prep',
            label: 'التحضير اليومي',
            max: 20,
            mode: 'derived',
            rule: { type: 'ratio', event: 'prep' },
        },
        {
            id: 'attendance',
            label: 'الحضور',
            max: 20,
            mode: 'derived',
            rule: {
                type: 'attendance',
                method: 'proportional',
                excusedCountsAsPresent: true,
                lateCountsAsPresent: true,
            },
        },
        {
            id: 'custom1',
            label: 'يسمّيه المعلم',
            max: 20,
            mode: 'manual',
            renamable: true,
        },
    ],
    month: {
        type: 'weightedAverage',
        inputs: ['$componentsSum', '$monthlyExam'],
        weights: [1, 1],
    },
    term: {
        monthsPerTerm: 2,
        type: 'average',
        inputs: ['$months'],
    },
    halfYearExam: { max: 100, after: 'term1' },
    annualSaee: {
        type: 'average',
        inputs: ['$halfYearExam', '$term1', '$term2'],
    },
    finalExam: { max: 100 },
    final: {
        type: 'weightedAverage',
        inputs: ['$annualSaee', '$finalExam'],
        weights: [1, 1],
    },
};
/**
 * Formats a full-precision number according to scheme rounding settings.
 */
export function formatDisplayScore(val, scheme) {
    if (val === null || !Number.isFinite(val))
        return null;
    if (scheme.rounding.roundToInteger) {
        return Math.floor(val + 0.5 + Number.EPSILON);
    }
    const factor = Math.pow(10, scheme.rounding.display);
    return Math.round((val + Number.EPSILON) * factor) / factor;
}
/**
 * Quantizes a component score to the scheme's inputStep (e.g. 0.5).
 */
export function snapToInputStep(val, step = 0.5, max = 20) {
    const clamped = Math.max(0, Math.min(max, val));
    const steps = Math.floor(clamped / step + 0.5 + Number.EPSILON);
    return Number((steps * step).toFixed(4));
}
/**
 * Scales an exam score from a custom maxMarks (e.g. 50) to the scheme scale (100).
 */
export function scaleExamScore(rawScore, maxMarks, targetScale = 100) {
    if (maxMarks <= 0)
        throw new Error('maxMarks must be positive');
    return (rawScore / maxMarks) * targetScale;
}
function resolveCellValue(input, fieldKey, absentPolicy) {
    if (input === null || input === undefined) {
        return { status: 'incomplete', value: null, missing: [fieldKey] };
    }
    if (input === 'absent') {
        if (absentPolicy === 'zero') {
            return { status: 'complete', value: 0, missing: [] };
        }
        return { status: 'absent', value: null, missing: [fieldKey] };
    }
    if (typeof input !== 'number' || !Number.isFinite(input)) {
        return { status: 'incomplete', value: null, missing: [fieldKey] };
    }
    return { status: 'complete', value: input, missing: [] };
}
function applyFormula(spec, values) {
    if (spec.type === 'sum') {
        return values.reduce((acc, v) => acc + v, 0);
    }
    if (spec.type === 'weightedAverage') {
        const weights = spec.weights && spec.weights.length === values.length
            ? spec.weights
            : values.map(() => 1);
        const totalWeight = weights.reduce((acc, w) => acc + w, 0);
        const weightedSum = values.reduce((acc, v, i) => acc + v * weights[i], 0);
        return weightedSum / totalWeight;
    }
    // default 'average'
    return values.reduce((acc, v) => acc + v, 0) / values.length;
}
/**
 * Evaluates official grades for a student according to the JSON scheme (Section 6.2).
 * Missing values never silently become zero.
 */
export function evaluate(scheme, data) {
    const nodes = {};
    const mPerTerm = scheme.term.monthsPerTerm || 2;
    const totalMonths = mPerTerm * 2;
    const monthsData = data.months ?? {};
    // 1. Evaluate each month (m1 .. m_{2*monthsPerTerm})
    for (let m = 1; m <= totalMonths; m++) {
        const mKey = `m${m}`;
        const mInput = monthsData[mKey] ?? {};
        let compSumVal = null;
        const compMissing = [];
        if (mInput.componentsSum !== undefined && mInput.componentsSum !== null) {
            const resolved = resolveCellValue(mInput.componentsSum, `${mKey}.componentsSum`, scheme.absentPolicy);
            compSumVal = resolved.value;
            compMissing.push(...resolved.missing);
        }
        else {
            let sum = 0;
            for (const comp of scheme.components) {
                const rawComp = mInput.components?.[comp.id];
                const resolved = resolveCellValue(rawComp, `${mKey}.components.${comp.id}`, scheme.absentPolicy);
                if (resolved.value === null) {
                    compMissing.push(...resolved.missing);
                }
                else {
                    sum += resolved.value;
                }
            }
            if (compMissing.length === 0) {
                compSumVal = sum;
            }
        }
        nodes[`${mKey}_componentsSum`] = {
            nodeId: `${mKey}_componentsSum`,
            status: compMissing.length === 0 ? 'complete' : 'incomplete',
            rawValue: compSumVal,
            displayValue: formatDisplayScore(compSumVal, scheme),
            missingFields: compMissing,
        };
        const examResolved = resolveCellValue(mInput.monthlyExam, `${mKey}.monthlyExam`, scheme.absentPolicy);
        nodes[`${mKey}_exam`] = {
            nodeId: `${mKey}_exam`,
            status: examResolved.status,
            rawValue: examResolved.value,
            displayValue: formatDisplayScore(examResolved.value, scheme),
            missingFields: examResolved.missing,
        };
        const monthMissing = [...compMissing, ...examResolved.missing];
        if (monthMissing.length === 0 && compSumVal !== null && examResolved.value !== null) {
            const mRaw = applyFormula(scheme.month, [compSumVal, examResolved.value]);
            nodes[mKey] = {
                nodeId: mKey,
                status: 'complete',
                rawValue: mRaw,
                displayValue: formatDisplayScore(mRaw, scheme),
                missingFields: [],
            };
        }
        else {
            nodes[mKey] = {
                nodeId: mKey,
                status: examResolved.status === 'absent' && compMissing.length === 0 ? 'absent' : 'incomplete',
                rawValue: null,
                displayValue: null,
                missingFields: monthMissing,
            };
        }
    }
    // 2. Evaluate Term 1 & Term 2
    for (let t = 1; t <= 2; t++) {
        const tKey = `term${t}`;
        const startM = (t - 1) * mPerTerm + 1;
        const endM = t * mPerTerm;
        const mValues = [];
        const tMissing = [];
        for (let m = startM; m <= endM; m++) {
            const mNode = nodes[`m${m}`];
            if (mNode.rawValue !== null) {
                mValues.push(mNode.rawValue);
            }
            else {
                tMissing.push(...mNode.missingFields);
            }
        }
        if (tMissing.length === 0 && mValues.length === mPerTerm) {
            const tRaw = applyFormula(scheme.term, mValues);
            nodes[tKey] = {
                nodeId: tKey,
                status: 'complete',
                rawValue: tRaw,
                displayValue: formatDisplayScore(tRaw, scheme),
                missingFields: [],
            };
        }
        else {
            nodes[tKey] = {
                nodeId: tKey,
                status: 'incomplete',
                rawValue: null,
                displayValue: null,
                missingFields: tMissing,
            };
        }
    }
    // 3. Half-Year Exam
    const hyResolved = resolveCellValue(data.halfYearExam, 'halfYearExam', scheme.absentPolicy);
    nodes.halfYearExam = {
        nodeId: 'halfYearExam',
        status: hyResolved.status,
        rawValue: hyResolved.value,
        displayValue: formatDisplayScore(hyResolved.value, scheme),
        missingFields: hyResolved.missing,
    };
    // 4. Annual Saee (السعي السنوي)
    const saeeMissing = [
        ...nodes.halfYearExam.missingFields,
        ...nodes.term1.missingFields,
        ...nodes.term2.missingFields,
    ];
    if (saeeMissing.length === 0 &&
        nodes.halfYearExam.rawValue !== null &&
        nodes.term1.rawValue !== null &&
        nodes.term2.rawValue !== null) {
        const saeeRaw = applyFormula(scheme.annualSaee, [
            nodes.halfYearExam.rawValue,
            nodes.term1.rawValue,
            nodes.term2.rawValue,
        ]);
        nodes.annualSaee = {
            nodeId: 'annualSaee',
            status: 'complete',
            rawValue: saeeRaw,
            displayValue: formatDisplayScore(saeeRaw, scheme),
            missingFields: [],
        };
    }
    else {
        nodes.annualSaee = {
            nodeId: 'annualSaee',
            status: 'incomplete',
            rawValue: null,
            displayValue: null,
            missingFields: saeeMissing,
        };
    }
    // 5. Final Exam & Final Grade
    const finalExamResolved = resolveCellValue(data.finalExam, 'finalExam', scheme.absentPolicy);
    nodes.finalExam = {
        nodeId: 'finalExam',
        status: finalExamResolved.status,
        rawValue: finalExamResolved.value,
        displayValue: formatDisplayScore(finalExamResolved.value, scheme),
        missingFields: finalExamResolved.missing,
    };
    const finalMissing = [...nodes.annualSaee.missingFields, ...nodes.finalExam.missingFields];
    if (finalMissing.length === 0 &&
        nodes.annualSaee.rawValue !== null &&
        nodes.finalExam.rawValue !== null) {
        const finalRaw = applyFormula(scheme.final, [
            nodes.annualSaee.rawValue,
            nodes.finalExam.rawValue,
        ]);
        const finalDisplay = formatDisplayScore(finalRaw, scheme);
        nodes.final = {
            nodeId: 'final',
            status: 'complete',
            rawValue: finalRaw,
            displayValue: finalDisplay,
            missingFields: [],
        };
        const effectiveCompare = finalDisplay ?? finalRaw;
        return {
            status: 'complete',
            passStatus: effectiveCompare >= scheme.passMark ? 'pass' : 'fail',
            nodes,
            missingFields: [],
        };
    }
    nodes.final = {
        nodeId: 'final',
        status: finalExamResolved.status === 'absent' && nodes.annualSaee.rawValue !== null ? 'absent' : 'incomplete',
        rawValue: null,
        displayValue: null,
        missingFields: finalMissing,
    };
    return {
        status: 'incomplete',
        passStatus: 'incomplete',
        nodes,
        missingFields: finalMissing,
    };
}
/**
 * Temporary projection using the average of whatever grades are currently entered (Section 6.2).
 * Always tagged with isTemporary: true and badgeLabel: 'مؤقّت'.
 */
export function project(scheme, data) {
    const official = evaluate(scheme, data);
    const mPerTerm = scheme.term.monthsPerTerm || 2;
    const totalMonths = mPerTerm * 2;
    const projectedNodes = {};
    for (let m = 1; m <= totalMonths; m++) {
        const mKey = `m${m}`;
        const compVal = official.nodes[`${mKey}_componentsSum`]?.rawValue;
        const examVal = official.nodes[`${mKey}_exam`]?.rawValue;
        const available = [compVal, examVal].filter((v) => v !== null && v !== undefined);
        const val = available.length > 0 ? available.reduce((a, b) => a + b, 0) / available.length : null;
        projectedNodes[mKey] = { value: val, displayValue: formatDisplayScore(val, scheme) };
    }
    for (let t = 1; t <= 2; t++) {
        const tKey = `term${t}`;
        const startM = (t - 1) * mPerTerm + 1;
        const endM = t * mPerTerm;
        const avail = [];
        for (let m = startM; m <= endM; m++) {
            const mv = projectedNodes[`m${m}`]?.value;
            if (mv !== null && mv !== undefined)
                avail.push(mv);
        }
        const val = avail.length > 0 ? avail.reduce((a, b) => a + b, 0) / avail.length : null;
        projectedNodes[tKey] = { value: val, displayValue: formatDisplayScore(val, scheme) };
    }
    const hyVal = official.nodes.halfYearExam?.rawValue ?? null;
    const saeeInputs = [
        hyVal,
        projectedNodes.term1?.value ?? null,
        projectedNodes.term2?.value ?? null,
    ].filter((v) => v !== null);
    const projSaee = saeeInputs.length > 0 ? saeeInputs.reduce((a, b) => a + b, 0) / saeeInputs.length : null;
    projectedNodes.annualSaee = {
        value: projSaee,
        displayValue: formatDisplayScore(projSaee, scheme),
    };
    const finalExamVal = official.nodes.finalExam?.rawValue ?? null;
    const finalInputs = [projSaee, finalExamVal].filter((v) => v !== null);
    const projFinal = finalInputs.length > 0 ? finalInputs.reduce((a, b) => a + b, 0) / finalInputs.length : null;
    projectedNodes.final = {
        value: projFinal,
        displayValue: formatDisplayScore(projFinal, scheme),
    };
    const dispFinal = formatDisplayScore(projFinal, scheme);
    return {
        isTemporary: true,
        badgeLabel: 'مؤقّت',
        nodes: projectedNodes,
        projectedAnnualSaee: dispFinal !== null ? formatDisplayScore(projSaee, scheme) : null,
        projectedFinal: dispFinal,
        passStatus: dispFinal === null ? 'incomplete' : dispFinal >= scheme.passMark ? 'pass' : 'fail',
    };
}
/**
 * Calculates the required score in the Final Exam to reach targetValue (default scheme.passMark = 50).
 * For equal weights [1, 1]: requiredScore = 2 * target - annualSaee.
 */
export function solveFor(scheme, data, targetNode = 'finalExam', targetValue = scheme.passMark) {
    const official = evaluate(scheme, data);
    const saeeRaw = official.nodes.annualSaee?.rawValue ?? null;
    const saeeDisplay = official.nodes.annualSaee?.displayValue ?? null;
    if (saeeRaw === null || saeeDisplay === null) {
        return {
            targetNode,
            targetPassMark: targetValue,
            annualSaee: null,
            requiredScore: null,
            displayRequiredScore: null,
            achievable: false,
            alreadyGuaranteed: false,
        };
    }
    const weights = scheme.final.weights ?? [1, 1];
    const wSaee = weights[0] ?? 1;
    const wFinal = weights[1] ?? 1;
    const totalWeight = wSaee + wFinal;
    // Use the displayed annualSaee so that teacher-facing math (e.g. 100 - 78.33 = 21.67) matches Section 6.4
    const rawRequired = (targetValue * totalWeight - saeeDisplay * wSaee) / wFinal;
    const clampedRequired = Math.max(0, rawRequired);
    const displayRequired = formatDisplayScore(clampedRequired, scheme);
    return {
        targetNode,
        targetPassMark: targetValue,
        annualSaee: saeeDisplay,
        requiredScore: clampedRequired,
        displayRequiredScore: displayRequired,
        achievable: rawRequired <= scheme.finalExam.max,
        alreadyGuaranteed: rawRequired <= 0,
    };
}
const NODE_META_AR = {
    m1: {
        label: 'درجة الشهر الأول',
        formula: '(مجموع المكوّنات + الامتحان الشهري) ÷ 2',
        childIds: ['m1_componentsSum', 'm1_exam'],
    },
    m2: {
        label: 'درجة الشهر الثاني',
        formula: '(مجموع المكوّنات + الامتحان الشهري) ÷ 2',
        childIds: ['m2_componentsSum', 'm2_exam'],
    },
    term1: {
        label: 'سعي الفصل الأول',
        formula: '(درجة الشهر الأول + درجة الشهر الثاني) ÷ 2',
        childIds: ['m1', 'm2'],
    },
    m3: {
        label: 'درجة الشهر الثالث',
        formula: '(مجموع المكوّنات + الامتحان الشهري) ÷ 2',
        childIds: ['m3_componentsSum', 'm3_exam'],
    },
    m4: {
        label: 'درجة الشهر الرابع',
        formula: '(مجموع المكوّنات + الامتحان الشهري) ÷ 2',
        childIds: ['m4_componentsSum', 'm4_exam'],
    },
    term2: {
        label: 'سعي الفصل الثاني',
        formula: '(درجة الشهر الثالث + درجة الشهر الرابع) ÷ 2',
        childIds: ['m3', 'm4'],
    },
    annualSaee: {
        label: 'السعي السنوي',
        formula: '(نتيجة نصف السنة + سعي الفصل الأول + سعي الفصل الثاني) ÷ 3',
        childIds: ['halfYearExam', 'term1', 'term2'],
    },
    final: {
        label: 'الدرجة النهائية',
        formula: '(السعي السنوي + امتحان نهاية السنة) ÷ 2',
        childIds: ['annualSaee', 'finalExam'],
    },
};
const LEAF_LABELS_AR = {
    m1_componentsSum: 'مجموع مكوّنات الشهر الأول',
    m1_exam: 'امتحان الشهر الأول',
    m2_componentsSum: 'مجموع مكوّنات الشهر الثاني',
    m2_exam: 'امتحان الشهر الثاني',
    m3_componentsSum: 'مجموع مكوّنات الشهر الثالث',
    m3_exam: 'امتحان الشهر الثالث',
    m4_componentsSum: 'مجموع مكوّنات الشهر الرابع',
    m4_exam: 'امتحان الشهر الرابع',
    halfYearExam: 'نتيجة نصف السنة',
    finalExam: 'امتحان نهاية السنة',
};
/**
 * Generates an Arabic explanation breakdown for any calculated grade node (Section 6.2).
 */
export function explain(scheme, data, nodeId) {
    const official = evaluate(scheme, data);
    const target = official.nodes[nodeId];
    const meta = NODE_META_AR[nodeId];
    if (!target) {
        return {
            nodeId,
            labelAr: nodeId,
            formulaAr: 'حقل إدخال مباشر',
            status: 'incomplete',
            value: null,
            displayValue: null,
            inputs: [],
        };
    }
    const inputs = (meta?.childIds ?? []).map((cid) => {
        const childNode = official.nodes[cid];
        return {
            id: cid,
            labelAr: NODE_META_AR[cid]?.label ?? LEAF_LABELS_AR[cid] ?? cid,
            value: childNode?.rawValue ?? null,
            displayValue: childNode?.displayValue ?? null,
            status: childNode?.status ?? 'incomplete',
        };
    });
    return {
        nodeId,
        labelAr: meta?.label ?? LEAF_LABELS_AR[nodeId] ?? nodeId,
        formulaAr: meta?.formula ?? 'قيمة مدخلة',
        status: target.status,
        value: target.rawValue,
        displayValue: target.displayValue,
        inputs,
    };
}
/**
 * Derives monthly component suggestions from append-only daily events (Section 6.3).
 */
export function deriveMonthlyComponents(scheme, events, recordedSessionsCount) {
    const result = {};
    const step = scheme.rounding.inputStep || 0.5;
    for (const comp of scheme.components) {
        if (comp.mode !== 'derived' || !comp.rule)
            continue;
        const rule = comp.rule;
        if (rule.type === 'attendance') {
            const absences = events.filter((e) => e.type === 'attendance' &&
                (e.value === 'absent' ||
                    (!rule.excusedCountsAsPresent && e.value === 'excused') ||
                    (!rule.lateCountsAsPresent && e.value === 'late'))).length;
            const presentSessions = Math.max(0, recordedSessionsCount - absences);
            const raw = recordedSessionsCount > 0 ? (comp.max * presentSessions) / recordedSessionsCount : comp.max;
            const snapped = snapToInputStep(raw, step, comp.max);
            result[comp.id] = {
                componentId: comp.id,
                labelAr: comp.label,
                rawSuggested: Number(raw.toFixed(4)),
                suggestedValue: snapped,
                explanationAr: `${recordedSessionsCount} حصة مسجّلة، ${absences} غياب ← ${snapped} من ${comp.max}`,
            };
        }
        else if (rule.type === 'counter') {
            const count = events
                .filter((e) => e.type === rule.event)
                .reduce((acc, e) => acc + (typeof e.value === 'number' ? e.value : 1), 0);
            const raw = Math.min(comp.max, (comp.max * count) / rule.target);
            const snapped = snapToInputStep(raw, step, comp.max);
            result[comp.id] = {
                componentId: comp.id,
                labelAr: comp.label,
                rawSuggested: Number(raw.toFixed(4)),
                suggestedValue: snapped,
                explanationAr: `${count} مشاركات من هدف ${rule.target} ← ${snapped} من ${comp.max}`,
            };
        }
        else if (rule.type === 'deduction') {
            const negCount = events.filter((e) => e.type === rule.event && (e.value === 'negative' || (typeof e.value === 'number' && e.value < 0))).length;
            const raw = Math.max(0, rule.start - negCount * rule.perNegative);
            const snapped = snapToInputStep(raw, step, comp.max);
            result[comp.id] = {
                componentId: comp.id,
                labelAr: comp.label,
                rawSuggested: Number(raw.toFixed(4)),
                suggestedValue: snapped,
                explanationAr: `${rule.start} − (${negCount} ملاحظات سلبية × ${rule.perNegative}) ← ${snapped}`,
            };
        }
        else if (rule.type === 'ratio') {
            const relevant = events.filter((e) => e.type === rule.event);
            const totalReq = relevant.length;
            const doneCount = relevant.filter((e) => e.value === 'done' || e.value === 1).length;
            const raw = totalReq > 0 ? (comp.max * doneCount) / totalReq : comp.max;
            const snapped = snapToInputStep(raw, step, comp.max);
            result[comp.id] = {
                componentId: comp.id,
                labelAr: comp.label,
                rawSuggested: Number(raw.toFixed(4)),
                suggestedValue: snapped,
                explanationAr: `المنجز ${doneCount} من ${totalReq} ← ${snapped} من ${comp.max}`,
            };
        }
    }
    return result;
}
//# sourceMappingURL=index.js.map