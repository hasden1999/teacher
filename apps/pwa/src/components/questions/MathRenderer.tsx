import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { renderKatexToString, renderChemistryToString } from '../../lib/math/katexRenderer.js';
import { MathRendererProps } from '../../types/math.js';

interface TextToken {
  type: 'text' | 'inline-math' | 'block-math' | 'chemistry' | 'equation-image';
  content: string;
}

/**
 * Normalizes raw math notations (Unicode roots √, \(...\), \[...\], bare \sqrt or \frac)
 * outside existing $...$ delimiters so Iraqi curriculum roots & equations always render 100% accurately.
 */
export function normalizeMathExpressions(input: string): string {
  if (!input) return '';
  let text = input;

  // Convert \[ ... \] to $$ ... $$ and \( ... \) to $ ... $
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, '$$$$$1$$$$');
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, '$$$1$$');

  // Split by existing math/image blocks so we only normalize bare expressions in plain text segments
  const protectedRegex = /(\$\$[\s\S]*?\$\$|\$[^$\n]+?\$|\\ce\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}|\[صورة_معادلة:data:image\/[^\]]+\])/g;
  const parts = text.split(protectedRegex);

  return parts
    .map((part) => {
      if (!part) return '';
      if (
        part.startsWith('$') ||
        part.startsWith('\\ce{') ||
        part.startsWith('[صورة_معادلة:data:image/')
      ) {
        return part;
      }

      let normalized = part;
      // Normalize Unicode cube/fourth roots and square roots for both English and Arabic variables/numbers
      // e.g., ∛(x) -> $\sqrt[3]{x}$, ∛27 -> $\sqrt[3]{27}$, √(س) -> $\sqrt{س}$, √25 -> $\sqrt{25}$, √س -> $\sqrt{س}$
      normalized = normalized.replace(/∛\s*\(([^)]+)\)/g, '$\\sqrt[3]{$1}$');
      normalized = normalized.replace(/∛\s*([a-zA-Z0-9\u0600-\u06FF]+(?:\^[0-9]+)?)/g, '$\\sqrt[3]{$1}$');
      normalized = normalized.replace(/√\s*\(([^)]+)\)/g, '$\\sqrt{$1}$');
      normalized = normalized.replace(/√\s*([a-zA-Z0-9\u0600-\u06FF]+(?:\^[0-9]+)?)/g, '$\\sqrt{$1}$');

      // Normalize bare \sqrt[n]{...} or \sqrt{...} or \frac{...}{...} not wrapped in $
      normalized = normalized.replace(
        /(\\sqrt(?:\[[^\]]+\])?\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g,
        '$$$1$$'
      );
      normalized = normalized.replace(
        /(\\frac\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})/g,
        '$$$1$$'
      );

      return normalized;
    })
    .join('');
}

/**
 * Tokenizes mixed Arabic text containing:
 * - Embedded cropped/SVG equation images: [صورة_معادلة:data:image/...]
 * - Block math: $$ ... $$
 * - Chemistry: \ce{ ... }
 * - Inline math: $ ... $
 * Safe against unclosed brackets and malformed syntax.
 */
