"""The 14-day course with the active profile's progress."""

from fastapi import APIRouter, Depends

from app.container import AppContainer
from app.dependencies import get_container, get_profile_id
from app.schemas.course import CourseResponse

router = APIRouter(tags=["course"])


@router.get("/course", response_model=CourseResponse)
def course(
    container: AppContainer = Depends(get_container),
    profile_id: str = Depends(get_profile_id),
) -> CourseResponse:
    """Days, items and which day to do next."""
    return container.course.course(profile_id)
