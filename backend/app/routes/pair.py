"""Device pairing for phones on the network."""

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from app.container import AppContainer
from app.dependencies import get_container
from app.security import check_pairing_code

router = APIRouter(tags=["pairing"])


class PairRequest(BaseModel):
    """The six-digit code shown by `make api-lan` and a name for the phone."""

    code: str = Field(min_length=6, max_length=6)
    device_name: str = Field(min_length=1, max_length=80)


class PairResponse(BaseModel):
    """Token to send as `X-Coach-Token` on every later request."""

    token: str
    device_name: str


@router.post("/pair", response_model=PairResponse)
def pair(body: PairRequest, container: AppContainer = Depends(get_container)) -> PairResponse:
    """Exchange the pairing code for a device token."""
    check_pairing_code(body.code, container.pairing_code)
    token = container.devices.create(body.device_name)
    return PairResponse(token=token, device_name=body.device_name[:80])
