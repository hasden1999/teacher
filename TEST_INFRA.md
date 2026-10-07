# TEST_INFRA — E2E Test Suite Infrastructure & Strategy
## تطبيق "مساعد المعلم" (Iraqi Teacher Assistant Standalone PWA)

---

## 1. Test Philosophy (فلسفة الاختبار)

The E2E test suite for **"مساعد المعلم" (Iraqi Teacher Assistant PWA)** follows a strict **Opaque-Box, Requirement-Driven** philosophy. 
Tests are not written to mirror the internal code implementation details; instead, they rigorously assert the external contracts, behavioral specifications, domain invariants, and ministerial regulations recorded in `ORIGINAL_REQUEST.md` and `PROJECT.md`.

### Core Principles
1. **Opaque-Box Verification**: The test suite treats the application as an opaque system driven by domain contracts, RPC message protocols, user interaction events, and persisted state. Tests verify observable inputs, outputs, state transitions, and file artifacts without coupling to internal class/function private members.
2. **Authoritative Output Derivation**: Every expected value is derived from an authoritative source:
   - **Ministerial Grading**: Official Iraqi Ministry of Education Examination Regulation No. 18 of 1987 and ministerial evaluation circulars.
   - **Cryptographic Licensing**: W3C Web Cryptography API Ed25519 signature standards and monotonic clock invariant proofs.
   - **Arabic Numeral & Question Parsing**: Linguistic token grammar for Iraqi national exams (`س1`, `أ/ب/ج`, `(20 درجة)`).
   - **Curriculum & Calendar**: Iraqi official holidays (fixed and lunar Hijri) and 5-step pedagogical lesson plan structures.
   - **Local Storage & Backup**: SQLite 3 16-byte magic header specification (`SQLite format 3\000`), rolling 7-snapshot retention, and sandboxed integrity verification.
3. **Progressive Testability & Zero-Dependency Execution**: The test harness is self-contained and runnable immediately at Milestone 0. It models the authoritative domain oracles and contract specifications, and dynamically interfaces with the monorepo packages (`@techeeer/core`, `@techeeer/content`, `@techeeer/pwa`) as milestones are delivered.
4. **Adversarial & Edge-Case Rigor**: Boundary conditions, malformed payloads, backward clock tampering, corrupted database headers, Arabic RTL/LTR bidirectional text mixing, and extreme class sizes (0 to 500 students) are systematically subjected to adversarial stress.

---

## 2. Feature Inventory & Test Tier Mapping

Every user requirement from `ORIGINAL_REQUEST.md` (R1–R6) is mapped into a 4-tier testing hierarchy:

