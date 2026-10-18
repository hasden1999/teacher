/**
 * ErrorBoundary.tsx - Production-Grade React Error Boundary for Iraqi Teacher Assistant
 * Catches any uncaught rendering errors, ensures data safety reassurance,
 * and provides one-tap emergency SQLite database export so no teacher ever loses grades.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { dbClient } from '../../worker/dbClient.js';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  isExportingBackup: boolean;
  exportSuccess: boolean;
  showTechnicalDetails: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  public override state: ErrorBoundaryState = {
    hasError: false,
    error: null,
    errorInfo: null,
    isExportingBackup: false,
    exportSuccess: false,
    showTechnicalDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('CRITICAL_UI_ERROR caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = (): void => {
    window.location.reload();
  };

  private handleResetToHome = (): void => {
    try {
      // Safely remove transient UI draft caches if corrupted, preserving teacher profile & SQLite DB
      localStorage.removeItem('techeeer_exam_draft_ast');
      window.location.hash = '#gradebook';
    } catch {}
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      exportSuccess: false,
    });
    this.props.onReset?.();
  };

  private handleEmergencyExport = async (): Promise<void> => {
    this.setState({ isExportingBackup: true });
    try {
      const { buffer } = await dbClient.exportDb();
      const blob = new Blob([buffer], { type: 'application/x-sqlite3' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.href = url;
      link.download = `نسخة_طوارئ_مساعد_المعلم_${timestamp}.sqlite`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      this.setState({ exportSuccess: true });
    } catch (err) {
      console.error('Failed to export emergency backup:', err);
      alert('تعذر استخراج النسخة الاحتياطية تلقائياً. يرجى إعادة فتح التطبيق وتحديث الصفحة.');
    } finally {
      this.setState({ isExportingBackup: false });
    }
  };

  public override render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex items-center justify-center p-4 font-tajawal selection:bg-teal-100 selection:text-teal-900"
      >
        <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 dark:border-slate-800 text-center space-y-6">
          {/* Top Status Icon */}
          <div className="w-20 h-20 mx-auto rounded-3xl bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800/80 flex items-center justify-center text-4xl shadow-inner">
            🛡️
          </div>

          {/* Heading */}
          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
              عذراً، حدث خطأ غير متوقع في الواجهة
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
              بياناتك وسجلاتك المحلية في أمان تام داخل قاعدة البيانات، ولم يُفقد أي سجل من سجلات الطلاب أو الدرجات.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={this.handleReload}
              className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-teal-800 hover:bg-teal-700 active:scale-98 text-white font-bold text-sm transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>🔄</span>
              <span>إعادة تحميل التطبيق</span>
            </button>

            <button
              type="button"
              onClick={this.handleEmergencyExport}
              disabled={this.state.isExportingBackup}
              className="w-full min-h-[48px] px-5 py-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 font-bold text-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <span>💾</span>
              <span>
                {this.state.isExportingBackup
                  ? 'جاري استخراج البيانات...'
                  : this.state.exportSuccess
                  ? '✓ تم حفظ النسخة الاحتياطية بنجاح'
                  : 'تنزيل نسخة طارئة من قاعدة البيانات (.sqlite)'}
              </span>
            </button>

            <button
              type="button"
              onClick={this.handleResetToHome}
              className="w-full min-h-[44px] px-5 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition cursor-pointer"
            >
              العودة للشاشة الرئيسية
            </button>
          </div>

          {/* Technical Details Accordion */}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-start">
            <button
              type="button"
              onClick={() =>
                this.setState((prev) => ({ showTechnicalDetails: !prev.showTechnicalDetails }))
              }
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition flex items-center gap-1 cursor-pointer"
            >
              <span>{this.state.showTechnicalDetails ? '▾' : '▸'}</span>
              <span>التفاصيل الفنية للمطورين</span>
            </button>

            {this.state.showTechnicalDetails && this.state.error && (
              <div className="mt-2 p-3 bg-slate-900 text-slate-200 rounded-xl text-[11px] font-mono overflow-x-auto text-left ltr max-h-40 overflow-y-auto">
                <p className="text-red-400 font-bold mb-1">{this.state.error.toString()}</p>
                {this.state.error.stack && (
                  <pre className="text-slate-400 text-[10px] whitespace-pre-wrap">
                    {this.state.error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
}
