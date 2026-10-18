'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactElement, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { Card } from '@/components/Card/Card';
import { Icon } from '@/components/Icon/Icon';
import { PageIntro } from '@/components/PageIntro/PageIntro';
import { ButtonVariant } from '@/enums/button-variant.enum';
import { IconName } from '@/enums/icon-name.enum';
import {
  markOnboarded,
  requestMediaPermissions,
} from '@/features/onboarding/services/onboarding.service';
import { createProfile, setActiveProfile } from '@/features/settings/services/profile.service';
import { useCopy } from '@/hooks/useCopy';
import { useFocusMode } from '@/hooks/useImmersive';
import type { MediaPermissions, PermissionOutcome } from '@/interfaces/onboarding.interface';
import { cx } from '@/utils/cx.util';

import './WelcomeFlow.css';

const STEPS = ['intro', 'profile', 'calibrate'] as const;
type Step = (typeof STEPS)[number];

/** First-run guide: what the app needs and why, who is practising, and the 20-second calibration. */
export const WelcomeFlow = (): ReactElement => {
  const copy = useCopy().onboarding;
  const router = useRouter();
  useFocusMode();
  const [step, setStep] = useState<Step>('intro');
  const [permissions, setPermissions] = useState<MediaPermissions | null>(null);
  const [isAsking, setIsAsking] = useState(false);
  const [name, setName] = useState('');
  const [profileNote, setProfileNote] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const ask = async (): Promise<void> => {
    setIsAsking(true);
    setPermissions(await requestMediaPermissions());
    setIsAsking(false);
  };
  const createAndContinue = async (): Promise<void> => {
    const trimmed = name.trim();
    if (!trimmed) {
      setStep('calibrate');
      return;
    }
    setIsCreating(true);
    try {
      const created = await createProfile(trimmed);
      setActiveProfile({ id: created.id, name: created.name });
      setStep('calibrate');
    } catch {
      setProfileNote(copy.profileOffline);
    } finally {
      setIsCreating(false);
    }
  };
  const finish = (): void => {
    markOnboarded();
    router.push('/');
  };
  const outcomeLabel: Record<PermissionOutcome, string> = {
    granted: copy.granted,
    denied: copy.denied,
    missing: copy.missing,
  };
  const index = STEPS.indexOf(step);

  return (
    <div className="welcome-flow">
      <PageIntro title={copy.title} lead={copy.lead} />
      <ol className="welcome-flow__steps" aria-label={copy.stepsAria}>
        {STEPS.map((id, position) => (
          <li
            key={id}
            className={cx(
              'welcome-flow__step',
              position < index && 'is-done',
              position === index && 'is-current',
            )}
            aria-current={position === index ? 'step' : undefined}
          >
            <span className="welcome-flow__step-number" aria-hidden="true">
              {position < index ? '✓' : position + 1}
            </span>
            <span>{copy.steps[id]}</span>
          </li>
        ))}
      </ol>

      {step === 'intro' ? (
        <Card as="section" aria-labelledby="welcome-intro" className="welcome-flow__card">
          <h2 id="welcome-intro" className="welcome-flow__heading">
            {copy.introTitle}
          </h2>
          <ul className="welcome-flow__list">
            <li className="welcome-flow__item">
              <Icon name={IconName.Record} /> {copy.introMic}
            </li>
            <li className="welcome-flow__item">
              <Icon name={IconName.Camera} /> {copy.introCamera}
            </li>
            <li className="welcome-flow__item">
              <Icon name={IconName.Check} /> {copy.introPrivacy}
            </li>
          </ul>
          <div className="welcome-flow__actions">
            <Button onClick={() => void ask()} disabled={isAsking}>
              {isAsking ? copy.asking : copy.allow}
            </Button>
            <Button variant={ButtonVariant.Ghost} onClick={() => setStep('profile')}>
              {permissions ? copy.next : copy.later}
            </Button>
          </div>
          {permissions ? (
            <p className="welcome-flow__muted" role="status">
              {copy.micStatus(outcomeLabel[permissions.microphone])} ·{' '}
              {copy.cameraStatus(outcomeLabel[permissions.camera])}
            </p>
          ) : null}
        </Card>
      ) : null}

      {step === 'profile' ? (
        <Card as="section" aria-labelledby="welcome-profile" className="welcome-flow__card">
          <h2 id="welcome-profile" className="welcome-flow__heading">
            {copy.profileTitle}
          </h2>
          <p className="welcome-flow__muted">{copy.profileLead}</p>
          <label className="welcome-flow__field">
            <span className="welcome-flow__label">{copy.profileName}</span>
            <input
              className="welcome-flow__input"
              value={name}
              maxLength={80}
              autoCapitalize="words"
              placeholder={copy.profilePlaceholder}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <div className="welcome-flow__actions">
            <Button onClick={() => void createAndContinue()} disabled={isCreating}>
              {name.trim() ? copy.createProfile : copy.useDefault}
            </Button>
          </div>
          {profileNote ? (
            <p className="welcome-flow__muted" role="status">
              {profileNote}{' '}
              <button
                type="button"
                className="welcome-flow__link"
                onClick={() => setStep('calibrate')}
              >
                {copy.skipProfile}
              </button>
            </p>
          ) : null}
        </Card>
      ) : null}

      {step === 'calibrate' ? (
        <Card as="section" aria-labelledby="welcome-calibrate" className="welcome-flow__card">
          <h2 id="welcome-calibrate" className="welcome-flow__heading">
            {copy.calibrateTitle}
          </h2>
          <p className="welcome-flow__muted">{copy.calibrateLead}</p>
          <div className="welcome-flow__actions">
            <Link
              href={{ pathname: '/calibration', query: { next: '/' } }}
              className="button button--primary"
              onClick={markOnboarded}
            >
              {copy.calibrateNow}
            </Link>
            <Button variant={ButtonVariant.Ghost} onClick={finish}>
              {copy.finish}
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
};
