import { WORD_PATTERN } from '@/constants/scoring.constant';
import type { WordPronunciations } from '@/interfaces/scoring.interface';
import { parseCmu } from '@/utils/phoneme.util';

/** Reference pronunciations from the bundled CMUdict subset (backend pronouncing.py). */

/** Lower-case words of a prompt; punctuation dropped, apostrophes kept. */
export const tokenizeWords = (text: string): string[] =>
  text.toLowerCase().replaceAll('’', "'").match(WORD_PATTERN) ?? [];

export const lookupWord = (
  lexicon: Record<string, string[][]>,
  word: string,
): WordPronunciations | null => {
  const variants = lexicon[word.toLowerCase()];
  if (!variants || variants.length === 0) return null;
  return { word: word.toLowerCase(), variants: variants.map(parseCmu) };
};

/** Pronunciations for every word of a prompt; an unknown word throws (like the API's 422). */
export const pronunciationsFor = (
  lexicon: Record<string, string[][]>,
  text: string,
): WordPronunciations[] =>
  tokenizeWords(text).map((word) => {
    const entry = lookupWord(lexicon, word);
    if (!entry) throw new Error(`no reference pronunciation for '${word}'`);
    return entry;
  });
