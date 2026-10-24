import { cameraMessage } from './camera-error.util';

describe('cameraMessage', () => {
  it('turns Safari\'s "Invalid constraint" (no front camera) into plain copy', () => {
    const safari = { name: 'OverconstrainedError', message: 'Invalid constraint', constraint: '' };
    expect(cameraMessage(safari)).toBe('Không tìm thấy camera dùng được trên máy này.');
    expect(cameraMessage(new DOMException('Requested device not found', 'NotFoundError'))).toBe(
      'Không tìm thấy camera dùng được trên máy này.',
    );
  });

  it('says when another app holds the camera or permission is missing', () => {
    expect(
      cameraMessage(new DOMException('Could not start video source', 'NotReadableError')),
    ).toBe('Camera đang được app khác dùng. Đóng app đó rồi bấm Thử lại.');
    expect(cameraMessage(new DOMException('denied', 'NotAllowedError'))).toMatch(
      /chưa cho phép dùng camera/,
    );
  });

  it('keeps other messages and falls back when there is none', () => {
    expect(cameraMessage(new Error('Video failed'))).toBe('Video failed');
    expect(cameraMessage('weird')).toMatch(/không hỗ trợ/);
  });
});
