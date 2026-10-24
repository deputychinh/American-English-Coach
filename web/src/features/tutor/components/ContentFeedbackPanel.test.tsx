import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ContentFeedbackFormalityAnyOf0, FeedbackIssueKind } from '@/api/coach.schema';
import type { ContentFeedback, SpeechRecognizer } from '@/interfaces/feedback.interface';

import { ContentFeedbackPanel } from './ContentFeedbackPanel';

const { tutor, askFeedback, play } = vi.hoisted(() => ({
  tutor: { isAvailable: true, model: 'gpt-test' },
  askFeedback: vi.fn(),
  play: vi.fn(),
}));
vi.mock('@/features/tutor/hooks/useTutorAvailability', () => ({
  useTutorAvailability: () => tutor,
}));
vi.mock('@/features/tutor/services/feedback.service', () => ({ askFeedback }));
vi.mock('@/features/practice/hooks/useReferenceAudio', () => ({
  useReferenceAudio: () => ({ play, stop: vi.fn(), isPlaying: false, error: null }),
}));

const FEEDBACK: ContentFeedback = {
  grammar: [
    {
      kind: FeedbackIssueKind.grammar,
      wrong: 'go',
      right: 'went',
      explain_vi: 'Hôm qua là quá khứ.',
    },
    {
      kind: FeedbackIssueKind.grammar,
      wrong: 'a milk',
      right: 'milk',
      explain_vi: 'Milk không đếm được.',
    },
  ],
  word_choice: [],
  formality: ContentFeedbackFormalityAnyOf0.casual,
  formality_note_vi: null,
  better_version: 'Yesterday I went to the market with my sister.',
  focus: {
    kind: FeedbackIssueKind.grammar,
    wrong: 'go',
    right: 'went',
    explain_vi: 'Hôm qua là quá khứ.',
  },
  model: 'gpt-test',
};

describe('ContentFeedbackPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tutor.isAvailable = true;
  });

  afterEach(() => vi.unstubAllGlobals());

  it('explains what is needed when no AI tutor is configured', () => {
    tutor.isAvailable = false;
    render(<ContentFeedbackPanel taskVi="Kể về hôm qua" />);
    expect(screen.getByText(/cần một máy chấm có bật gia sư AI/)).toBeVisible();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('sends the typed text with the task and shows one point, a better version and the rest', async () => {
    askFeedback.mockResolvedValue(FEEDBACK);
    render(<ContentFeedbackPanel taskVi="Kể về hôm qua" />);
    const ask = screen.getByRole('button', { name: 'Nhận góp ý' });
    expect(ask).toBeDisabled();
    await userEvent.type(
      screen.getByRole('textbox', { name: 'Bạn đã nói gì?' }),
      'Yesterday I go to the market.',
    );
    await userEvent.click(ask);
    expect(askFeedback).toHaveBeenCalledWith({
      transcript: 'Yesterday I go to the market.',
      taskVi: 'Kể về hôm qua',
    });
    expect(await screen.findByText('Nên sửa · Ngữ pháp')).toBeVisible();
    expect(screen.getByText('went')).toBeVisible();
    expect(screen.getByText('Mức lịch sự: thân mật')).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Nghe câu này' }));
    expect(play).toHaveBeenCalledWith('Yesterday I went to the market with my sister.');
    expect(screen.getByText('Xem thêm 1 góp ý')).toBeVisible();
  });

  it('praises a clean answer and shows a failure as an alert', async () => {
    askFeedback.mockResolvedValueOnce({
      ...FEEDBACK,
      grammar: [],
      focus: null,
      better_version: null,
    });
    askFeedback.mockRejectedValueOnce(new Error('Gia sư AI đang bận.'));
    render(<ContentFeedbackPanel taskVi={null} />);
    await userEvent.type(screen.getByRole('textbox'), 'I work at a small company.');
    await userEvent.click(screen.getByRole('button', { name: 'Nhận góp ý' }));
    expect(await screen.findByText(/Không thấy lỗi ngữ pháp/)).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: 'Nhận góp ý' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Gia sư AI đang bận.');
  });

  it("fills the box from the browser's dictation", async () => {
    const created: SpeechRecognizer[] = [];
    vi.stubGlobal(
      'webkitSpeechRecognition',
      vi.fn(function (this: SpeechRecognizer) {
        this.start = vi.fn();
        this.stop = vi.fn(() => this.onend?.());
        this.abort = vi.fn();
        created.push(this);
      }),
    );
    render(<ContentFeedbackPanel taskVi={null} />);
    await userEvent.click(screen.getByRole('button', { name: 'Đọc chính tả' }));
    const recognition = created[0];
    expect(recognition?.lang).toBe('en-US');
    act(() => {
      recognition?.onresult?.({
        resultIndex: 0,
        results: [Object.assign([{ transcript: ' I very like coffee ' }], { isFinal: true })],
      } as unknown as SpeechRecognitionEvent);
    });
    expect(screen.getByRole('textbox')).toHaveValue('I very like coffee');
    await userEvent.click(screen.getByRole('button', { name: 'Dừng đọc' }));
    expect(screen.getByRole('button', { name: 'Đọc chính tả' })).toBeVisible();
  });
});
