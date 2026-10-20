'use client';

import Link from 'next/link';
import type { ReactElement } from 'react';

import { Button } from '@/components/Button/Button';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { useCopy } from '@/hooks/useCopy';
import type { PlacementResult } from '@/interfaces/listening.interface';
import type { CurriculumLevel, SoundDrillSummary } from '@/interfaces/practice.interface';
import { targetPhoneOf } from '@/utils/drill.util';

interface PlacementResultCardProps {
  result: PlacementResult;
  levels: CurriculumLevel[];
  sounds: SoundDrillSummary[];
  titleOf: (levelId: string) => string;
  onRetake: () => void;
}

const percent = (share: number | undefined): number => Math.round((share ?? 0) * 100);

/** Where to start, why, per-level scores and (after speaking) the three things to practise first. */
export const PlacementResultCard = ({
  result,
  levels,
  sounds,
  titleOf,
  onRetake,
}: PlacementResultCardProps): ReactElement => {
  const copy = useCopy().placement;
  const soundOf = (phoneme: string): string | null =>
    sounds.find((sound) => targetPhoneOf(sound.arpabet) === phoneme)?.id ?? null;
  return (
    <section className="placement-screen__card" aria-labelledby="placement-result">
      <h2 id="placement-result" className="placement-screen__muted">
        {copy.resultTitle}
      </h2>
      <p className="placement-screen__level">{titleOf(result.level)}</p>
      <p className="placement-screen__muted">{copy.explain}</p>
      <ul className="placement-screen__scores">
        {levels.map((level) => (
          <li key={level.id} className="placement-screen__score">
            {result.speaking?.[level.id] !== undefined
              ? copy.levelLineBoth(
                  titleOf(level.id),
                  percent(result.scores[level.id]),
                  percent(result.speaking[level.id]),
                )
              : copy.levelLine(titleOf(level.id), percent(result.scores[level.id]))}
          </li>
        ))}
      </ul>
      {result.speaking ? (
        <div className="placement-screen__priorities">
          <h3 className="placement-screen__subtitle">{copy.prioritiesTitle}</h3>
          {result.priorities && result.priorities.length > 0 ? (
            <ol className="placement-screen__priority-list">
              {result.priorities.map((priority) => {
                const sound = soundOf(priority.phoneme);
                return (
                  <li
                    key={`${priority.phoneme}-${priority.hint}`}
                    className="placement-screen__priority"
                  >
                    <span className="placement-screen__ipa">/{priority.ipa}/</span>
                    <span>{priority.hint}</span>
                    {sound ? (
                      <Link
                        href={{ pathname: '/practice', query: { sound } }}
                        className="button button--secondary button--small"
                      >
                        {copy.practiceSound}
                      </Link>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : (
            <p className="placement-screen__muted">{copy.noPriorities}</p>
          )}
        </div>
      ) : null}
      <Link href="/" className="button button--primary button--full-width">
        {copy.goPath}
      </Link>
      <Button variant={ButtonVariant.Ghost} isFullWidth onClick={onRetake}>
        {copy.retake}
      </Button>
    </section>
  );
};
