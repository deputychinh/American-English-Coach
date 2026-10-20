"""Render the model voices the app plays, with OpenAI TTS (owner's decision, 2026-10-20).

Every text from app/eval/reference_texts.py is rendered once per voice, trimmed, loudness-
normalised and encoded to AAC (48 kb/s mono, macOS `afconvert`):
- the primary voice goes into the app: web/public/voice/<voice>/<id>.m4a;
- the other voices (for multi-talker listening practice) go into data/voice-pack/, zipped as a
  release asset that the app downloads with the scoring pack.
web/public/voice/manifest.json maps each text to its clip id. The voices are AI-generated and
the app says so (OpenAI's usage policies require the disclosure).

The API key is read from OPENAI_API_KEY (environment or the repo's .env); it is never printed.
Responses are cached in data/voice-cache, so a rerun only pays for new texts.
Run: `uv run python scripts/build_reference_voices.py [--dry-run] [--limit N]`.
"""

import argparse
import hashlib
import io
import json
import os
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

import httpx
import numpy as np
import soundfile as sf

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.eval.reference_texts import reference_texts

ROOT = Path(__file__).resolve().parents[2]
CACHE = ROOT / "data" / "voice-cache"
APP_VOICES = ROOT / "web" / "public" / "voice"
PACK = ROOT / "data" / "voice-pack"
MODEL = "gpt-4o-mini-tts"
VOICES = ("marin", "cedar", "coral", "ash")  # primary first: two female, two male
INSTRUCTIONS = (
    "General American English. Read the text exactly as written, clearly and naturally, at a "
    "moderate teaching pace, as a pronunciation model for learners. Do not add any words."
)
TARGET_RMS_DBFS = -20.0
PEAK_LIMIT = 10 ** (-1.0 / 20)
SILENCE_DBFS = -45.0
PAD_SECONDS = 0.06
# Rough price of gpt-4o-mini-tts audio output; for the dry-run estimate only.
USD_PER_AUDIO_MINUTE = 0.015
SECONDS_PER_CHARACTER = 0.08


def clip_id(text: str) -> str:
    """Stable file name for a text (the manifest maps text → id)."""
    return hashlib.sha1(text.encode("utf-8")).hexdigest()[:12]  # noqa: S324 - not security


def api_key() -> str:
    """OPENAI_API_KEY from the environment, else from the repo's .env (never printed)."""
    if os.environ.get("OPENAI_API_KEY"):
        return os.environ["OPENAI_API_KEY"]
    env = ROOT / ".env"
    for line in env.read_text(encoding="utf-8").splitlines() if env.exists() else []:
        if line.startswith("OPENAI_API_KEY="):
            return line.split("=", 1)[1].strip().strip('"')
    raise SystemExit("OPENAI_API_KEY is not set")


def render(client: httpx.Client, text: str, voice: str) -> bytes:
    """WAV bytes for one text in one voice, cached on disk."""
    cached = CACHE / voice / f"{clip_id(text)}.wav"
    if cached.exists():
        return cached.read_bytes()
    response = client.post(
        "https://api.openai.com/v1/audio/speech",
        json={
            "model": MODEL,
            "voice": voice,
            "input": text,
            "instructions": INSTRUCTIONS,
            "response_format": "wav",
        },
        timeout=60,
    )
    response.raise_for_status()
    cached.parent.mkdir(parents=True, exist_ok=True)
    cached.write_bytes(response.content)
    return response.content


def tidy(wav: bytes) -> tuple[np.ndarray, int]:
    """Mono float audio, silence trimmed (with a little padding), loudness normalised."""
    audio, rate = sf.read(io.BytesIO(wav), dtype="float32", always_2d=True)
    mono = audio.mean(axis=1)
    frame = int(rate * 0.01)
    energy = np.array(
        [np.sqrt(np.mean(mono[i : i + frame] ** 2) + 1e-12) for i in range(0, len(mono), frame)]
    )
    voiced = np.flatnonzero(20 * np.log10(energy) > SILENCE_DBFS)
    if voiced.size:
        pad = int(PAD_SECONDS * rate)
        mono = mono[
            max(0, voiced[0] * frame - pad) : min(len(mono), (voiced[-1] + 1) * frame + pad)
        ]
    rms = np.sqrt(np.mean(mono**2) + 1e-12)
    mono = mono * (10 ** (TARGET_RMS_DBFS / 20) / rms)
    peak = float(np.max(np.abs(mono))) if mono.size else 0.0
    if peak > PEAK_LIMIT:
        mono = mono * (PEAK_LIMIT / peak)
    return mono.astype(np.float32), rate


def encode(audio: np.ndarray, rate: int, target: Path) -> None:
    """AAC in an .m4a container via macOS afconvert."""
    target.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        wav = Path(tmp) / "clip.wav"
        sf.write(wav, audio, rate, subtype="PCM_16")
        subprocess.run(  # noqa: S603 - fixed argv
            [  # noqa: S607 - macOS tool on PATH
                "afconvert",
                "-f",
                "m4af",
                "-d",
                "aac",
                "-b",
                "48000",
                "-c",
                "1",
                str(wav),
                str(target),
            ],
            check=True,
            capture_output=True,
            timeout=60,
        )


def main() -> int:
    """Render, tidy, encode and describe the voices."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="count and estimate, no API calls")
    parser.add_argument("--limit", type=int, default=0, help="only the first N texts (testing)")
    args = parser.parse_args()
    texts = reference_texts()
    if args.limit:
        texts = texts[: args.limit]
    characters = sum(len(t) for t in texts)
    minutes = characters * SECONDS_PER_CHARACTER / 60 * len(VOICES)
    print(f"{len(texts)} texts x {len(VOICES)} voices, ~{minutes:.0f} min of audio, "
          f"~{minutes * USD_PER_AUDIO_MINUTE:.2f} USD")  # fmt: skip
    if args.dry_run:
        return 0
    primary, *extra = VOICES
    with httpx.Client(headers={"Authorization": f"Bearer {api_key()}"}) as client:
        for voice in VOICES:
            for index, text in enumerate(texts, 1):
                audio, rate = tidy(render(client, text, voice))
                folder = APP_VOICES / voice if voice == primary else PACK / voice
                encode(audio, rate, folder / f"{clip_id(text)}.m4a")
                if index % 50 == 0:
                    print(voice, index, "/", len(texts))
    manifest = {
        "model": MODEL,
        "disclosure": "AI-generated voices (OpenAI TTS)",
        "primary": primary,
        "extra": extra,
        "clips": {text: clip_id(text) for text in texts},
    }
    (APP_VOICES / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=1, sort_keys=True) + "\n", encoding="utf-8"
    )
    with zipfile.ZipFile(ROOT / "data" / "voice-pack-v1.zip", "w", zipfile.ZIP_STORED) as archive:
        for voice in extra:
            for clip in sorted((PACK / voice).glob("*.m4a")):
                archive.write(clip, f"{voice}/{clip.name}")
    print("done:", len(texts), "texts; app voice", primary, "; pack", ", ".join(extra))
    return 0


if __name__ == "__main__":
    sys.exit(main())
