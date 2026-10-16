"""LLM tutor: turns a stored assessment into a personal Vietnamese explanation (plan D5).

The model never scores. It receives only the structured verdicts the assessor produced and is
told to explain and encourage, not to add errors of its own.
"""

import base64
import json

from app.enums import Verdict
from app.ml.llm_client import ChatClient
from app.repositories.results_repository import ResultsRepository
from app.schemas.assessment import AssessmentResponse

MAX_FLAGGED = 6
MAX_PROSODY = 3

SYSTEM_EXPLAIN = (
    "Bạn là gia sư phát âm tiếng Anh Mỹ cho người Việt. Bạn nhận kết quả đã được máy chấm "
    "(JSON). Nhiệm vụ: giải thích ngắn gọn, thân thiện bằng tiếng Việt (tối đa 120 từ) cho "
    "người học: (1) điều đã làm tốt, (2) tối đa HAI điểm cần sửa lấy đúng từ JSON, với cách đặt "
    "môi/lưỡi/hàm cụ thể và một mẹo luyện. KHÔNG tự thêm lỗi không có trong JSON, KHÔNG chấm "
    "điểm, KHÔNG dùng thuật ngữ khó. Mức 'check' nghĩa là máy chưa chắc, hãy nói 'có thể' thay vì "
    "khẳng định. Viết thành 2-3 câu ngắn, không dùng gạch đầu dòng."
)
SYSTEM_MOUTH = (
    "Bạn là gia sư phát âm tiếng Anh Mỹ cho người Việt. Bạn nhận MỘT ảnh chụp vùng miệng của "
    "người học khi đang phát âm một âm cho trước, cùng mô tả khẩu hình đúng. Hãy nhận xét bằng "
    "tiếng Việt (tối đa 90 từ): môi (tròn/dẹt/khép), hàm (mở nhiều/ít), có thấy răng hay đầu "
    "lưỡi không, và một điều chỉnh cụ thể. Nếu ảnh mờ hoặc không thấy miệng, nói rõ là không "
    "nhận xét được. Không chấm điểm, không khẳng định quá mức."
)


class TutorService:
    """Explain results and mouth photos through the configured chat model."""

    def __init__(
        self, client: ChatClient, results: ResultsRepository, model: str, vision_model: str
    ) -> None:
        self._client = client
        self._results = results
        self._model = model
        self._vision_model = vision_model

    def explain(self, run_id: str) -> str:
        """Vietnamese explanation of one stored run."""
        result = self._results.get(run_id)
        compact = _compact(result)
        messages: list[dict[str, object]] = [
            {"role": "system", "content": SYSTEM_EXPLAIN},
            {"role": "user", "content": json.dumps(compact, ensure_ascii=False)},
        ]
        return self._client.complete(self._model, messages)

    def mouth(self, image_jpeg: bytes, sound_ipa: str, target_vi: str) -> str:
        """Comment on a single mouth photo for a target sound."""
        data_url = "data:image/jpeg;base64," + base64.b64encode(image_jpeg).decode("ascii")
        prompt = f"Âm đích: /{sound_ipa}/. Khẩu hình đúng: {target_vi}"
        messages: list[dict[str, object]] = [
            {"role": "system", "content": SYSTEM_MOUTH},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": data_url}},
                ],
            },
        ]
        return self._client.complete(self._vision_model, messages)


def _compact(result: dict[str, object]) -> dict[str, object]:
    """Only what the tutor needs: text, flagged phones, prosody, counts."""
    parsed = AssessmentResponse.model_validate(result)
    flagged = [
        {
            "word": word.word,
            "phone": phone.ipa,
            "verdict": phone.verdict.value,
            "heard": phone.heard_ipa,
            "hint_vi": phone.hint_vi,
            "mouth_tip_vi": phone.mouth_tip_vi,
            "visual": phone.visual.value,
        }
        for word in parsed.words
        for phone in word.phones
        if phone.verdict is not Verdict.OK
    ]
    prosody = [
        {"aspect": item.aspect.value, "detail_vi": item.detail_vi}
        for item in parsed.prosody
        if item.verdict is not Verdict.OK
    ]
    return {
        "text": parsed.text,
        "ok_count": parsed.summary.ok,
        "flagged": flagged[:MAX_FLAGGED],
        "prosody": prosody[:MAX_PROSODY],
    }
