/**
 * @techeeer/content - Official Iraqi Ministry of Education Subjects Directory
 */
import type { EducationalStage, AcademicStream, SubjectDefinition, TeacherProfile } from '../types/index.js';
export declare const IRAQI_SUBJECTS: SubjectDefinition[];
export declare function getAllSubjects(): SubjectDefinition[];
export declare function getSubjectsByStageAndGrade(stage: EducationalStage, grade: number, stream?: AcademicStream): SubjectDefinition[];
export declare function getSubjectById(id: string, stage?: EducationalStage, stream?: AcademicStream): SubjectDefinition | undefined;
export declare function filterSubjectsForTeacher(teacher: TeacherProfile): SubjectDefinition[];
//# sourceMappingURL=subjects.d.ts.map