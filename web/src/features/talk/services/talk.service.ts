import type { TalkDeck, TalkState } from '@/interfaces/talk.interface';
import { activeProfileId } from '@/utils/api-base.util';
import { reviewStore } from '@/utils/local-store.util';
import { planTalkUnit, talkItems, talkOverview } from '@/utils/talk.util';

/**
 * Functional phrases and spoken patterns on the device: the bundled deck (content/talk.json)
 * and the active profile's cards. Scoring a take goes through the usual assessment service.
 */

let deck: Promise<TalkDeck> | null = null;

export const loadTalkDeck = (): Promise<TalkDeck> => {
  deck ??= import('@/data/content/talk.json').then(
    (module) => module.default as unknown as TalkDeck,
  );
  return deck;
};

/** The deck, the active profile's cards, what to study now and, if asked, one unit's items. */
export const loadTalkState = async (
  unitId: string | null,
  now = new Date(),
): Promise<TalkState> => {
  const profileId = activeProfileId();
  const [talk, cards] = await Promise.all([loadTalkDeck(), reviewStore().listCards(profileId)]);
  const items = talkItems(talk);
  const input = { items, cards, profileId, now };
  return {
    items,
    overview: talkOverview(input),
    unitTurns: unitId ? planTalkUnit(input, unitId) : null,
  };
};
