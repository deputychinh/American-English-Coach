'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactElement, useEffect, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { Icon } from '@/components/Icon/Icon';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { IconName } from '@/enums/icon-name.enum';
import { getVisemes } from '@/features/content/services/content.service';
import { CameraStage } from '@/features/mirror/components/CameraStage';
import { useMouthTracker } from '@/features/mirror/hooks/useMouthTracker';
import { saveCalibration } from '@/features/mirror/services/calibration.service';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { useFocusMode, useImmersive } from '@/hooks/useImmersive';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import type { MouthFeatures } from '@/interfaces/mouth.interface';
import { calibrationFromSamples } from '@/utils/calibration.util';
import { cx } from '@/utils/cx.util';

import './CalibrationFlow.css';

const MIN_SAMPLES_PER_STEP = 8;

export const CalibrationFlow = (): ReactElement => {
  const copy = useCopy();
  const params = useSearchParams();
  const sound = params.get('sound');
  const nextParam = params.get('next');
  const next = nextParam?.startsWith('/') ? nextParam : null;
  const content = useAsync(getVisemes);
  useKeepAwake();
  useImmersive();
  useFocusMode();
  const tracker = useMouthTracker({ enabled: true, calibration: null });
  const [stepIndex, setStepIndex] = useState(-1);
  const [attempt, setAttempt] = useState(0);
  const [samples, setSamples] = useState<MouthFeatures[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [isSaveFailed, setIsSaveFailed] = useState(false);
  const [isRetryShown, setIsRetryShown] = useState(false);
  const steps = content.data?.calibration ?? [];
  const step = steps[stepIndex];

  // The tracker object changes whenever a frame updates the UI, but `rawSince` is stable; the step
  // timer must depend on that function only, never on the whole tracker.
  const { rawSince } = tracker;

  useEffect(() => {
    if (!step) return;
    const startedAt = performance.now() / 1000;
    const timer = setTimeout(() => {
      const captured = rawSince(startedAt);
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
  }, [step, attempt, rawSince]);

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

  const dots = (
    <ol className="calibration-flow__steps" aria-label={copy.calibration.stepsTitle}>
      {steps.map((item, position) => (
        <li
          key={item.id}
          className={cx(
            'calibration-flow__step-dot',
            position < stepIndex && 'is-done',
            position === stepIndex && 'is-current',
          )}
          aria-current={position === stepIndex ? 'step' : undefined}
        >
          <span className="visually-hidden">{item.prompt_vi}</span>
        </li>
      ))}
    </ol>
  );
  const ring = step ? (
    <div className="calibration-flow__ring-row">
      <svg
        className="calibration-flow__ring"
        viewBox="0 0 48 48"
        role="img"
        aria-label={copy.calibration.progressAria}
      >
        <circle className="calibration-flow__ring-track" cx="24" cy="24" r="20" />
        <circle
          className="calibration-flow__ring-value"
          cx="24"
          cy="24"
          r="20"
          style={{ strokeDashoffset: 126 - (126 * (stepIndex + 1)) / steps.length }}
        />
      </svg>
      <p className="calibration-flow__step">{copy.calibration.step(stepIndex + 1, steps.length)}</p>
    </div>
  ) : null;

  const panel = (
    <div className="calibration-flow__panel" aria-live="polite">
      {ring}
      {stepIndex < 0 ? (
        <>
          <p className="calibration-flow__lead">{copy.calibration.intro}</p>
          <Button onClick={() => setStepIndex(0)}>{copy.calibration.start}</Button>
        </>
      ) : null}
      {step ? (
        <>
          <p className="calibration-flow__muted">{copy.calibration.hold}</p>
          {isRetryShown || !tracker.isFaceVisible ? (
            <p className="calibration-flow__muted">{copy.calibration.needFace}</p>
          ) : null}
        </>
      ) : null}
      {isSaving ? <p className="calibration-flow__muted">{copy.calibration.saving}</p> : null}
      {isDone ? (
        <>
          <p className="calibration-flow__done">{copy.calibration.done}</p>
          {isSaveFailed ? (
            <p className="calibration-flow__muted">{copy.calibration.failed}</p>
          ) : null}
          <div className="calibration-flow__actions">
            <Link
              href={next ?? (sound ? { pathname: '/mirror', query: { sound } } : '/mirror')}
              className="button button--primary"
            >
              {next ? copy.calibration.goNext : copy.calibration.goMirror}
            </Link>
            <Button variant={ButtonVariant.Ghost} onClick={restart}>
              {copy.calibration.redo}
            </Button>
          </div>
        </>
      ) : null}
    </div>
  );

  return (
    <div className="calibration-flow">
      <div className="calibration-flow__intro">
        <PageIntro title={copy.calibration.title} lead={copy.calibration.intro} />
      </div>
      <CameraStage
        tracker={tracker}
        topStart={dots}
        topEnd={
          <Link
            href={next ?? '/mirror'}
            className="calibration-flow__close"
            aria-label={copy.common.close}
          >
            <Icon name={IconName.Close} />
          </Link>
        }
        bottom={panel}
        prompt={step ? step.prompt_vi : null}
      />
    </div>
  );
};
