export type ExamQuestionType = 'DEFINITION' | 'REASONING' | 'COMPARISON' | 'FILL_BLANKS' | 'TRUE_FALSE' | 'MCQ' | 'PROBLEM' | 'ENUMERATION' | 'GENERAL';
export interface ExamHeaderAST {
    country?: string;
    ministry?: string;
    directorate?: string;
    schoolName?: string;
    examTitle?: string;
    academicYear?: string;
    subject?: string;
    grade?: string;
    timeAllowed?: string;
    generalNote?: string;
}
export interface ParsedSubItem {
    label: string;
    text: string;
    marks?: number;
}
export type ExamBranchAST = ParsedSubItem & {
    id: string;
    subItems?: string[];
};
export interface ParsedExamQuestion {
    id?: string;
    questionNumber: number;
    header: string;
    subItems: ParsedSubItem[];
    marks?: number;
    type?: ExamQuestionType;
    instruction?: string;
    mainText?: string;
    branches?: ExamBranchAST[];
}
export type ExamQuestionAST = ParsedExamQuestion & {
    id: string;
    headerLabel: string;
    type: ExamQuestionType;
    branches: ExamBranchAST[];
};
export interface ExamPaperAST {
    header: ExamHeaderAST;
    questions: ExamQuestionAST[];
    rawText: string;
}
/**
 * محرك حماية واستعادة صيغ LaTeX والرياضيات والكيمياء (Math Shielding Engine)
 */
export declare class LatexPreserver {
    private tokens;
    private counter;
    protect(text: string): string;
    restore(text: string): string;
}
/**
 * تحليل نص الامتحان الكامل المنسوخ إلى شجرة البناء المجردة AST
 */
export declare function parseExamPaperAST(rawText: string): ExamPaperAST;
/**
 * تحليل نص الامتحان وإرجاع مصفوفة الأسئلة المتطابقة مع عقد PROJECT.md
 */
export declare function parseExamPaperText(rawText: string): ParsedExamQuestion[];
/**
 * تحويل شجرة البناء المجردة للورقة الامتحانية إلى نص عربي منظم مطابق للمواصفات الوزارية
 */
export declare function serializeExamPaperAST(ast: ExamPaperAST): string;
export interface ExamMarksSummary {
    totalMarks: number;
    isStandard100: boolean;
    questionCount: number;
    questionsWithMarks: number;
    unassignedCount: number;
    breakdown: Array<{
        questionNumber: number;
        marks: number;
        isFromBranches: boolean;
    }>;
}
export declare function calculateExamTotalMarks(questions: ExamQuestionAST[]): ExamMarksSummary;
export type ExamFontFamily = 'Amiri' | 'Tajawal';
export type ExamFontSizeScale = 'small' | 'medium' | 'large';
export type ExamLineSpacing = 'compact' | 'normal' | 'spacious';
export interface ExamTypographyConfig {
    fontFamily: ExamFontFamily;
    headerWeight: 'bold' | 'black';
    bodyWeight: 'normal' | 'medium';
    scale: ExamFontSizeScale;
    lineSpacing: ExamLineSpacing;
    headerFontSizeClass: string;
    bodyFontSizeClass: string;
    showDecorations: boolean;
}
export declare const DEFAULT_EXAM_TYPOGRAPHY: ExamTypographyConfig;
//# sourceMappingURL=examParser.d.ts.map