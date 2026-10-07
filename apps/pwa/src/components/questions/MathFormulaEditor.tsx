import React, { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';
import { MathFormulaMode, MathFormulaEditorProps } from '../../types/math.js';
import { EquationKeypad } from './EquationKeypad.js';
import { renderKatexToString, renderChemistryToString } from '../../lib/math/katexRenderer.js';
import { lazyLoadMathLive } from '../../lib/math/mathliveLoader.js';

export const MathFormulaEditor: React.FC<MathFormulaEditorProps> = ({
  isOpen,
  onClose,
  onInsert,
  initialValue = '',
  defaultMode = 'inline-math',
}) => {
  const [mode, setMode] = useState<MathFormulaMode>(defaultMode);
  const [formula, setFormula] = useState<string>(initialValue);
  const [mathliveVersion, setMathliveVersion] = useState<string>('');

  // Synchronize state when initialValue changes or modal reopens
  useEffect(() => {
    if (isOpen) {
      setFormula(initialValue);
      setMode(defaultMode);
      lazyLoadMathLive().then(info => {
        setMathliveVersion(info.version);
      });
    }
  }, [isOpen, initialValue, defaultMode]);

  if (!isOpen) return null;

  // Real-time KaTeX preview computation
  let previewHtml = '';
  if (formula.trim()) {
    if (mode === 'chemistry') {
      previewHtml = renderChemistryToString(formula, { displayMode: false });
    } else {
      previewHtml = renderKatexToString(formula, { displayMode: mode === 'block-math' });
    }
  }

  const handleInsert = () => {
    if (!formula.trim()) {
      onClose();
      return;
    }
    let formatted = formula.trim();
    if (mode === 'chemistry') {
      formatted = formatted.startsWith('\\ce{') ? formatted : `\\ce{${formatted}}`;
    } else if (mode === 'block-math') {
      formatted = formatted.startsWith('$$') ? formatted : `$$${formatted}$$`;
    } else {
      formatted = formatted.startsWith('$') ? formatted : `$${formatted}$`;
    }
    onInsert(formatted);
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="math-editor-title"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/50 backdrop-blur-xs font-tajawal animate-in fade-in"
    >
      <div className="w-full md:max-w-2xl bg-white dark:bg-slate-900 rounded-t-3xl md:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] border border-slate-200 dark:border-slate-800">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xl">📐</span>
            <h3 id="math-editor-title" className="text-base font-bold text-teal-900 dark:text-teal-200">
              محرر المعادلات والصيغ الكيميائية
            </h3>
            {mathliveVersion && (
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full">
                {mathliveVersion}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق المحرر"
            className="min-h-[48px] min-w-[48px] rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setMode('inline-math')}
            className={`flex-1 min-h-[48px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === 'inline-math'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {'رياضيات سطرية ($..$)'}
          </button>
          <button
            type="button"
            onClick={() => setMode('block-math')}
            className={`flex-1 min-h-[48px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === 'block-math'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {'معادلة مستقلة ($$..$$)'}
          </button>
          <button
            type="button"
            onClick={() => setMode('chemistry')}
            className={`flex-1 min-h-[48px] py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              mode === 'chemistry'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {'كيمياء (\\ce{..})'}
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          {/* Live Preview Box */}
          <div className="p-4 rounded-2xl bg-amber-50/40 dark:bg-slate-950 border-2 border-dashed border-teal-200 dark:border-teal-900 min-h-[75px] flex items-center justify-center">
            {previewHtml ? (
              <div
                dir="ltr"
                className="text-lg text-slate-900 dark:text-slate-100 select-all"
                style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(previewHtml, {
                    USE_PROFILES: { mathMl: true, svg: true, html: true },
                  }),
                }}
              />
            ) : (
              <span className="text-xs text-slate-400">
                المعاينة المباشرة للمعادلة أو الصيغة ستظهر هنا فور الكتابة...
              </span>
            )}
          </div>

          {/* LaTeX Input */}
          <div className="space-y-1">
            <label htmlFor="raw-latex-input" className="text-xs font-bold text-slate-600 dark:text-slate-400">
              كود الصيغة (LaTeX / mhchem):
            </label>
            <input
              id="raw-latex-input"
              type="text"
              dir="ltr"
              value={formula}
              onChange={e => setFormula(e.target.value)}
              placeholder={mode === 'chemistry' ? 'CaCO3 -> CaO + CO2' : 'x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}'}
              className="w-full min-h-[48px] px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 font-mono text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-teal-700"
            />
          </div>

          {/* Virtual Keypad Palette */}
          <EquationKeypad
            onInsertSymbol={snip => setFormula(prev => prev + snip)}
            onBackspace={() => setFormula(prev => prev.slice(0, -1))}
            onClear={() => setFormula('')}
            onSpace={() => setFormula(prev => prev + ' ')}
          />
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 flex gap-3 bg-white dark:bg-slate-900 rounded-b-3xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            إلغاء
          </button>
          <button
            type="button"
            onClick={handleInsert}
            className="flex-1 min-h-[48px] px-4 py-2.5 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
          >
            إدراج في نص السؤال
          </button>
        </div>
      </div>
    </div>
  );
};
