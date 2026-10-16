import { api } from '@/api/client';
import { env } from '@/config/env';
import type { MouthAskRequest, TutorReply } from '@/interfaces/practice.interface';
import { resolveApiBaseUrl } from '@/utils/api-base.util';
import { problemMessage } from '@/utils/problem.util';

const FALLBACK = 'Gia sư AI không trả lời được';

/** Ask the tutor to explain a stored run (the model never re-scores). */
export const explainRun = async (runId: string): Promise<TutorReply> => {
  const { data, error } = await api.POST('/api/v1/tutor/explain', { body: { run_id: runId } });
  if (!data) throw new Error(problemMessage(error, FALLBACK));
  return data;
};

/** Send ONE JPEG of the mouth; the learner confirmed this explicitly. */
export const askMouth = async ({
  image,
  soundIpa,
  targetVi,
}: MouthAskRequest): Promise<TutorReply> => {
  const form = new FormData();
  form.append('image', image, 'mouth.jpg');
  form.append('sound_ipa', soundIpa);
  form.append('target_vi', targetVi);
  const response = await fetch(`${resolveApiBaseUrl(env.apiBaseUrl)}/api/v1/tutor/mouth`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(60_000),
  });
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) throw new Error(problemMessage(body, FALLBACK));
  return body as TutorReply;
};
