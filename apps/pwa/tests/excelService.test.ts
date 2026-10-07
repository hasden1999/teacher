import { describe, it, expect } from 'vitest';
import { ExcelService, type ExportColumnDef } from '../src/services/excelService.js';

describe('ExcelService Unit Test Suite', () => {
  describe('Header Normalization & Matching', () => {
    it('normalizes Arabic text by removing tashkeel, tatweel, and normalizing letters', () => {
      // Alef variants
      expect(ExcelService.normalizeHeader('أحمد')).toBe('احمد');
      expect(ExcelService.normalizeHeader('إبراهيم')).toBe('ابراهيم');
      expect(ExcelService.normalizeHeader('آمنة')).toBe('امنه'); // Taa marbuta -> haa

      // Tashkeel / Harakat
      expect(ExcelService.normalizeHeader('الطَّالِبُ')).toBe('الطالب');
      expect(ExcelService.normalizeHeader('دَرَجَةٌ')).toBe('درجه');

      // Tatweel (ـ)
      expect(ExcelService.normalizeHeader('الاســــم')).toBe('الاسم');

      // Alef Maksura
      expect(ExcelService.normalizeHeader('مصطفى')).toBe('مصطفي');
    });

    it('matches canonical headers from varied teacher wording', () => {
      expect(ExcelService.matchCanonicalHeader('اسم الطالب')).toBe('fullName');
      expect(ExcelService.matchCanonicalHeader('الاسم الثلاثي')).toBe('fullName');
      expect(ExcelService.matchCanonicalHeader('student name')).toBe('fullName');

      expect(ExcelService.matchCanonicalHeader('الرقم الاحصائي')).toBe('rollNumber');
      expect(ExcelService.matchCanonicalHeader('التسلسل')).toBe('rollNumber');
      expect(ExcelService.matchCanonicalHeader('رقم المقعد')).toBe('rollNumber');
      expect(ExcelService.matchCanonicalHeader('seat')).toBe('rollNumber');

      expect(ExcelService.matchCanonicalHeader('الشفهي')).toBe('oral');
      expect(ExcelService.matchCanonicalHeader('التحريري')).toBe('written');
      expect(ExcelService.matchCanonicalHeader('الواجبات')).toBe('homework');
      expect(ExcelService.matchCanonicalHeader('السلوك')).toBe('behavior');
      expect(ExcelService.matchCanonicalHeader('المواظبة')).toBe('participation');
      expect(ExcelService.matchCanonicalHeader('امتحان نصف السنة')).toBe('midterm');
      expect(ExcelService.matchCanonicalHeader('الامتحان النهائي')).toBe('finalExam');
      expect(ExcelService.matchCanonicalHeader('الدرجة')).toBe('score');
      expect(ExcelService.matchCanonicalHeader('الغياب')).toBe('isAbsent');
    });
  });

  describe('Delimiter Detection & CSV Parsing', () => {
    it('auto-detects comma, semicolon, and tab delimiters', () => {
      expect(ExcelService.detectDelimiter('اسم,تسلسل,درجة\nزيد,1,90')).toBe(',');
      expect(ExcelService.detectDelimiter('اسم;تسلسل;درجة\nزيد;1;90')).toBe(';');
      expect(ExcelService.detectDelimiter('اسم\tتسلسل\tدرجة\nزيد\t1\t90')).toBe('\t');
    });

    it('parses CSV with quoted values and escaped quotes correctly', () => {
      const csv = `"الاسم الثلاثي","العنوان","الملاحظة"\n"علي حسن","بغداد, الكرخ","طالب ""متميز"""`;
      const table = ExcelService.parseCsvTable(csv);

      expect(table).toHaveLength(2);
      expect(table[1][0]).toBe('علي حسن');
      expect(table[1][1]).toBe('بغداد, الكرخ');
      expect(table[1][2]).toBe('طالب "متميز"');
    });

    it('handles CRLF and LF newlines seamlessly', () => {
      const crlf = "اسم,درجة\r\nزيد,80\r\nعمر,95\r\n";
      const table = ExcelService.parseCsvTable(crlf);
      expect(table).toHaveLength(3);
      expect(table[1][0]).toBe('زيد');
      expect(table[2][0]).toBe('عمر');
    });
  });

  describe('Student Roster Import (T3.10)', () => {
    it('imports student roster with Eastern Arabic numerals and normalizes phone and seat number', () => {
      const rosterCsv = `اسم الطالب,التسلسل,هاتف ولي الأمر,الشعبة
علي عبد الحسين,١٠١,٠٧٧٠١٢٣٤٥٦٧,أ
كرار باسم,١٠٢,٠٧٨٠٩٨٧٦٥٤٣,أ`;

      const result = ExcelService.parseStudentRoster(rosterCsv);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      const s1 = result.data[0];
      expect(s1.fullName).toBe('علي عبد الحسين');
      expect(s1.rollNumber).toBe(101); // Eastern numeral converted
      expect(s1.guardianPhone).toBe('07701234567'); // Phone normalized to Western numerals
      expect(s1.division).toBe('أ');

      const s2 = result.data[1];
      expect(s2.fullName).toBe('كرار باسم');
      expect(s2.rollNumber).toBe(102);
      expect(s2.guardianPhone).toBe('07809876543');
    });

    it('skips empty rows and logs warnings for rows with missing student name', () => {
      const messyCsv = `اسم الطالب,التسلسل,الشعبة
زيد علي,1,أ
,2,أ
,,
عمر فاروق,3,ب`;

      const result = ExcelService.parseStudentRoster(messyCsv);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.data[0].fullName).toBe('زيد علي');
      expect(result.data[1].fullName).toBe('عمر فاروق');
    });

    it('returns error if student name header is completely missing', () => {
      const invalidCsv = `الرقم,الملاحظات\n1,ملاحظة`;
      const result = ExcelService.parseStudentRoster(invalidCsv);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Gradebook Sheet Import & Boundary Clamping', () => {
    it('parses grade sheet and clamps scores within valid boundaries', () => {
      const gradesCsv = `الرقم الاحصائي,الشفهي,التحريري,الواجبات,الدرجة
101,25,-5,18,105
102,15,14,20,85`;

      const result = ExcelService.parseGradebookSheet(gradesCsv);
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);

      const g1 = result.data[0];
      expect(g1.studentIdentifier).toBe('101');
      expect(g1.oral).toBe(20); // Clamped from 25 to max 20
      expect(g1.written).toBe(0); // Clamped from -5 to min 0
      expect(g1.homework).toBe(18);
      expect(g1.score).toBe(100); // Clamped from 105 to max 100
    });

    it('recognizes absent student indicator', () => {
      const gradesCsv = `اسم الطالب,الدرجة,الغياب\nزيد علي,0,غائب`;
      const result = ExcelService.parseGradebookSheet(gradesCsv);
      expect(result.success).toBe(true);
      expect(result.data[0].isAbsent).toBe(true);
    });
  });

  describe('CSV & Excel SpreadsheetML XML Export', () => {
    it('exports CSV with mandatory UTF-8 BOM (\\uFEFF) for Microsoft Excel compatibility', () => {
      const students = [
        { rollNumber: 1, fullName: 'زيد علي', division: 'أ', gender: 'male', guardianPhone: '07701234567' },
      ];
      const csv = ExcelService.exportStudentsToCsv(students);

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('زيد علي');
      expect(csv).toContain('التسلسل,اسم الطالب');
    });

    it('exports complete Gradebook to CSV with metadata and UTF-8 BOM', () => {
      const columns: ExportColumnDef[] = [
        { key: 'name', header: 'اسم الطالب' },
        { key: 'exam', header: 'الشهر الأول' },
      ];
      const rows = [{ name: 'زيد علي', exam: 85 }];
      const csv = ExcelService.exportGradebookToCsv(columns, rows, {
        schoolName: 'ثانوية المتميزين',
        subjectName: 'الرياضيات',
      });

      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('ثانوية المتميزين');
      expect(csv).toContain('الرياضيات');
      expect(csv).toContain('85');
    });

    it('generates native Microsoft Excel SpreadsheetML XML with <DisplayRightToLeft/> and #0F766E styling', () => {
      const columns: ExportColumnDef[] = [
        { key: 'name', header: 'اسم الطالب' },
        { key: 'score', header: 'الدرجة' },
      ];
      const rows = [
        { name: 'زيد علي', score: 88 },
        { name: 'عمر خالد', score: 45 }, // Failing (<50) -> should have FailStyle
      ];

      const xml = ExcelService.exportGradebookToExcelXml(columns, rows, {
        schoolName: 'مدرسة المتفوقين',
        subjectName: 'الفيزياء',
      });

      expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
      expect(xml).toContain('<?mso-application progid="Excel.Sheet"?>');
      expect(xml).toContain('<DisplayRightToLeft/>'); // Pure RTL orientation
      expect(xml).toContain('#0F766E'); // Teal header color
      expect(xml).toContain('FailStyle'); // Highlights failing score (<50)
      expect(xml).toContain('زيد علي');
      expect(xml).toContain('عمر خالد');
    });
  });
});
