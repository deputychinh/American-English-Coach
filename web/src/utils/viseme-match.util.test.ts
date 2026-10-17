import type { MouthFeatures } from '@/interfaces/mouth.interface';

import { offTargetFeatures, targetsFromApi } from './viseme-match.util';

const features: MouthFeatures = {
  aperture: 0.3,
  width: 0.8,
  roundness: 0.1,
  jaw: 0.2,
  lipClosed: 0,
  lowerLipTuck: 0,
  teethVisible: 0,
  tongueVisible: 0,
};

describe('viseme match', () => {
  const targets = targetsFromApi({
    roundness: { min: 0.6 },
    width: { max: 0.45 },
    jaw: { max: 0.4 },
  });

  it('lists off-target features', () => {
    expect(offTargetFeatures(features, targets)).toEqual(['roundness', 'width']);
    const round = { ...features, roundness: 0.9, width: 0.3 };
    expect(offTargetFeatures(round, targets)).toEqual([]);
    expect(offTargetFeatures({ ...features, roundness: 0.9 }, targets)).toEqual(['width']);
  });
});
