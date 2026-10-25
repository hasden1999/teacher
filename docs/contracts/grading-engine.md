# عقد محرك الدرجات (`packages/grading-engine`)

## 1. المبادئ الحاكمة
- حزمة TypeScript نقية 100% بلا أي اعتماد على React أو قاعدة البيانات أو الشبكة.
- التوزيع والصيغ عبارة عن **بيانات مخطط JSON (`ScoreScheme`)** وليس شروطاً جامدة في الكود.
- يُمنع استخدام `eval` أو أي محلل تعابير نصية ديناميكي؛ المحرك يدعم الصيغ المحددة: `average`، `weightedAverage`، `sum`.
- القيم الناقصة (`null`/`undefined`) لا تُعامل كصفر بصمت أبداً، بل تعيد الحالة `incomplete` مع مصفوفة `missingFields`.

## 2. واجهة البرمجة الإلزامية (API)
- `evaluate(scheme: ScoreScheme, data: StudentGradeInput): EvaluationResult`
  - يحسب الدرجات الرسمية لكل عقدة (`month1`, `month2`, `term1`, `halfYearExam`, `month3`, `month4`, `term2`, `annualSaee`, `finalExam`, `final`).
  - يعيد حالة النجاح (`pass` / `fail` / `incomplete`).
- `project(scheme: ScoreScheme, data: StudentGradeInput): ProjectionResult`
  - يحسب إسقاطاً مؤقتاً بمتوسط ما هو متوفر فقط، ويوسم النتيجة دائماً بـ `isTemporary: true` ولا يدخل في الطباعة الرسمية.
- `solveFor(scheme: ScoreScheme, data: StudentGradeInput, targetNode: 'finalExam', targetValue?: number): SolveForResult`
  - يحسب الدرجة المطلوبة في الامتحان النهائي لبلوغ درجة النجاح (`passMark` افتراضياً `50`).
- `explain(scheme: ScoreScheme, data: StudentGradeInput, nodeId: string): ExplanationNode`
  - يعيد شجرة التفسير بالعربية (اسم الصيغة، المدخلات بقيمها، والناتج) لعرضها عند ضغط المعلم على أي رقم محسوب.
- `deriveMonthlyComponents(scheme: ScoreScheme, events: DailyEventRecord[], recordedSessionsCount: number): DerivedComponentsResult`
  - يشتق مقترحات المكونات الشهرية (الحضور، النشاط، السلوك، التحضير) وفق قواعد القسم 6.3.
