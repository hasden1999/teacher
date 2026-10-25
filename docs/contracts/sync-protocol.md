# عقد المزامنة وقاعدة البيانات المحلية (`sync-protocol.md`)

## 1. التخزين المحلي (SQLite OPFS Worker)
- جميع عمليات القراءة والكتابة في الواجهة تمر عبر `dbClient` إلى `sqlite.worker.ts` فقط.
- كل كيان مزامَن يحمل الحقول: `id` (UUID v4 يُولَّد على الجهاز)، `updated_at`، `deleted_at` (حذف ناعم)، `version`.
- أحداث التسجيل اليومي (`daily_events`) وسجل تغييرات الدرجات (`grade_history`) هي **Append-Only** (لا تعديل عليها، وإلغاؤها يتم بحدث عكسي).

## 2. صندوق الصادر (`sync_outbox`)
- كل تعديل محلي ينشئ عملية:
  - `opId`: UUID فريد (مفتاح idempotency).
  - `entityType`: اسم الكيان (`Student`, `GradeCell`, `DailyEvent`, ...).
  - `entityId`: معرّف السجل.
  - `opType`: `'upsert' | 'delete' | 'append'`.
  - `payload`: الحقول المعدّلة (JSON).
  - `deviceId`: معرّف الجهاز المسجل.
  - `opVersion`: إصدار المخطط.

## 3. نقاط الخادم وإصدارات التوافق
- `POST /api/sync/push` و `GET /api/sync/pull?cursor=`
- الرؤوس الإلزامية: `X-App-Version` و `X-Schema-Version`.
- عند رد الخادم بـ `426 Upgrade Required`: تتوقف المزامنة فقط، وتبقى القراءة والتعديل المحلي والتصدير متاحة بالكامل.
- التعارض في خلايا الدرجات (`GradeCell`): يُحلّ على مستوى الحقل بالأحدث (`Last-Write-Wins per field`) مع تسجيل القيمة السابقة والجديدة في `GradeHistory` وإشعار المعلم.
