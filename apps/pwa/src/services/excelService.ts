/**
 * Excel & CSV Service for Iraqi Teacher Assistant
 * Provides offline, zero-external-dependency bulk import/export for student rosters and grade sheets.
 * Features:
 * - Flexible Arabic header normalization (Alef variants, Taa Marbuta, diacritics, tatweel)
 * - Automatic Eastern/Western Arabic numerals conversion using @techeeer/core
 * - UTF-8 BOM (\uFEFF) prefixed CSV export for seamless Excel Arabic display
 * - Microsoft Excel SpreadsheetML XML export with native <DisplayRightToLeft/> RTL layout
 */

import { parseArabicNumber, toWesternNumerals } from '@techeeer/core';

export interface ParsedStudentRow {
  rowNumber: number;
  fullName: string;
  rollNumber: number;
  gender: 'male' | 'female';
  division?: string;
  gradeLevel?: number;
  guardianPhone?: string;
  notes?: string;
}

export interface ParsedGradeRow {
  rowNumber: number;
  studentIdentifier: string; // rollNumber or fullName
  oral?: number;
  written?: number;
  homework?: number;
  behavior?: number;
  participation?: number;
  score?: number;
  isAbsent?: boolean;
}

export interface ImportParseResult<T> {
  success: boolean;
  data: T[];
  headersFound: string[];
  recognizedMapping: Record<string, string>;
  errors: Array<{ row: number; column?: string; message: string }>;
  warnings: Array<{ row: number; column?: string; message: string }>;
  totalRowsProcessed: number;
}

export interface ExportColumnDef {
  key: string;
  header: string;
  width?: number;
  format?: 'text' | 'number' | 'percentage';
}

export interface GradebookExportOptions {
  schoolName?: string;
  teacherName?: string;
  subjectName?: string;
  className?: string;
  divisionName?: string;
  academicYear?: string;
}

