"""The assessment use case: audio → phones → verdicts, fused with mouth features and prosody."""

import uuid
from collections import Counter
from dataclasses import dataclass

from app.constants import (
    ALIGN_GAP_COST,
    GOP_CHECK_THRESHOLD,
    GOP_OK_THRESHOLD,
    VISUAL_WINDOW_PAD_SECONDS,
)
from app.domain.aligner import AlignedPair, PhonemeAligner, substitution_cost
from app.domain.ctc_decoder import greedy_decode
from app.domain.error_catalog import ErrorCatalog, KnownError
from app.domain.fusion import FusionRules
from app.domain.gop_scorer import GopScorer, PhoneSegment
from app.domain.phoneme_inventory import ARPABET_IPA, Phone, espeak_to_arpabet
from app.domain.ports import PhonemeRecognizer
from app.domain.pronouncing import PronouncingDictionary, WordPronunciations
from app.domain.prosody import ProsodyAnalyzer, SyllableNucleus
from app.domain.viseme import VisemeCatalog
from app.enums import AlignmentOp, Verdict, VisualVerdict
from app.ml.audio import AudioDecoder
from app.ml.features import ProsodyFeatureExtractor
from app.repositories.results_repository import PhonemeRow, ResultsRepository
from app.schemas.assessment import (
    AssessmentResponse,
    AssessmentSummary,
    FocusItem,
    MouthFrame,
    PhoneResult,
    ProsodyResult,
    WordResult,
)

RISE_BY_KIND: dict[str, bool | None] = {
    "question": True,
    "statement": False,
    "wh_question": False,
    "word": None,
}
MIN_FRAME_QUALITY = 0.5
FOCUS_LIMIT = 2


@dataclass(frozen=True, slots=True)
class AssessmentInput:
    """Everything one attempt carries."""

    item_id: str
    text: str
    kind: str
    audio: bytes
    mouth_frames: list[MouthFrame]
    audio_started_at: float | None


@dataclass(frozen=True, slots=True)
class ExpectedPhone:
    """An expected phone with its word index and whether it ends the word."""

    word_index: int
    phone: Phone
    is_final: bool


