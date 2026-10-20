import curriculumJson from '@/data/content/curriculum.json';
import pairsJson from '@/data/content/pairs.json';
import phonemesJson from '@/data/content/phonemes.json';
import sentencesJson from '@/data/content/sentences.json';
import drillsJson from '@/data/content/sound-drills.json';
import type { LessonPlan } from '@/interfaces/lesson.interface';
import type {
  CurriculumResponse,
  MinimalPair,
  PhonemeCard,
  Sentence,
  SoundDrill,
} from '@/interfaces/practice.interface';

import {
  advance,
  lineKind,
  buildLesson,
  isLessonDone,
  lessonProgress,
  passTarget,
  passedIn,
  recordTake,
  retryPosition,
  startPosition,
  stepSize,
} from './lesson-plan.service';

const curriculum = curriculumJson as unknown as CurriculumResponse;
const units = curriculum.levels.flatMap((level) => level.units);
const content = {
  pairs: pairsJson as unknown as MinimalPair[],
  sentences: sentencesJson as unknown as Sentence[],
  phonemes: phonemesJson as unknown as PhonemeCard[],
  drills: Object.values(drillsJson) as unknown as SoundDrill[],
};
const lessonOf = (unitId: string): LessonPlan => {
  const unit = units.find((candidate) => candidate.id === unitId);
  if (!unit) throw new Error(unitId);
  return buildLesson({ unit, ...content });
};

describe('lesson plan', () => {
  it('builds all five steps for every unit of the course, with something to do in each', () => {
    expect(units).toHaveLength(24);
    for (const unit of units) {
      const plan = lessonOf(unit.id);
      expect(
        plan.steps.map((step) => step.kind),
        unit.id,
      ).toEqual(['describe', 'discriminate', 'controlled', 'guided', 'communicate']);
      for (const step of plan.steps)
        expect(stepSize(step), `${unit.id} ${step.kind}`).toBeGreaterThan(0);
    }
  });

  it('uses the practice screens’ item ids so lesson takes count in course progress', () => {
    const plan = lessonOf('u09');
    const controlled = plan.steps[2];
    if (!controlled || !('items' in controlled)) throw new Error('no controlled step');
    const ids = controlled.items.map((item) => item.id);
    expect(ids.slice(0, 3)).toEqual(
      (drillsJson.c03.words as { word: string }[])
        .slice(0, 3)
        .map((w) => `sound:c03:word:${w.word}`),
    );
    expect(ids).toContain('pair:played-play:0');
    expect(ids).toContain('pair:played-play:1');
    expect(ids).toContain('sentence:s14');
    const communicate = plan.steps[4];
    if (!communicate || !('items' in communicate)) throw new Error('no communicate step');
    // The role-play: three learner lines, each after the partner line it answers.
    expect(communicate.items.map((i) => i.id)).toEqual([
      'dialogue:u09:1',
      'dialogue:u09:3',
      'dialogue:u09:5',
    ]);
    expect(communicate.items[0]?.text).toBe('I worked until five.');
    expect(communicate.partner?.[0]?.text).toBe('What did you do yesterday?');
    expect(communicate.meaning?.[0]).toBe('Mình làm việc đến năm giờ.');
    expect(communicate.scenario).toMatch(/-ed/);
  });

  it('walks screen by screen, stops at the controlled gate and then finishes', () => {
    const plan = lessonOf('u01');
    let position = startPosition();
    const seen: string[] = [];
    for (let guard = 0; guard < 200 && !isLessonDone(plan, position); guard += 1) {
      seen.push(`${String(position.step)}:${String(position.index)}`);
      position = advance(plan, position);
    }
    const controlled = plan.steps[2];
    if (!controlled) throw new Error('no controlled step');
    // The gate is one extra screen after the last controlled item.
    expect(seen).toContain(`2:${String(stepSize(controlled))}`);
    const screens = plan.steps.reduce((sum, step) => sum + stepSize(step), 0) + 1;
    expect(seen).toHaveLength(screens);
    expect(lessonProgress(plan, position)).toBe(1);
    expect(lessonProgress(plan, startPosition())).toBe(0);
  });

  it('needs two thirds of the controlled items and retries only the missed ones', () => {
    const plan = lessonOf('u09');
    const step = plan.steps[2];
    if (!step || !('items' in step)) throw new Error('no controlled step');
    const [first, second, third] = step.items;
    if (!first || !second || !third) throw new Error('short step');
    expect(passTarget(step)).toBe(Math.ceil((step.items.length * 2) / 3));
    let position = { ...startPosition(), step: 2 };
    position = recordTake(position, first.id, false);
    position = recordTake(position, second.id, true);
    position = recordTake(position, first.id, true);
    expect(position.passed).toEqual([first.id]);
    expect(position.tried).toEqual([first.id, second.id]);
    expect(passedIn(step, position.passed)).toBe(1);
    const retry = retryPosition(plan, { ...position, index: step.items.length });
    expect(retry.index).toBe(1);
    position = recordTake(retry, third.id, false);
    expect(advance(plan, { ...position, index: 1 }, true).index).toBe(3);
  });

  it('reads the tune a role-play line needs from its last sentence', () => {
    expect(lineKind('I worked until five.')).toBe('statement');
    expect(lineKind('Do you want to come?')).toBe('question');
    expect(lineKind("Welcome! What's your name?")).toBe('wh_question');
    expect(lineKind('Iced, please. Do you have juice?')).toBe('question');
  });
});
