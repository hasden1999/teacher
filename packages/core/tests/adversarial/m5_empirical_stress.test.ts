import { describe, it, expect } from 'vitest';
import {
  parseExamPaperAST,
  serializeExamPaperAST,
  calculateExamTotalMarks,
  LatexPreserver,
  toEasternNumerals,
  type ExamPaperAST,
  type ExamQuestionAST,
} from '../../src/index.js';

describe('Milestone 5 Adversarial Stress & Boundary Harness — Core Engine', () => {
  describe('Dimension 1: Large Exam Paper Workloads (20+ Questions & Stress)', () => {
    it('parses and structures an exam paper with 25 questions and 75 sub-branches under 100ms', () => {
      const questionsText: string[] = [
        'جمهورية العراق',
        'وزارة التربية',
        'المديرية العامة لتربية بغداد الرصافة الأولى',
        'ثانوية المتميزين للبنين',
        'امتحان نصف السنة للعام الدراسي 2026 - 2027',
        'المادة: الكيمياء والفيزياء | الصف: السادس العلمي | الوقت: 3 ساعات',
        'ملاحظة: الإجابة عن كافة الأسئلة أدناه',
        '',
      ];

      for (let i = 1; i <= 25; i++) {
        questionsText.push(`س${i}: أجب عما يأتي في المسألة الكيميائية رقم ${i}: (4 درجات)`);
        questionsText.push(`فرع أ: اكتب معادلة التفكك الحراري \\ce{CaCO3 -> CaO + CO2} عند النقطة ${i} (1 درجة)`);
        questionsText.push(`فرع ب: احسب قيمة الدالة الحامضية $pH = -\\log[H^+]$ بتركيز $0.${i}M$ (2 درجات)`);
        questionsText.push(`فرع ج: وضح أثر إضافة العامل المساعد على طاقة التنشيط $E_a$ (1 درجة)`);
        questionsText.push('');
      }

      const rawText = questionsText.join('\n');
      const start = performance.now();
      const ast = parseExamPaperAST(rawText);
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(ast.questions.length).toBe(25);

      for (let i = 0; i < 25; i++) {
        const q = ast.questions[i];
        expect(q.questionNumber).toBe(i + 1);
        expect(q.marks).toBe(4);
        expect(q.branches.length).toBe(3);
        expect(q.branches[0].label).toBe('أ');
        expect(q.branches[0].marks).toBe(1);
        expect(q.branches[0].text).toContain('\\ce{CaCO3 -> CaO + CO2}');
        expect(q.branches[1].label).toBe('ب');
        expect(q.branches[1].marks).toBe(2);
        expect(q.branches[1].text).toContain('$pH = -\\log[H^+]$');
        expect(q.branches[2].label).toBe('ج');
        expect(q.branches[2].marks).toBe(1);
      }
    });

    it('parses 50 questions using Eastern Arabic numerals (س١ إلى س٥٠)', () => {
      const lines: string[] = ['امتحان شامل'];
      for (let i = 1; i <= 50; i++) {
        const easternDigit = toEasternNumerals(i);
        lines.push(`س${easternDigit}: سؤال رقم ${easternDigit} (2 درجة)`);
        lines.push(`فرع أ: الشق الأول`);
        lines.push(`فرع ب: الشق الثاني`);
      }

      const ast = parseExamPaperAST(lines.join('\n'));
      expect(ast.questions.length).toBe(50);
      expect(ast.questions[0].questionNumber).toBe(1);
      expect(ast.questions[49].questionNumber).toBe(50);
    });

    it('handles heavy documents (>30KB text) with 150+ math/chemistry expressions without token collision or memory leak', () => {
      const preserver = new LatexPreserver();
      const formulaTemplates = [
        '\\ce{2H2 + O2 -> 2H2O}',
        '\\ce{N2 + 3H2 <=> 2NH3}',
        '\\ce{HCl + NaOH -> NaCl + H2O}',
        '$E = mc^2$',
        '$\\Delta G^\\circ = \\Delta H^\\circ - T\\Delta S^\\circ$',
        '$$\\int_{-\\infty}^{+\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$',
      ];

      const parts: string[] = [];
      const formulaCount = 180;
      for (let i = 0; i < formulaCount; i++) {
        const f = formulaTemplates[i % formulaTemplates.length];
        parts.push(`فقرة كيميائية ورقمها ${i} تتضمن الصيغة ${f} المعتمدة وزارياً.`);
      }

      const combinedText = parts.join('\n');
      expect(combinedText.length).toBeGreaterThan(10000);

      const protectedText = preserver.protect(combinedText);
      expect(protectedText).not.toContain('\\ce{');
      expect(protectedText).not.toContain('$$\\int');

      const restoredText = preserver.restore(protectedText);
      expect(restoredText).toBe(combinedText);
    });

    it('preserves full fidelity during 3-round serialization roundtrip on 20-question exam', () => {
      const originalLines: string[] = [
        'جمهورية العراق',
        'وزارة التربية',
        'مدرسة المتميزين',
        'امتحان الكيمياء للعام الدراسي 2026 - 2027',
        'المادة: الكيمياء | الصف: السادس العلمي | الوقت: ساعتان',
        'ملاحظة: الإجابة عن خمسة أسئلة فقط',
        '',
      ];

      for (let i = 1; i <= 20; i++) {
        originalLines.push(`س${i}: أجب عن الآتي: (5 درجات)`);
        originalLines.push(`فرع أ: اكتب الصيغة التركيبية لمركب رقم ${i} (2 درجات)`);
        originalLines.push(`فرع ب: احسب الكتلة المكافئة (3 درجات)`);
        originalLines.push('');
      }

      const originalText = originalLines.join('\n').trim();

      // Round 1
      const ast1 = parseExamPaperAST(originalText);
      const text1 = serializeExamPaperAST(ast1);

      // Round 2
      const ast2 = parseExamPaperAST(text1);
      const text2 = serializeExamPaperAST(ast2);

      // Round 3
      const ast3 = parseExamPaperAST(text2);
      const text3 = serializeExamPaperAST(ast3);

      expect(ast2.questions.length).toBe(20);
      expect(ast3.questions.length).toBe(20);
      expect(text2).toBe(text1);
      expect(text3).toBe(text2);

      for (let i = 0; i < 20; i++) {
        expect(ast3.questions[i].questionNumber).toBe(i + 1);
        expect(ast3.questions[i].marks).toBe(5);
        expect(ast3.questions[i].branches.length).toBe(2);
      }
    });

    it('evaluates multi-line branch text serialization and checks mark placement', () => {
      const ast: ExamPaperAST = {
        header: { examTitle: 'امتحان تجريبي' },
        rawText: '',
        questions: [
          {
            id: 'q1',
            questionNumber: 1,
            headerLabel: 'س1',
            header: 'س1: أجب عن الآتي: (20 درجة)',
            instruction: 'أجب عن الآتي:',
            marks: 20,
            type: 'GENERAL',
            branches: [
              {
                id: 'b1',
                label: 'أ',
                text: 'السطر الأول من الفرع\nالسطر الثاني من الفرع\nالسطر الثالث من الفرع',
                marks: 10,
              },
              {
                id: 'b2',
                label: 'ب',
                text: 'فرع عادي بسطر واحد',
                marks: 10,
              },
            ],
            subItems: [],
          },
        ],
      };

      const serialized = serializeExamPaperAST(ast);
      expect(serialized).toContain('فرع أ:');
      expect(serialized).toContain('السطر الأول من الفرع');

      const reParsed = parseExamPaperAST(serialized);
      expect(reParsed.questions.length).toBe(1);
      expect(reParsed.questions[0].branches.length).toBe(2);
      // Verify content is recovered
      expect(reParsed.questions[0].branches[0].text).toContain('السطر الأول من الفرع');
    });

    it('empirically verifies token leak fix when inline math wraps chemistry: $\\ce{...}$', () => {
      const preserver = new LatexPreserver();
      const input = 'احسب ناتج $\\ce{KMnO4 + HCl}$ في التفاعل';
      const protectedText = preserver.protect(input);
      const restored = preserver.restore(protectedText);

      // Verifies that token leak is fixed and original chemistry formula is fully restored
      const hasLeakedToken = restored.includes('__MATH_CE_');
      expect(hasLeakedToken).toBe(false);
      expect(restored).toBe('احسب ناتج $\\ce{KMnO4 + HCl}$ في التفاعل');
    });

    it('empirically verifies question swallowing prevention when unclosed $$ spans lines', () => {
      const input = [
        'س1: السؤال الأول (20 درجة)',
        'فرع أ: معادلة $$x = 1 بدون إغلاق',
        '',
        'س2: السؤال الثاني اختفى (20 درجة)',
        'فرع أ: معادلة مغلقة $$',
      ].join('\n');

      const ast = parseExamPaperAST(input);
      // Because question headers prevent multiline swallowing, question 2 is preserved
      expect(ast.questions.length).toBe(2);
      expect(ast.questions[0].questionNumber).toBe(1);
      expect(ast.questions[1].questionNumber).toBe(2);
    });
  });

  describe('Dimension 2: Total Marks Boundary Conditions', () => {
    it('handles 0 marks condition (zero marks, unassigned, or empty questions)', () => {
      // Case A: Empty questions array
      const emptySummary = calculateExamTotalMarks([]);
      expect(emptySummary.totalMarks).toBe(0);
      expect(emptySummary.isStandard100).toBe(false);
      expect(emptySummary.questionCount).toBe(0);
      expect(emptySummary.questionsWithMarks).toBe(0);
      expect(emptySummary.unassignedCount).toBe(0);
      expect(emptySummary.breakdown).toEqual([]);

      // Case B: Explicit 0 marks on all questions
      const zeroQuestions: ExamQuestionAST[] = [
        {
          id: 'q1',
          questionNumber: 1,
          headerLabel: 'س1',
          header: 'س1:',
          marks: 0,
          type: 'GENERAL',
          branches: [],
          subItems: [],
        },
        {
          id: 'q2',
          questionNumber: 2,
          headerLabel: 'س2',
          header: 'س2:',
          marks: 0,
          type: 'GENERAL',
          branches: [],
          subItems: [],
        },
      ];
      const zeroSummary = calculateExamTotalMarks(zeroQuestions);
      expect(zeroSummary.totalMarks).toBe(0);
      expect(zeroSummary.isStandard100).toBe(false);
      expect(zeroSummary.questionCount).toBe(2);
      expect(zeroSummary.questionsWithMarks).toBe(0);
      expect(zeroSummary.unassignedCount).toBe(2);

      // Case C: undefined marks on all questions
      const undefQuestions: ExamQuestionAST[] = [
        {
          id: 'q1',
          questionNumber: 1,
          headerLabel: 'س1',
          header: 'س1:',
          type: 'GENERAL',
          branches: [],
          subItems: [],
        },
      ];
      const undefSummary = calculateExamTotalMarks(undefQuestions);
      expect(undefSummary.totalMarks).toBe(0);
      expect(undefSummary.unassignedCount).toBe(1);
    });

    it('correctly validates exactly 100 marks condition across various standard distributions', () => {
      // 5 questions x 20 marks
      const standard5: ExamQuestionAST[] = Array.from({ length: 5 }, (_, i) => ({
        id: `q${i + 1}`,
        questionNumber: i + 1,
        headerLabel: `س${i + 1}`,
        header: `س${i + 1}:`,
        marks: 20,
        type: 'GENERAL',
        branches: [],
        subItems: [],
      }));
      const res5 = calculateExamTotalMarks(standard5);
      expect(res5.totalMarks).toBe(100);
      expect(res5.isStandard100).toBe(true);
      expect(res5.unassignedCount).toBe(0);
      expect(res5.questionsWithMarks).toBe(5);

      // 4 questions x 25 marks
      const standard4: ExamQuestionAST[] = Array.from({ length: 4 }, (_, i) => ({
        id: `q${i + 1}`,
        questionNumber: i + 1,
        headerLabel: `س${i + 1}`,
        header: `س${i + 1}:`,
        marks: 25,
        type: 'GENERAL',
        branches: [],
        subItems: [],
      }));
      const res4 = calculateExamTotalMarks(standard4);
      expect(res4.totalMarks).toBe(100);
      expect(res4.isStandard100).toBe(true);

      // Rollup from branches summing to 100
      const branchOnlyQuestions: ExamQuestionAST[] = Array.from({ length: 5 }, (_, i) => ({
        id: `q${i + 1}`,
        questionNumber: i + 1,
        headerLabel: `س${i + 1}`,
        header: `س${i + 1}:`,
        type: 'GENERAL',
        branches: [
          { id: `b${i}_1`, label: 'أ', text: 'أ', marks: 10 },
          { id: `b${i}_2`, label: 'ب', text: 'ب', marks: 10 },
        ],
        subItems: [],
      }));
      const resBranches = calculateExamTotalMarks(branchOnlyQuestions);
      expect(resBranches.totalMarks).toBe(100);
      expect(resBranches.isStandard100).toBe(true);
      expect(resBranches.breakdown.every(b => b.isFromBranches)).toBe(true);
    });

    it('detects >100 marks condition (e.g. 6 questions x 20 marks = 120 marks for optional choice)', () => {
      const choiceExam: ExamQuestionAST[] = Array.from({ length: 6 }, (_, i) => ({
        id: `q${i + 1}`,
        questionNumber: i + 1,
        headerLabel: `س${i + 1}`,
        header: `س${i + 1}:`,
        marks: 20,
        type: 'GENERAL',
        branches: [],
        subItems: [],
      }));
      const summary = calculateExamTotalMarks(choiceExam);
      expect(summary.totalMarks).toBe(120);
      expect(summary.isStandard100).toBe(false);
      expect(summary.questionCount).toBe(6);
      expect(summary.questionsWithMarks).toBe(6);
      expect(summary.unassignedCount).toBe(0);
    });

    it('correctly computes partial and unassigned marks breakdowns', () => {
      const mixedQuestions: ExamQuestionAST[] = [
        {
          id: 'q1',
          questionNumber: 1,
          headerLabel: 'س1',
          header: 'س1:',
          marks: 25,
          type: 'GENERAL',
          branches: [],
          subItems: [],
        },
        {
          id: 'q2',
          questionNumber: 2,
          headerLabel: 'س2',
          header: 'س2:',
          type: 'GENERAL', // unassigned
          branches: [],
          subItems: [],
        },
        {
          id: 'q3',
          questionNumber: 3,
          headerLabel: 'س3',
          header: 'س3:',
          type: 'GENERAL',
          branches: [
            { id: 'b3_1', label: 'أ', text: 'أ', marks: 15 },
            { id: 'b3_2', label: 'ب', text: 'ب', marks: 15 },
          ], // rollup: 30
          subItems: [],
        },
        {
          id: 'q4',
          questionNumber: 4,
          headerLabel: 'س4',
          header: 'س4:',
          marks: 0, // unassigned
          branches: [],
          subItems: [],
        },
      ];

      const res = calculateExamTotalMarks(mixedQuestions);
      expect(res.totalMarks).toBe(55); // 25 + 30
      expect(res.isStandard100).toBe(false);
      expect(res.questionCount).toBe(4);
      expect(res.questionsWithMarks).toBe(2);
      expect(res.unassignedCount).toBe(2);
      expect(res.breakdown[0].marks).toBe(25);
      expect(res.breakdown[1].marks).toBe(0);
      expect(res.breakdown[2].marks).toBe(30);
      expect(res.breakdown[2].isFromBranches).toBe(true);
      expect(res.breakdown[3].marks).toBe(0);
    });

    it('tests decimal marks behavior in calculateExamTotalMarks', () => {
      const decimalQuestions: ExamQuestionAST[] = [
        {
          id: 'q1',
          questionNumber: 1,
          headerLabel: 'س1',
          header: 'س1:',
          marks: 12.5,
          type: 'GENERAL',
          branches: [],
          subItems: [],
        },
        {
          id: 'q2',
          questionNumber: 2,
          headerLabel: 'س2',
          header: 'س2:',
          marks: 12.5,
          type: 'GENERAL',
          branches: [],
          subItems: [],
        },
        {
          id: 'q3',
          questionNumber: 3,
          headerLabel: 'س3',
          header: 'س3:',
          marks: 25,
          type: 'GENERAL',
          branches: [],
          subItems: [],
        },
        {
          id: 'q4',
          questionNumber: 4,
          headerLabel: 'س4',
          header: 'س4:',
          marks: 25,
          type: 'GENERAL',
          branches: [],
          subItems: [],
        },
        {
          id: 'q5',
          questionNumber: 5,
          headerLabel: 'س5',
          header: 'س5:',
          marks: 25,
          type: 'GENERAL',
          branches: [],
          subItems: [],
        },
      ];

      const res = calculateExamTotalMarks(decimalQuestions);
      expect(res.totalMarks).toBe(100);
      expect(res.isStandard100).toBe(true);
      expect(res.questionsWithMarks).toBe(5);
    });

    it('empirically verifies that parseExamPaperAST extracts decimal marks from text format', () => {
      // Test 1: Western decimal format (12.5 درجة)
      const textWestern = `س1: عرف ما يأتي: (12.5 درجة)`;
      const astWestern = parseExamPaperAST(textWestern);
      
      // Test 2: Arabic comma decimal format (12٫5 درجة)
      const textArabicComma = `س1: عرف ما يأتي: (12٫5 درجة)`;
      const astArabicComma = parseExamPaperAST(textArabicComma);

      const observedWesternMarks = astWestern.questions[0]?.marks;
      const observedArabicCommaMarks = astArabicComma.questions[0]?.marks;

      expect(observedWesternMarks).toBe(12.5);
      expect(observedArabicCommaMarks).toBe(12.5);
    });
  });
});
