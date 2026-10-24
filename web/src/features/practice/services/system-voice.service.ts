/**
 * The browser's own American English voice (Web Speech API): the last fallback for "Listen"
 * when the app has no bundled clip and no scoring server, as in the web app. It runs on the
 * device; nothing is sent anywhere.
 */

const RATE = 0.9;
const PREFERRED = /Samantha|Google US English|Microsoft (Aria|Jenny|Guy)/;

const synthesis = (): SpeechSynthesis | null =>
  typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;

/** A well-known US voice first, then any en-US one, then any English one. */
export const pickEnglishVoice = (voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
  const american = voices.filter((voice) => voice.lang.replace('_', '-') === 'en-US');
  return (
    american.find((voice) => PREFERRED.test(voice.name)) ??
    american[0] ??
    voices.find((voice) => voice.lang.startsWith('en')) ??
    null
  );
};

/** Safari only speaks after a tap: an empty utterance during the tap unlocks later ones. */
export const primeSystemVoice = (): void => {
  synthesis()?.speak(new SpeechSynthesisUtterance(''));
};

/** Speaks `text`; false when the browser has no speech synthesis. */
export const speakWithSystemVoice = (text: string, onEnd: () => void): boolean => {
  const engine = synthesis();
  if (!engine) return false;
  engine.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'en-US';
  utterance.rate = RATE;
  utterance.voice = pickEnglishVoice(engine.getVoices());
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  engine.speak(utterance);
  return true;
};

export const stopSystemVoice = (): void => {
  synthesis()?.cancel();
};
