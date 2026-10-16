import { render, screen } from '@testing-library/react';

import { PracticeList } from './PracticeList';

describe('PracticeList', () => {
  it('links every pair word and sentence to the practice screen', () => {
    render(
      <PracticeList
        pairs={[
          {
            id: 'think-sink',
            focus: 'TH',
            words: ['think', 'sink'],
            error_id: 'x',
            title_vi: '/θ/ và /s/',
          },
        ]}
        sentences={[
          {
            id: 's5',
            text: 'Did you finish?',
            focus: ['SH'],
            kind: 'question',
            title_vi: 'Câu hỏi',
          },
        ]}
      />,
    );
    expect(screen.getByRole('link', { name: 'sink' })).toHaveAttribute(
      'href',
      expect.stringContaining('item=pair%3Athink-sink%3A1'),
    );
    expect(screen.getByRole('link', { name: 'Did you finish?' })).toHaveAttribute(
      'href',
      expect.stringContaining('item=sentence%3As5'),
    );
    expect(screen.getByText('Câu hỏi yes/no')).toBeInTheDocument();
  });
});
