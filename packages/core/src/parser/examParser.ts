import { parseArabicNumber, toWesternNumerals } from './numerals.js';

export type ExamQuestionType =
  | 'DEFINITION'
  | 'REASONING'
  | 'COMPARISON'
  | 'FILL_BLANKS'
  | 'TRUE_FALSE'
  | 'MCQ'
  | 'PROBLEM'
  | 'ENUMERATION'
  | 'GENERAL';

export interface ExamHeaderAST {
  country?: string;         // جمهورية العراق
  ministry?: string;        // وزارة التربية
  directorate?: string;     // المديرية العامة للتربية
  schoolName?: string;      // اسم المدرسة
  examTitle?: string;       // امتحان نصف السنة / نهاية السنة / الشهر الأول
  academicYear?: string;    // للعام الدراسي 2026 - 2027
  subject?: string;         // المادة (الرياضيات، الكيمياء، الفيزياء...)
  grade?: string;           // الصف (الثالث المتوسط، السادس العلمي...)
  timeAllowed?: string;     // الوقت (ساعتان، ساعتان ونصف)
  generalNote?: string;     // ملاحظة: الإجابة عن خمسة أسئلة فقط / لكل سؤال 20 درجة
}

export interface ParsedSubItem {
  label: string;            // 'أ' | 'ب' | 'ج' | 'د' | 'أولاً' | 'ثانياً' | '1'
  text: string;             // نص الفرع مع الحفاظ على صيغ LaTeX
  marks?: number;           // درجة الفرع
}

export type ExamBranchAST = ParsedSubItem & {
  id: string;
  subItems?: string[];
};

export interface ParsedExamQuestion {
  id?: string;
  questionNumber: number;
  header: string;
  subItems: ParsedSubItem[];
  marks?: number;
  type?: ExamQuestionType;
  instruction?: string;
  mainText?: string;
  branches?: ExamBranchAST[];
}

export type ExamQuestionAST = ParsedExamQuestion & {
  id: string;
  headerLabel: string;
  type: ExamQuestionType;
  branches: ExamBranchAST[];
};

export interface ExamPaperAST {
  header: ExamHeaderAST;
  questions: ExamQuestionAST[];
  rawText: string;
}

/**
 * محرك حماية واستعادة صيغ LaTeX والرياضيات والكيمياء (Math Shielding Engine)
 */
export class LatexPreserver {
  private tokens: Map<string, string> = new Map();
  private counter = 0;

  public protect(text: string): string {
    this.tokens.clear();
    this.counter = 0;

    // 1. استبدال صيغ العرض المستقلة $$...$$ مع ضمان عدم ابتلاع أسطر تبدأ بأسئلة جديدة
    let protectedText = text.replace(/\$\$((?:(?![\r\n]\s*(?:س|Q|السؤال)\s*[:\d١-٩])).)*?\$\$/gis, (match) => {
      const placeholder = `__MATH_BLOCK_${this.counter++}__`;
      this.tokens.set(placeholder, match);
      return placeholder;
    });

    // 2. استبدال صيغ الكيمياء \ce{...} مع دعم كامل للأقواس المعقوفة المتداخلة (e.g. \ce{Fe^{3+}})
    let scannedText = '';
    let cursor = 0;
    while (cursor < protectedText.length) {
      const ceIdx = protectedText.indexOf('\\ce{', cursor);
      if (ceIdx === -1) {
        scannedText += protectedText.slice(cursor);
        break;
      }
      scannedText += protectedText.slice(cursor, ceIdx);
      let braceCount = 1;
      let endIdx = ceIdx + 4;
      while (endIdx < protectedText.length && braceCount > 0) {
        if (protectedText[endIdx] === '{') braceCount++;
        else if (protectedText[endIdx] === '}') braceCount--;
        endIdx++;
      }
      if (braceCount === 0) {
        const match = protectedText.slice(ceIdx, endIdx);
        const placeholder = `__MATH_CE_${this.counter++}__`;
        this.tokens.set(placeholder, match);
        scannedText += placeholder;
        cursor = endIdx;
      } else {
        scannedText += protectedText.slice(ceIdx, ceIdx + 4);
        cursor = ceIdx + 4;
      }
    }
    protectedText = scannedText;

    // 3. استبدال الصيغ السطرية $...$
    protectedText = protectedText.replace(/\$([^\$\n]+?)\$/g, (match) => {
      const placeholder = `__MATH_INLINE_${this.counter++}__`;
      this.tokens.set(placeholder, match);
      return placeholder;
    });

    return protectedText;
  }

