import { api } from '@/api/client';
import type { NextStep } from '@/interfaces/listening.interface';
import type { CurriculumResponse, CurriculumUnit } from '@/interfaces/practice.interface';
import { getCopy } from '@/locales';
import { problemMessage } from '@/utils/problem.util';

export const getCurriculum = async (): Promise<CurriculumResponse> => {
  const { data, error } = await api.GET('/api/v1/curriculum');
  if (!data) throw new Error(problemMessage(error, getCopy().curriculum.loadFailed));
  return data;
};

/** Units in sequence order across levels. */
export const flattenUnits = (response: CurriculumResponse): CurriculumUnit[] =>
  response.levels.flatMap((level) => level.units);

/**
 * What "continue" says for a unit (listening first, then unscored items, then shadowing); it
 * always opens the lesson player, which resumes at the learner's saved screen.
 */
export const nextStepOf = (unit: CurriculumUnit, listened: number | null): NextStep => {
  const lesson = { pathname: '/lesson', query: { unit: unit.id } };
  if (listened === null) return { kind: 'listen', href: lesson };
  const done = new Set(unit.progress.done_ids);
  const isOpen = unit.steps.some(
    (step) => 'items' in step && step.items.some((item) => !done.has(`${item.kind}:${item.id}`)),
  );
  if (isOpen) return { kind: 'practice', href: lesson };
  if (unit.steps.some((step) => 'sentences' in step && step.sentences.length > 0))
    return { kind: unit.progress.is_done ? 'done' : 'shadow', href: lesson };
  return { kind: 'done', href: { pathname: '/curriculum', query: {} } };
};
