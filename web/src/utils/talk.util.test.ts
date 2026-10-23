import talkJson from '@/data/content/talk.json';
import lexiconJson from '@/data/scoring/lexicon.json';
import { ReviewGrade, ReviewMode } from '@/enums/review.enum';
import { GrammarEnding, Register, TalkKind } from '@/enums/talk.enum';
import type { AssessmentResponse } from '@/interfaces/practice.interface';
import type { ScoreVerdict } from '@/interfaces/scoring.interface';
import type { PatternDrillItem, SituationItem, TalkDeck } from '@/interfaces/talk.interface';
import { tokenizeWords } from '@/utils/lexicon.util';
import { newCard, reviewCard } from '@/utils/srs.util';

import {
  allVerdicts,
  endingWord,
  gradeSituation,
  gradeTransform,
  planTalk,
  planTalkUnit,
  registerChoices,
  splitAround,
  talkItems,
  talkModesOf,
  talkOverview,
  unitTalk,
} from './talk.util';

const deck = talkJson as unknown as TalkDeck;
const items = talkItems(deck);
const NOW = new Date('2026-10-23T03:00:00.000Z');

/** A scored take: each word with one verdict per phone. */
const take = (words: [string, ScoreVerdict[]][]): AssessmentResponse =>
  ({
    words: words.map(([word, verdicts]) => ({
      word,
      ipa: '',
      phones: verdicts.map((verdict) => ({ verdict })),
    })),
  }) as unknown as AssessmentResponse;

const drillItem = (id: string): PatternDrillItem => {
  const found = items.find((entry) => entry.id === id);
  if (found?.kind !== TalkKind.Drill) throw new Error(id);
  return found;
};

describe('talkItems', () => {
  it('orders the deck by unit, situations before drills', () => {
    expect(items).toHaveLength(12 * 3 + 24 * 4);
    expect(items.slice(0, 7).map((entry) => entry.id)).toEqual([
      'f.greet.casual',
      'f.greet.neutral',
      'f.greet.formal',
      'p.be.1',
      'p.be.2',
      'p.be.3',
      'p.be.4',
    ]);
    const units = items.map((entry) => entry.unit);
    expect(units).toEqual([...units].sort());
  });

  it('asks a situation by register and a drill by transformation', () => {
    expect(talkModesOf(items[0] as SituationItem)).toEqual([ReviewMode.Register]);
    expect(talkModesOf(drillItem('p.be.1'))).toEqual([ReviewMode.Transform]);
  });
});

describe('planTalk', () => {
  it('opens ten new cards a day and keeps vocabulary cards out of the count', () => {
    const vocabCard = newCard({ profileId: 'p', itemId: 'w.today', mode: ReviewMode.Listen }, NOW);
    const plan = planTalk({ items, cards: [vocabCard], profileId: 'p', now: NOW });
    expect(plan.fresh).toBe(10);
    expect(plan.turns[0]?.card.id).toBe('f.greet.casual#register');
    expect(plan.turns[3]?.card.id).toBe('p.be.1#transform');
  });

  it('brings a card back when it is due and counts started items', () => {
    const answered = reviewCard({
      card: newCard({ profileId: 'p', itemId: 'p.be.1', mode: ReviewMode.Transform }, NOW),
      grade: ReviewGrade.Again,
      now: NOW,
    }).card;
    const later = new Date(NOW.getTime() + 86_400_000);
    const overview = talkOverview({ items, cards: [answered], profileId: 'p', now: later });
    expect(overview).toMatchObject({ due: 1, started: 1, total: items.length });
    expect(overview.turns[0]?.item.id).toBe('p.be.1');
  });
});

