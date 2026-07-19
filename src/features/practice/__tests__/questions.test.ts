import { COMPETENCIES } from '@/core/domain/competencies';
import {
  QUESTION_LIBRARY,
  findQuestion,
  questionsByCompetency,
} from '../domain/questions';

describe('question library', () => {
  it('has at least five questions per competency', () => {
    for (const c of COMPETENCIES) {
      expect(questionsByCompetency(c.value).length).toBeGreaterThanOrEqual(5);
    }
  });

  it('includes the three foundational questions', () => {
    const foundational = QUESTION_LIBRARY.filter((q) => q.isFoundational).map(
      (q) => q.prompt,
    );
    expect(foundational).toEqual(
      expect.arrayContaining([
        'Tell me about a difficult problem you faced and how you solved it.',
        'Tell me about a conflict or disagreement with a coworker.',
        'Tell me about a failure or mistake and what you learned from it.',
      ]),
    );
    expect(foundational).toHaveLength(3);
  });

  it('has unique ids and prompts', () => {
    const ids = new Set(QUESTION_LIBRARY.map((q) => q.id));
    const prompts = new Set(QUESTION_LIBRARY.map((q) => q.prompt));
    expect(ids.size).toBe(QUESTION_LIBRARY.length);
    expect(prompts.size).toBe(QUESTION_LIBRARY.length);
  });

  it('findQuestion resolves by id', () => {
    const first = QUESTION_LIBRARY[0]!;
    expect(findQuestion(first.id)?.prompt).toBe(first.prompt);
    expect(findQuestion('nope')).toBeUndefined();
  });
});
