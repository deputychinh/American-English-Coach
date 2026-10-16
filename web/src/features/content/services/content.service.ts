import { api } from '@/api/client';
import type {
  MinimalPair,
  PhonemeCard,
  Sentence,
  VisemeContent,
} from '@/interfaces/practice.interface';
import { problemMessage } from '@/utils/problem.util';

const unwrap = <T>(result: { data?: T; error?: unknown }, what: string): T => {
  if (result.data === undefined)
    throw new Error(problemMessage(result.error, `Không tải được ${what}`));
  return result.data;
};

export const getPhonemes = async (): Promise<PhonemeCard[]> =>
  unwrap(await api.GET('/api/v1/content/phonemes'), 'bảng âm');

export const getPairs = async (): Promise<MinimalPair[]> =>
  unwrap(await api.GET('/api/v1/content/pairs'), 'cặp âm');

export const getSentences = async (): Promise<Sentence[]> =>
  unwrap(await api.GET('/api/v1/content/sentences'), 'câu luyện');

export const getVisemes = async (): Promise<VisemeContent> =>
  unwrap(await api.GET('/api/v1/content/visemes'), 'mẫu khẩu hình');

export const getPracticeContent = async (): Promise<{
  pairs: MinimalPair[];
  sentences: Sentence[];
}> => {
  const [pairs, sentences] = await Promise.all([getPairs(), getSentences()]);
  return { pairs, sentences };
};