describe('planTalkUnit', () => {
  it('asks every item of a unit, a function in each unit that teaches it', () => {
    const answered = newCard(
      { profileId: 'p', itemId: 'p.lets.1', mode: ReviewMode.Transform },
      NOW,
    );
    const turns = planTalkUnit({ items, cards: [answered], profileId: 'p', now: NOW }, 'u07');
    expect(turns.map((turn) => turn.item.id)).toEqual([
      'f.invite.casual',
      'f.invite.neutral',
      'f.invite.formal',
      'p.lets.1',
      'p.lets.2',
      'p.lets.3',
      'p.lets.4',
    ]);
    expect(turns[3]).toMatchObject({ card: answered, isNew: false });
    expect(turns[0]).toMatchObject({ isNew: true });
    expect(planTalkUnit({ items, cards: [], profileId: 'p', now: NOW }, 'u21')).toHaveLength(7);
  });

  it('lists a unit for the unit page', () => {
    const unit = unitTalk(deck, 'u06');
    expect(unit.functions.map((fn) => fn.id)).toEqual(['f.complain']);
    expect(unit.pattern?.ending).toBe(GrammarEnding.S);
    expect(unitTalk(deck, 'u99')).toEqual({ functions: [], pattern: null });
  });
});

describe('grading', () => {
  it('grades the register pick; a pronunciation slip only makes it hard', () => {
    expect(gradeSituation(false, ['ok'])).toBe(ReviewGrade.Again);
    expect(gradeSituation(true, null)).toBe(ReviewGrade.Good);
    expect(gradeSituation(true, ['ok', 'ok'])).toBe(ReviewGrade.Good);
    expect(gradeSituation(true, ['ok', 'error'])).toBe(ReviewGrade.Hard);
    expect(
      allVerdicts(
        take([
          ['hi', ['ok']],
          ['there', ['check', 'ok']],
        ]),
      ),
    ).toEqual(['ok', 'check', 'ok']);
  });

  it('catches a dropped -ed on the target word', () => {
    const item = drillItem('p.past-ed.1');
    const said = (ending: ScoreVerdict): AssessmentResponse =>
      take([
        ['i', ['ok']],
        ['worked', ['ok', 'ok', 'ok', ending]],
        ['until', ['ok']],
      ]);
    expect(gradeTransform(said('ok'), item)).toEqual({ grade: ReviewGrade.Good, ending: 'ok' });
    expect(gradeTransform(said('check'), item)).toEqual({
      grade: ReviewGrade.Hard,
      ending: 'check',
    });
    expect(gradeTransform(said('error'), item)).toEqual({
      grade: ReviewGrade.Again,
      ending: 'error',
    });
    expect(gradeTransform(take([['i', ['ok']]]), item)).toEqual({
      grade: ReviewGrade.Again,
      ending: 'error',
    });
  });

  it('checks no ending on patterns without one', () => {
    const item = drillItem('p.be.1');
    expect(
      gradeTransform(
        take([
          ['she', ['ok']],
          ['is', ['ok', 'ok']],
        ]),
        item,
      ),
    ).toEqual({
      grade: ReviewGrade.Good,
      ending: null,
    });
  });
});

describe('helpers', () => {
  it('shuffles the three registers the same way every time', () => {
    const item = items[0] as SituationItem;
    expect([...registerChoices(item)].sort()).toEqual(
      [Register.Casual, Register.Formal, Register.Neutral].sort(),
    );
    expect(registerChoices(item)).toEqual(registerChoices(item));
  });

  it('finds the target in the answer, whole words only', () => {
    expect(splitAround('Could I have a coffee, please?', 'could i have')).toEqual({
      before: '',
      match: 'Could I have',
      after: ' a coffee, please?',
    });
    expect(splitAround('The cats sleep.', 'cat')).toBeNull();
    expect(endingWord('going to visit')).toBe('visit');
  });
});

describe('bundled deck (content/talk.json)', () => {
  const lexicon = lexiconJson as Record<string, unknown>;

  it('can score every sentence the learner says', () => {
    const spoken = [
      ...deck.functions.flatMap((fn) => Object.values(fn.phrases).map((phrase) => phrase.en)),
      ...deck.patterns.flatMap((pattern) => pattern.drills.map((drill) => drill.answer)),
    ];
    expect(spoken.flatMap(tokenizeWords).filter((word) => !(word in lexicon))).toEqual([]);
  });

  it('highlights every target inside its answer', () => {
    const drills = deck.patterns.flatMap((pattern) => pattern.drills);
    expect(drills.filter((drill) => !splitAround(drill.answer, drill.target))).toEqual([]);
  });
});
