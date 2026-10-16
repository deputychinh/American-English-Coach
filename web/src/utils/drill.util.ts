import { Verdict } from '@/api/coach.schema';
import type {
  AssessmentResponse,
  DrillItem,
  DrillTally,
  PracticeItem,
  SoundDrill,
} from '@/interfaces/practice.interface';
import { sentenceKind } from '@/utils/practice-item.util';

const SEVERITY: Record<Verdict, number> = {
  [Verdict.ok]: 0,
  [Verdict.check]: 1,
  [Verdict.error]: 2,
};

/** `AH1,AH2` → AH; `IH R` → IH: the chart maps a sound to its first ARPAbet phone. */
export const targetPhoneOf = (arpabet: string): string =>
  (arpabet.split(',')[0] ?? '')
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[0-2]$/, '') ?? '';

export const emptyTally = (): DrillTally => ({
  ok: 0,
  check: 0,
  error: 0,
  skipped: 0,
  failedIds: [],
});

/** Words first, then both words of every pair, then the sentences. */
export const buildDrillItems = (drill: SoundDrill): DrillItem[] => {
  const focus = [targetPhoneOf(drill.arpabet)];
  const label = `/${drill.us}/`;
  const words: DrillItem[] = drill.words.map(({ word }) => ({
    stage: 'word',
    item: {
      id: `sound:${drill.id}:word:${word}`,
      text: word,
      kind: 'word',
      title: `${label} · ${word}`,
      focus,
    },
  }));
  const pairs: DrillItem[] = drill.pairs.flatMap((pair) =>
    pair.map((word, index): DrillItem => ({
      stage: 'pair',
      item: {
        id: `sound:${drill.id}:pair:${pair.join('-')}:${String(index)}`,
        text: word,
        kind: 'word',
        title: `${label} · ${pair.join(' / ')}`,
        focus,
      },
    })),
  );
  const sentences: DrillItem[] = drill.sentences.map((sentence, index) => ({
    stage: 'sentence',
    item: {
      id: `sound:${drill.id}:sentence:${String(index + 1)}`,
      text: sentence.text,
      kind: sentenceKind(sentence.kind),
      title: `${label} · câu ${String(index + 1)}`,
      focus,
    },
  }));
  return [...words, ...pairs, ...sentences];
};

/** Worst verdict among the phones of the target symbol; `null` when the word lacks it. */
export const targetVerdict = (result: AssessmentResponse, symbol: string): Verdict | null => {
  let worst: Verdict | null = null;
  for (const word of result.words) {
    for (const phone of word.phones) {
      if (phone.symbol !== symbol) continue;
      if (worst === null || SEVERITY[phone.verdict] > SEVERITY[worst]) worst = phone.verdict;
    }
  }
  return worst;
};

/** Adds one outcome to the tally; a `null` verdict counts as skipped. */
export const addToTally = (
  tally: DrillTally,
  item: PracticeItem,
  verdict: Verdict | null,
): DrillTally => {
  if (verdict === null) return { ...tally, skipped: tally.skipped + 1 };
  const failed = verdict === Verdict.ok ? tally.failedIds : [...tally.failedIds, item.id];
  return { ...tally, [verdict]: tally[verdict] + 1, failedIds: failed };
};
