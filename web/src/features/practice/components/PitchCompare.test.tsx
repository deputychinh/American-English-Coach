import { render, screen } from '@testing-library/react';

import type { ContourPoint, PitchContours } from '@/interfaces/contour.interface';

import { PitchCompare } from './PitchCompare';

const { pitchContours } = vi.hoisted(() => ({
  pitchContours: vi.fn<() => Promise<PitchContours>>(),
}));
vi.mock('@/features/practice/services/pitch-contour.service', () => ({ pitchContours }));

/** A contour that holds level, then moves `end` semitones over its last fifth. */
const shape = (end: number): ContourPoint[] =>
  Array.from({ length: 20 }, (_, i) => ({ t: i / 19, st: i >= 16 ? ((i - 15) / 4) * end : 0 }));

describe('PitchCompare', () => {
  it('says when the learner ends like the model', async () => {
    pitchContours.mockResolvedValue({ learner: shape(-4), model: shape(-5) });
    render(<PitchCompare text="Please keep the green tea." recording={new Blob()} />);
    expect(screen.getByText('Đang vẽ đường nét…')).toBeInTheDocument();
    expect(
      await screen.findByText(/Cuối câu: mẫu đi xuống, bạn đi xuống\. Dáng cuối câu đã khớp/),
    ).toBeInTheDocument();
    expect(screen.getByRole('img')).toHaveAccessibleName(/mẫu đi xuống, bạn đi xuống/);
    expect(document.querySelectorAll('.pitch-compare__line')).toHaveLength(2);
  });

  it('points out a question that falls where the model rises', async () => {
    pitchContours.mockResolvedValue({ learner: shape(-4), model: shape(5) });
    render(<PitchCompare text="Do we need three seats?" recording={new Blob()} />);
    expect(
      await screen.findByText(/mẫu đi lên, bạn đi xuống\. Dáng cuối câu chưa khớp/),
    ).toBeInTheDocument();
  });

  it('works without a model voice and asks to speak up when no pitch was found', async () => {
    pitchContours.mockResolvedValueOnce({ learner: shape(5), model: null });
    const { unmount } = render(<PitchCompare text="Hi there." recording={new Blob()} />);
    expect(await screen.findByText(/Cuối câu bạn đi lên\. Chưa có giọng mẫu/)).toBeInTheDocument();
    expect(document.querySelectorAll('.pitch-compare__line')).toHaveLength(1);
    unmount();
    pitchContours.mockRejectedValueOnce(new Error('decode'));
    render(<PitchCompare text="Hi there." recording={new Blob()} />);
    expect(await screen.findByText(/Chưa đo được cao độ/)).toBeInTheDocument();
  });
});
