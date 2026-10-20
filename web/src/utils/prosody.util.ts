import {
  FINAL_WINDOW_SECONDS,
  MIN_NUCLEI_FOR_RHYTHM,
  MIN_SYLLABLES_FOR_STRESS,
  MIN_VOICED_FRAMES,
  PROSODY_FINAL_SEMITONES,
  PROSODY_STRESS_RATIO_MIN,
} from '@/constants/scoring.constant';
import type {
  ProsodyFinding,
  ProsodyTracks,
  SyllableNucleus,
} from '@/interfaces/scoring.interface';
import { median } from '@/utils/viseme.util';

/** Word stress, final contour and rhythm (port of backend/app/domain/prosody.py). */

/** Hz → semitones relative to the voiced median; NaN stays NaN. */
export const semitones = (f0: Float64Array): Float64Array => {
  const voiced = [...f0].filter((value) => !Number.isNaN(value));
  if (voiced.length === 0) return f0;
  const reference = median(voiced);
  return f0.map((value) => 12 * Math.log2(value / reference));
};

/** numpy mean of a slice: NaN when the slice is empty (beyond the track). */
const sliceMean = (values: Float64Array, start: number, end: number): number => {
  const slice = values.subarray(start, Math.min(end, values.length));
  return slice.length === 0 ? Number.NaN : slice.reduce((sum, v) => sum + v, 0) / slice.length;
};

const mean = (values: number[]): number => values.reduce((sum, v) => sum + v, 0) / values.length;

/** numpy argmax: the first maximum, and a NaN counts as the maximum. */
const argmax = (values: number[]): number => {
  const nan = values.findIndex((value) => Number.isNaN(value));
  if (nan >= 0) return nan;
  return values.indexOf(Math.max(...values));
};

/** Python `f"{x:+.1f}"` / `f"{x:.2f}"`. */
const signed1 = (value: number): string =>
  `${value >= 0 || Object.is(value, -0) ? '+' : ''}${value.toFixed(1)}`;

/** Rule-based prosody checks; every finding is at most `check`. */
export const analyzeProsody = (
  tracks: ProsodyTracks,
  {
    nuclei,
    words,
    expectedRise,
  }: { nuclei: SyllableNucleus[]; words: string[]; expectedRise: boolean | null },
): ProsodyFinding[] => {
  const st = semitones(tracks.f0);
  const hop = tracks.hopSeconds;
  const prominence = (nucleus: SyllableNucleus): number => {
    const start = Math.trunc(nucleus.start / hop);
    const end = Math.max(Math.trunc(nucleus.end / hop), 1);
    const energy = end > start ? sliceMean(tracks.rms, start, end) : 0;
    const voiced = [...st.subarray(start, Math.max(start, end))].filter((v) => !Number.isNaN(v));
    const pitch = voiced.length > 0 ? mean(voiced) : 0;
    return (nucleus.end - nucleus.start) * 10 + energy * 20 + pitch * 0.1;
  };
  const findings: ProsodyFinding[] = [];
  words.forEach((word, index) => {
    const syllables = nuclei.filter((n) => n.wordIndex === index);
    if (
      syllables.length < MIN_SYLLABLES_FOR_STRESS ||
      syllables.filter((n) => n.stress === 1).length !== 1
    ) {
      return;
    }
    const expected = syllables.findIndex((n) => n.stress === 1);
    const observed = argmax(syllables.map(prominence));
    findings.push(
      observed === expected
        ? {
            aspect: 'word_stress',
            verdict: 'ok',
            detail_vi: `Trọng âm của '${word}' đúng vị trí.`,
            word_index: index,
          }
        : {
            aspect: 'word_stress',
            verdict: 'check',
            detail_vi:
              `Trọng âm của '${word}' nên rơi vào âm tiết ${String(expected + 1)}, ` +
              `bạn đang nhấn âm tiết ${String(observed + 1)}. Kéo dài và lên giọng ở âm tiết đó.`,
            word_index: index,
          },
    );
  });
  if (expectedRise !== null) {
    const voicedIndex = [...st.keys()].filter((i) => !Number.isNaN(st[i] ?? Number.NaN));
    if (voicedIndex.length >= MIN_VOICED_FRAMES) {
      const window = Math.max(Math.trunc(FINAL_WINDOW_SECONDS / hop), MIN_VOICED_FRAMES);
      const tail = voicedIndex.slice(-window).map((i) => st[i] ?? 0);
      const third = Math.max(Math.floor(tail.length / 3), 1);
      const delta = mean(tail.slice(-third)) - mean(tail.slice(0, third));
      const rises = delta > PROSODY_FINAL_SEMITONES;
      const falls = delta < -PROSODY_FINAL_SEMITONES;
      findings.push(
        (expectedRise && rises) || (!expectedRise && falls)
          ? {
              aspect: 'final_contour',
              verdict: 'ok',
              detail_vi: 'Ngữ điệu cuối câu phù hợp.',
              word_index: null,
            }
          : {
              aspect: 'final_contour',
              verdict: 'check',
              detail_vi: `Cuối câu nên ${expectedRise ? 'lên giọng' : 'xuống giọng'} rõ hơn (thay đổi đo được ${signed1(delta)} bán cung).`,
              word_index: null,
            },
      );
    }
  }
  const stressed = nuclei.filter((n) => n.stress === 1).map((n) => n.end - n.start);
  const unstressed = nuclei.filter((n) => n.stress === 0).map((n) => n.end - n.start);
  if (Math.min(stressed.length, unstressed.length) >= MIN_NUCLEI_FOR_RHYTHM) {
    const ratio = mean(stressed) / Math.max(mean(unstressed), 1e-3);
    findings.push(
      ratio >= PROSODY_STRESS_RATIO_MIN
        ? {
            aspect: 'rhythm',
            verdict: 'ok',
            detail_vi: 'Âm tiết nhấn dài hơn âm tiết không nhấn: nhịp tự nhiên.',
            word_index: null,
          }
        : {
            aspect: 'rhythm',
            verdict: 'check',
            detail_vi: `Các âm tiết đang dài gần bằng nhau (tỷ lệ ${ratio.toFixed(2)}). Kéo dài âm tiết nhấn, đọc nhẹ và ngắn các âm yếu.`,
            word_index: null,
          },
    );
  }
  return findings;
};
