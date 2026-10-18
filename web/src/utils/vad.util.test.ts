import { VAD_DEFAULTS } from '@/constants/recorder.constant';

import { initialVad, vadStep } from './vad.util';

const run = (levels: number[], stepMs = 50) => {
  let state = initialVad(0);
  const events: string[] = [];
  levels.forEach((level, index) => {
    const result = vadStep(state, { level, now: (index + 1) * stepMs });
    state = result.state;
    if (result.event !== 'none') events.push(`${result.event}@${String((index + 1) * stepMs)}`);
  });
  return { events, state };
};

describe('vadStep', () => {
  it('detects speech, then ends after the silence window', () => {
    const quiet = Array<number>(6).fill(0.003);
    const voice = Array<number>(10).fill(0.12);
    const silence = Array<number>(20).fill(0.004);
    const { events } = run([...quiet, ...voice, ...silence]);
    expect(events[0]).toBe('speech@500');
    expect(events[1]).toBe(`end@${String(800 + VAD_DEFAULTS.silenceMs)}`);
  });

  it('ignores a short click and keeps listening', () => {
    const { events, state } = run([0.003, 0.2, 0.003, 0.003, 0.003]);
    expect(events).toEqual([]);
    expect(state.hasSpeech).toBe(false);
  });

  it('keeps digital silence as the room when speech starts during calibration', () => {
    // 50 ms chunks: 0 then voice inside the 250 ms window; the floor must stay 0, not jump to 0.12.
    const { state } = run([0, 0.12, 0.12]);
    expect(state.noiseFloor).toBe(0);
  });

  it('gives up when nothing is said', () => {
    const { events } = run(Array<number>(110).fill(0.002));
    expect(events[0]).toBe('no-speech@5000');
  });

  it('raises the threshold in a noisy room', () => {
    const noise = Array<number>(20).fill(0.03);
    const { events } = run([...noise, ...Array<number>(6).fill(0.05)]);
    expect(events).toEqual([]);
  });

  it('hears a learner who starts speaking immediately', () => {
    const { events } = run([0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12, 0.12]);
    expect(events[0]).toMatch(/^speech@/);
  });

  it('caps the threshold so a loud room still hears speech', () => {
    const noise = Array<number>(20).fill(0.05);
    const { events } = run([...noise, ...Array<number>(6).fill(0.2)]);
    expect(events[0]).toMatch(/^speech@/);
  });

  it('keeps the onset through short dips between 8 ms chunks', () => {
    const levels = [
      ...Array<number>(40).fill(0.002),
      ...Array.from({ length: 40 }, (_, i) => (i % 3 === 0 ? 0.004 : 0.2)),
      ...Array<number>(120).fill(0.001),
    ];
    const { events } = run(levels, 8);
    expect(events[0]).toMatch(/^speech@/);
    expect(events[1]).toMatch(/^end@/);
  });
});
