import type { CurriculumUnit } from '@/interfaces/practice.interface';

import {
  buildQuestions,
  listenAccuracy,
  readListenResults,
  saveListenResult,
} from './listen.service';

const unit = {
  id: 'u03',
  level: 'L1',
  index: 3,
  title_vi: 'TH',
  title_en: 'TH',
  goal_vi: '',
  vn_error_vi: '',
  minutes: 12,
  days: 5,
  focus_sounds: ['c09'],
  steps: [
    { kind: 'describe', sounds: ['c09'], notes_vi: '' },
    {
      kind: 'discriminate',
      pairs: ['think-sink'],
      stress: [{ word: 'about', syllables: ['a', 'BOUT'], stressed: 1 }],
      focus: [{ sentence: 's1', word: 'third' }],
    },
    { kind: 'controlled', items: [{ kind: 'sound', id: 'c09' }] },
    { kind: 'guided', sentences: ['s1'] },
    { kind: 'communicate', scenario_vi: '', target_words: ['three'] },
  ],
  progress: { done_items: 0, total_items: 1, is_done: false, done_ids: [] },
} as unknown as CurriculumUnit;

const pairs = [
  { id: 'think-sink', focus: 'TH', words: ['think', 'sink'], error_id: 'x', title_vi: 't' },
];
const sentences = [
  {
    id: 's1',
    text: 'I think this is the third time.',
    focus: ['TH'],
    kind: 'statement',
    title_vi: '',
  },
];

describe('listen service', () => {
  afterEach(() => localStorage.clear());

  it('builds pair, stress and focus questions with the right answers', () => {
    const questions = buildQuestions({ unit, pairs, sentences });
    expect(questions).toHaveLength(4);
    const kinds = questions.map((q) => q.kind).sort();
    expect(kinds).toEqual(['focus', 'pair', 'pair', 'stress']);
    for (const q of questions.filter((item) => item.kind === 'pair')) {
      expect(q.options[q.answer]).toBe(q.prompt);
      expect([...q.options].sort()).toEqual(['sink', 'think']);
    }
    const stress = questions.find((q) => q.kind === 'stress');
    expect(stress?.options).toEqual(['a', 'bout']);
    expect(stress?.answer).toBe(1);
    const focus = questions.find((q) => q.kind === 'focus');
    expect(focus?.options[focus.answer]).toBe('third');
    expect(buildQuestions({ unit, pairs, sentences })).toEqual(questions);
  });

  it('stores one result per unit and reports accuracy', () => {
    expect(listenAccuracy(readListenResults(), 'u03')).toBeNull();
    saveListenResult({ unitId: 'u03', total: 4, correct: 3, finishedAt: '2026-10-18T00:00:00Z' });
    expect(listenAccuracy(readListenResults(), 'u03')).toBeCloseTo(0.75);
    saveListenResult({ unitId: 'u03', total: 4, correct: 4, finishedAt: '2026-10-18T01:00:00Z' });
    expect(Object.keys(readListenResults())).toEqual(['u03']);
    expect(listenAccuracy(readListenResults(), 'u03')).toBe(1);
  });
});
