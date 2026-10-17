"""Progress, history, disputes and calibration (per learner profile)."""

from fastapi import APIRouter, Depends, Query
from fastapi.responses import JSONResponse

from app.container import AppContainer
from app.dependencies import get_container, get_profile_id
from app.schemas.progress import CalibrationPayload, ProgressResponse

router = APIRouter(tags=["progress"])


@router.get("/progress", response_model=ProgressResponse)
def progress(
    limit: int = Query(20, ge=1, le=100),
    container: AppContainer = Depends(get_container),
    profile_id: str = Depends(get_profile_id),
) -> ProgressResponse:
    """Per-sound totals and recent runs of the active profile."""
    return container.progress.summary(profile_id, limit)


@router.get("/runs/{run_id}")
def run(run_id: str, container: AppContainer = Depends(get_container)) -> JSONResponse:
    """A stored assessment result."""
    return JSONResponse(container.progress.run(run_id))


@router.post("/runs/{run_id}/dispute", status_code=204)
def dispute(run_id: str, container: AppContainer = Depends(get_container)) -> None:
    """Learner says "Tôi nói đúng mà"; kept as false-alarm evidence."""
    container.progress.dispute(run_id)


@router.get("/calibration", response_model=CalibrationPayload | None)
def calibration(
    container: AppContainer = Depends(get_container),
    profile_id: str = Depends(get_profile_id),
) -> CalibrationPayload | None:
    """Stored mouth calibration of the active profile, if any."""
    stored = container.progress.calibration(profile_id)
    return CalibrationPayload(features=stored) if stored is not None else None


@router.put("/calibration", status_code=204)
def save_calibration(
    payload: CalibrationPayload,
    container: AppContainer = Depends(get_container),
    profile_id: str = Depends(get_profile_id),
) -> None:
    """Replace the mouth calibration of the active profile."""
    container.progress.save_calibration(profile_id, payload.features)
