"""Minimal OpenAI-compatible chat client (OpenAI, Kimi/Moonshot) over httpx.

Provider quirks are isolated here: OpenAI's current models take `max_completion_tokens` and
reject a custom temperature; Kimi takes `max_tokens` and only accepts temperature 1.
"""

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
        max_tokens: int = 1200,
        provider: str = "kimi",
    ) -> None:
        self._max_tokens = max_tokens
        self._provider = provider
        self._client = httpx.Client(
            base_url=base_url.rstrip("/"),
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout_seconds,
            transport=transport,
        )

    def complete(self, model: str, messages: list[dict[str, object]]) -> str:
        """Return the assistant text of the first choice.

        Kimi only accepts temperature 1 and its reasoning models spend tokens on
        `reasoning_content` first. When the visible answer comes back empty, one retry asks for
        the final answer only before giving up.
        """
        content = self._ask(model, messages)
        if content:
            return content
        nudge: list[dict[str, object]] = [
            *messages,
            {"role": "user", "content": "Hãy in thẳng câu trả lời cuối cùng, không suy luận dài."},
        ]
        content = self._ask(model, nudge)
        if not content:
            raise TutorUnavailableError("LLM returned an empty answer")
        return content

    def _payload(self, model: str, messages: list[dict[str, object]]) -> dict[str, object]:
        if self._provider == "openai":
            return {"model": model, "max_completion_tokens": self._max_tokens, "messages": messages}
        return {
            "model": model,
            "temperature": 1,
            "max_tokens": self._max_tokens,
            "messages": messages,
        }

    def _ask(self, model: str, messages: list[dict[str, object]]) -> str:
        try:
            response = self._client.post("/chat/completions", json=self._payload(model, messages))
            response.raise_for_status()
            body = response.json()
            content = body["choices"][0]["message"]["content"]
        except (httpx.HTTPError, KeyError, IndexError, TypeError, ValueError) as error:
            raise TutorUnavailableError(f"LLM request failed: {error}") from error
        return content.strip() if isinstance(content, str) else ""
