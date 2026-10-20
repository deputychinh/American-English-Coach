import {
  CTC_FRAME_SECONDS,
  FINAL_EPENTHESIS_ID,
  FOCUS_LIMIT,
  MIN_FRAME_QUALITY,
  RISE_BY_KIND,
  VISUAL_WINDOW_PAD_SECONDS,
} from '@/constants/scoring.constant';
import type { AssessmentResponse, PhoneResult } from '@/interfaces/practice.interface';
import type {
  AlignedPair,
  AlignmentOp,
  ExpectedPhone,
  LocalAssessmentInput,
  Phone,
  PhoneSegment,
  ScoringData,
  ScoreVerdict,
  VisualVerdict,
  WordPronunciations,
} from '@/interfaces/scoring.interface';
import { alignPhones, substitutionCost } from '@/utils/aligner.util';
import { greedyDecode } from '@/utils/ctc.util';
import { findKnownError, sortErrors } from '@/utils/error-catalog.util';
import { createGopScorer, round3 } from '@/utils/gop.util';
import { pronunciationsFor } from '@/utils/lexicon.util';
import { espeakToArpabet, isVowel, phoneIpa, phonemeClass } from '@/utils/phoneme.util';
import { prosodyTracks } from '@/utils/pitch.util';
import { analyzeProsody } from '@/utils/prosody.util';
import { audioVerdict, fuseVerdicts, isFreeVariant } from '@/utils/score-verdict.util';
import { evaluateViseme, visemeConfidenceOf, visemeGroupOf } from '@/utils/viseme.util';

/**
 * The assessment use case on the device: posteriors → phones → verdicts, fused with mouth
 * frames. A port of backend/app/services/assessment_service.py, checked case by case against it
 * (src/data/scoring/golden.json); prosody against prosody-golden.json.
 */

const expectedFrom = (chosen: Phone[][]): ExpectedPhone[] =>
  chosen.flatMap((phones, wordIndex) =>
    phones.map((phone, position) => ({
      wordIndex,
      phone,
      isFinal: position === phones.length - 1,
    })),
  );

/** Heard symbols attributed to each word (insertions join the current word). */
const heardSpans = (expected: ExpectedPhone[], pairs: AlignedPair[]): Map<number, string[]> => {
  const spans = new Map<number, string[]>();
  let cursor = -1;
  for (const pair of pairs) {
    if (pair.op !== 'insertion') cursor += 1;
    const item = expected[cursor];
    if (cursor < 0 || !item || !pair.actual) continue;
    spans.set(item.wordIndex, [...(spans.get(item.wordIndex) ?? []), pair.actual]);
  }
  return spans;
};

const chooseVariants = (
  words: WordPronunciations[],
  heard: string[],
  data: ScoringData,
): ExpectedPhone[] => {
  const primary = expectedFrom(words.map((word) => word.variants[0] ?? []));
  const spans = heardSpans(
    primary,
    alignPhones(
      primary.map((e) => e.phone.symbol),
      heard,
      data.inventory,
    ),
  );
  const cost = (variant: Phone[], span: string[]): number =>
    alignPhones(
      variant.map((p) => p.symbol),
      span,
      data.inventory,
    ).reduce(
      (sum, p) =>
        sum + (p.expected && p.actual ? substitutionCost(p.expected, p.actual, data.inventory) : 1),
      0,
    );
  const chosen = words.map((word, index) => {
    if (word.variants.length === 1) return word.variants[0] ?? [];
    const span = spans.get(index) ?? [];
    let best = word.variants[0] ?? [];
    let bestCost = cost(best, span);
    for (const variant of word.variants.slice(1)) {
      const value = cost(variant, span);
      if (value < bestCost) {
        best = variant;
        bestCost = value;
      }
    }
    return best;
  });
  return expectedFrom(chosen);
};

const visual = (
  symbol: string,
  segment: PhoneSegment,
  { input, data }: { input: LocalAssessmentInput; data: ScoringData },
): VisualVerdict => {
  if (input.audioStartedAt === null || input.mouthFrames.length === 0) return 'unavailable';
  const start =
    input.audioStartedAt + segment.startFrame * CTC_FRAME_SECONDS - VISUAL_WINDOW_PAD_SECONDS;
  const end =
    input.audioStartedAt + segment.endFrame * CTC_FRAME_SECONDS + VISUAL_WINDOW_PAD_SECONDS;
  const window = input.mouthFrames
    .filter((frame) => start <= frame.t && frame.t <= end && frame.quality >= MIN_FRAME_QUALITY)
    .map((frame) => frame.features);
  return evaluateViseme(symbol, window, data.visemes);
};

