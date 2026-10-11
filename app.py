#!/usr/bin/env python3
"""Run: python3 app.py. Application data stays in ./data unless configured."""
import argparse
import logging
import os
import threading
import webbrowser
from pathlib import Path

from coach.content import ROOT
from coach.server import create_server


def main():
    parser = argparse.ArgumentParser(description="American English Coach — offline local practice")
    parser.add_argument("--port", type=int, default=8765)
    parser.add_argument("--open", action="store_true", help="Mở ứng dụng trong trình duyệt mặc định")
    parser.add_argument("--data-dir", type=Path, default=Path(os.environ.get("ENGLISH_COACH_DATA", str(ROOT / "data"))))
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error("port phải trong khoảng 1–65535")
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
    try:
        server = create_server(args.data_dir, args.port)
    except OSError as error:
        parser.exit(1, "Không mở được cổng local: %s. Thử --port 8766.\n" % error)
    print("\n  American English Coach\n  Mở http://127.0.0.1:%d\n  Dữ liệu: %s\n  Ctrl+C để dừng.\n" % (args.port, args.data_dir.resolve()), flush=True)
    if args.open:
        opener = threading.Timer(0.5, webbrowser.open, args=("http://127.0.0.1:%d/#ipa" % args.port,))
        opener.daemon = True
        opener.start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
