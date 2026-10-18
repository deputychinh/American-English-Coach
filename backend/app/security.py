"""Pairing: phones on the network must present a token obtained with the one-time pairing code.

Requests from the machine itself (loopback) never need a token, so the web app on the Mac keeps
working without any setup. Everything else needs `X-Coach-Token` except the probes and `/pair`.
"""

import ipaddress
import secrets

from fastapi import Request

from app.constants import API_PREFIX
from app.errors import UnauthorizedError

TOKEN_HEADER = "X-Coach-Token"  # noqa: S105 - a header name, not a secret
OPEN_PATHS = frozenset({f"{API_PREFIX}/health", f"{API_PREFIX}/ready", f"{API_PREFIX}/pair"})
PAIRING_CODE_DIGITS = 6


def new_pairing_code() -> str:
    """Six digits, shown in the terminal when the API starts on the network."""
    return f"{secrets.randbelow(10**PAIRING_CODE_DIGITS):0{PAIRING_CODE_DIGITS}d}"


def is_loopback(host: str | None) -> bool:
    """Loopback or unknown (test client) addresses are treated as the local machine."""
    if not host:
        return True
    try:
        return ipaddress.ip_address(host).is_loopback
    except ValueError:
        return host == "testclient"


def requires_token(request: Request, *, trust_loopback: bool = True) -> bool:
    """Only network clients calling the API (not the static web files) need a token."""
    path = request.url.path
    if not path.startswith(API_PREFIX) or path in OPEN_PATHS:
        return False
    if not trust_loopback:
        return True
    return not is_loopback(request.client.host if request.client else None)


def check_pairing_code(given: str, expected: str) -> None:
    """Constant-time comparison; raises on mismatch."""
    if not secrets.compare_digest(given.strip(), expected):
        raise UnauthorizedError("pairing code does not match")
