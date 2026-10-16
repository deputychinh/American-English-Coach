'use client';

import type { ReactElement } from 'react';

import { ErrorState } from '@/components/ErrorState/ErrorState';
import { COPY } from '@/constants/copy.constant';
import { TrackerStatus } from '@/enums/tracker-status.enum';
import type { MouthTracker } from '@/interfaces/tracker.interface';
import { cx } from '@/utils/cx.util';

import './CameraPanel.css';

interface CameraPanelProps {
  tracker: MouthTracker;
  compact?: boolean;
  isOnTarget?: boolean;
}

/** Mirrored video with the lip outline drawn on top; video pixels never leave this element. */
export const CameraPanel = ({
  tracker,
  compact = false,
  isOnTarget = false,
}: CameraPanelProps): ReactElement => {
  // Destructured so the lint's ref tracking applies to the two callback refs only.
  const { attachVideo, attachCanvas, status, error, latest, fps, isFaceVisible } = tracker;
  return (
    <div
      className={cx(
        'camera-panel',
        compact && 'camera-panel--compact',
        isOnTarget && 'is-on-target',
      )}
    >
      <div className="camera-panel__frame">
        <video
          ref={attachVideo}
          className="camera-panel__video"
          playsInline
          muted
          aria-label="Camera"
        />
        <canvas ref={attachCanvas} className="camera-panel__overlay" aria-hidden="true" />
        {status === TrackerStatus.Loading ? (
          <p className="camera-panel__notice" role="status">
            {COPY.mirror.loadingModel}
          </p>
        ) : null}
        {status === TrackerStatus.Ready && !isFaceVisible ? (
          <p className="camera-panel__notice" role="status">
            {COPY.mirror.noFace}
          </p>
        ) : null}
        {latest && latest.quality < 0.5 ? (
          <p className="camera-panel__notice" role="status">
            {COPY.mirror.turnStraight}
          </p>
        ) : null}
      </div>
      <p className="camera-panel__meta">{fps > 0 ? `${String(fps)} ${COPY.mirror.fps}` : ''}</p>
      {status === TrackerStatus.Error && error ? <ErrorState message={error} /> : null}
    </div>
  );
};
