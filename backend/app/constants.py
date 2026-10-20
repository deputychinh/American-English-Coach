"""Module-level constants (single source; imported everywhere else)."""

from typing import Final

API_PREFIX: Final = "/api/v1"
SAMPLE_RATE: Final = 16_000
MAX_AUDIO_SECONDS: Final = 15.0
MAX_AUDIO_BYTES: Final = 8 * 1024 * 1024
MIN_SPEECH_SECONDS: Final = 0.25
CTC_FRAME_SECONDS: Final = 0.02
# Lips move before the sound is heard; the visual window is widened by this much on each side.
VISUAL_WINDOW_PAD_SECONDS: Final = 0.06
# GOP thresholds (log posterior, per phoneme). Calibrated on speechocean762;
# see docs/BENCHMARK-REALTIME.md.
# Swept on speechocean762 with the blank as GOP competitor (docs/BENCHMARK-REALTIME.md §5): -2.0
# gives 12.5% check-rate on expert-correct phones and 64.7% detection; -1.5: 14.6% / 67.8%;
# -3.0: 8.2% / 58.1%.
GOP_OK_THRESHOLD: Final = -2.0
GOP_CHECK_THRESHOLD: Final = -3.0
# Alignment costs: identical 0, same class 0.5, different class 1, gap 1.
ALIGN_SAME_CLASS_COST: Final = 0.5
ALIGN_DIFFERENT_CLASS_COST: Final = 1.0
ALIGN_GAP_COST: Final = 1.0
# Minimum precision measured on the evaluation set before an error kind may be shown as `error`.
ERROR_PRECISION_GATE: Final = 0.85
# A vowel heard after a word-final consonant ("book" said "bookə"); see assessment_service._judge.
FINAL_EPENTHESIS_ID: Final = "final_epenthesis"
DEFAULT_MODEL_ID: Final = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"
DEFAULT_VOICE: Final = "Samantha"
PROSODY_STRESS_RATIO_MIN: Final = 1.15
PROSODY_FINAL_SEMITONES: Final = 1.5
SILENCE_PEAK: Final = 1e-4
MIN_SYLLABLES_FOR_STRESS: Final = 2
MIN_NUCLEI_FOR_RHYTHM: Final = 2
MIN_CMU_FIELDS: Final = 2
# One rest day allowed per this many days without breaking the practice streak.
STREAK_REST_EVERY_DAYS: Final = 7
