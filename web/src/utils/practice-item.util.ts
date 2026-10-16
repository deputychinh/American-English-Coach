import type { MinimalPair, PracticeItem, Sentence } from '@/interfaces/practice.interface';

const KINDS = new Set(['word', 'statement', 'question', 'wh_question']);

export const sentenceKind = (kind: string): PracticeItem['kind'] =>
  KINDS.has(kind) ? (kind as PracticeItem['kind']) : 'statement';

/** Resolves `?item=pair:<id>:<0|1>` / `sentence:<id>` / `word:<word>` against the content. */
export const resolvePracticeItem = (
  param: string | null,
  content: { pairs: MinimalPair[]; sentences: Sentence[] },
): PracticeItem | null => {
  if (!param) return null;
  const [type, ...rest] = param.split(':');
  if (type === 'word' && rest[0]) {
    const word = rest[0].toLowerCase().replace(/[^a-z']/g, '');
    return word ? { id: `word:${word}`, text: word, kind: 'word', title: word, focus: [] } : null;
  }
  if (type === 'pair') {
    const pair = content.pairs.find((candidate) => candidate.id === rest[0]);
    const index = Number(rest[1] ?? '0');
    const word = pair?.words[index];
    if (!pair || !word) return null;
    return {
      id: `pair:${pair.id}:${index}`,
      text: word,
      kind: 'word',
      title: pair.title_vi,
      focus: [pair.focus],
    };
  }
  if (type === 'sentence') {
    const sentence = content.sentences.find((candidate) => candidate.id === rest[0]);
    if (!sentence) return null;
    return {
      id: `sentence:${sentence.id}`,
      text: sentence.text,
      kind: sentenceKind(sentence.kind),
      title: sentence.title_vi,
      focus: sentence.focus,
    };
  }
  return null;
};
