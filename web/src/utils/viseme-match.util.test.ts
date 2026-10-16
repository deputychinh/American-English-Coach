import type { MouthFeatures } from '@/interfaces/mouth.interface';

import { directionHint, offTargetFeatures, targetsFromApi } from './viseme-match.util';

const labels = {
  aperture: 'Độ mở môi',
  width: 'Độ rộng miệng',
  roundness: 'Độ tròn môi',
  jaw: 'Độ mở hàm',
  lipClosed: 'Môi khép',
  lowerLipTuck: 'Môi dưới chạm răng',
  teethVisible: 'răng',
  tongueVisible: 'lưỡi',
};
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

  it('lists off-target features and the first direction hint', () => {
    expect(offTargetFeatures(features, targets)).toEqual(['roundness', 'width']);
    expect(directionHint(features, targets, labels)).toBe('Độ tròn môi: tăng ↑');
    const round = { ...features, roundness: 0.9, width: 0.3 };
    expect(offTargetFeatures(round, targets)).toEqual([]);
    expect(directionHint(round, targets, labels)).toBeNull();
    expect(directionHint({ ...features, roundness: 0.9 }, targets, labels)).toBe(
      'Độ rộng miệng: giảm ↓',
    );
  });
});
