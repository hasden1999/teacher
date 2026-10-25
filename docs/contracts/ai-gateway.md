# عقد بوابة الذكاء الاصطناعي والكلفة (`ai-gateway.md` — الوكيل A9)

## 1. القواعد الصارمة
- كل نداء لـ Gemini يمر عبر الخادم (`A9`) حصراً. لا وجود لمفتاح Gemini ولا لاسم النموذج في كود المتصفح.
- النموذج الأساسي في الإعدادات: `gemini-3.8-flash` (مستويات التفكير المسموحة: `low`، `medium`، `high`؛ ويُمنع `minimal` منعاً باتاً).
- المفتاح يجب أن يكون من مشروع Google Cloud مفعل عليه الفوترة (Paid Tier) لحماية خصوصية بيانات الطلاب.

## 2. دورة حياة المهمة (`AiJob`)
- الحالات: `queued_local` $\rightarrow$ `uploading` $\rightarrow$ `queued` $\rightarrow$ `processing` $\rightarrow$ `ready` | `failed` | `cancelled` $\rightarrow$ `reviewed`.
- فحص السقف الشهري العام للمعلم (`0.50$` افتراضياً بأسعار 2027) + الحاجز العددي للميزة قبل قبول المهمة، وحجز الكلفة التقديرية ثم تسويتها من `usageMetadata` الفعلية.
- عند الفشل (`failed`): يُعاد المبلغ المحجوز كاملاً لحساب المعلم.

## 3. مخططات المخرجات الـ 12 (`packages/contracts/ai`)
جميع المخرجات تُفحص بـ `Zod` قبل تسليمها للعميل:
1. `StudentListResult`
2. `VoiceSegmentsResult` (للنمطين A1 و A2)
3. `VoiceNamedResult` (للنمط B)
4. `HandwritingLayoutResult` (المرحلة 1 - `box_2d` بمقياس 0–1000)
5. `EquationDetailResult` (المرحلة 2 - LaTeX)
6. `RegisterTableResult`
7. `LatexResult`
8. `QuestionSetResult`
9. `AnswerKeyResult` (مع مقارنة حلّين مستقلين ووسم `disagreed`)
10. `ProofreadResult`
11. `LessonPlanResult`
12. `TocResult`
