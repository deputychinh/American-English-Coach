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
# Swept on speechocean762 (docs/BENCHMARK-REALTIME.md §4): -1.5 trades 12.8% check-rate on
# expert-correct phones for 61.6% detection; -1.0 gives 15.3% / 67.5%, -2.0 gives 10.8% / 57.8%.
GOP_OK_THRESHOLD: Final = -1.5
GOP_CHECK_THRESHOLD: Final = -3.0
# Alignment costs: identical 0, same class 0.5, different class 1, gap 1.
ALIGN_SAME_CLASS_COST: Final = 0.5
ALIGN_DIFFERENT_CLASS_COST: Final = 1.0
ALIGN_GAP_COST: Final = 1.0
# Minimum precision measured on the evaluation set before an error kind may be shown as `error`.
ERROR_PRECISION_GATE: Final = 0.85
DEFAULT_MODEL_ID: Final = "facebook/wav2vec2-xlsr-53-espeak-cv-ft"
DEFAULT_VOICE: Final = "Samantha"
PROSODY_STRESS_RATIO_MIN: Final = 1.15
PROSODY_FINAL_SEMITONES: Final = 1.5
SILENCE_PEAK: Final = 1e-4
MIN_SYLLABLES_FOR_STRESS: Final = 2
MIN_NUCLEI_FOR_RHYTHM: Final = 2
MIN_CMU_FIELDS: Final = 2
