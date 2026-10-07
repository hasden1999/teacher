/**
 * SQLite Gradebook Persistence Service
 * Encapsulates transactional queries and mutations for classes, divisions, students, and grades.
 * Integrates with @techeeer/core for semester calculations and decision mark preview.
 */

import { dbClient } from '../worker/dbClient.js';
import {
  calculateSemesterGrade,
  calculateAnnualEffort,
  calculateFinalResult,
  applyDecisionMarks,
  type StudentSubjectGrade,
  type DecisionMarksResult,
} from '@techeeer/core';
import type {
  ClassEntity,
  DivisionEntity,
  StudentEntity,
  GradeEntity,
} from '../types/gradebook.js';

export class GradebookDbService {
  // ==========================================
  // 1. Classes & Divisions
  // ==========================================

  public async getClasses(): Promise<ClassEntity[]> {
    return dbClient.query<ClassEntity>(
      'SELECT id, name, stage, grade_level, academic_year, created_at FROM classes ORDER BY grade_level ASC, name ASC;'
    );
  }

  public async createClass(cls: Omit<ClassEntity, 'created_at'>): Promise<void> {
    await dbClient.exec(
      'INSERT INTO classes (id, name, stage, grade_level, academic_year, created_at) VALUES (?, ?, ?, ?, ?, ?);',
      [cls.id, cls.name, cls.stage, cls.grade_level, cls.academic_year, Date.now()]
    );
  }

  public async deleteClass(classId: string): Promise<void> {
    await dbClient.exec('DELETE FROM classes WHERE id = ?;', [classId]);
  }

  public async getDivisions(classId: string): Promise<DivisionEntity[]> {
    return dbClient.query<DivisionEntity>(
      'SELECT id, class_id, name, created_at FROM divisions WHERE class_id = ? ORDER BY name ASC;',
      [classId]
    );
  }

  public async createDivision(div: Omit<DivisionEntity, 'created_at'>): Promise<void> {
    await dbClient.exec(
      'INSERT INTO divisions (id, class_id, name, created_at) VALUES (?, ?, ?, ?);',
      [div.id, div.class_id, div.name, Date.now()]
    );
  }

  // ==========================================
  // 2. Students
  // ==========================================

  public async getStudentsByDivision(divisionId: string, activeOnly: boolean = true): Promise<StudentEntity[]> {
    const sql = activeOnly
      ? 'SELECT * FROM students WHERE division_id = ? AND is_active = 1 ORDER BY roll_number ASC, full_name ASC;'
      : 'SELECT * FROM students WHERE division_id = ? ORDER BY roll_number ASC, full_name ASC;';
    return dbClient.query<StudentEntity>(sql, [divisionId]);
  }

  public async createStudent(std: Omit<StudentEntity, 'created_at'>): Promise<void> {
    await dbClient.exec(
      `INSERT INTO students (id, division_id, full_name, gender, roll_number, is_active, guardian_phone, notes, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        std.id,
        std.division_id,
        std.full_name,
        std.gender,
        std.roll_number,
        std.is_active ?? 1,
        std.guardian_phone ?? null,
        std.notes ?? null,
        Date.now(),
      ]
    );
  }

  public async bulkCreateStudents(studentsList: Array<Omit<StudentEntity, 'created_at'>>): Promise<void> {
    const now = Date.now();
    const statements = studentsList.map((std) => ({
      sql: `INSERT INTO students (id, division_id, full_name, gender, roll_number, is_active, guardian_phone, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      params: [
        std.id,
        std.division_id,
        std.full_name,
        std.gender,
        std.roll_number,
        std.is_active ?? 1,
        std.guardian_phone ?? null,
        std.notes ?? null,
        now,
      ],
    }));

