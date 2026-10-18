/**
 * @techeeer/content - Official Iraqi Ministry of Education Subjects Directory
 */
import type { EducationalStage, AcademicStream, SubjectDefinition, TeacherProfile } from '../types/index.js';
export declare const IRAQI_SUBJECTS: SubjectDefinition[];
export declare function getAllSubjects(): SubjectDefinition[];
export declare function getSubjectsByStageAndGrade(stage: EducationalStage, grade: number, stream?: AcademicStream): SubjectDefinition[];
/**
 * Maps any subject ID or Arabic/English subject name to a canonical family key.
 * E.g. 'mathematics' | 'math_scientific' | 'الرياضيات' -> 'math'
 *      'islamic_education' | 'islamic_primary' | 'التربية الإسلامية' -> 'islamic'
 *      'social_studies' | 'social_intermediate' | 'الاجتماعيات' -> 'social'
 */
export declare function normalizeSubjectFamily(rawSubject?: string | null): string;
export declare function doesSubjectMatch(subjectA?: string | null, subjectB?: string | null): boolean;
export declare function getSubjectById(id?: string | null, stage?: EducationalStage, stream?: AcademicStream): SubjectDefinition | undefined;
export declare function filterSubjectsForTeacher(teacher: TeacherProfile): SubjectDefinition[];
//# sourceMappingURL=subjects.d.ts.map