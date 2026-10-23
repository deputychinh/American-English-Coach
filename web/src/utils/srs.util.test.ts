import {
  SRS_BACKLOG_PAUSE,
  SRS_DEFAULT_RETENTION,
  SRS_NEW_PER_DAY,
} from '@/constants/srs.constant';
import { CardPhase, ReviewGrade, ReviewMode } from '@/enums/review.enum';
import type { ReviewCard } from '@/interfaces/srs.interface';

import {
  buildSession,
  cardId,
  clampRetention,
  gradeFromVerdicts,
  isDue,
  modesToOpen,
  newCard,
  recall,
  rememberedItems,
  reviewCard,
} from './srs.util';

const START = new Date('2026-10-23T01:00:00.000Z');
const DAY_MS = 86_400_000;
const later = (from: Date, days: number): Date => new Date(from.getTime() + days * DAY_MS);

const card = (itemId = 'w.cafe.latte', mode = ReviewMode.Listen): ReviewCard =>
  newCard({ profileId: 'p1', itemId, mode }, START);

/** Answers each review at its due time and returns the card after the last one. */
const answerOnTime = (
  start: ReviewCard,
  grades: ReviewGrade[],
  retention = SRS_DEFAULT_RETENTION,
): ReviewCard => {
  let current = start;
  let now = START;
  for (const grade of grades) {
    current = reviewCard({ card: current, grade, now, retention }).card;
    now = new Date(current.due);
  }
  return current;
};

const reviewState = (stability: number, mode = ReviewMode.Listen, itemId = 'w.a'): ReviewCard => ({
  ...card(itemId, mode),
  phase: CardPhase.Review,
  stability,
  difficulty: 5,
  reps: 3,
  scheduledDays: Math.round(stability),
  lastReview: START.toISOString(),
  due: later(START, Math.round(stability)).toISOString(),
});