export class ExcelService {
  /**
   * Normalizes an Arabic string for resilient header dictionary matching:
   * - Strips diacritics (tashkeel)
   * - Strips tatweel (ـ)
   * - Unifies Alef variants (أ, إ, آ, ٱ -> ا)
   * - Unifies Taa Marbuta (ة -> ه)
   * - Unifies Alef Maksura (ى -> ي)
   * - Strips non-alphanumeric punctuation and collapses whitespace
   */
  public static normalizeHeader(raw: string): string {
    if (!raw || typeof raw !== 'string') return '';

    return raw
      // Remove UTF-8 BOM if present
      .replace(/^\uFEFF/, '')
      // Remove Arabic Tashkeel / Harakat
      .replace(/[\u064B-\u065F\u0670]/g, '')
      // Remove Tatweel (Kashida)
      .replace(/\u0640/g, '')
      // Normalize Alef variants
      .replace(/[أإآٱ]/g, 'ا')
      // Normalize Taa Marbuta to Haa
      .replace(/ة/g, 'ه')
      // Normalize Alef Maksura to Yaa
      .replace(/ى/g, 'ي')
      // Remove common punctuation except letters and digits
      .replace(/[/\\_,\-.:;()[\]{}*#|]/g, ' ')
      // Convert to lower case and collapse multiple spaces
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
  }

  /**
   * Maps a normalized header to its canonical field name.
   */
  public static matchCanonicalHeader(rawInput: string): string | null {
    const normalized = this.normalizeHeader(rawInput);
    const dictionary: Record<string, string[]> = {
      fullName: [
        'اسم الطالب',
        'الاسم',
        'الاسم الثلاثي',
        'الاسم الرباعي',
        'اسم التلميذ',
        'الاسم الكامل',
        'student name',
        'name',
        'fullname',
      ],
      rollNumber: [
        'الرقم الاحصائي',
        'الرقم الامتحاني',
        'رقم القيد',
        'التسلسل',
        'رقم المقعد',
        'رقم الجلوس',
        'الرقم',
        'ت',
        'roll number',
        'id',
        'seat',
        'rollno',
      ],
      gender: ['الجنس', 'النوع', 'ذكر انثى', 'gender', 'sex'],
      division: ['الشعبة', 'شعبة', 'القسم', 'division', 'section'],
      gradeLevel: ['الصف', 'المرحلة', 'الصف الدراسي', 'class', 'grade'],
      guardianPhone: [
        'هاتف ولي الامر',
        'رقم الهاتف',
        'الموبايل',
        'الهاتف',
        'رقم الموبايل',
        'هاتف',
        'موبايل',
        'phone',
        'mobile',
        'guardian phone',
      ],
      notes: ['الملاحظات', 'ملاحظات', 'notes', 'remarks'],
      oral: ['الشفهي', 'الشفوي', 'شفهي', 'شفوي', 'oral'],
      written: ['التحريري', 'الكتبي', 'تحريري', 'written'],
      homework: ['الواجبات', 'الواجب البيتي', 'الواجب', 'واجبات', 'homework', 'hw'],
      behavior: ['السلوك', 'السلوك والمواظبه', 'سلوك', 'behavior'],
      participation: ['المواظبه', 'المشاركة', 'مشاركه', 'النشاط', 'participation'],
      midterm: ['امتحان نصف السنه', 'نصف السنه', 'امتحان نصف العام', 'midterm', 'mid term'],
      finalExam: ['امتحان نهايه السنه', 'الامتحان النهائي', 'النهائي', 'final', 'final exam'],
      score: ['الدرجة', 'درجه', 'المعدل', 'المجموع', 'النتيجة', 'نتيجه', 'score', 'grade', 'total'],
      isAbsent: ['الغياب', 'الحالة', 'حاله', 'غائب', 'absent', 'status'],
    };

    // Pass 1: Exact match
    for (const [canonical, synonyms] of Object.entries(dictionary)) {
      if (synonyms.some((s) => normalized === s)) {
        return canonical;
      }
    }

    // Pass 2: Substring matching only for tokens of length >= 3
    for (const [canonical, synonyms] of Object.entries(dictionary)) {
      if (
        synonyms.some(
          (s) => s.length >= 3 && (normalized.includes(s) || s.includes(normalized))
        )
      ) {
        return canonical;
      }
    }

    return null;
  }

  /**
   * Auto-detects line delimiters: comma (,), semicolon (;), or tab (\t).
   */
  public static detectDelimiter(sampleText: string): string {
    const clean = sampleText.replace(/^\uFEFF/, '').trim();
    const firstLine = clean.split(/\r?\n/)[0] || '';

    const commaCount = (firstLine.match(/,/g) || []).length;
    const semicolonCount = (firstLine.match(/;/g) || []).length;
    const tabCount = (firstLine.match(/\t/g) || []).length;

    if (tabCount >= commaCount && tabCount >= semicolonCount && tabCount > 0) {
      return '\t';
    }
    if (semicolonCount > commaCount && semicolonCount > 0) {
      return ';';
    }
    return ',';
  }

  /**
   * Parses CSV or TSV string respecting quoted strings, escaped quotes, and CRLF line breaks.
   */
  public static parseCsvTable(rawText: string, customDelimiter?: string): string[][] {
    if (!rawText || !rawText.trim()) return [];

    const text = rawText.replace(/^\uFEFF/, '');
    const delimiter = customDelimiter || this.detectDelimiter(text);

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    let i = 0;

    while (i < text.length) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            // Escaped quote: "" -> "
            currentCell += '"';
            i += 2;
            continue;
          } else {
            // End of quoted section
            inQuotes = false;
            i++;
            continue;
          }
        } else {
          currentCell += char;
          i++;
          continue;
        }
      }

      if (char === '"') {
        inQuotes = true;
        i++;
        continue;
      }

      if (char === delimiter) {
        currentRow.push(currentCell.trim());
        currentCell = '';
        i++;
        continue;
      }