  public restore(text: string): string {
    let restored = text;
    let changed = true;
    let iterations = 0;
    // حلقة تكرارية تضمن استعادة العناصر النائبة المتداخلة (مثل \ce{...} داخل $...$)
    while (changed && iterations < 10) {
      changed = false;
      iterations++;
      for (const [placeholder, originalMath] of this.tokens.entries()) {
        if (restored.includes(placeholder)) {
          restored = restored.replaceAll(placeholder, () => originalMath);
          changed = true;
        }
      }
    }
    return restored;
  }
}

// تعبيرات مطابقة أنواع الأسئلة العراقية
const QUESTION_TYPE_PATTERNS: Array<{ type: ExamQuestionType; regex: RegExp }> = [
  { type: 'DEFINITION', regex: /(?:عرف|تعاريف|المفردات|المصطلحات)/i },
  { type: 'REASONING', regex: /(?:علل|تعاليل|اذكر السبب|بين السبب|ما سبب|لماذا)/i },
  { type: 'COMPARISON', regex: /(?:قارن|مقارنة|ما الفرق|ما أثر)/i },
  { type: 'FILL_BLANKS', regex: /(?:فراغ|فراغات|املا|املأ|أكمل)/i },
  { type: 'TRUE_FALSE', regex: /(?:صح (?:أم|أو) خطأ|علامة \(✓\)|ضع كلمة \(صح\)|صحح الخطأ)/i },
  { type: 'MCQ', regex: /(?:اختر|الاختيارات|بين الأقواس|من بين الأقواس)/i },
  { type: 'ENUMERATION', regex: /(?:عدد|تعداد|ما هي أهم|اذكر نقاط)/i },
  { type: 'PROBLEM', regex: /(?:احسب|جد قيمة|جد ناتج|حل المسألة|أثبت أن|اثبت ان|بين رياضياً)/i }
];

const ORDINAL_NUMBERS: Record<string, number> = {
  'الأول': 1, 'الاول': 1,
  'الثاني': 2,
  'الثالث': 3,
  'الرابع': 4,
  'الخامس': 5,
  'السادس': 6,
  'السابع': 7,
  'الثامن': 8,
  'التاسع': 9,
  'العاشر': 10
};

function detectQuestionType(text: string): ExamQuestionType {
  for (const item of QUESTION_TYPE_PATTERNS) {
    if (item.regex.test(text)) {
      return item.type;
    }
  }
  return 'GENERAL';
}

function extractMarksNumber(str: string): number {
  if (str.includes('درجة واحدة')) return 1;
  if (str.includes('درجتان')) return 2;
  const western = toWesternNumerals(str).replace(/[,\u066B]/g, '.').trim();
  const num = parseFloat(western);
  return !isNaN(num) ? num : (parseArabicNumber(str) ?? 0);
}

function parseHeaderLine(line: string, header: ExamHeaderAST): void {
  if (line.includes('|')) {
    const segments = line.split('|').map(s => s.trim()).filter(s => s.length > 0);
    for (const segment of segments) {
      parseHeaderSingle(segment, header);
    }
    return;
  }
  parseHeaderSingle(line, header);
}

function parseHeaderSingle(part: string, header: ExamHeaderAST): void {
  if (part.includes('جمهورية العراق')) header.country = 'جمهورية العراق';
  if (part.includes('وزارة التربية')) header.ministry = 'وزارة التربية';
  if (part.includes('المديرية العامة')) header.directorate = part;
  if (part.includes('مدرسة') || part.includes('ثانوية') || part.includes('متوسطة') || part.includes('ابتدائية')) {
    header.schoolName = part;
  }
  if (part.includes('امتحان')) header.examTitle = part;
  if (part.includes('العام الدراسي') || part.match(/[0-9٠-٩]{4}\s*[-–/]\s*[0-9٠-٩]{4}/)) {
    header.academicYear = part;
  }
  if (part.includes('المادة:') || part.startsWith('مادة:') || part.startsWith('مادة ')) header.subject = part;
  if (part.includes('الصف:') || part.includes('الصف ') || part.startsWith('صف:') || part.startsWith('صف ')) header.grade = part;
  if (part.includes('الوقت:') || part.includes('الزمن:')) header.timeAllowed = part;
  if (part.includes('ملاحظة:')) header.generalNote = part;
}

