import React, { useState } from 'react';
import { IRAQI_MATH_SYMBOLS } from '../../lib/math/symbolsCatalog.js';
import { SymbolCategory, MathSymbolItem } from '../../types/math.js';

export interface EquationKeypadProps {
  onInsertSymbol: (latexSnippet: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onSpace: () => void;
}

const CATEGORY_TABS: Array<{ id: SymbolCategory; label: string }> = [
  { id: 'basic', label: 'أساسيات' },
  { id: 'advanced', label: 'رياضيات عليا' },
  { id: 'chemistry', label: 'كيمياء' },
  { id: 'symbols', label: 'رموز وأقواس' },
];

export const EquationKeypad: React.FC<EquationKeypadProps> = ({
  onInsertSymbol,
  onBackspace,
  onClear,
  onSpace,
}) => {
  const [activeCategory, setActiveCategory] = useState<SymbolCategory>('basic');

  const symbols = IRAQI_MATH_SYMBOLS.filter(s => s.category === activeCategory);

  return (
    <div className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 space-y-3 font-tajawal select-none">
      {/* Category Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORY_TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveCategory(tab.id)}
            className={`min-h-[48px] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 cursor-pointer ${
              activeCategory === tab.id
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid of Symbol Keys */}
      <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2">
        {symbols.map((item: MathSymbolItem) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onInsertSymbol(item.latex)}
            aria-label={item.ariaLabel}
            title={item.ariaLabel}
            className="min-h-[48px] min-w-[48px] p-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-slate-700 active:scale-95 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 font-mono text-base font-bold flex items-center justify-center shadow-xs transition-all touch-manipulation cursor-pointer"
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Helper Action Toolbar */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSpace}
            className="min-h-[48px] px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            مسافة
          </button>
          <button
            type="button"
            onClick={onClear}
            className="min-h-[48px] px-3 py-2 rounded-xl bg-red-50 text-red-700 border border-red-200 text-xs font-bold hover:bg-red-100 transition-colors cursor-pointer"
          >
            مسح الكل
          </button>
        </div>
        <button
          type="button"
          onClick={onBackspace}
          aria-label="مسح الحرف الأخير"
          className="min-h-[48px] px-4 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-sm font-bold hover:bg-amber-100 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <span>تراجع ⌫</span>
        </button>
      </div>
    </div>
  );
};
