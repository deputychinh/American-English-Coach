'use client';

import type { ReactElement, ReactNode } from 'react';

import type { VisemeGroup } from '@/api/coach.schema';
import { Icon } from '@/components/Icon/Icon';
import { GHOST_SCALE } from '@/constants/mirror.constant';
import { IconName } from '@/enums/icon-name.enum';
import { TrackerStatus } from '@/enums/tracker-status.enum';
import { TargetShape } from '@/features/mirror/components/TargetShape';
import { useCopy } from '@/hooks/useCopy';
import type { MouthTracker } from '@/interfaces/tracker.interface';
import { cx } from '@/utils/cx.util';
import { ghostPlacement } from '@/utils/ghost-placement.util';

import './CameraStage.css';

interface CameraStageProps {
  tracker: MouthTracker;
  /** Viseme group whose schematic lips are drawn over the learner's mouth. */
  ghost?: VisemeGroup | null;
  isOnTarget?: boolean;
  isHeld?: boolean;
  topStart?: ReactNode;
  topEnd?: ReactNode;
  bottom?: ReactNode;
  /** Large instruction over the video (calibration steps). */
  prompt?: string | null;
  /** Small inset preview (practice screen) instead of the full-screen stage. */
  isCompact?: boolean;
}

/** Edge-to-edge mirrored camera with the lip outline, a ghost target and floating controls. */
export const CameraStage = ({
  tracker,
  ghost = null,
  isOnTarget = false,
  isHeld = false,
  topStart = null,
  topEnd = null,
  bottom = null,
  prompt = null,
  isCompact = false,
}: CameraStageProps): ReactElement => {
  const copy = useCopy();
  const { attachVideo, attachCanvas, status, error, latest, isFaceVisible } = tracker;
  const isReady = status === TrackerStatus.Ready;
  const placement = ghost && latest ? ghostPlacement(latest.outline, GHOST_SCALE) : null;
  const notice =
    status === TrackerStatus.Loading
      ? copy.mirror.loadingModel
      : isReady && !isFaceVisible
        ? copy.mirror.noFace
        : latest && latest.quality < 0.5
          ? copy.mirror.turnStraight
          : null;

  return (
    <div
      className={cx(
        'camera-stage',
        isCompact && 'camera-stage--compact',
        isOnTarget && 'is-on-target',
        isHeld && 'is-held',
      )}
    >
      <video
        ref={attachVideo}
        className="camera-stage__video"
        playsInline
        muted
        aria-label="Camera"
      />
      <canvas ref={attachCanvas} className="camera-stage__overlay" aria-hidden="true" />
      {isReady && !isFaceVisible ? (
        <span className="camera-stage__guide" aria-hidden="true" />
      ) : null}
      {placement && ghost ? (
        <div
          className="camera-stage__ghost"
          style={{
            left: `${placement.leftPercent}%`,
            top: `${placement.topPercent}%`,
            width: `${placement.widthPercent}%`,
          }}
          role="img"
          aria-label={copy.mirror.match.ghostAria}
        >
          <TargetShape group={ghost} size={120} className="target-shape--ghost" />
        </div>
      ) : null}
      {topStart || topEnd ? (
        <div className="camera-stage__top">
          <div className="camera-stage__top-start">{topStart}</div>
          <div className="camera-stage__top-end">{topEnd}</div>
        </div>
      ) : null}
      {prompt ? <p className="camera-stage__prompt">{prompt}</p> : null}
      {notice ? (
        <p className="camera-stage__notice" role="status">
          {notice}
        </p>
      ) : null}
      {bottom ? <div className="camera-stage__bottom">{bottom}</div> : null}
      {status === TrackerStatus.Error && error ? (
        <div className="camera-stage__error" role="alert">
          <Icon name={IconName.Camera} className="camera-stage__error-icon" />
          <p className="camera-stage__error-title">{copy.practice.cameraErrorTitle}</p>
          <p className="camera-stage__error-text">{error}</p>
          <button type="button" className="camera-stage__retry" onClick={tracker.retry}>
            {copy.common.retry}
          </button>
        </div>
      ) : null}
    </div>
  );
};
