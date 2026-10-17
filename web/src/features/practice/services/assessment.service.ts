import { env } from '@/config/env';
import type { AssessRequest } from '@/interfaces/hooks.interface';
import type { AssessmentResponse } from '@/interfaces/practice.interface';
import { getCopy } from '@/locales';
import { deviceHeaders, noteUnauthorized, resolveApiBaseUrl } from '@/utils/api-base.util';
import { problemMessage } from '@/utils/problem.util';

/** Multipart upload (openapi-fetch's JSON client is kept for everything else). */
export const assess = async ({
  item,
  audio,
  mouthFrames,
  audioStartedAt,
}: AssessRequest): Promise<AssessmentResponse> => {
  const form = new FormData();
  form.append('audio', audio, 'recording.wav');
  form.append('text', item.text);
  form.append('item_id', item.id);
  form.append('kind', item.kind);
  form.append('mouth_frames', JSON.stringify(mouthFrames));
  if (audioStartedAt !== null) form.append('audio_started_at', String(audioStartedAt));
  const response = noteUnauthorized(
    await fetch(`${resolveApiBaseUrl(env.apiBaseUrl)}/api/v1/assess`, {
      method: 'POST',
      body: form,
      headers: deviceHeaders(),
      signal: AbortSignal.timeout(60_000),
    }),
  );
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok)
    throw new Error(problemMessage(body, getCopy().practice.serverError(response.status)));
  return body as AssessmentResponse;
};

/** URL of the cached reference pronunciation (macOS voice on the API host). */
export const referenceAudioUrl = (text: string): string =>
  `${resolveApiBaseUrl(env.apiBaseUrl)}/api/v1/audio?text=${encodeURIComponent(text)}`;
