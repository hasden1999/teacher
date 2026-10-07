import React, { useState, useEffect } from 'react';
import { ToastProvider } from './components/common/Toast.js';
import { InstallGate } from './components/common/InstallGate.js';
import { InAppEscapeModal } from './components/common/InAppEscapeModal.js';
import { AppShell } from './components/layout/AppShell.js';
import type { NavTabId } from './components/layout/DesktopSidebar.js';
import { GradebookStudio } from './components/gradebook/GradebookStudio.js';
import { ExamEditor } from './components/questions/ExamEditor.js';
import { PlansStudio } from './components/plans/PlansStudio.js';
import { ClassesStudio } from './components/classes/ClassesStudio.js';
import { BackupStudio } from './components/backups/BackupStudio.js';
import { SettingsStudio } from './components/settings/SettingsStudio.js';
import { TeacherLoginModal } from './components/auth/TeacherLoginModal.js';
import { ActivationGateModal } from './components/auth/ActivationGateModal.js';
import { AdminDashboard } from './components/admin/AdminDashboard.js';
import { authService, TeacherAccount } from './services/authService.js';
import { getSubjectById } from '@techeeer/content';
import type { TeacherProfile } from '@techeeer/content';

export const AppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<NavTabId>('gradebook');
  
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
        secondarySubjects: ['physics_scientific', 'chemistry_scientific'],
      };
    }
    return {
      subject: 'science_primary',
      stage: 'primary',
      grade: 5,
      secondarySubjects: ['physics_scientific', 'chemistry_scientific'],
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
    return <AdminDashboard />;
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
        onOpenActivation={() => setIsActivationModalOpen(true)}
        onOpenProfile={() => setIsLoginModalOpen(true)}
      >
        {activeTab === 'gradebook' && <GradebookStudio />}

        {activeTab === 'questions' && (
          <div className="h-[calc(100vh-130px)] min-h-[650px] flex flex-col">
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
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
};

export default App;
