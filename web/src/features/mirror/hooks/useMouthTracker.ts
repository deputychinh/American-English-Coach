'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  FPS_SAMPLE_FRAMES,
  FRAME_BUFFER_SECONDS,
  MIN_FPS,
  SNAPSHOT_MAX_WIDTH,
  SNAPSHOT_PADDING,
  UI_REFRESH_HZ,
} from '@/constants/mirror.constant';
import { TrackerStatus } from '@/enums/tracker-status.enum';
import { useFaceLandmarker } from '@/features/mirror/hooks/useFaceLandmarker';
import type { BufferedFrame, MouthTrackerOptions } from '@/interfaces/hooks.interface';
import type { MouthFeatures, Point2, TrackedFrame } from '@/interfaces/mouth.interface';
import type { MouthTracker, TrackedSample } from '@/interfaces/tracker.interface';
import { getCopy } from '@/locales';
import { normaliseFeatures } from '@/utils/calibration.util';
import { lipOutline, lipPolygons } from '@/utils/lip-outline.util';
import { poseFromMatrix, poseQuality, rawMouthFeatures } from '@/utils/mouth-features.util';
import { sampleMouthPixels } from '@/utils/mouth-pixels.util';

const drawLips = (
  canvas: HTMLCanvasElement,
  video: HTMLVideoElement,
  landmarks: Parameters<typeof lipPolygons>[0],
): void => {
  const context = canvas.getContext('2d');
  if (!context) return;
  if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
  }
  context.clearRect(0, 0, canvas.width, canvas.height);
  const { outer, inner } = lipPolygons(landmarks);
  context.lineWidth = Math.max(2, canvas.width / 320);
  context.strokeStyle = '#fb8a3c';
  for (const polygon of [outer, inner]) {
    context.beginPath();
    polygon.forEach((point, index) => {
      const x = point.x * canvas.width;
      const y = point.y * canvas.height;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    });
    context.closePath();
    context.stroke();
  }
};

/** Crops the mouth (lip outline box + padding) from the live video into one JPEG. */
const snapshotFromVideo = (
  video: HTMLVideoElement | null,
  outline: Point2[],
): Promise<Blob | null> => {
  if (!video || outline.length === 0 || !video.videoWidth) return Promise.resolve(null);
  const xs = outline.map((p) => p.x * video.videoWidth);
  const ys = outline.map((p) => p.y * video.videoHeight);
  const boxW = Math.max(...xs) - Math.min(...xs);
  const boxH = Math.max(...ys) - Math.min(...ys);
  const pad = Math.max(boxW, boxH) * SNAPSHOT_PADDING;
  const sx = Math.max(0, Math.min(...xs) - pad);
  const sy = Math.max(0, Math.min(...ys) - pad);
  const sw = Math.min(video.videoWidth - sx, boxW + 2 * pad);
  const sh = Math.min(video.videoHeight - sy, boxH + 2 * pad);
  const scale = Math.min(1, SNAPSHOT_MAX_WIDTH / sw);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sw * scale);
  canvas.height = Math.round(sh * scale);
  const context = canvas.getContext('2d');
  if (!context) return Promise.resolve(null);
  context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
};

const cameraMessage = (error: unknown): string => {
  if (error instanceof DOMException && error.name === 'NotAllowedError')
    return getCopy().practice.cameraDenied;
  return error instanceof Error ? error.message : getCopy().practice.noMedia;
};

