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

/** Href of a content item (kept local: course.service imports would create a cycle). */
const itemHref = (kind: string, id: string): NextStep['href'] => {
  if (kind === 'sound') return { pathname: '/practice', query: { sound: id } };
  if (kind === 'pair') return { pathname: '/practice', query: { item: `pair:${id}:0` } };
  return { pathname: '/practice', query: { item: `sentence:${id}` } };
};

/** What "continue" opens for a unit: listening first, then unscored items, then shadowing. */
export const nextStepOf = (unit: CurriculumUnit, listened: number | null): NextStep => {
  if (listened === null)
    return { kind: 'listen', href: { pathname: '/listen', query: { unit: unit.id } } };
  const done = new Set(unit.progress.done_ids);
  for (const step of unit.steps) {
    if (!('items' in step)) continue;
    const open = step.items.find((item) => !done.has(`${item.kind}:${item.id}`));
    if (open) return { kind: 'practice', href: itemHref(open.kind, open.id) };
  }
  for (const step of unit.steps) {
    if ('sentences' in step && step.sentences[0])
      return {
        kind: unit.progress.is_done ? 'done' : 'shadow',
        href: itemHref('sentence', step.sentences[0]),
      };
  }
  return { kind: 'done', href: { pathname: '/curriculum', query: {} } };
};