class AssessmentService:
    """Orchestrates recogniser, scorer, catalogue, visemes, prosody and storage."""

    def __init__(
        self,
        *,
        decoder: AudioDecoder,
        recognizer: PhonemeRecognizer,
        dictionary: PronouncingDictionary,
        catalog: ErrorCatalog,
        visemes: VisemeCatalog,
        features: ProsodyFeatureExtractor,
        results: ResultsRepository,
    ) -> None:
        self._decoder = decoder
        self._recognizer = recognizer
        self._dictionary = dictionary
        self._catalog = catalog
        self._visemes = visemes
        self._features = features
        self._results = results
        self._aligner = PhonemeAligner()
        self._scorer: GopScorer | None = None

    def assess(self, data: AssessmentInput) -> AssessmentResponse:
        """Run the full pipeline and persist the result."""
        waveform = self._decoder.decode(data.audio)
        words = self._dictionary.for_text(data.text)
        log_probs = self._recognizer.log_posteriors(waveform)
        heard = espeak_to_arpabet(
            greedy_decode(log_probs, self._recognizer.vocab, self._recognizer.blank_id)
        )
        expected = self._choose_variants(words, heard)
        symbols = [e.phone.symbol for e in expected]
        pairs = self._aligner.align(symbols, heard)
        segments = self._gop_scorer().score(log_probs, symbols)
        phones = self._judge(expected, pairs, segments, data)
        prosody = self._prosody(waveform, expected, segments, words, data.kind)
        response = self._build_response(data, words, expected, phones, prosody)
        self._persist(response)
        return response

    def _gop_scorer(self) -> GopScorer:
        if self._scorer is None:
            self._scorer = GopScorer(self._recognizer.vocab, self._recognizer.blank_id)
        return self._scorer

    # --- reference selection -------------------------------------------------

    def _choose_variants(
        self, words: list[WordPronunciations], heard: list[str]
    ) -> list[ExpectedPhone]:
        primary = _expected_from(words, [w.primary for w in words])
        pairs = self._aligner.align([e.phone.symbol for e in primary], heard)
        spans = _heard_spans(primary, pairs)
        chosen: list[tuple[Phone, ...]] = []
        for index, word in enumerate(words):
            if len(word.variants) == 1:
                chosen.append(word.primary)
                continue
            span = spans.get(index, [])
            chosen.append(min(word.variants, key=lambda v: self._cost(v, span)))
        return _expected_from(words, chosen)

    def _cost(self, variant: tuple[Phone, ...], span: list[str]) -> float:
        pairs = self._aligner.align([p.symbol for p in variant], span)
        return sum(
            ALIGN_GAP_COST
            if not (p.expected and p.actual)
            else substitution_cost(p.expected, p.actual)
            for p in pairs
        )

    # --- per-phone verdicts ----------------------------------------------------

    def _judge(
        self,
        expected: list[ExpectedPhone],
        pairs: list[AlignedPair],
        segments: list[PhoneSegment],
        data: AssessmentInput,
    ) -> list[PhoneResult]:
        heard_by_index = _heard_by_expected(pairs)
        results: list[PhoneResult] = []
        for index, item in enumerate(expected):
            op, heard = heard_by_index[index]
            segment = segments[index]
            known = self._catalog.find(item.phone.symbol, heard, op, item.is_final)
            audio_verdict = self._audio_verdict(op, segment.gop, known)
            visual = self._visual(item.phone.symbol, segment, data)
            verdict, show_hint = FusionRules.fuse(audio_verdict, visual)
            results.append(
                self._phone_result(
                    item=item,
                    segment=segment,
                    heard=heard,
                    known=known,
                    audio_verdict=audio_verdict,
                    visual=visual,
                    verdict=verdict,
                    show_hint=show_hint,
                )
            )
        return results

    def _audio_verdict(self, op: AlignmentOp, gop: float, known: KnownError | None) -> Verdict:
        if op is AlignmentOp.MATCH:
            return Verdict.OK if gop >= GOP_CHECK_THRESHOLD else Verdict.CHECK
        if gop >= GOP_OK_THRESHOLD:
            # Greedy decoding disagrees but forced alignment supports the target: trust the
            # alignment (measured on speechocean762, this removes most false alarms).
            return Verdict.OK
        if known is not None and self._catalog.is_enabled(known):
            return Verdict.ERROR
        return Verdict.CHECK

    def _visual(self, symbol: str, segment: PhoneSegment, data: AssessmentInput) -> VisualVerdict:
        if data.audio_started_at is None or not data.mouth_frames:
            return VisualVerdict.UNAVAILABLE
        frame = self._recognizer.frame_seconds
        start = data.audio_started_at + segment.start_frame * frame - VISUAL_WINDOW_PAD_SECONDS
        end = data.audio_started_at + segment.end_frame * frame + VISUAL_WINDOW_PAD_SECONDS
        window = [
            f.features
            for f in data.mouth_frames
            if start <= f.t <= end and f.quality >= MIN_FRAME_QUALITY
        ]
        return self._visemes.evaluate(symbol, window)

    def _phone_result(
        self,
        *,
        item: ExpectedPhone,
        segment: PhoneSegment,
        heard: str,
        known: KnownError | None,
        audio_verdict: Verdict,
        visual: VisualVerdict,
        verdict: Verdict,
        show_hint: bool,
    ) -> PhoneResult:
        frame = self._recognizer.frame_seconds
        group = self._visemes.group_of(item.phone.symbol)
        mouth_tip = known.mouth_tip_vi if known else None
        if show_hint and not mouth_tip and group is not None:
            mouth_tip = self._visemes.target(group).hint_vi
        return PhoneResult(
            symbol=item.phone.symbol,
            ipa=item.phone.ipa,
            verdict=verdict,
            audio_verdict=audio_verdict,
            visual=visual,
            viseme_group=group,
            gop=segment.gop,
            heard=heard,
            heard_ipa=ARPABET_IPA.get(heard, "" if not heard else "?"),
            start=round(segment.start_frame * frame, 3),
            end=round(segment.end_frame * frame, 3),
            error_id=known.id if known and verdict is not Verdict.OK else None,
            hint_vi=known.hint_vi if known and verdict is not Verdict.OK else None,
            mouth_tip_vi=mouth_tip if show_hint or verdict is not Verdict.OK else None,
            show_mouth_hint=show_hint,
        )

    # --- prosody ---------------------------------------------------------------

    def _prosody(
        self,
        waveform: object,
        expected: list[ExpectedPhone],
        segments: list[PhoneSegment],
        words: list[WordPronunciations],
        kind: str,
    ) -> list[ProsodyResult]:
        tracks = self._features.extract(waveform)  # type: ignore[arg-type]
        frame = self._recognizer.frame_seconds
        nuclei = [
            SyllableNucleus(
                e.word_index, e.phone.stress or 0, s.start_frame * frame, s.end_frame * frame
            )
            for e, s in zip(expected, segments, strict=True)
            if e.phone.is_vowel
        ]
        analyzer = ProsodyAnalyzer(tracks.f0, tracks.rms, tracks.hop_seconds)
        findings = analyzer.analyze(nuclei, [w.word for w in words], RISE_BY_KIND.get(kind))
        return [
            ProsodyResult(
                aspect=f.aspect, verdict=f.verdict, detail_vi=f.detail_vi, word_index=f.word_index
            )
            for f in findings
        ]

    # --- response + persistence -------------------------------------------------

    def _build_response(
        self,
        data: AssessmentInput,
        words: list[WordPronunciations],
        expected: list[ExpectedPhone],
        phones: list[PhoneResult],
        prosody: list[ProsodyResult],
    ) -> AssessmentResponse:
        word_results: list[WordResult] = []
        for index, word in enumerate(words):
            own = [p for e, p in zip(expected, phones, strict=True) if e.word_index == index]
            word_results.append(
                WordResult(word=word.word, ipa="".join(p.ipa for p in own), phones=own)
            )
        counts = Counter(p.verdict for p in phones)
        return AssessmentResponse(
            id=str(uuid.uuid4()),
            item_id=data.item_id,
            text=data.text,
            model_version=self._recognizer.model_version,
            words=word_results,
            prosody=prosody,
            summary=AssessmentSummary(
                ok=counts[Verdict.OK],
                check=counts[Verdict.CHECK],
                error=counts[Verdict.ERROR],
                focus=self._focus(phones),
                camera_used=any(p.visual is not VisualVerdict.UNAVAILABLE for p in phones),
            ),
        )

    def _focus(self, phones: list[PhoneResult]) -> list[FocusItem]:
        flagged = [p for p in phones if p.error_id]
        counts = Counter(p.error_id for p in flagged)
        by_id = {p.error_id: p for p in flagged}
        priority = {e.id: e.priority for e in self._catalog.all}
        ordered = sorted(
            counts.items(),
            key=lambda kv: (
                0 if by_id[kv[0]].verdict is Verdict.ERROR else 1,
                priority.get(kv[0] or "", 99),
                -kv[1],
            ),
        )
        return [
            FocusItem(
                error_id=error_id or "",
                phoneme=by_id[error_id].symbol,
                ipa=by_id[error_id].ipa,
                hint_vi=by_id[error_id].hint_vi or "",
                count=count,
            )
            for error_id, count in ordered[:FOCUS_LIMIT]
        ]

    def _persist(self, response: AssessmentResponse) -> None:
        rows = [
            PhonemeRow(
                word=word.word,
                phoneme=p.symbol,
                verdict=p.verdict,
                gop=p.gop,
                visual=p.visual.value,
                error_id=p.error_id,
            )
            for word in response.words
            for p in word.phones
        ]
        self._results.add(
            response.id,
            response.item_id,
            response.text,
            response.model_version,
            response.model_dump(mode="json"),
            rows,
        )


