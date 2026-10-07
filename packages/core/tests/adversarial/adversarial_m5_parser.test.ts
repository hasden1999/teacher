import { describe, it, expect } from 'vitest';
import {
  parseExamPaperAST,
  serializeExamPaperAST,
  calculateExamTotalMarks,
  LatexPreserver,
} from '../../src/parser/examParser.js';

describe('Adversarial Stress Suite: Milestone 5 Core Exam Parser & AST', () => {
  describe('1. Malformed and Boundary Inputs in Exam Text', () => {
    it('handles empty, whitespace, and null-like inputs without error', () => {
      expect(parseExamPaperAST('')).toEqual({
        header: {},
        questions: [],
        rawText: '',
      });
      expect(parseExamPaperAST('   \n\n  \t  \n  ')).toEqual({
        header: {},
        questions: [],
        rawText: '   \n\n  \t  \n  ',
      });
    });

    it('handles text with zero question headers (garbage/prose)', () => {
      const garbage = `هذا مجرد مقال عام بدون أي أسئلة
يتحدث عن التعليم في العراق وتطوير المناهج الدراسية
الصف الثالث المتوسط
ملاحظة: اقرأ بتمعن`;
      const ast = parseExamPaperAST(garbage);
      expect(ast.questions).toHaveLength(0);
      expect(ast.header.grade).toBe('الصف الثالث المتوسط');
      expect(ast.header.generalNote).toBe('ملاحظة: اقرأ بتمعن');

      const serialized = serializeExamPaperAST(ast);
      expect(typeof serialized).toBe('string');
    });

    it('handles corrupted header lines and pipe delimiters without exceptions', () => {
      const corruptHeaders = `||||||
| جمهورية العراق |
وزارة التربية ||| المديرية العامة للتربية في بغداد الرصافة الأولى |
| | | |
المادة: الفيزياء | | الصف: السادس العلمي | الوقت: ساعتان ونصف |
:::::
------
س1: عرف ما يأتي (10 درجات)`;

      const ast = parseExamPaperAST(corruptHeaders);
      expect(ast.header.country).toBe('جمهورية العراق');
      expect(ast.header.ministry).toBe('وزارة التربية');
      expect(ast.header.subject).toBe('المادة: الفيزياء');
      expect(ast.header.grade).toBe('الصف: السادس العلمي');
      expect(ast.header.timeAllowed).toBe('الوقت: ساعتان ونصف');
      expect(ast.questions).toHaveLength(1);
      expect(ast.questions[0].questionNumber).toBe(1);
    });

    it('handles non-sequential, duplicated, and Arabic-indic question numbers', () => {
      const weirdQuestions = `س5: السؤال الخامس أولاً (10 درجات)
س5: السؤال الخامس مكرر (10 درجات)
س١٠: السؤال العاشر بالأرقام الشرقية (10 درجات)
السؤال الأول: سؤال مكتوب كتابة (10 درجات)
السؤال الخامس: سؤال خامس مكرر لفظياً (10 درجات)`;

      const ast = parseExamPaperAST(weirdQuestions);
      expect(ast.questions).toHaveLength(5);
      expect(ast.questions[0].questionNumber).toBe(5);
      expect(ast.questions[1].questionNumber).toBe(5);
      expect(ast.questions[2].questionNumber).toBe(10);
      expect(ast.questions[3].questionNumber).toBe(1);
      expect(ast.questions[4].questionNumber).toBe(5);

      const calc = calculateExamTotalMarks(ast.questions);
      expect(calc.totalMarks).toBe(50);
      expect(calc.questionCount).toBe(5);
    });
  });

  describe('2. Discovered Vulnerabilities: LatexPreserver & Delimiter Handling', () => {
    it('VULNERABILITY 1: Nested placeholder leakage when chemistry is enclosed in math ($\\ce{...}$)', () => {
      // Teachers commonly write $\ce{...}$ in LaTeX.
      // LatexPreserver replaces \ce{...} first with __MATH_CE_0__, which is then enclosed into __MATH_INLINE_1__.
      // In restore, __MATH_CE_0__ is replaced before __MATH_INLINE_1__ expands, leaking __MATH_CE_0__ into output!
      const input = 'س1: تفاعل $\\ce{KMnO4 + HCl -> KCl}$ (20 درجة)';
      const ast = parseExamPaperAST(input);
      const serialized = serializeExamPaperAST(ast);

      // EXPECTATION: The formula KMnO4 must be preserved and not corrupted into an internal token
      expect(serialized).not.toContain('__MATH_CE_');
      expect(serialized).toContain('KMnO4');
    });

    it('VULNERABILITY 2: Multiline greedy match in $$...$$ regex swallows questions across newlines', () => {
      // In LatexPreserver: text.replace(/\$\$([\s\S]*?)\$\$/g, ...)
      // If a line has an unclosed $$ or single $$ typo, and another question has $$,
      // the greedy multiline regex swallows all intermediate questions into a single math block.
      const examText = `س1: احسب المقدار الآتي: (20 درجة)
فرع أ: حل المعادلة $$y = \\frac{1}{2} x بدون إغلاق
فرع ب: تفاعل كيميائي \\ce{H2O + NaCl}

س2: سؤال منفصل تماماً (20 درجة)
فرع أ: معادلة فارغة $$`;

      const ast = parseExamPaperAST(examText);
      // EXPECTATION: Question 2 must exist as an independent question and NOT be swallowed into Question 1!
      expect(ast.questions).toHaveLength(2);
      expect(ast.questions[1].questionNumber).toBe(2);
    });

    it('VULNERABILITY 3: LatexPreserver fails to match chemistry formulas with nested braces', () => {
      // In LatexPreserver: /\\ce\{([^{}]+)\}/g
      // Formulas with superscripts/subscripts like Fe^{3+} have inner braces, which fails [^{}]+ match!
      const preserver = new LatexPreserver();
      const chemWithNestedBraces = '\\ce{Fe^{3+} + 3OH- -> Fe(OH)3}';
      const protectedText = preserver.protect(chemWithNestedBraces);

      // EXPECTATION: The formula should be shielded/protected with a placeholder
      expect(protectedText).toContain('__MATH_CE_');
    });
  });

  describe('3. calculateExamTotalMarks Robustness', () => {
    it('handles empty questions array gracefully', () => {
      const summary = calculateExamTotalMarks([]);
      expect(summary.totalMarks).toBe(0);
      expect(summary.isStandard100).toBe(false);
      expect(summary.questionCount).toBe(0);
      expect(summary.questionsWithMarks).toBe(0);
      expect(summary.unassignedCount).toBe(0);
      expect(summary.breakdown).toHaveLength(0);
    });

    it('accurately sums marks from branches when question mark is missing', () => {
      const questions: any[] = [
        {
          id: 'q1',
          questionNumber: 1,
          header: 'س1: عرف ما يأتي',
          branches: [
            { id: 'b1', label: 'أ', text: 'الفرع الأول', marks: 5 },
            { id: 'b2', label: 'ب', text: 'الفرع الثاني', marks: 15 },
          ],
        },
        {
          id: 'q2',
          questionNumber: 2,
          header: 'س2: علل ما يأتي',
          marks: 20,
          branches: [
            { id: 'b3', label: 'أ', text: 'فرع', marks: 10 },
          ],
        },
      ];

      const summary = calculateExamTotalMarks(questions);
      expect(summary.totalMarks).toBe(40);
      expect(summary.questionsWithMarks).toBe(2);
      expect(summary.unassignedCount).toBe(0);
      expect(summary.breakdown[0].marks).toBe(20);
      expect(summary.breakdown[0].isFromBranches).toBe(true);
      expect(summary.breakdown[1].marks).toBe(20);
      expect(summary.breakdown[1].isFromBranches).toBe(false);
    });

    it('correctly flags standard 100-mark constraint and edge totals', () => {
      const q100: any[] = Array.from({ length: 5 }, (_, i) => ({
        id: `q${i + 1}`,
        questionNumber: i + 1,
        header: `س${i + 1}`,
        marks: 20,
        branches: [],
      }));
      expect(calculateExamTotalMarks(q100).isStandard100).toBe(true);

      const q99: any[] = Array.from({ length: 5 }, (_, i) => ({
        id: `q${i + 1}`,
        questionNumber: i + 1,
        header: `س${i + 1}`,
        marks: i === 0 ? 19 : 20,
        branches: [],
      }));
      expect(calculateExamTotalMarks(q99).isStandard100).toBe(false);
      expect(calculateExamTotalMarks(q99).totalMarks).toBe(99);
    });
  });

  describe('4. AST Roundtrip Idempotence & Stress Scaling', () => {
    it('preserves AST idempotence over multiple serialization cycles', () => {
      const originalText = `جمهورية العراق
وزارة التربية
المديرية العامة لتربية بغداد الرصافة الأولى
ثانوية المتفوقين للبنين
امتحان نهاية الفصل الأول للعام الدراسي 2026 - 2027
المادة: الرياضيات | الصف: الثالث المتوسط | الوقت: ساعتان
ملاحظة: الإجابة عن أربعة أسئلة فقط ولكل سؤال 25 درجة

س1: حل المعادلة الآتية في R: (25 درجة)
فرع أ: $x^2 - 5x + 6 = 0$ (15 درجة)
فرع ب: $\\frac{x}{2} + \\frac{1}{3} = 1$ (10 درجات)

س2: أجب عن فرعين فقط مما يأتي: (25 درجة)
فرع أ: جد مفكوك المقدار $(2x - 3)^3$ (12 درجة)
فرع ب: جد مجموعة حل النظام الآتي بالتعويض (13 درجة)
فرع ج: احسب المسافة بين النقطتين $A(1, 2)$ و $B(4, 6)$

س3: بين نوع التطبيق $f(x) = 2x^2 + 1$ حيث $f: Z \\to Z$ (25 درجة)

س4: اختر الإجابة الصحيحة من بين الأقواس: (25 درجة)
أولاً: قيمة المقدار $\\sqrt{12} - \\sqrt{3}$ هي (أ: $\\sqrt{3}$ ، ب: $2\\sqrt{3}$)
ثانياً: الميل للمستقيم المار بالنقطتين هو موجب`;

      // Cycle 1: raw -> AST1 -> Text1
      const ast1 = parseExamPaperAST(originalText);
      const text1 = serializeExamPaperAST(ast1);

      // Cycle 2: Text1 -> AST2 -> Text2
      const ast2 = parseExamPaperAST(text1);
      const text2 = serializeExamPaperAST(ast2);

      // Cycle 3: Text2 -> AST3 -> Text3
      const ast3 = parseExamPaperAST(text2);
      const text3 = serializeExamPaperAST(ast3);

      expect(text2).toBe(text3);
      expect(ast2.questions.length).toBe(ast3.questions.length);
      expect(ast2.questions.length).toBe(4);

      const marks1 = calculateExamTotalMarks(ast1.questions);
      const marks2 = calculateExamTotalMarks(ast2.questions);
      const marks3 = calculateExamTotalMarks(ast3.questions);
      expect(marks1.totalMarks).toBe(marks2.totalMarks);
      expect(marks2.totalMarks).toBe(marks3.totalMarks);
      expect(marks3.totalMarks).toBe(100);
      expect(marks3.isStandard100).toBe(true);
    });

    it('survives high-volume scale stress: 100 questions within performance budget', () => {
      const start = performance.now();
      const largeExamLines: string[] = [
        'جمهورية العراق | وزارة التربية',
        'امتحان تجريبي شامل',
        'المادة: العلوم العامة | الصف: الثاني المتوسط',
        'ملاحظة: أجب عن جميع الأسئلة',
        '',
      ];

      for (let i = 1; i <= 100; i++) {
        largeExamLines.push(`س${i}: سؤال اختباري رقم ${i} في العلوم (1 درجة)`);
        largeExamLines.push(`فرع أ: احسب الناتج لمعادلة رقم ${i} $x_{${i}} = \\sqrt{${i}}$`);
        largeExamLines.push(`فرع ب: كيمياء العنصر \\ce{H_${i}O}`);
        largeExamLines.push('');
      }

      const rawText = largeExamLines.join('\n');
      const ast = parseExamPaperAST(rawText);
      const serialized = serializeExamPaperAST(ast);
      const reParsed = parseExamPaperAST(serialized);

      const elapsed = performance.now() - start;

      expect(ast.questions).toHaveLength(100);
      expect(reParsed.questions).toHaveLength(100);
      expect(elapsed).toBeLessThan(400);
    });
  });
});
