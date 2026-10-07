# Project: مساعد المعلم (Iraqi Teacher Assistant PWA)

## Architecture

"مساعد المعلم" is an offline-first Standalone Progressive Web Application (PWA) designed specifically for Iraqi primary, intermediate, and secondary teachers. The system runs entirely within the client's browser with zero external CDN dependencies, utilizing SQLite WASM running inside a Dedicated Web Worker backed by the Origin Private File System (`opfs-sahpool` VFS), strict Web Locks concurrency control, and cryptographic Ed25519 license validation.

### Monorepo Structure
- **Package Manager**: `pnpm` workspaces.
- **Packages**:
  - `packages/core`: Pure TypeScript calculation and domain logic engines (Ministerial formulas, bidirectional grade conversion, Ed25519 licensing, anti-tamper clock, Arabic text/question parsing, numeral conversion, Iraqi school calendar). Zero UI dependencies. 100% unit test coverage.
  - `packages/content`: Iraqi Ministry of Education curriculum databases, lesson plan templates, question bank seed data, subject specializations.
  - `apps/pwa`: Vite + React 18 + TypeScript + Tailwind CSS with pure CSS logical properties (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) for native RTL. Contains the Dedicated SQLite Web Worker, PWA Service Worker (`injectManifest`), UI component hierarchy, and export pipelines.
  - `tests/e2e`: Opaque-box E2E test suite covering Tiers 1–4 requirement verification.

### System Data Flow
```
User / Teacher (Touch UI / RTL Single-Hand Friendly)
  │
  ▼
React 18 Application Shell (Tailwind Logical CSS, Tajawal / Amiri fonts)
  │
  ├─► Local State & Virtualized Virtual Tables (300+ students @ 60fps)
  │
  ├─► Worker RPC Client (Typed Message Channel)
  │     │
  │     ▼
  │   Dedicated Web Worker (`sqlite.worker.ts`)
  │     │  (Acquires navigator.locks 'techeeer_db_lock')
  │     ▼
  │   @sqlite.org/sqlite-wasm (opfs-sahpool VFS)
  │     │
  │     ├─► Primary DB: `/techeeer.sqlite3` in OPFS
  │     └─► Rolling Backup Engine: `/backups/techeeer_backup_*.sqlite3` (7 slots)
  │
  └─► Export Pipelines (Local):
        ├─► PDF Generator (`pdf-lib`)
        ├─► Image Exporter (`modern-screenshot`)
        └─► Printable CSS Engine (`@page` A4)
```

---

## Feature Inventory

Every feature requested in `ORIGINAL_REQUEST.md` (R1–R6) is inventoried and assigned to an exact milestone below:

| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Monorepo & Tooling Setup | pnpm workspace, TypeScript project references, Vitest harness | M1 | R1, Survey |
| 2 | Iraqi Ministerial Grade Formulas | Annual effort, midterm, final calculations, half-up rounding, decision marks | M1 | R2, Survey |
| 3 | Lossless Daily Activity Conversion | Bidirectional conversion between detailed (5×20) and simplified (100) | M1 | R2, Survey |
| 4 | Offline Ed25519 Licensing & Anti-Tamper Clock | Web Crypto Ed25519 signature validation, HWM storage & monotonic performance clock | M1 | R2, Survey |
| 5 | Arabic Question Parser & Calendar Helpers | Question tokenizer (س1, أ/ب, فراغات), Eastern/Western numeral conversion, Iraqi MoE calendar | M1 | R2, Survey |
| 6 | Iraqi Curriculum & Content Package | Canonical subjects, grade levels, chapters, and question bank seed items | M2 | R4, R5, Survey |
| 7 | OPFS SQLite Web Worker Engine | `@sqlite.org/sqlite-wasm` inside Web Worker with `opfs-sahpool`, typed RPC, Web Locks | M2 | R1, Survey |
| 8 | Automated 7-Snapshot OPFS Backup & 4-Stage Restore | 24h/50-mutation backup rotation, 16-byte magic header validation, PRAGMA integrity_check | M2 | R6, Survey |
| 9 | Offline PWA Shell & Asset Bundling | Vite PWA `injectManifest`, local Tajawal & Amiri font loading, wasm caching, zero CDN | M3 | R1, Survey |
| 10 | Standalone Installation Gate & In-App Escape | `beforeinstallprompt`, iOS standalone guide, escape routes for WhatsApp/Telegram/FB/IG | M3 | R1, Survey |
| 11 | Single-Hand RTL UI System & Design Tokens | Brand `#0F766E`, Tailwind logical properties, touch targets ≥ 48px, 360×640 responsive | M3 | R1, Survey |
| 12 | Classes, Divisions & Students Management | SQLite persistence, student profiles, Excel/CSV bulk import/export | M4 | R3, Survey |
| 13 | High-Performance Gradebook Studio | Virtualized scrolling 300+ students @ 60fps, bottom sheet keypad, batch-fill with 8s undo | M4 | R3, Survey |
| 14 | WhatsApp Student Evaluation Cards | Printable/shareable evaluation cards formatted for direct WhatsApp dispatch | M4 | R3, Survey |
| 15 | Question Studio & Dual-Mode Paper Editor | Structured manual editor & natural text paste-and-parse mode with synchronized AST | M5 | R4, Survey |
| 16 | Math Formula Editor & MathLive | KaTeX & mhchem rendering with lazy-loaded MathLive virtual equation keyboard | M5 | R4, Survey |
| 17 | Question Bank & Multi-Format Exporter | Subject/chapter filtered bank, `@page` A4 CSS print layout, `modern-screenshot`, `pdf-lib` | M5 | R4, Survey |
| 18 | Lesson Planning Studio & Teacher Isolation | MoE-aligned 5-step annual/daily plans, teacher subject filter, auto-rescheduling | M6 | R5, Survey |
| 19 | Student Data Privacy & Local Security | 100% local student data retention with zero network exfiltration/telemetry | M6 | R6, Survey |
| 20 | E2E Requirement Testing Suite (Tiers 1–4) | Complete opaque-box test suite covering 100% user requirements | M0 (Test Track) | Acceptance Criteria |
| 21 | Final Integration & Adversarial Verification | Tier 1–4 100% pass, Tier 5 adversarial hardening | M7 | Final Acceptance |

