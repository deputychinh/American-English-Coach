"""The internal phoneme inventory (ARPAbet, 39 phones) and the mappings into it.

Three symbol sets meet here: CMUdict (ARPAbet with stress digits), the espeak-style IPA
emitted by the wav2vec2 phoneme model, and the IPA shown to learners. Every mapping is a
table in this module so that one test can cover all symbols.
"""

from collections.abc import Iterable
from dataclasses import dataclass
from typing import Final

from app.enums import PhonemeClass

UNKNOWN: Final = "?"

ARPABET_CLASSES: Final[dict[str, PhonemeClass]] = {
    "AA": PhonemeClass.VOWEL, "AE": PhonemeClass.VOWEL, "AH": PhonemeClass.VOWEL,
    "AO": PhonemeClass.VOWEL, "AW": PhonemeClass.VOWEL, "AY": PhonemeClass.VOWEL,
    "EH": PhonemeClass.VOWEL, "ER": PhonemeClass.VOWEL, "EY": PhonemeClass.VOWEL,
    "IH": PhonemeClass.VOWEL, "IY": PhonemeClass.VOWEL, "OW": PhonemeClass.VOWEL,
    "OY": PhonemeClass.VOWEL, "UH": PhonemeClass.VOWEL, "UW": PhonemeClass.VOWEL,
    "B": PhonemeClass.STOP, "D": PhonemeClass.STOP, "G": PhonemeClass.STOP,
    "K": PhonemeClass.STOP, "P": PhonemeClass.STOP, "T": PhonemeClass.STOP,
    "CH": PhonemeClass.AFFRICATE, "JH": PhonemeClass.AFFRICATE,
    "DH": PhonemeClass.FRICATIVE, "F": PhonemeClass.FRICATIVE, "HH": PhonemeClass.FRICATIVE,
    "S": PhonemeClass.FRICATIVE, "SH": PhonemeClass.FRICATIVE, "TH": PhonemeClass.FRICATIVE,
    "V": PhonemeClass.FRICATIVE, "Z": PhonemeClass.FRICATIVE, "ZH": PhonemeClass.FRICATIVE,
    "M": PhonemeClass.NASAL, "N": PhonemeClass.NASAL, "NG": PhonemeClass.NASAL,
    "L": PhonemeClass.LIQUID, "R": PhonemeClass.LIQUID,
    "W": PhonemeClass.GLIDE, "Y": PhonemeClass.GLIDE,
}  # fmt: skip

ARPABET: Final[tuple[str, ...]] = tuple(ARPABET_CLASSES)
VOWELS: Final[frozenset[str]] = frozenset(
    symbol for symbol, cls in ARPABET_CLASSES.items() if cls is PhonemeClass.VOWEL
)

ARPABET_IPA: Final[dict[str, str]] = {
    "AA": "ɑ", "AE": "æ", "AH": "ʌ", "AO": "ɔ", "AW": "aʊ", "AY": "aɪ", "B": "b", "CH": "tʃ",
    "D": "d", "DH": "ð", "EH": "ɛ", "ER": "ɝ", "EY": "eɪ", "F": "f", "G": "ɡ", "HH": "h",
    "IH": "ɪ", "IY": "i", "JH": "dʒ", "K": "k", "L": "l", "M": "m", "N": "n", "NG": "ŋ",
    "OW": "oʊ", "OY": "ɔɪ", "P": "p", "R": "ɹ", "S": "s", "SH": "ʃ", "T": "t", "TH": "θ",
    "UH": "ʊ", "UW": "u", "V": "v", "W": "w", "Y": "j", "Z": "z", "ZH": "ʒ",
}  # fmt: skip
UNSTRESSED_IPA: Final[dict[str, str]] = {"AH": "ə", "ER": "ɚ"}

