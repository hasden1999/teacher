/**
 * SQLite Database Schema and Migration Engine
 * Defines canonical relational tables, constraints, indexes, and versioned migration scripts.
 */

export interface Migration {
  version: number;
  description: string;
  up: (db: any) => void;
}

export const CANONICAL_TABLE_NAMES = [
  'classes',
  'divisions',
  'students',
  'subjects',
  'academic_terms',
  'grades',
  'questions',
  'exam_papers',
  'lesson_plans',
  'app_settings',
  'backup_ledger',
  'schema_migrations',
] as const;

export const INITIAL_SCHEMA_DDL = `
-- 1. Classes Table (الفصول الدراسية)
CREATE TABLE IF NOT EXISTS classes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    stage TEXT NOT NULL CHECK (stage IN ('primary', 'intermediate', 'preparatory')),
    grade_level INTEGER NOT NULL CHECK (grade_level BETWEEN 1 AND 6),
    academic_year TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- 2. Divisions Table (الشعب)
CREATE TABLE IF NOT EXISTS divisions (
    id TEXT PRIMARY KEY,
    class_id TEXT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_divisions_class ON divisions(class_id);

-- 3. Students Table (سجل الطلاب)
CREATE TABLE IF NOT EXISTS students (
    id TEXT PRIMARY KEY,
    division_id TEXT NOT NULL REFERENCES divisions(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
    roll_number INTEGER NOT NULL,
    is_active INTEGER NOT NULL DEFAULT 1,
    guardian_phone TEXT,
    notes TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_students_division ON students(division_id, roll_number);

-- 4. Subjects Table (المواد الدراسية)
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    stage TEXT NOT NULL,
    grade_level INTEGER NOT NULL,
    has_oral INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- 5. Academic Terms Table (الفترات الدراسية)
CREATE TABLE IF NOT EXISTS academic_terms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    is_locked INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
);

-- 6. Grades Table (سجل الدرجات)
CREATE TABLE IF NOT EXISTS grades (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    term_id TEXT NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
    category TEXT NOT NULL CHECK (category IN ('month_1', 'month_2', 'mid_term', 'annual_effort', 'final_exam', 'round_2')),
    mode TEXT NOT NULL DEFAULT 'simplified' CHECK (mode IN ('detailed', 'simplified')),
    score REAL,
    component_oral REAL DEFAULT 0,
    component_written REAL DEFAULT 0,
    component_homework REAL DEFAULT 0,
    component_behavior REAL DEFAULT 0,
    component_participation REAL DEFAULT 0,
    is_absent INTEGER NOT NULL DEFAULT 0,
    absence_excused INTEGER NOT NULL DEFAULT 0,
    decision_points_applied INTEGER DEFAULT 0,
    notes TEXT,
    updated_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_student_subject_term_cat 
ON grades(student_id, subject_id, term_id, category);
CREATE INDEX IF NOT EXISTS idx_grades_student ON grades(student_id);
CREATE INDEX IF NOT EXISTS idx_grades_lookup ON grades(subject_id, term_id, category);

-- 7. Question Bank Table (بنك الأسئلة)
CREATE TABLE IF NOT EXISTS questions (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    grade_level INTEGER NOT NULL,
    chapter INTEGER NOT NULL,
    topic TEXT,
    question_type TEXT NOT NULL CHECK (question_type IN ('essay', 'multiple_choice', 'fill_blank', 'true_false', 'problem', 'matching')),
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'medium', 'hard')),
    question_text TEXT NOT NULL,
    model_answer TEXT,
    default_score INTEGER NOT NULL DEFAULT 10,
    is_ministerial INTEGER NOT NULL DEFAULT 0,
    ministerial_year TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_questions_filter ON questions(subject_id, grade_level, chapter);

-- 8. Exam Papers Table (نماذج الامتحانات)
CREATE TABLE IF NOT EXISTS exam_papers (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    grade_level INTEGER NOT NULL,
    school_name TEXT NOT NULL,
    teacher_name TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    exam_date TEXT,
    duration_minutes INTEGER DEFAULT 90,
    header_config_json TEXT NOT NULL,
    typography_config_json TEXT NOT NULL,
    content_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_exam_papers_subject ON exam_papers(subject_id);

-- 9. Lesson Plans Table (الخطط الدراسية)
CREATE TABLE IF NOT EXISTS lesson_plans (
    id TEXT PRIMARY KEY,
    subject_id TEXT NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    grade_level INTEGER NOT NULL,
    plan_type TEXT NOT NULL CHECK (plan_type IN ('annual', 'daily')),
    unit_title TEXT,
    chapter_number INTEGER,
    lesson_number INTEGER,
    lesson_title TEXT NOT NULL,
    behavioral_objectives_json TEXT,
    educational_materials TEXT,
    teaching_methods TEXT,
    procedure_text TEXT,
    evaluation_text TEXT,
    homework_text TEXT,
    scheduled_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'postponed')),
    postponed_reason TEXT,
    rescheduled_date TEXT,
    created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_date ON lesson_plans(scheduled_date, status);
CREATE INDEX IF NOT EXISTS idx_lesson_plans_subject ON lesson_plans(subject_id, grade_level);

-- 10. App Settings Table (إعدادات النظام والترخيص)
CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
);

-- 11. Backup Ledger Table (سجل النسخ الاحتياطية)
CREATE TABLE IF NOT EXISTS backup_ledger (
    id TEXT PRIMARY KEY,
    snapshot_filename TEXT NOT NULL,
    mutation_count INTEGER NOT NULL,
    byte_size INTEGER NOT NULL,
    checksum TEXT,
    created_at INTEGER NOT NULL
);

-- 12. Migrations Table (جدول تتبع الهجرات)
CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    applied_at INTEGER NOT NULL,
    description TEXT NOT NULL
);
`;

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Initial schema setup (12 core tables)',
    up: (db: any) => {
      db.exec(INITIAL_SCHEMA_DDL);
    },
  },
];

export function runMigrations(db: any): void {
  // Ensure schema_migrations exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL,
      description TEXT NOT NULL
    );
  `);

  let appliedVersions = new Set<number>();
  if (typeof db.selectObjects === 'function') {
    const rows = db.selectObjects('SELECT version FROM schema_migrations ORDER BY version ASC;') as Array<{ version: number }>;
    appliedVersions = new Set(rows.map((r) => r.version));
  } else if (typeof db.exec === 'function') {
    try {
      db.exec({
        sql: 'SELECT version FROM schema_migrations ORDER BY version ASC;',
        callback: (row: any[]) => {
          if (row && row[0] !== undefined) {
            appliedVersions.add(Number(row[0]));
          }
        },
      });
    } catch {
      // Fallback
    }
  }

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      try {
        db.exec('BEGIN IMMEDIATE TRANSACTION;');
      } catch {
        // Some adapters may already be in transaction or simple mode
      }

      try {
        migration.up(db);
        if (typeof db.exec === 'function') {
          db.exec({
            sql: 'INSERT INTO schema_migrations (version, applied_at, description) VALUES (?, ?, ?);',
            bind: [migration.version, Date.now(), migration.description],
          });
        }
        try {
          db.exec('COMMIT;');
        } catch {
          // Pass
        }
      } catch (err) {
        try {
          db.exec('ROLLBACK;');
        } catch {
          // Pass
        }
        throw err;
      }
    }
  }
}
