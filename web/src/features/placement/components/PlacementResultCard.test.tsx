import { render, screen } from '@testing-library/react';

import type { PlacementResult } from '@/interfaces/listening.interface';
import type { CurriculumLevel, SoundDrillSummary } from '@/interfaces/practice.interface';

import { PlacementResultCard } from './PlacementResultCard';

const levels = [{ id: 'L1' }, { id: 'L2' }] as unknown as CurriculumLevel[];
const sounds = [{ id: 'c03', arpabet: 'T' }] as unknown as SoundDrillSummary[];
const base: PlacementResult = {
  level: 'L1',
  unitId: 'u01',
  scores: { L1: 0.5, L2: 1 },
  finishedAt: '',
};

describe('PlacementResultCard', () => {
  it('shows listening and speaking per level and links each priority to its drill', () => {
    render(
      <PlacementResultCard
        result={{
          ...base,
          speaking: { L1: 0.4, L2: 0.9 },
          priorities: [{ phoneme: 'T', ipa: 't', hint: 'Giữ âm /t/ cuối.', count: 3 }],
        }}
        levels={levels}
        sounds={sounds}
        titleOf={(id) => `Cấp ${id}`}
        onRetake={() => undefined}
      />,
    );
    expect(screen.getByText('Cấp L1 · nghe 50% · nói 40%')).toBeInTheDocument();
    expect(screen.getByText('Giữ âm /t/ cuối.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Luyện âm này' })).toHaveAttribute(
      'href',
      '/practice?sound=c03',
    );
  });

  it('praises a clean speaking part and keeps the listening-only lines without it', () => {
    const { unmount } = render(
      <PlacementResultCard
        result={{ ...base, speaking: { L1: 1 }, priorities: [] }}
        levels={levels}
        sounds={sounds}
        titleOf={(id) => id}
        onRetake={() => undefined}
      />,
    );
    expect(screen.getByText(/chưa thấy lỗi lặp lại/)).toBeInTheDocument();
    unmount();
    render(
      <PlacementResultCard
        result={base}
        levels={levels}
        sounds={sounds}
        titleOf={(id) => id}
        onRetake={() => undefined}
      />,
    );
    expect(screen.getByText('L2 · 100% đúng')).toBeInTheDocument();
    expect(screen.queryByText('3 điều nên luyện trước')).not.toBeInTheDocument();
  });
});
