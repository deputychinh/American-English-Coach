import { api } from '@/api/client';
import type { CourseResponse, CurriculumItemRef } from '@/interfaces/practice.interface';
import { getCopy } from '@/locales';
import { problemMessage } from '@/utils/problem.util';

export const getCourse = async (): Promise<CourseResponse> => {
  const { data, error } = await api.GET('/api/v1/course');
  if (!data) throw new Error(problemMessage(error, getCopy().course.loadFailed));
  return data;
};

/** Where a content item is practised: sound drills by `sound`, pairs and sentences by `item`. */
export const courseItemHref = (
  item: Pick<CurriculumItemRef, 'id'> & { kind: string },
): { pathname: string; query: Record<string, string> } => {
  const kind: string = item.kind;
  if (kind === 'sound') return { pathname: '/practice', query: { sound: item.id } };
  if (kind === 'pair') return { pathname: '/practice', query: { item: `pair:${item.id}:0` } };
  return { pathname: '/practice', query: { item: `sentence:${item.id}` } };
};
