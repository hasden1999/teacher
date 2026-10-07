export interface GradeComponents {
    oral: number;
    written: number;
    homework: number;
    behavior: number;
    participation: number;
}
export type ComponentKey = keyof GradeComponents;
export interface StudentSubjectGrade {
    subjectId: string;
    score: number;
}
export type SubjectGrade = StudentSubjectGrade;
export interface DecisionMarksResult {
    adjustedGrades: StudentSubjectGrade[];
    usedMarks: number;
    remainingMarks: number;
    benefitedSubjectIds: string[];
    statusChanged: boolean;
}
export type DecisionApplicationResult = DecisionMarksResult;
//# sourceMappingURL=types.d.ts.map