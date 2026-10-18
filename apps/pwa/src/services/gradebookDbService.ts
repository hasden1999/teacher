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
  GradeCategory,
} from '../types/gradebook.js';

export class GradebookDbService {
  // Local storage cache keys
  private readonly STORAGE_CLASSES = 'techeeer_classes';
  private readonly STORAGE_DIVISIONS = 'techeeer_divisions';
  private readonly STORAGE_STUDENTS_PREFIX = 'techeeer_students_';

  private getLocalClasses(): ClassEntity[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.STORAGE_CLASSES);
      if (raw) return JSON.parse(raw);
    } catch {}
    return [
      {
        id: 'cls_prep_5',
        name: 'الخامس العلمي',
        stage: 'preparatory',
        grade_level: 5,
        academic_year: '2026-2027',
        created_at: Date.now(),
      },
    ];
  }

  private saveLocalClasses(classes: ClassEntity[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_CLASSES, JSON.stringify(classes));
    } catch {}
  }

  private getLocalDivisions(classId?: string): DivisionEntity[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(this.STORAGE_DIVISIONS);
      if (raw) {
        const parsed: DivisionEntity[] = JSON.parse(raw);
        return classId ? parsed.filter((d) => d.class_id === classId) : parsed;
      }
    } catch {}
    const cId = classId || 'cls_prep_5';
    return [
      { id: 'div_1', class_id: cId, name: 'شعبة أ', created_at: Date.now() },
      { id: 'div_2', class_id: cId, name: 'شعبة ب', created_at: Date.now() },
      { id: 'div_3', class_id: cId, name: 'شعبة ج', created_at: Date.now() },
    ];
  }

  private saveLocalDivisions(divs: DivisionEntity[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(this.STORAGE_DIVISIONS, JSON.stringify(divs));
    } catch {}
  }

  private getLocalStudents(divisionId: string, activeOnly: boolean = true): StudentEntity[] {
    if (typeof localStorage === 'undefined') return [];
    try {
      const raw = localStorage.getItem(`${this.STORAGE_STUDENTS_PREFIX}${divisionId}`);
      if (raw) {
        const list: StudentEntity[] = JSON.parse(raw);
        return activeOnly ? list.filter((s) => s.is_active === 1) : list;
      }
    } catch {}
    return [];
  }

  private saveLocalStudents(divisionId: string, students: StudentEntity[]): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(`${this.STORAGE_STUDENTS_PREFIX}${divisionId}`, JSON.stringify(students));
    } catch {}
  }

  // ==========================================
  // 1. Classes & Divisions
  // ==========================================

  public async getClasses(): Promise<ClassEntity[]> {
    try {
      const res = await dbClient.query<ClassEntity>(
        'SELECT id, name, stage, grade_level, academic_year, created_at FROM classes ORDER BY grade_level ASC, name ASC;'
      );
      if (res && res.length > 0) {
        this.saveLocalClasses(res);
        return res;
      }
    } catch (err) {
      console.warn('SQLite getClasses query failed, using local fallback:', err);
    }
    return this.getLocalClasses();
  }

  public async createClass(cls: Omit<ClassEntity, 'created_at'>): Promise<void> {
    const fullCls: ClassEntity = { ...cls, created_at: Date.now() };
    const current = this.getLocalClasses().filter((c) => c.id !== cls.id);
    current.push(fullCls);
    this.saveLocalClasses(current);

    try {
      await dbClient.exec(
        'INSERT INTO classes (id, name, stage, grade_level, academic_year, created_at) VALUES (?, ?, ?, ?, ?, ?);',
        [cls.id, cls.name, cls.stage, cls.grade_level, cls.academic_year, Date.now()]
      );
    } catch (err) {
      console.warn('SQLite createClass failed:', err);
    }
  }

  public async deleteClass(classId: string): Promise<void> {
    const current = this.getLocalClasses().filter((c) => c.id !== classId);
    this.saveLocalClasses(current);
    try {
      await dbClient.exec('DELETE FROM classes WHERE id = ?;', [classId]);
    } catch (err) {
      console.warn('SQLite deleteClass failed:', err);
    }
  }

  public async getDivisions(classId: string): Promise<DivisionEntity[]> {
    try {
      const res = await dbClient.query<DivisionEntity>(
        'SELECT id, class_id, name, created_at FROM divisions WHERE class_id = ? ORDER BY name ASC;',
        [classId]
      );
      if (res && res.length > 0) {
        const allLocal = this.getLocalDivisions();
        const merged = allLocal.filter((d) => d.class_id !== classId).concat(res);
        this.saveLocalDivisions(merged);
        return res;
      }
    } catch (err) {
      console.warn('SQLite getDivisions failed, using local fallback:', err);
    }
    return this.getLocalDivisions(classId);
  }

  public async createDivision(div: Omit<DivisionEntity, 'created_at'>): Promise<void> {
    const fullDiv: DivisionEntity = { ...div, created_at: Date.now() };
    const current = this.getLocalDivisions().filter((d) => d.id !== div.id);
    current.push(fullDiv);
    this.saveLocalDivisions(current);

    try {
      await dbClient.exec(
        'INSERT INTO divisions (id, class_id, name, created_at) VALUES (?, ?, ?, ?);',
        [div.id, div.class_id, div.name, Date.now()]
      );
    } catch (err) {
      console.warn('SQLite createDivision failed:', err);
    }
  }

  // ==========================================
  // 2. Students
  // ==========================================

  public async getStudentsByDivision(divisionId: string, activeOnly: boolean = true): Promise<StudentEntity[]> {
    try {
      const sql = activeOnly
        ? 'SELECT * FROM students WHERE division_id = ? AND is_active = 1 ORDER BY roll_number ASC, full_name ASC;'
        : 'SELECT * FROM students WHERE division_id = ? ORDER BY roll_number ASC, full_name ASC;';
      const res = await dbClient.query<StudentEntity>(sql, [divisionId]);
      if (res && res.length > 0) {
        this.saveLocalStudents(divisionId, res);
        return res;
      }
    } catch (err) {
      console.warn('SQLite getStudentsByDivision failed, checking local storage:', err);
    }
    return this.getLocalStudents(divisionId, activeOnly);
  }

  public async ensureDivisionExists(divisionId: string, defaultName: string = 'شعبة أ'): Promise<void> {
    const divs = this.getLocalDivisions();
    if (!divs.some((d) => d.id === divisionId)) {
      divs.push({
        id: divisionId,
        class_id: 'cls_prep_5',
        name: defaultName,
        created_at: Date.now(),
      });
      this.saveLocalDivisions(divs);
    }

    try {
      const existing = await dbClient.query<{ id: string }>(
        'SELECT id FROM divisions WHERE id = ? LIMIT 1;',
        [divisionId]
      );
      if (!existing || existing.length === 0) {
        let classes = await this.getClasses();
        if (!classes || classes.length === 0) {
          await this.ensureDefaultStructure();
          classes = await this.getClasses();
        }
        const classId = classes[0]?.id || 'cls_prep_5';
        await dbClient.exec(
          'INSERT OR IGNORE INTO divisions (id, class_id, name, created_at) VALUES (?, ?, ?, ?);',
          [divisionId, classId, defaultName, Date.now()]
        );
      }
    } catch (err) {
      console.warn('Failed to ensure division exists in SQLite:', err);
    }
  }

  public async createStudent(std: Omit<StudentEntity, 'created_at'>): Promise<void> {
    const fullStd: StudentEntity = {
      ...std,
      is_active: std.is_active ?? 1,
      guardian_phone: std.guardian_phone ?? null,
      notes: std.notes ?? null,
      created_at: Date.now(),
    };
    const current = this.getLocalStudents(std.division_id, false).filter((s) => s.id !== std.id);
    current.push(fullStd);
    current.sort((a, b) => a.roll_number - b.roll_number);
    this.saveLocalStudents(std.division_id, current);

    try {
      await this.ensureDivisionExists(std.division_id);
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
    } catch (err) {
      console.warn('SQLite createStudent failed:', err);
    }
  }

  public async bulkCreateStudents(studentsList: Array<Omit<StudentEntity, 'created_at'>>): Promise<void> {
    if (studentsList.length === 0) return;
    const now = Date.now();

    // Mirror to local storage per division
    const byDiv = new Map<string, Array<Omit<StudentEntity, 'created_at'>>>();
    for (const s of studentsList) {
      const list = byDiv.get(s.division_id) || [];
      list.push(s);
      byDiv.set(s.division_id, list);
    }
    byDiv.forEach((stds, divId) => {
      const existing = this.getLocalStudents(divId, false);
      const map = new Map(existing.map((s) => [s.id, s]));
      stds.forEach((s) => {
        map.set(s.id, {
          ...s,
          is_active: s.is_active ?? 1,
          guardian_phone: s.guardian_phone ?? null,
          notes: s.notes ?? null,
          created_at: now,
        });
      });
      const updated = Array.from(map.values()).sort((a, b) => a.roll_number - b.roll_number);
      this.saveLocalStudents(divId, updated);
    });

    try {
      const divisionIds = Array.from(new Set(studentsList.map((s) => s.division_id)));
      for (const divId of divisionIds) {
        await this.ensureDivisionExists(divId);
      }
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
    } catch (err) {
      console.warn('SQLite bulkCreateStudents failed:', err);
    }
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

  // ==========================================
  // 5. Structure, Matrix & Seed Operations
  // ==========================================

  public async deleteStudent(studentId: string): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.STORAGE_STUDENTS_PREFIX)) {
          try {
            const raw = localStorage.getItem(key);
            if (raw) {
              const list: StudentEntity[] = JSON.parse(raw);
              if (list.some((s) => s.id === studentId)) {
                const filtered = list.filter((s) => s.id !== studentId);
                localStorage.setItem(key, JSON.stringify(filtered));
              }
            }
          } catch {}
        }
      }
    }
    try {
      await dbClient.exec('DELETE FROM students WHERE id = ?;', [studentId]);
    } catch (err) {
      console.warn('SQLite deleteStudent failed:', err);
    }
  }

  public async ensureDefaultStructure(): Promise<{ classId: string; divisionId: string }> {
    const defaultClassId = 'cls_prep_5';
    const defaultDivId = 'div_1';

    // Ensure local storage has defaults first
    const localClasses = this.getLocalClasses();
    if (!localClasses || localClasses.length === 0) {
      this.saveLocalClasses([
        {
          id: defaultClassId,
          name: 'الخامس العلمي',
          stage: 'preparatory',
          grade_level: 5,
          academic_year: '2026-2027',
          created_at: Date.now(),
        },
      ]);
    }
    const localDivs = this.getLocalDivisions(defaultClassId);
    if (!localDivs || localDivs.length === 0) {
      this.saveLocalDivisions([
        { id: 'div_1', class_id: defaultClassId, name: 'شعبة أ', created_at: Date.now() },
        { id: 'div_2', class_id: defaultClassId, name: 'شعبة ب', created_at: Date.now() },
        { id: 'div_3', class_id: defaultClassId, name: 'شعبة ج', created_at: Date.now() },
      ]);
    }

    try {
      await dbClient.init();
      const existingClasses = await dbClient.query<ClassEntity>(
        'SELECT id, name, stage, grade_level, academic_year, created_at FROM classes ORDER BY grade_level ASC, name ASC;'
      );
      let classId = defaultClassId;
      if (!existingClasses || existingClasses.length === 0) {
        await dbClient.exec(
          'INSERT INTO classes (id, name, stage, grade_level, academic_year, created_at) VALUES (?, ?, ?, ?, ?, ?);',
          [defaultClassId, 'الخامس العلمي', 'preparatory', 5, '2026-2027', Date.now()]
        );
      } else {
        classId = existingClasses[0].id;
      }
      await dbClient.exec(
        `INSERT OR IGNORE INTO divisions (id, class_id, name, created_at) VALUES ('div_1', ?, 'شعبة أ', ?);`,
        [classId, Date.now()]
      );
      await dbClient.exec(
        `INSERT OR IGNORE INTO divisions (id, class_id, name, created_at) VALUES ('div_2', ?, 'شعبة ب', ?);`,
        [classId, Date.now()]
      );
      await dbClient.exec(
        `INSERT OR IGNORE INTO divisions (id, class_id, name, created_at) VALUES ('div_3', ?, 'شعبة ج', ?);`,
        [classId, Date.now()]
      );
      await dbClient.exec(
        `INSERT OR IGNORE INTO subjects (id, name, stage, grade_level, has_oral, created_at)
         VALUES ('sub_general', 'عام', 'preparatory', 5, 1, ?);`,
        [Date.now()]
      );
      await dbClient.exec(
        `INSERT OR IGNORE INTO academic_terms (id, name, academic_year, is_locked, created_at)
         VALUES ('term_1', 'الفصل الأول', '2026-2027', 0, ?);`,
        [Date.now()]
      );
    } catch (err) {
      console.warn('Failed to ensure default structure in SQLite (using local storage fallback):', err);
    }
    return { classId: defaultClassId, divisionId: defaultDivId };
  }

  public async seedSampleStudentsIfEmpty(
    divisionId: string = 'div_1',
    sampleStudents: Array<Omit<StudentEntity, 'created_at'>>,
    sampleGrades?: Record<string, Record<string, { score: number | null; isAbsent: boolean }>>
  ): Promise<boolean> {
    if (typeof localStorage !== 'undefined' && localStorage.getItem('techeeer_sample_seed_cleared') === 'true') {
      return false;
    }
    try {
      const existing = await this.getStudentsByDivision(divisionId, false);
      if (existing.length === 0) {
        await this.bulkCreateStudents(sampleStudents);
        if (sampleGrades) {
          await this.persistMatrix(divisionId, sampleGrades);
        }
        return true;
      }
    } catch (err) {
      console.warn('Failed to seed sample students in SQLite, seeding in local storage fallback:', err);
      const now = Date.now();
      const mapped = sampleStudents.map((s) => ({
        ...s,
        is_active: s.is_active ?? 1,
        guardian_phone: s.guardian_phone ?? null,
        notes: s.notes ?? null,
        created_at: now,
      }));
      this.saveLocalStudents(divisionId, mapped);
      if (sampleGrades && typeof localStorage !== 'undefined') {
        localStorage.setItem(`techeeer_gradebook_matrix_${divisionId}`, JSON.stringify(sampleGrades));
      }
      return true;
    }
    return false;
  }

  public async clearSampleData(divisionId: string = 'div_1'): Promise<void> {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('techeeer_sample_seed_cleared', 'true');
      localStorage.removeItem(`techeeer_gradebook_matrix_${divisionId}`);
      localStorage.removeItem(`${this.STORAGE_STUDENTS_PREFIX}${divisionId}`);
    }
    try {
      await dbClient.exec(
        "DELETE FROM students WHERE division_id = ? AND (id LIKE 'std_%' OR id LIKE 'std_demo_%');",
        [divisionId]
      );
    } catch (err) {
      console.warn('Failed to clear sample data from SQLite:', err);
    }
  }

  public async loadMatrix(
    divisionId: string,
    subjectId: string = 'sub_general',
    termId: string = 'term_1'
  ): Promise<Record<string, Record<string, { score: number | null; isAbsent: boolean }>>> {
    const matrix: Record<string, Record<string, { score: number | null; isAbsent: boolean }>> = {};
    try {
      const gradeRows = await this.getGradesForRoster(divisionId, subjectId, termId);
      for (const g of gradeRows) {
        if (!matrix[g.student_id]) matrix[g.student_id] = {};
        if (g.category === 'month_1') {
          if (g.component_oral !== undefined) matrix[g.student_id].component_oral = { score: g.component_oral, isAbsent: false };
          if (g.component_written !== undefined) matrix[g.student_id].component_written = { score: g.component_written, isAbsent: false };
          if (g.component_homework !== undefined) matrix[g.student_id].component_homework = { score: g.component_homework, isAbsent: false };
          if (g.component_behavior !== undefined) matrix[g.student_id].component_behavior = { score: g.component_behavior, isAbsent: false };
          if (g.component_participation !== undefined) matrix[g.student_id].component_participation = { score: g.component_participation, isAbsent: false };
          const hasComponent = g.component_oral !== undefined || g.component_written !== undefined ||
            g.component_homework !== undefined || g.component_behavior !== undefined || g.component_participation !== undefined;
          if (hasComponent) {
            const dailyTotal = (g.component_oral || 0) + (g.component_written || 0) + (g.component_homework || 0) + (g.component_behavior || 0) + (g.component_participation || 0);
            matrix[g.student_id].daily_total = { score: dailyTotal, isAbsent: false };
          }
        }
        matrix[g.student_id][g.category] = { score: g.score, isAbsent: Boolean(g.is_absent) };
      }

      const cached = await dbClient.query<{ value: string }>(
        'SELECT value FROM app_settings WHERE key = ?;',
        [`matrix_${divisionId}`]
      );
      if (cached && cached[0] && cached[0].value) {
        const parsed = JSON.parse(cached[0].value);
        const merged: Record<string, Record<string, { score: number | null; isAbsent: boolean }>> = { ...parsed };
        for (const [studentId, studentGrades] of Object.entries(matrix)) {
          merged[studentId] = { ...(parsed[studentId] || {}), ...studentGrades };
        }
        return merged;
      }
    } catch {
      if (typeof localStorage !== 'undefined') {
        const local = localStorage.getItem(`techeeer_gradebook_matrix_${divisionId}`);
        if (local) {
          try {
            return JSON.parse(local);
          } catch {}
        }
      }
    }
    return matrix;
  }

  public async persistMatrix(
    divisionId: string,
    matrix: Record<string, Record<string, { score: number | null; isAbsent: boolean }>>,
    subjectId: string = 'sub_general',
    termId: string = 'term_1'
  ): Promise<void> {
    const gradesToUpsert: GradeEntity[] = [];
    const now = Date.now();

    for (const [studentId, studentGrades] of Object.entries(matrix)) {
      if (!studentGrades) continue;
      const m1 = studentGrades.month_1;
      const oral = studentGrades.component_oral?.score ?? 0;
      const written = studentGrades.component_written?.score ?? 0;
      const homework = studentGrades.component_homework?.score ?? 0;
      const behavior = studentGrades.component_behavior?.score ?? 0;
      const part = studentGrades.component_participation?.score ?? 0;

      gradesToUpsert.push({
        id: `grd_${studentId}_month_1`,
        student_id: studentId,
        subject_id: subjectId,
        term_id: termId,
        category: 'month_1',
        mode: 'detailed',
        score: m1?.score ?? null,
        component_oral: oral,
        component_written: written,
        component_homework: homework,
        component_behavior: behavior,
        component_participation: part,
        is_absent: m1?.isAbsent ? 1 : 0,
        absence_excused: 0,
        decision_points_applied: 0,
        updated_at: now,
      });

      const otherCategories: GradeCategory[] = [
        'month_2',
        'mid_term',
        'semester_1_avg',
        'month_3',
        'month_4',
        'semester_2_avg',
        'annual_effort',
        'final_exam',
        'round_2',
        'final_status',
      ];
      for (const cat of otherCategories) {
        if (studentGrades[cat]) {
          gradesToUpsert.push({
            id: `grd_${studentId}_${cat}`,
            student_id: studentId,
            subject_id: subjectId,
            term_id: termId,
            category: cat,
            mode: 'simplified',
            score: studentGrades[cat].score ?? null,
            component_oral: 0,
            component_written: 0,
            component_homework: 0,
            component_behavior: 0,
            component_participation: 0,
            is_absent: studentGrades[cat].isAbsent ? 1 : 0,
            absence_excused: 0,
            decision_points_applied: 0,
            updated_at: now,
          });
        }
      }
    }

    try {
      if (gradesToUpsert.length > 0) {
        await this.batchUpsertGrades(gradesToUpsert);
      }
      const jsonVal = JSON.stringify(matrix);
      await dbClient.exec(
        `INSERT INTO app_settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;`,
        [`matrix_${divisionId}`, jsonVal, now]
      );
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`techeeer_gradebook_matrix_${divisionId}`, jsonVal);
      }
    } catch (err) {
      console.warn('Failed to persist matrix:', err);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(`techeeer_gradebook_matrix_${divisionId}`, JSON.stringify(matrix));
      }
    }
  }
}

export const gradebookDbService = new GradebookDbService();