---

## Milestones

| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M0 | E2E Testing Suite Track | Design and implement opaque-box E2E test runner and test cases (Tiers 1–4) | None | IN_PROGRESS |
| M1 | Monorepo & Shared Core Engines | pnpm monorepo setup, `packages/core` calculation formulas, converters, crypto licensing, calendar, parser with 100% unit tests | None | PLANNED |
| M2 | Content Package & Offline OPFS SQLite Worker | `packages/content` curriculum data, `apps/pwa` SQLite Web Worker with `opfs-sahpool`, typed RPC, schema migrations, backup & restore | M1 | PLANNED |
| M3 | UI Foundation, Offline PWA Shell & Installation Gate | React 18, Tailwind RTL logical setup, local fonts, Vite PWA Service Worker, standalone install gate, in-app browser escape | M1 | PLANNED |
| M4 | Classes, Students & Gradebook Studio | Virtualized table (60fps), bottom sheet numeric keypad, batch-fill with 8s undo, WhatsApp evaluation cards, Excel/CSV import/export | M2, M3 | PLANNED |
| M5 | Question Studio, MathLive & Multi-Format Exporter | Dual-mode question editor, KaTeX/mhchem, MathLive lazy load, question bank, @page A4 print, PNG/PDF export | M2, M3 | PLANNED |
| M6 | Iraqi Curriculum, Lesson Plans & Privacy Isolation | 5-step lesson plans, teacher specialization filtering, auto-rescheduling engine, privacy enforcement | M2, M4 | PLANNED |
| M7 | Final E2E Integration Pass & Adversarial Hardening | Execute 100% of E2E tests (Tiers 1–4) until pass; Tier 5 adversarial stress testing | M0, M4, M5, M6 | PLANNED |

---

## Interface Contracts

