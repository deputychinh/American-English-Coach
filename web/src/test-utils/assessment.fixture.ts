import { ProsodyAspect, Verdict, VisemeGroup, VisualVerdict } from '@/api/coach.schema';
import type { AssessmentResponse, PhoneResult } from '@/interfaces/practice.interface';

export const phone = (overrides: Partial<PhoneResult> = {}): PhoneResult => ({
  symbol: 'TH',
  ipa: 'θ',
  verdict: Verdict.ok,
  audio_verdict: Verdict.ok,
  visual: VisualVerdict.unavailable,
  viseme_group: VisemeGroup.V3,
  gop: -0.2,
  heard: 'TH',
  heard_ipa: 'θ',
  start: 0.1,
  end: 0.3,
  error_id: null,
  hint_vi: null,
  mouth_tip_vi: null,
  show_mouth_hint: false,
  ...overrides,
});

/** "think" with /θ/ heard as /t/ (check) and everything else ok. */
export const assessmentFixture = (): AssessmentResponse => ({
  id: 'run-1',
  item_id: 'pair:think-sink:0',
  text: 'think',
  model_version: 'fake@test',
  words: [
    {
      word: 'think',
      ipa: 'θɪŋk',
      phones: [
        phone({
          verdict: Verdict.check,
          audio_verdict: Verdict.check,
          heard: 'T',
          heard_ipa: 't',
          error_id: 'th_to_t_s_f',
          hint_vi: 'Đặt đầu lưỡi giữa hai hàm răng.',
          mouth_tip_vi: 'Đầu lưỡi lộ ra giữa răng.',
        }),
        phone({
          symbol: 'IH',
          ipa: 'ɪ',
          viseme_group: null,
          heard: 'IH',
          heard_ipa: 'ɪ',
          start: 0.3,
          end: 0.4,
        }),
        phone({
          symbol: 'NG',
          ipa: 'ŋ',
          viseme_group: null,
          heard: 'NG',
          heard_ipa: 'ŋ',
          start: 0.4,
          end: 0.5,
        }),
        phone({
          symbol: 'K',
          ipa: 'k',
          viseme_group: null,
          heard: '',
          heard_ipa: '',
          verdict: Verdict.error,
          audio_verdict: Verdict.error,
          error_id: 'final_k_dropped',
          hint_vi: 'Âm /k/ cuối bị bỏ.',
          start: 0.5,
          end: 0.6,
        }),
      ],
    },
  ],
  prosody: [
    {
      aspect: ProsodyAspect.rhythm,
      verdict: Verdict.check,
      detail_vi: 'Các âm tiết dài bằng nhau.',
      word_index: null,
    },
  ],
  summary: {
    ok: 2,
    check: 1,
    error: 1,
    focus: [
      {
        error_id: 'th_to_t_s_f',
        phoneme: 'TH',
        ipa: 'θ',
        hint_vi: 'Đặt đầu lưỡi giữa hai hàm răng.',
        count: 1,
      },
    ],
    camera_used: false,
  },
});
