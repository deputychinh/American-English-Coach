'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactElement, useCallback, useEffect, useMemo } from 'react';

import { Icon } from '@/components/Icon/Icon';
import { WeekStrip } from '@/components/WeekStrip/WeekStrip';
import { DEFAULT_DAILY_GOAL } from '@/constants/plan.constant';
import { AsyncStatus } from '@/enums/async-status.enum';
import { IconName } from '@/enums/icon-name.enum';
import { Language } from '@/enums/language.enum';
import { StorageKey } from '@/enums/storage-key.enum';
import {
  flattenUnits,
  getCurriculum,
  nextStepOf,
} from '@/features/curriculum/services/curriculum.service';
import { ApiStatusBanner } from '@/features/health/components/ApiStatusBanner';
import { listenAccuracy, readListenResults } from '@/features/listen/services/listen.service';
import { isOnboarded } from '@/features/onboarding/services/onboarding.service';
import { continueUnit, readPlacement } from '@/features/placement/services/placement.service';
import { getPlan } from '@/features/plan/services/plan.service';
import { useActiveProfile } from '@/hooks/useActiveProfile';
import { useAsync } from '@/hooks/useAsync';
import { useCopy, useLanguage } from '@/hooks/useCopy';
import { useStoredState } from '@/hooks/useStoredState';

import './HomeScreen.css';

const TILES = [
  { key: 'mirror', href: '/mirror', icon: IconName.Mirror },
  { key: 'listen', href: '/listen', icon: IconName.Volume },
  { key: 'chart', href: '/sounds', icon: IconName.Sounds },
  { key: 'path', href: '/curriculum', icon: IconName.Sparkles },
] as const;

const RING = 2 * Math.PI * 26;