### `@techeeer/core` API Contract
```typescript
// Grade Calculation
export interface GradeComponents {
  oral: number;          // 0-20
  written: number;       // 0-20
  homework: number;      // 0-20
  behavior: number;      // 0-20
  participation: number; // 0-20
}

export function calculateDetailedTotal(components: GradeComponents): number;
export function decomposeSimplifiedScore(score: number): GradeComponents;
export function rebalanceComponentsToTotal(current: GradeComponents, newTotal: number): GradeComponents;

export function calculateSemesterGrade(m1: number, m2: number): number;
export function calculateAnnualEffort(term1: number, midterm: number, term2: number): number;
export function calculateFinalResult(annualEffort: number, finalExam: number): number;
export function applyDecisionMarks(grades: { subjectId: string; score: number }[], decisionPool: number): {
  adjustedGrades: { subjectId: string; score: number }[];
  usedMarks: number;
  remainingMarks: number;
};

// Cryptographic Licensing & Clock Tracking
export interface LicensePayload {
  teacherId: string;
  teacherName: string;
  subject: string;
  issuedAt: number; // UTC unix ms
  expiresAt: number; // UTC unix ms
  tier: 'single' | 'school' | 'pro';
}

export interface VerificationResult {
  valid: boolean;
  tampered: boolean;
  payload?: LicensePayload;
  errorCode?: 'INVALID_SIGNATURE' | 'EXPIRED' | 'CLOCK_TAMPERED' | 'MALFORMED';
}

export function verifyEd25519License(token: string, publicKeyBytes: Uint8Array, currentHwmTime: number): Promise<VerificationResult>;

// Natural Text Parser & Numeral Conversion
export function toWesternNumerals(input: string): string;
export function toEasternNumerals(input: string): string;
export function parseArabicNumber(input: string): number | null;

export interface ParsedExamQuestion {
  questionNumber: number;
  header: string;
  subItems: Array<{ label: string; text: string; marks?: number }>;
  marks?: number;
}
export function parseExamPaperText(rawText: string): ParsedExamQuestion[];
```

### SQLite Web Worker RPC Protocol
```typescript
export type WorkerRequest =
  | { id: string; type: 'INIT'; payload: { dbName?: string } }
  | { id: string; type: 'EXEC'; payload: { sql: string; params?: unknown[] } }
  | { id: string; type: 'QUERY'; payload: { sql: string; params?: unknown[] } }
  | { id: string; type: 'TRANSACTION'; payload: { statements: Array<{ sql: string; params?: unknown[] }> } }
  | { id: string; type: 'BACKUP_CREATE'; payload?: {} }
  | { id: string; type: 'BACKUP_RESTORE'; payload: { backupData: ArrayBuffer } }
  | { id: string; type: 'EXPORT_DB'; payload?: {} };

export type WorkerResponse =
  | { id: string; success: true; data: unknown }
  | { id: string; success: false; error: string };
```

---

## Code Layout

```
d:/progect/techeeer/
├── pnpm-workspace.yaml
├── package.json
├── tsconfig.base.json
├── packages/
│   ├── core/
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   ├── vitest.config.ts
│   │   └── src/
│   │       ├── grades/
│   │       │   ├── formulas.ts
│   │       │   ├── conversion.ts
│   │       │   └── decision.ts
│   │       ├── crypto/
│   │       │   ├── ed25519.ts
│   │       │   └── clock.ts
│   │       ├── parser/
│   │       │   ├── examParser.ts
│   │       │   └── numerals.ts
│   │       ├── calendar/
│   │       │   └── iraqiCalendar.ts
│   │       └── index.ts
│   └── content/
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── curriculum/
│           │   ├── subjects.ts
│           │   └── chapters.ts
│           ├── questions/
│           │   └── bank.ts
│           ├── lessonPlans/
│           │   └── templates.ts
│           └── index.ts
├── apps/
│   └── pwa/
│       ├── package.json
│       ├── tsconfig.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── index.html
│       └── src/
│           ├── worker/
│           │   ├── sqlite.worker.ts
│           │   ├── dbClient.ts
│           │   ├── schema.ts
│           │   └── backup.ts
│           ├── components/
│           │   ├── common/
│           │   │   ├── InstallGate.tsx
│           │   │   ├── InAppEscapeModal.tsx
│           │   │   ├── Toast.tsx
│           │   │   └── BottomSheetKeypad.tsx
│           │   ├── gradebook/
│           │   │   ├── VirtualGradebookTable.tsx
│           │   │   ├── BatchFillModal.tsx
│           │   │   └── StudentCardModal.tsx
│           │   ├── questions/
│           │   │   ├── ExamEditor.tsx
│           │   │   ├── MathLiveEditor.tsx
│           │   │   ├── QuestionBankModal.tsx
│           │   │   └── ExamPrintView.tsx
│           │   └── plans/
│           │       ├── LessonPlanEditor.tsx
│           │       └── PlanTracker.tsx
│           ├── services/
│           │   ├── exportService.ts
│           │   ├── excelService.ts
│           │   └── whatsAppService.ts
│           ├── App.tsx
│           └── main.tsx
└── tests/
    └── e2e/
        ├── package.json
        ├── tsconfig.json
        ├── vitest.config.ts
        ├── runner.ts
        ├── tier1-features.test.ts
        ├── tier2-boundaries.test.ts
        ├── tier3-interactions.test.ts
        └── tier4-scenarios.test.ts
```