def _expected_from(
    words: list[WordPronunciations], chosen: list[tuple[Phone, ...]]
) -> list[ExpectedPhone]:
    expected: list[ExpectedPhone] = []
    for index, phones in enumerate(chosen):
        for position, phone in enumerate(phones):
            expected.append(ExpectedPhone(index, phone, position == len(phones) - 1))
    _ = words
    return expected


def _heard_by_expected(pairs: list[AlignedPair]) -> list[tuple[AlignmentOp, str]]:
    """For each expected phone in order: its alignment op and the heard symbol ('' if deleted)."""
    result: list[tuple[AlignmentOp, str]] = []
    for pair in pairs:
        if pair.op is AlignmentOp.INSERTION:
            continue
        result.append((pair.op, pair.actual))
    return result


def _heard_spans(expected: list[ExpectedPhone], pairs: list[AlignedPair]) -> dict[int, list[str]]:
    """Heard symbols attributed to each word (insertions join the current word)."""
    spans: dict[int, list[str]] = {}
    cursor = -1
    for pair in pairs:
        if pair.op is not AlignmentOp.INSERTION:
            cursor += 1
        if cursor < 0 or cursor >= len(expected):
            continue
        if pair.actual:
            spans.setdefault(expected[cursor].word_index, []).append(pair.actual)
    return spans
