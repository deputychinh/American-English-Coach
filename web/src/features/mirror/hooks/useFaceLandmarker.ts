'use client';

import type { FaceLandmarker } from '@mediapipe/tasks-vision';
import { useEffect, useState } from 'react';

import { FACE_MODEL_PATH, MEDIAPIPE_WASM_PATH } from '@/constants/mirror.constant';
import { TrackerStatus } from '@/enums/tracker-status.enum';
import type { LandmarkerState } from '@/interfaces/hooks.interface';

let shared: Promise<FaceLandmarker> | null = null;

/** The WASM runtime and model load once per page; both are served from /vendor (no CDN). */
const loadLandmarker = (): Promise<FaceLandmarker> => {
  shared ??= import('@mediapipe/tasks-vision').then(async (vision) => {
    const fileset = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);
    return vision.FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: FACE_MODEL_PATH, delegate: 'GPU' },
      runningMode: 'VIDEO',
      numFaces: 1,
      outputFaceBlendshapes: true,
      outputFacialTransformationMatrixes: true,
    });
  });
  shared.catch(() => {
    shared = null;
  });
  return shared;
};

export const useFaceLandmarker = (enabled: boolean): LandmarkerState<FaceLandmarker> => {
  const [landmarker, setLandmarker] = useState<FaceLandmarker | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    loadLandmarker()
      .then((loaded) => {
        if (active) setLandmarker(loaded);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : String(cause));
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  const status = error
    ? TrackerStatus.Error
    : landmarker
      ? TrackerStatus.Ready
      : enabled
        ? TrackerStatus.Loading
        : TrackerStatus.Idle;
  return { landmarker, status, error };
};
