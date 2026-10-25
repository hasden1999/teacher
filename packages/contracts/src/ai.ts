/**
 * @techeeer/contracts/ai
 * Section 11 & 11.8: AI Gateway Configuration, Quotas, Pricing, and the 12 Structured Output Schemas.
 */

export type ThinkingLevel = 'low' | 'medium' | 'high';

export type AiFeatureName =
  | 'student_list_ocr'
  | 'voice_grades_segments'
  | 'voice_grades_named'
  | 'handwriting_layout'
  | 'equation_detail'
  | 'register_import'
  | 'natural_to_latex'
  | 'question_generator'
  | 'answer_key'
  | 'proofread'
  | 'lesson_plan'
  | 'curriculum_toc';

export type AiJobStatus =
  | 'queued_local'
  | 'uploading'
  | 'queued'
  | 'processing'
  | 'ready'
  | 'failed'
  | 'cancelled'
  | 'reviewed';

export type ReviewRowColor = 'green' | 'yellow' | 'red';

export interface AiPricingTier {
  effectiveFrom: string; // ISO date e.g. '2026-01-01' or '2027-01-01'
  effectiveTo: string | null;
  inputUsdPerMillionTokens: number;
  outputUsdPerMillionTokens: number; // includes thinking tokens
  batchDiscountFactor: number; // 0.5
}

export const DEFAULT_AI_PRICING_TABLE: AiPricingTier[] = [
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
  } satisfies Record<AiFeatureName, number>,
};

/**
 * Validates that a thinking level is supported by gemini-3.8-flash ('minimal' throws an error per Section 3.a #1).
 */
export function assertValidThinkingLevel(level: string): asserts level is ThinkingLevel {
  if (level !== 'low' && level !== 'medium' && level !== 'high') {
    throw new Error(
      `Invalid thinkingLevel "${level}". Only "low", "medium", and "high" are permitted ("minimal" is forbidden).`
    );
  }
}

// ============================================================================
// The 12 AI Output Schemas (Section 11.8)
// ============================================================================

/** 1. StudentListResult (Section 8.1) */
export interface StudentListResult {
  schemaVersion: 1;
  entries: Array<{
    seq: number;
    rawName: string;
    normalizedName: string;
    needsReview?: boolean;
  }>;
}

/** 2. VoiceSegmentsResult (Section 8.3 — Modes A1 & A2) */
export interface VoiceSegmentsResult {
  schemaVersion: 1;
  mode: 'A1' | 'A2';
  entries: Array<{
    index: number;
    value: number | 'absent' | null;
    rawText: string;
  }>;
}

/** 3. VoiceNamedResult (Section 8.3 — Mode B) */
export interface VoiceNamedResult {
  schemaVersion: 1;
  mode: 'B';
  entries: Array<{
    spokenName: string;
    matchedTempId: string | null;
    value: number | 'absent' | null;
    rawText: string;
  }>;
}

/** 4. HandwritingLayoutResult (Section 8.6 — Stage 1 Layout with box_2d 0..1000) */
export interface HandwritingLayoutResult {
  schemaVersion: 1;
  blocks: Array<{
    blockId: string;
    kind: 'text' | 'equation' | 'diagram' | 'table';
    /** [ymin, xmin, ymax, xmax] in 0..1000 normalized coordinates */
    box_2d: [number, number, number, number];
    approxText: string;
    hasUnreadableMarks?: boolean;
  }>;
}

/** 5. EquationDetailResult (Section 8.6 — Stage 2 High-Res Equation Extraction) */
export interface EquationDetailResult {
  schemaVersion: 1;
  equations: Array<{
    blockId: string;
    latex: string;
    isChemistry?: boolean;
    unreadableTokens?: string[];
  }>;
}

/** 6. RegisterTableResult (Section 9.6 — Paper Grade Register Digitization) */
export interface RegisterTableResult {
  schemaVersion: 1;
  detectedColumns: Array<{
    columnIndex: number;
    headerLabel: string;
  }>;
  rows: Array<{
    rowIndex: number;
    studentName: string;
    cells: Array<{
      columnIndex: number;
      rawText: string;
      value: number | 'absent' | null;
    }>;
  }>;
}

/** 7. LatexResult (Section 8.5 — Fallback AI Natural Text to LaTeX) */
export interface LatexResult {
  schemaVersion: 1;
  inputText: string;
  latex: string;
  isChemistry: boolean;
}

/** 8. QuestionSetResult (Section 10.2 — Question & Worksheet Generator) */
export interface QuestionBlockContract {
  type: 'text' | 'equation' | 'image' | 'table' | 'options';
  content: string;
  displayMode?: 'latex' | 'clean_image';
  options?: string[];
}

export interface QuestionSetResult {
  schemaVersion: 1;
  questions: Array<{
    questionNumber: number;
    questionType:
      | 'mcq'
      | 'true_false'
      | 'fill_blank'
      | 'define'
      | 'justify'
      | 'compare'
      | 'problem'
      | 'essay'
      | 'matching'
      | 'diagram_label';
    difficulty: 1 | 2 | 3;
    cognitiveLevel: string;
    marks: number;
    blocks: QuestionBlockContract[];
    parts?: Array<{
      label: string;
      marks: number;
      blocks: QuestionBlockContract[];
    }>;
    aiGenerated: true;
  }>;
}

/** 9. AnswerKeyResult (Section 10.2 — Dual Independent Solution Verification) */
export interface AnswerKeyResult {
  schemaVersion: 1;
  items: Array<{
    questionNumber: number;
    partLabel?: string;
    finalAnswerRun1: string;
    finalAnswerRun2: string;
    stepsMarkdown: string;
    marksAllocation: string;
    /** True if Run 1 and Run 2 matched; false triggers "غير متفق عليه، راجعه بنفسك" */
    agreed: boolean;
  }>;
}

/** 10. ProofreadResult (Section 10.5 — Linguistic Proofreading with Masked Math) */
export interface ProofreadResult {
  schemaVersion: 1;
  corrections: Array<{
    original: string;
    suggested: string;
    reasonAr: string;
    category: 'spelling' | 'grammar' | 'punctuation';
  }>;
}

/** 11. LessonPlanResult (Section 10.1 — AI Draft Lesson Plan) */
export interface LessonPlanResult {
  schemaVersion: 1;
  lessonTitle: string;
  behavioralObjectives: string[];
  materials: string;
  teachingMethod: string;
  lessonFlow: {
    intro: string;
    presentation: string;
    evaluation: string;
    conclusion: string;
  };
  homework: string;
}

/** 12. TocResult (Section 10.1 — Curriculum Book Index OCR) */
export interface TocResult {
  schemaVersion: 1;
  chapters: Array<{
    chapterNumber: number;
    chapterTitle: string;
    lessons: Array<{
      lessonNumber: number;
      lessonTitle: string;
      suggestedPeriods: number;
    }>;
  }>;
}

/**
 * Rescales normalized Gemini box_2d [ymin, xmin, ymax, xmax] (0..1000) to original pixel coordinates.
 */
export function rescaleBox2dToPixels(
  box2d: [number, number, number, number],
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  const [ymin, xmin, ymax, xmax] = box2d;
  const x = Math.round((xmin / 1000) * imageWidth);
  const y = Math.round((ymin / 1000) * imageHeight);
  const width = Math.max(1, Math.round(((xmax - xmin) / 1000) * imageWidth));
  const height = Math.max(1, Math.round(((ymax - ymin) / 1000) * imageHeight));
  return { x, y, width, height };
}
