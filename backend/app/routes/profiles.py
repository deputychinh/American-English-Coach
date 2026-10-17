"""Learner profiles; the active one travels in `X-Coach-Profile` on every other request."""

from fastapi import APIRouter, Depends, Query

from app.container import AppContainer
from app.dependencies import get_container
from app.schemas.profiles import (
    ImportResult,
    ProfileCreate,
    ProfileExport,
    ProfileModel,
)

router = APIRouter(prefix="/profiles", tags=["profiles"])


@router.get("", response_model=list[ProfileModel])
def list_profiles(container: AppContainer = Depends(get_container)) -> list[ProfileModel]:
    """Every profile with its run count."""
    return container.profile_service.list()


@router.post("", response_model=ProfileModel, status_code=201)
def create_profile(
    body: ProfileCreate, container: AppContainer = Depends(get_container)
) -> ProfileModel:
    """Create an empty profile."""
    return container.profile_service.create(body.name)


@router.patch("/{profile_id}", response_model=ProfileModel)
def rename_profile(
    profile_id: str, body: ProfileCreate, container: AppContainer = Depends(get_container)
) -> ProfileModel:
    """Rename a profile."""
    return container.profile_service.rename(profile_id, body.name)


@router.delete("/{profile_id}", status_code=204)
def delete_profile(profile_id: str, container: AppContainer = Depends(get_container)) -> None:
    """Delete a profile with its runs and calibration (not the default one)."""
    container.profile_service.delete(profile_id)


@router.get("/{profile_id}/export", response_model=ProfileExport)
def export_profile(
    profile_id: str, container: AppContainer = Depends(get_container)
) -> ProfileExport:
    """Download everything the profile owns as JSON."""
    return container.profile_service.export(profile_id)


@router.post("/import", response_model=ImportResult, status_code=201)
def import_profile(
    snapshot: ProfileExport,
    name: str | None = Query(default=None, min_length=1, max_length=80),
    container: AppContainer = Depends(get_container),
) -> ImportResult:
    """Create a new profile from an export file."""
    return container.profile_service.import_snapshot(snapshot, name)
