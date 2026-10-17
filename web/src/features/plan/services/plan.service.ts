import { api } from '@/api/client';
import { COPY } from '@/constants/copy.constant';
import type { PlanResponse } from '@/interfaces/practice.interface';
import { problemMessage } from '@/utils/problem.util';

/** Minutes east of UTC for this device (what the API's `tz_offset` expects). */
export const timezoneOffsetMinutes = (): number => -new Date().getTimezoneOffset();

export const getPlan = async (goal: number): Promise<PlanResponse> => {
  const { data, error } = await api.GET('/api/v1/plan', {
    params: { query: { tz_offset: timezoneOffsetMinutes(), goal } },
  });
  if (!data) throw new Error(problemMessage(error, COPY.plan.loadFailed));
  return data;
};
