import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SpeakStatus } from '@/features/mirror/components/SpeakStatus';
import { speakOutcome } from '@/utils/mouth-match.util';

const unsure = speakOutcome({ sound: 'check', mouthRate: 1, canJudgeMouth: true });
const base = {
  phase: 'result' as const,
  outcome: unsure,
  error: null,
  ipa: 'ʊ',
  drillId: 'v08',
  isMastered: false,
  canJudgeMouth: true,
  hasSpeech: true,
  live: null,
};

describe('SpeakStatus', () => {
  it('calls an unsure verdict almost right and keeps the streak', () => {
    render(<SpeakStatus {...base} />);
    expect(screen.getByText(/Gần đúng rồi/)).toBeInTheDocument();
  });

  it('says the scorer often confuses a sound it is weak on', () => {
    render(<SpeakStatus {...base} isScorerUnsure />);
    expect(screen.getByText(/Máy chấm còn hay nhầm âm \/ʊ\//)).toBeInTheDocument();
  });
});
