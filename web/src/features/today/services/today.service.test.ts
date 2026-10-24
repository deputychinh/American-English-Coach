import { readTodayRecord, startUnitStep } from './today.service';

const MORNING = new Date(2026, 9, 24, 8);
const EVENING = new Date(2026, 9, 24, 21);
const TOMORROW = new Date(2026, 9, 25, 8);

describe('today service', () => {
  beforeEach(() => localStorage.clear());

  it("remembers the lesson's step once a day, before the learner opens it", () => {
    localStorage.setItem('coach.lesson', JSON.stringify({ u03: { step: 2 } }));
    startUnitStep('u03', MORNING);
    expect(readTodayRecord(MORNING)).toMatchObject({
      date: '2026-10-24',
      unitId: 'u03',
      unitStartStep: 2,
    });
    // Coming back later the same day keeps the morning's starting point.
    localStorage.setItem('coach.lesson', JSON.stringify({ u03: { step: 3 } }));
    startUnitStep('u03', EVENING);
    expect(readTodayRecord(EVENING)?.unitStartStep).toBe(2);
  });

  it('starts fresh on a new day and for an unopened lesson', () => {
    startUnitStep('u05', MORNING);
    expect(readTodayRecord(MORNING)?.unitStartStep).toBe(0);
    expect(readTodayRecord(TOMORROW)).toBeNull();
  });
});
