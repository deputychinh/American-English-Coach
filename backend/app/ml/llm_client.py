"""Minimal OpenAI-compatible chat client (Kimi/Moonshot, OpenAI) over httpx."""

import httpx

from app.errors import TutorUnavailableError


class ChatClient:
    """Sends chat completions; raises a typed error on any transport or provider failure."""

    def __init__(
        self,
        base_url: str,
        api_key: str,
        timeout_seconds: float,
        transport: httpx.BaseTransport | None = None,
    ) -> None:
        self._client = httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout_seconds,
            transport=transport,
        )

    def complete(self, model: str, messages: list[dict[str, object]]) -> str:
        """Return the assistant text of the first choice (Kimi only accepts temperature 1)."""
        try:
            response = self._client.post(
                "/chat/completions",
                json={"model": model, "temperature": 1, "messages": messages},
            )
            response.raise_for_status()
            body = response.json()
            content = body["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as error:
            raise TutorUnavailableError(f"LLM request failed: {error}") from error
        if not isinstance(content, str) or not content.strip():
            raise TutorUnavailableError("LLM returned an empty answer")
        return content.strip()
