"""Machine-measured progress and run history."""

from app.domain.phoneme_inventory import ARPABET_IPA
from app.repositories.calibration_repository import CalibrationRepository
from app.repositories.results_repository import ResultsRepository
from app.schemas.progress import PhonemeStatModel, ProgressResponse, RunSummaryModel


class ProgressService:
    """Reads aggregates from the results repository."""

    def __init__(self, results: ResultsRepository, calibration: CalibrationRepository) -> None:
        self._results = results
        self._calibration = calibration

    def summary(self, recent_limit: int = 20) -> ProgressResponse:
        """Per-sound totals and the latest runs."""
        recent = [
            RunSummaryModel(
                id=r.id,
                item_id=r.item_id,
                text=r.text,
                created_at=r.created_at,
                ok=r.ok_count,
                check=r.check_count,
                error=r.error_count,
                model_version=r.model_version,
                disputed=r.disputed,
            )
            for r in self._results.recent(recent_limit)
        ]
        phonemes = [
            PhonemeStatModel(
                phoneme=s.phoneme,
                ipa=ARPABET_IPA.get(s.phoneme, "?"),
                total=s.total,
                ok=s.ok,
                check=s.check,
                error=s.error,
            )
            for s in self._results.phoneme_stats()
        ]
        return ProgressResponse(runs=len(recent), phonemes=phonemes, recent=recent)

    def run(self, run_id: str) -> dict[str, object]:
        """Stored result of one run."""
        return self._results.get(run_id)

    def dispute(self, run_id: str) -> None:
        """Learner disagrees with the verdicts; recorded as false-alarm data."""
        self._results.dispute(run_id)

    def save_calibration(self, features: dict[str, dict[str, float]]) -> None:
        """Persist the mouth calibration."""
        self._calibration.save(features)

    def calibration(self) -> dict[str, dict[str, float]] | None:
        """Stored calibration if any."""
        return self._calibration.get()
