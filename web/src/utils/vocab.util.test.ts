import { SRS_NEW_PER_DAY } from '@/constants/srs.constant';
import deckJson from '@/data/content/vocab.json';
import lexiconJson from '@/data/scoring/lexicon.json';
import { ReviewGrade, ReviewMode } from '@/enums/review.enum';
import { VocabKind, VocabReview } from '@/enums/vocab.enum';
import type { AssessmentResponse } from '@/interfaces/practice.interface';
import type { ReviewCard } from '@/interfaces/srs.interface';
import type { VocabDeck, VocabItem } from '@/interfaces/vocab.interface';
import { tokenizeWords } from '@/utils/lexicon.util';
import { newCard, reviewCard } from '@/utils/srs.util';

import {
  clozeOf,
  meaningChoices,
  modesOf,
  planVocab,
  startOfLocalDay,
  targetVerdicts,
  vocabOverview,
} from './vocab.util';

const NOW = new Date('2026-10-23T03:00:00.000Z');
const DAY = 86_400_000;

const item = (id: string, text: string, overrides: Partial<VocabItem> = {}): VocabItem => ({
  id,
  kind: VocabKind.Word,
  text,
  ipa: '',
  pos: 'noun',
  meaning_vi: `nghĩa ${text}`,
  example: { en: `I like the ${text} here.`, vi: 'ví dụ' },
  units: ['u01'],
  level: 1,
  review: VocabReview.Draft,
  ...overrides,
});

const answered = (card: ReviewCard, days: number[]): ReviewCard =>
  days.reduce(
    (current, day) =>
      reviewCard({ card: current, grade: ReviewGrade.Good, now: new Date(NOW.getTime() + day) })
        .card,
    card,
  );

describe('clozeOf / modesOf', () => {
  it('cuts the item out of its example, whole words only, any case', () => {
    expect(clozeOf(item('w.cup', 'cup'))).toEqual({ before: 'I like the ', after: ' here.' });
    expect(
      clozeOf(item('w.today', 'today', { example: { en: 'Today I begin.', vi: '' } })),
    ).toEqual({ before: '', after: ' I begin.' });
    expect(clozeOf(item('w.cat', 'cat', { example: { en: 'The cats sleep.', vi: '' } }))).toBe(
      null,
    );
  });

  it('skips the gap card when the example is the chunk itself', () => {
    const line = item('c.and-then', 'And then?', {
      kind: VocabKind.Chunk,
      example: { en: 'And then?', vi: 'Rồi sao nữa?' },
    });
    expect(modesOf(line)).toEqual([ReviewMode.Listen, ReviewMode.Speak]);
    expect(modesOf(item('w.cup', 'cup'))).toEqual([
      ReviewMode.Listen,
      ReviewMode.Speak,
      ReviewMode.Cloze,
    ]);
  });
});

describe('planVocab', () => {
  const items = Array.from({ length: 30 }, (_, index) =>
    item(`w.i${String(index)}`, `w${String(index)}`),
  );

  it('starts with new listening cards in course order, capped per day', () => {
    const plan = planVocab({ items, cards: [], profileId: 'default', now: NOW });
    expect(plan.due).toBe(0);
    expect(plan.fresh).toBe(SRS_NEW_PER_DAY);
    expect(plan.turns[0]?.item.id).toBe('w.i0');
    expect(plan.turns.every((turn) => turn.card.mode === ReviewMode.Listen && turn.isNew)).toBe(
      true,
    );
  });

  it('puts due reviews first and counts cards made today against the new allowance', () => {
    const today = newCard({ profileId: 'default', itemId: 'w.i0', mode: ReviewMode.Listen }, NOW);
    const learnt = reviewCard({ card: today, grade: ReviewGrade.Again, now: NOW }).card;
    const plan = planVocab({
      items,
      cards: [learnt],
      profileId: 'default',
      now: new Date(NOW.getTime() + 10 * 60_000),
    });
    expect(plan.turns[0]).toMatchObject({ isNew: false, item: { id: 'w.i0' } });
    expect(plan.due).toBe(1);
    expect(plan.fresh).toBe(SRS_NEW_PER_DAY - 1);
    expect(plan.turns[1]?.item.id).toBe('w.i1');
  });

  it('opens speaking once listening is stable, before any new item', () => {
    const start = new Date(NOW.getTime() - 40 * DAY);
    const listen = newCard(
      { profileId: 'default', itemId: 'w.i5', mode: ReviewMode.Listen },
      start,
    );
    const stable = answered(listen, [-40 * DAY, -39 * DAY, -30 * DAY]);
    const plan = planVocab({ items, cards: [stable], profileId: 'default', now: NOW });
    const firstNew = plan.turns.find((turn) => turn.isNew);
    expect(firstNew).toMatchObject({ item: { id: 'w.i5' }, card: { mode: ReviewMode.Speak } });
  });

  it('ignores cards of other decks and pauses new cards on a backlog', () => {
    const old = new Date(NOW.getTime() - 30 * DAY);
    const learnt = (itemId: string): ReviewCard =>
      reviewCard({
        card: newCard({ profileId: 'p', itemId, mode: ReviewMode.Listen }, old),
        grade: ReviewGrade.Good,
        now: old,
      }).card;
    const others = Array.from({ length: 101 }, (_, index) => learnt(`gone${String(index)}`));
    expect(planVocab({ items, cards: others, profileId: 'p', now: NOW })).toMatchObject({
      due: 0,
      newPaused: false,
    });
    const deck = Array.from({ length: 101 }, (_, index) => item(`w.${String(index)}`, 'x'));
    const plan = planVocab({
      items: deck,
      cards: deck.map((entry) => learnt(entry.id)),
      profileId: 'p',
      now: NOW,
    });
    expect(plan).toMatchObject({ due: 101, fresh: 0, newPaused: true });
  });
});

