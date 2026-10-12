# متطلبات النشر والاستضافة لبرنامج «مساعد المعلم» (Deployment & Hosting Guide)

## 1. الهيدرات الإلزامية للإنتاج (Mandatory Security Headers)

يعتمد تطبيق **مساعد المعلم** على قاعدة بيانات محلية فائقة الأداء عبر SQLite WASM مدمجة مع نظام الملفات الخاص بالأصل (`OPFS` - Origin Private File System) بنمط `SAHPool` (SyncAccessHandle Pool).
لكي يسمح المتصفح باستخدام `SharedArrayBuffer` ونظام `OPFS SAHPool`، **يجب إلزامياً** توفير الترويسات (Headers) التالية من خادم الاستضافة لجميع المسارات:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

> **تحذير:** بدون هذه الترويسات، سيعود المتصفح تلقائياً إلى نمط الذاكرة المؤقتة المؤقت (In-Memory) أو يفشل تخزين البيانات محلياً.

---

## 2. الإعدادات الجاهزة عبر المنصات

### أ) Vercel
تم ضبط الملف `vercel.json` تلقائياً لتطبيق ترويسات `COOP` و `COEP` على كافة المسارات `/(.*)`، مع تعطيل التخزين المؤقت لملفات `sw.js` و `index.html`.

### ب) Cloudflare Pages / Netlify
تم تضمين الملف `apps/pwa/public/_headers` ليتم نسخه تلقائياً إلى مجلد الإنتاج `dist/_headers`.

---

## 3. أمر البناء للإنتاج (Build Command)

```bash
pnpm run build
```

يقوم هذا الأمر ببناء الحزم الأساسية ثم تنفيذ:
```bash
tsc --noEmit && vite build
```
وينتج حزمة الإنتاج الجاهزة في مجلد `dist/` متضمنة:
- ملف الخدمة العامل `sw.js`
- ملف البيان `manifest.webmanifest`
- ملفات الخطوط وأيقونات التطبيق
- حزم الكود المحسنة والمقسمة (Katex, MathLive, PDF-Lib, Modern-Screenshot)
