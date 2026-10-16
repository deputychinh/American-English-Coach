"""Reference pronunciations from the bundled CMUdict (American English, ARPAbet + stress)."""

import re
from dataclasses import dataclass
from pathlib import Path

from app.constants import MIN_CMU_FIELDS
from app.domain.phoneme_inventory import Phone, parse_cmu
from app.errors import WordUnknownError

WORD_PATTERN = re.compile(r"[a-z']+")
VARIANT_SUFFIX = re.compile(r"\(\d+\)$")


@dataclass(frozen=True, slots=True)
class WordPronunciations:
    """A word of the prompt with every dictionary variant (first = most common)."""

    word: str
    variants: tuple[tuple[Phone, ...], ...]

    @property
    def primary(self) -> tuple[Phone, ...]:
        """The dictionary's first entry."""
        return self.variants[0]


class PronouncingDictionary:
    """Loads `cmudict.dict` once; lookups are case-insensitive."""

    def __init__(self, entries: dict[str, list[tuple[Phone, ...]]]) -> None:
        self._entries = entries

    @classmethod
    def load(cls, path: Path) -> "PronouncingDictionary":
        """Parse the CMUdict text format (`word(2) P1 P2 … # comment`)."""
        entries: dict[str, list[tuple[Phone, ...]]] = {}
        with path.open(encoding="utf-8") as source:
            for line in source:
                head, _, _comment = line.partition("#")
                parts = head.split()
                if len(parts) < MIN_CMU_FIELDS:
                    continue
                word = VARIANT_SUFFIX.sub("", parts[0]).lower()
                entries.setdefault(word, []).append(tuple(parse_cmu(parts[1:])))
        return cls(entries)

    def __len__(self) -> int:
        """Number of distinct words."""
        return len(self._entries)

    def lookup(self, word: str) -> WordPronunciations | None:
        """Pronunciations of one word, or `None` if the dictionary lacks it."""
        variants = self._entries.get(word.lower())
        if not variants:
            return None
        return WordPronunciations(word.lower(), tuple(variants))

    def tokenize(self, text: str) -> list[str]:
        """Lower-case words of a prompt; punctuation is dropped, apostrophes kept."""
        return WORD_PATTERN.findall(text.lower().replace("\u2019", "'"))

    def for_text(self, text: str) -> list[WordPronunciations]:
        """Pronunciations for every word of a prompt; unknown words raise."""
        result: list[WordPronunciations] = []
        for word in self.tokenize(text):
            entry = self.lookup(word)
            if entry is None:
                raise WordUnknownError(f"no reference pronunciation for '{word}'")
            result.append(entry)
        return result
