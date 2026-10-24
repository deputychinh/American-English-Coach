import { CHECK_CREDIT } from '@/constants/score.constant';
import { ScoreTone } from '@/enums/score-tone.enum';

/** Share of phones on target, an unsure phone earning half credit. */
export const scorePercent = (ok: number, check: number, total: number): number =>
  total > 0 ? Math.round(((ok + check * CHECK_CREDIT) / total) * 100) : 0;

export const scoreTone = (percent: number): ScoreTone =>
  percent >= 80 ? ScoreTone.Good : percent >= 50 ? ScoreTone.Fair : ScoreTone.Low;
