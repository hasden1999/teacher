/**
 * @techeeer/content - Official Curriculum Chapters & Units Directory
 */
import type { AcademicStream, CurriculumChapter } from '../types/index.js';
export declare const IRAQI_CHAPTERS: CurriculumChapter[];
export declare function getAllChapters(): CurriculumChapter[];
export declare function getChaptersBySubject(subjectId: string, grade?: number, stream?: AcademicStream): CurriculumChapter[];
export declare function getChapterById(id: string): CurriculumChapter | undefined;
//# sourceMappingURL=chapters.d.ts.map