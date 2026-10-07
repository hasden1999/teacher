export interface GradeComponents {
  oral: number;          // 0-20
  written: number;       // 0-20
  homework: number;      // 0-20
  behavior: number;      // 0-20
  participation: number; // 0-20
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
