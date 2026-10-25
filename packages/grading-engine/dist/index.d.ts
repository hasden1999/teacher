/**
 * @techeeer/grading-engine
 * Pure JSON-scheme driven grading engine (Section 6 of PLAN.md).
 * Zero UI or database dependencies. No dynamic string eval.
 */
export type AbsentPolicy = 'incomplete' | 'zero';
export type ComponentRule = {
    type: 'counter';
    event: 'participation';
    target: number;
} | {
    type: 'deduction';
    event: 'behavior';
    start: number;
    perNegative: number;
} | {
    type: 'ratio';
    event: 'prep' | 'homework';
} | {
    type: 'attendance';
    method: 'proportional';
    excusedCountsAsPresent: boolean;
    lateCountsAsPresent: boolean;
};
export interface SchemeComponent {
    id: string;
    label: string;
    max: number;
    mode: 'derived' | 'manual';
    renamable?: boolean;
    rule?: ComponentRule;
}
export interface FormulaSpec {
    type: 'average' | 'weightedAverage' | 'sum';
    inputs: string[];
    weights?: number[];
    monthsPerTerm?: number;
}
export interface ScoreScheme {
    id: string;
    version: number;
    source: string | null;
    scale: number;
    passMark: number;
    absentPolicy: AbsentPolicy;
    rounding: {
        display: number;
        inputStep: number;
        roundToInteger?: boolean;
    };
    components: SchemeComponent[];
    month: FormulaSpec;
    term: FormulaSpec & {
        monthsPerTerm: number;
    };
    halfYearExam: {
        max: number;
        after: string;
    };
    annualSaee: FormulaSpec;
    finalExam: {
        max: number;
    };
    final: FormulaSpec;
}
export declare const IRAQ_DEFAULT_V1_SCHEME: ScoreScheme;
export type CellInput = number | 'absent' | null | undefined;
export interface MonthInput {
    /**
     * Either explicit components map (e.g. { activity: 18, behavior: 19, ... })
     * OR pre-summed componentsSum (out of 100) for convenience.
     */
    components?: Record<string, CellInput>;
    componentsSum?: CellInput;
    monthlyExam?: CellInput;
}
export interface StudentGradeInput {
    months?: Record<string, MonthInput>;
    halfYearExam?: CellInput;
    finalExam?: CellInput;
}
export type NodeStatus = 'complete' | 'incomplete' | 'absent';
export interface NodeEvaluation {
    nodeId: string;
    status: NodeStatus;
    rawValue: number | null;
    displayValue: number | null;
    missingFields: string[];
}
export interface EvaluationResult {
    status: 'complete' | 'incomplete';
    passStatus: 'pass' | 'fail' | 'incomplete';
    nodes: Record<string, NodeEvaluation>;
    missingFields: string[];
}
export interface ProjectionResult {
    isTemporary: true;
    badgeLabel: 'مؤقّت';
    nodes: Record<string, {
        value: number | null;
        displayValue: number | null;
    }>;
    projectedFinal: number | null;
    projectedAnnualSaee: number | null;
    passStatus: 'pass' | 'fail' | 'incomplete';
}
export interface SolveForResult {
    targetNode: 'finalExam';
    targetPassMark: number;
    annualSaee: number | null;
    requiredScore: number | null;
    displayRequiredScore: number | null;
    achievable: boolean;
    alreadyGuaranteed: boolean;
}
export interface ExplanationNode {
    nodeId: string;
    labelAr: string;
    formulaAr: string;
    status: NodeStatus;
    value: number | null;
    displayValue: number | null;
    inputs: Array<{
        id: string;
        labelAr: string;
        value: number | null;
        displayValue: number | null;
        status: NodeStatus;
    }>;
}
/**
 * Formats a full-precision number according to scheme rounding settings.
 */
export declare function formatDisplayScore(val: number | null, scheme: ScoreScheme): number | null;
/**
 * Quantizes a component score to the scheme's inputStep (e.g. 0.5).
 */
export declare function snapToInputStep(val: number, step?: number, max?: number): number;
/**
 * Scales an exam score from a custom maxMarks (e.g. 50) to the scheme scale (100).
 */
export declare function scaleExamScore(rawScore: number, maxMarks: number, targetScale?: number): number;
/**
 * Evaluates official grades for a student according to the JSON scheme (Section 6.2).
 * Missing values never silently become zero.
 */
export declare function evaluate(scheme: ScoreScheme, data: StudentGradeInput): EvaluationResult;
/**
 * Temporary projection using the average of whatever grades are currently entered (Section 6.2).
 * Always tagged with isTemporary: true and badgeLabel: 'مؤقّت'.
 */
export declare function project(scheme: ScoreScheme, data: StudentGradeInput): ProjectionResult;
/**
 * Calculates the required score in the Final Exam to reach targetValue (default scheme.passMark = 50).
 * For equal weights [1, 1]: requiredScore = 2 * target - annualSaee.
 */
export declare function solveFor(scheme: ScoreScheme, data: StudentGradeInput, targetNode?: 'finalExam', targetValue?: number): SolveForResult;
/**
 * Generates an Arabic explanation breakdown for any calculated grade node (Section 6.2).
 */
export declare function explain(scheme: ScoreScheme, data: StudentGradeInput, nodeId: string): ExplanationNode;
export interface DailyEventRecord {
    type: 'attendance' | 'participation' | 'homework' | 'prep' | 'behavior';
    value: 'present' | 'absent' | 'late' | 'excused' | 'done' | 'not_done' | 'positive' | 'negative' | number;
}
export interface DerivedComponentSuggestion {
    componentId: string;
    labelAr: string;
    rawSuggested: number;
    suggestedValue: number;
    explanationAr: string;
}
/**
 * Derives monthly component suggestions from append-only daily events (Section 6.3).
 */
export declare function deriveMonthlyComponents(scheme: ScoreScheme, events: DailyEventRecord[], recordedSessionsCount: number): Record<string, DerivedComponentSuggestion>;
//# sourceMappingURL=index.d.ts.map