import { api } from '@/api/client';
import { PROGRESS_LIMIT } from '@/constants/api.constant';
import type { AssessmentResponse, ProgressResponse } from '@/interfaces/practice.interface';
import { getCopy } from '@/locales';
import { problemMessage } from '@/utils/problem.util';

export const getProgress = async (): Promise<ProgressResponse> => {
  const { data, error } = await api.GET('/api/v1/progress', {
    params: { query: { limit: PROGRESS_LIMIT } },
  });
  if (!data) throw new Error(problemMessage(error, getCopy().progress.loadFailed));
  return data;
};

export const getRun = async (runId: string): Promise<AssessmentResponse> => {
  const { data, error } = await api.GET('/api/v1/runs/{run_id}', {
    params: { path: { run_id: runId } },
  });
  if (!data) throw new Error(problemMessage(error, getCopy().progress.runLoadFailed));
  return data as AssessmentResponse;
};

export const disputeRun = async (runId: string): Promise<void> => {
  const { error, response } = await api.POST('/api/v1/runs/{run_id}/dispute', {
    params: { path: { run_id: runId } },
  });
  if (!response.ok) throw new Error(problemMessage(error, getCopy().progress.disputeFailed));
};
