'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { RecorderStatus } from '@/enums/recorder-status.enum';
import { TakePhase } from '@/enums/take-phase.enum';
import { useRecorder } from '@/features/practice/hooks/useRecorder';
import type { FluencyMetrics } from '@/interfaces/fluency.interface';
import type { FluencyTake } from '@/interfaces/hooks.interface';
import { analyzeFluency } from '@/utils/fluency.util';
import { decodeWav } from '@/utils/wav-encoder.util';

/**
 * One timed round of free speech: pauses do not end it, the time limit (or "finish early")
 * does. The audio is measured on the device and dropped; only the numbers are kept.
 */
export const useFluencyTake = (targetSeconds: number): FluencyTake => {
  const [phase, setPhase] = useState(TakePhase.Idle);
  const [metrics, setMetrics] = useState<FluencyMetrics | null>(null);
  const finishingRef = useRef(false);
  const autoStopRef = useRef<() => void>(() => undefined);
  const recorder = useRecorder({
    onAutoStop: () => autoStopRef.current(),
    endsOnSilence: false,
    maxSeconds: targetSeconds,
  });
  const { stop, start: startRecorder } = recorder;

  const finish = useCallback(async () => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    const captured = await stop().finally(() => {
      finishingRef.current = false;
    });
    if (!captured) {
      setPhase(TakePhase.Idle);
      return;
    }
    setPhase(TakePhase.Scoring);
    const measured = analyzeFluency(decodeWav(await captured.blob.arrayBuffer()));
    URL.revokeObjectURL(captured.url);
    setMetrics(measured);
    setPhase(measured.syllables > 0 ? TakePhase.Scored : TakePhase.Failed);
  }, [stop]);

  useEffect(() => {
    autoStopRef.current = () => void finish();
  }, [finish]);

  const start = useCallback((): void => {
    setMetrics(null);
    setPhase(TakePhase.Recording);
    void startRecorder();
  }, [startRecorder]);

  const reset = useCallback((): void => {
    setMetrics(null);
    setPhase(TakePhase.Idle);
  }, []);

  return {
    phase,
    metrics,
    recorderError: recorder.error,
    isRecording: recorder.status === RecorderStatus.Recording,
    secondsLeft: Math.max(0, targetSeconds - recorder.seconds),
    level: recorder.level,
    start,
    finish: () => void finish(),
    reset,
  };
};
