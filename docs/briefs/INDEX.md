# فهرس ملخصات مهام الوكلاء (`docs/briefs/INDEX.md`)

> عملاً بالقسم `0.2` من `docs/PLAN.md`: لا يُسلَّم ملف الخطة الكامل لأي وكيل منفّذ، بل يقرأ كل وكيل ملف الملخص الخاص به والعقد المرتبط به فقط.

| الوكيل | المسمى | المجلدات المملوكة | العقود المرجعية |
|---|---|---|---|
| **A01** | Foundation & DevOps | `infra/`, `apps/server/Dockerfile` | `ARCHITECTURE.md` |
| **A02** | Data, Sync & Safety | `apps/pwa/src/worker/schema.ts`, `apps/pwa/src/lib/sync/`, `apps/server/prisma/` | `docs/contracts/sync-protocol.md` |
| **A03** | Auth & Licensing | `apps/pwa/src/services/authService.ts`, `apps/server/src/auth/` | `docs/contracts/sync-protocol.md` |
| **A04** | Admin Panel | `apps/pwa/src/components/admin/`, `apps/server/src/admin/` | `docs/contracts/ai-gateway.md` |
| **A05** | Pure Mobile UI & PWA Shell | `apps/pwa/src/components/layout/`, `apps/pwa/src/index.css` | `docs/DESIGN_SYSTEM.md` |
| **A06** | Students & Arabic Utils | `packages/arabic-utils/`, `apps/pwa/src/components/classes/` | `docs/contracts/arabic-math-tools.md` |
| **A07** | Grading Engine & Studio | `packages/grading-engine/`, `apps/pwa/src/components/gradebook/` | `docs/contracts/grading-engine.md` |
| **A08** | Voice Grades | `apps/pwa/src/components/gradebook/VoiceGradeEntryModal.tsx`, `scripts/eval-voice/` | `docs/contracts/ai-gateway.md`, `arabic-math-tools.md` |
| **A09** | AI Gateway & Quotas | `packages/contracts/src/ai.ts`, `apps/server/src/ai/`, `scripts/cost-model/` | `docs/contracts/ai-gateway.md` |
| **A10** | Questions & Exams | `apps/pwa/src/components/questions/ExamEditor.tsx` | `docs/contracts/arabic-math-tools.md` |
| **A11** | Handwriting OCR & Register Import | `apps/pwa/src/components/questions/HandwritingOcrModal.tsx`, `scripts/eval-ocr/` | `docs/contracts/ai-gateway.md` |
| **A12** | QA & Verifier | `tests/e2e/` | جميع العقود |
| **A13** | Daily Ops & Today Screen | `apps/pwa/src/features/today/`, `apps/pwa/src/features/daily/` | `docs/DESIGN_SYSTEM.md`, `grading-engine.md` |
| **A14** | Planning & Curriculum | `packages/content/`, `apps/pwa/src/components/plans/` | `docs/DESIGN_SYSTEM.md` |
| **A15** | Reports & Printing | `apps/pwa/src/services/exportService.ts`, `apps/pwa/src/features/reports/` | `docs/contracts/grading-engine.md` |
| **A16** | Math & Equations | `packages/math-tools/`, `apps/pwa/src/components/questions/MathFormulaEditor.tsx` | `docs/contracts/arabic-math-tools.md` |
| **A17** | Security & Privacy Reviewer | `docs/reports/A17-*.md` | `docs/contracts/ai-gateway.md`, `sync-protocol.md` |
