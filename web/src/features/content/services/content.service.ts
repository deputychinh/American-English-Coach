import { api } from '@/api/client';
import type { Copy } from '@/interfaces/copy.interface';
import type {
  MinimalPair,
  PhonemeCard,
  Sentence,
  SoundDrill,
  SoundDrillSummary,
  VisemeContent,
} from '@/interfaces/practice.interface';
import { getCopy } from '@/locales';
import { problemMessage } from '@/utils/problem.util';

type ContentKind = keyof Copy['common']['content'];

const unwrap = <T>(result: { data?: T; error?: unknown }, what: ContentKind): T => {
  const copy = getCopy();
  if (result.data === undefined)
    throw new Error(
      problemMessage(result.error, copy.common.loadFailed(copy.common.content[what])),
    );
  return result.data;
};

export const getPhonemes = async (): Promise<PhonemeCard[]> =>
  unwrap(await api.GET('/api/v1/content/phonemes'), 'phonemes');

export const getPairs = async (): Promise<MinimalPair[]> =>
  unwrap(await api.GET('/api/v1/content/pairs'), 'pairs');

export const getSentences = async (): Promise<Sentence[]> =>
  unwrap(await api.GET('/api/v1/content/sentences'), 'sentences');

export const getVisemes = async (): Promise<VisemeContent> =>
  unwrap(await api.GET('/api/v1/content/visemes'), 'visemes');

export const getSounds = async (): Promise<SoundDrillSummary[]> =>
  unwrap(await api.GET('/api/v1/content/sounds'), 'sounds');

export const getSound = async (soundId: string): Promise<SoundDrill> =>
  unwrap(
    await api.GET('/api/v1/content/sounds/{sound_id}', { params: { path: { sound_id: soundId } } }),
    'drill',
  );

export const getPracticeContent = async (): Promise<{
  pairs: MinimalPair[];
  sentences: Sentence[];
  sounds: SoundDrillSummary[];
}> => {
  const [pairs, sentences, sounds] = await Promise.all([getPairs(), getSentences(), getSounds()]);
  return { pairs, sentences, sounds };
};