/**
 * تحليل نص الامتحان الكامل المنسوخ إلى شجرة البناء المجردة AST
 */
export function parseExamPaperAST(rawText: string): ExamPaperAST {
  if (!rawText || !rawText.trim()) {
    return {
      header: {},
      questions: [],
      rawText: rawText || ''
    };
  }

  const preserver = new LatexPreserver();
  const safeText = preserver.protect(rawText);

  const lines = safeText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  const header: ExamHeaderAST = {};
  const questions: ExamQuestionAST[] = [];

  let currentQuestion: ExamQuestionAST | null = null;
  let currentBranch: ExamBranchAST | null = null;
  let inHeaderSection = true;

  const qHeaderRegex = /^(?:س(?:ؤال)?\s*([0-9٠-٩]+)\s*[:/\-.)\]]?|السؤال\s*(الأول|الاول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن|التاسع|العاشر)\s*[:/\-.)\]]?|س(?:ؤال)?\s*[:/\-.)\]])\s*(.*)$/i;
  const branchRegex = /^(?:فرع\s*([أ-يA-Z])|([أ-يA-Z])\s*[:/\-.)\]]|(أولاً|اولا|ثانياً|ثانيا|ثالثاً|ثالثا|رابعاً|رابعا|خامساً|خامسا)\s*[:/\-.)\]]|([0-9٠-٩]+)\s*[:/\-.)\]]|فرع\s*[:/\-.)\]])\s*(.*)$/i;
  const marksRegex = /[(\[]\s*([0-9٠-٩]+(?:[.,\u066B][0-9٠-٩]+)?|درجة واحدة|درجتان)\s*(?:درجة|درجات)?\s*[)\]]/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    const qMatch = line.match(qHeaderRegex);
    if (qMatch) {
      inHeaderSection = false;
      if (currentQuestion) {
        if (currentBranch) {
          currentQuestion.branches.push(currentBranch);
          currentBranch = null;
        }
        currentQuestion.subItems = currentQuestion.branches.map(b => ({
          label: b.label,
          text: b.text,
          marks: b.marks
        }));
        questions.push(currentQuestion);
      }

      let qNum = 1;
      if (qMatch[1]) {
        qNum = parseArabicNumber(qMatch[1])!;
      } else if (qMatch[2]) {
        qNum = ORDINAL_NUMBERS[qMatch[2]];
      } else {
        qNum = questions.length + 1;
      }

      const restOfLine = qMatch[3].trim();
      const marksMatch = restOfLine.match(marksRegex);
      let marks: number | undefined;
      let cleanRest = restOfLine;

      if (marksMatch) {
        marks = extractMarksNumber(marksMatch[1]);
        cleanRest = cleanRest.replace(marksMatch[0], '').trim();
      }

      const detectedType = detectQuestionType(cleanRest);
      const headerLabel = qMatch[0].split(/[:/\-.)\]]/)[0].trim();
      const restoredInstruction = cleanRest.length > 0 ? preserver.restore(cleanRest) : undefined;
      const fullHeader = restoredInstruction ? `${headerLabel}: ${restoredInstruction}` : headerLabel;

      currentQuestion = {
        id: `q_${qNum}_${questions.length + 1}`,
        questionNumber: qNum,
        header: fullHeader,
        headerLabel,
        type: detectedType,
        instruction: restoredInstruction,
        branches: [],
        subItems: [],
        marks
      };
      continue;
    }

    if (inHeaderSection) {
      parseHeaderLine(line, header);
      continue;
    }

    if (currentQuestion) {
      const bMatch = line.match(branchRegex);
      if (bMatch) {
        if (currentBranch) {
          currentQuestion.branches.push(currentBranch);
        }

        const branchLabel = bMatch[1] || bMatch[2] || bMatch[3] || bMatch[4] || 'فرع';
        const branchContent = bMatch[5].trim();

        const bMarksMatch = branchContent.match(marksRegex);
        let bMarks: number | undefined;
        let cleanBText = branchContent;

        if (bMarksMatch) {
          bMarks = extractMarksNumber(bMarksMatch[1]);
          cleanBText = cleanBText.replace(bMarksMatch[0], '').trim();
        }
        cleanBText = cleanBText.replace(/^[:/\-.)\]\s]+/, '').trim();

        currentBranch = {
          id: `br_${currentQuestion.questionNumber}_${branchLabel}_${currentQuestion.branches.length + 1}`,
          label: branchLabel,
          text: preserver.restore(cleanBText),
          marks: bMarks
        };
        continue;
      }

      if (currentBranch) {
        currentBranch.text += '\n' + preserver.restore(line);
      } else {
        if (!currentQuestion.mainText) {
          currentQuestion.mainText = preserver.restore(line);
        } else {
          currentQuestion.mainText += '\n' + preserver.restore(line);
        }
      }
    }
  }

  if (currentQuestion) {
    if (currentBranch) {
      currentQuestion.branches.push(currentBranch);
    }
    currentQuestion.subItems = currentQuestion.branches.map(b => ({
      label: b.label,
      text: b.text,
      marks: b.marks
    }));
    questions.push(currentQuestion);
  }

  return {
    header,
    questions,
    rawText
  };
}

