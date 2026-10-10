import React, { useState, useEffect } from 'react';
import {
  authService,
  SUBSCRIPTION_TIERS,
  SubscriptionTier,
  AdminLockoutInfo,
} from '../../services/authService.js';
import {
  getActiveGeminiApiKey,
  setActiveGeminiApiKey,
  DEFAULT_CENTRAL_GEMINI_API_KEY,
} from '../../config/aiConfig.js';
import { useToast } from '../common/Toast.js';

export interface IssuedLicenseRecord {
  id: string;
  teacherName: string;
  phone: string;
  schoolName?: string;
  governorate?: string;
  subject?: string;
  tier: SubscriptionTier;
  tierLabel: string;
  issuedAt: number;
  expiresAt: number;
  token: string;
  priceIqd: number;
  isLocalProfile?: boolean;
  status?: 'active' | 'trial' | 'expired';
}

const STORAGE_KEY_LEDGER = 'techeeer_admin_license_ledger';

const TIER_PRICES_IQD: Record<SubscriptionTier, number> = {
  weekly: 5000,
  monthly: 10000,
  semi_annual: 18000,
  annual: 25000,
  single: 25000,
  school: 175000,
  pro: 35000,
};

export const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(authService.isAdminLoggedIn());
  const [adminPin, setAdminPin] = useState<string>('');
  const [adminUsername, setAdminUsername] = useState<string>('admin');
  const [lockoutInfo, setLockoutInfo] = useState<AdminLockoutInfo>(authService.getAdminLockoutInfo());
  
  // Navigation tab inside admin portal
  const [adminTab, setAdminTab] = useState<'generator' | 'subscribers' | 'settings'>('subscribers');

  // Generator form state
  const [targetPhone, setTargetPhone] = useState<string>('');
  const [targetTeacherName, setTargetTeacherName] = useState<string>('');
  const [selectedTier, setSelectedTier] = useState<SubscriptionTier>('annual');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);

  // Manual Add Subscriber Form Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [newSubName, setNewSubName] = useState<string>('');
  const [newSubPhone, setNewSubPhone] = useState<string>('');
  const [newSubSchool, setNewSubSchool] = useState<string>('');
  const [newSubGov, setNewSubGov] = useState<string>('بغداد');
  const [newSubTier, setNewSubTier] = useState<SubscriptionTier>('annual');

  // Subscribers Ledger state
  const [ledger, setLedger] = useState<IssuedLicenseRecord[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LEDGER);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Settings tab state
  const [currentGeminiKey, setCurrentGeminiKey] = useState<string>(getActiveGeminiApiKey());
  const [newAdminPinInput, setNewAdminPinInput] = useState<string>('');

  const { showToast } = useToast();

  // Periodically refresh lockout state
  useEffect(() => {
    const interval = setInterval(() => {
      setLockoutInfo(authService.getAdminLockoutInfo());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-synchronize registered local teacher into ledger if not already present
  useEffect(() => {
    try {
      const localProfile = authService.getTeacherProfile();
      const localLicense = authService.getActiveLicense();
      const localTrial = authService.getTrialStatus();

      if (localProfile && localProfile.phone) {
        setLedger(prev => {
          const exists = prev.some(r => r.phone === localProfile.phone);
          if (!exists) {
            const tier = localLicense?.tier || 'annual';
            const tierObj = SUBSCRIPTION_TIERS.find(t => t.id === tier);
            const now = Date.now();
            const expires = localLicense?.expiresAt || (now + 365 * 24 * 60 * 60 * 1000);

            const record: IssuedLicenseRecord = {
              id: `local_teacher_${localProfile.phone}`,
              teacherName: localProfile.fullName || 'الأستاذ المسجل',
              phone: localProfile.phone,
              schoolName: localProfile.schoolName || 'المدرسة الحالية',
              governorate: localProfile.governorate || 'بغداد',
              subject: localProfile.subject || 'science_primary',
              tier,
              tierLabel: tierObj?.labelAr || 'مسجل محلياً',
              issuedAt: localProfile.registeredAt || now,
              expiresAt: expires,
              token: localLicense?.key || 'مسجل عبر الجهاز (نشط)',
              priceIqd: TIER_PRICES_IQD[tier] || 25000,
              isLocalProfile: true,
              status: localLicense ? 'active' : (localTrial.isExpired ? 'expired' : 'trial'),
            };

            const updated = [record, ...prev];
            localStorage.setItem(STORAGE_KEY_LEDGER, JSON.stringify(updated));
            return updated;
          }
          return prev;
        });
      }
    } catch (e) {
      console.warn('Auto-sync teacher profile into admin ledger failed:', e);
    }
  }, []);

  const saveLedger = (records: IssuedLicenseRecord[]) => {
    setLedger(records);
    try {
      localStorage.setItem(STORAGE_KEY_LEDGER, JSON.stringify(records));
    } catch (e) {
      console.warn('Failed to save admin ledger', e);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutInfo.isLocked) {
      showToast({
        message: `تم قفل الدخول مؤقتاً. يرجى الانتظار ${lockoutInfo.remainingSeconds} ثانية`,
        type: 'error',
      });
      return;
    }

    if (!adminPin.trim()) {
      showToast({ message: 'يرجى إدخال رمز المرور الإداري', type: 'error' });
      return;
    }

    const success = authService.loginAdmin(adminPin.trim());
    const updated = authService.getAdminLockoutInfo();
    setLockoutInfo(updated);

    if (success) {
      setIsAuthenticated(true);
      setAdminPin('');
      showToast({ message: 'تم تسجيل الدخول إلى منصة إدارة SaaS بنجاح!', type: 'success' });
    } else {
      if (updated.isLocked) {
        showToast({
          message: 'تم تجاوز الحد الأقصى للمحاولات. تم قفل النظام لمدة 5 دقائق لحمايته.',
          type: 'error',
        });
      } else {
        const remaining = 3 - updated.failedAttempts;
        showToast({
          message: `رمز المرور غير صحيح. المحاولات المتبقية: ${remaining}`,
          type: 'error',
        });
      }
    }
  };

  const handleLogout = () => {
    authService.logoutAdmin();
    setIsAuthenticated(false);
    showToast({ message: 'تم تسجيل الخروج من منصة الإدارة', type: 'info' });
  };

  const handleExitToTeacherApp = () => {
    window.location.hash = '';
    window.location.search = '';
    window.location.reload();
  };

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPhone.trim()) {
      showToast({ message: 'يرجى إدخال رقم هاتف المعلم', type: 'error' });
      return;
    }

    setIsGenerating(true);
    try {
      const key = await authService.generateKeyForTeacher(
        targetPhone.trim(),
        selectedTier,
        targetTeacherName.trim() || 'الأستاذ المشترك'
      );
      setGeneratedKey(key);

      const tierObj = SUBSCRIPTION_TIERS.find((t) => t.id === selectedTier);
      const days = tierObj?.durationDays || 365;
      const now = Date.now();
      const expires = now + days * 24 * 60 * 60 * 1000;

      const newRecord: IssuedLicenseRecord = {
        id: `lic_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        teacherName: targetTeacherName.trim() || 'الأستاذ المشترك',
        phone: targetPhone.trim(),
        tier: selectedTier,
        tierLabel: tierObj?.labelAr || 'تفعيل',
        issuedAt: now,
        expiresAt: expires,
        token: key,
        priceIqd: TIER_PRICES_IQD[selectedTier] || 25000,
      };

      const updatedLedger = [newRecord, ...ledger];
      saveLedger(updatedLedger);

      showToast({ message: 'تم توليد وحفظ كود التفعيل الرقمي بنجاح!', type: 'success' });
    } catch (err: any) {
      showToast({ message: 'فشل توليد التوقيع الرقمي: ' + (err?.message || ''), type: 'error' });
    } finally {
      setIsGenerating(false);
    }
  };

  const copyKeyToClipboard = (keyToCopy: string) => {
    navigator.clipboard.writeText(keyToCopy);
    showToast({ message: 'تم نسخ كود التفعيل المشفر إلى الحافظة!', type: 'success' });
  };

  const sendWhatsApp = (record: { teacherName: string; phone: string; token: string; tierLabel: string }) => {
    const message = `السلام عليكم ورحمة الله، أستاذنا الفاضل ${record.teacherName}،\nتم تفعيل اشتراكك في تطبيق «مساعد المعلم العراقي» بنجاح!\n\n📋 نوع الباقة: ${record.tierLabel}\n🔑 رمز التفعيل المشفر الخاص بك (Ed25519):\n${record.token}\n\nنتمنى لك عاماً دراسياً حافلاً بالتميز والتوفيق!`;
    const cleanPhone = record.phone.replace(/\D/g, '').replace(/^0/, '964');
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  const handleAddNewSubscriberManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubPhone.trim() || !newSubName.trim()) {
      showToast({ message: 'يرجى إدخال اسم المعلم ورقم هاتفه', type: 'error' });
      return;
    }

    try {
      const key = await authService.generateKeyForTeacher(
        newSubPhone.trim(),
        newSubTier,
        newSubName.trim()
      );

      const tierObj = SUBSCRIPTION_TIERS.find((t) => t.id === newSubTier);
      const days = tierObj?.durationDays || 365;
      const now = Date.now();
      const expires = now + days * 24 * 60 * 60 * 1000;

      const record: IssuedLicenseRecord = {
        id: `manual_sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        teacherName: newSubName.trim(),
        phone: newSubPhone.trim(),
        schoolName: newSubSchool.trim() || 'غير محدد',
        governorate: newSubGov,
        tier: newSubTier,
        tierLabel: tierObj?.labelAr || 'اشتراك سنوي',
        issuedAt: now,
        expiresAt: expires,
        token: key,
        priceIqd: TIER_PRICES_IQD[newSubTier] || 25000,
        status: 'active',
      };

      const updated = [record, ...ledger];
      saveLedger(updated);
      setIsAddModalOpen(false);
      setNewSubName('');
      setNewSubPhone('');
      setNewSubSchool('');

      showToast({ message: `تم تسجيل المعلم (${record.teacherName}) وإصدار ترخيصه بنجاح!`, type: 'success' });
    } catch (err: any) {
      showToast({ message: `تعذر تسجيل المشترك: ${err?.message || ''}`, type: 'error' });
    }
  };

  const handleExportLedger = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(ledger, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `techeeer_subscribers_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showToast({ message: 'تم تصدير سجل المشتركين بنجاح كملف نسخة احتياطية!', type: 'success' });
    } catch {
      showToast({ message: 'تعذر تصدير السجل', type: 'error' });
    }
  };

  const handleImportLedger = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);
        if (Array.isArray(imported)) {
          const map = new Map<string, IssuedLicenseRecord>();
          for (const item of [...imported, ...ledger]) {
            if (item.phone) map.set(item.phone, item);
            else if (item.id) map.set(item.id, item);
          }
          const merged = Array.from(map.values());
          saveLedger(merged);
          showToast({ message: `تم استيراد ودمج ${imported.length} مشتركاً بنجاح!`, type: 'success' });
        } else {
          showToast({ message: 'تنسيق ملف النسخة الاحتياطية غير متطابق', type: 'error' });
        }
      } catch {
        showToast({ message: 'فشل قراءة الملف', type: 'error' });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteRecord = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا السجل من قائمة التراخيص؟')) {
      const updated = ledger.filter((r) => r.id !== id);
      saveLedger(updated);
      showToast({ message: 'تم حذف السجل بنجاح', type: 'info' });
    }
  };

  const handleUpdateGeminiKey = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveGeminiApiKey(currentGeminiKey);
    showToast({ message: 'تم تحديث مفتاح Gemini AI المركزي بنجاح!', type: 'success' });
  };

  const handleChangeAdminPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPinInput.trim()) {
      showToast({ message: 'يرجى إدخال رمز المرور الجديد', type: 'error' });
      return;
    }
    try {
      authService.setAdminPin(newAdminPinInput.trim());
      setNewAdminPinInput('');
      showToast({ message: 'تم تغيير رمز مرور الأدمن بنجاح!', type: 'success' });
    } catch (err: any) {
      showToast({ message: err?.message || 'فشل التغيير', type: 'error' });
    }
  };

  // Metrics
  const totalSubscribers = ledger.length;
  const activeSubscribers = ledger.filter((r) => r.expiresAt > Date.now()).length;
  const totalRevenueIqd = ledger.reduce((sum, r) => sum + (r.priceIqd || 0), 0);

  // Filtered ledger
  const filteredLedger = ledger.filter((r) => {
    const q = searchQuery.toLowerCase();
    return r.teacherName.toLowerCase().includes(q) || r.phone.includes(q);
  });

  return (
    <div dir="rtl" className="min-h-screen bg-slate-950 text-slate-100 font-tajawal flex flex-col antialiased">
      {/* Top SaaS Admin Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-40 px-6 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-emerald-500 text-white font-black text-xl flex items-center justify-center shadow-lg shadow-teal-500/20">
            👑
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>منصة إدارة الاشتراكات والتراخيص (Techeeer SaaS Admin)</span>
              <span className="text-[10px] font-mono bg-teal-900/60 text-teal-300 border border-teal-700/50 px-2 py-0.5 rounded-full">
                MASTER NODE
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              بوابة مالك المنصة لإصدار التراخيص المشفرة وإدارة المشتركين
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleExitToTeacherApp}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700"
          >
            <span>📱</span>
            <span>الذهاب لتطبيق المعلم</span>
          </button>
          {isAuthenticated && (
            <button
              type="button"
              onClick={handleLogout}
              className="px-3.5 py-1.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-bold transition border border-rose-800/50 flex items-center gap-1.5"
            >
              <span>🚪</span>
              <span>تسجيل الخروج</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col">
        {!isAuthenticated ? (
          /* Authentication Screen */
          <div className="flex-1 flex items-center justify-center py-12">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl shadow-teal-950/20 space-y-6">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-2xl bg-teal-950 border border-teal-500/30 text-teal-400 text-3xl mx-auto flex items-center justify-center shadow-inner">
                  🔐
                </div>
                <h2 className="text-xl font-black text-white">تسجيل دخول مالك المنصة</h2>
                <p className="text-xs text-slate-400">
                  لوحة التحكم معزولة تماماً ومحمية بنظام التشفير وحظر محاولات التخمين
                </p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    اسم المستخدم / الحساب:
                  </label>
                  <input
                    type="text"
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:border-teal-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1.5">
                    رمز المرور الإداري (Master PIN / Password):
                  </label>
                  <input
                    type="password"
                    placeholder="أدخل رمز المرور..."
                    value={adminPin}
                    onChange={(e) => setAdminPin(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-sm focus:border-teal-500 focus:outline-none font-mono"
                  />
                </div>

                {lockoutInfo.isLocked && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs text-center font-bold">
                    ⚠️ النظام مقفل لحمايته. يرجى الانتظار {lockoutInfo.remainingSeconds} ثانية.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={lockoutInfo.isLocked}
                  className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white font-extrabold text-sm shadow-lg shadow-teal-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <span>تسجيل الدخول إلى لوحة التحكم</span>
                  <span>⚡</span>
                </button>

                <div className="pt-2 text-center">
                  <p className="text-[11px] text-slate-500">
                    رمز المرور الافتراضي الأولي للمشروع: <code className="text-teal-400 font-mono">techeeer-admin-secure</code>
                  </p>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* Logged-In Admin Platform */
          <div className="space-y-6">
            {/* KPI Metrics Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
                <span className="text-xs text-slate-400 font-bold">إجمالي التراخيص المصدرة</span>
                <div className="text-2xl font-black text-white">{totalSubscribers}</div>
                <span className="text-[11px] text-teal-400">سجل التراخيص الرقمية</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
                <span className="text-xs text-slate-400 font-bold">المشتركون النشطون حالياً</span>
                <div className="text-2xl font-black text-emerald-400">{activeSubscribers}</div>
                <span className="text-[11px] text-emerald-500">صلاحية سارية بدون انقطاع</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
                <span className="text-xs text-slate-400 font-bold">الوارد المالي التقديري</span>
                <div className="text-2xl font-black text-amber-400">
                  {totalRevenueIqd.toLocaleString()} <span className="text-xs font-normal text-slate-400">د.ع</span>
                </div>
                <span className="text-[11px] text-amber-500">إجمالي المبيعات المحققة</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4.5 space-y-1">
                <span className="text-xs text-slate-400 font-bold">حالة خادم الذكاء الاصطناعي</span>
                <div className="text-base font-black text-teal-300 flex items-center gap-1.5 mt-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Gemini Vision OCR: متصل</span>
                </div>
                <span className="text-[11px] text-slate-400 font-mono truncate block">
                  {(getActiveGeminiApiKey() || 'مضبوط').substring(0, 14)}...
                </span>
              </div>
            </div>

            {/* Admin Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
              <button
                type="button"
                onClick={() => setAdminTab('generator')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  adminTab === 'generator'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🚀</span>
                <span>توليد التراخيص الفورية</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminTab('subscribers')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  adminTab === 'subscribers'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>👥</span>
                <span>سجل المشتركين ({ledger.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setAdminTab('settings')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 ${
                  adminTab === 'settings'
                    ? 'bg-teal-600 text-white shadow-md'
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>⚙️</span>
                <span>إعدادات المفاتيح والأمان</span>
              </button>
            </div>

            {/* TAB 1: License Generator */}
            {adminTab === 'generator' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                  <div>
                    <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span>إصدار ترخيص رسمي جديد</span>
                      <span className="text-[10px] bg-teal-950 text-teal-300 border border-teal-800 px-2 py-0.5 rounded-full font-mono">
                        Ed25519 Cryptographic Sign
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                      أدخل بيانات المعلم المستلم لاشتراكه ليتم تشفيرها رقمياً وحساب مدة الصلاحية تلقائياً
                    </p>
                  </div>

                  <form onSubmit={handleGenerateKey} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          اسم المعلم / المدرس:
                        </label>
                        <input
                          type="text"
                          placeholder="مثال: أ. كرار حسين"
                          value={targetTeacherName}
                          onChange={(e) => setTargetTeacherName(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-teal-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5">
                          رقم الهاتف (واتساب): *
                        </label>
                        <input
                          type="text"
                          placeholder="مثال: 07764271130"
                          value={targetPhone}
                          onChange={(e) => setTargetPhone(e.target.value)}
                          required
                          className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:border-teal-500 focus:outline-none font-mono"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-2">
                        اختر نوع باقة الاشتراك:
                      </label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {SUBSCRIPTION_TIERS.map((tier) => {
                          const isSelected = selectedTier === tier.id;
                          const price = TIER_PRICES_IQD[tier.id] || 25000;
                          return (
                            <div
                              key={tier.id}
                              onClick={() => setSelectedTier(tier.id)}
                              className={`cursor-pointer p-3 rounded-2xl border transition flex flex-col justify-between ${
                                isSelected
                                  ? 'border-teal-500 bg-teal-950/40 text-white'
                                  : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-xs">{tier.labelAr}</span>
                                <span className="text-[10px] font-mono text-teal-400 bg-teal-900/40 px-2 py-0.5 rounded-full">
                                  {price.toLocaleString()} د.ع
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-400 leading-tight">
                                {tier.description} ({tier.durationDays} يوم)
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isGenerating}
                      className="w-full py-3.5 rounded-2xl bg-teal-600 hover:bg-teal-500 active:scale-[0.99] text-white font-extrabold text-xs shadow-lg shadow-teal-600/20 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <span>{isGenerating ? 'جارِ التشفير والتوقيع...' : 'توليد وحفظ كود التفعيل فوراً'}</span>
                      <span>⚡</span>
                    </button>
                  </form>
                </div>

                {/* Generated Key Result Box */}
                <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🎟️</span>
                      <h3 className="text-sm font-bold text-white">كود التفعيل المشفر المستخرج</h3>
                    </div>

                    {generatedKey ? (
                      <div className="space-y-3 animate-in fade-in">
                        <div className="p-3.5 rounded-2xl bg-slate-950 border border-teal-500/40 font-mono text-xs text-teal-300 break-all select-all leading-relaxed max-h-48 overflow-y-auto">
                          {generatedKey}
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => copyKeyToClipboard(generatedKey)}
                            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 border border-slate-700"
                          >
                            <span>📋</span>
                            <span>نسخ الكود</span>
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              sendWhatsApp({
                                teacherName: targetTeacherName || 'الأستاذ المشترك',
                                phone: targetPhone,
                                token: generatedKey,
                                tierLabel:
                                  SUBSCRIPTION_TIERS.find((t) => t.id === selectedTier)?.labelAr || 'تفعيل',
                              })
                            }
                            className="py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 shadow-md shadow-emerald-900/30"
                          >
                            <span>💬</span>
                            <span>إرسال واتساب</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-8 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center space-y-2">
                        <span className="text-4xl opacity-40">🔑</span>
                        <p className="text-xs">
                          قم بتعبئة رقم الهاتف ونوع الباقة واضغط على توليد ليظهر كود التفعيل هنا فوراً
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                    <span className="font-bold text-slate-300">ملاحظة أمان المعمارية:</span>
                    <p>
                      التراخيص الصادرة مشفرة رقمياً بمفتاح Ed25519 ومحمية بختم زمني. لا يمكن تزوير الكود أو تعديل مدته بأي شكل.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: Subscribers Ledger */}
            {adminTab === 'subscribers' && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                      <span>سجل المشتركين والتراخيص المحفوظة</span>
                      <span className="text-xs font-mono bg-teal-900/60 text-teal-300 border border-teal-700/50 px-2 py-0.5 rounded-full">
                        {filteredLedger.length} مشترك
                      </span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-0.5">
                      قائمة بجميع المعلمين المسجلين والتراخيص الصادرة مع إمكانية التصدير، الاستيراد، والإضافة المباشرة
                    </p>
                  </div>

                  {/* Top Action Buttons */}
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-900/20 cursor-pointer"
                    >
                      <span>➕</span>
                      <span>تسجيل مشترك يدوياً</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportLedger}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer"
                      title="تصدير السجل كملف JSON لنسخه احتياطياً ونقله لأي جهاز"
                    >
                      <span>📤</span>
                      <span>تصدير نسخة احتياطية</span>
                    </button>

                    <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 border border-slate-700 cursor-pointer">
                      <span>📥</span>
                      <span>استيراد نسخة</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportLedger}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                {/* Search Bar */}
                <div className="w-full">
                  <input
                    type="text"
                    placeholder="بحث سريع باسم المعلم، رقم الهاتف، أو المدرسة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:border-teal-500 focus:outline-none"
                  />
                </div>

                {filteredLedger.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 border border-dashed border-slate-800 rounded-2xl space-y-2">
                    <span className="text-4xl block opacity-40">👥</span>
                    <p className="text-sm font-bold text-slate-400">لا يوجد مشتركون مسجلون مطابقون حتى الآن</p>
                    <p className="text-xs">
                      يمكنك الضغط على «تسجيل مشترك يدوياً» بالأعلى أو توليد كود ترخيص من التبويب الأول
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-800">
                    <table className="w-full text-right text-xs">
                      <thead className="bg-slate-950 text-slate-400 font-bold border-b border-slate-800">
                        <tr>
                          <th className="p-3">المعلم</th>
                          <th className="p-3">رقم الهاتف</th>
                          <th className="p-3">المدرسة والمحافظة</th>
                          <th className="p-3">نوع الباقة</th>
                          <th className="p-3">تاريخ الإصدار</th>
                          <th className="p-3">ينتهي في</th>
                          <th className="p-3">الحالة</th>
                          <th className="p-3 text-center">الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 text-slate-300">
                        {filteredLedger.map((row) => {
                          const isExpired = row.expiresAt < Date.now();
                          return (
                            <tr key={row.id} className="hover:bg-slate-950/40 transition">
                              <td className="p-3 font-bold text-white">
                                <div className="flex items-center gap-1.5">
                                  <span>{row.teacherName}</span>
                                  {row.isLocalProfile && (
                                    <span className="text-[10px] bg-teal-900/60 text-teal-300 border border-teal-700/40 px-1.5 py-0.2 rounded font-mono">
                                      هذا الجهاز
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="p-3 font-mono text-teal-300">{row.phone}</td>
                              <td className="p-3 text-slate-400">
                                {row.schoolName || 'المدرسة'} ({row.governorate || 'العراق'})
                              </td>
                              <td className="p-3">
                                <span className="font-medium">{row.tierLabel}</span>
                              </td>
                              <td className="p-3 text-slate-400">
                                {new Date(row.issuedAt).toLocaleDateString('ar-IQ')}
                              </td>
                              <td className="p-3 text-slate-400">
                                {new Date(row.expiresAt).toLocaleDateString('ar-IQ')}
                              </td>
                              <td className="p-3">
                                {isExpired ? (
                                  <span className="px-2.5 py-1 rounded-full bg-rose-950/80 text-rose-300 border border-rose-800/50 text-[10px] font-bold">
                                    منتهي
                                  </span>
                                ) : row.status === 'trial' ? (
                                  <span className="px-2.5 py-1 rounded-full bg-amber-950/80 text-amber-300 border border-amber-800/50 text-[10px] font-bold">
                                    تجربة مجانية
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-1 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 text-[10px] font-bold">
                                    نشط ومفعل
                                  </span>
                                )}
                              </td>
                              <td className="p-3">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => copyKeyToClipboard(row.token)}
                                    title="نسخ كود التفعيل"
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                                  >
                                    📋
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => sendWhatsApp(row)}
                                    title="إرسال عبر واتساب"
                                    className="p-1.5 rounded-lg bg-emerald-900/60 hover:bg-emerald-800 text-emerald-300 transition"
                                  >
                                    💬
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteRecord(row.id)}
                                    title="حذف من السجل"
                                    className="p-1.5 rounded-lg bg-rose-950 hover:bg-rose-900 text-rose-300 transition"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Manual Add Subscriber Modal */}
                {isAddModalOpen && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">➕</span>
                          <h3 className="text-sm font-bold text-white">تسجيل مشترك جديد وإصدار كود تفعيل فوري</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(false)}
                          className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center justify-center"
                        >
                          ✕
                        </button>
                      </div>

                      <form onSubmit={handleAddNewSubscriberManual} className="space-y-3.5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">اسم المعلم: *</label>
                            <input
                              type="text"
                              required
                              placeholder="مثال: الأستاذ أحمد علي"
                              value={newSubName}
                              onChange={(e) => setNewSubName(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-teal-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">رقم الهاتف: *</label>
                            <input
                              type="text"
                              required
                              placeholder="مثال: 07701234567"
                              value={newSubPhone}
                              onChange={(e) => setNewSubPhone(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">المدرسة: (اختياري)</label>
                            <input
                              type="text"
                              placeholder="مثال: ثانوية المتميزين"
                              value={newSubSchool}
                              onChange={(e) => setNewSubSchool(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-teal-500 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-bold text-slate-300 mb-1">المحافظة:</label>
                            <select
                              value={newSubGov}
                              onChange={(e) => setNewSubGov(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-teal-500 focus:outline-none"
                            >
                              {['بغداد', 'البصرة', 'نينوى', 'أربيل', 'النجف الأشرف', 'كربلاء المقدسة', 'بابل', 'ذي قار', 'ديالى', 'الأنبار', 'كركوك', 'صلاح الدين', 'ميسان', 'واسط', 'الديوانية', 'المثنى', 'دهوك', 'السليمانية'].map(g => (
                                <option key={g} value={g}>{g}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-bold text-slate-300 mb-1">نوع باقة التفعيل:</label>
                          <select
                            value={newSubTier}
                            onChange={(e) => setNewSubTier(e.target.value as SubscriptionTier)}
                            className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-teal-500 focus:outline-none"
                          >
                            {SUBSCRIPTION_TIERS.map(t => (
                              <option key={t.id} value={t.id}>
                                {t.labelAr} ({TIER_PRICES_IQD[t.id]?.toLocaleString()} د.ع) - {t.durationDays} يوم
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                          >
                            إلغاء
                          </button>
                          <button
                            type="submit"
                            className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold shadow-md shadow-teal-900/20 cursor-pointer"
                          >
                            تسجيل وإصدار الترخيص فوراً ⚡
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: System & Key Settings */}
            {adminTab === 'settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Central Gemini AI Key Manager */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🤖</span>
                    <div>
                      <h3 className="text-sm font-bold text-white">إدارة مفتاح الذكاء الاصطناعي المركزي</h3>
                      <p className="text-xs text-slate-400">
                        مفتاح Google Gemini المركزي المستخدم في استخراج الأسئلة من خط اليد والرصد الصوتي للدرجات لجميع المعلمين
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleUpdateGeminiKey} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        مفتاح Gemini API النشط:
                      </label>
                      <input
                        type="text"
                        value={currentGeminiKey}
                        onChange={(e) => setCurrentGeminiKey(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-teal-300 focus:border-teal-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition cursor-pointer"
                      >
                        حفظ وتطبيق المفتاح فوراً
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentGeminiKey(DEFAULT_CENTRAL_GEMINI_API_KEY);
                          setActiveGeminiApiKey(DEFAULT_CENTRAL_GEMINI_API_KEY);
                          showToast({ message: 'تمت استعادة المفتاح الافتراضي', type: 'info' });
                        }}
                        className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                      >
                        استعادة الافتراضي
                      </button>
                    </div>
                  </form>
                </div>

                {/* Change Admin Password */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="text-2xl">🛡️</span>
                    <div>
                      <h3 className="text-sm font-bold text-white">تغيير رمز المرور الإداري (Admin PIN)</h3>
                      <p className="text-xs text-slate-400">
                        تحديث الرمز السري المستخدم للدخول إلى هذه المنصة
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleChangeAdminPin} className="space-y-3 pt-2">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">
                        رمز المرور الجديد:
                      </label>
                      <input
                        type="password"
                        placeholder="أدخل رمز مرور قوي..."
                        value={newAdminPinInput}
                        onChange={(e) => setNewAdminPinInput(e.target.value)}
                        className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:border-teal-500 focus:outline-none font-mono"
                      />
                    </div>

                    <button
                      type="submit"
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition border border-slate-700 cursor-pointer"
                    >
                      تحديث رمز المرور
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
