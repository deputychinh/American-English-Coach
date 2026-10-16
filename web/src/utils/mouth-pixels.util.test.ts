import { innerMouthRatios, isInsidePolygon } from './mouth-pixels.util';

const square = [
  { x: 2, y: 2 },
  { x: 8, y: 2 },
  { x: 8, y: 8 },
  { x: 2, y: 8 },
];

const buffer = (width: number, height: number, fill: (x: number, y: number) => number[]) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = fill(x, y);
      data.set([r ?? 0, g ?? 0, b ?? 0, 255], (y * width + x) * 4);
    }
  }
  return data;
};

describe('mouth pixel analysis', () => {
  it('tests points against a polygon', () => {
    expect(isInsidePolygon({ x: 5, y: 5 }, square)).toBe(true);
    expect(isInsidePolygon({ x: 9, y: 5 }, square)).toBe(false);
    expect(isInsidePolygon({ x: 1, y: 1 }, [])).toBe(false);
  });

  it('counts bright unsaturated pixels as teeth and red saturated pixels as tongue', () => {
    const teeth = buffer(10, 10, () => [230, 225, 220]);
    expect(innerMouthRatios({ data: teeth, width: 10, height: 10, polygon: square }).teeth).toBe(1);
    const tongue = buffer(10, 10, () => [170, 60, 70]);
    const ratios = innerMouthRatios({ data: tongue, width: 10, height: 10, polygon: square });
    expect(ratios.tongue).toBe(1);
    expect(ratios.teeth).toBe(0);
    expect(ratios.pixels).toBe(36);
  });

  it('treats a dark mouth interior as neither, and handles empty polygons', () => {
    const dark = buffer(10, 10, () => [30, 15, 15]);
    expect(innerMouthRatios({ data: dark, width: 10, height: 10, polygon: square })).toEqual({
      teeth: 0,
      tongue: 0,
      pixels: 36,
    });
    expect(innerMouthRatios({ data: dark, width: 10, height: 10, polygon: [] }).pixels).toBe(0);
    const outside = [
      { x: 20, y: 20 },
      { x: 30, y: 20 },
      { x: 30, y: 30 },
    ];
    expect(innerMouthRatios({ data: dark, width: 10, height: 10, polygon: outside }).pixels).toBe(
      0,
    );
  });

  it('mixes: half teeth half tongue', () => {
    const mixed = buffer(10, 10, (x) => (x < 5 ? [240, 240, 240] : [180, 50, 60]));
    const ratios = innerMouthRatios({ data: mixed, width: 10, height: 10, polygon: square });
    expect(ratios.teeth).toBeCloseTo(0.5, 5);
    expect(ratios.tongue).toBeCloseTo(0.5, 5);
  });
});
