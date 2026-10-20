import { APP_VERSION } from '@/constants/ui.constant';
import {
  loadCourse,
  loadCurriculum,
  loadSnapshot,
  loadSoundDrill,
} from '@/features/offline/services/local-content.service';
import {
  createLocalProfile,
  deleteLocalProfile,
  listLocalProfiles,
  renameLocalProfile,
} from '@/features/offline/services/local-profiles.service';
import { planOf, progressOf } from '@/features/offline/services/local-progress.service';
import type { LocalProfile, StoredRun } from '@/interfaces/local-store.interface';
import type { ProfileExport } from '@/interfaces/practice.interface';
import { activeProfileId } from '@/utils/api-base.util';
import {
  itemCounts,
  withCourseProgress,
  withCurriculumProgress,
} from '@/utils/course-progress.util';
import { runsStore } from '@/utils/local-store.util';

/**
 * The scoring server's API answered inside the app (plan A6): content from the bundled
 * snapshot, everything a learner produces from the device store. Same paths, shapes and status
 * codes, so screens do not know whether a server exists.
 */

const PREFIX = '/api/v1';
const PROFILE_HEADER = 'x-coach-profile';
const DEFAULT_RECENT = 20;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const empty = (status = 204): Response => new Response(null, { status });

/** RFC 9457 body like the server's `problem()`. */
const problem = (status: number, code: string, detail: string): Response =>
  new Response(
    JSON.stringify({
      type: `https://coach.local/errors/${code.toLowerCase()}`,
      status,
      detail,
      code,
    }),
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  );

const profileModel = async (profile: LocalProfile): Promise<Record<string, unknown>> => ({
  id: profile.id,
  name: profile.name,
  created_at: profile.createdAt,
  runs: (await runsStore().list(profile.id)).length,
});

const exportProfile = async (profile: LocalProfile): Promise<ProfileExport> =>
  ({
    format: 'aec-profile/1',
    exported_at: new Date().toISOString(),
    profile: await profileModel(profile),
    calibration: null,
    runs: (await runsStore().list(profile.id)).map((run) => ({
      id: run.id,
      item_id: run.itemId,
      text: run.text,
      model_version: run.modelVersion,
      created_at: run.createdAt,
      disputed: run.disputed,
      result: run.result,
      phonemes: run.result.words.flatMap((word) =>
        word.phones.map((p) => ({
          word: word.word,
          phoneme: p.symbol,
          verdict: p.verdict,
          gop: p.gop,
          visual: p.visual,
          error_id: p.error_id ?? null,
        })),
      ),
    })),
  }) as unknown as ProfileExport;

const importProfile = async (snapshot: ProfileExport, name: string | null): Promise<Response> => {
  const profile = createLocalProfile(name ?? snapshot.profile.name);
  let imported = 0;
  let skipped = 0;
  for (const run of snapshot.runs) {
    if (await runsStore().get(run.id)) {
      skipped += 1;
      continue;
    }
    await runsStore().add({
      id: run.id,
      profileId: profile.id,
      itemId: run.item_id,
      text: run.text,
      modelVersion: run.model_version,
      createdAt: new Date(run.created_at).toISOString(),
      disputed: run.disputed,
      result: run.result as unknown as StoredRun['result'],
    });
    imported += 1;
  }
  return json(
    { profile: await profileModel(profile), imported_runs: imported, skipped_runs: skipped },
    201,
  );
};

const profiles = async (request: Request, rest: string[]): Promise<Response> => {
  const all = listLocalProfiles();
  const [id, action] = rest;
  if (!id) {
    if (request.method === 'GET') return json(await Promise.all(all.map(profileModel)));
    const { name } = (await request.json()) as { name: string };
    return json(await profileModel(createLocalProfile(name)), 201);
  }
  if (id === 'import' && request.method === 'POST') {
    const name = new URL(request.url).searchParams.get('name');
    return importProfile((await request.json()) as ProfileExport, name);
  }
  const profile = all.find((p) => p.id === id);
  if (!profile) return problem(404, 'NOT_FOUND', `profile ${id} not found`);
  if (action === 'export') return json(await exportProfile(profile));
  if (request.method === 'PATCH') {
    const { name } = (await request.json()) as { name: string };
    const renamed = renameLocalProfile(id, name);
    return renamed
      ? json(await profileModel(renamed))
      : problem(404, 'NOT_FOUND', 'profile not found');
  }
  if (request.method === 'DELETE') {
    if (!deleteLocalProfile(id)) {
      return problem(400, 'VALIDATION', 'the default profile cannot be deleted; rename it instead');
    }
    await runsStore().removeProfile(id);
    return empty();
  }
  return problem(405, 'VALIDATION', 'method not allowed');
};

const runs = async (
  request: Request,
  id: string,
  action: string | undefined,
): Promise<Response> => {
  const run = await runsStore().get(id);
  if (!run) return problem(404, 'NOT_FOUND', `run ${id} not found`);
  if (action === 'dispute' && request.method === 'POST') {
    await runsStore().put({ ...run, disputed: true });
    return empty();
  }
  return json(run.result);
};

/** Answer an API request on the device, or `null` when the path is not an API path. */
export const handleLocally = async (request: Request): Promise<Response | null> => {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(PREFIX)) return null;
  const [section, ...rest] = url.pathname.slice(PREFIX.length + 1).split('/');
  const profileId = request.headers.get(PROFILE_HEADER) ?? activeProfileId();
  const params = url.searchParams;
  switch (section) {
    case 'health':
      return json({
        status: 'ok',
        version: APP_VERSION,
        // The server's switch for scoring itself (not realtime chat): scoring is on.
        realtime_enabled: true,
        model_ready: true,
        tts_available: false,
        tutor_available: false,
        tutor_model: null,
      });
    case 'content': {
      if (rest[0] === 'sounds' && rest[1]) {
        const drill = await loadSoundDrill(rest[1]);
        return drill ? json(drill) : problem(404, 'NOT_FOUND', `sound ${rest[1]} not found`);
      }
      const snapshot = await loadSnapshot(rest[0] ?? '');
      return snapshot ? json(snapshot) : problem(404, 'NOT_FOUND', 'content not found');
    }
    case 'curriculum':
    case 'course': {
      const counts = itemCounts((await runsStore().list(profileId)).map((run) => run.itemId));
      return section === 'curriculum'
        ? json(withCurriculumProgress(await loadCurriculum(), counts))
        : json(withCourseProgress(await loadCourse(), counts));
    }
    case 'progress':
      return json(
        progressOf(
          await runsStore().list(profileId),
          Number(params.get('limit') ?? DEFAULT_RECENT),
        ),
      );
    case 'plan':
      return json(
        await planOf(await runsStore().list(profileId), {
          tzOffset: Number(params.get('tz_offset') ?? 0),
          goal: Number(params.get('goal') ?? 5),
          now: new Date(),
        }),
      );
    case 'runs':
      return runs(request, rest[0] ?? '', rest[1]);
    case 'profiles':
      return profiles(request, rest);
    case 'calibration':
      // The calibration lives in the browser copy already (calibration.service); nothing more.
      return request.method === 'PUT' ? empty() : json(null);
    case 'tutor':
      return problem(503, 'TUTOR_UNAVAILABLE', 'Gia sư AI chưa có trong bản chạy trên máy.');
    default:
      return problem(404, 'NOT_FOUND', `no local handler for ${url.pathname}`);
  }
};

/** Keep a take scored on the device (the server stores its own takes itself). */
export const saveLocalRun = async (run: StoredRun): Promise<void> => {
  await runsStore().add(run);
};