    await dbClient.transaction(statements);
  }

  // ==========================================
  // 3. Grades Persistence
  // ==========================================

  public async getGradesForRoster(
    divisionId: string,
    subjectId: string,
    termId: string
  ): Promise<GradeEntity[]> {
    return dbClient.query<GradeEntity>(
      `SELECT g.*
       FROM grades g
       JOIN students s ON g.student_id = s.id
       WHERE s.division_id = ? AND g.subject_id = ? AND g.term_id = ?;`,
      [divisionId, subjectId, termId]
    );
  }

  public async getGradesByStudent(studentId: string, subjectId?: string): Promise<GradeEntity[]> {
    if (subjectId) {
      return dbClient.query<GradeEntity>(
        'SELECT * FROM grades WHERE student_id = ? AND subject_id = ? ORDER BY updated_at ASC;',
        [studentId, subjectId]
      );
    }
    return dbClient.query<GradeEntity>(
      'SELECT * FROM grades WHERE student_id = ? ORDER BY updated_at ASC;',
      [studentId]
    );
  }

  public async upsertGrade(grade: GradeEntity): Promise<void> {
    const sql = `
      INSERT INTO grades (
        id, student_id, subject_id, term_id, category, mode, score,
        component_oral, component_written, component_homework, component_behavior,
        component_participation, is_absent, absence_excused, decision_points_applied,
        notes, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(student_id, subject_id, term_id, category) DO UPDATE SET
        mode = excluded.mode,
        score = excluded.score,
        component_oral = excluded.component_oral,
        component_written = excluded.component_written,
        component_homework = excluded.component_homework,
        component_behavior = excluded.component_behavior,
        component_participation = excluded.component_participation,
        is_absent = excluded.is_absent,
        absence_excused = excluded.absence_excused,
        decision_points_applied = excluded.decision_points_applied,
        notes = excluded.notes,
        updated_at = excluded.updated_at;
    `;

    await dbClient.exec(sql, [
      grade.id,
      grade.student_id,
      grade.subject_id,
      grade.term_id,
      grade.category,
      grade.mode,
      grade.score,
      grade.component_oral ?? 0,
      grade.component_written ?? 0,
      grade.component_homework ?? 0,
      grade.component_behavior ?? 0,
      grade.component_participation ?? 0,
      grade.is_absent ?? 0,
      grade.absence_excused ?? 0,
      grade.decision_points_applied ?? 0,
      grade.notes ?? null,
      Date.now(),
    ]);
  }

  public async batchUpsertGrades(grades: GradeEntity[]): Promise<void> {
    const now = Date.now();
    const statements = grades.map((g) => ({
      sql: `
        INSERT INTO grades (
          id, student_id, subject_id, term_id, category, mode, score,
          component_oral, component_written, component_homework, component_behavior,
          component_participation, is_absent, absence_excused, decision_points_applied,
          notes, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(student_id, subject_id, term_id, category) DO UPDATE SET
          mode = excluded.mode,
          score = excluded.score,
          component_oral = excluded.component_oral,
          component_written = excluded.component_written,
          component_homework = excluded.component_homework,
          component_behavior = excluded.component_behavior,
          component_participation = excluded.component_participation,
          is_absent = excluded.is_absent,
          absence_excused = excluded.absence_excused,
          decision_points_applied = excluded.decision_points_applied,
          notes = excluded.notes,
          updated_at = excluded.updated_at;
      `,
      params: [
        g.id,
        g.student_id,
        g.subject_id,
        g.term_id,
        g.category,
        g.mode,
        g.score,
        g.component_oral ?? 0,
        g.component_written ?? 0,
        g.component_homework ?? 0,
        g.component_behavior ?? 0,
        g.component_participation ?? 0,
        g.is_absent ?? 0,
        g.absence_excused ?? 0,
        g.decision_points_applied ?? 0,
        g.notes ?? null,
        now,
      ],
    }));

    await dbClient.transaction(statements);
  }

  // ==========================================
  // 4. Decision Marks Calculation & Preview
  // ==========================================

  public calculateDecisionPreview(
    grades: StudentSubjectGrade[],
    decisionPool: number = 5
  ): DecisionMarksResult {
    return applyDecisionMarks(grades, decisionPool);
  }

  public calculateAnnualSummary(records: {
    month1?: number;
    month2?: number;
    midterm?: number;
    month3?: number;
    month4?: number;
    finalExam?: number;
  }): {
    term1: number | null;
    term2: number | null;
    annualEffort: number | null;
    finalResult: number | null;
  } {
    const term1 =
      records.month1 !== undefined && records.month2 !== undefined
        ? calculateSemesterGrade(records.month1, records.month2)
        : null;

    const term2 =
      records.month3 !== undefined && records.month4 !== undefined
        ? calculateSemesterGrade(records.month3, records.month4)
        : null;

    const annualEffort =
      term1 !== null && records.midterm !== undefined && term2 !== null
        ? calculateAnnualEffort(term1, records.midterm, term2)
        : null;

    const finalResult =
      annualEffort !== null && records.finalExam !== undefined
        ? calculateFinalResult(annualEffort, records.finalExam)
        : null;

    return { term1, term2, annualEffort, finalResult };
  }
}

export const gradebookDbService = new GradebookDbService();
