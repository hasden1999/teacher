import { describe, it, expect, vi } from 'vitest';
import {
  INITIAL_SCHEMA_DDL,
  CANONICAL_TABLE_NAMES,
  MIGRATIONS,
  runMigrations,
} from '../src/worker/schema.js';

describe('SQLite Database Schema & Migrations', () => {
  it('should define all 12 canonical tables in DDL and table directory', () => {
    expect(CANONICAL_TABLE_NAMES).toHaveLength(12);

    const expectedTables = [
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
    ];

    for (const table of expectedTables) {
      expect(CANONICAL_TABLE_NAMES).toContain(table);
      expect(INITIAL_SCHEMA_DDL).toContain(`CREATE TABLE IF NOT EXISTS ${table}`);
    }
  });

  it('should enforce relational constraints and foreign keys', () => {
    expect(INITIAL_SCHEMA_DDL).toContain('REFERENCES classes(id) ON DELETE CASCADE');
    expect(INITIAL_SCHEMA_DDL).toContain('REFERENCES divisions(id) ON DELETE CASCADE');
    expect(INITIAL_SCHEMA_DDL).toContain('REFERENCES students(id) ON DELETE CASCADE');
    expect(INITIAL_SCHEMA_DDL).toContain('REFERENCES subjects(id) ON DELETE CASCADE');
    expect(INITIAL_SCHEMA_DDL).toContain('REFERENCES academic_terms(id) ON DELETE CASCADE');
    expect(INITIAL_SCHEMA_DDL).toContain("CHECK (gender IN ('male', 'female'))");
    expect(INITIAL_SCHEMA_DDL).toContain("CHECK (stage IN ('primary', 'intermediate', 'preparatory'))");
  });

  it('should define unique constraint on student grades', () => {
    expect(INITIAL_SCHEMA_DDL).toContain(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_student_subject_term_cat \nON grades(student_id, subject_id, term_id, category);'
    );
  });

  it('should execute schema migrations sequentially and record applied versions', () => {
    const executedSql: string[] = [];
    const insertedMigrations: any[] = [];

    const mockDb = {
      exec: vi.fn((opts: any) => {
        if (typeof opts === 'string') {
          executedSql.push(opts);
        } else if (opts?.sql) {
          executedSql.push(opts.sql);
          if (opts.sql.includes('INSERT INTO schema_migrations')) {
            insertedMigrations.push(opts.bind);
          }
        }
      }),
      selectObjects: vi.fn(() => []), // No migrations previously applied
    };

    runMigrations(mockDb);

    expect(mockDb.exec).toHaveBeenCalled();
    expect(insertedMigrations).toHaveLength(MIGRATIONS.length);
    expect(insertedMigrations[0][0]).toBe(1); // Version 1
    expect(insertedMigrations[0][2]).toContain('12 core tables');
  });

  it('should skip previously applied migrations idempotently', () => {
    const mockDb = {
      exec: vi.fn(),
      selectObjects: vi.fn(() => [{ version: 1 }]), // Version 1 already applied
    };

    runMigrations(mockDb);

    // Initial schema migration up should not be called again
    const migration1Calls = mockDb.exec.mock.calls.filter((c) =>
      typeof c[0] === 'object' && c[0].sql?.includes('INSERT INTO schema_migrations')
    );
    expect(migration1Calls).toHaveLength(0);
  });
});
