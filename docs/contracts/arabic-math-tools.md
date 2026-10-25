# عقد اللغويات العربية وأدوات المعادلات (`arabic-math-tools.md`)

## 1. حزمة `packages/arabic-utils`
- `normalizeArabicName(name: string): string`
  - إزالة التشكيل والتطويل، توحيد `(أ، إ، آ -> ا)`، `(ى -> ي)`، `(ة -> ه)`، وتوحيد المسافات **لأغراض المطابقة والبحث فقط** مع الحفاظ على الاسم الأصلي للعرض.
- `matchStudentName(spokenName: string, roster: Array<{ id: string; name: string }>): NameMatchResult`
  - مطابقة مبنية على الكلمات (Token-based Jaro-Winkler / Levenshtein) بعد التطبيع؛ إذا تساوى الاسم الأول لأكثر من طالب ولم يكفِ الباقي للتمييز تعود الحالة `ambiguous`.
- `parseIraqiSpokenGrade(text: string): SpokenGradeParseResult`
  - محلل حتمي للأرقام باللهجة العراقية والكسور (`ونص` $+0.5$، `وربع` $+0.25$، `إلا ربع` $-0.25$) وحالة الغياب (`غايب`، `غائب`، `ما حضر` $\rightarrow$ `'absent'`).

## 2. حزمة `packages/math-tools`
- `convertNaturalMathToLatex(input: string, options?: { arabicVariables?: boolean }): MathConversionResult`
  - محوّل حتمي يعمل أوفلاين يحوّل العبارات الطبيعية العربية والإنجليزية (`س تربيع`، `جذر(...)`، `a/b`، رموز يونانية، مشتقات، تكاملات) إلى `LaTeX`.
- `EQUATION_LIBRARY`: مكتبة القوانين والمعادلات الجاهزة للفيزياء والكيمياء والرياضيات مقسمة حسب المادة والصف.
