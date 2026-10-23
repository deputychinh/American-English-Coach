import { Register } from '@/enums/talk.enum';

/** Functional phrases and spoken patterns (docs/PLAN-V2-SPEAKING-AND-VOCABULARY.md §5). */

/** New talk cards per local day; each is spoken, so fewer than vocabulary cards. */
export const TALK_NEW_PER_DAY = 10;

/** Order in which a function's situations are met and its phrases are listed. */
export const REGISTER_ORDER: readonly Register[] = [
  Register.Casual,
  Register.Neutral,
  Register.Formal,
];