describe('srs', () => {
  it('creates a new card that is due at once and keyed by item and mode', () => {
    const fresh = card();
    expect(fresh.id).toBe(cardId('w.cafe.latte', ReviewMode.Listen));
    expect(fresh.id).toBe('w.cafe.latte#listen');
    expect([fresh.phase, fresh.reps, fresh.lapses, fresh.lastReview]).toEqual([
      CardPhase.New,
      0,
      0,
      null,
    ]);
    expect(fresh.due).toBe(START.toISOString());
    expect(fresh.createdAt).toBe(START.toISOString());
  });

  it('keeps a forgotten new card within the same day and an easy one for days', () => {
    const forgotten = reviewCard({ card: card(), grade: ReviewGrade.Again, now: START }).card;
    expect(forgotten.phase).toBe(CardPhase.Learning);
    expect(Date.parse(forgotten.due) - START.getTime()).toBeLessThan(DAY_MS);

    const easy = reviewCard({ card: card(), grade: ReviewGrade.Easy, now: START }).card;
    expect(easy.phase).toBe(CardPhase.Review);
    expect(easy.scheduledDays).toBeGreaterThanOrEqual(1);
  });

  it('spaces reviews further apart after each on-time Good', () => {
    const graduated = answerOnTime(card(), [ReviewGrade.Good, ReviewGrade.Good]);
    expect(graduated.phase).toBe(CardPhase.Review);
    const next = reviewCard({
      card: graduated,
      grade: ReviewGrade.Good,
      now: new Date(graduated.due),
    }).card;
    expect(next.scheduledDays).toBeGreaterThan(graduated.scheduledDays);
    expect(next.stability).toBeGreaterThan(graduated.stability);
  });

  it('counts a lapse and relearns when a review card is forgotten', () => {
    const graduated = answerOnTime(card(), [ReviewGrade.Good, ReviewGrade.Good]);
    const lapsed = reviewCard({
      card: graduated,
      grade: ReviewGrade.Again,
      now: new Date(graduated.due),
    }).card;
    expect([lapsed.phase, lapsed.lapses]).toEqual([CardPhase.Relearning, 1]);
  });

  it('records the answer with the due time it replaced', () => {
    const fresh = card();
    const { card: next, event } = reviewCard({ card: fresh, grade: ReviewGrade.Good, now: START });
    expect(event).toEqual({
      id: `${fresh.id}@${START.toISOString()}`,
      cardId: fresh.id,
      profileId: 'p1',
      grade: ReviewGrade.Good,
      reviewedAt: START.toISOString(),
      dueBefore: fresh.due,
      scheduledDays: next.scheduledDays,
    });
    expect(next.lastReview).toBe(START.toISOString());
  });

  it('schedules sooner when the learner asks for higher retention', () => {
    const grades = [ReviewGrade.Good, ReviewGrade.Good, ReviewGrade.Good, ReviewGrade.Good];
    const strict = answerOnTime(card(), grades, 0.95);
    const relaxed = answerOnTime(card(), grades, 0.85);
    expect(strict.scheduledDays).toBeLessThan(relaxed.scheduledDays);
  });

  it('keeps retention inside the supported range', () => {
    expect(clampRetention(0.5)).toBe(0.85);
    expect(clampRetention(0.99)).toBe(0.95);
    expect(clampRetention(0.9)).toBe(0.9);
  });

  it('survives a JSON round trip as stored in IndexedDB', () => {
    const reviewed = answerOnTime(card(), [ReviewGrade.Good, ReviewGrade.Good]);
    const stored = JSON.parse(JSON.stringify(reviewed)) as ReviewCard;
    const when = new Date(reviewed.due);
    expect(reviewCard({ card: stored, grade: ReviewGrade.Good, now: when })).toEqual(
      reviewCard({ card: reviewed, grade: ReviewGrade.Good, now: when }),
    );
  });

  it('estimates recall that falls with time and is zero before the first review', () => {
    expect(recall(card(), START)).toBe(0);
    const reviewed = answerOnTime(card(), [ReviewGrade.Good, ReviewGrade.Good]);
    const lastReview = new Date(reviewed.lastReview ?? '');
    const soon = recall(reviewed, lastReview);
    const atDue = recall(reviewed, new Date(reviewed.due));
    const muchLater = recall(reviewed, later(lastReview, 365));
    expect(soon).toBeGreaterThan(atDue);
    expect(atDue).toBeGreaterThan(muchLater);
    expect(atDue).toBeCloseTo(0.9, 1);
  });

  it('treats only reviewed cards past their due time as due', () => {
    const reviewed = reviewState(4);
    expect(isDue(card(), later(START, 30))).toBe(false);
    expect(isDue(reviewed, later(START, 3))).toBe(false);
    expect(isDue(reviewed, later(START, 4))).toBe(true);
  });

  describe('buildSession', () => {
    const limits = { newPerDay: 2, newIntroducedToday: 0, backlogPause: SRS_BACKLOG_PAUSE };

    it('puts the most overdue reviews first, then new cards up to the daily limit', () => {
      const overdue = reviewState(1, ReviewMode.Listen, 'w.b');
      const recent = reviewState(3, ReviewMode.Listen, 'w.a');
      const notYet = reviewState(30, ReviewMode.Listen, 'w.c');
      const fresh = ['w.x', 'w.y', 'w.z'].map((id) => card(id));
      const session = buildSession([recent, notYet, ...fresh, overdue], later(START, 5), limits);
      expect(session.due.map((c) => c.itemId)).toEqual(['w.b', 'w.a']);
      expect(session.fresh.map((c) => c.itemId)).toEqual(['w.x', 'w.y']);
      expect(session.newPaused).toBe(false);
    });

    it('counts new cards already introduced today against the limit', () => {
      const fresh = ['w.x', 'w.y'].map((id) => card(id));
      const session = buildSession(fresh, START, { ...limits, newIntroducedToday: 1 });
      expect(session.fresh).toHaveLength(1);
      const spent = buildSession(fresh, START, { ...limits, newIntroducedToday: 5 });
      expect(spent.fresh).toHaveLength(0);
    });

    it('holds back new cards while the review backlog is too large', () => {
      const backlog = Array.from({ length: 4 }, (_, index) =>
        reviewState(1, ReviewMode.Listen, `w.${String(index)}`),
      );
      const session = buildSession([...backlog, card('w.new')], later(START, 2), {
        newPerDay: SRS_NEW_PER_DAY,
        newIntroducedToday: 0,
        backlogPause: 3,
      });
      expect(session.due).toHaveLength(4);
      expect(session.fresh).toEqual([]);
      expect(session.newPaused).toBe(true);
    });
  });

  describe('modesToOpen', () => {
    it('opens listening first for an item with no cards', () => {
      expect(modesToOpen([])).toEqual([ReviewMode.Listen]);
    });

    it('opens speaking only once listening is stable in review', () => {
      expect(modesToOpen([card()])).toEqual([]);
      expect(modesToOpen([reviewState(2)])).toEqual([]);
      expect(modesToOpen([reviewState(3)])).toEqual([ReviewMode.Speak]);
    });

    it('opens the sentence mode after speaking, never twice', () => {
      const listen = reviewState(10);
      const speak = reviewState(5, ReviewMode.Speak);
      expect(modesToOpen([listen, speak])).toEqual([ReviewMode.Cloze]);
      const cloze = reviewState(1, ReviewMode.Cloze);
      expect(modesToOpen([listen, speak, cloze])).toEqual([]);
    });
  });

  describe('gradeFromVerdicts', () => {
    it('grades silence and any error as Again', () => {
      expect(gradeFromVerdicts([])).toBe(ReviewGrade.Again);
      expect(gradeFromVerdicts(['ok', 'error', 'check'])).toBe(ReviewGrade.Again);
    });

    it('grades an unsure phone as Hard, not a lapse', () => {
      expect(gradeFromVerdicts(['ok', 'check'])).toBe(ReviewGrade.Hard);
    });

    it('grades all ok as Good', () => {
      expect(gradeFromVerdicts(['ok', 'ok'])).toBe(ReviewGrade.Good);
    });
  });

  it('lists items whose every reviewed card is still well remembered', () => {
    const now = later(START, 1);
    const strong = reviewState(30, ReviewMode.Listen, 'w.strong');
    const strongSpeak = reviewState(20, ReviewMode.Speak, 'w.strong');
    const weakSpeak = reviewState(0.2, ReviewMode.Speak, 'w.mixed');
    const mixed = reviewState(30, ReviewMode.Listen, 'w.mixed');
    const unseen = card('w.unseen');
    expect(rememberedItems([strong, strongSpeak, weakSpeak, mixed, unseen], now)).toEqual([
      'w.strong',
    ]);
  });
});
