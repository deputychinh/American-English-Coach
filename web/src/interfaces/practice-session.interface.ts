import type { ReactNode } from 'react';

import type {
  AssessmentResponse,
  PracticeItem,
  VisemeTargetCard,
} from '@/interfaces/practice.interface';

/** Props of the one-screen practice player (`PracticeSession`). */
export interface PracticeSessionProps {
  item: PracticeItem;
  /** Viseme target of the drill's sound, drawn as ghost lips over the inset camera. */
  targetGroup?: VisemeTargetCard | null;
  targetIpa?: string;
  transitionVi?: string | null;
  onResult?: (result: AssessmentResponse) => void;
  /** Drill navigation (next / skip): in the bar while recording, in the result sheet after. */
  extraActions?: ReactNode;
  /** Drill progress line shown under the top bar, inside the one-screen layout. */
  banner?: ReactNode;
  /** 0..1 position in a drill, drawn as the lesson progress bar. */
  progress?: number;
  /** Swipe left on the prompt to move on (drills); off while recording or scoring. */
  onSwipeNext?: () => void;
  /** Close link: the practice list, or the course from a lesson. */
  closeHref?: string;
}
