'use client';

import { type ReactElement, type ReactNode, useEffect, useMemo } from 'react';

import { ConfidenceBadge } from '@/components/ConfidenceBadge/ConfidenceBadge';
import { FeatureBar } from '@/components/FeatureBar/FeatureBar';
import { MatchState } from '@/enums/match-state.enum';
import { CameraStage } from '@/features/mirror/components/CameraStage';
import { CueChip } from '@/features/mirror/components/CueChip';
import { FeatureChips } from '@/features/mirror/components/FeatureChips';
import { MatchRing } from '@/features/mirror/components/MatchRing';
import { TargetShape } from '@/features/mirror/components/TargetShape';
import { useSuccessChime } from '@/features/mirror/hooks/useSuccessChime';
import { useTargetHold } from '@/features/mirror/hooks/useTargetHold';
import { useCopy } from '@/hooks/useCopy';
import type { MouthFeatureName } from '@/interfaces/mouth.interface';
import type { VisemeTargetCard } from '@/interfaces/practice.interface';
import type { MouthTracker } from '@/interfaces/tracker.interface';
import { cx } from '@/utils/cx.util';
import { cueFor, matchMouth } from '@/utils/mouth-match.util';
import { nativeHaptic } from '@/utils/native.util';
import { targetsFromApi } from '@/utils/viseme-match.util';

import './MirrorGuide.css';

interface MirrorGuideProps {
  sound: string;
  target: VisemeTargetCard | null;
  tracker: MouthTracker;
  muted: boolean;
  confidenceLabels?: Record<string, string>;
  transitionVi?: string | null;
  /** Optional "ask the AI about my mouth" block (only when the tutor is configured). */
  tutor?: ReactNode;
  /** Controls floating over the camera: sound chip, pause, mute, recalibrate. */
  topStart?: ReactNode;
  topEnd?: ReactNode;
}

/** Live mirror: ghost target over the mouth, match dial, one cue, chips, details on demand. */
export const MirrorGuide = ({
  sound,
  target,
  tracker,
  muted,
  confidenceLabels,
  transitionVi = null,
  tutor = null,
  topStart = null,
  topEnd = null,
}: MirrorGuideProps): ReactElement => {
  const copy = useCopy();
  const targets = useMemo(() => (target ? targetsFromApi(target.targets) : {}), [target]);
  const names = useMemo(() => Object.keys(targets) as MouthFeatureName[], [targets]);
  const sample = tracker.latest;
  const usable = sample && sample.quality >= 0.5 ? sample.features : null;
  const hold = useTargetHold(target ? usable : null, targets, target?.hold_ms ?? 250);
  useSuccessChime(hold.isHeld, muted);
  useEffect(() => {
    if (hold.isHeld) void nativeHaptic('success');
  }, [hold.isHeld]);
  const match = useMemo(() => matchMouth(usable, targets), [usable, targets]);
  const cue = hold.showHint ? cueFor(match.worst) : null;
  const stateLabel = hold.isHeld
    ? copy.mirror.match.held
    : match.state === MatchState.OnTarget
      ? copy.mirror.match.onTarget
      : match.state === MatchState.Close
        ? copy.mirror.match.close
        : match.state === MatchState.Far
          ? copy.mirror.match.far
          : copy.mirror.match.noFace;

  return (
    <div className={cx('mirror-guide', hold.isHeld && 'is-held')}>
      <CameraStage
        tracker={tracker}
        ghost={target?.group ?? null}
        isOnTarget={hold.isOnTarget}
        isHeld={hold.isHeld}
        topStart={topStart}
        topEnd={topEnd}
        bottom={
          target ? (
            <>
              {cue && match.worst ? <CueChip text={cue} direction={match.worst.direction} /> : null}
              <MatchRing
                score={match.score}
                state={match.state}
                isHeld={hold.isHeld}
                holdProgress={hold.holdProgress}
              />
            </>
          ) : null
        }
      />
      <div className="mirror-guide__below">
        <p className="visually-hidden" role="status" aria-live="polite">
          {target ? `${stateLabel}${cue ? ` · ${cue}` : ''}` : ''}
        </p>
        {target ? (
          <FeatureChips
            names={names}
            verdicts={match.verdicts}
            labels={copy.mirror.features}
            isIdle={!usable}
          />
        ) : (
          <p className="mirror-guide__audio-only">{copy.mirror.audioOnly}</p>
        )}
        <details className="mirror-guide__details">
          <summary className="mirror-guide__summary">{copy.mirror.details}</summary>
          <div className="mirror-guide__body">
            <div className="mirror-guide__target">
              <TargetShape group={target?.group ?? null} size={96} />
              <div className="mirror-guide__copy">
                <p className="mirror-guide__sound">{sound}</p>
                {target ? (
                  <>
                    <p className="mirror-guide__name">{target.name_vi}</p>
                    <ConfidenceBadge confidence={target.confidence} labels={confidenceLabels} />
                    <p>{target.hint_vi}</p>
                    {transitionVi ? (
                      <p className="mirror-guide__transition">{transitionVi}</p>
                    ) : null}
                    {target.confidence === 'low' ? (
                      <p className="mirror-guide__muted">{copy.mirror.lowConfidence}</p>
                    ) : null}
                    <p className="mirror-guide__muted">
                      {copy.mirror.commonError}: {target.common_error_vi}
                    </p>
                  </>
                ) : (
                  <p>{copy.mirror.audioOnly}</p>
                )}
              </div>
            </div>
            {names.length > 0 ? (
              <div className="mirror-guide__bars">
                {names.map((name) => (
                  <FeatureBar
                    key={name}
                    label={copy.mirror.features[name]}
                    value={usable?.[name] ?? 0}
                    target={targets[name]}
                  />
                ))}
              </div>
            ) : null}
            {tutor}
          </div>
        </details>
      </div>
    </div>
  );
};