/** For each expected phone in order: the heard symbols inserted right after it. */
const insertedAfter = (pairs: AlignedPair[]): string[][] => {
  const after: string[][] = [];
  for (const pair of pairs) {
    if (pair.op !== 'insertion') after.push([]);
    else after.at(-1)?.push(pair.actual);
  }
  return after;
};

/** Stops, fricatives and affricates (after /l r m n ŋ/ native voices have a vowel-like glide). */
const OBSTRUENTS = new Set(['stop', 'fricative', 'affricate']);

/**
 * A vowel heard after a word-final obstruent: the Vietnamese "bookə" (plan B6). The vowel is
 * inserted after the consonant, or sits in its column while the forced alignment still finds it.
 */
const isEpenthesis = (
  item: ExpectedPhone,
  column: { op: AlignmentOp; heard: string; inserted: string[] },
  data: ScoringData,
): boolean => {
  if (!item.isFinal || !OBSTRUENTS.has(phonemeClass(item.phone.symbol, data.inventory) ?? ''))
    return false;
  if (column.op === 'substitution' && isVowel(column.heard, data.inventory)) return true;
  return (
    column.op !== 'deletion' && column.inserted.some((symbol) => isVowel(symbol, data.inventory))
  );
};

const judge = (
  expected: ExpectedPhone[],
  pairs: AlignedPair[],
  context: { segments: PhoneSegment[]; input: LocalAssessmentInput; data: ScoringData },
): PhoneResult[] => {
  const { segments, input, data } = context;
  const errors = sortErrors(data.errors);
  const heardByExpected: [AlignmentOp, string][] = pairs
    .filter((pair) => pair.op !== 'insertion')
    .map((pair) => [pair.op, pair.actual]);
  const inserted = insertedAfter(pairs);
  return expected.map((item, index) => {
    const [op, heard] = heardByExpected[index] ?? ['deletion', ''];
    const segment = segments[index] ?? {
      symbol: item.phone.symbol,
      startFrame: 0,
      endFrame: 0,
      gop: 0,
    };
    const symbol = item.phone.symbol;
    let known = findKnownError(errors, { expected: symbol, heard, op, isFinal: item.isFinal });
    const following = expected[index + 1];
    const previous = expected[index - 1];
    let audio: ScoreVerdict;
    if (
      op === 'substitution' &&
      isFreeVariant({
        expected: symbol,
        heard,
        nextSymbol:
          following && following.wordIndex === item.wordIndex ? following.phone.symbol : null,
        isInitial: !previous || previous.wordIndex !== item.wordIndex,
        isFinal: item.isFinal,
      })
    ) {
      known = null;
      audio = 'ok';
    } else {
      audio = audioVerdict(op, segment.gop, known !== null && data.enabled.includes(known.id));
    }
    if (
      audio === 'ok' &&
      isEpenthesis(item, { op, heard, inserted: inserted[index] ?? [] }, data)
    ) {
      known = errors.find((error) => error.id === FINAL_EPENTHESIS_ID) ?? null;
      audio = known !== null && data.enabled.includes(known.id) ? 'error' : 'check';
    }
    const seen = visual(symbol, segment, { input, data });
    const { verdict, showHint } = fuseVerdicts(
      audio,
      seen,
      visemeConfidenceOf(symbol, data.visemes),
    );
    const group = visemeGroupOf(symbol, data.visemes);
    // Python keeps a known error's empty tip as "" (not None); only a missing error gives null.
    let mouthTip: string | null = known ? (known.mouth_tip_vi ?? '') : null;
    if (showHint && !mouthTip && group !== null)
      mouthTip = data.visemes.groups[group]?.hint_vi ?? null;
    const flagged = known !== null && verdict !== 'ok';
    return {
      symbol,
      ipa: phoneIpa(item.phone, data.inventory),
      verdict,
      audio_verdict: audio,
      visual: seen,
      viseme_group: group,
      gop: segment.gop,
      heard,
      heard_ipa: data.inventory.ipa[heard] ?? (heard ? '?' : ''),
      start: round3(segment.startFrame * CTC_FRAME_SECONDS),
      end: round3(segment.endFrame * CTC_FRAME_SECONDS),
      error_id: flagged ? (known?.id ?? null) : null,
      hint_vi: flagged ? (known?.hint_vi ?? null) : null,
      mouth_tip_vi: showHint || verdict !== 'ok' ? mouthTip : null,
      show_mouth_hint: showHint,
    } as PhoneResult;
  });
};

