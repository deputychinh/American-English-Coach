import { ghostPlacement } from './ghost-placement.util';

describe('ghostPlacement', () => {
  it('centres on the mouth, mirrors x and widens by the scale', () => {
    const outline = [
      { x: 0.4, y: 0.6 },
      { x: 0.6, y: 0.6 },
      { x: 0.5, y: 0.7 },
      { x: 0.5, y: 0.5 },
    ];
    const box = ghostPlacement(outline, 1.54);
    expect(box?.leftPercent).toBeCloseTo(50);
    expect(box?.topPercent).toBeCloseTo(60);
    expect(box?.widthPercent).toBeCloseTo(40);
    const left = ghostPlacement(
      outline.map((p) => ({ ...p, x: p.x - 0.3 })),
      1,
    );
    expect(left?.leftPercent).toBeCloseTo(80);
  });

  it('returns null without a usable outline', () => {
    expect(ghostPlacement([], 1)).toBeNull();
    expect(ghostPlacement([{ x: 0.5, y: 0.5 }], 1)).toBeNull();
    expect(
      ghostPlacement(
        [
          { x: 0.5, y: 0.4 },
          { x: 0.5, y: 0.5 },
          { x: 0.5, y: 0.6 },
        ],
        1,
      ),
    ).toBeNull();
  });
});
