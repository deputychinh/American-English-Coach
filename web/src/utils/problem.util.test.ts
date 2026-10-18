import { problemCode, problemMessage } from './problem.util';

describe('problem util', () => {
  it('reads detail, then title, then the fallback', () => {
    expect(problemMessage({ detail: 'run not found', code: 'NOT_FOUND' }, 'x')).toBe(
      'run not found',
    );
    expect(problemMessage({ title: 'Bad Request' }, 'x')).toBe('Bad Request');
    expect(problemMessage(new Error('boom'), 'x')).toBe('boom');
    expect(problemMessage(new Error(''), 'x')).toBe('x');
    expect(problemMessage(42, 'x')).toBe('x');
    expect(problemCode({ detail: 'a', code: 'NOT_FOUND' })).toBe('NOT_FOUND');
    expect(problemCode('nope')).toBeUndefined();
  });
});

describe('problemMessage for the pairing 401', () => {
  it('shows the learner-facing pairing message instead of the server detail', () => {
    const error = {
      code: 'UNAUTHORIZED',
      detail: 'pair this device first (…)',
      title: 'Unauthorized',
    };
    expect(problemMessage(error, 'x')).toBe('Máy chấm yêu cầu ghép nối thiết bị này.');
  });
});

describe('problemMessage for scoring errors', () => {
  it('turns server error codes into learner-facing Vietnamese', () => {
    expect(
      problemMessage({ code: 'AUDIO_INVALID', detail: 'audio is too short or silent' }, 'x'),
    ).toMatch(/Không nghe thấy tiếng/);
    expect(problemMessage({ code: 'SOMETHING_ELSE', detail: 'raw' }, 'x')).toBe('raw');
  });
});