| Req Area | Feature ID | Feature Name | Description | Tier 1 (Features) | Tier 2 (Boundaries) | Tier 3 (Interactions) | Tier 4 (Workflows) | Total Tests |
|---|---|---|---|---|---|---|---|---|
| **R1** | F01 | Offline PWA Shell & Asset Caching | Service worker offline precache, zero CDN requests, Tajawal/Amiri fonts | 5 | 5 | 1 | 1 | 12 |
| **R1** | F02 | Standalone Install Gate & In-App Escape | Android `beforeinstallprompt`, iOS guide, Telegram/WhatsApp in-app browser routing | 5 | 5 | 1 | 1 | 12 |
| **R1** | F03 | Dedicated SQLite Web Worker & OPFS Engine | `@sqlite.org/sqlite-wasm` via `opfs-sahpool`, Web Locks API concurrency, typed RPC | 5 | 5 | 2 | 1 | 13 |
| **R2** | F04 | Iraqi Ministerial Grade Formulas | Semester averages, annual effort, final status, half-up rounding, decision marks | 5 | 5 | 2 | 1 | 13 |
| **R2** | F05 | Lossless Daily Activity Conversion | Bidirectional conversion between detailed (5×20) and simplified (100) scores | 5 | 5 | 2 | 1 | 13 |
| **R2** | F06 | Ed25519 Cryptographic Licensing | Offline Ed25519 Web Crypto signature verification, license payload decoding | 5 | 5 | 2 | 1 | 13 |
| **R2** | F07 | Monotonic Anti-Tamper Clock | High-water mark time tracking in SQLite, rollback detection, runtime variance | 5 | 5 | 2 | 1 | 13 |
| **R2** | F08 | Arabic Numeral & Text Converters | Eastern/Western numeral conversion, decimal separators, Arabic number parser | 5 | 5 | 1 | 1 | 12 |
| **R2** | F09 | Arabic Natural Exam Parser | Recursive descent tokenizer for `س1`, branches `أ/ب`, question types, marks | 5 | 5 | 2 | 1 | 13 |
| **R2** | F10 | Iraqi MoE School Calendar Engine | Semester boundaries, national/religious holiday skipping, net teaching weeks | 5 | 5 | 2 | 1 | 13 |
| **R3** | F11 | Classes, Divisions & Student Management | SQLite persistence, student profiles, Excel/CSV bulk import/export | 5 | 5 | 2 | 1 | 13 |
| **R3** | F12 | Virtualized Gradebook Studio | 300+ students @ 60fps virtualized table, sticky headers, single-hand UX | 5 | 5 | 2 | 1 | 13 |
| **R3** | F13 | Bottom Sheet Numeric Keypad | Touch-friendly thumb-zone keypad, quick buttons, auto-advance, haptic feedback | 5 | 5 | 1 | 1 | 12 |
| **R3** | F14 | Column Batch-Fill & 8s Undo Toast | Mass column scoring, circular countdown timer, memory snapshot rollback | 5 | 5 | 2 | 1 | 13 |
| **R3** | F15 | WhatsApp Student Evaluation Cards | Formatted Arabic parent cards, deep-link dispatch, printable PNG cards | 5 | 5 | 2 | 1 | 13 |
| **R4** | F16 | Dual-Mode Exam Paper Studio | Synchronized structured manual tree and natural text paste-and-parse modes | 5 | 5 | 2 | 1 | 13 |
| **R4** | F17 | KaTeX & Lazy MathLive Formula Editor | Math equations, `mhchem` chemical formulas, lazy-loaded MathLive keypad | 5 | 5 | 2 | 1 | 13 |
| **R4** | F18 | Subject-Filtered Question Bank | MoE-aligned curriculum questions, chapter filters, previous ministerial items | 5 | 5 | 2 | 1 | 13 |
| **R4** | F19 | Multi-Format Exam Paper Exporter | `@page` A4 CSS print layout, `modern-screenshot` PNG, `pdf-lib` document | 5 | 5 | 2 | 1 | 13 |
| **R5** | F20 | Iraqi MoE Curriculum & Lesson Plans | 5-step ministerial daily plan, annual distribution, teacher subject scoping | 5 | 5 | 2 | 1 | 13 |
| **R5** | F21 | Lesson Progress Tracker & Rescheduler | Completed vs postponed lessons, ripple-shift rescheduling across teaching weeks | 5 | 5 | 2 | 1 | 13 |
| **R6** | F22 | Rotating 7-Snapshot OPFS Backups | Automated backup every 24h or 50 mutations, retaining latest 7 snapshots | 5 | 5 | 2 | 1 | 13 |
| **R6** | F23 | Multi-Stage Safe Restore Pipeline | 16-byte magic header check, sandboxed `PRAGMA integrity_check`, atomic swap | 5 | 5 | 2 | 1 | 13 |
| **R6** | F24 | Absolute Student Data Privacy | 100% local student retention, zero telemetry, zero external network leakage | 5 | 5 | 1 | 1 | 12 |
| **Total**| **24** | **All System Capabilities** | **Comprehensive Full-Spectrum Coverage** | **120** | **120** | **16** | **4** | **260** |

---

## 3. Tier Taxonomy & Test Design

### Tier 1: Feature Coverage (>=5 test cases per feature across R1-R6)
- **Objective**: Validate the happy path, primary functional specification, and state progression for every feature.
- **Coverage**: 120 rigorous unit & feature test cases covering F01 through F24.
- **File**: `tests/e2e/tier1-features.test.ts`

### Tier 2: Boundary & Corner Cases (>=5 test cases per feature area)
- **Objective**: Test system resilience under extreme limits, edge inputs, adversarial strings, and corrupted data.
- **Coverage**: 120 boundary test cases focusing on:
  - Numerical limits: `0`, `100`, `49` vs `50`, negative values (`-10`), overflow (`105`, `9999`).
  - Rounding edges: `49.49` vs `49.50`, division remainders with modulo 5.
  - Licensing boundaries: Token expiration at `exp - 1ms` vs `exp + 1ms`, clock backward drift by 1s, 61s, 1 year.
  - String & Unicode edges: Arabic diacritics (تشكيل), zero-width non-joiners, Persian digits (`۰-۹`), massive question text (10,000 words).
  - Storage & Backup edges: Corrupted magic headers (`SQLite format 2`), 0-byte files, 511-byte truncated files, rapid 50-mutation boundaries.
- **File**: `tests/e2e/tier2-boundaries.test.ts`

### Tier 3: Pairwise Cross-Feature Interactions
- **Objective**: Test multi-component integration and state coupling between distinct modules.
- **Coverage**: 16 cross-feature pairwise scenarios:
  1. Grade Conversion (5×20 ↔ 100) + Ministerial Decision Marks + Parent WhatsApp Card Export.
  2. Ed25519 License Validation + Monotonic Clock Tampering + Feature Gating.
  3. Natural Text Exam Parser + KaTeX/mhchem Formula Rendering + `@page` A4 Print Layout.
  4. Lesson Plan Auto-Rescheduling + Iraqi MoE Calendar Holidays + Teacher Specialization Scoping.
  5. Bulk Excel Student Import + Virtual Gradebook Batch-Fill + 8s Undo + 50-Mutation Backup Trigger.
  6. Dedicated SQLite Web Worker RPC + Web Locks Concurrency + 16-Byte Header Restore Pipeline.
  7. Bottom Sheet Touch Keypad Auto-Advance + Color Coded Thresholds (<50) + Absence Tracking.
  8. Teacher Profile Subject Switching + Question Bank Re-scoping + Lesson Plan Template Filtering.
