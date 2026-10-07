import { describe, it, expect } from 'vitest';
import {
  parseExamPaperAST,
  parseExamPaperText,
  LatexPreserver
} from '../../src/parser/examParser.js';
import {
  toWesternNumerals,
  toEasternNumerals,
  parseArabicNumber,
  toArabicOrdinal,
  fromArabicOrdinal
} from '../../src/parser/numerals.js';

describe('Adversarial Attack: Parser & Numeral Stress Vectors', () => {
  describe('Parser Vector 1: Arabic Exam Text Fuzzing & Malformed Syntax', () => {
    it('ATTACK: Heavily malformed Arabic text with garbage, emojis, null bytes and zero questions', () => {
      const fuzzInputs = [
        '\0\0\0\0\0',
        '   \t\t\r\n\r\n   ',
        'مرحباً بك يا أستاذ! هذا نص بدون أسئلة نهائياً مجرد دردشة وكلام عام.',
        '🔥🔥🔥 ⚠️⚠️⚠️ 💯💯💯 ??? !!! ### $$$ %%% ^^^ &&& ***',
        'سؤال سسسسسس بدون رقم وبدون علامة ترقيم وبدون محتوى',
        'فرع أ: فقط فرع بدون سؤال يسبقه\nفرع ب: فرع آخر يتيم'
      ];

      for (const input of fuzzInputs) {
        expect(() => parseExamPaperAST(input)).not.toThrow();
        expect(() => parseExamPaperText(input)).not.toThrow();

        const ast = parseExamPaperAST(input);
        expect(ast).toBeDefined();
        expect(Array.isArray(ast.questions)).toBe(true);
      }
    });

    it('ATTACK: Question headers with missing colons, multiple colons, or mixed punctuation', () => {
      const text = `
س1 عرف قانون أوم
س2::: علل ما يأتي
س3 / قارن بين الانقسام الخيطي والاختزالي
السؤال الرابع - احسب المقاومة المكافئة
س. اذكر شروط التوازن
      `;
      const questions = parseExamPaperText(text);
      expect(questions.length).toBeGreaterThanOrEqual(4);
      expect(questions[0].questionNumber).toBe(1);
      expect(questions[1].questionNumber).toBe(2);
      expect(questions[2].questionNumber).toBe(3);
      expect(questions[3].questionNumber).toBe(4);
    });
  });

  describe('Parser Vector 2: Unbalanced LaTeX Delimiters Fuzzing', () => {
    it('ATTACK: Unclosed single dollar delimiter ($ without closing $)', () => {
      const preserver = new LatexPreserver();
      const textWithUnclosedDollar = 'احسب قيمة المتغير $x + y بدون إغلاق علامة الدولار في هذا السطر.';

      // protect should not throw and should preserve unclosed text safely
      const protectedText = preserver.protect(textWithUnclosedDollar);
      expect(() => preserver.restore(protectedText)).not.toThrow();
      const restored = preserver.restore(protectedText);
      expect(restored).toBe(textWithUnclosedDollar);
    });

    it('ATTACK: Unclosed display math delimiter ($$ without closing $$)', () => {
      const preserver = new LatexPreserver();
      const unclosedDisplay = 'س1: احسب التكامل $$ \\int_0^1 x^2 dx ولم يتم إغلاق الدولارين نهائياً.';

      const protectedText = preserver.protect(unclosedDisplay);
      expect(() => preserver.restore(protectedText)).not.toThrow();
      const restored = preserver.restore(protectedText);
      expect(restored).toBe(unclosedDisplay);
    });

    it('ATTACK: Display math ($$) spanning across multiple lines and questions', () => {
      const text = `
س1: احسب $$ f(x) = x^2
فرع أ: جد المشتقة الأولى $$
س2: علل ما يأتي:
أولاً: السبب الأول
      `;

      // Does the exam parser survive this multiline block without dropping questions?
      const ast = parseExamPaperAST(text);
      expect(ast.questions.length).toBeGreaterThanOrEqual(2);
      expect(ast.questions[0].questionNumber).toBe(1);
      expect(ast.questions[1].questionNumber).toBe(2);
    });

    it('ATTACK: Unclosed chemical formula (\\ce{ without closing bracket)', () => {
      const preserver = new LatexPreserver();
      const unclosedCe = 'تفاعل الصوديوم مع الماء \\ce{2Na + 2H2O -> بدون قوس إغلاق.';

      const protectedText = preserver.protect(unclosedCe);
      const restored = preserver.restore(protectedText);
      expect(restored).toBe(unclosedCe);
    });

    it('ATTACK: Nested braces inside \\ce{...} such as \\ce{Fe2(SO4)3}', () => {
      const preserver = new LatexPreserver();
      const complexCe = 'اكتب كبريتات الحديد الثلاثي \\ce{Fe_{2}(SO4)_{3}} هنا.';

      // Note: [^{}]+ in regex means nested braces will not match the regex
      const protectedText = preserver.protect(complexCe);
      const restored = preserver.restore(protectedText);
      // Even if not shielded as a single token, it must not corrupt the input string
      expect(restored).toBe(complexCe);
    });

    it('ATTACK: Edge case where input text contains raw placeholder pattern __MATH_BLOCK_0__', () => {
      const preserver = new LatexPreserver();
      const trickyText = 'النص يحتوي على __MATH_BLOCK_0__ و معادلة $x = 1$.';

      const protectedText = preserver.protect(trickyText);
      const restored = preserver.restore(protectedText);
      expect(restored).toContain('$x = 1$');
      expect(restored).toContain('__MATH_BLOCK_0__');
    });
  });

  describe('Parser Vector 3: Mixed Eastern Arabic (٠-٩) and Persian (۰-۹) Numerals', () => {
    it('EMPIRICAL PROBE: Persian numeral digits in question headers (س۱: vs س1: vs س١:)', () => {
      // Test Western digits
      const westernText = 'س1: عرف ما يأتي:';
      const qWestern = parseExamPaperText(westernText);
      expect(qWestern.length).toBe(1);
      expect(qWestern[0].questionNumber).toBe(1);

      // Test Eastern Arabic digits (٠-٩)
      const easternText = 'س١: عرف ما يأتي:';
      const qEastern = parseExamPaperText(easternText);
      expect(qEastern.length).toBe(1);
      expect(qEastern[0].questionNumber).toBe(1);

      // Test Persian digits (۰-۹): '۱' is U+06F1 (Persian one)
      const persianOne = '\u06F1';
      const persianText = `س${persianOne}: عرف ما يأتي:`;
      const qPersian = parseExamPaperText(persianText);

      // EMPIRICAL OBSERVATION & VULNERABILITY FINDING:
      // In examParser.ts: qHeaderRegex = /^(?:س(?:ؤال)?\s*([0-9٠-٩]+)\s*[:/\-.)\]]?|...
      // The character class [0-9٠-٩] only covers Western 0-9 and Eastern Arabic ٠-٩.
      // It DOES NOT cover Persian numerals ۰-۹ (U+06F0..U+06F9)!
      // Therefore, Persian question header is NOT recognized and dropped completely (qPersian.length === 0):
      expect(qPersian.length).toBe(0);
    });

    it('ATTACK: Numeral converter handling of mixed Eastern, Persian, and Western digits in one string', () => {
      // String with: Western (12), Eastern Arabic (٣٤, U+0663, U+0664), Persian (۵۶, U+06F5, U+06F6)
      const mixedDigits = '12٣٤۵۶';
      const westernized = toWesternNumerals(mixedDigits);
      expect(westernized).toBe('123456');

      const easternized = toEasternNumerals(westernized);
      expect(easternized).toBe('١٢٣٤٥٦');
    });

    it('EMPIRICAL PROBE: Numeral converter with irregular commas: Arabic thousands separator (٬ U+066C) vs comma (، U+060C) vs decimal (٫ U+066B)', () => {
      // Arabic decimal separator (٫ U+066B): 75٫5 -> 75.5
      expect(toWesternNumerals('٧٥٫٥')).toBe('75.5');
      expect(parseArabicNumber('٧٥٫٥')).toBe(75.5);

      // Arabic comma (، U+060C): ١٢،٣٤ -> 12.34
      expect(toWesternNumerals('١٢،٣٤')).toBe('12.34');
      expect(parseArabicNumber('١٢،٣٤')).toBe(12.34);

      // Irregular comma: Arabic thousands separator (٬ U+066C):
      // In '١٬٠٠٠٫٥' (1,000.5), numerals.ts line 38 only replaces [٫،], leaving \u066C intact!
      const withThousandsSeparator = '١\u066C٠٠٠٫٥';
      const convertedThousands = toWesternNumerals(withThousandsSeparator);
      expect(convertedThousands).toBe('1\u066C000.5');

      // Because \u066C is not removed, parseArabicNumber matches only '1' and truncates '000.5'!
      const parsedThousands = parseArabicNumber(withThousandsSeparator);
      expect(parsedThousands).toBe(1);
    });

    it('ATTACK: Extreme number parsing with multiple dots, negative signs, percentages, and garbage', () => {
      expect(parseArabicNumber('12.34.56')).toBe(12.34);
      expect(parseArabicNumber('...5')).toBe(0.5); // matches '.5'
      expect(parseArabicNumber('-٠٫٧٥')).toBe(-0.75);
      expect(parseArabicNumber('+١٠٠%')).toBe(100);
      expect(parseArabicNumber('لا شيء')).toBeNull();
      expect(parseArabicNumber('NaN')).toBeNull();
      expect(parseArabicNumber('Infinity')).toBeNull();
    });
  });
});
