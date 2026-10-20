import {
  ENGINE_MODEL_NAME,
  ENGINE_MODEL_VERSION,
  ENGINE_THREADS,
} from '@/constants/engine.constant';
import { StorageKey } from '@/enums/storage-key.enum';
import { isEngineAvailable, PhonemeEngine } from '@/features/engine/services/engine.service';
import { assessLocally } from '@/features/scoring/services/local-assessment.service';
import { scoringData } from '@/features/scoring/services/scoring-data';
import type { AssessRequest } from '@/interfaces/hooks.interface';
import type { AssessmentResponse } from '@/interfaces/practice.interface';
import { base64ToFloat32, float32ToBase64 } from '@/utils/float32-base64.util';
import { readStorage } from '@/utils/storage.util';
import { decodeWav } from '@/utils/wav-encoder.util';

let loading: Promise<void> | null = null;

/** The learner turned on on-device scoring (Settings) and this is the iOS app. */
export const isOnDevicePreferred = (): boolean =>
  isEngineAvailable() && readStorage<boolean>(StorageKey.OnDeviceScoring, false);

/** Load the model once per app run (≈1–2 s); a failure lets the next attempt retry. */
const ensureLoaded = (): Promise<void> => {
  loading ??= PhonemeEngine.status({ name: ENGINE_MODEL_NAME })
    .then(async (status) => {
      if (!status.downloaded) throw new Error('model not downloaded');
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

/** Score a take on the iPhone: native model → posteriors → the TypeScript scorer. */
export const assessOnDevice = async (request: AssessRequest): Promise<AssessmentResponse> => {
  await ensureLoaded();
  const samples = decodeWav(await request.audio.arrayBuffer());
  const output = await PhonemeEngine.posteriors({ samples: float32ToBase64(samples) });
  return assessLocally(
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
      modelVersion: ENGINE_MODEL_VERSION,
      samples,
    },
    scoringData(),
  );
};
