import { contourEnding, contourPath, pitchContour } from './contour.util';

const track = (values: number[]): Float64Array => Float64Array.from(values);

describe('pitch contour', () => {
  it('trims the silent ends and measures in semitones from the median', () => {
    const contour = pitchContour(track([NaN, NaN, 200, 200, 400, NaN]), 10);
    expect(contour).toHaveLength(3);
    expect(contour.map((p) => p.t)).toEqual([0, 0.5, 1]);
    // 400 Hz is an octave (12 st) above the median; the drawing clamps at 8.
    expect(contour.map((p) => p.st)).toEqual([0, 0, 8]);
    expect(pitchContour(track([NaN, 180, NaN]))).toEqual([]);
  });

  it('keeps unvoiced gaps inside the sentence as breaks in the line', () => {
    const contour = pitchContour(track([100, 100, NaN, NaN, 100, 100]), 6);
    expect(contour.map((p) => p.st)).toEqual([0, 0, null, null, 0, 0]);
    expect(contourPath(contour, { width: 100, height: 40 })).toBe(
      'M0.0 20.0 L20.0 20.0 M80.0 20.0 L100.0 20.0',
    );
  });

  it('reads the ending as a rise, a fall or level', () => {
    const rising = Array.from({ length: 50 }, (_, i) => 150 * 2 ** (i >= 40 ? (i - 40) / 12 : 0));
    expect(contourEnding(pitchContour(track(rising)))).toBe('rise');
    expect(contourEnding(pitchContour(track([...rising].reverse())))).toBe('level');
    const falling = Array.from({ length: 50 }, (_, i) => 150 * 2 ** (i >= 40 ? -(i - 40) / 12 : 0));
    expect(contourEnding(pitchContour(track(falling)))).toBe('fall');
    expect(contourEnding([])).toBeNull();
  });
});
