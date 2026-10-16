import { resolvePracticeItem } from './practice-item.util';

const content = {
  pairs: [
    {
      id: 'think-sink',
      focus: 'TH',
      words: ['think', 'sink'],
      error_id: 'x',
      title_vi: '/θ/ và /s/',
    },
  ],
  sentences: [
    { id: 's5', text: 'Did you finish?', focus: ['SH'], kind: 'question', title_vi: 'Câu hỏi' },
    { id: 's9', text: 'Odd.', focus: [], kind: 'weird', title_vi: 'Lạ' },
  ],
};

describe('resolvePracticeItem', () => {
  it('resolves words, pairs and sentences', () => {
    expect(resolvePracticeItem('word:See!', content)?.text).toBe('see');
    expect(resolvePracticeItem('pair:think-sink:1', content)).toMatchObject({
      text: 'sink',
      kind: 'word',
      focus: ['TH'],
    });
    expect(resolvePracticeItem('sentence:s5', content)).toMatchObject({
      text: 'Did you finish?',
      kind: 'question',
    });
    expect(resolvePracticeItem('sentence:s9', content)?.kind).toBe('statement');
  });

  it('returns null for unknown or malformed items', () => {
    expect(resolvePracticeItem(null, content)).toBeNull();
    expect(resolvePracticeItem('pair:nope:0', content)).toBeNull();
    expect(resolvePracticeItem('pair:think-sink:7', content)).toBeNull();
    expect(resolvePracticeItem('word:123', content)).toBeNull();
    expect(resolvePracticeItem('song:x', content)).toBeNull();
  });
});
