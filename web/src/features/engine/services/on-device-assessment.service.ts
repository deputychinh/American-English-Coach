import { ENGINE_MODEL_NAME, ENGINE_THREADS } from '@/constants/engine.constant';
import {
  engineModelVersion,
  isEngineAvailable,
  PhonemeEngine,
} from '@/features/engine/services/engine.service';
import { saveLocalRun } from '@/features/offline/services/local-api.service';
import { assessLocally } from '@/features/scoring/services/local-assessment.service';
import { scoringData } from '@/features/scoring/services/scoring-data';
import type { AssessRequest } from '@/interfaces/hooks.interface';
import type { AssessmentResponse } from '@/interfaces/practice.interface';
import { getCopy } from '@/locales';
import { activeProfileId, isLocalMode } from '@/utils/api-base.util';
import { base64ToFloat32, float32ToBase64 } from '@/utils/float32-base64.util';
import { decodeWav } from '@/utils/wav-encoder.util';

let loading: Promise<void> | null = null;

/** iOS or web app, model downloaded and the learner did not switch to a scoring server. */
export const isOnDevicePreferred = (): boolean => isEngineAvailable() && isLocalMode();

/** Load the model once per app run (≈1–2 s); a failure lets the next attempt retry. */
const ensureLoaded = (): Promise<void> => {
  loading ??= PhonemeEngine.status({ name: ENGINE_MODEL_NAME })
    .then(async (status) => {
      if (!status.downloaded) throw new Error(getCopy().engine.needModel);
      if (!status.loaded) {
        await PhonemeEngine.load({
          name: ENGINE_MODEL_NAME,
          coreML: false,
          threads: ENGINE_THREADS,
        });
      }
    })
    .catch((cause: unknown) => {
      loading = null;
      throw cause;
    });
  return loading;
};

/** Score a take on the device: phoneme model → posteriors → the TypeScript scorer. */
export const assessOnDevice = async (request: AssessRequest): Promise<AssessmentResponse> => {
  await ensureLoaded();
  const samples = decodeWav(await request.audio.arrayBuffer());
  const output = await PhonemeEngine.posteriors({ samples: float32ToBase64(samples) });
  const result = assessLocally(
    {
      itemId: request.item.id,
      text: request.item.text,
      kind: request.item.kind,
      posteriors: {
        frames: output.frames,
        vocab: output.vocab,
        data: base64ToFloat32(output.data),
      },
      mouthFrames: request.mouthFrames.map(({ t, features, quality }) => ({
        t,
        features: { ...features },
        quality,
      })),
      audioStartedAt: request.audioStartedAt,
      modelVersion: engineModelVersion(),
      samples,
    },
    scoringData(),
  );
  await saveLocalRun({
    id: result.id,
    profileId: activeProfileId(),
    itemId: result.item_id,
    text: result.text,
    modelVersion: result.model_version,
    createdAt: new Date().toISOString(),
    disputed: false,
    result,
  });
  return result;
};
