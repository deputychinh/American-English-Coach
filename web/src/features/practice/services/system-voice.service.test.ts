import {
  pickEnglishVoice,
  primeSystemVoice,
  speakWithSystemVoice,
  stopSystemVoice,
} from './system-voice.service';

const voice = (name: string, lang: string) => ({ name, lang }) as SpeechSynthesisVoice;

describe('system voice', () => {
  const engine = {
    speak: vi.fn(),
    cancel: vi.fn(),
    getVoices: vi.fn(() => [] as SpeechSynthesisVoice[]),
  };
  const spoken = (index = 0): SpeechSynthesisUtterance =>
    engine.speak.mock.calls[index]?.[0] as SpeechSynthesisUtterance;

  beforeEach(() => {
    vi.clearAllMocks();
    // jsdom has no Web Speech API: a constructor that keeps the text is enough.
    vi.stubGlobal(
      'SpeechSynthesisUtterance',
      vi.fn(function (this: SpeechSynthesisUtterance, text: string) {
        this.text = text;
      }),
    );
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: engine });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    Reflect.deleteProperty(window, 'speechSynthesis');
  });

  it('prefers a well-known US voice, then any en-US, then any English voice', () => {
    const british = voice('Daniel', 'en-GB');
    const plainUs = voice('Fred', 'en-US');
    const samantha = voice('Samantha', 'en-US');
    expect(pickEnglishVoice([british, plainUs, samantha])).toBe(samantha);
    expect(pickEnglishVoice([british, plainUs])).toBe(plainUs);
    expect(pickEnglishVoice([voice('Thu', 'vi-VN'), british])).toBe(british);
    expect(pickEnglishVoice([voice('Thu', 'vi-VN')])).toBeNull();
  });

  it('speaks the text slowly in American English and reports the end', () => {
    engine.getVoices.mockReturnValue([voice('Samantha', 'en_US')]);
    const onEnd = vi.fn();
    expect(speakWithSystemVoice('I worked until five.', onEnd)).toBe(true);
    expect(spoken()).toMatchObject({ text: 'I worked until five.', lang: 'en-US', rate: 0.9 });
    expect(spoken().voice?.name).toBe('Samantha');
    spoken().onend?.(new Event('end') as SpeechSynthesisEvent);
    expect(onEnd).toHaveBeenCalledOnce();
    expect(engine.cancel).toHaveBeenCalledOnce();
  });

  it('unlocks speech during a tap and stops on request', () => {
    primeSystemVoice();
    expect(spoken().text).toBe('');
    stopSystemVoice();
    expect(engine.cancel).toHaveBeenCalledOnce();
  });

  it('says so when the browser cannot speak', () => {
    Reflect.deleteProperty(window, 'speechSynthesis');
    expect(speakWithSystemVoice('hello', vi.fn())).toBe(false);
  });
});
