export type MathFormulaMode = 'inline-math' | 'block-math' | 'chemistry';

export interface ExtractedFormulas {
  math: string[];
  chemistry: string[];
}

export type SymbolCategory = 'basic' | 'advanced' | 'chemistry' | 'symbols';

export interface MathSymbolItem {
  id: string;
  label: string;
  latex: string;
  category: SymbolCategory;
  ariaLabel: string;
}

export interface MathFormulaEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (formulaSnippet: string) => void;
  initialValue?: string;
  defaultMode?: MathFormulaMode;
}

export interface MathRendererProps {
  text: string;
  className?: string;
  fontFamily?: 'amiri' | 'tajawal';
  fontSize?: 'sm' | 'base' | 'lg' | 'xl';
  displayMode?: boolean;
}