function tokenizeMixedText(rawInput: string): TextToken[] {
  if (!rawInput) return [];
  const raw = normalizeMathExpressions(rawInput);
  const tokens: TextToken[] = [];
  let cursor = 0;

  while (cursor < raw.length) {
    // 0. Check for embedded cropped/SVG equation image: [صورة_معادلة:data:image/...]
    if (raw.startsWith('[صورة_معادلة:data:image/', cursor)) {
      const closingBracket = raw.indexOf(']', cursor);
      if (closingBracket !== -1) {
        const dataUri = raw.slice(cursor + '[صورة_معادلة:'.length, closingBracket).trim();
        if (dataUri.startsWith('data:image/')) {
          tokens.push({ type: 'equation-image', content: dataUri });
          cursor = closingBracket + 1;
          continue;
        }
      }
    }

    // 1. Check for Block Math: $$...$$
    if (raw.startsWith('$$', cursor)) {
      const closingIdx = raw.indexOf('$$', cursor + 2);
      if (closingIdx !== -1) {
        const formula = raw.slice(cursor + 2, closingIdx).trim();
        if (formula.length > 0) {
          tokens.push({ type: 'block-math', content: formula });
        }
        cursor = closingIdx + 2;
        continue;
      }
    }

    // 2. Check for Chemistry: \ce{...}
    if (raw.startsWith('\\ce{', cursor)) {
      let braceCount = 1;
      let endIdx = cursor + 4;
      while (endIdx < raw.length && braceCount > 0) {
        if (raw[endIdx] === '{') braceCount++;
        else if (raw[endIdx] === '}') braceCount--;
        endIdx++;
      }
      if (braceCount === 0) {
        const formula = raw.slice(cursor + 4, endIdx - 1).trim();
        if (formula.length > 0) {
          tokens.push({ type: 'chemistry', content: formula });
        }
        cursor = endIdx;
        continue;
      }
    }

    // 3. Check for Inline Math: $...$
    if (raw[cursor] === '$' && !raw.startsWith('$$', cursor)) {
      const closingIdx = raw.indexOf('$', cursor + 1);
      if (closingIdx !== -1) {
        const potentialFormula = raw.slice(cursor + 1, closingIdx);
        const trimmedFormula = potentialFormula.trim();
        const hasNewline = potentialFormula.includes('\n');
        const hasArabicChars = /[\u0600-\u06FF]/.test(trimmedFormula);
        const hasMathIndicators = /[\\^_=+\-*/<>0-9{}()[\]≠≈≤≥·×÷]/.test(trimmedFormula);
        // In Iraqi curriculum, single Arabic letters (س, ص, ع, ل, ن, ط) are mathematical variables!
        const isArabicMathVariable = /^[سصعلدنطكمهـxyzXYZ](\s*[+\-*/=<>≤≥]\s*.*)?$/.test(trimmedFormula) || trimmedFormula.length <= 2;
        // Pure Arabic prose is multiple Arabic words without any math operators or LaTeX commands
        const isPureArabicProse = hasArabicChars && !hasMathIndicators && !isArabicMathVariable && trimmedFormula.split(/\s+/).length >= 2;
        if (!hasNewline && !isPureArabicProse && trimmedFormula.length > 0) {
          tokens.push({ type: 'inline-math', content: trimmedFormula });
          cursor = closingIdx + 1;
          continue;
        }
      }
    }

    // 4. Regular Text segment until next math delimiter
    let nextSpecial = raw.length;
    const nextDollar = raw.indexOf('$', cursor + 1);
    const nextCe = raw.indexOf('\\ce{', cursor + 1);
    const nextImg = raw.indexOf('[صورة_معادلة:data:image/', cursor + 1);
    if (nextDollar !== -1 && nextDollar < nextSpecial) nextSpecial = nextDollar;
    if (nextCe !== -1 && nextCe < nextSpecial) nextSpecial = nextCe;
    if (nextImg !== -1 && nextImg < nextSpecial) nextSpecial = nextImg;

    const end = Math.max(cursor + 1, nextSpecial);
    const textPart = raw.slice(cursor, end);
    if (textPart.length > 0) {
      tokens.push({ type: 'text', content: textPart });
    }
    cursor = end;
  }

  return tokens;
}

export const MathRenderer: React.FC<MathRendererProps> = ({
  text,
  className = '',
  fontFamily = 'amiri',
  fontSize = 'base',
  displayMode = false,
}) => {
  const tokens = useMemo(() => tokenizeMixedText(text), [text]);

  const fontClass = fontFamily === 'amiri' ? 'font-amiri font-exam-body' : 'font-tajawal';
  const sizeClass = {
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  }[fontSize] || 'text-base';

  return (
    <div
      dir="rtl"
      className={`text-slate-900 dark:text-slate-100 leading-relaxed text-start ${fontClass} ${sizeClass} ${className}`}
    >
      {tokens.map((token, idx) => {
        if (token.type === 'text') {
          return <span key={idx} className="whitespace-pre-wrap">{token.content}</span>;
        }

        if (token.type === 'equation-image') {
          return (
            <span
              key={idx}
              className="inline-flex items-center align-middle mx-1.5 my-1 bg-white px-1.5 py-0.5 rounded border border-slate-200 print:border-none"
            >
              <img
                src={token.content}
                alt="معادلة أو رسم رياضي مستخرج"
                className="max-h-16 sm:max-h-20 w-auto object-contain inline-block"
              />
            </span>
          );
        }

        if (token.type === 'inline-math') {
          const html = renderKatexToString(token.content, { displayMode: false });
          const sanitizedHtml = DOMPurify.sanitize(html, {
            USE_PROFILES: { mathMl: true, svg: true, html: true },
          });
          return (
            <span
              key={idx}
              dir="ltr"
              className="inline-block px-1 align-baseline select-text ltr-math"
              style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          );
        }

        if (token.type === 'chemistry') {
          const html = renderChemistryToString(token.content, { displayMode: false });
          const sanitizedHtml = DOMPurify.sanitize(html, {
            USE_PROFILES: { mathMl: true, svg: true, html: true },
          });
          return (
            <span
              key={idx}
              dir="ltr"
              className="inline-block px-1 align-baseline select-text ltr-chem"
              style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          );
        }

        if (token.type === 'block-math' || displayMode) {
          const html = renderKatexToString(token.content, { displayMode: true });
          const sanitizedHtml = DOMPurify.sanitize(html, {
            USE_PROFILES: { mathMl: true, svg: true, html: true },
          });
          return (
            <div
              key={idx}
              dir="ltr"
              className="my-2 text-center overflow-x-auto py-0.5 ltr-math-block"
              style={{ direction: 'ltr', unicodeBidi: 'isolate' }}
              dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
            />
          );
        }

        return null;
      })}
    </div>
  );
};
