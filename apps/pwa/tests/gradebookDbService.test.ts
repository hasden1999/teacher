import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GradebookDbService } from '../src/services/gradebookDbService.js';
import { dbClient } from '../src/worker/dbClient.js';
import type { ClassEntity, StudentEntity, GradeEntity } from '../src/types/gradebook.js';

describe('GradebookDbService Unit Test Suite', () => {
  let service: GradebookDbService;

  beforeEach(() => {
    service = new GradebookDbService();
    vi.restoreAllMocks();
  });

  describe('Classes & Divisions Operations', () => {
    it('queries classes ordered by grade level and name', async () => {
      const mockClasses: ClassEntity[] = [
        {
          id: 'c1',
          name: 'الأول متوسط',
          stage: 'intermediate',
          grade_level: 1,
          academic_year: '2026-2027',
          created_at: 1000,
        },
      ];

      const querySpy = vi.spyOn(dbClient, 'query').mockResolvedValue(mockClasses);

      const result = await service.getClasses();
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, name, stage, grade_level, academic_year, created_at FROM classes')
      );
      expect(result).toEqual(mockClasses);
    });

    it('creates new class with correct parameters and timestamp', async () => {
      const execSpy = vi.spyOn(dbClient, 'exec').mockResolvedValue({ rowsAffected: 1 });

      await service.createClass({
        id: 'c2',
        name: 'الثالث متوسط',
        stage: 'intermediate',
        grade_level: 3,
        academic_year: '2026-2027',
      });

      expect(execSpy).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO classes'),
        expect.arrayContaining(['c2', 'الثالث متوسط', 'intermediate', 3, '2026-2027'])
      );
    });

    it('deletes class by id', async () => {
      const execSpy = vi.spyOn(dbClient, 'exec').mockResolvedValue({ rowsAffected: 1 });

      await service.deleteClass('c1');
      expect(execSpy).toHaveBeenCalledWith('DELETE FROM classes WHERE id = ?;', ['c1']);
    });
  });

  describe('Students Persistence', () => {
    it('queries students by division with active filter', async () => {
      const mockStudents: StudentEntity[] = [
        {
          id: 's1',
          division_id: 'div_1',
          full_name: 'علي حسن',
          gender: 'male',
          roll_number: 1,
          is_active: 1,
          created_at: 1000,
        },
      ];

      const querySpy = vi.spyOn(dbClient, 'query').mockResolvedValue(mockStudents);

      const resActive = await service.getStudentsByDivision('div_1', true);
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining('WHERE division_id = ? AND is_active = 1'),
        ['div_1']
      );
      expect(resActive).toHaveLength(1);

      await service.getStudentsByDivision('div_1', false);
      expect(querySpy).toHaveBeenCalledWith(
        expect.stringContaining('WHERE division_id = ? ORDER BY roll_number ASC'),
        ['div_1']
      );
    });

    it('bulk creates students in an atomic transaction', async () => {
      const txSpy = vi.spyOn(dbClient, 'transaction').mockResolvedValue({ rowsAffected: 2 });

      await service.bulkCreateStudents([
        { id: 's1', division_id: 'd1', full_name: 'زيد', gender: 'male', roll_number: 1, is_active: 1 },
        { id: 's2', division_id: 'd1', full_name: 'عمر', gender: 'male', roll_number: 2, is_active: 1 },
      ]);

      expect(txSpy).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ sql: expect.stringContaining('INSERT INTO students') }),
        ])
      );
      const callArgs = txSpy.mock.calls[0][0];
      expect(callArgs).toHaveLength(2);
    });
  });

  describe('Grades Persistence & Upsert', () => {
    it('upserts a single grade with ON CONFLICT DO UPDATE clause', async () => {
      const execSpy = vi.spyOn(dbClient, 'exec').mockResolvedValue({ rowsAffected: 1 });

      const grade: GradeEntity = {
        id: 'g1',
        student_id: 's1',
        subject_id: 'sub1',
        term_id: 't1',
        category: 'month_1',
        mode: 'detailed',
        score: 85,
        component_oral: 18,
        component_written: 17,
        component_homework: 18,
        component_behavior: 16,
        component_participation: 16,
        is_absent: 0,
        absence_excused: 0,
        decision_points_applied: 0,
        updated_at: Date.now(),
      };

      await service.upsertGrade(grade);
      expect(execSpy).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT(student_id, subject_id, term_id, category) DO UPDATE'),
        expect.arrayContaining(['g1', 's1', 'sub1', 't1', 'month_1', 'detailed', 85])
      );
    });

    it('batch upserts grades via transaction', async () => {
      const txSpy = vi.spyOn(dbClient, 'transaction').mockResolvedValue({ rowsAffected: 2 });

      const grades: GradeEntity[] = [
        {
          id: 'g1',
          student_id: 's1',
          subject_id: 'sub1',
          term_id: 't1',
          category: 'month_1',
          mode: 'simplified',
          score: 90,
          component_oral: 0,
          component_written: 0,
          component_homework: 0,
          component_behavior: 0,
          component_participation: 0,
          is_absent: 0,
          absence_excused: 0,
          decision_points_applied: 0,
          updated_at: Date.now(),
        },
      ];

      await service.batchUpsertGrades(grades);
      expect(txSpy).toHaveBeenCalled();
    });
  });

  describe('Annual Summary & Decision Marks Calculations', () => {
    it('calculates semester grades, annual effort, and final result (T4.01 lifecycle)', () => {
      // Month 1: 44, Month 2: 48 -> Semester 1 = (44 + 48) / 2 = 46
      // Midterm: 48
      // Month 3: 46, Month 4: 50 -> Semester 2 = (46 + 50) / 2 = 48
      // Annual effort: (46 + 48 + 48) / 3 = 142 / 3 = 47.333 -> 47
      // Final exam: 47 -> Final result: (47 + 47) / 2 = 47
      const summary = service.calculateAnnualSummary({
        month1: 44,
        month2: 48,
        midterm: 48,
        month3: 46,
        month4: 50,
        finalExam: 47,
      });

      expect(summary.term1).toBe(46);
      expect(summary.term2).toBe(48);
      expect(summary.annualEffort).toBe(47);
      expect(summary.finalResult).toBe(47);
    });

    it('calculates decision marks preview raising 47 to 50 (passing threshold)', () => {
      const decisionRes = service.calculateDecisionPreview(
        [{ subjectId: 'math', score: 47 }],
        5 // 5 decision marks pool
      );

      expect(decisionRes.adjustedGrades[0].score).toBe(50);
      expect(decisionRes.usedMarks).toBe(3);
      expect(decisionRes.remainingMarks).toBe(2);
      expect(decisionRes.statusChanged).toBe(true);
    });
  });
});
