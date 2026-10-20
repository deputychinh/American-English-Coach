import type { CourseResponse, CurriculumResponse } from '@/interfaces/practice.interface';

/**
 * Bundled API responses (backend/scripts/build_content_snapshot.py), loaded on first use so
 * pages that never ask for content do not carry it.
 */
export const loadSnapshot = async (name: string): Promise<unknown> => {
  switch (name) {
    case 'phonemes':
      return (await import('@/data/content/phonemes.json')).default;
    case 'pairs':
      return (await import('@/data/content/pairs.json')).default;
    case 'sentences':
      return (await import('@/data/content/sentences.json')).default;
    case 'visemes':
      return (await import('@/data/content/visemes.json')).default;
    case 'sounds':
      return (await import('@/data/content/sounds.json')).default;
    default:
      return null;
  }
};

export const loadSoundDrill = async (id: string): Promise<unknown> => {
  const drills = (await import('@/data/content/sound-drills.json')).default as Record<
    string,
    unknown
  >;
  return drills[id] ?? null;
};

export const loadCurriculum = async (): Promise<CurriculumResponse> =>
  (await import('@/data/content/curriculum.json')).default as unknown as CurriculumResponse;

export const loadCourse = async (): Promise<CourseResponse> =>
  (await import('@/data/content/course.json')).default as unknown as CourseResponse;

/** `AH1,AH2` → AH; `IH R` → IH (backend content_service._first_phone). */
export const firstPhone = (pattern: string): string =>
  (pattern.split(',')[0] ?? '')
    .trim()
    .split(/\s+/)[0]
    ?.replace(/[012]+$/, '') ?? '';

/** Target phones of the chart sounds in chart order, without repeats, and phone → drill id. */
export const chartPhones = async (): Promise<{ order: string[]; drillOf: Map<string, string> }> => {
  const sounds = (await loadSnapshot('sounds')) as { id: string; arpabet: string }[];
  const drillOf = new Map<string, string>();
  for (const sound of sounds) {
    const phone = firstPhone(sound.arpabet);
    if (!drillOf.has(phone)) drillOf.set(phone, sound.id);
  }
  return { order: [...drillOf.keys()], drillOf };
};
