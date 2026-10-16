"""`make doctor`: check the machine before a study session (no network, no model load)."""

import logging
import shutil
import socket
import sys

from app.config import get_settings

logger = logging.getLogger("doctor")


def port_free(host: str, port: int) -> bool:
    """True when nothing listens on host:port."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        return sock.connect_ex((host, port)) != 0


def main() -> int:
    """Print one line per check; exit 1 when a required one fails."""
    settings = get_settings()
    checks = {
        "python >= 3.12": sys.version_info >= (3, 12),
        "content dir": (settings.content_dir / "vn_errors.json").exists(),
        "cmudict": (settings.vendor_dir / "cmudict.dict").exists(),
        "phoneme model (make models)": (settings.resolved_model_dir / "vocab.json").exists(),
        "macOS say": shutil.which("say") is not None,
        f"port {settings.port} free": port_free(settings.host, settings.port),
    }
    for name, ok in checks.items():
        logger.info("%s %s", "OK  " if ok else "FAIL", name)
    required = ["python >= 3.12", "content dir", "cmudict"]
    return 0 if all(checks[name] for name in required) else 1


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(message)s")
    raise SystemExit(main())
