import { Verdict, VisemeGroup } from '@/api/coach.schema';
import type { SoundDrill } from '@/interfaces/practice.interface';
import { assessmentFixture, phone } from '@/test-utils/assessment.fixture';

import {
  addToTally,
  buildDrillItems,
  emptyTally,
  targetPhoneOf,
  targetVerdict,
} from './drill.util';

const drill: SoundDrill = {
  id: 'c09',
  symbol: 'θ',
  us: 'θ',
  arpabet: 'TH',
  group: 'consonant',
  viseme_group: VisemeGroup.V3,
  viseme_confidence: 'medium',
  scorer_reliability: 'high',
  transition_vi: null,
  words: [
    { word: 'think', position: 'initial' },
    { word: 'bath', position: 'final' },
  ],
  pairs: [['think', 'sink']],
  sentences: [{ text: 'I think both teeth hurt.', kind: 'statement' }],
};

describe('drill util', () => {
  it('extracts the target phone from chart patterns', () => {
    expect(targetPhoneOf('TH')).toBe('TH');
    expect(targetPhoneOf('AH1,AH2')).toBe('AH');
    expect(targetPhoneOf('IH R')).toBe('IH');
    expect(targetPhoneOf('AH0')).toBe('AH');
    expect(targetPhoneOf('')).toBe('');
  });

  it('orders words, then pair words, then sentences with stable ids', () => {
    const items = buildDrillItems(drill);
    expect(items.map((entry) => entry.stage)).toEqual(['word', 'word', 'pair', 'pair', 'sentence']);
    expect(items.map((entry) => entry.item.id)).toEqual([
      'sound:c09:word:think',
      'sound:c09:word:bath',
      'sound:c09:pair:think-sink:0',
      'sound:c09:pair:think-sink:1',
      'sound:c09:sentence:1',
    ]);
    expect(items[4]?.item.kind).toBe('statement');
    expect(items[0]?.item.focus).toEqual(['TH']);
    expect(items[2]?.item.title).toBe('/θ/ · think / sink');
  });

  it('takes the worst verdict of the target phone and null when absent', () => {
    const result = assessmentFixture();
    expect(targetVerdict(result, 'TH')).toBe(Verdict.check);
    expect(targetVerdict(result, 'NG')).toBe(Verdict.ok);
    expect(targetVerdict(result, 'K')).toBe(Verdict.error);
    expect(targetVerdict(result, 'ZH')).toBeNull();
    result.words[0]?.phones.push(phone({ symbol: 'TH', verdict: Verdict.error }));
    expect(targetVerdict(result, 'TH')).toBe(Verdict.error);
  });

  it('tallies outcomes and remembers failed items', () => {
    const item = buildDrillItems(drill)[0]!.item;
    let tally = addToTally(emptyTally(), item, Verdict.ok);
    tally = addToTally(tally, item, Verdict.check);
    tally = addToTally(tally, item, null);
    expect(tally).toEqual({ ok: 1, check: 1, error: 0, skipped: 1, failedIds: [item.id] });
  });
});
