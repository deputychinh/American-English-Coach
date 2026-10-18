import { MatchState } from '@/enums/match-state.enum';
import type { MouthFeatures } from '@/interfaces/mouth.interface';

import {
  cueFor,
  featureVerdicts,
  matchMouth,
  mouthHitRate,
  speakOutcome,
} from './mouth-match.util';

const mouth = (overrides: Partial<MouthFeatures> = {}): MouthFeatures => ({
  aperture: 0.3,
  width: 0.5,
  roundness: 0.5,
  jaw: 0.3,
  lipClosed: 0,
  lowerLipTuck: 0,
  teethVisible: 0,
  tongueVisible: 0,
  ...overrides,
});
const targets = { roundness: { min: 0.6 }, width: { max: 0.45 } };

describe('mouth match', () => {
  it('scores 1 inside the ranges and reports on target', () => {
    const match = matchMouth(mouth({ roundness: 0.8, width: 0.3 }), targets);
    expect(match.score).toBe(1);
    expect(match.state).toBe(MatchState.OnTarget);
    expect(match.worst).toBeNull();
    expect(cueFor(match.worst)).toBeNull();
  });

  it('falls linearly with distance and names the furthest feature', () => {
    const match = matchMouth(mouth({ roundness: 0.475, width: 0.5 }), targets);
    const byName = Object.fromEntries(match.verdicts.map((v) => [v.name, v]));
    expect(byName.roundness?.score).toBeCloseTo(0.5);
    expect(byName.roundness?.direction).toBe('low');
    expect(byName.width?.score).toBeCloseTo(0.8);
    expect(byName.width?.direction).toBe('high');
    expect(match.score).toBeCloseTo(0.65);
    expect(match.state).toBe(MatchState.Close);
    expect(match.worst?.name).toBe('roundness');
    expect(cueFor(match.worst)).toBe('Chu môi tròn hơn');
  });

  it('is far when well outside and never below zero', () => {
    const match = matchMouth(mouth({ roundness: 0, width: 1 }), targets);
    expect(match.score).toBe(0);
    expect(match.state).toBe(MatchState.Far);
    expect(cueFor(match.worst)).toBe('Chu môi tròn hơn');
    expect(cueFor({ name: 'width', value: 1, direction: 'high', score: 0 })).toBe(
      'Thu hẹp miệng lại',
    );
  });

  it('has no face state without features or targets', () => {
    expect(matchMouth(null, targets).state).toBe(MatchState.NoFace);
    expect(matchMouth(mouth(), {}).state).toBe(MatchState.NoFace);
    expect(featureVerdicts(mouth(), {})).toEqual([]);
  });
});

describe('speaking check', () => {
  const frame = (roundness: number, width: number, quality = 1) => ({
    t: 0,
    features: mouth({ roundness, width }),
    quality,
  });

  it('measures the share of usable frames on target', () => {
    const frames = [frame(0.9, 0.3), frame(0.9, 0.3), frame(0.1, 0.9), frame(0.9, 0.3, 0.2)];
    expect(mouthHitRate(frames, targets)).toBeCloseTo(2 / 3);
    expect(mouthHitRate([], targets)).toBeNull();
    expect(mouthHitRate(frames, {})).toBeNull();
  });

  it('passes only with the right sound and, where the camera can see it, the right mouth', () => {
    const judge = (sound: 'ok' | 'check' | null, mouthRate: number | null) =>
      speakOutcome({ sound, mouthRate, canJudgeMouth: true });
    expect(judge('ok', 0.5)).toMatchObject({ kind: 'both', isPass: true });
    expect(judge('ok', null)).toMatchObject({ kind: 'noFace', isPass: false });
    expect(judge('ok', 0.1)).toMatchObject({ kind: 'sound', isPass: false });
    expect(judge('check', 0.8)).toMatchObject({ kind: 'mouth', isPass: false });
    expect(judge(null, 0.1)).toMatchObject({ kind: 'neither', isPass: false });
    expect(speakOutcome({ sound: 'ok', mouthRate: null, canJudgeMouth: false })).toMatchObject({
      kind: 'both',
      isPass: true,
    });
  });
});