/**
 * تحليل نص الامتحان وإرجاع مصفوفة الأسئلة المتطابقة مع عقد PROJECT.md
 */
export function parseExamPaperText(rawText: string): ParsedExamQuestion[] {
  const ast = parseExamPaperAST(rawText);
  return ast.questions;
}

/**
 * تحويل شجرة البناء المجردة للورقة الامتحانية إلى نص عربي منظم مطابق للمواصفات الوزارية
 */
export function serializeExamPaperAST(ast: ExamPaperAST): string {
  const lines: string[] = [];
  const h = ast.header;

  // 1. ترويسة الامتحان
  if (h.country) lines.push(h.country);
  if (h.ministry) lines.push(h.ministry);
  if (h.directorate) lines.push(h.directorate);
  if (h.schoolName) lines.push(h.schoolName);
  if (h.examTitle) {
    const yr = h.academicYear && !h.examTitle.includes(h.academicYear)
      ? ` للعام الدراسي ${h.academicYear.replace(/^(?:للعام الدراسي\s*)?/, '')}`
      : '';
    lines.push(`${h.examTitle}${yr}`);
  } else if (h.academicYear) {
    lines.push(h.academicYear);
  }

  const metaParts: string[] = [];
  if (h.subject) {
    metaParts.push(h.subject.includes(':') ? h.subject : `المادة: ${h.subject}`);
  }
  if (h.grade) {
    metaParts.push(h.grade.includes(':') ? h.grade : `الصف: ${h.grade}`);
  }
  if (h.timeAllowed) {
    metaParts.push(h.timeAllowed.includes(':') ? h.timeAllowed : `الوقت: ${h.timeAllowed}`);
  }
  if (metaParts.length > 0) {
    lines.push(metaParts.join(' | '));
  }

  if (h.generalNote) {
    lines.push(h.generalNote.startsWith('ملاحظة') ? h.generalNote : `ملاحظة: ${h.generalNote}`);
  }

  if (lines.length > 0) {
    lines.push(''); // سطر فارغ فاصل
  }

  // 2. الأسئلة والفروع
  for (const q of ast.questions) {
    const qLabel = q.headerLabel || `س${q.questionNumber}`;
    let instr = '';
    if (q.instruction) {
      instr = ` ${q.instruction}`;
    } else if (q.header && q.header !== qLabel) {
      const stripped = q.header.replace(/^س(?:ؤال)?\s*[0-9٠-٩]+[:/\-.)\]]?\s*/, '').trim();
      if (stripped.length > 0) {
        instr = ` ${stripped}`;
      }
    }

    let marksStr = '';
    if (q.marks !== undefined && q.marks > 0) {
      if (q.marks === 1) marksStr = ' (درجة واحدة)';
      else if (q.marks === 2) marksStr = ' (درجتان)';
      else if (q.marks >= 3 && q.marks <= 10) marksStr = ` (${q.marks} درجات)`;
      else marksStr = ` (${q.marks} درجة)`;
    }

    lines.push(`${qLabel}:${instr}${marksStr}`.trim());

    if (q.mainText) {
      lines.push(q.mainText);
    }

    if (q.branches && q.branches.length > 0) {
      for (const b of q.branches) {
        let bMarks = '';
        if (b.marks !== undefined && b.marks > 0) {
          if (b.marks === 1) bMarks = ' (درجة واحدة)';
          else if (b.marks === 2) bMarks = ' (درجتان)';
          else if (b.marks >= 3 && b.marks <= 10) bMarks = ` (${b.marks} درجات)`;
          else bMarks = ` (${b.marks} درجة)`;
        }
        const bLabel = b.label || 'أ';
        const isOrdinal = ['أولاً', 'اولا', 'ثانياً', 'ثانيا', 'ثالثاً', 'ثالثا', 'رابعاً', 'رابعا', 'خامساً', 'خامسا'].includes(bLabel);
        const prefix = bLabel.startsWith('فرع') ? `${bLabel}:` : (isOrdinal ? `${bLabel}:` : `فرع ${bLabel}:`);
        const bText = b.text.replace(/^[:/\-.)\]\s]+/, '').trim();
        lines.push(`${prefix} ${bText}${bMarks}`.trim());
      }
    }

    lines.push(''); // سطر فاصل بين الأسئلة
  }

  return lines.join('\n').trim();
}

