import { StorageKey } from '@/enums/storage-key.enum';
import { resetRunsStore, runsStore } from '@/utils/local-store.util';
import { encodeWav } from '@/utils/wav-encoder.util';

const { engine, assessLocally, isNative } = vi.hoisted(() => ({
  engine: { status: vi.fn(), load: vi.fn(), posteriors: vi.fn() },
  assessLocally: vi.fn(),
  isNative: { value: true },
}));
vi.mock('@/features/engine/services/engine.service', () => ({
  PhonemeEngine: engine,
  isEngineAvailable: () => isNative.value,
  engineModelVersion: () => 'w2v.mm8@ios',
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
    resetRunsStore();
  });

  it('needs the native engine and local mode', () => {
    expect(isOnDevicePreferred()).toBe(false);
    localStorage.setItem(StorageKey.ForceLocalMode, 'true');
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
    let call = 0;
    assessLocally.mockImplementation(() => {
      call += 1;
      return {
        id: `r${String(call)}`,
        item_id: 'sound:v01:mirror:see',
        text: 'see',
        model_version: 'w2v.mm8@ios',
        words: [],
      };
    });
    expect((await assessOnDevice(request)).id).toBe('r1');
    await assessOnDevice(request);
    expect(engine.load).toHaveBeenCalledTimes(1);
    // Each take is kept on the device for Progress and the weekly plan.
    expect((await runsStore().list('default')).map((r) => r.id).sort()).toEqual(['r1', 'r2']);
    const [input] = assessLocally.mock.calls[0] as [
      { text: string; posteriors: { frames: number } },
    ];
    expect(input.text).toBe('see');
    expect(input.posteriors.frames).toBe(1);
  });
});
