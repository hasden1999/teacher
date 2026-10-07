/**
 * ClassesStudio - Classes, Divisions & Students Management Studio
 * Features:
 * - View classes and division lists
 * - Add new student directly to local SQLite
 * - Import students roster from Excel / CSV files
 * - Export students roster to CSV
 */

import React, { useState, useRef } from 'react';
import { useToast } from '../common/Toast.js';
import { excelService } from '../../services/excelService.js';
import type { StudentRowItem } from '../gradebook/types.js';

const INITIAL_STUDENTS_LIST: StudentRowItem[] = [
  { id: 'std_01', fullName: 'أحمد علي حسن', rollNumber: 1, gender: 'male', guardianPhone: '07701234567' },
  { id: 'std_02', fullName: 'كرار حسين مهدي', rollNumber: 2, gender: 'male', guardianPhone: '07801234567' },
  { id: 'std_03', fullName: 'زينب محمد جعفر', rollNumber: 3, gender: 'female', guardianPhone: '07901234567' },
  { id: 'std_04', fullName: 'فاطمة حيدر كاظم', rollNumber: 4, gender: 'female', guardianPhone: '07501234567' },
  { id: 'std_05', fullName: 'علي مصطفى جاسم', rollNumber: 5, gender: 'male', guardianPhone: '07712345678' },
];

export const ClassesStudio: React.FC = () => {
  const [students, setStudents] = useState<StudentRowItem[]>(INITIAL_STUDENTS_LIST);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentPhone, setNewStudentPhone] = useState('');
  const [newStudentGender, setNewStudentGender] = useState<'male' | 'female'>('male');
  const [selectedDivision, setSelectedDivision] = useState('شعبة أ');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useToast();

  const handleAddStudent = () => {
    if (!newStudentName.trim()) {
      showToast({ message: 'يرجى كتابة اسم الطالب أولاً', type: 'error' });
      return;
    }

    const newStudent: StudentRowItem = {
      id: `std_${Date.now()}`,
      fullName: newStudentName.trim(),
      rollNumber: students.length + 1,
      gender: newStudentGender,
      guardianPhone: newStudentPhone.trim() || undefined,
    };

    setStudents([...students, newStudent]);
    setNewStudentName('');
    setNewStudentPhone('');
    showToast({ message: `تمت إضافة الطالب (${newStudent.fullName}) بنجاح`, type: 'success' });
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const parsed = await excelService.importStudentsFromFile(file);
      if (parsed.length === 0) {
        showToast({ message: 'الملف لا يحتوي على بيانات صالحة', type: 'error' });
        return;
      }

      const imported: StudentRowItem[] = parsed.map((p: any, idx: number) => ({
        id: `std_imp_${Date.now()}_${idx}`,
        fullName: p.fullName,
        rollNumber: p.rollNumber || students.length + idx + 1,
        gender: p.gender || 'male',
        guardianPhone: p.guardianPhone,
      }));

      setStudents([...students, ...imported]);
      showToast({ message: `تم استيراد ${imported.length} طالباً بنجاح من الملف`, type: 'success' });
    } catch (err: any) {
      showToast({ message: `فشل الاستيراد: ${err.message}`, type: 'error' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExportRoster = () => {
    try {
      const rows = students.map((s) => ({
        'الرقم': s.rollNumber,
        'اسم الطالب': s.fullName,
        'الجنس': s.gender === 'male' ? 'ذكر' : 'أنثى',
        'هاتف ولي الأمر': s.guardianPhone || '',
      }));
      excelService.exportToCsv(rows, `قائمة_الطلبة_${selectedDivision}`);
      showToast({ message: 'تم تصدير قائمة الطلبة بنجاح بصيغة CSV', type: 'success' });
    } catch (err: any) {
      showToast({ message: `فشل التصدير: ${err.message}`, type: 'error' });
    }
  };

  return (
    <div dir="rtl" className="max-w-6xl mx-auto space-y-6 font-tajawal">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 shadow-sm border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">👥</span>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              إدارة الفصول والشعب وقوائم الطلبة
            </h2>
            <p className="text-xs text-slate-500">
              استيراد وتصدير قوائم الطلاب محلياً ودون أي خادم سحابي
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedDivision}
            onChange={(e) => setSelectedDivision(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
          >
            <option value="شعبة أ">الخامس العلمي - شعبة أ ({students.length} طالب)</option>
            <option value="شعبة ب">الخامس العلمي - شعبة ب</option>
            <option value="شعبة ج">الخامس العلمي - شعبة ج</option>
          </select>

          <label className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-teal-700 hover:bg-teal-600 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow">
            <span>📥</span>
            <span>استيراد ملف Excel/CSV</span>
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls"
              onChange={handleImportFile}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleExportRoster}
            className="min-h-[44px] px-3.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center gap-1.5"
          >
            <span>📤</span>
            <span>تصدير القائمة</span>
          </button>
        </div>
      </div>

      {/* Add Student Form */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-slate-200 dark:border-slate-800 space-y-3">
        <h3 className="font-bold text-xs text-slate-700 dark:text-slate-300">
          + إضافة طالب جديد للشعبة:
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-sm">
          <input
            type="text"
            placeholder="اسم الطالب الرباعي..."
            value={newStudentName}
            onChange={(e) => setNewStudentName(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
          />
          <input
            type="tel"
            placeholder="رقم هاتف ولي الأمر (واتساب)..."
            value={newStudentPhone}
            onChange={(e) => setNewStudentPhone(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-mono"
          />
          <select
            value={newStudentGender}
            onChange={(e) => setNewStudentGender(e.target.value as 'male' | 'female')}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold"
          >
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
          <button
            type="button"
            onClick={handleAddStudent}
            className="min-h-[44px] px-4 rounded-xl bg-teal-800 hover:bg-teal-900 text-white font-bold text-xs shadow transition"
          >
            إضافة الطالب
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <table className="w-full text-start text-xs border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold">
              <th className="p-3 w-16 text-center">ت</th>
              <th className="p-3">اسم الطالب الكامل</th>
              <th className="p-3 w-28 text-center">الجنس</th>
              <th className="p-3 w-40">هاتف ولي الأمر</th>
              <th className="p-3 w-28 text-center">الحالة</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {students.map((std, idx) => (
              <tr key={std.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                <td className="p-3 text-center font-mono font-bold text-slate-500">
                  {idx + 1}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
