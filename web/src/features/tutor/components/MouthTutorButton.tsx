'use client';

import type { ReactElement } from 'react';

import { TutorPanel } from '@/features/tutor/components/TutorPanel';
import { useTutorAvailability } from '@/features/tutor/hooks/useTutorAvailability';
import { askMouth } from '@/features/tutor/services/tutor.service';
import { useCopy } from '@/hooks/useCopy';
import type { TutorReply } from '@/interfaces/practice.interface';
import type { MouthTracker } from '@/interfaces/tracker.interface';

interface MouthTutorButtonProps {
  tracker: MouthTracker;
  soundIpa: string;
  targetVi: string;
}

/** "Ask the AI about my mouth": one confirmed JPEG of the mouth region, never video. */
export const MouthTutorButton = ({
  tracker,
  soundIpa,
  targetVi,
}: MouthTutorButtonProps): ReactElement | null => {
  const copy = useCopy();
  const tutor = useTutorAvailability();
  if (!tutor.isAvailable) return null;
  const request = async (): Promise<TutorReply> => {
    const image = await tracker.snapshotMouth();
    if (!image) throw new Error(copy.tutor.noFrame);
    return askMouth({ image, soundIpa, targetVi });
  };
  return (
    <TutorPanel
      title={copy.tutor.mouthTitle}
      buttonLabel={copy.tutor.askMouth}
      request={request}
      confirmLine={copy.tutor.confirm}
    />
  );
};
