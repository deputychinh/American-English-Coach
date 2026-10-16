"""Offline macOS speech synthesis, cached as WAV files. No remote service."""
import hashlib
import os
import shutil
import subprocess
import threading
import uuid
import wave
from pathlib import Path

VOICES = ("Samantha", "Eddy (English (US))")
SYNTHESIS = threading.Semaphore(2)


def status(directory):
    return {"available": shutil.which("say") is not None,
            "engine": "macOS local TTS", "voices": list(VOICES),
            "cached": len(list((Path(directory) / "audio").glob("*.wav"))),
            "note": "Giọng tổng hợp Mỹ có sẵn trên macOS; không gọi cloud."}


def synthesize(directory, text, voice="Samantha"):
    if voice not in VOICES or not isinstance(text, str) or not text.strip() or len(text) > 300:
        raise ValueError("Nội dung hoặc giọng đọc không hợp lệ.")
    digest = hashlib.sha256(("v1|" + voice + "|" + text).encode()).hexdigest()
    folder = Path(directory) / "audio"
    folder.mkdir(parents=True, exist_ok=True)
    target = folder / (digest + ".wav")
    if target.exists():
        return target
    if not shutil.which("say"):
        raise RuntimeError("Máy chưa có engine audio. Bản này dùng giọng local macOS; xem README để cài gói audio.")
    with SYNTHESIS:
        if target.exists():
            return target
        temporary = folder / (str(uuid.uuid4()) + ".wav")
        try:
            subprocess.run(["say", "-v", voice, "-r", "165", "-o", str(temporary),
                            "--file-format=WAVE", "--data-format=LEI16@22050", "--", text],
                           check=True, timeout=30, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)
            with wave.open(str(temporary), "rb") as audio:
                if audio.getnframes() < 100:
                    raise RuntimeError("Giọng hệ thống chưa tạo được audio. Kiểm tra giọng trong cài đặt macOS.")
            os.replace(str(temporary), str(target))
        except (subprocess.SubprocessError, wave.Error) as error:
            raise RuntimeError("Không tạo được audio local. Thử lại hoặc chọn giọng khác trong Cài đặt.") from error
        finally:
            temporary.unlink(missing_ok=True)
    return target
