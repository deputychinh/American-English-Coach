'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { type ReactElement, useCallback, useMemo, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { ErrorState } from '@/components/ErrorState/ErrorState';
import { LessonHeader } from '@/components/LessonHeader/LessonHeader';
import { Skeleton } from '@/components/Skeleton/Skeleton';
import { AsyncStatus } from '@/enums/async-status.enum';
import { ButtonVariant } from '@/enums/button-variant.enum';
import {
  getPairs,
  getPhonemes,
  getSentences,
  getSound,
} from '@/features/content/services/content.service';
import { flattenUnits, getCurriculum } from '@/features/curriculum/services/curriculum.service';
import { LessonBanner } from '@/features/lesson/components/LessonBanner';
import { LessonDescribe } from '@/features/lesson/components/LessonDescribe';
import { LessonListen } from '@/features/lesson/components/LessonListen';
import { LessonReminderOffer } from '@/features/lesson/components/LessonReminderOffer';
import { LessonSummary } from '@/features/lesson/components/LessonSummary';
import {
  advance,
  buildLesson,
  isLessonDone,
  lessonProgress,
  passTarget,
  passedIn,
  recordTake,
  retryPosition,
  startPosition,
  stepSize,
} from '@/features/lesson/services/lesson-plan.service';
import {
  clearLessonPosition,
  readLessonPosition,
  saveLessonPosition,
} from '@/features/lesson/services/lesson-position.service';
import { saveListenResult } from '@/features/listen/services/listen.service';
import { PracticeSession } from '@/features/practice/components/PracticeSession';
import { useAsync } from '@/hooks/useAsync';
import { useCopy } from '@/hooks/useCopy';
import { useFocusMode, useImmersive } from '@/hooks/useImmersive';
import { useKeepAwake } from '@/hooks/useKeepAwake';
import type { LessonPlan, LessonPosition } from '@/interfaces/lesson.interface';
import type { AssessmentResponse } from '@/interfaces/practice.interface';

import './LessonPlayer.css';

const CLOSE_HREF = '/curriculum';

const loadLesson = (unitId: string) => async (): Promise<LessonPlan | null> => {
  const [curriculum, pairs, sentences, phonemes] = await Promise.all([
    getCurriculum(),
    getPairs(),
    getSentences(),
    getPhonemes(),
  ]);
  const unit = flattenUnits(curriculum).find((candidate) => candidate.id === unitId);
  if (!unit) return null;
  const soundIds = unit.steps.flatMap((step) =>
    'items' in step
      ? step.items.filter((ref) => String(ref.kind) === 'sound').map((ref) => ref.id)
      : [],
  );
  const drills = await Promise.all(soundIds.map((id) => getSound(id)));
  return buildLesson({ unit, pairs, sentences, phonemes, drills });
};

const speakingItems = (plan: LessonPlan): number =>
  plan.steps.reduce(
    (sum, step) =>
      sum + (step.kind === 'describe' || step.kind === 'discriminate' ? 0 : stepSize(step)),
    0,
  );

