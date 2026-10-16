/**
 * ClassesStudio - Classes, Divisions & Students Management Studio
 * Features:
 * - Dynamic classes and divisions from SQLite
 * - Add, delete students and divisions
 * - Mobile-first student card layout (< md) and responsive desktop table (>= md)
 * - Import and export students roster (CSV/Excel)
 * - Download standard sample CSV template for teachers
 */

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useToast } from '../common/Toast.js';
import { excelService } from '../../services/excelService.js';
import { gradebookDbService } from '../../services/gradebookDbService.js';
import { authService } from '../../services/authService.js';
import type { StudentRowItem } from '../gradebook/types.js';
import { StudentRosterOcrModal } from './StudentRosterOcrModal.js';

export const ClassesStudio: React.FC = () => {
  const [students, setStudents] = useState<StudentRowItem[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'male' | 'female'>('male');
  const [isAddFormOpen, setIsAddFormOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);

  const [divisionsList, setDivisionsList] = useState<Array<{ id: string; name: string }>>([
    { id: 'div_1', name: 'شعبة أ' },
    { id: 'div_2', name: 'شعبة ب' },
    { id: 'div_3', name: 'شعبة ج' },
  ]);

  const [selectedDivision, setSelectedDivision] = useState<string>(() => {
    if (typeof localStorage !== 'undefined') {
      return localStorage.getItem('techeeer_active_division') || 'شعبة أ';
    }
    return 'شعبة أ';
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();
  const teacherProfile = authService.getTeacherProfile();

  const activeDivisionObj = useMemo(() => {
    return divisionsList.find((d) => d.name === selectedDivision) || divisionsList[0];
  }, [divisionsList, selectedDivision]);

  const divisionId = activeDivisionObj?.id || 'div_1';

  // Load divisions and students from SQLite
  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        await gradebookDbService.ensureDefaultStructure();
        const classes = await gradebookDbService.getClasses();
        const currentClassId = classes[0]?.id || 'cls_prep_5';
        const dbDivs = await gradebookDbService.getDivisions(currentClassId);
        
        if (active && dbDivs && dbDivs.length > 0) {
          setDivisionsList(dbDivs.map((d) => ({ id: d.id, name: d.name })));
        }

        const dbStudents = await gradebookDbService.getStudentsByDivision(divisionId, true);
        if (active) {
          setStudents(
            dbStudents.map((s) => ({
              id: s.id,
              fullName: s.full_name,
              rollNumber: s.roll_number,
              gender: s.gender,
              guardianPhone: s.guardian_phone || undefined,
              notes: s.notes || undefined,
            }))
          );
        }
      } catch (err: any) {
        console.warn('Failed to load students in ClassesStudio:', err);
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [selectedDivision, divisionId]);

  const handleDivisionChange = (div: string) => {
    setSelectedDivision(div);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('techeeer_active_division', div);
    }
  };

  const handleCreateDivision = async () => {
    const divName = window.prompt('أدخل اسم الشعبة الجديدة (مثال: شعبة د أو شعبة رابعة):');
    if (!divName || !divName.trim()) return;
    const cleanName = divName.trim();
    const newDivId = `div_${Date.now()}`;
    try {
      const classes = await gradebookDbService.getClasses();
      const currentClassId = classes[0]?.id || 'cls_prep_5';
      await gradebookDbService.createDivision({
        id: newDivId,
        class_id: currentClassId,
        name: cleanName,
      });
      setDivisionsList((prev) => [...prev, { id: newDivId, name: cleanName }]);
      setSelectedDivision(cleanName);
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('techeeer_active_division', cleanName);
      }
      showToast({ message: `تمت إضافة (${cleanName}) بنجاح!`, type: 'success' });
    } catch (err: any) {
      showToast({ message: `فشل إنشاء الشعبة: ${err.message}`, type: 'error' });
    }
  };

  const handleAddStudent = async () => {
    if (!newStudentName.trim()) {
      showToast({ message: 'يرجى كتابة اسم الطالب أولاً', type: 'error' });
      return;
    }

    const cleanPhone = newStudentPhone
      .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[\s-]/g, '');

    const newStudentId = `std_${Date.now()}`;
    const newStudent: StudentRowItem = {
      id: newStudentId,
      fullName: newStudentName.trim(),
      rollNumber: students.length + 1,
      gender: newStudentGender,
      guardianPhone: cleanPhone || undefined,
    };

    try {
      await gradebookDbService.createStudent({
        id: newStudentId,
        division_id: divisionId,
        full_name: newStudent.fullName,
        gender: newStudent.gender || 'male',
        roll_number: newStudent.rollNumber,
        is_active: 1,
        guardian_phone: newStudent.guardianPhone || null,
        notes: null,
      });
      setStudents((prev) => [...prev, newStudent]);
      setNewStudentName('');
      setNewStudentPhone('');
      showToast({ message: `تمت إضافة الطالب (${newStudent.fullName}) بنجاح`, type: 'success' });
    } catch (err: any) {
      showToast({ message: `فشل حفظ الطالب في قاعدة البيانات: ${err.message}`, type: 'error' });
    }
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await excelService.importStudentsFromFile(file);
      if (parsed.length === 0) {
        showToast({ message: 'الملف لا يحتوي على بيانات صالحة. يرجى استخدام صيغة CSV المطابقة للنموذج.', type: 'error' });
        return;
      }

      const imported: StudentRowItem[] = parsed.map((p: any, idx: number) => ({
        id: `std_imp_${Date.now()}_${idx}`,
        fullName: p.fullName,
        rollNumber: p.rollNumber || students.length + idx + 1,
        gender: p.gender || 'male',
        guardianPhone: p.guardianPhone,
      }));

      const importedEntities = imported.map((s) => ({
        id: s.id,
        division_id: divisionId,
        full_name: s.fullName,
        gender: s.gender || 'male',
        roll_number: s.rollNumber,
        is_active: 1,
        guardian_phone: s.guardianPhone || null,
        notes: null,
      }));

      await gradebookDbService.bulkCreateStudents(importedEntities);
      setStudents((prev) => [...prev, ...imported]);
      showToast({ message: `تم استيراد ${imported.length} طالباً بنجاح وحفظهم في قاعدة البيانات`, type: 'success' });
    } catch (err: any) {
      showToast({ message: `فشل الاستيراد: ${err.message}`, type: 'error' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleApplyOcrStudents = async (
    ocrStudents: Array<{ fullName: string; gender: 'male' | 'female'; rollNumber?: number }>
  ) => {
    try {
      const startRoll = students.length;
      const newItems: StudentRowItem[] = ocrStudents.map((s, idx) => ({
        id: `std_ocr_${Date.now()}_${idx}`,
        fullName: s.fullName,
        rollNumber: s.rollNumber || startRoll + idx + 1,
        gender: s.gender,
      }));

      const entities = newItems.map((s) => ({
        id: s.id,
        division_id: divisionId,
        full_name: s.fullName,
        gender: s.gender || 'male',
        roll_number: s.rollNumber,
        is_active: 1,
        guardian_phone: null,
        notes: null,
      }));

      await gradebookDbService.bulkCreateStudents(entities);
      setStudents((prev) => [...prev, ...newItems]);
      showToast({
        message: `تمت إضافة ${newItems.length} طالباً بنجاح وحفظهم في قاعدة البيانات`,
        type: 'success',
      });
    } catch (err: any) {
      showToast({ message: `فشل حفظ الطلاب: ${err.message}`, type: 'error' });
    }
  };

  const handleDeleteStudent = async (studentId: string, studentName: string) => {
    if (window.confirm(`هل أنت متأكد من حذف الطالب (${studentName})؟ سيتم مسح كافة درجاته المسجلة.`)) {
      try {
        await gradebookDbService.deleteStudent(studentId);
        setStudents((prev) => prev.filter((s) => s.id !== studentId));
        showToast({ message: `تم حذف الطالب (${studentName}) بنجاح من قاعدة البيانات`, type: 'info' });
      } catch (err: any) {
        showToast({ message: `فشل حذف الطالب: ${err.message}`, type: 'error' });
      }
    }
  };

  const handleExportRoster = () => {
    try {
      const rows = students.map((s) => ({
        'الرقم': s.rollNumber,
        'اسم الطالب': s.fullName,
        'الجنس': s.gender === 'female' ? 'أنثى' : 'ذكر',
        'هاتف ولي الأمر': s.guardianPhone || '',
      }));
      excelService.exportToCsv(rows, `قائمة_الطلبة_${selectedDivision}`);
      showToast({ message: 'تم تصدير قائمة الطلبة بنجاح بصيغة CSV', type: 'success' });
    } catch (err: any) {
      showToast({ message: `فشل التصدير: ${err.message}`, type: 'error' });
    }
  };

  const handleDownloadSampleTemplate = () => {
    const sampleRows = [
      { 'الرقم': 1, 'اسم الطالب': 'أحمد علي حسن', 'الجنس': 'ذكر', 'هاتف ولي الأمر': '07701234567' },
      { 'الرقم': 2, 'اسم الطالب': 'فاطمة محمد كاظم', 'الجنس': 'أنثى', 'هاتف ولي الأمر': '07801234567' },
      { 'الرقم': 3, 'اسم الطالب': 'كرار حسين مهدي', 'الجنس': 'ذكر', 'هاتف ولي الأمر': '07901234567' },
      { 'الرقم': 4, 'اسم الطالب': 'زينب حيدر جاسم', 'الجنس': 'أنثى', 'هاتف ولي الأمر': '07501234567' },
    ];
    excelService.exportToCsv(sampleRows, 'قالب_استيراد_الطلاب_النموذجي');
    showToast({ message: 'تم تحميل نموذج CSV الجاهز لتعبئة بيانات الطلاب', type: 'info' });
  };

  return (
    <div dir="rtl" className="max-w-6xl mx-auto space-y-4 sm:space-y-6 font-tajawal pb-16">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-xs border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👥</span>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              إدارة الفصول والشعب وقوائم الطلبة
            </h2>
            <p className="text-xs text-slate-500">
              {teacherProfile ? `الصف: ${teacherProfile.grade || ''} | المادة: ${teacherProfile.subject || ''}` : 'إدارة القوائم محلياً دون إنترنت'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Division Selector */}
          <select
            value={selectedDivision}
            onChange={(e) => handleDivisionChange(e.target.value)}
            className="flex-1 sm:flex-none min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100"
          >
            {divisionsList.map((div) => (
              <option key={div.id} value={div.name}>
                {div.name} {selectedDivision === div.name ? `(${students.length} طالب)` : ''}
              </option>
            ))}
          </select>

          {/* Add Division Button */}
          <button
            type="button"
            onClick={handleCreateDivision}
            className="min-h-[44px] px-3 py-1.5 rounded-xl border border-teal-300 dark:border-teal-700 bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 text-teal-800 dark:text-teal-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            title="إضافة شعبة جديدة"
          >
            <span>+</span>
            <span>شعبة جديدة</span>
          </button>

          {/* Import File Button */}
          <label className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs">
            <span>📥</span>
            <span>استيراد CSV</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          {/* Handwritten OCR Button */}
          <button
            type="button"
            onClick={() => setIsOcrModalOpen(true)}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-teal-800 hover:bg-teal-700 active:scale-95 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="إدراج الطلاب عبر تصوير القائمة المكتوبة بخط اليد بالكاميرا أو رفع صورة"
          >
            <span>📸</span>
            <span>مسح خط اليد / كاميرا</span>
          </button>

          {/* Export Roster Button */}
          <button
            type="button"
            onClick={handleExportRoster}
            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
          >
            <span>📤</span>
            <span>تصدير</span>
          </button>

          {/* Download Sample Template */}
          <button
            type="button"
            onClick={handleDownloadSampleTemplate}
            className="min-h-[44px] px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
            title="تحميل نموذج جاهز لملء الأسماء"
          >
            <span>📄 نموذج</span>
          </button>
        </div>
      </div>

      {/* Add Student Accordion / Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 shadow-xs border border-slate-200 dark:border-slate-800 space-y-3">
        <div
          onClick={() => setIsAddFormOpen(!isAddFormOpen)}
          className="flex items-center justify-between cursor-pointer select-none"
        >
          <h3 className="font-bold text-xs sm:text-sm text-teal-900 dark:text-teal-300 flex items-center gap-2">
            <span>➕</span>
            <span>إضافة طالب جديد إلى ({selectedDivision})</span>
          </h3>
          <span className="text-xs text-slate-400">{isAddFormOpen ? '▲ إخفاء' : '▼ إظهار الحقول'}</span>
        </div>

        {isAddFormOpen && (
          <div className="pt-2 grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-sm animate-in fade-in">
            <input
              type="text"
              placeholder="اسم الطالب الرباعي..."
              value={newStudentName}
              onChange={(e) => setNewStudentName(e.target.value)}
              className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs text-slate-900 dark:text-slate-100"
            />
            <input
              type="tel"
              placeholder="رقم هاتف ولي الأمر (077XXXXXXXX)..."
              value={newStudentPhone}
              onChange={(e) => setNewStudentPhone(e.target.value)}
              className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono text-slate-900 dark:text-slate-100"
            />
            <select
              value={newStudentGender}
              onChange={(e) => setNewStudentGender(e.target.value as 'male' | 'female')}
              className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-900 dark:text-slate-100"
            >
              <option value="male">ذكر</option>
              <option value="female">أنثى</option>
            </select>
            <button
              type="button"
              onClick={handleAddStudent}
              className="min-h-[44px] px-4 rounded-xl bg-teal-800 hover:bg-teal-700 active:scale-95 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              حفظ الطالب
            </button>
          </div>
        )}
      </div>

      {/* Main Student List Display */}
      {students.length === 0 ? (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-12 text-center text-slate-500 space-y-3 border-2 border-dashed border-slate-200 dark:border-slate-800">
          <span className="text-4xl block">👥</span>
          <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">
            لا يوجد طلاب مسجلون في ({selectedDivision}) حالياً
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            يمكنك إضافة طلاب يدوياً بالأعلى أو استيراد ملف CSV أو تحميل النموذج النموذجي.
          </p>
        </div>
      ) : (
        <>
          {/* Mobile Student Cards (< md) */}
          <div className="md:hidden space-y-2.5">
            {students.map((std, idx) => (
              <div
                key={std.id}
                className="bg-white dark:bg-slate-900 rounded-2xl p-3.5 shadow-xs border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-800 dark:text-teal-300 font-black text-xs flex items-center justify-center shrink-0 shadow-xs">
                    {std.rollNumber || idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 truncate">
                    <h4 className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                      {std.fullName}
                    </h4>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500">
                      <span>{std.gender === 'female' ? 'أنثى' : 'ذكر'}</span>
                      {std.guardianPhone && (
                        <span className="font-mono">| {std.guardianPhone}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {std.guardianPhone && (
                    <a
                      href={`https://wa.me/964${std.guardianPhone.replace(/\D/g, '').replace(/^0/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center text-sm border border-emerald-200 dark:border-emerald-800/60"
                      title="مراسلة ولي الأمر عبر واتساب"
                      aria-label="واتساب"
                    >
                      💬
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteStudent(std.id, std.fullName)}
                    className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center text-xs border border-rose-200 dark:border-rose-900 cursor-pointer"
                    title="حذف الطالب"
                    aria-label="حذف"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Students Table (>= md) */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden">
            <table className="w-full text-start text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
                  <th className="p-3 w-16 text-center">ت</th>
                  <th className="p-3">اسم الطالب الكامل</th>
                  <th className="p-3 w-28 text-center">الجنس</th>
                  <th className="p-3 w-40">هاتف ولي الأمر</th>
                  <th className="p-3 w-28 text-center">الحالة</th>
                  <th className="p-3 w-24 text-center">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {students.map((std, idx) => (
                  <tr key={std.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="p-3 text-center font-mono font-bold text-slate-500">
                      {std.rollNumber || idx + 1}
                    </td>
                    <td className="p-3 font-bold text-slate-800 dark:text-slate-100">
                      {std.fullName}
                    </td>
                    <td className="p-3 text-center text-slate-600 dark:text-slate-400">
                      {std.gender === 'female' ? 'أنثى' : 'ذكر'}
                    </td>
                    <td className="p-3 font-mono text-slate-600 dark:text-slate-400">
                      {std.guardianPhone || '—'}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                        مستمر بالدوام
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleDeleteStudent(std.id, std.fullName)}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-lg text-xs font-bold transition cursor-pointer"
                        title="حذف الطالب من الشعبة وسجل الدرجات"
                      >
                        🗑️ حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Handwritten OCR Roster Modal */}
      <StudentRosterOcrModal
        isOpen={isOcrModalOpen}
        onClose={() => setIsOcrModalOpen(false)}
        onApplyStudents={handleApplyOcrStudents}
        divisionName={selectedDivision}
      />
    </div>
  );
};
