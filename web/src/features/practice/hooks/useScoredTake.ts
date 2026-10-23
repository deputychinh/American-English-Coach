'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { RecorderStatus } from '@/enums/recorder-status.enum';
import { TakePhase } from '@/enums/take-phase.enum';
import { useRecorder } from '@/features/practice/hooks/useRecorder';
import { assess } from '@/features/practice/services/assessment.service';
import type { ScoredTake } from '@/interfaces/hooks.interface';
import type { AssessmentResponse, PracticeItem } from '@/interfaces/practice.interface';

/**
 * One spoken answer, scored by the phoneme scorer (on the device or the paired server). The
 * take stops by itself after `silenceMs` of silence, or on a second `toggle`; the run is saved
 * like any practice take, so it counts towards sound progress.
 */
export const useScoredTake = (silenceMs: number): ScoredTake => {
  const [phase, setPhase] = useState(TakePhase.Idle);
  const [result, setResult] = useState<AssessmentResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const itemRef = useRef<PracticeItem | null>(null);
  const finishingRef = useRef(false);
  const autoStopRef = useRef<() => void>(() => undefined);
  const recorder = useRecorder({ onAutoStop: () => autoStopRef.current(), silenceMs });

  const finish = useCallback(async () => {
    const item = itemRef.current;
    if (finishingRef.current || !item) return;
    finishingRef.current = true;
    const captured = await recorder.stop().finally(() => {
      finishingRef.current = false;
    });
    if (!captured) {
      setPhase(TakePhase.Idle);
      return;
    }
    setPhase(TakePhase.Scoring);
    try {
      setResult(
        await assess({ item, audio: captured.blob, mouthFrames: [], audioStartedAt: null }),
      );
      setPhase(TakePhase.Scored);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setPhase(TakePhase.Failed);
    }
  }, [recorder]);

  useEffect(() => {
    autoStopRef.current = () => void finish();
  }, [finish]);

  const isRecording = recorder.status === RecorderStatus.Recording;
  const toggle = useCallback(
    (item: PracticeItem): void => {
      if (phase === TakePhase.Scoring) return;
      if (isRecording) {
        void finish();
        return;
      }
      itemRef.current = item;
      setError(null);
      setResult(null);
      setPhase(TakePhase.Recording);
      void recorder.start();
    },
    [finish, isRecording, phase, recorder],
  );

  return { phase, result, error, recorderError: recorder.error, isRecording, toggle };
};
