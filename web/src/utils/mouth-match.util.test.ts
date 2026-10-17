import { MatchState } from '@/enums/match-state.enum';
import type { MouthFeatures } from '@/interfaces/mouth.interface';

import { cueFor, featureVerdicts, matchMouth } from './mouth-match.util';

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
