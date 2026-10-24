import type { FluencySession } from '@/interfaces/fluency.interface';

import {
  loadFluencyDeck,
  promptFor,
  readSessions,
  saveSession,
  trendSessions,
} from './fluency.service';

const session = (index: number, profileId = 'default'): FluencySession => ({
  id: `s${String(index)}`,
  profileId,
  promptId: 'fl.u01',
  createdAt: new Date(2026, 9, index + 1).toISOString(),
  rounds: index % 10 === 0 ? [] : [{ targetSeconds: 60, metrics: {} as never }],
});

describe('fluency service', () => {
  beforeEach(() => localStorage.clear());

  it('has one prompt per unit and falls back to the first', async () => {
    const deck = await loadFluencyDeck();
    expect(deck.rounds).toEqual([60, 45, 30]);
    expect(deck.prompts).toHaveLength(24);
    expect(promptFor(deck.prompts, 'u18')?.title_vi).toBe('Gọi đồ cho cả nhóm bạn');
    expect(promptFor(deck.prompts, null)?.unit).toBe('u01');
    expect(promptFor(deck.prompts, 'u99')?.unit).toBe('u01');
    expect(promptFor([], 'u01')).toBeNull();
  });

  it('keeps the latest 60 sessions per profile and shows the last 6 with rounds', () => {
    for (let index = 1; index <= 65; index += 1) saveSession(session(index));
    saveSession(session(1, 'other'));
    const kept = readSessions('default');
    expect(kept).toHaveLength(60);
    expect(kept[0]?.id).toBe('s6');
    expect(readSessions('other')).toHaveLength(1);
    expect(readSessions('nobody')).toEqual([]);
    const trend = trendSessions(kept);
    expect(trend.map((s) => s.id)).toEqual(['s59', 's61', 's62', 's63', 's64', 's65']);
  });
});