const focusOf = (
  phones: PhoneResult[],
  data: ScoringData,
): AssessmentResponse['summary']['focus'] => {
  const counts = new Map<string, number>();
  const byId = new Map<string, PhoneResult>();
  for (const phone of phones) {
    if (!phone.error_id) continue;
    counts.set(phone.error_id, (counts.get(phone.error_id) ?? 0) + 1);
    byId.set(phone.error_id, phone);
  }
  const priority = new Map(data.errors.map((error) => [error.id, error.priority]));
  return [...counts.entries()]
    .map(([id, count]) => ({ id, count, phone: byId.get(id) }))
    .sort(
      (a, b) =>
        (String(a.phone?.verdict) === 'error' ? 0 : 1) -
          (String(b.phone?.verdict) === 'error' ? 0 : 1) ||
        (priority.get(a.id) ?? 99) - (priority.get(b.id) ?? 99) ||
        b.count - a.count,
    )
    .slice(0, FOCUS_LIMIT)
    .map(({ id, count, phone }) => ({
      error_id: id,
      phoneme: phone?.symbol ?? '',
      ipa: phone?.ipa ?? '',
      hint_vi: phone?.hint_vi ?? '',
      count,
    }));
};

/** Prosody findings from the take's audio and the aligned vowels (none without audio). */
const prosodyOf = (
  input: LocalAssessmentInput,
  aligned: { expected: ExpectedPhone[]; segments: PhoneSegment[]; words: WordPronunciations[] },
  data: ScoringData,
): AssessmentResponse['prosody'] => {
  if (!input.samples || input.samples.length === 0) return [];
  const nuclei = aligned.expected.flatMap((item, index) => {
    const segment = aligned.segments[index];
    if (!segment || !isVowel(item.phone.symbol, data.inventory)) return [];
    return [
      {
        wordIndex: item.wordIndex,
        stress: item.phone.stress ?? 0,
        start: segment.startFrame * CTC_FRAME_SECONDS,
        end: segment.endFrame * CTC_FRAME_SECONDS,
      },
    ];
  });
  return analyzeProsody(prosodyTracks(input.samples), {
    nuclei,
    words: aligned.words.map((word) => word.word),
    expectedRise: RISE_BY_KIND[input.kind] ?? null,
  }) as AssessmentResponse['prosody'];
};

/** Score one attempt on the device; same response shape as the API's `POST /assess`. */
export const assessLocally = (
  input: LocalAssessmentInput,
  data: ScoringData,
): AssessmentResponse => {
  const blankId = data.vocab['<pad>'] ?? 0;
  const words = pronunciationsFor(data.lexicon, input.text);
  const heard = espeakToArpabet(
    greedyDecode(input.posteriors, data.vocab, blankId),
    data.inventory,
  );
  const expected = chooseVariants(words, heard, data);
  const symbols = expected.map((e) => e.phone.symbol);
  const pairs = alignPhones(symbols, heard, data.inventory);
  const segments = createGopScorer(data.vocab, blankId, data.inventory)(input.posteriors, symbols);
  const phones = judge(expected, pairs, { segments, input, data });
  const count = (verdict: ScoreVerdict): number =>
    phones.filter((p) => String(p.verdict) === verdict).length;
  return {
    id: crypto.randomUUID(),
    item_id: input.itemId,
    text: input.text,
    model_version: input.modelVersion,
    words: words.map((word, index) => {
      const own = phones.filter((_, i) => expected[i]?.wordIndex === index);
      return { word: word.word, ipa: own.map((p) => p.ipa).join(''), phones: own };
    }),
    prosody: prosodyOf(input, { expected, segments, words }, data),
    summary: {
      ok: count('ok'),
      check: count('check'),
      error: count('error'),
      focus: focusOf(phones, data),
      camera_used: phones.some((p) => String(p.visual) !== 'unavailable'),
    },
  };
};