      if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
        i++;
        continue;
      }

      if (char === '\n') {
        currentRow.push(currentCell.trim());
        if (currentRow.some((c) => c !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
        i++;
        continue;
      }

      currentCell += char;
      i++;
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some((c) => c !== '')) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Parses Student Rosters from CSV / TSV / Excel copy-paste.
   * Handles Eastern/Western numerals and normalizes phone numbers.
   */
  public static parseStudentRoster(
    rawText: string,
    defaultDivision: string = 'أ'
  ): ImportParseResult<ParsedStudentRow> {
    const result: ImportParseResult<ParsedStudentRow> = {
      success: true,
      data: [],
      headersFound: [],
      recognizedMapping: {},
      errors: [],
      warnings: [],
      totalRowsProcessed: 0,
    };

    const table = this.parseCsvTable(rawText);
    if (table.length === 0) {
      result.success = false;
      result.errors.push({ row: 0, message: 'الملف فارغ أو لا يحتوي على بيانات صالحة' });
      return result;
    }

    // 1. Process Header
    const rawHeaders = table[0];
    result.headersFound = rawHeaders;

    const columnMap: Record<string, number> = {};
    rawHeaders.forEach((h, index) => {
      const normalized = this.normalizeHeader(h);
      const canonical = this.matchCanonicalHeader(normalized);
      if (canonical) {
        columnMap[canonical] = index;
        result.recognizedMapping[h] = canonical;
      }
    });

    if (columnMap['fullName'] === undefined) {
      // If no explicit fullName header, check if column 1 or 0 has names
      // Or search for first non-numeric header
      const possibleNameIndex = rawHeaders.findIndex((h) => {
        const n = this.normalizeHeader(h);
        return n.includes('اسم') || n.includes('طالب') || n.includes('تلميذ');
      });

      if (possibleNameIndex !== -1) {
        columnMap['fullName'] = possibleNameIndex;
        result.recognizedMapping[rawHeaders[possibleNameIndex]] = 'fullName';
      } else {
        result.success = false;
        result.errors.push({
          row: 1,
          message: 'لم يتم العثور على عمود اسم الطالب (مثل: "اسم الطالب"، "الاسم الثلاثي")',
        });
        return result;
      }
    }

    // 2. Process Data Rows
    for (let r = 1; r < table.length; r++) {
      const row = table[r];
      result.totalRowsProcessed++;

      // Skip completely empty rows
      if (row.every((cell) => !cell || !cell.trim())) {
        continue;
      }

      const nameCell = row[columnMap['fullName']]?.trim() || '';
      if (!nameCell) {
        result.warnings.push({
          row: r + 1,
          column: 'fullName',
          message: `تم تخطي الصف ${r + 1} لعدم وجود اسم الطالب`,
        });
        continue;
      }

      // Roll Number
      let rollNumber = r;
      if (columnMap['rollNumber'] !== undefined && row[columnMap['rollNumber']]) {
        const parsedRoll = parseArabicNumber(row[columnMap['rollNumber']]);
        if (parsedRoll !== null && !isNaN(parsedRoll) && parsedRoll > 0) {
          rollNumber = parsedRoll;
        }
      }

      // Gender
      let gender: 'male' | 'female' = 'male';
      if (columnMap['gender'] !== undefined && row[columnMap['gender']]) {
        const gStr = this.normalizeHeader(row[columnMap['gender']]);
        if (gStr.includes('انثى') || gStr.includes('بنت') || gStr === 'female' || gStr === 'f') {
          gender = 'female';
        }
      }

      // Division
      let division = defaultDivision;
      if (columnMap['division'] !== undefined && row[columnMap['division']]) {
        const divVal = row[columnMap['division']].trim();
        if (divVal) division = divVal;
      }

      // Guardian Phone
      let guardianPhone: string | undefined;
      if (columnMap['guardianPhone'] !== undefined && row[columnMap['guardianPhone']]) {
        const rawPhone = row[columnMap['guardianPhone']].trim();
        if (rawPhone) {
          guardianPhone = toWesternNumerals(rawPhone).replace(/[^\d+]/g, '');
        }
      }

      // Grade level
      let gradeLevel: number | undefined;
      if (columnMap['gradeLevel'] !== undefined && row[columnMap['gradeLevel']]) {
        const gLevelParsed = parseArabicNumber(row[columnMap['gradeLevel']]);
        if (gLevelParsed !== null && !isNaN(gLevelParsed)) {
          gradeLevel = gLevelParsed;
        }
      }

      // Notes
      let notes: string | undefined;
      if (columnMap['notes'] !== undefined && row[columnMap['notes']]) {
        notes = row[columnMap['notes']].trim();
      }

      result.data.push({
        rowNumber: r + 1,
        fullName: nameCell,
        rollNumber,
        gender,
        division,
        gradeLevel,
        guardianPhone,
        notes,
      });
    }

    return result;
  }

  /**
   * Parses Gradebook Sheet matching students by roll number or full name.
   */
  public static parseGradebookSheet(rawText: string): ImportParseResult<ParsedGradeRow> {
    const result: ImportParseResult<ParsedGradeRow> = {
      success: true,
      data: [],
      headersFound: [],
      recognizedMapping: {},
      errors: [],
      warnings: [],
      totalRowsProcessed: 0,
    };

    const table = this.parseCsvTable(rawText);
    if (table.length === 0) {
      result.success = false;
      result.errors.push({ row: 0, message: 'ملف الدرجات فارغ' });
      return result;
    }

    const rawHeaders = table[0];
    result.headersFound = rawHeaders;

    const columnMap: Record<string, number> = {};
    rawHeaders.forEach((h, index) => {
      const normalized = this.normalizeHeader(h);
      const canonical = this.matchCanonicalHeader(normalized);
      if (canonical) {
        columnMap[canonical] = index;
        result.recognizedMapping[h] = canonical;
      }
    });

    const idIndex = columnMap['rollNumber'] ?? columnMap['fullName'];
    if (idIndex === undefined) {
      result.success = false;
      result.errors.push({
        row: 1,
        message: 'يجب توفر عمود لتعريف الطالب (اسم الطالب أو التسلسل / الرقم الإحصائي)',
      });
      return result;
    }

    const parseComponent = (raw?: string, max: number = 20): number | undefined => {
      if (!raw || !raw.trim()) return undefined;
      const num = parseArabicNumber(raw);
      if (num === null || isNaN(num)) return undefined;
      return Math.min(max, Math.max(0, num));
    };

    for (let r = 1; r < table.length; r++) {
      const row = table[r];
      result.totalRowsProcessed++;

      if (row.every((cell) => !cell || !cell.trim())) continue;

      const identifier = row[idIndex]?.trim();
      if (!identifier) {
        result.warnings.push({
          row: r + 1,
          message: `تم تخطي الصف ${r + 1} لعدم وجود معرّف الطالب`,
        });
        continue;
      }

      // Check absent status
      let isAbsent = false;
      if (columnMap['isAbsent'] !== undefined && row[columnMap['isAbsent']]) {
        const absStr = this.normalizeHeader(row[columnMap['isAbsent']]);
        if (absStr.includes('غائب') || absStr.includes('نعم') || absStr === 'absent' || absStr === '1') {
          isAbsent = true;
        }
      }

      const oral = columnMap['oral'] !== undefined ? parseComponent(row[columnMap['oral']], 20) : undefined;
      const written = columnMap['written'] !== undefined ? parseComponent(row[columnMap['written']], 20) : undefined;
      const homework = columnMap['homework'] !== undefined ? parseComponent(row[columnMap['homework']], 20) : undefined;
      const behavior = columnMap['behavior'] !== undefined ? parseComponent(row[columnMap['behavior']], 20) : undefined;
      const participation =
        columnMap['participation'] !== undefined ? parseComponent(row[columnMap['participation']], 20) : undefined;
      const score = columnMap['score'] !== undefined ? parseComponent(row[columnMap['score']], 100) : undefined;

      result.data.push({
        rowNumber: r + 1,
        studentIdentifier: identifier,
        oral,
        written,
        homework,
        behavior,
        participation,
        score,
        isAbsent,
      });
    }

    return result;
  }

  /**
   * Helper to escape CSV values according to RFC 4180
   * Hardened against Spreadsheet / Formula Injection:
   * Prepends a single quote (') if the cell starts with =, +, -, or @.
   */
  public static escapeCsvCell(val: any): string {
    if (val === null || val === undefined) return '';
    let str = String(val);
    if (/^[=+\-@]/.test(str)) {
      str = `'${str}`;
    }
    if (str.includes(',') || str.includes('\n') || str.includes('\r') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  /**
   * Exports student roster to CSV with UTF-8 BOM (\uFEFF) for immediate Arabic readability in Excel.
   */
  public static exportStudentsToCsv(students: Array<ParsedStudentRow | { rollNumber: number; fullName: string; division?: string; gender?: string; guardianPhone?: string }>): string {
    const BOM = '\uFEFF';
    const header = ['التسلسل', 'اسم الطالب', 'الشعبة', 'الجنس', 'هاتف ولي الأمر'].map(this.escapeCsvCell).join(',');
    const rows = students.map((s) => {
      const genderLabel = s.gender === 'female' ? 'أنثى' : 'ذكر';
      return [
        this.escapeCsvCell(s.rollNumber),
        this.escapeCsvCell(s.fullName),
        this.escapeCsvCell(s.division || 'أ'),
        this.escapeCsvCell(genderLabel),
        this.escapeCsvCell(s.guardianPhone || ''),
      ].join(',');
    });

    return BOM + [header, ...rows].join('\r\n');
  }

  /**
   * Exports complete Gradebook to CSV with UTF-8 BOM.
   */
  public static exportGradebookToCsv(
    columns: ExportColumnDef[],
    rows: Array<Record<string, any>>,
    metadata: GradebookExportOptions = {}
  ): string {
    const BOM = '\uFEFF';
    const metaLines: string[] = [];

    if (metadata.schoolName) {
      metaLines.push(`${this.escapeCsvCell('المدرسة')},${this.escapeCsvCell(metadata.schoolName)}`);
    }
    if (metadata.className || metadata.divisionName) {
      metaLines.push(
        `${this.escapeCsvCell('الصف والشعبة')},${this.escapeCsvCell(`${metadata.className || ''} (${metadata.divisionName || ''})`)}`
      );
    }
    if (metadata.subjectName) {
      metaLines.push(`${this.escapeCsvCell('المادة')},${this.escapeCsvCell(metadata.subjectName)}`);
    }
    if (metadata.academicYear) {
      metaLines.push(`${this.escapeCsvCell('العام الدراسي')},${this.escapeCsvCell(metadata.academicYear)}`);
    }
    if (metaLines.length > 0) {
      metaLines.push(''); // Blank separator
    }

    const header = columns.map((c) => this.escapeCsvCell(c.header)).join(',');
    const dataRows = rows.map((r) => columns.map((c) => this.escapeCsvCell(r[c.key] ?? '')).join(','));

    return BOM + [...metaLines, header, ...dataRows].join('\r\n');
  }

  /**
   * Exports complete Gradebook to native Microsoft Excel SpreadsheetML (XML)
   * with pure RTL (<DisplayRightToLeft/>) layout, styled teal headers (#0F766E), and fail highlights.
   */
  public static exportGradebookToExcelXml(
    columns: ExportColumnDef[],
    rows: Array<Record<string, any>>,
    metadata: GradebookExportOptions = {}
  ): string {
    const escapeXmlFormula = (val: any) => {
      if (val === null || val === undefined) return '';
      let str = String(val);
      if (/^[=+\-@]/.test(str)) {
        str = `'${str}`;
      }
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };

    const headerCells = columns
      .map(
        (col) => `
      <Cell ss:StyleID="HeaderStyle">
        <Data ss:Type="String">${escapeXmlFormula(col.header)}</Data>
      </Cell>`
      )
      .join('');

    const rowNodes = rows
      .map((row) => {
        const cells = columns
          .map((col) => {
            const val = row[col.key];
            const isNum = typeof val === 'number' && !isNaN(val);
            const type = isNum ? 'Number' : 'String';
            const style = isNum && val < 50 ? 'FailStyle' : 'DataStyle';
            return `
        <Cell ss:StyleID="${style}">
          <Data ss:Type="${type}">${isNum ? val : escapeXmlFormula(val)}</Data>
        </Cell>`;
          })
          .join('');
        return `<Row ss:Height="22">${cells}</Row>`;
      })
      .join('\n');

    const metaRow = metadata.subjectName
      ? `<Row ss:Height="24">
          <Cell ss:StyleID="MetaStyle"><Data ss:Type="String">${escapeXmlFormula(`${metadata.schoolName || ''} - ${metadata.subjectName || ''} - ${metadata.className || ''}`)}</Data></Cell>
        </Row>`
      : '';

    return `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal">
   <Alignment ss:Vertical="Center" ss:ReadingOrder="RightToLeft"/>
   <Font ss:FontName="Tajawal" ss:Size="11"/>
  </Style>
  <Style ss:ID="MetaStyle">
   <Alignment ss:Horizontal="Right" ss:Vertical="Center"/>
   <Font ss:FontName="Tajawal" ss:Size="12" ss:Bold="1" ss:Color="#0F766E"/>
  </Style>
  <Style ss:ID="HeaderStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Top" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1"/>
   </Borders>
   <Font ss:FontName="Tajawal" ss:Size="12" ss:Bold="1" ss:Color="#FFFFFF"/>
   <Interior ss:Color="#0F766E" ss:Pattern="Solid"/>
  </Style>
  <Style ss:ID="DataStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Tajawal" ss:Size="11"/>
  </Style>
  <Style ss:ID="FailStyle">
   <Alignment ss:Horizontal="Center" ss:Vertical="Center"/>
   <Borders>
    <Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Left" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
    <Border ss:Position="Right" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#E2E8F0"/>
   </Borders>
   <Font ss:FontName="Tajawal" ss:Size="11" ss:Bold="1" ss:Color="#DC2626"/>
   <Interior ss:Color="#FEE2E2" ss:Pattern="Solid"/>
  </Style>
 </Styles>
 <Worksheet ss:Name="سجل الدرجات">
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel">
   <DisplayRightToLeft/>
  </WorksheetOptions>
  <Table>
   ${metaRow}
   <Row ss:Height="28">
    ${headerCells}
   </Row>
   ${rowNodes}
  </Table>
 </Worksheet>
</Workbook>`;
  }

  /**
   * Browser-safe file download trigger using Object URL.
   */
  public static downloadFile(content: BlobPart, filename: string, mimeType: string): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);
  }

  /**
   * Helper to export arbitrary records to CSV and trigger download
   */
  public static exportToCsv(data: Record<string, any>[], filename: string): void {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const BOM = '\uFEFF';
    const headerRow = headers.map((h) => ExcelService.escapeCsvCell(h)).join(',');
    const rows = data.map((row) => headers.map((h) => ExcelService.escapeCsvCell(row[h])).join(','));
    const csvContent = BOM + [headerRow, ...rows].join('\r\n');
    ExcelService.downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8;');
  }

  /**
   * Helper to parse File object to ParsedStudentRow list
   */
  public static async importStudentsFromFile(file: File): Promise<ParsedStudentRow[]> {
    const text = await file.text();
    const result = ExcelService.parseStudentRoster(text);
    return result.data;
  }
}

export const excelService = ExcelService;
