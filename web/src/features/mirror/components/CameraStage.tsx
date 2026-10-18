'use client';

import {
  type CSSProperties,
  type ReactElement,
  type ReactNode,
  useCallback,
  useState,
} from 'react';

import type { VisemeGroup } from '@/api/coach.schema';
import { Icon } from '@/components/Icon/Icon';
import { GHOST_SCALE } from '@/constants/mirror.constant';
import { IconName } from '@/enums/icon-name.enum';
import { TrackerStatus } from '@/enums/tracker-status.enum';
import { TargetShape } from '@/features/mirror/components/TargetShape';
import { useCopy } from '@/hooks/useCopy';
import type { BoxSize } from '@/interfaces/mouth.interface';
import type { MouthTracker } from '@/interfaces/tracker.interface';
import { coverFrame, mouthZoom } from '@/utils/camera-frame.util';
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
  const [stage, setStage] = useState<BoxSize | null>(null);
  const [aspect, setAspect] = useState<number | null>(null);

  const stageRef = useCallback((element: HTMLDivElement | null) => {
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setStage({ width: entry.contentRect.width, height: entry.contentRect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const videoRef = useCallback(
    (element: HTMLVideoElement | null) => {
      attachVideo(element);
      if (!element) return undefined;
      const update = (): void => {
        if (element.videoWidth > 0 && element.videoHeight > 0)
          setAspect(element.videoWidth / element.videoHeight);
      };
      element.addEventListener('loadedmetadata', update);
      element.addEventListener('resize', update);
      // A ref callback that returns a cleanup is no longer called with null, so detach here.
      return () => {
        element.removeEventListener('loadedmetadata', update);
        element.removeEventListener('resize', update);
        attachVideo(null);
      };
    },
    [attachVideo],
  );

  // The frame keeps the camera's aspect ratio and covers the stage, so landmarks and the ghost
  // line up with the picture; the inset preview also zooms onto the mouth once a face is found.
  const frame = stage && aspect ? coverFrame(stage, aspect) : null;
  const zoom =
    isCompact && frame && stage && latest && isFaceVisible
      ? mouthZoom({ outline: latest.outline, stage, frame })
      : null;
  const frameStyle: CSSProperties | undefined = frame
    ? {
        width: `${String(frame.width)}px`,
        height: `${String(frame.height)}px`,
        transform: `translate(-50%, -50%) translate(${String(zoom?.x ?? 0)}px, ${String(zoom?.y ?? 0)}px) scale(${String(zoom?.scale ?? 1)})`,
      }
    : undefined;
  const notice =
    status === TrackerStatus.Loading
      ? copy.mirror.loadingModel
      : isReady && !isFaceVisible
        ? isCompact
          ? copy.mirror.match.noFace
          : copy.mirror.noFace
        : latest && latest.quality < 0.5
          ? copy.mirror.turnStraight
          : null;

  return (
    <div
      ref={stageRef}
      className={cx(
        'camera-stage',
        isCompact && 'camera-stage--compact',
        isOnTarget && 'is-on-target',
        isHeld && 'is-held',
      )}
    >
      <div className={cx('camera-stage__frame', frame && 'is-sized')} style={frameStyle}>
        <video
          ref={videoRef}
          className="camera-stage__video"
          playsInline
          muted
          aria-label="Camera"
        />
        <canvas ref={attachCanvas} className="camera-stage__overlay" aria-hidden="true" />
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
      </div>
      {isReady && !isFaceVisible ? (
        <span className="camera-stage__guide" aria-hidden="true" />
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
