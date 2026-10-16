'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactElement, useEffect, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { COPY } from '@/constants/copy.constant';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { getVisemes } from '@/features/content/services/content.service';
import { CameraPanel } from '@/features/mirror/components/CameraPanel';
import { useMouthTracker } from '@/features/mirror/hooks/useMouthTracker';
import { saveCalibration } from '@/features/mirror/services/calibration.service';
import { useAsync } from '@/hooks/useAsync';
import type { MouthFeatures } from '@/interfaces/mouth.interface';
import { calibrationFromSamples } from '@/utils/calibration.util';

import './CalibrationFlow.css';

const MIN_SAMPLES_PER_STEP = 8;

export const CalibrationFlow = (): ReactElement => {
  const sound = useSearchParams().get('sound');
  const content = useAsync(getVisemes);
  const tracker = useMouthTracker({ enabled: true, calibration: null });
  const [stepIndex, setStepIndex] = useState(-1);
  const [attempt, setAttempt] = useState(0);
  const [samples, setSamples] = useState<MouthFeatures[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [isSaveFailed, setIsSaveFailed] = useState(false);
  const [isRetryShown, setIsRetryShown] = useState(false);
  const steps = content.data?.calibration ?? [];
  const step = steps[stepIndex];

  useEffect(() => {
    if (!step) return;
    const startedAt = performance.now() / 1000;
    const timer = setTimeout(() => {
      const captured = tracker.rawSince(startedAt);
      if (captured.length < MIN_SAMPLES_PER_STEP) {
        setIsRetryShown(true);
        setAttempt((count) => count + 1); // re-arms this effect for the same step
        return;
      }
      setIsRetryShown(false);
      setSamples((previous) => [...previous, ...captured]);
      setStepIndex((index) => index + 1);
    }, step.seconds * 1000);
    return () => clearTimeout(timer);
  }, [step, tracker, attempt]);

  useEffect(() => {
    if (stepIndex < steps.length || steps.length === 0 || isDone) return;
    const calibration = calibrationFromSamples(samples);
    if (!calibration) return;
    saveCalibration(calibration)
      .then((saved) => {
        setIsSaveFailed(!saved);
        setIsDone(true);
      })
      .catch(() => {
        setIsSaveFailed(true);
        setIsDone(true);
      });
  }, [stepIndex, steps.length, samples, isDone]);

  if (content.status === AsyncStatus.Error) {
    return <ErrorState message={content.error ?? ''} onRetry={content.reload} />;
  }
  if (!content.data) return <Skeleton lines={4} />;

  const restart = (): void => {
    setSamples([]);
    setIsDone(false);
    setIsSaveFailed(false);
    setStepIndex(0);
  };
  const isSaving = stepIndex >= steps.length && steps.length > 0 && !isDone;

  return (
    <div className="calibration-flow">
      <PageIntro title={COPY.calibration.title} lead={COPY.calibration.intro} />
      <div className="calibration-flow__layout">
        <CameraPanel tracker={tracker} />
        <div className="calibration-flow__panel" aria-live="polite">
          {stepIndex < 0 ? (
            <Button onClick={() => setStepIndex(0)}>{COPY.calibration.start}</Button>
          ) : null}
          {step ? (
            <>
              <p className="calibration-flow__step">
                {COPY.calibration.step(stepIndex + 1, steps.length)}
              </p>
              <p className="calibration-flow__prompt">{step.prompt_vi}</p>
              <p className="calibration-flow__muted">{COPY.calibration.hold}</p>
              {isRetryShown ? (
                <p className="calibration-flow__muted">{COPY.calibration.needFace}</p>
              ) : null}
            </>
          ) : null}
          {isSaving ? <p className="calibration-flow__muted">{COPY.calibration.saving}</p> : null}
          {isDone ? (
            <>
              <p className="calibration-flow__done">{COPY.calibration.done}</p>
              {isSaveFailed ? (
                <p className="calibration-flow__muted">{COPY.calibration.failed}</p>
              ) : null}
              <div className="calibration-flow__actions">
                <Link
                  href={sound ? { pathname: '/mirror', query: { sound } } : '/mirror'}
                  className="button button--primary"
                >
                  {COPY.calibration.goMirror}
                </Link>
                <Button variant={ButtonVariant.Ghost} onClick={restart}>
                  {COPY.calibration.redo}
                </Button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};
