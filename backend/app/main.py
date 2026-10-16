"""FastAPI application factory."""

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from http import HTTPStatus

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.config import Settings, get_settings
from app.constants import API_PREFIX
from app.container import AppContainer
from app.domain.ports import PhonemeRecognizer
from app.enums import ErrorCode
from app.errors import DomainError
from app.logging_setup import configure_logging
from app.ml.llm_client import ChatClient
from app.routes import assess, audio, content, health, progress, tutor

logger = logging.getLogger(__name__)

STATUS_BY_CODE: dict[ErrorCode, HTTPStatus] = {
    ErrorCode.VALIDATION: HTTPStatus.BAD_REQUEST,
    ErrorCode.NOT_FOUND: HTTPStatus.NOT_FOUND,
    ErrorCode.AUDIO_INVALID: HTTPStatus.UNPROCESSABLE_ENTITY,
    ErrorCode.AUDIO_TOO_LONG: HTTPStatus.REQUEST_ENTITY_TOO_LARGE,
    ErrorCode.WORD_UNKNOWN: HTTPStatus.UNPROCESSABLE_ENTITY,
    ErrorCode.MODEL_UNAVAILABLE: HTTPStatus.SERVICE_UNAVAILABLE,
    ErrorCode.TTS_UNAVAILABLE: HTTPStatus.SERVICE_UNAVAILABLE,
    ErrorCode.TUTOR_UNAVAILABLE: HTTPStatus.SERVICE_UNAVAILABLE,
}


def problem(status: HTTPStatus, code: str, detail: str) -> JSONResponse:
    """RFC 9457 body."""
    body = {
        "type": f"https://coach.local/errors/{code.lower()}",
        "title": status.phrase,
        "status": status.value,
        "detail": detail,
        "code": code,
    }
    return JSONResponse(body, status_code=status.value, media_type="application/problem+json")


def create_app(
    settings: Settings | None = None,
    recognizer: PhonemeRecognizer | None = None,
    chat_client: ChatClient | None = None,
) -> FastAPI:
    """Build the app; tests pass settings pointing at a temp dir and a fake recogniser."""
    resolved = settings or get_settings()
    configure_logging(resolved.log_level)

    @asynccontextmanager
    async def lifespan(app: FastAPI) -> AsyncIterator[None]:
        app.state.container = AppContainer(resolved, recognizer, chat_client)
        logger.info("coach api ready")
        yield

    app = FastAPI(
        title="American English Coach API",
        version="1.0.0",
        lifespan=lifespan,
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=resolved.cors_origins,
        allow_methods=["GET", "POST", "PUT"],
        allow_headers=["*"],
    )
    routers = (
        health.router,
        content.router,
        assess.router,
        audio.router,
        progress.router,
        tutor.router,
    )
    for router in routers:
        app.include_router(router, prefix=API_PREFIX)

    @app.exception_handler(DomainError)
    async def _domain_error(_request: Request, error: DomainError) -> JSONResponse:
        status = STATUS_BY_CODE.get(error.code, HTTPStatus.BAD_REQUEST)
        return problem(status, error.code.value, error.message)

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_request: Request, error: RequestValidationError) -> JSONResponse:
        return problem(HTTPStatus.BAD_REQUEST, ErrorCode.VALIDATION.value, str(error.errors()[:3]))

    if resolved.web_dist_dir is not None and resolved.web_dist_dir.exists():
        app.mount("/", StaticFiles(directory=resolved.web_dist_dir, html=True), name="web")
    return app


app = create_app()
