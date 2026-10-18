import { StorageKey } from '@/enums/storage-key.enum';
import type { ListenQuestion, ListenResult, ListenResults } from '@/interfaces/listening.interface';
import type { CurriculumUnit, MinimalPair, Sentence } from '@/interfaces/practice.interface';
import { getCopy } from '@/locales';
import { seedFrom, shuffleSeeded } from '@/utils/shuffle.util';
import { readStorage, writeStorage } from '@/utils/storage.util';

const words = (text: string): string[] => text.split(/\s+/).filter(Boolean);
const bare = (word: string): string => word.toLowerCase().replace(/[^a-z']/g, '');

/** Questions for a unit's listening step, in a fixed per-unit order. */
export const buildQuestions = ({
  unit,
  pairs,
  sentences,
}: {
  unit: CurriculumUnit;
  pairs: MinimalPair[];
  sentences: Sentence[];
}): ListenQuestion[] => {
  const copy = getCopy().listen;
  const step = unit.steps.find((s) => 'pairs' in s);
  if (!step || !('pairs' in step)) return [];
  const pairById = new Map(pairs.map((pair) => [pair.id, pair]));
  const sentenceById = new Map(sentences.map((sentence) => [sentence.id, sentence]));
  const questions: ListenQuestion[] = [];
  for (const id of step.pairs) {
    const pair = pairById.get(id);
    if (!pair) continue;
    const options = shuffleSeeded(pair.words, seedFrom(`${unit.id}:${id}`));
    pair.words.forEach((word, index) => {
      questions.push({
        id: `pair:${id}:${String(index)}`,
        kind: 'pair',
        prompt: word,
        options,
        answer: options.indexOf(word),
        question: copy.whichWord,
      });
    });
  }
  for (const item of step.stress) {
    questions.push({
      id: `stress:${item.word}`,
      kind: 'stress',
      prompt: item.word,
      options: item.syllables.map((syllable) => syllable.toLowerCase()),
      answer: item.stressed,
      question: copy.whichSyllable,
    });
  }
  for (const item of step.focus) {
    const sentence = sentenceById.get(item.sentence);
    if (!sentence) continue;
    const options = words(sentence.text).map((word) => word.replace(/[.,!?;:]+$/, ''));
    const answer = options.findIndex((word) => bare(word) === bare(item.word));
    if (answer < 0) continue;
    questions.push({
      id: `focus:${item.sentence}`,
      kind: 'focus',
      prompt: sentence.text,
      options,
      answer,
      question: copy.whichFocus,
    });
  }
  return shuffleSeeded(questions, seedFrom(unit.id));
};

export const readListenResults = (): ListenResults =>
  readStorage<ListenResults>(StorageKey.Listening, {});

export const saveListenResult = (result: ListenResult): ListenResults => {
  const all = { ...readListenResults(), [result.unitId]: result };
  writeStorage(StorageKey.Listening, all);
  return all;
};

/** Accuracy 0..1 of the stored result for a unit, or null when not done yet. */
export const listenAccuracy = (results: ListenResults, unitId: string): number | null => {
  const result = results[unitId];
  return result && result.total > 0 ? result.correct / result.total : null;
};
