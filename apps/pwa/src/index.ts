/**
 * @techeeer/pwa - PWA Application Core Exports
 */

export * from './worker/types.js';
export * from './worker/schema.js';
export * from './worker/backup.js';
export * from './worker/dbClient.js';

// Common UI and PWA Infrastructure Exports
export * from './utils/pwaDetect.js';
export * from './utils/intentUrl.js';
export * from './lib/utils.js';
export * from './components/common/Toast.js';
export * from './components/common/InstallGate.js';
export * from './components/common/InAppEscapeModal.js';
export * from './components/common/BottomSheetKeypad.js';
export * from './components/common/StatusBadges.js';
export * from './components/layout/AppHeader.js';
export * from './components/layout/DesktopSidebar.js';
export * from './components/layout/MobileBottomNav.js';
export * from './components/layout/AppShell.js';
export * from './App.js';

// Gradebook Studio & WhatsApp Services
export * from './types/gradebook.js';
export * from './services/excelService.js';
export * from './services/whatsAppService.js';
export * from './services/gradebookDbService.js';
export * from './components/gradebook/types.js';
export * from './components/gradebook/VirtualGradebookTable.js';
export * from './components/gradebook/BatchFillModal.js';
export * from './components/gradebook/useBatchRollback.js';
export * from './components/gradebook/StudentCardModal.js';

// Question Studio, Math & Exporter (Milestone 5)
export * from './types/math.js';
export * from './types/export.js';
export * from './lib/math/katexRenderer.js';
export * from './lib/math/mathliveLoader.js';
export * from './lib/math/symbolsCatalog.js';
export * from './services/exportService.js';
export * from './components/questions/index.js';

// Lesson Plans Studio & Services (Milestone 6)
export * from './services/lessonPlanDbService.js';
export * from './components/plans/index.js';
export * from './components/classes/ClassesStudio.js';
export * from './components/backups/BackupStudio.js';
export * from './components/settings/SettingsStudio.js';