/** The whole unit on one full-screen player: describe → listen → controlled → guided → communicate. */
export const LessonPlayer = (): ReactElement => {
  const copy = useCopy();
  const params = useSearchParams();
  const unitId = params.get('unit') ?? 'u01';
  const load = useMemo(() => loadLesson(unitId), [unitId]);
  const content = useAsync(load);
  const [stored, setStored] = useState<LessonPosition | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  useFocusMode();
  useImmersive();
  useKeepAwake();

  const position = stored ?? readLessonPosition(unitId) ?? startPosition();
  const move = useCallback(
    (next: LessonPosition) => {
      setStored(next);
      saveLessonPosition(unitId, next);
    },
    [unitId],
  );

  const plan = content.data;
  const step = plan?.steps[position.step];
  const onResult = useCallback(
    (result: AssessmentResponse) => {
      const item = step && 'items' in step ? step.items[position.index] : undefined;
      if (item) move(recordTake(position, item.id, result.summary.error > 0));
    },
    [move, position, step],
  );

  if (content.status === AsyncStatus.Error) {
    return <ErrorState message={content.error ?? ''} onRetry={content.reload} />;
  }
  if (content.status !== AsyncStatus.Success)
    return <Skeleton lines={6} label={copy.lesson.loading} />;
  if (!plan) return <ErrorState message={copy.lesson.notFound} />;

  const total = plan.steps.length;
  const progress = lessonProgress(plan, position);
  const header = (subtitle: string): ReactElement => (
    <LessonHeader
      closeHref={CLOSE_HREF}
      title={plan.title}
      subtitle={subtitle}
      progress={progress}
    />
  );
  const stepLabel = (index: number): string => {
    const kind = plan.steps[index]?.kind ?? 'describe';
    return copy.lesson.stepOf(index + 1, total, copy.lesson.steps[kind]);
  };
  const goNext = (): void => move(advance(plan, position, isRetrying));
  const nextStep = (): void => {
    setIsRetrying(false);
    move({ ...position, step: position.step + 1, index: 0 });
  };

  if (!step || isLessonDone(plan, position)) {
    const listen = plan.steps.find((s) => s.kind === 'discriminate');
    const questions = listen ? stepSize(listen) : 0;
    const lines = [
      ...(questions > 0
        ? [copy.lesson.doneListen(Math.round((position.listenCorrect / questions) * 100))]
        : []),
      copy.lesson.doneSpeak(position.passed.length, speakingItems(plan)),
      copy.lesson.doneAdvice,
    ];
    return (
      <div className="lesson-player">
        {header(copy.lesson.title)}
        <div className="lesson-player__body">
          <LessonSummary title={copy.lesson.doneTitle} lines={lines}>
            <Link href={CLOSE_HREF} className="button button--primary">
              {copy.lesson.backToCourse}
            </Link>
            <Button
              variant={ButtonVariant.Ghost}
              onClick={() => {
                clearLessonPosition(unitId);
                setIsRetrying(false);
                setStored(startPosition());
              }}
            >
              {copy.lesson.restart}
            </Button>
            <LessonReminderOffer />
          </LessonSummary>
        </div>
      </div>
    );
  }

  if (step.kind === 'describe') {
    return (
      <div className="lesson-player">
        {header(stepLabel(position.step))}
        <div className="lesson-player__body">
          <LessonDescribe step={step} onNext={goNext} />
        </div>
      </div>
    );
  }

  if (step.kind === 'discriminate') {
    return (
      <div className="lesson-player">
        {header(stepLabel(position.step))}
        <div className="lesson-player__body">
          <LessonListen
            step={step}
            index={position.index}
            onAnswered={(isCorrect) => {
              const counted = {
                ...position,
                listenCorrect: position.listenCorrect + (isCorrect ? 1 : 0),
              };
              if (position.index + 1 >= step.questions.length) {
                saveListenResult({
                  unitId,
                  total: step.questions.length,
                  correct: counted.listenCorrect,
                  finishedAt: new Date().toISOString(),
                });
              }
              move(advance(plan, counted));
            }}
          />
        </div>
      </div>
    );
  }

  const passed = passedIn(step, position.passed);
  const size = stepSize(step);
  if (position.index >= size) {
    const need = passTarget(step);
    const isEnough = passed >= need;
    return (
      <div className="lesson-player">
        {header(stepLabel(position.step))}
        <div className="lesson-player__body">
          <LessonSummary
            title={copy.lesson.gateTitle}
            lines={[
              isEnough
                ? copy.lesson.gateOk(passed, size)
                : copy.lesson.gateShort(passed, size, need),
            ]}
          >
            {isEnough ? (
              <Button onClick={nextStep}>{copy.lesson.nextStep}</Button>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setIsRetrying(true);
                    move(retryPosition(plan, position));
                  }}
                >
                  {copy.lesson.retryFailed}
                </Button>
                <Button variant={ButtonVariant.Ghost} onClick={nextStep}>
                  {copy.lesson.goOn}
                </Button>
              </>
            )}
          </LessonSummary>
        </div>
      </div>
    );
  }

  const item = step.items[position.index];
  if (!item) return <ErrorState message={copy.lesson.notFound} />;
  const isTried = position.tried.includes(item.id);
  return (
    <div className="lesson-player lesson-player--speak">
      <PracticeSession
        key={`${String(position.step)}:${item.id}`}
        item={item}
        closeHref={CLOSE_HREF}
        progress={progress}
        onResult={onResult}
        onSwipeNext={goNext}
        banner={
          <LessonBanner
            label={`${stepLabel(position.step)} · ${copy.lesson.itemOf(position.index + 1, size)}`}
            passed={copy.lesson.passedCount(passed, size)}
            scenario={step.scenario}
          />
        }
        extraActions={
          isTried ? (
            <Button isSmall onClick={goNext}>
              {copy.lesson.next}
            </Button>
          ) : (
            <Button variant={ButtonVariant.Ghost} isSmall onClick={goNext}>
              {copy.lesson.skip}
            </Button>
          )
        }
      />
    </div>
  );
};
