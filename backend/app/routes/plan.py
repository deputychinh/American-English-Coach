"""Weekly plan of the active profile."""

from fastapi import APIRouter, Depends, Query

from app.container import AppContainer
from app.dependencies import get_container, get_profile_id
from app.schemas.plan import PlanResponse

router = APIRouter(tags=["plan"])
MAX_TZ_OFFSET_MINUTES = 14 * 60
DEFAULT_GOAL_RUNS = 3


@router.get("/plan", response_model=PlanResponse)
def plan(
    tz_offset: int = Query(0, ge=-MAX_TZ_OFFSET_MINUTES, le=MAX_TZ_OFFSET_MINUTES),
    goal: int = Query(DEFAULT_GOAL_RUNS, ge=1, le=50),
    container: AppContainer = Depends(get_container),
    profile_id: str = Depends(get_profile_id),
) -> PlanResponse:
    """Streak, last seven days and today's focus; `tz_offset` is minutes east of UTC."""
    return container.plan.plan(profile_id, tz_offset, goal)
