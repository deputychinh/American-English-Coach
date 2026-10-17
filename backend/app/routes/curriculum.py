"""The levelled curriculum with the active profile's progress."""

from fastapi import APIRouter, Depends

from app.container import AppContainer
from app.dependencies import get_container, get_profile_id
from app.schemas.curriculum import CurriculumResponse

router = APIRouter(tags=["curriculum"])


@router.get("/curriculum", response_model=CurriculumResponse)
def curriculum(
    container: AppContainer = Depends(get_container),
    profile_id: str = Depends(get_profile_id),
) -> CurriculumResponse:
    """Levels and units; progress counts scored runs of each unit's controlled step."""
    return container.curriculum.curriculum(profile_id)
