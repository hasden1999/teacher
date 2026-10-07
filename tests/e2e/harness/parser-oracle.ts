/**
 * Authoritative Arabic Natural Exam Parser & Numeral Conversion Oracle
 * Matches PROJECT.md Interface Contracts and Iraqi National Exam Typography
 */

export interface ParsedExamQuestion {
  questionNumber: number;
  header: string;
  subItems: Array<{ label: string; text: string; marks?: number }>;
  marks?: number;
}

import {
  toWesternNumerals,
  toEasternNumerals,
  parseArabicNumber,
} from '@techeeer/core';

export {
  toWesternNumerals,
  toEasternNumerals,
  parseArabicNumber,
};

/**
 * Natural Arabic text exam parser
 * Parses unstructured or pasted exam papers into structured questions and branches
 */
export function parseExamPaperText(rawText: string): ParsedExamQuestion[] {
  if (!rawText || typeof rawText !== 'string') {
    return [];
  }

  const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  const questions: ParsedExamQuestion[] = [];

  let currentQuestion: ParsedExamQuestion | null = null;
  let currentQNum = 0;

  // Question header patterns: "س1/", "س 1:", "السؤال الأول:", "س1 -", "س1)"
  const qHeaderRegex = /^(?:س(?:ؤال)?\s*([0-9٠-٩]+)|السؤال\s*(الأول|الثاني|الثالث|الرابع|الخامس|السادس|السابع|الثامن))\s*[:/\-.)\]]/i;
  
  // Branch patterns: "أ)", "أ/", "(أ)", "فرع أ:"
  const branchRegex = /^(?:\(?\s*([أ-يa-zA-Z])\s*\)?\s*[:/\-.)\]]|(?:فرع\s*)([أ-يa-zA-Z])\s*[:/\-.)\]])/i;

  // Marks pattern: "(20 درجة)", "[10 درجات]", "(15)"
  const marksRegex = /(?:[\(\[]\s*([0-9٠-٩]+)\s*(?:درجة|درجات)?\s*[\)\]])/i;

  const ordinalsMap: Record<string, number> = {
    'الأول': 1,
    'الثاني': 2,
    'الثالث': 3,
    'الرابع': 4,
    'الخامس': 5,
    'السادس': 6,
    'السابع': 7,
    'الثامن': 8,
  };

  for (const line of lines) {
    // 1. Check if line starts a new question
    const qMatch = line.match(qHeaderRegex);
    if (qMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion);
      }

      let qNum: number;
      if (qMatch[1]) {
        qNum = parseInt(toWesternNumerals(qMatch[1]), 10);
      } else if (qMatch[2] && ordinalsMap[qMatch[2]]) {
        qNum = ordinalsMap[qMatch[2]];
      } else {
        currentQNum++;
        qNum = currentQNum;
      }

      currentQNum = qNum;

      // Extract marks from question line if present
      let marks: number | undefined;
      const mMatch = line.match(marksRegex);
      if (mMatch) {
        marks = parseInt(toWesternNumerals(mMatch[1]), 10);
      }

      currentQuestion = {
        questionNumber: qNum,
        header: line,
        subItems: [],
        marks,
      };
      continue;
    }

    // 2. Check if line is a branch of current question
    const bMatch = line.match(branchRegex);
    if (bMatch && currentQuestion) {
      const label = bMatch[1] || bMatch[2];
      let branchMarks: number | undefined;
      const mMatch = line.match(marksRegex);
      if (mMatch) {
        branchMarks = parseInt(toWesternNumerals(mMatch[1]), 10);
      }

      // Clean line text
      const text = line.replace(branchRegex, '').trim();
      currentQuestion.subItems.push({
        label,
        text,
        marks: branchMarks,
      });
      continue;
    }

    // 3. Fallback: line belongs to current question or starts question 1 if none exists
    if (!currentQuestion) {
      currentQNum = 1;
      currentQuestion = {
        questionNumber: 1,
        header: `س1/ ${line}`,
        subItems: [],
      };
    } else {
      // Append text to last subItem or to question header
      if (currentQuestion.subItems.length > 0) {
        const last = currentQuestion.subItems[currentQuestion.subItems.length - 1];
        last.text += ` ${line}`;
      } else {
        currentQuestion.header += ` ${line}`;
      }
    }
  }

  if (currentQuestion) {
    questions.push(currentQuestion);
  }

  return questions;
}

/**
 * Formula Extraction helper:
 * Identifies math formulas ($...$ or $$...$$) and chemistry (\ce{...})
 */
export function extractFormulas(text: string): {
  math: string[];
  chemistry: string[];
} {
  const mathMatches: string[] = [];
  const chemMatches: string[] = [];

  const inlineMath = text.match(/\$(.+?)\$/g) || [];
  for (const m of inlineMath) {
    mathMatches.push(m.slice(1, -1).trim());
  }

  // Extract balanced \ce{...} formulas
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