- **File**: `tests/e2e/tier3-interactions.test.ts`

### Tier 4: Real-World Classroom Teacher Workflows
- **Objective**: Simulate end-to-end multi-step pedagogical journeys of Iraqi teachers in real-world school settings.
- **Coverage**: 4 comprehensive realistic journeys:
  - **Journey 1 (Grading Lifecycle)**: Teacher Ahmed (3rd Intermediate Mathematics) creates a class of 45 students, inputs 5×20 daily marks, switches to simplified mode, inputs midterm grades, applies 5 decision marks to rescue failing students from 46 to 50, and exports parent evaluation cards.
  - **Journey 2 (Exam Paper Creation)**: Teacher Zainab (5th Scientific Chemistry) drafts an official ministerial-format exam paper via natural text paste, adds KaTeX equations and $\ce{H2SO4}$ chemical reactions via lazy MathLive, inserts past ministerial questions, and compiles an A4 print layout.
  - **Journey 3 (Annual Planning & Rescheduling)**: Teacher Karrar (5th Primary Science) builds a 32-week annual plan with 5-step daily lessons, marks emergency rain postponement days, and triggers automatic ripple-shift rescheduling across the Iraqi school calendar.
  - **Journey 4 (Disaster Recovery & Privacy Audit)**: Teacher Fatima (1st Intermediate Arabic) records student marks triggering 50-mutation automatic rolling backup, tests 7-snapshot retention, verifies rejection of corrupted backup files, successfully executes an atomic hot-swap restore, and audits zero external network exfiltration.
- **File**: `tests/e2e/tier4-scenarios.test.ts`

---

## 4. Test Architecture & Runner Setup

### Directory Layout
```text
tests/e2e/
├── package.json               # Test package configuration & scripts
├── tsconfig.json              # TypeScript configuration
├── vitest.config.ts           # Vitest configuration
├── runner.ts                  # Universal test runner executable
├── harness/                   # Authoritative specification oracles & test framework
│   ├── test-framework.ts      # BDD primitives (describe, it, expect) & assertion engine
│   ├── grade-oracle.ts        # Iraqi ministerial grading reference engine
│   ├── crypto-oracle.ts       # Ed25519 & monotonic clock validation oracle
│   ├── parser-oracle.ts       # Arabic exam parser & numeral conversion oracle
│   ├── calendar-oracle.ts     # Iraqi MoE calendar & rescheduling engine
│   ├── storage-oracle.ts      # OPFS SQLite worker RPC, backup & restore validator
│   └── index.ts               # Unified harness exports
├── tier1-features.test.ts     # Tier 1 Feature Coverage test suite
├── tier2-boundaries.test.ts   # Tier 2 Boundary & Corner Cases test suite
├── tier3-interactions.test.ts # Tier 3 Pairwise Cross-Feature test suite
└── tier4-scenarios.test.ts    # Tier 4 Real-World Classroom Workflows test suite
```

### Execution Commands
1. **Primary Universal Runner (Fast, Zero Dependency via Node 24)**:
   ```bash
   node --experimental-strip-types tests/e2e/runner.ts
   ```
2. **Vitest E2E Suite Execution (via pnpm)**:
   ```bash
   pnpm --filter @techeeer/tests-e2e test
   ```
3. **Running Specific Tiers**:
   ```bash
   node --experimental-strip-types tests/e2e/runner.ts --tier=1
   node --experimental-strip-types tests/e2e/runner.ts --tier=2
   node --experimental-strip-types tests/e2e/runner.ts --tier=3
   node --experimental-strip-types tests/e2e/runner.ts --tier=4
   ```

---

## 5. Verification Matrix & Quality Criteria

| Verification Metric | Required Threshold | Verification Method |
|---|---|---|
| **Tier 1 Feature Pass Rate** | 100% (120 / 120) | Automated execution via `runner.ts` |
| **Tier 2 Boundary Pass Rate** | 100% (120 / 120) | Automated execution via `runner.ts` |
| **Tier 3 Interactions Pass Rate** | 100% (16 / 16) | Automated execution via `runner.ts` |
| **Tier 4 Scenarios Pass Rate** | 100% (4 / 4) | Automated execution via `runner.ts` |
| **Total Test Count** | >= 260 tests | Automated tally in runner output |
| **Execution Time** | < 10 seconds | Built-in high-resolution timer |
| **Ministerial Regulation Fidelity** | 100% | Exact match with Iraqi MoE Regulation No. 18 |
| **Local Privacy Guarantee** | 0 external network requests | Local execution assertion |
