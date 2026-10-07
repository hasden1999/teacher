import { describe, it, expect } from 'vitest';
import {
  getAllQuestions,
  filterQuestions,
  getMinisterialQuestions,
  getQuestionsByChapter,
  searchQuestions,
  renumberDraftQuestions,
  QUESTION_BANK,
} from '../src/index.js';

describe('Iraqi Question Bank (R4)', () => {
  it('should contain at least 50 seed items', () => {
    const questions = getAllQuestions();
    expect(questions.length).toBeGreaterThanOrEqual(50);
  });

  it('should cover all 6 official question types: mcq, fill_blank, true_false, essay, matching, problem', () => {
    const types = new Set(QUESTION_BANK.map((q) => q.type));
    expect(types.has('mcq')).toBe(true);
    expect(types.has('fill_blank')).toBe(true);
    expect(types.has('true_false')).toBe(true);
    expect(types.has('essay')).toBe(true);
    expect(types.has('matching')).toBe(true);
    expect(types.has('problem')).toBe(true);
  });

  it('should filter questions strictly by teacher registered subject specialization', () => {
    const chemistryQuestions = filterQuestions(QUESTION_BANK, { subject: 'chemistry' });
    expect(chemistryQuestions.length).toBeGreaterThanOrEqual(5);
    expect(chemistryQuestions.every((q) => q.subject === 'chemistry')).toBe(true);

    const physicsQuestions = filterQuestions(QUESTION_BANK, { subject: 'physics' });
    expect(physicsQuestions.length).toBeGreaterThanOrEqual(5);
    expect(physicsQuestions.every((q) => q.subject === 'physics')).toBe(true);
  });

  it('should filter questions by selected curriculum chapter', () => {
    const chemChapter1 = getQuestionsByChapter(QUESTION_BANK, 'chemistry', 1);
    expect(chemChapter1.length).toBeGreaterThan(0);
    expect(chemChapter1.every((q) => q.subject === 'chemistry' && q.chapter === 1)).toBe(true);

    // Test comprehensive filters: stage, stream, difficulty, tags, grade
    const hardSciQuestions = filterQuestions(QUESTION_BANK, {
      stage: 'preparatory',
      stream: 'scientific',
      difficulty: 'hard',
      tags: ['وزاري'],
    });
    expect(hardSciQuestions.length).toBeGreaterThan(0);

    const nonMatching = filterQuestions(QUESTION_BANK, {
      subject: 'non_existent_subject',
    });
    expect(nonMatching).toHaveLength(0);

    const nonMatchingGrade = filterQuestions(QUESTION_BANK, {
      subject: 'chemistry',
      grade: 99,
    });
    expect(nonMatchingGrade).toHaveLength(0);

    const byType = filterQuestions(QUESTION_BANK, {
      type: 'matching',
    });
    expect(byType.length).toBeGreaterThan(0);
  });

  it('should filter and highlight previous ministerial exam questions', () => {
    const ministerial = getMinisterialQuestions(QUESTION_BANK);
    expect(ministerial.length).toBeGreaterThan(15);
    expect(ministerial.every((q) => q.isMinisterial)).toBe(true);

    // Verify metadata exists for ministerial items
    const withMeta = ministerial.filter((q) => q.ministerialMeta !== undefined);
    expect(withMeta.length).toBeGreaterThan(10);
    expect(withMeta[0].ministerialMeta?.year).toBeGreaterThanOrEqual(2019);
  });

  it('should contain LaTeX math symbols and scientific equations in problem questions', () => {
    const mathAndSciProblems = QUESTION_BANK.filter(
      (q) => q.type === 'problem' || q.containsLatex
    );
    expect(mathAndSciProblems.length).toBeGreaterThan(10);

    const fullText = mathAndSciProblems.map((q) => q.text + ' ' + q.modelAnswer).join(' ');
    // Check key Iraqi symbols: \int, \pi, \theta, \sqrt{}, \Delta, gas equations
    expect(fullText).toContain('\\int');
    expect(fullText).toContain('\\pi');
    expect(fullText).toContain('\\theta');
    expect(fullText).toContain('\\sqrt{');
    expect(fullText).toContain('\\Delta');
  });

  it('should support searching questions by keywords and terms', () => {
    const searchGas = searchQuestions(QUESTION_BANK, 'بويل');
    expect(searchGas.length).toBeGreaterThan(0);
    expect(searchGas.some((q) => q.text.includes('بويل') || q.modelAnswer.includes('بويل'))).toBe(true);

    const searchVectors = searchQuestions(QUESTION_BANK, 'المتجهات');
    expect(searchVectors.length).toBeGreaterThan(0);
  });

  it('should support copying question into exam draft with automatic Arabic renumbering', () => {
    const initialDraft: string[] = ['س1/ عرف ما يأتي:'];
    const updatedDraft = renumberDraftQuestions(
      initialDraft,
      'علل ما يأتي: تمدد الغازات بالحرارة.'
    );
    expect(updatedDraft).toHaveLength(2);
    expect(updatedDraft[1]).toBe('س2/ علل ما يأتي: تمدد الغازات بالحرارة.');

    const thirdQuestion = renumberDraftQuestions(
      updatedDraft,
      'س1/ احسب قيمة التكامل' // Notice already prefixed question gets renumbered correctly
    );
    expect(thirdQuestion).toHaveLength(3);
    expect(thirdQuestion[2]).toBe('س3/ احسب قيمة التكامل');
  });
});
