"""Learner profiles: list, create, rename, delete, export and import."""

from datetime import UTC, datetime

from app.errors import DomainError
from app.repositories.calibration_repository import CalibrationRepository
from app.repositories.profile_repository import ProfileRepository, ProfileRow, is_default
from app.repositories.results_repository import ExportedRun, PhonemeRow, ResultsRepository
from app.schemas.profiles import (
    EXPORT_FORMAT,
    ExportedPhonemeModel,
    ExportedRunModel,
    ImportResult,
    ProfileExport,
    ProfileModel,
)


class ProfileService:
    """Keeps the default profile undeletable and moves runs + calibration as one unit."""

    def __init__(
        self,
        profiles: ProfileRepository,
        results: ResultsRepository,
        calibration: CalibrationRepository,
    ) -> None:
        self._profiles = profiles
        self._results = results
        self._calibration = calibration

    def list(self) -> list[ProfileModel]:
        """All profiles."""
        return [_model(p) for p in self._profiles.list()]

    def create(self, name: str) -> ProfileModel:
        """A new empty profile."""
        return _model(self._profiles.create(name))

    def rename(self, profile_id: str, name: str) -> ProfileModel:
        """Change a profile's name."""
        return _model(self._profiles.rename(profile_id, name))

    def delete(self, profile_id: str) -> None:
        """Delete a profile and everything it owns; the default profile stays."""
        if is_default(profile_id):
            raise DomainError("the default profile cannot be deleted; rename it instead")
        self._profiles.delete(profile_id)

    def export(self, profile_id: str) -> ProfileExport:
        """Portable snapshot of one profile."""
        profile = self._profiles.get(profile_id)
        return ProfileExport(
            format=EXPORT_FORMAT,
            exported_at=datetime.now(UTC),
            profile=_model(profile),
            calibration=self._calibration.get(profile_id),
            runs=[
                ExportedRunModel(
                    id=r.id,
                    item_id=r.item_id,
                    text=r.text,
                    model_version=r.model_version,
                    created_at=r.created_at,
                    disputed=r.disputed,
                    result=r.result,
                    phonemes=[
                        ExportedPhonemeModel(
                            word=p.word,
                            phoneme=p.phoneme,
                            verdict=p.verdict,
                            gop=p.gop,
                            visual=p.visual,
                            error_id=p.error_id,
                        )
                        for p in r.phonemes
                    ],
                )
                for r in self._results.export(profile_id)
            ],
        )

    def import_snapshot(self, snapshot: ProfileExport, name: str | None = None) -> ImportResult:
        """Create a new profile from a snapshot; runs already present (same id) are skipped."""
        created = self._profiles.create(name or snapshot.profile.name)
        runs = [
            ExportedRun(
                r.id,
                r.item_id,
                r.text,
                r.model_version,
                r.created_at,
                r.disputed,
                r.result,
                [
                    PhonemeRow(p.word, p.phoneme, p.verdict, p.gop, p.visual, p.error_id)
                    for p in r.phonemes
                ],
            )
            for r in snapshot.runs
        ]
        imported, skipped = self._results.import_runs(created.id, runs)
        if snapshot.calibration is not None:
            self._calibration.save(snapshot.calibration, created.id)
        return ImportResult(
            profile=_model(self._profiles.get(created.id)),
            imported_runs=imported,
            skipped_runs=skipped,
        )


def _model(row: ProfileRow) -> ProfileModel:
    return ProfileModel(id=row.id, name=row.name, created_at=row.created_at, runs=row.runs)
