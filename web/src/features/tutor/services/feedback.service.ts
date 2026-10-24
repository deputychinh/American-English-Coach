import { api } from '@/api/client';
import type { ContentFeedback, FeedbackRequest } from '@/interfaces/feedback.interface';
import { getCopy } from '@/locales';
import { problemMessage } from '@/utils/problem.util';

/** Ask the tutor about the content of a transcript; only the text is sent, never audio. */
export const askFeedback = async ({
  transcript,
  taskVi,
}: FeedbackRequest): Promise<ContentFeedback> => {
  const { data, error } = await api.POST('/api/v1/tutor/feedback', {
    body: { transcript: transcript.trim(), task_vi: taskVi },
  });
  if (!data) throw new Error(problemMessage(error, getCopy().tutor.failed));
  return data;
};
