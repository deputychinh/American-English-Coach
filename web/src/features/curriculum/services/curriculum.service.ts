import { api } from '@/api/client';
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