/** Camera + FaceLandmarker loop; keeps a 20 s ring buffer of features and lip outlines (no pixels). */
export const useMouthTracker = ({ enabled, calibration }: MouthTrackerOptions): MouthTracker => {
  const { landmarker, status: modelStatus, error: modelError } = useFaceLandmarker(enabled);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bufferRef = useRef<BufferedFrame[]>([]);
  const scratchRef = useRef<HTMLCanvasElement | null>(null);
  const outlineRef = useRef<Point2[]>([]);
  const calibrationRef = useRef(calibration);
  const [video, setVideo] = useState<HTMLVideoElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [latest, setLatest] = useState<TrackedSample | null>(null);
  const [isFaceVisible, setIsFaceVisible] = useState(false);

  useEffect(() => {
    calibrationRef.current = calibration;
  }, [calibration]);

  useEffect(() => {
    if (!enabled || !landmarker || !video) return;
    let stream: MediaStream | null = null;
    let frameId = 0;
    let lastVideoTime = -1;
    let lastUi = 0;
    let fpsCount = 0;
    let fpsStart = performance.now();
    let active = true;
    let lowFpsHandled = false;

    const loop = (): void => {
      if (!active) return;
      frameId = requestAnimationFrame(loop);
      if (video.readyState < 2 || video.currentTime === lastVideoTime) return;
      lastVideoTime = video.currentTime;
      const now = performance.now();
      const result = landmarker.detectForVideo(video, now);
      const landmarks = result.faceLandmarks[0];
      fpsCount += 1;
      if (fpsCount >= FPS_SAMPLE_FRAMES) {
        const measured = (fpsCount * 1000) / (now - fpsStart);
        setFps(Math.round(measured));
        fpsCount = 0;
        fpsStart = now;
        if (measured < MIN_FPS && !lowFpsHandled && stream) {
          lowFpsHandled = true;
          stream
            .getVideoTracks()[0]
            ?.applyConstraints({ width: 640, height: 480 })
            .catch(() => undefined);
        }
      }
      if (!landmarks) {
        setIsFaceVisible(false);
        canvasRef.current
          ?.getContext('2d')
          ?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        return;
      }
      const blendshapes = Object.fromEntries(
        (result.faceBlendshapes[0]?.categories ?? []).map((c) => [c.categoryName, c.score]),
      );
      const matrix = result.facialTransformationMatrixes[0]?.data;
      const pose = matrix ? poseFromMatrix(matrix) : null;
      scratchRef.current ??= document.createElement('canvas');
      const pixels = sampleMouthPixels({
        canvas: scratchRef.current,
        video,
        polygon: lipPolygons(landmarks).inner,
      });
      const raw = rawMouthFeatures({ landmarks, blendshapes, pose, pixels });
      if (!raw) return;
      const features = calibrationRef.current
        ? normaliseFeatures(raw, calibrationRef.current)
        : raw;
      const frame: BufferedFrame = {
        t: now / 1000,
        raw,
        features,
        quality: poseQuality(pose),
        outline: lipOutline(landmarks),
      };
      outlineRef.current = frame.outline;
      const buffer = bufferRef.current;
      buffer.push(frame);
      while (buffer.length > 0 && (buffer[0]?.t ?? 0) < frame.t - FRAME_BUFFER_SECONDS)
        buffer.shift();
      if (canvasRef.current) drawLips(canvasRef.current, video, landmarks);
      if (now - lastUi > 1000 / UI_REFRESH_HZ) {
        lastUi = now;
        setIsFaceVisible(true);
        setLatest({ t: frame.t, raw, features, quality: frame.quality, outline: frame.outline });
      }
    };

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: 'user', width: { ideal: 960 }, height: { ideal: 720 } },
        audio: false,
      })
      .then((media) => {
        if (!active) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        video.srcObject = media;
        return video.play().then(() => {
          setCameraError(null);
          loop();
        });
      })
      .catch((cause: unknown) => setCameraError(cameraMessage(cause)));

    return () => {
      active = false;
      cancelAnimationFrame(frameId);
      stream?.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
      setLatest(null);
      setIsFaceVisible(false);
      outlineRef.current = [];
    };
  }, [enabled, landmarker, video]);

  const attachVideo = useCallback((element: HTMLVideoElement | null) => setVideo(element), []);
  const attachCanvas = useCallback((element: HTMLCanvasElement | null) => {
    canvasRef.current = element;
  }, []);

  const framesBetween = useCallback(
    (from: number, to: number): TrackedFrame[] =>
      bufferRef.current
        .filter((frame) => frame.t >= from && frame.t <= to)
        .map(({ t, features, quality, outline }) => ({ t, features, quality, outline })),
    [],
  );
  const rawSince = useCallback(
    (from: number): MouthFeatures[] =>
      bufferRef.current.filter((frame) => frame.t >= from).map((frame) => frame.raw),
    [],
  );

  const snapshotMouth = useCallback(
    (): Promise<Blob | null> => snapshotFromVideo(video, outlineRef.current),
    [video],
  );

  const status = cameraError ? TrackerStatus.Error : enabled ? modelStatus : TrackerStatus.Idle;
  const error = cameraError ?? modelError;
  // Memoised so effects that depend on the tracker do not re-arm on every UI refresh.
  return useMemo(
    () => ({
      status,
      error,
      fps,
      isFaceVisible,
      latest,
      attachVideo,
      attachCanvas,
      framesBetween,
      rawSince,
      snapshotMouth,
    }),
    [
      status,
      error,
      fps,
      isFaceVisible,
      latest,
      attachVideo,
      attachCanvas,
      framesBetween,
      rawSince,
      snapshotMouth,
    ],
  );
};
