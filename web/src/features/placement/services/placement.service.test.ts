import type { CurriculumLevel, CurriculumUnit } from '@/interfaces/practice.interface';

import {
  buildPlacement,
  continueUnit,
  placeLearner,
  readPlacement,
  savePlacement,
} from './placement.service';

const unit = (id: string, index: number, pairs: string[]): CurriculumUnit =>
  ({
    id,
    index,
    steps: [
      { kind: 'describe', sounds: [], notes_vi: '' },
      { kind: 'discriminate', pairs, stress: [], focus: [] },
      { kind: 'controlled', items: [{ kind: 'sound', id: 'c09' }] },
      { kind: 'guided', sentences: ['s1'] },
      { kind: 'communicate', scenario_vi: '', target_words: ['a'] },
    ],
    progress: { done_items: 0, total_items: 1, is_done: false, done_ids: [] },
  }) as unknown as CurriculumUnit;

const levels = [
  { id: 'L1', units: [unit('u01', 1, ['think-sink']), unit('u02', 2, ['she-see'])] },
  { id: 'L2', units: [unit('u07', 7, ['vest-west'])] },
] as unknown as CurriculumLevel[];
const pair = (id: string, a: string, b: string) => ({
  id,
  focus: 'X',
  words: [a, b],
  error_id: 'x',
  title_vi: id,
});
const pairs = [
  pair('think-sink', 'think', 'sink'),
  pair('she-see', 'she', 'see'),
  pair('vest-west', 'vest', 'west'),
];

describe('placement', () => {
  afterEach(() => localStorage.clear());

  it('takes up to three questions per level, in level order', () => {
    const questions = buildPlacement({ levels, pairs, sentences: [] });
    expect(questions.filter((q) => q.level === 'L1')).toHaveLength(3);
    expect(questions.filter((q) => q.level === 'L2')).toHaveLength(2);
    expect(questions[0]?.level).toBe('L1');
  });

  it('starts at the first level that was not mostly right', () => {
    const questions = buildPlacement({ levels, pairs, sentences: [] });
    const allRight = Object.fromEntries(questions.map((q) => [q.id, q.answer]));
    expect(placeLearner({ levels, questions, answers: allRight })).toMatchObject({
      level: 'L2',
      unitId: 'u07',
    });
    const l1Wrong = Object.fromEntries(
      questions.map((q) => [q.id, q.level === 'L1' ? (q.answer + 1) % 2 : q.answer]),
    );
    expect(placeLearner({ levels, questions, answers: l1Wrong })).toMatchObject({
      level: 'L1',
      unitId: 'u01',
    });
  });

  it('continues at the placed unit only when it is ahead of the server', () => {
    const units = levels.flatMap((level) => level.units);
    const placed = { level: 'L2', unitId: 'u07', scores: {}, finishedAt: '' };
    expect(continueUnit({ units, currentId: 'u01', placement: placed })?.id).toBe('u07');
    expect(continueUnit({ units, currentId: 'u07', placement: null })?.id).toBe('u07');
    savePlacement(placed);
    expect(readPlacement()?.unitId).toBe('u07');
  });
});
