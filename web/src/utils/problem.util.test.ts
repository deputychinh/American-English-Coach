import { problemCode, problemMessage } from './problem.util';

describe('problem util', () => {
  it('reads detail, then title, then the fallback', () => {
    expect(problemMessage({ detail: 'audio is silent', code: 'AUDIO_INVALID' }, 'x')).toBe(
      'audio is silent',
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
