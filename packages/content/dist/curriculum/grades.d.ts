/**
 * @techeeer/content - Educational Stages & Grade Definitions
 * Official Iraqi Ministry of Education structure:
 * - Primary: Grades 1 to 6 (Grade 6 is ministerial)
 * - Intermediate: Grades 1 to 3 (Grade 3 is ministerial)
 * - Preparatory: Grades 4 to 6, split into Scientific and Literary (Grade 6 is ministerial)
 */
import type { EducationalStage, AcademicStream, StageDefinition, GradeDefinition } from '../types/index.js';
export declare const IRAQI_STAGES: StageDefinition[];
export declare const IRAQI_GRADES: GradeDefinition[];
export declare function getAllGrades(): GradeDefinition[];
export declare function getAllStages(): StageDefinition[];
export declare function getStageDefinition(stage: EducationalStage): StageDefinition | undefined;
export declare function getGradesByStage(stage: EducationalStage): GradeDefinition[];
export declare function isMinisterialGrade(stage: EducationalStage, grade: number, stream?: AcademicStream): boolean;
export declare function getGradeTitle(stage: EducationalStage, grade: number, stream?: AcademicStream): string;
//# sourceMappingURL=grades.d.ts.map