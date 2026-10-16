import React, { useState, useEffect, lazy, Suspense } from 'react';
import { ToastProvider } from './components/common/Toast.js';
import { InstallGate } from './components/common/InstallGate.js';
import { InAppEscapeModal } from './components/common/InAppEscapeModal.js';
import { ErrorBoundary } from './components/common/ErrorBoundary.js';
import { AppShell } from './components/layout/AppShell.js';
import type { NavTabId } from './components/layout/DesktopSidebar.js';
import { TeacherLoginModal } from './components/auth/TeacherLoginModal.js';
import { ActivationGateModal } from './components/auth/ActivationGateModal.js';
import { authService, TeacherAccount } from './services/authService.js';
import { getSubjectById } from '@techeeer/content';
import type { TeacherProfile } from '@techeeer/content';

const GradebookStudio = lazy(() =>
  import('./components/gradebook/GradebookStudio.js').then((m) => ({ default: m.GradebookStudio }))
);
const ExamEditor = lazy(() =>
  import('./components/questions/ExamEditor.js').then((m) => ({ default: m.ExamEditor }))
);
const PlansStudio = lazy(() =>
  import('./components/plans/PlansStudio.js').then((m) => ({ default: m.PlansStudio }))
);
const ClassesStudio = lazy(() =>
  import('./components/classes/ClassesStudio.js').then((m) => ({ default: m.ClassesStudio }))
);
const BackupStudio = lazy(() =>
  import('./components/backups/BackupStudio.js').then((m) => ({ default: m.BackupStudio }))
);
const SettingsStudio = lazy(() =>
  import('./components/settings/SettingsStudio.js').then((m) => ({ default: m.SettingsStudio }))
);
const AdminDashboard = lazy(() =>
  import('./components/admin/AdminDashboard.js').then((m) => ({ default: m.AdminDashboard }))
);

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTabId>(() => {
    if (typeof window !== 'undefined') {
      const h = window.location.hash.toLowerCase().replace(/^#\/?/, '');
      if (['gradebook', 'questions', 'plans', 'classes', 'backups', 'settings'].includes(h)) {
        return h as NavTabId;
      }
      const p = window.location.pathname.toLowerCase().replace(/^\//, '');
      if (['gradebook', 'questions', 'plans', 'classes', 'backups', 'settings'].includes(p)) {
        return p as NavTabId;
      }
    }
    return 'gradebook';
  });
  
  // Teacher profile state initialized from authService
  const [teacherAccount, setTeacherAccount] = useState<TeacherAccount | null>(() =>
    authService.getTeacherProfile()
  );

  const [teacher, setTeacher] = useState<TeacherProfile>(() => {
    const saved = authService.getTeacherProfile();
    if (saved) {
      return {
        subject: saved.subject,
        stage: saved.stage,
        grade: saved.grade,
        stream: saved.stream,
        secondarySubjects: [],
      };
    }
    return {
      subject: 'science_primary',
      stage: 'primary',
      grade: 5,
      secondarySubjects: [],
    };
  });

  // Check if URL points to SaaS Admin Platform (#admin or ?portal=admin)
  const [isAdminRoute, setIsAdminRoute] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const hash = window.location.hash.toLowerCase();
    const search = window.location.search.toLowerCase();
    const path = window.location.pathname.toLowerCase();
    return (
      hash === '#admin' ||
      hash === '#/admin' ||
      search.includes('portal=admin') ||
      path === '/admin'
    );
  });

  useEffect(() => {
    const handleLocationChange = () => {
      const hash = window.location.hash.toLowerCase();
      const search = window.location.search.toLowerCase();
      const path = window.location.pathname.toLowerCase();
      setIsAdminRoute(
        hash === '#admin' ||
        hash === '#/admin' ||
        search.includes('portal=admin') ||
        path === '/admin'
      );

      const cleanHash = hash.replace(/^#\/?/, '');
      if (['gradebook', 'questions', 'plans', 'classes', 'backups', 'settings'].includes(cleanHash)) {
        setActiveTab(cleanHash as NavTabId);
      }
    };
    window.addEventListener('hashchange', handleLocationChange);
    window.addEventListener('popstate', handleLocationChange);
    return () => {
      window.removeEventListener('hashchange', handleLocationChange);
      window.removeEventListener('popstate', handleLocationChange);
    };
  }, []);

  // Modals state
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);
  const [isActivationModalOpen, setIsActivationModalOpen] = useState<boolean>(false);

  // Check auth & trial status on mount
  useEffect(() => {
    if (isAdminRoute) return;
    const current = authService.getTeacherProfile();
    if (!current) {
      // First time user: open registration modal
      setIsLoginModalOpen(true);
    } else {
      // Check if unlocked or trial expired
      if (!authService.isApplicationUnlocked()) {
        setIsActivationModalOpen(true);
      }
    }
  }, [isAdminRoute]);

  if (isAdminRoute) {
    return (
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-300 font-tajawal text-sm">جاري تحميل لوحة الإدارة...</div>}>
        <AdminDashboard />
      </Suspense>
    );
  }

  const handleTeacherRegistered = (acc: TeacherAccount) => {
    setTeacherAccount(acc);
    setTeacher({
      subject: acc.subject,
      stage: acc.stage,
      grade: acc.grade,
      stream: acc.stream,
      secondarySubjects: ['physics_scientific', 'chemistry_scientific'],
    });
  };

  const trialInfo = authService.getTrialStatus();
  const activeLicense = authService.getActiveLicense();
  const subjectNameAr = getSubjectById(teacher.subject)?.nameAr || 'العلوم';

  return (
    <InstallGate>
      <InAppEscapeModal />
      <AppShell
        activeTab={activeTab}
        onTabChange={setActiveTab}
        teacherName={teacherAccount?.fullName || 'الأستاذ'}
        subjectName={subjectNameAr}
        trialLabel={trialInfo.formattedRemaining}
        isActivated={!!activeLicense}
        assignedClasses={teacherAccount?.assignedClasses}
        onSelectAssignedClass={(cls) => {
          const updated = {
            ...teacher,
            stage: cls.stage,
            grade: cls.grade,
            stream: cls.stream,
            subject: cls.subject,
          };
          setTeacher(updated);
          authService.saveTeacherProfile({
            stage: cls.stage,
            grade: cls.grade,
            stream: cls.stream,
            subject: cls.subject,
          });
          setTeacherAccount(authService.getTeacherProfile());
        }}
        onOpenActivation={() => setIsActivationModalOpen(true)}
        onOpenProfile={() => setIsLoginModalOpen(true)}
      >
        <Suspense fallback={<div className="p-12 text-center text-slate-400 font-tajawal text-sm">جاري التحميل...</div>}>
          {activeTab === 'gradebook' && <GradebookStudio />}

          {activeTab === 'questions' && (
            <div className="h-[calc(100dvh-125px)] sm:h-[calc(100vh-130px)] sm:min-h-[650px] flex flex-col">
              <ExamEditor
                teacherSubject={subjectNameAr}
                teacherGrade={teacher.grade}
              />
            </div>
          )}

          {activeTab === 'plans' && <PlansStudio teacher={teacher} />}

          {activeTab === 'classes' && <ClassesStudio />}

          {activeTab === 'backups' && <BackupStudio />}

          {activeTab === 'settings' && (
            <SettingsStudio
              teacher={teacher}
              onTeacherChange={(updated) => {
                setTeacher(updated);
                setTeacherAccount(authService.getTeacherProfile());
              }}
            />
          )}
        </Suspense>
      </AppShell>

      {/* Teacher Onboarding & Profile Modal */}
      <TeacherLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleTeacherRegistered}
      />

      {/* Activation Gate Modal */}
      <ActivationGateModal
        isOpen={isActivationModalOpen}
        canDismiss={authService.isApplicationUnlocked()}
        onClose={() => setIsActivationModalOpen(false)}
        onSuccess={() => {
          setIsActivationModalOpen(false);
          setTeacherAccount(authService.getTeacherProfile());
        }}
      />
    </InstallGate>
  );
};

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
