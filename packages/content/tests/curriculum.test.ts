import { describe, it, expect } from 'vitest';
import {
  getAllStages,
  getStageDefinition,
  getAllGrades,
  getGradesByStage,
  isMinisterialGrade,
  getGradeTitle,
  getAllSubjects,
  getSubjectsByStageAndGrade,
  getSubjectById,
  filterSubjectsForTeacher,
  getAllChapters,
  getChaptersBySubject,
  getChapterById,
} from '../src/index.js';

describe('Iraqi MoE Curriculum: Stages & Grades', () => {
  it('should define all three official Iraqi educational stages', () => {
    const stages = getAllStages();
    expect(stages).toHaveLength(3);
    const stageIds = stages.map((s) => s.id);
    expect(stageIds).toContain('primary');
    expect(stageIds).toContain('intermediate');
    expect(stageIds).toContain('preparatory');
  });

  it('should define primary grades 1-6 with grade 6 as national ministerial exam', () => {
    const primaryGrades = getGradesByStage('primary');
    expect(primaryGrades).toHaveLength(6);
    expect(primaryGrades.map((g) => g.grade)).toEqual([1, 2, 3, 4, 5, 6]);

    expect(isMinisterialGrade('primary', 6)).toBe(true);
    expect(isMinisterialGrade('primary', 5)).toBe(false);
    expect(isMinisterialGrade('primary', 1)).toBe(false);
  });

  it('should define intermediate grades 1-3 with grade 3 as ministerial exam', () => {
    const intermediateGrades = getGradesByStage('intermediate');
    expect(intermediateGrades).toHaveLength(3);
    expect(intermediateGrades.map((g) => g.grade)).toEqual([1, 2, 3]);

    expect(isMinisterialGrade('intermediate', 3)).toBe(true);
    expect(isMinisterialGrade('intermediate', 2)).toBe(false);
  });

  it('should define preparatory grades 4-6 with scientific and literary streams', () => {
    const prepGrades = getGradesByStage('preparatory');
    expect(prepGrades.length).toBeGreaterThanOrEqual(6);

    const scientificGrades = prepGrades.filter((g) => g.stream === 'scientific');
    const literaryGrades = prepGrades.filter((g) => g.stream === 'literary');
    expect(scientificGrades).toHaveLength(3); // 4, 5, 6
    expect(literaryGrades).toHaveLength(3); // 4, 5, 6

    expect(isMinisterialGrade('preparatory', 6, 'scientific')).toBe(true);
    expect(isMinisterialGrade('preparatory', 6, 'literary')).toBe(true);
    expect(isMinisterialGrade('preparatory', 5, 'scientific')).toBe(false);
  });

  it('should return human-friendly Arabic grade titles', () => {
    expect(getGradeTitle('primary', 1)).toBe('الأول الابتدائي');
    expect(getGradeTitle('intermediate', 3)).toBe('الثالث المتوسط');
    expect(getGradeTitle('preparatory', 6, 'scientific')).toBe('السادس العلمي');
    expect(getGradeTitle('preparatory', 6, 'literary')).toBe('السادس الأدبي');
  });
});

describe('Iraqi MoE Curriculum: Subjects & Teacher Filtering', () => {
  it('should contain official subjects across all educational stages', () => {
    const allSubjects = getAllSubjects();
    expect(allSubjects.length).toBeGreaterThan(15);
  });

  it('should correctly query subjects for Grade 5 Primary', () => {
    const subjects = getSubjectsByStageAndGrade('primary', 5);
    const subjectIds = subjects.map((s) => s.id);
    expect(subjectIds).toContain('science_primary');
    expect(subjectIds).toContain('math_primary');
    expect(subjectIds).toContain('arabic_primary');
    expect(subjectIds).toContain('islamic_primary');
    expect(subjectIds).toContain('social_primary');
  });

  it('should correctly query subjects for Grade 5 Preparatory Scientific', () => {
    const subjects = getSubjectsByStageAndGrade('preparatory', 5, 'scientific');
    const subjectIds = subjects.map((s) => s.id);
    expect(subjectIds).toContain('chemistry_scientific');
    expect(subjectIds).toContain('physics_scientific');
    expect(subjectIds).toContain('math_scientific');
    expect(subjectIds).toContain('biology_scientific');
  });

  it('should retrieve a subject by id or partial name match', () => {
    const chem = getSubjectById('chemistry');
    expect(chem).toBeDefined();
    expect(chem?.nameAr).toContain('الكيمياء');

    const phys = getSubjectById('physics');
    expect(phys).toBeDefined();
    expect(phys?.nameAr).toContain('الفيزياء');

    const notFound = getSubjectById('unknown_xyz');
    expect(notFound).toBeUndefined();

    const stageMatch = getSubjectById('math', 'preparatory', 'scientific');
    expect(stageMatch).toBeDefined();
    expect(stageMatch?.stream).toBe('scientific');
  });

  it('should test getStageDefinition and edge cases of grades', () => {
    const stage = getStageDefinition('primary');
    expect(stage).toBeDefined();
    expect(stage?.grades).toEqual([1, 2, 3, 4, 5, 6]);

    const nonExistentGrade = getGradeTitle('primary', 99);
    expect(nonExistentGrade).toBe('الصف 99');

    const invalidMinisterial = isMinisterialGrade('primary', 99);
    expect(invalidMinisterial).toBe(false);
  });

  it('should support primary school teachers with dual subject assignments', () => {
    const teacherProfile = {
      subject: 'islamic',
      stage: 'primary' as const,
      grade: 4,
      secondarySubjects: ['arabic'],
    };
    const assignedSubjects = filterSubjectsForTeacher(teacherProfile);
    expect(assignedSubjects.length).toBeGreaterThanOrEqual(2);
    const names = assignedSubjects.map((s) => s.nameAr);
    expect(names.some((n) => n.includes('إسلامية'))).toBe(true);
    expect(names.some((n) => n.includes('عربية'))).toBe(true);
    expect(names.some((n) => n.includes('رياضيات'))).toBe(false);
  });
});

describe('Iraqi MoE Curriculum: Chapters & Units', () => {
  it('should contain detailed chapters for core curriculum subjects', () => {
    const chapters = getAllChapters();
    expect(chapters.length).toBeGreaterThanOrEqual(10);
  });

  it('should retrieve chapters for Grade 5 Primary Science', () => {
    const chapters = getChaptersBySubject('science_primary', 5);
    expect(chapters.length).toBeGreaterThanOrEqual(4);
    const ch1 = chapters.find((c) => c.chapterNumber === 1);
    expect(ch1).toBeDefined();
    expect(ch1?.chapterTitle).toContain('الجهاز الدوري والجهاز التنفسي');
  });

  it('should retrieve chapters for Grade 5 Preparatory Chemistry Scientific', () => {
    const chapters = getChaptersBySubject('chemistry_scientific', 5, 'scientific');
    expect(chapters.length).toBeGreaterThanOrEqual(4);
    const ch3 = chapters.find((c) => c.chapterNumber === 3);
    expect(ch3).toBeDefined();
    expect(ch3?.chapterTitle).toContain('الغازات');
  });

  it('should find chapter by unique id', () => {
    const chapter = getChapterById('ch_chem_5_c3');
    expect(chapter).toBeDefined();
    expect(chapter?.topics.some((t) => t.includes('بويل'))).toBe(true);
  });
});
