import { LESSON_PASS_SHARE, LESSON_WORDS_PER_SOUND } from '@/constants/lesson.constant';
import { buildQuestions } from '@/features/listen/services/listen.service';
import type {
  LessonContent,
  LessonPlan,
  LessonPosition,
  LessonStep,
} from '@/interfaces/lesson.interface';
import type { CurriculumUnit, PracticeItem, SoundDrill } from '@/interfaces/practice.interface';
import { targetPhoneOf } from '@/utils/drill.util';
import { resolvePracticeItem } from '@/utils/practice-item.util';

/** Item ids match the ones the practice screens use, so lesson runs count in course progress. */
const soundItems = (drill: SoundDrill | undefined): PracticeItem[] =>
  drill
    ? drill.words.slice(0, LESSON_WORDS_PER_SOUND).map(({ word }) => ({
        id: `sound:${drill.id}:word:${word}`,
        text: word,
        kind: 'word',
        title: `/${drill.us}/ · ${word}`,
        focus: [targetPhoneOf(drill.arpabet)],
      }))
    : [];

const resolveAll = (params: string[], content: LessonContent): PracticeItem[] =>
  params.flatMap((param) => resolvePracticeItem(param, content) ?? []);

const WH_WORDS = new Set(['what', 'where', 'when', 'who', 'whose', 'why', 'how', 'which']);

/** Statement, yes/no or wh-question, from the last sentence of a line (sets the expected tune). */
export const lineKind = (text: string): PracticeItem['kind'] => {
  const last =
    text
      .trim()
      .split(/(?<=[.!])\s+/)
      .at(-1) ?? '';
  if (!last.endsWith('?')) return 'statement';
  const first = (last.toLowerCase().match(/[a-z]+/) ?? [''])[0];
  return WH_WORDS.has(first) ? 'wh_question' : 'question';
};

const toStep = (step: CurriculumUnit['steps'][number], content: LessonContent): LessonStep => {
  if ('notes_vi' in step) {
    const cards = step.sounds.flatMap((id) => content.phonemes.find((c) => c.id === id) ?? []);
    return { kind: 'describe', notes: step.notes_vi, cards };
  }
  if ('pairs' in step) return { kind: 'discriminate', questions: buildQuestions(content) };
  if ('items' in step) {
    const items = step.items.flatMap((ref): PracticeItem[] => {
      const kind: string = ref.kind;
      if (kind === 'sound') return soundItems(content.drills.find((d) => d.id === ref.id));
      if (kind === 'pair') return resolveAll([`pair:${ref.id}:0`, `pair:${ref.id}:1`], content);
      return resolveAll([`sentence:${ref.id}`], content);
    });
    return { kind: 'controlled', items };
  }
  if ('sentences' in step) {
    return {
      kind: 'guided',
      items: resolveAll(
        step.sentences.map((id) => `sentence:${id}`),
        content,
      ),
    };
  }
  const dialogue = step.dialogue ?? [];
  if (dialogue.length === 0) {
    return {
      kind: 'communicate',
      scenario: step.scenario_vi,
      items: resolveAll(
        step.target_words.map((word) => `word:${word}`),
        content,
      ),
    };
  }
  // Plan B4: the app's voice says the partner lines, the learner's lines are scored.
  const turns = dialogue.map((turn, index) => ({ ...turn, index }));
  const mine = turns.filter((turn) => String(turn.role) === 'you');
  return {
    kind: 'communicate',
    scenario: step.scenario_vi,
    items: mine.map((turn) => ({
      id: `dialogue:${content.unit.id}:${String(turn.index)}`,
      text: turn.text,
      kind: lineKind(turn.text),
      title: content.unit.title_vi,
      focus: [],
    })),
    partner: mine.map((turn) => {
      const before = turns[turn.index - 1];
      return before && String(before.role) === 'partner'
        ? { text: before.text, vi: before.vi }
        : null;
    }),
    meaning: mine.map((turn) => turn.vi),
  };
};

/** The unit's five steps as one sequence the lesson player walks through; empty steps drop out. */
export const buildLesson = (content: LessonContent): LessonPlan => ({
  unitId: content.unit.id,
  title: content.unit.title_vi,
  steps: content.unit.steps
    .map((step) => toStep(step, content))
    .filter((step) => step.kind === 'describe' || stepSize(step) > 0),
});

/** Screens in a step: the description is one, otherwise one per question or item. */
export const stepSize = (step: LessonStep): number => {
  if (step.kind === 'describe') return 1;
  if (step.kind === 'discriminate') return step.questions.length;
  return step.items.length;
};

/** 0..1 through the whole lesson. */
export const lessonProgress = (
  plan: LessonPlan,
  position: Pick<LessonPosition, 'step' | 'index'>,
): number => {
  const sizes = plan.steps.map(stepSize);
  const total = sizes.reduce((sum, size) => sum + size, 0);
  if (total === 0) return 1;
  const before = sizes.slice(0, position.step).reduce((sum, size) => sum + size, 0);
  return Math.min(1, (before + position.index) / total);
};

/** Controlled items needed for the gate, e.g. 5 of 7. */
export const passTarget = (step: LessonStep): number =>
  Math.ceil(stepSize(step) * LESSON_PASS_SHARE);

/** Controlled items of this step the learner said without an error. */
export const passedIn = (step: LessonStep, passed: string[]): number =>
  step.kind === 'describe' || step.kind === 'discriminate'
    ? 0
    : step.items.filter((item) => passed.includes(item.id)).length;

export const startPosition = (): LessonPosition => ({
  step: 0,
  index: 0,
  passed: [],
  tried: [],
  listenCorrect: 0,
  updatedAt: new Date().toISOString(),
});

/** True once every step is behind the learner. */
export const isLessonDone = (plan: LessonPlan, position: LessonPosition): boolean =>
  position.step >= plan.steps.length;

const nextUnpassed = (step: LessonStep, from: number, passed: string[]): number => {
  if (step.kind === 'describe' || step.kind === 'discriminate') return from;
  let index = from;
  while (index < step.items.length && passed.includes(step.items[index]?.id ?? '')) index += 1;
  return index;
};

/**
 * The screen after this one. The controlled step ends on its gate (index = size); the others
 * flow into the next step. While retrying, items already passed are skipped.
 */
export const advance = (
  plan: LessonPlan,
  position: LessonPosition,
  isRetrying = false,
): LessonPosition => {
  const step = plan.steps[position.step];
  if (!step) return position;
  const size = stepSize(step);
  const candidate = position.index + 1;
  const index = isRetrying ? nextUnpassed(step, candidate, position.passed) : candidate;
  if (index < size) return { ...position, index };
  if (step.kind === 'controlled' && position.index < size) return { ...position, index: size };
  return { ...position, step: position.step + 1, index: 0 };
};

/** Back to the first controlled item not passed yet, for "practise the missed items". */
export const retryPosition = (plan: LessonPlan, position: LessonPosition): LessonPosition => {
  const step = plan.steps[position.step];
  return step ? { ...position, index: nextUnpassed(step, 0, position.passed) } : position;
};

/** Records a scored take: tried always, passed when no phone was an error. */
export const recordTake = (
  position: LessonPosition,
  itemId: string,
  hasError: boolean,
): LessonPosition => ({
  ...position,
  tried: position.tried.includes(itemId) ? position.tried : [...position.tried, itemId],
  passed:
    hasError || position.passed.includes(itemId) ? position.passed : [...position.passed, itemId],
});
