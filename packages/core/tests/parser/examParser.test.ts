import { describe, it, expect } from 'vitest';
import {
  parseExamPaperText,
  parseExamPaperAST,
  serializeExamPaperAST,
  calculateExamTotalMarks,
  DEFAULT_EXAM_TYPOGRAPHY,
  LatexPreserver
} from '../../src/parser/examParser.js';

describe('examParser.ts - Natural Text Arabic Exam Parser & LaTeX Shielding', () => {
  describe('LatexPreserver', () => {
    it('should shield and restore inline math, display math, and chemical equations without corruption', () => {
      const preserver = new LatexPreserver();
      const raw = 'حل المعادلة $x^2 + 2x + 1 = 0$ والتكامل $$\\int_0^1 x dx$$ ومعادلة الماء \\ce{2H2 + O2 -> 2H2O}.';

      const protectedText = preserver.protect(raw);
      expect(protectedText).not.toContain('$x^2');
      expect(protectedText).not.toContain('\\int');
      expect(protectedText).not.toContain('\\ce{');

      const restored = preserver.restore(protectedText);
      expect(restored).toBe(raw);
    });
  });

  describe('parseExamPaperText and parseExamPaperAST', () => {
    it('should parse multi-question exam paper text conforming to PROJECT.md interface', () => {
      const text = `
جمهورية العراق
وزارة التربية
امتحان نصف السنة للعام الدراسي 2026 - 2027
المادة: الرياضيات
الصف: الثالث المتوسط
الوقت: ساعتان
ملاحظة: الإجابة عن جميع الأسئلة

س1: عرف ما يأتي: (10 درجات)
فرع أ: المقدار الجبري
فرع ب: التطبيق المتباين (5 درجات)

س2: علل ما يأتي: (20 درجة)
أولاً: لا يمكن قسمة أي عدد على الصفر
ثانياً: جذور المعادلة التربيعية متساوية إذا كان المميز صفراً

السؤال الثالث: احسب ناتج ما يأتي:
$f(x) = x^2 + 5x$ عندما $x = 2$
      `;

      const questions = parseExamPaperText(text);

      expect(questions.length).toBe(3);

      // Question 1
      expect(questions[0].questionNumber).toBe(1);
      expect(questions[0].header).toContain('س1');
      expect(questions[0].marks).toBe(10);
      expect(questions[0].subItems.length).toBe(2);
      expect(questions[0].subItems[0].label).toBe('أ');
      expect(questions[0].subItems[0].text).toContain('المقدار الجبري');
      expect(questions[0].subItems[1].label).toBe('ب');
      expect(questions[0].subItems[1].marks).toBe(5);

      // Question 2
      expect(questions[1].questionNumber).toBe(2);
      expect(questions[1].marks).toBe(20);
      expect(questions[1].subItems.length).toBe(2);
      expect(questions[1].subItems[0].label).toContain('أولاً');
      expect(questions[1].subItems[1].label).toContain('ثانياً');

      // Question 3
      expect(questions[2].questionNumber).toBe(3);
      expect(questions[2].mainText).toContain('$f(x) = x^2 + 5x$');
    });

    it('should extract exam header metadata in AST mode', () => {
      const text = `
جمهورية العراق
وزارة التربية
المديرية العامة لتربية الكرخ الأولى
ثانوية المتميزين للبنين
امتحان نهاية الفصل الأول 2026
مادة: الفيزياء
صف: الرابع العلمي
الزمن: ساعتان ونصف

س1: اذكر نقاط قانون نيوتن الثاني
      `;

      const ast = parseExamPaperAST(text);

      expect(ast.header.country).toBe('جمهورية العراق');
      expect(ast.header.ministry).toBe('وزارة التربية');
      expect(ast.header.schoolName).toContain('ثانوية المتميزين');
      expect(ast.header.examTitle).toContain('امتحان نهاية الفصل');
      expect(ast.header.subject).toContain('مادة: الفيزياء');
      expect(ast.header.grade).toContain('صف: الرابع العلمي');
      expect(ast.header.timeAllowed).toContain('ساعتان ونصف');
    });

    it('should extract dual and single mark words', () => {
      const text = `
س1: أجب عن الآتي:
فرع أ: السؤال الأول (درجتان)
فرع ب: السؤال الثاني (درجة واحدة)
      `;

      const questions = parseExamPaperText(text);
      expect(questions[0].subItems[0].marks).toBe(2);
      expect(questions[0].subItems[1].marks).toBe(1);
    });

    it('should correctly classify question types', () => {
      const definitions = parseExamPaperText('س1: عرف المصطلحات الآتية:');
      expect(definitions[0].type).toBe('DEFINITION');

      const reasoning = parseExamPaperText('س1: علل اثنين مما يأتي:');
      expect(reasoning[0].type).toBe('REASONING');

      const comparison = parseExamPaperText('س1: قارن بين الخلية النباتية والحيوانية:');
      expect(comparison[0].type).toBe('COMPARISON');

      const blanks = parseExamPaperText('س1: املأ الفراغات التالية بما يناسبها:');
      expect(blanks[0].type).toBe('FILL_BLANKS');

      const trueFalse = parseExamPaperText('س1: ضع علامة (✓) أو خطأ وصحح الخطأ:');
      expect(trueFalse[0].type).toBe('TRUE_FALSE');

      const mcq = parseExamPaperText('س1: اختر الإجابة الصحيحة من بين الأقواس:');
      expect(mcq[0].type).toBe('MCQ');

      const problem = parseExamPaperText('س1: احسب قيمة التيار الكهربائي:');
      expect(problem[0].type).toBe('PROBLEM');

      const enumeration = parseExamPaperText('س1: عدد أقسام السطح في العراق:');
      expect(enumeration[0].type).toBe('ENUMERATION');
    });

    it('should handle empty or whitespace input gracefully', () => {
      expect(parseExamPaperText('')).toEqual([]);
      expect(parseExamPaperText('   \n\n   ')).toEqual([]);

      const emptyAst = parseExamPaperAST('');
      expect(emptyAst.header).toEqual({});
      expect(emptyAst.questions).toEqual([]);
      expect(emptyAst.rawText).toBe('');
    });

    it('should parse unnumbered question headers and assign sequential numbers', () => {
      const text = `
س: عرّف ما يأتي باختصار
سؤال: اذكر فروض نظرية الكم
      `;
      const questions = parseExamPaperText(text);
      expect(questions.length).toBe(2);
      expect(questions[0].questionNumber).toBe(1);
      expect(questions[0].header).toContain('عرّف');
      expect(questions[1].questionNumber).toBe(2);
      expect(questions[1].header).toContain('اذكر');
    });

    it('should support multi-line question body text and multi-line branch text', () => {
      const text = `
س1: اقرأ النص التالي بعناية ثم أجب
ملاحظة هامة: الإجابة عن فرعين فقط
تعليمات إضافية: اكتب بخط واضح ومرتب
فرع أ: اكتب ما تعرفه عن تاريخ بغداد
حيث تأسست في العصر العباسي
وكانت عاصمة الخلافة
فرع ب: اشرح دور نهر دجلة
      `;
      const ast = parseExamPaperAST(text);
      expect(ast.questions.length).toBe(1);
      expect(ast.questions[0].mainText).toContain('ملاحظة هامة');
      expect(ast.questions[0].mainText).toContain('تعليمات إضافية');
      expect(ast.questions[0].branches.length).toBe(2);
      expect(ast.questions[0].branches[0].text).toContain('العصر العباسي');
      expect(ast.questions[0].branches[0].text).toContain('عاصمة الخلافة');
    });

    it('should handle question header without inline instruction and unlabelled branch prefix', () => {
      const text = `
س1:
فرع:
نص الفرع المكتوب في سطر تالٍ
      `;
      const ast = parseExamPaperAST(text);
      expect(ast.questions.length).toBe(1);
      expect(ast.questions[0].instruction).toBeUndefined();
      expect(ast.questions[0].header).toBe('س1');
      expect(ast.questions[0].branches.length).toBe(1);
      expect(ast.questions[0].branches[0].label).toBe('فرع');
      expect(ast.questions[0].branches[0].text).toContain('نص الفرع');
    });
  });

  describe('serializeExamPaperAST', () => {
    it('should serialize AST into formatted Arabic exam text preserving header and questions', () => {
      const text = `جمهورية العراق
وزارة التربية
المديرية العامة لتربية الكرخ
مدرسة المتميزين
امتحان نصف السنة للعام الدراسي 2026 - 2027
المادة: الكيمياء | الصف: الرابع العلمي | الوقت: ساعتان
ملاحظة: الإجابة عن خمسة أسئلة فقط

س1: عرف ما يأتي: (20 درجة)
فرع أ: المحلول المنظم (10 درجات)
فرع ب: التفاعل المتزن (10 درجات)

س2: احسب قيمة $pH$ للمحلول: (20 درجة)
$pH = -\\log[H^+]$`;

      const ast = parseExamPaperAST(text);
      const serialized = serializeExamPaperAST(ast);

      expect(serialized).toContain('جمهورية العراق');
      expect(serialized).toContain('وزارة التربية');
      expect(serialized).toContain('س1: عرف ما يأتي: (20 درجة)');
      expect(serialized).toContain('فرع أ: المحلول المنظم (10 درجات)');
      expect(serialized).toContain('س2: احسب قيمة $pH$ للمحلول: (20 درجة)');
      expect(serialized).toContain('$pH = -\\log[H^+]$');
    });

    it('should perform 100% lossless roundtrip: parse -> serialize -> parse with math and chemistry', () => {
      const original = `جمهورية العراق
وزارة التربية
المادة: الكيمياء

س1: اكتب معادلة تفكك كربونات الكالسيوم: (20 درجة)
فرع أ: التفاعل الكيميائي \\ce{CaCO3 -> CaO + CO2} (10 درجات)
فرع ب: طاقة التفاعل $\\Delta H = +178 \\text{ kJ/mol}$ (10 درجات)

س2: حل المسألة الآتية: (20 درجة)
فرع أ: أوجد جذور المعادلة $x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}$ (20 درجة)`;

      const ast1 = parseExamPaperAST(original);
      const serialized1 = serializeExamPaperAST(ast1);
      const ast2 = parseExamPaperAST(serialized1);

      expect(ast2.questions.length).toBe(ast1.questions.length);
      expect(ast2.questions[0].questionNumber).toBe(1);
      expect(ast2.questions[0].branches.length).toBe(2);
      expect(ast2.questions[0].branches[0].text).toContain('\\ce{CaCO3 -> CaO + CO2}');
      expect(ast2.questions[0].branches[1].text).toContain('$\\Delta H = +178 \\text{ kJ/mol}$');
      expect(ast2.questions[1].branches[0].text).toContain('\\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}');
      expect(ast2.questions[0].marks).toBe(20);
      expect(ast2.questions[1].marks).toBe(20);
    });
  });

  describe('calculateExamTotalMarks', () => {
    it('should calculate total marks and detect 100-mark compliance', () => {
      const text = `
س1: السؤال الأول (20 درجة)
فرع أ: أ (10 درجات)
فرع ب: ب (10 درجات)

س2: السؤال الثاني (20 درجة)
س3: السؤال الثالث (20 درجة)
س4: السؤال الرابع (20 درجة)
س5: السؤال الخامس (20 درجة)
      `;
      const ast = parseExamPaperAST(text);
      const summary = calculateExamTotalMarks(ast.questions);

      expect(summary.totalMarks).toBe(100);
      expect(summary.isStandard100).toBe(true);
      expect(summary.questionCount).toBe(5);
      expect(summary.questionsWithMarks).toBe(5);
      expect(summary.unassignedCount).toBe(0);
      expect(summary.breakdown.length).toBe(5);
      expect(summary.breakdown[0].marks).toBe(20);
    });

    it('should flag non-100 mark totals and calculate marks from branches when question mark is omitted', () => {
      const text = `
س1: سؤال بدون درجة صريحة
فرع أ: الأول (15 درجة)
فرع ب: الثاني (15 درجة)

س2: سؤال آخر (30 درجة)
س3: سؤال بدون درجات
      `;
      const ast = parseExamPaperAST(text);
      const summary = calculateExamTotalMarks(ast.questions);

      expect(summary.totalMarks).toBe(60);
      expect(summary.isStandard100).toBe(false);
      expect(summary.questionCount).toBe(3);
      expect(summary.questionsWithMarks).toBe(2);
      expect(summary.unassignedCount).toBe(1);
      expect(summary.breakdown[0].marks).toBe(30);
      expect(summary.breakdown[0].isFromBranches).toBe(true);
      expect(summary.breakdown[1].marks).toBe(30);
      expect(summary.breakdown[1].isFromBranches).toBe(false);
      expect(summary.breakdown[2].marks).toBe(0);
    });
  });

  describe('DEFAULT_EXAM_TYPOGRAPHY', () => {
    it('should define official ministerial typography defaults', () => {
      expect(DEFAULT_EXAM_TYPOGRAPHY.fontFamily).toBe('Amiri');
      expect(DEFAULT_EXAM_TYPOGRAPHY.headerWeight).toBe('bold');
      expect(DEFAULT_EXAM_TYPOGRAPHY.bodyWeight).toBe('normal');
      expect(DEFAULT_EXAM_TYPOGRAPHY.scale).toBe('medium');
      expect(DEFAULT_EXAM_TYPOGRAPHY.lineSpacing).toBe('normal');
      expect(DEFAULT_EXAM_TYPOGRAPHY.showDecorations).toBe(true);
    });
  });
});
