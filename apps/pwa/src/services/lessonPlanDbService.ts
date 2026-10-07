/**
 * SQLite Lesson Plans Persistence & Scheduling Service
 * Manages daily and annual lesson plans, status transitions, and ripple-shift rescheduling.
 */

import { dbClient } from '../worker/dbClient.js';
import {
  rescheduleLessonPlan,
  type LessonItem,
  type ScheduledLesson,
} from '@techeeer/core';
import {
  calculateLessonProgress,
  type DailyLessonPlan,
} from '@techeeer/content';

export interface LessonPlanEntity {
  id: string;
  subject_id: string;
  grade_level: number;
  plan_type: 'annual' | 'daily';
  unit_title?: string;
  chapter_number?: number;
  lesson_number?: number;
  lesson_title: string;
  behavioral_objectives_json?: string;
  educational_materials?: string;
  teaching_methods?: string;
  procedure_text?: string;
  evaluation_text?: string;
  homework_text?: string;
  scheduled_date: string; // YYYY-MM-DD
  status: 'planned' | 'completed' | 'postponed';
  postponed_reason?: string;
  rescheduled_date?: string;
  created_at: number;
}

export class LessonPlanDbService {
  /**
   * Fetch all lesson plans matching filter criteria
   */
  public async getLessonPlans(filter?: {
    subjectId?: string;
    gradeLevel?: number;
    status?: 'planned' | 'completed' | 'postponed';
  }): Promise<LessonPlanEntity[]> {
    let sql = 'SELECT * FROM lesson_plans WHERE 1=1';
    const params: unknown[] = [];

    if (filter?.subjectId) {
      sql += ' AND subject_id = ?';
      params.push(filter.subjectId);
    }
    if (filter?.gradeLevel !== undefined) {
      sql += ' AND grade_level = ?';
      params.push(filter.gradeLevel);
    }
    if (filter?.status) {
      sql += ' AND status = ?';
      params.push(filter.status);
    }

    sql += ' ORDER BY scheduled_date ASC, created_at ASC;';
    return dbClient.query<LessonPlanEntity>(sql, params);
  }

  /**
   * Save or update a daily lesson plan in SQLite
   */
  public async saveDailyPlan(plan: DailyLessonPlan, scheduledDate: string, status: 'planned' | 'completed' | 'postponed' = 'planned'): Promise<void> {
    const existing = await dbClient.query<LessonPlanEntity>(
      'SELECT id FROM lesson_plans WHERE id = ?;',
      [plan.id]
    );

    const objectivesJson = JSON.stringify({
      objectives: plan.objectives,
      cognitiveObjectives: plan.cognitiveObjectives,
      affectiveObjectives: plan.affectiveObjectives,
      psychomotorObjectives: plan.psychomotorObjectives,
      supervisoryDoc: plan.supervisoryDoc,
    });

    const educationalMaterials = (plan.teachingAids || []).join('، ');
    const teachingMethods = (plan.teachingStrategies || []).join('، ');

    if (existing.length > 0) {
      await dbClient.exec(
        `UPDATE lesson_plans SET
          subject_id = ?,
          grade_level = ?,
          lesson_title = ?,
          behavioral_objectives_json = ?,
          educational_materials = ?,
          teaching_methods = ?,
          procedure_text = ?,
          evaluation_text = ?,
          homework_text = ?,
          scheduled_date = ?,
          status = ?
        WHERE id = ?;`,
        [
          plan.subjectId,
          plan.grade,
          plan.topic,
          objectivesJson,
          educationalMaterials,
          teachingMethods,
          `${plan.warmup}\n\n${plan.presentation}`,
          plan.assessment,
          plan.closure,
          scheduledDate,
          status,
          plan.id,
        ]
      );
    } else {
      await dbClient.exec(
        `INSERT INTO lesson_plans (
          id, subject_id, grade_level, plan_type, lesson_title,
          behavioral_objectives_json, educational_materials, teaching_methods,
          procedure_text, evaluation_text, homework_text, scheduled_date,
          status, created_at
        ) VALUES (?, ?, ?, 'daily', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          plan.id,
          plan.subjectId,
          plan.grade,
          plan.topic,
          objectivesJson,
          educationalMaterials,
          teachingMethods,
          `${plan.warmup}\n\n${plan.presentation}`,
          plan.assessment,
          plan.closure,
          scheduledDate,
          status,
          Date.now(),
        ]
      );
    }
  }

  /**
   * Update status of a lesson plan
   */
  public async updatePlanStatus(
    id: string,
    status: 'planned' | 'completed' | 'postponed',
    postponedReason?: string,
    rescheduledDate?: string
  ): Promise<void> {
    await dbClient.exec(
      `UPDATE lesson_plans SET
        status = ?,
        postponed_reason = ?,
        rescheduled_date = ?
      WHERE id = ?;`,
      [status, postponedReason ?? null, rescheduledDate ?? null, id]
    );
  }

  /**
   * Delete a lesson plan
   */
  public async deletePlan(id: string): Promise<void> {
    await dbClient.exec('DELETE FROM lesson_plans WHERE id = ?;', [id]);
  }

  /**
   * Perform ripple-shift rescheduling for scheduled lessons starting from a given date,
   * taking into account Iraqi official holidays and weekly teaching days.
   */
  public rescheduleSyllabus(
    plans: LessonPlanEntity[],
    teachingDays: number[] = [0, 2, 4], // Default: Sun, Tue, Thu
    startDate: string,
    endDate: string
  ): ScheduledLesson[] {
    const lessonItems: LessonItem[] = plans.map((p, index) => ({
      id: p.id,
      title: p.lesson_title,
      unit: p.unit_title || 'الوحدة الأولى',
      sequence: index + 1,
      isPostponed: p.status === 'postponed',
    }));

    return rescheduleLessonPlan(lessonItems, teachingDays, startDate, endDate);
  }

  /**
   * Calculate progress metrics
   */
  public getProgressMetrics(plans: LessonPlanEntity[]): {
    completedCount: number;
    totalCount: number;
    percentage: number;
  } {
    return calculateLessonProgress(
      plans.map((p) => ({
        status: p.status === 'planned' ? 'scheduled' : p.status,
      }))
    );
  }
}

export const lessonPlanDbService = new LessonPlanDbService();
