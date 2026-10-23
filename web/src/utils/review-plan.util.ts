import { SRS_BACKLOG_PAUSE } from '@/constants/srs.constant';
import type {
  ReviewCard,
  ReviewPlan,
  ReviewPlanInput,
  ReviewTurn,
} from '@/interfaces/srs.interface';
import { buildSession, modesToOpen, newCard } from '@/utils/srs.util';

/** A study session for any deck on top of the FSRS core (plan v2 §4.3). */

/** Local midnight of the day containing `now`. */
export const startOfLocalDay = (now: Date): Date => {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start;
};

const cardsByItem = (cards: readonly ReviewCard[]): Map<string, ReviewCard[]> => {
  const grouped = new Map<string, ReviewCard[]>();
  for (const card of cards) grouped.set(card.itemId, [...(grouped.get(card.itemId) ?? []), card]);
  return grouped;
};

/**
 * What to study now: due reviews (most overdue first), then new cards up to today's allowance.
 * Only the deck's own cards count, so each deck keeps its own daily allowance. A card is
 * stored only once answered, so new cards are made here: first the next mode of items already
 * started, then the next items in deck order.
 */
export const planReviews = <T extends { id: string }>({
  items,
  cards: allCards,
  profileId,
  now,
  modesOf,
  newPerDay,
}: ReviewPlanInput<T>): ReviewPlan<T> => {
  const byId = new Map(items.map((item) => [item.id, item]));
  const cards = allCards.filter((card) => byId.has(card.itemId));
  const dayStart = startOfLocalDay(now).getTime();
  const introducedToday = cards.filter((card) => Date.parse(card.createdAt) >= dayStart).length;
  const session = buildSession(cards, now, {
    newPerDay,
    newIntroducedToday: introducedToday,
    backlogPause: SRS_BACKLOG_PAUSE,
  });
  const allowance = session.newPaused ? 0 : Math.max(0, newPerDay - introducedToday);
  const grouped = cardsByItem(cards);
  const fresh: ReviewTurn<T>[] = [];
  const open = (item: T, itemCards: readonly ReviewCard[]): void => {
    for (const mode of modesToOpen(itemCards, modesOf(item))) {
      if (fresh.length >= allowance) return;
      fresh.push({ item, card: newCard({ profileId, itemId: item.id, mode }, now), isNew: true });
    }
  };
  for (const item of items) {
    const itemCards = grouped.get(item.id);
    if (itemCards) open(item, itemCards);
  }
  for (const item of items) {
    if (!grouped.has(item.id)) open(item, []);
  }
  const due = session.due.flatMap((card) => {
    const item = byId.get(card.itemId);
    return item ? [{ item, card, isNew: false }] : [];
  });
  return {
    turns: [...due, ...fresh],
    due: due.length,
    fresh: fresh.length,
    newPaused: session.newPaused,
  };
};
