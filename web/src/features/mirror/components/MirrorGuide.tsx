'use client';

import { type ReactElement, type ReactNode, useMemo } from 'react';

import { FeatureBar } from '@/components/FeatureBar/FeatureBar';
import { COPY } from '@/constants/copy.constant';
import { FEATURE_NAMES } from '@/constants/mirror.constant';
import { TargetShape } from '@/features/mirror/components/TargetShape';
import { useSuccessChime } from '@/features/mirror/hooks/useSuccessChime';
import { useTargetHold } from '@/features/mirror/hooks/useTargetHold';
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
}

export const MirrorGuide = ({
  sound,
  target,
  features,
  muted,
  camera,
}: MirrorGuideProps): ReactElement => {
  const targets = useMemo(() => (target ? targetsFromApi(target.targets) : {}), [target]);
  const usable = features && features.quality >= 0.5 ? features.features : null;
  const hold = useTargetHold(target ? usable : null, targets, target?.hold_ms ?? 250);
  useSuccessChime(hold.isHeld, muted);
  const hint = usable ? directionHint(usable, targets, COPY.mirror.features) : null;
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
                <p>{target.hint_vi}</p>
                <p className="mirror-guide__muted">
                  {COPY.mirror.commonError}: {target.common_error_vi}
                </p>
              </>
            ) : (
              <p>{COPY.mirror.audioOnly}</p>
            )}
          </div>
        </div>
        <div className="mirror-guide__bars">
          {shownFeatures.map((name) => (
            <FeatureBar
              key={name}
              label={COPY.mirror.features[name]}
              value={usable?.[name] ?? 0}
              target={targets[name]}
            />
          ))}
        </div>
        <p className="mirror-guide__status" role="status" aria-live="polite">
          {hold.isHeld ? COPY.mirror.good : null}
          {!hold.isHeld && hold.isOnTarget ? COPY.mirror.hold : null}
          {hold.showHint && hint ? hint : null}
        </p>
      </aside>
    </div>
  );
};
