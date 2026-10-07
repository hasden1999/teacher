import katex from 'katex';
import 'katex/dist/contrib/mhchem.mjs';
import DOMPurify from 'dompurify';

export interface KatexOptions {
  displayMode?: boolean;
  throwOnError?: boolean;
  errorColor?: string;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { mathMl: true, svg: true, html: true },
    ADD_TAGS: ['annotation', 'semantics'],
    ADD_ATTR: ['encoding'],
  });
}

/**
 * Renders LaTeX math expression safely with KaTeX and DOMPurify sanitization
 */
export function renderKatexToString(latex: string, options?: KatexOptions): string {
  if (!latex || !latex.trim()) return '';
  const trimmed = latex.trim();
  try {
    const rawHtml = katex.renderToString(trimmed, {
      displayMode: options?.displayMode ?? false,
      throwOnError: options?.throwOnError ?? false,
      errorColor: options?.errorColor ?? '#dc2626',
    });

    if (trimmed.length > 5000 && !/[<>&"']|javascript:|href|url|data:|onerror|onload/i.test(trimmed)) {
      return rawHtml;
    }

    return sanitizeHtml(rawHtml);
  } catch {
    const fallback = `<span class="katex-fallback font-mono text-red-600" dir="ltr">${escapeHtml(latex)}</span>`;
    return sanitizeHtml(fallback);
  }
}

/**
 * Renders Chemical formula using KaTeX mhchem (\ce{...})
 */
export function renderChemistryToString(chemExpr: string, options?: KatexOptions): string {
  if (!chemExpr || !chemExpr.trim()) return '';
  const expr = chemExpr.trim();
  const latex = expr.startsWith('\\ce{') ? expr : `\\ce{${expr}}`;
  return renderKatexToString(latex, options);
}

/**
 * Extracts math and chemical formulas from mixed Arabic text
 */
export function extractFormulas(text: string): { math: string[]; chemistry: string[] } {
  const mathMatches: string[] = [];
  const chemMatches: string[] = [];
  if (!text) return { math: mathMatches, chemistry: chemMatches };

  // 1. Math formulas ($...$ or $$...$$)
  const mathRegex = /\$\$([\s\S]*?)\$\$|\$([^\$\n]+?)\$/g;
  let match: RegExpExecArray | null;
  while ((match = mathRegex.exec(text)) !== null) {
    const formula = (match[1] || match[2] || '').trim();
    if (formula.length > 0) {
      mathMatches.push(formula);
    }
  }

  // 2. Extract balanced \ce{...} formulas
  let searchIdx = 0;
  while ((searchIdx = text.indexOf('\\ce{', searchIdx)) !== -1) {
    let braceCount = 1;
    let endIdx = searchIdx + 4;
    while (endIdx < text.length && braceCount > 0) {
      if (text[endIdx] === '{') braceCount++;
      else if (text[endIdx] === '}') braceCount--;
      endIdx++;
    }
    if (braceCount === 0) {
      const formula = text.slice(searchIdx + 4, endIdx - 1).trim();
      if (formula.length > 0) {
        chemMatches.push(formula);
      }
      searchIdx = endIdx;
    } else {
      break;
    }
  }

  return { math: mathMatches, chemistry: chemMatches };
}
