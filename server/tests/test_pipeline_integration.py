"""パイプライン統合テスト。

`bot.py` の Pipeline 構造のうち、Gemini Live と transport を抜いた
`user_aggregator → LLM → assistant_aggregator` の 3 段を組み立てて
フレームの流れと LLMContext の更新を assert する。

ライブラリ更新時に守りたいもの:
- `LLMContextAggregatorPair` の API シグネチャ
- LLM 系フレーム (LLMRunFrame / LLMFullResponseStart/End / LLMTextFrame)
  の名前と振る舞い
- TranscriptionFrame → ユーザーメッセージのコンテキスト追記フロー
"""

from typing import Any, cast

from pipecat.frames.frames import (
    Frame,
    LLMContextFrame,
    LLMFullResponseEndFrame,
    LLMFullResponseStartFrame,
    LLMRunFrame,
    LLMTextFrame,
    TranscriptionFrame,
)
from pipecat.pipeline.pipeline import Pipeline
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.processors.frame_processor import FrameDirection, FrameProcessor
from pipecat.tests.utils import SleepFrame, run_test


class MockLLM(FrameProcessor):
    """`LLMContextFrame` を受けると固定の LLM 応答シーケンスを emit するモック。

    実 LLM (GeminiLiveLLMService) の挙動のうち、assistant_aggregator が
    依存している `LLMFullResponseStartFrame → LLMTextFrame → LLMFullResponseEndFrame`
    の最小契約だけを再現する。

    NOTE: 上流の `LLMUserAggregator` が `LLMRunFrame` を受け取ると、それを
    consume して `LLMContextFrame` を下流に push する。したがって LLM 役の
    プロセッサが反応すべきは `LLMContextFrame` 側。
    """

    def __init__(self, response_text: str = "Is it apple?"):
        super().__init__()
        self._response_text = response_text
        self.run_count = 0

    async def process_frame(self, frame: Frame, direction: FrameDirection):
        await super().process_frame(frame, direction)

        if isinstance(frame, LLMContextFrame):
            self.run_count += 1
            await self.push_frame(LLMFullResponseStartFrame())
            await self.push_frame(LLMTextFrame(self._response_text))
            await self.push_frame(LLMFullResponseEndFrame())
            return

        await self.push_frame(frame, direction)


def _build_pipeline_and_context() -> tuple[Pipeline, LLMContext, MockLLM]:
    """bot.py と同じ shape の `LLMContextAggregatorPair` を組み立てる。

    bot.py との差分:
    - transport.input() / transport.output() は外す（テスト不要）
    - GeminiLiveLLMService の代わりに MockLLM
    - VAD / mute strategy は今回の assert 対象ではないので外す
      （別ケースを足す際に追加検討）
    """
    messages: list[dict[str, Any]] = [
        {"role": "user", "content": "Start the game."},
    ]
    context = LLMContext(cast(Any, messages))
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(),
    )

    mock_llm = MockLLM()
    pipeline = Pipeline([user_aggregator, mock_llm, assistant_aggregator])
    return pipeline, context, mock_llm


async def test_llm_run_frame_appends_assistant_message_to_context():
    """`LLMRunFrame` を流すと MockLLM が応答 → assistant_aggregator が
    `LLMContext` に assistant ロールでメッセージを追加することを確認。"""
    pipeline, context, mock_llm = _build_pipeline_and_context()

    await run_test(
        pipeline,
        frames_to_send=[LLMRunFrame(), SleepFrame()],
    )

    assert mock_llm.run_count == 1, (
        "MockLLM should observe exactly one LLMContextFrame "
        "(LLMRunFrame is consumed by LLMUserAggregator and re-emitted as LLMContextFrame)"
    )

    # LLMContext は TypedDict 集合を返すが、テストでは dict 同様に扱いたいので cast。
    messages = cast(list[dict[str, Any]], context.get_messages())
    assistant_messages = [m for m in messages if m.get("role") == "assistant"]
    assert len(assistant_messages) == 1, (
        f"Expected one assistant message appended to context, got: {messages!r}"
    )
    content = assistant_messages[0].get("content")
    # content は string か content-parts のリストのどちらか。両対応。
    if isinstance(content, list):
        text = "".join(
            part.get("text", "") for part in content if isinstance(part, dict)
        )
    else:
        text = content or ""
    assert "Is it apple?" in text, (
        f"Expected MockLLM response text in assistant message, got: {content!r}"
    )


async def test_transcription_frame_appends_user_message_to_context():
    """`TranscriptionFrame` を流すと user_aggregator が `LLMContext` に
    user ロールでメッセージを追加することを確認。"""
    pipeline, context, _ = _build_pipeline_and_context()

    transcription = TranscriptionFrame(
        text="It is a red fruit",
        user_id="test-user",
        timestamp="2026-05-23T00:00:00Z",
    )

    await run_test(
        pipeline,
        frames_to_send=[transcription, SleepFrame()],
    )

    messages = cast(list[dict[str, Any]], context.get_messages())
    user_messages = [m for m in messages if m.get("role") == "user"]
    # 初期 user メッセージ ("Start the game.") + 今回流した転写の 2 件
    assert len(user_messages) >= 2, (
        f"Expected initial + transcribed user messages, got: {user_messages!r}"
    )
    latest = user_messages[-1].get("content")
    if isinstance(latest, list):
        text = "".join(
            part.get("text", "") for part in latest if isinstance(part, dict)
        )
    else:
        text = latest or ""
    assert "red fruit" in text, (
        f"Expected transcription text in latest user message, got: {latest!r}"
    )
