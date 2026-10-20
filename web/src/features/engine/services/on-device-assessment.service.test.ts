import { StorageKey } from '@/enums/storage-key.enum';
import { encodeWav } from '@/utils/wav-encoder.util';

const { engine, assessLocally, isNative } = vi.hoisted(() => ({
  engine: { status: vi.fn(), load: vi.fn(), posteriors: vi.fn() },
  assessLocally: vi.fn(),
  isNative: { value: true },
}));
vi.mock('@/features/engine/services/engine.service', () => ({
  PhonemeEngine: engine,
  isEngineAvailable: () => isNative.value,
}));
vi.mock('@/features/scoring/services/local-assessment.service', () => ({
  assessLocally: (...args: unknown[]) => assessLocally(...args) as unknown,
}));

const { assessOnDevice, isOnDevicePreferred } = await import('./on-device-assessment.service');

const request = {
  item: {
    id: 'sound:v01:mirror:see',
    text: 'see',
    kind: 'word' as const,
    title: 'see',
    focus: ['IY'],
  },
  audio: encodeWav(new Float32Array([0, 0.25, -0.25])),
  mouthFrames: [],
  audioStartedAt: null,
};

describe('on-device assessment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('is used only in the iOS app and only when the learner turned it on', () => {
    expect(isOnDevicePreferred()).toBe(false);
    localStorage.setItem(StorageKey.OnDeviceScoring, 'true');
    expect(isOnDevicePreferred()).toBe(true);
    isNative.value = false;
    expect(isOnDevicePreferred()).toBe(false);
    isNative.value = true;
  });

  it('loads the model once, runs it on the take and scores the posteriors', async () => {
    engine.status.mockResolvedValue({ downloaded: true, loaded: false });
    engine.load.mockResolvedValue({ milliseconds: 900, coreML: false });
    engine.posteriors.mockResolvedValue({
      frames: 1,
      vocab: 2,
      data: 'AAAAAAAAAAA=',
      milliseconds: 12,
    });
    assessLocally.mockReturnValue({ id: 'r1' });
    expect(await assessOnDevice(request)).toEqual({ id: 'r1' });
    await assessOnDevice(request);
    expect(engine.load).toHaveBeenCalledTimes(1);
    const [input] = assessLocally.mock.calls[0] as [
      { text: string; posteriors: { frames: number } },
    ];
    expect(input.text).toBe('see');
    expect(input.posteriors.frames).toBe(1);
  });
});
