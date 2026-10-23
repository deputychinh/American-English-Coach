import type { VocabDeck, VocabItem, VocabOverview } from '@/interfaces/vocab.interface';
import { activeProfileId } from '@/utils/api-base.util';
import { reviewStore } from '@/utils/local-store.util';
import { vocabOverview } from '@/utils/vocab.util';

/**
 * Vocabulary review on the device: the bundled deck (content/vocab.json) and the active
 * profile's cards. Nothing here talks to a server.
 */

let deck: Promise<VocabItem[]> | null = null;

export const loadVocab = (): Promise<VocabItem[]> => {
  deck ??= import('@/data/content/vocab.json').then(
    (module) => (module.default as unknown as VocabDeck).items,
  );
  return deck;
};

/** The deck, the active profile's cards and what to study now. */
export const loadVocabState = async (
  now = new Date(),
): Promise<{ items: VocabItem[]; overview: VocabOverview }> => {
  const profileId = activeProfileId();
  const [items, cards] = await Promise.all([loadVocab(), reviewStore().listCards(profileId)]);
  return { items, overview: vocabOverview({ items, cards, profileId, now }) };
};
