"""JSON logging: one object per line, extras included, never request bodies or secrets."""

import json
import logging
from datetime import UTC, datetime

STANDARD_ATTRIBUTES = frozenset(
    logging.LogRecord("", 0, "", 0, "", None, None).__dict__.keys()
    | {"message", "asctime", "taskName"}
)


class JsonFormatter(logging.Formatter):
    """Serialises the record and any `extra={...}` fields."""

    def format(self, record: logging.LogRecord) -> str:
        """Render one JSON line."""
        payload: dict[str, object] = {
            "time": datetime.fromtimestamp(record.created, tz=UTC).isoformat(
                timespec="milliseconds"
            ),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for key, value in record.__dict__.items():
            if key not in STANDARD_ATTRIBUTES and not key.startswith("_"):
                payload[key] = value
        if record.exc_info:
            payload["exception"] = self.formatException(record.exc_info)
        return json.dumps(payload, ensure_ascii=False, default=str)


def configure_logging(level: str, json_lines: bool = True) -> None:
    """Configure the root logger once; `json_lines=False` keeps the plain format for scripts."""
    handler = logging.StreamHandler()
    if json_lines:
        handler.setFormatter(JsonFormatter())
    else:
        handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(name)s %(message)s"))
    logging.basicConfig(level=level.upper(), handlers=[handler], force=True)
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
