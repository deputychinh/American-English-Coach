#!/usr/bin/env python3
"""Pre-generate the starter pack locally; no network and no paid API."""
import argparse
import concurrent.futures
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from coach.audio import VOICES, synthesize
from coach.content import ROOT, load_content


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--voices", nargs="+", choices=VOICES, default=["Samantha"])
    parser.add_argument("--data-dir", type=Path, default=ROOT / "data")
    args = parser.parse_args()
    content = load_content()
    texts = {item["text"] for item in content["sentences"]}
    texts.update(item["word"] for item in content["words"])
    texts.update(item["example"] for item in content["words"])
    jobs = [(text, voice) for voice in args.voices for text in sorted(texts)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(synthesize, args.data_dir, text, voice) for text, voice in jobs]
        for index, future in enumerate(futures, 1):
            future.result()
            if index % 25 == 0 or index == len(jobs):
                print("Audio local: %d/%d" % (index, len(jobs)), flush=True)


if __name__ == "__main__":
    main()
