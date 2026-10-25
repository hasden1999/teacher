/**
 * @techeeer/contracts/ai
 * Section 11 & 11.8: AI Gateway Configuration, Quotas, Pricing, and the 12 Structured Output Schemas.
 */
export const DEFAULT_AI_PRICING_TABLE = [
    {
        effectiveFrom: '2026-01-01',
        effectiveTo: '2026-12-31',
        inputUsdPerMillionTokens: 0.75,
        outputUsdPerMillionTokens: 3.75,
        batchDiscountFactor: 0.5,
    },
    {
        effectiveFrom: '2027-01-01',
        effectiveTo: null,
        inputUsdPerMillionTokens: 1.5,
        outputUsdPerMillionTokens: 7.5,
        batchDiscountFactor: 0.5,
    },
];
/**
 * Section 11.3: Default monthly cost cap ($0.50 at 2027 prices) and per-feature safety count guardrails.
 */
export const DEFAULT_MONTHLY_AI_QUOTA = {
    monthlyCostCapMicroUsd: 500_000, // $0.50 = 500,000 micro-USD
    featureCountCaps: {
        student_list_ocr: 6,
        voice_grades_segments: 30,
        voice_grades_named: 30,
        handwriting_layout: 20,
        equation_detail: 20,
        register_import: 4,
        natural_to_latex: 100,
        question_generator: 10,
        answer_key: 10,
        proofread: 20,
        lesson_plan: 15,
        curriculum_toc: 10,
    },
};
/**
 * Validates that a thinking level is supported by gemini-3.8-flash ('minimal' throws an error per Section 3.a #1).
 */
export function assertValidThinkingLevel(level) {
    if (level !== 'low' && level !== 'medium' && level !== 'high') {
        throw new Error(`Invalid thinkingLevel "${level}". Only "low", "medium", and "high" are permitted ("minimal" is forbidden).`);
    }
}
/**
 * Rescales normalized Gemini box_2d [ymin, xmin, ymax, xmax] (0..1000) to original pixel coordinates.
 */
export function rescaleBox2dToPixels(box2d, imageWidth, imageHeight) {
    const [ymin, xmin, ymax, xmax] = box2d;
    const x = Math.round((xmin / 1000) * imageWidth);
    const y = Math.round((ymin / 1000) * imageHeight);
    const width = Math.max(1, Math.round(((xmax - xmin) / 1000) * imageWidth));
    const height = Math.max(1, Math.round(((ymax - ymin) / 1000) * imageHeight));
    return { x, y, width, height };
}
//# sourceMappingURL=ai.js.map