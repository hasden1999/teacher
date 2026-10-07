/**
 * @techeeer/content - Canonical Iraqi Question Bank Seed Data
 * Over 50 rich, genuine items across 6 question types:
 * MCQ, Fill-in-the-blank, True/False, Essay, Matching, and Problem.
 * Includes official ministerial exam metadata and KaTeX expressions.
 */
import type { QuestionBankItem, QuestionBankFilterOptions } from '../types/index.js';
export declare const QUESTION_BANK: QuestionBankItem[];
export declare function getAllQuestions(): QuestionBankItem[];
export declare function filterQuestions(bank: QuestionBankItem[], options: QuestionBankFilterOptions): QuestionBankItem[];
export declare function getMinisterialQuestions(bank: QuestionBankItem[], subject?: string): QuestionBankItem[];
export declare function getQuestionsByChapter(bank: QuestionBankItem[], subject: string, chapter: number): QuestionBankItem[];
export declare function searchQuestions(bank: QuestionBankItem[], keyword: string): QuestionBankItem[];
/**
 * Supports appending a question from bank into current exam draft with Arabic auto-renumbering:
 * س1/, س2/, س3/, etc.
 */
export declare function renumberDraftQuestions(draft: string[], newQuestionText: string): string[];
//# sourceMappingURL=bank.d.ts.map