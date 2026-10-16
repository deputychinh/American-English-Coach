"""Lesson content."""

from fastapi import APIRouter, Depends

from app.container import AppContainer
from app.dependencies import get_container
from app.schemas.content import (
    KnownErrorCard,
    MinimalPair,
    PhonemeCard,
    Sentence,
    SoundDrill,
    SoundDrillSummary,
    VisemeContent,
)

router = APIRouter(prefix="/content", tags=["content"])


@router.get("/phonemes", response_model=list[PhonemeCard])
def phonemes(container: AppContainer = Depends(get_container)) -> list[PhonemeCard]:
    """The 44-sound chart."""
    return container.content.phonemes()


@router.get("/pairs", response_model=list[MinimalPair])
def pairs(container: AppContainer = Depends(get_container)) -> list[MinimalPair]:
    """Minimal pairs."""
    return container.content.pairs()


@router.get("/sentences", response_model=list[Sentence])
def sentences(container: AppContainer = Depends(get_container)) -> list[Sentence]:
    """Practice sentences."""
    return container.content.sentences()


@router.get("/errors", response_model=list[KnownErrorCard])
def errors(container: AppContainer = Depends(get_container)) -> list[KnownErrorCard]:
    """Error catalogue."""
    return container.content.errors()


@router.get("/visemes", response_model=VisemeContent)
def visemes(container: AppContainer = Depends(get_container)) -> VisemeContent:
    """Mouth-shape targets and calibration steps."""
    return container.content.visemes()


@router.get("/sounds", response_model=list[SoundDrillSummary])
def sounds(container: AppContainer = Depends(get_container)) -> list[SoundDrillSummary]:
    """Every chart sound with the size of its drill."""
    return container.content.drills()


@router.get("/sounds/{sound_id}", response_model=SoundDrill)
def sound(sound_id: str, container: AppContainer = Depends(get_container)) -> SoundDrill:
    """Words, pairs and sentences validated against CMUdict for one sound."""
    return container.content.drill(sound_id)