describe('vocabOverview', () => {
  it('counts started and remembered items of the deck only', () => {
    const items = [item('w.a', 'a'), item('w.b', 'b')];
    const learnt = answered(
      newCard({ profileId: 'p', itemId: 'w.a', mode: ReviewMode.Listen }, NOW),
      [0, DAY, 5 * DAY],
    );
    const overview = vocabOverview({
      items,
      cards: [learnt],
      profileId: 'p',
      now: new Date(NOW.getTime() + 5 * DAY + 60_000),
    });
    expect(overview).toMatchObject({ started: 1, remembered: 1, total: 2 });
  });
});

describe('meaningChoices', () => {
  it('offers the meaning and three others of the same kind, stably', () => {
    const items = [
      item('w.a', 'a'),
      item('w.b', 'b'),
      item('w.c', 'c'),
      item('w.d', 'd'),
      item('w.e', 'e'),
      item('c.x', 'x y', { kind: VocabKind.Chunk }),
    ];
    const choices = meaningChoices(items[0] as VocabItem, items);
    expect(choices).toHaveLength(4);
    expect(choices).toContain('nghĩa a');
    expect(choices).not.toContain('nghĩa x y');
    expect(meaningChoices(items[0] as VocabItem, items)).toEqual(choices);
  });
});

describe('targetVerdicts', () => {
  const take = {
    words: [
      { word: 'turn', ipa: '', phones: [{ verdict: 'ok' }] },
      { word: 'it', ipa: '', phones: [{ verdict: 'check' }] },
      { word: 'on', ipa: '', phones: [{ verdict: 'ok' }, { verdict: 'error' }] },
    ],
  } as unknown as AssessmentResponse;

  it('returns the phones of the target words only', () => {
    expect(targetVerdicts(take, 'it on')).toEqual(['check', 'ok', 'error']);
    expect(targetVerdicts(take, 'Turn')).toEqual(['ok']);
    expect(targetVerdicts(take, 'off')).toEqual([]);
  });
});

it('starts the local day at midnight', () => {
  expect(startOfLocalDay(new Date(2026, 9, 23, 15, 30)).getHours()).toBe(0);
});

describe('bundled deck (content/vocab.json)', () => {
  const deck = deckJson as unknown as VocabDeck;
  const lexicon = lexiconJson as Record<string, unknown>;

  it('has unique, complete items', () => {
    const ids = deck.items.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const entry of deck.items) {
      expect(entry.meaning_vi.trim(), entry.id).not.toBe('');
      expect(entry.example.en.trim(), entry.id).not.toBe('');
      expect(Object.values(VocabKind)).toContain(entry.kind);
      expect(Object.values(VocabReview)).toContain(entry.review);
    }
  });

  it('can score every word it asks the learner to say', () => {
    const unknown = deck.items
      .flatMap((entry) => [...tokenizeWords(entry.text), ...tokenizeWords(entry.example.en)])
      .filter((word) => !(word in lexicon));
    expect(unknown).toEqual([]);
  });

  it('gives every single word a gap card', () => {
    const words = deck.items.filter((entry) => entry.kind === VocabKind.Word);
    expect(words.filter((entry) => clozeOf(entry) === null).map((entry) => entry.id)).toEqual([]);
  });
});
