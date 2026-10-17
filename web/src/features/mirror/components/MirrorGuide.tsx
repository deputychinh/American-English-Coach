'use client';

import { type ReactElement, type ReactNode, useMemo } from 'react';

import { ConfidenceBadge } from '@/components/ConfidenceBadge/ConfidenceBadge';
import { FeatureBar } from '@/components/FeatureBar/FeatureBar';
import { FEATURE_NAMES } from '@/constants/mirror.constant';
import { TargetShape } from '@/features/mirror/components/TargetShape';
import { useSuccessChime } from '@/features/mirror/hooks/useSuccessChime';
import { useTargetHold } from '@/features/mirror/hooks/useTargetHold';
import { useCopy } from '@/hooks/useCopy';
import type { MouthFeatureName } from '@/interfaces/mouth.interface';
import type { VisemeTargetCard } from '@/interfaces/practice.interface';
import type { TrackedSample } from '@/interfaces/tracker.interface';
import { cx } from '@/utils/cx.util';
import { directionHint, targetsFromApi } from '@/utils/viseme-match.util';

import './MirrorGuide.css';

interface MirrorGuideProps {
  sound: string;
  target: VisemeTargetCard | null;
  features: TrackedSample | null;
  muted: boolean;
  camera: ReactNode;
  confidenceLabels?: Record<string, string>;
  transitionVi?: string | null;
  /** Optional "ask the AI about my mouth" block (only when the tutor is configured). */
  tutor?: ReactNode;
}

export const MirrorGuide = ({
  sound,
  target,
  features,
  muted,
  camera,
  confidenceLabels,
  transitionVi = null,
  tutor = null,
}: MirrorGuideProps): ReactElement => {
  const copy = useCopy();
  const targets = useMemo(() => (target ? targetsFromApi(target.targets) : {}), [target]);
  const usable = features && features.quality >= 0.5 ? features.features : null;
  const hold = useTargetHold(target ? usable : null, targets, target?.hold_ms ?? 250);
  useSuccessChime(hold.isHeld, muted);
  const hint = usable ? directionHint(usable, targets, copy.mirror.features) : null;
  const shownFeatures = target
    ? (Object.keys(targets) as MouthFeatureName[])
    : (FEATURE_NAMES as readonly MouthFeatureName[]);

  return (
    <div className={cx('mirror-guide', hold.isHeld && 'is-held')}>
      <div className="mirror-guide__camera">{camera}</div>
      <aside className="mirror-guide__side">
        <div className="mirror-guide__target">
          <TargetShape group={target?.group ?? null} size={120} />
          <div className="mirror-guide__copy">
            <p className="mirror-guide__sound">{sound}</p>
            {target ? (
              <>
                <p className="mirror-guide__name">{target.name_vi}</p>
                <ConfidenceBadge confidence={target.confidence} labels={confidenceLabels} />
                <p>{target.hint_vi}</p>
                {transitionVi ? <p className="mirror-guide__transition">{transitionVi}</p> : null}
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
        <div className="mirror-guide__bars">
          {shownFeatures.map((name) => (
            <FeatureBar
              key={name}
              label={copy.mirror.features[name]}
              value={usable?.[name] ?? 0}
              target={targets[name]}
            />
          ))}
        </div>
        <p className="mirror-guide__status" role="status" aria-live="polite">
          {hold.isHeld ? copy.mirror.good : null}
          {!hold.isHeld && hold.isOnTarget ? copy.mirror.hold : null}
          {hold.showHint && hint ? hint : null}
        </p>
        {tutor}
      </aside>
    </div>
  );
};
