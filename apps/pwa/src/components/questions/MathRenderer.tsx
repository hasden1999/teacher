import React, { useMemo } from 'react';
import DOMPurify from 'dompurify';
import { renderKatexToString, renderChemistryToString } from '../../lib/math/katexRenderer.js';
import { MathRendererProps } from '../../types/math.js';

interface TextToken {
  type: 'text' | 'inline-math' | 'block-math' | 'chemistry';
  content: string;
}

/**
 * Tokenizes mixed Arabic text containing:
 * - Block math: $$ ... $$
 * - Chemistry: \ce{ ... }
 * - Inline math: $ ... $
 * Safe against unclosed brackets and malformed syntax.
 */
function tokenizeMixedText(raw: string): TextToken[] {
  if (!raw) return [];
  const tokens: TextToken[] = [];
  let cursor = 0;

  while (cursor < raw.length) {
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
        const hasNewline = potentialFormula.includes('\n');
        const hasArabicProse = /[\u0600-\u06FF]/.test(potentialFormula);
        if (!hasNewline && !hasArabicProse && potentialFormula.trim().length > 0) {
          tokens.push({ type: 'inline-math', content: potentialFormula.trim() });
          cursor = closingIdx + 1;
          continue;
        }
      }
    }

    // 4. Regular Text segment until next math delimiter
    let nextSpecial = raw.length;
    const nextDollar = raw.indexOf('$', cursor + 1);
    const nextCe = raw.indexOf('\\ce{', cursor + 1);
    if (nextDollar !== -1 && nextDollar < nextSpecial) nextSpecial = nextDollar;
    if (nextCe !== -1 && nextCe < nextSpecial) nextSpecial = nextCe;

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
      className={`text-slate-900 dark:text-slate-100 leading-relaxed text-right ${fontClass} ${sizeClass} ${className}`}
    >
      {tokens.map((token, idx) => {
        if (token.type === 'text') {
          return <span key={idx} className="whitespace-pre-wrap">{token.content}</span>;
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
              className="my-3 text-center overflow-x-auto py-1 ltr-math-block"
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