export interface ExamMarksSummary {
  totalMarks: number;
  isStandard100: boolean;
  questionCount: number;
  questionsWithMarks: number;
  unassignedCount: number;
  breakdown: Array<{
    questionNumber: number;
    marks: number;
    isFromBranches: boolean;
  }>;
}

export function calculateExamTotalMarks(questions: ExamQuestionAST[]): ExamMarksSummary {
  let total = 0;
  let withMarks = 0;
  let unassigned = 0;
  const breakdown: ExamMarksSummary['breakdown'] = [];

  for (const q of questions) {
    let qMarks = q.marks;
    let isFromBranches = false;

    if ((qMarks === undefined || qMarks === 0) && q.branches && q.branches.length > 0) {
      const branchTotal = q.branches.reduce((acc, b) => acc + (b.marks || 0), 0);
      if (branchTotal > 0) {
        qMarks = branchTotal;
        isFromBranches = true;
      }
    }

    if (qMarks !== undefined && qMarks > 0) {
      total += qMarks;
      withMarks++;
      breakdown.push({
        questionNumber: q.questionNumber,
        marks: qMarks,
        isFromBranches
      });
    } else {
      unassigned++;
      breakdown.push({
        questionNumber: q.questionNumber,
        marks: 0,
        isFromBranches: false
      });
    }
  }

  return {
    totalMarks: total,
    isStandard100: total === 100,
    questionCount: questions.length,
    questionsWithMarks: withMarks,
    unassignedCount: unassigned,
    breakdown
  };
}

export type ExamFontFamily = 'Amiri' | 'Tajawal';
export type ExamFontSizeScale = 'small' | 'medium' | 'large';
export type ExamLineSpacing = 'compact' | 'normal' | 'spacious';

export interface ExamTypographyConfig {
  fontFamily: ExamFontFamily;
  headerWeight: 'bold' | 'black';
  bodyWeight: 'normal' | 'medium';
  scale: ExamFontSizeScale;
  lineSpacing: ExamLineSpacing;
  headerFontSizeClass: string; // e.g. 'text-lg', 'text-xl'
  bodyFontSizeClass: string;   // e.g. 'text-base', 'text-sm'
  showDecorations: boolean;    // الفواصل والزخرفة الوزارية
}

export const DEFAULT_EXAM_TYPOGRAPHY: ExamTypographyConfig = {
  fontFamily: 'Amiri',
  headerWeight: 'bold',
  bodyWeight: 'normal',
  scale: 'medium',
  lineSpacing: 'normal',
  headerFontSizeClass: 'text-lg',
  bodyFontSizeClass: 'text-base',
  showDecorations: true,
};