/** "Today": greeting and streak, the daily goal, one big continue card, focus sounds, shortcuts. */
export const HomeScreen = (): ReactElement => {
  const copy = useCopy();
  const language = useLanguage();
  const router = useRouter();
  const profile = useActiveProfile();
  const [goal] = useStoredState<number>(StorageKey.DailyGoal, DEFAULT_DAILY_GOAL);
  useEffect(() => {
    if (!isOnboarded()) router.replace('/welcome');
  }, [router]);
  const loadPlan = useCallback(() => getPlan(goal), [goal]);
  const plan = useAsync(loadPlan);
  const curriculum = useAsync(getCurriculum);

  const placement = useMemo(() => readPlacement(), []);
  const current = useMemo(
    () =>
      curriculum.data
        ? continueUnit({
            units: flattenUnits(curriculum.data),
            currentId: curriculum.data.current_unit,
            placement,
          })
        : null,
    [curriculum.data, placement],
  );
  const level = curriculum.data?.levels.find((item) => item.id === current?.level) ?? null;
  const isNewLearner =
    placement === null &&
    curriculum.data !== null &&
    curriculum.data.completed_units === 0 &&
    (current?.progress.done_items ?? 0) === 0;
  const next = current
    ? nextStepOf(current, listenAccuracy(readListenResults(), current.id))
    : null;
  const listenHref = current ? { pathname: '/listen', query: { unit: current.id } } : '/listen';

  const done = plan.data?.runs_today ?? 0;
  const target = plan.data?.goal_runs ?? goal;
  const share = target > 0 ? Math.min(1, done / target) : 0;
  const name = profile.name && profile.name !== 'default' ? profile.name : null;

  return (
    <div className="home-screen">
      <header className="home-screen__top">
        <div className="home-screen__hello">
          <h1 className="home-screen__title">
            {name ? copy.today.greeting(name) : copy.today.greetingNoName}
          </h1>
          {plan.data && plan.data.streak_days > 0 ? (
            <span className="home-screen__streak">
              <Icon name={IconName.Sparkles} />
              {copy.today.streak(plan.data.streak_days)}
            </span>
          ) : null}
        </div>
        <Link href="/settings" className="home-screen__settings" aria-label={copy.today.settings}>
          <Icon name={IconName.Settings} />
        </Link>
      </header>

      <ApiStatusBanner isQuietWhenReady />

      <section className="home-screen__goal" aria-labelledby="today-title">
        <span className="home-screen__ring-box" aria-hidden="true">
          <svg className="home-screen__ring" viewBox="0 0 64 64">
            <circle className="home-screen__ring-track" cx="32" cy="32" r="26" />
            <circle
              className="home-screen__ring-value"
              cx="32"
              cy="32"
              r="26"
              style={{ strokeDasharray: RING, strokeDashoffset: RING * (1 - share) }}
            />
          </svg>
          <span className="home-screen__ring-count">
            {done >= target && target > 0 ? '✓' : `${String(done)}/${String(target)}`}
          </span>
        </span>
        <div className="home-screen__goal-text">
          <h2 id="today-title" className="home-screen__goal-title">
            {copy.plan.title}
          </h2>
          <div
            className="home-screen__goal-value"
            role="progressbar"
            aria-label={copy.plan.goalAria}
            aria-valuemin={0}
            aria-valuemax={target}
            aria-valuenow={Math.min(done, target)}
          >
            {done >= target && target > 0 ? copy.today.goalDone : copy.today.goal(done, target)}
          </div>
          {plan.data ? (
            <WeekStrip days={plan.data.week} today={plan.data.today} label={copy.plan.weekAria} />
          ) : null}
        </div>
      </section>

      {curriculum.status === AsyncStatus.Error ? (
        <Link href="/practice" className="home-screen__continue">
          <span className="home-screen__continue-label">{copy.today.continueLabel}</span>
          <span className="home-screen__continue-title">{copy.home.sounds}</span>
          <span className="home-screen__continue-step">{copy.home.soundsHint}</span>
          <span className="home-screen__continue-cta">
            {copy.home.heroCta}
            <Icon name={IconName.ArrowRight} />
          </span>
        </Link>
      ) : null}
      {current && next ? (
        <Link href={next.href} className="home-screen__continue">
          <span className="home-screen__continue-label">{copy.today.continueLabel}</span>
          <span className="home-screen__continue-title">
            {copy.today.unitLine(
              current.index,
              language === Language.En ? current.title_en : current.title_vi,
            )}
          </span>
          <span className="home-screen__continue-step">{copy.today.next[next.kind]}</span>
          {level ? (
            <span className="home-screen__continue-level">
              <span>
                {copy.today.levelLine(
                  copy.curriculum.levelTitle(
                    level.id,
                    language === Language.En ? level.title_en : level.title_vi,
                  ),
                  level.done_units,
                  level.units.length,
                )}
              </span>
              <span className="home-screen__continue-bar" aria-hidden="true">
                <span
                  className="home-screen__continue-fill"
                  style={{
                    inlineSize: `${String(Math.round((level.done_units / Math.max(1, level.units.length)) * 100))}%`,
                  }}
                />
              </span>
            </span>
          ) : null}
          <span className="home-screen__continue-cta">
            {copy.home.heroCta}
            <Icon name={IconName.ArrowRight} />
          </span>
        </Link>
      ) : null}

      {isNewLearner ? (
        <Link href="/placement" className="home-screen__placement">
          <span className="home-screen__placement-text">
            <span className="home-screen__placement-title">{copy.placement.homeTitle}</span>
            <span className="home-screen__muted">{copy.placement.homeHint}</span>
          </span>
          <span className="home-screen__placement-cta">{copy.placement.homeCta}</span>
        </Link>
      ) : null}

      <section className="home-screen__focus" aria-labelledby="focus-title">
        <h2 id="focus-title" className="home-screen__section-title">
          {copy.today.focusTitle}
        </h2>
        {plan.data && plan.data.focus.length > 0 ? (
          <ul className="home-screen__chips">
            {plan.data.focus.map((focus) => (
              <li key={focus.phoneme}>
                <Link
                  className={`home-screen__chip home-screen__chip--${focus.reason}`}
                  href={
                    focus.sound_id
                      ? { pathname: '/practice', query: { sound: focus.sound_id } }
                      : { pathname: '/mirror', query: { sound: focus.phoneme } }
                  }
                >
                  <span className="home-screen__chip-ipa">/{focus.ipa}/</span>
                  <span className="home-screen__chip-reason">
                    {copy.plan.reasonLabel[focus.reason]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="home-screen__muted">{copy.today.focusEmpty}</p>
        )}
      </section>

      <ul className="home-screen__tiles">
        {TILES.map((tile) => (
          <li key={tile.key}>
            <Link
              href={tile.key === 'listen' ? listenHref : tile.href}
              className="home-screen__tile"
            >
              <span className="home-screen__tile-icon" aria-hidden="true">
                <Icon name={tile.icon} />
              </span>
              {copy.today.tiles[tile.key]}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
