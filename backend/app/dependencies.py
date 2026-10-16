"""FastAPI dependencies resolving the container from the application state."""

from fastapi import Request

from app.container import AppContainer


def get_container(request: Request) -> AppContainer:
    """The container built in the lifespan."""
    container: AppContainer = request.app.state.container
    return container
