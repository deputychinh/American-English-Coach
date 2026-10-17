"""FastAPI dependencies resolving the container and the active learner profile."""

from fastapi import Header, Request

from app.container import AppContainer
from app.db.models import DEFAULT_PROFILE_ID
from app.errors import NotFoundError

PROFILE_HEADER = "X-Coach-Profile"


def get_container(request: Request) -> AppContainer:
    """The container built in the lifespan."""
    container: AppContainer = request.app.state.container
    return container


def get_profile_id(
    request: Request, x_coach_profile: str | None = Header(default=None, max_length=32)
) -> str:
    """The profile named by `X-Coach-Profile`; absent or blank means the implicit default."""
    profile_id = (x_coach_profile or "").strip() or DEFAULT_PROFILE_ID
    if profile_id != DEFAULT_PROFILE_ID and not get_container(request).profiles.exists(profile_id):
        raise NotFoundError(f"profile {profile_id} not found (chọn lại hồ sơ trong Cài đặt)")
    return profile_id