# espeak-ng (en-us) symbols produced by wav2vec2-xlsr-53-espeak-cv-ft → ARPAbet. Multi-phone
# tokens expand. Flap and glottal stop are allophones of T; the model's language-agnostic vocab
# also contains sounds English never uses, which stay unknown and only ever yield `check`.
ESPEAK_TO_ARPABET: Final[dict[str, tuple[str, ...]]] = {
    "ɑː": ("AA",), "ɑ": ("AA",), "ɒ": ("AA",), "aː": ("AA",), "a": ("AE",), "æ": ("AE",),
    "ʌ": ("AH",), "ə": ("AH",), "ɐ": ("AH",), "ɜ": ("ER",), "ɜː": ("ER",), "ɚ": ("ER",),
    "ɔː": ("AO",), "ɔ": ("AO",), "aʊ": ("AW",), "aɪ": ("AY",), "ɛ": ("EH",), "e": ("EH",),
    "eɪ": ("EY",), "eː": ("EY",), "ɪ": ("IH",), "ᵻ": ("IH",), "iː": ("IY",), "i": ("IY",),
    "oʊ": ("OW",), "o": ("OW",), "oː": ("OW",), "əʊ": ("OW",), "ɔɪ": ("OY",), "oɪ": ("OY",),
    "ʊ": ("UH",), "uː": ("UW",), "u": ("UW",), "ʉ": ("UW",),
    "b": ("B",), "d": ("D",), "ɡ": ("G",), "k": ("K",), "p": ("P",), "t": ("T",), "ɾ": ("T",),
    "ʔ": ("T",), "tʃ": ("CH",), "dʒ": ("JH",), "ð": ("DH",), "f": ("F",), "h": ("HH",),
    "s": ("S",), "ʃ": ("SH",), "θ": ("TH",), "v": ("V",), "z": ("Z",), "ʒ": ("ZH",),
    "m": ("M",), "n": ("N",), "n̩": ("N",), "ŋ": ("NG",), "l": ("L",), "ɫ": ("L",), "l̩": ("L",),
    "ɹ": ("R",), "r": ("R",), "ɻ": ("R",), "w": ("W",), "j": ("Y",),
    "əl": ("AH", "L"), "ɑːɹ": ("AA", "R"), "ɔːɹ": ("AO", "R"), "oːɹ": ("AO", "R"),
    "ɛɹ": ("EH", "R"), "ɪɹ": ("IH", "R"), "ʊɹ": ("UH", "R"), "aɪɚ": ("AY", "ER"),
    "aɪə": ("AY", "AH"), "ju": ("Y", "UW"), "ɪu": ("Y", "UW"), "ts": ("T", "S"),
    "iə": ("IY", "AH"), "eə": ("EH", "AH"), "ʊə": ("UH", "AH"),
}  # fmt: skip


@dataclass(frozen=True, slots=True)
class Phone:
    """One reference phone with its lexical stress (vowels only; 0, 1 or 2)."""

    symbol: str
    stress: int | None = None

    @property
    def ipa(self) -> str:
        """IPA shown to learners; schwa and r-coloured schwa when unstressed."""
        if self.stress == 0 and self.symbol in UNSTRESSED_IPA:
            return UNSTRESSED_IPA[self.symbol]
        return ARPABET_IPA.get(self.symbol, UNKNOWN)

    @property
    def is_vowel(self) -> bool:
        """Vowels carry stress and form syllable nuclei."""
        return self.symbol in VOWELS


def parse_cmu(tokens: Iterable[str]) -> list[Phone]:
    """Turn CMUdict tokens such as `AH0`, `T` into phones, keeping the stress digit."""
    phones: list[Phone] = []
    for token in tokens:
        if token[-1].isdigit():
            phones.append(Phone(token[:-1], int(token[-1])))
        else:
            phones.append(Phone(token))
    return phones


def espeak_to_arpabet(tokens: Iterable[str]) -> list[str]:
    """Map recognised espeak-style tokens to ARPAbet; unknown tokens become `?`."""
    symbols: list[str] = []
    for token in tokens:
        symbols.extend(ESPEAK_TO_ARPABET.get(token, (UNKNOWN,)))
    return symbols


def arpabet_variants(symbol: str) -> tuple[str, ...]:
    """Every single-phone espeak token that realises an ARPAbet symbol (for merged posteriors)."""
    return tuple(token for token, mapped in ESPEAK_TO_ARPABET.items() if mapped == (symbol,))


def phoneme_class(symbol: str) -> PhonemeClass | None:
    """Articulatory class of a symbol; `None` for unknown."""
    return ARPABET_CLASSES.get(symbol)
