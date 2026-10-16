# Optional container image for the API (the app is local-first; see Makefile `up`).
FROM python:3.12-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
RUN apt-get update && apt-get install -y --no-install-recommends libsndfile1 && rm -rf /var/lib/apt/lists/*
COPY --from=ghcr.io/astral-sh/uv:0.9 /uv /usr/local/bin/uv
WORKDIR /srv/backend
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv sync --frozen --no-dev --no-install-project
COPY backend/app ./app
COPY content /srv/content
COPY vendor/cmudict.dict /srv/vendor/cmudict.dict
COPY web/out /srv/web/out
ENV COACH_CONTENT_DIR=/srv/content COACH_VENDOR_DIR=/srv/vendor COACH_DATA_DIR=/srv/data \
    COACH_WEB_DIST_DIR=/srv/web/out COACH_HOST=0.0.0.0 COACH_DEVICE=cpu
EXPOSE 8765
# Linux containers have no `say`; reference audio is unavailable there (health reports it).
CMD ["uv", "run", "--no-dev", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8765"]
