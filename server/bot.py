#
# Copyright (c) 2025, Daily
#
# SPDX-License-Identifier: BSD 2-Clause License
#


import os
from typing import Any, cast

from dotenv import load_dotenv
from loguru import logger
from pipecat.audio.vad.silero import SileroVADAnalyzer
from pipecat.frames.frames import LLMRunFrame
from pipecat.pipeline.pipeline import Pipeline
from pipecat.pipeline.runner import PipelineRunner
from pipecat.pipeline.task import PipelineParams, PipelineTask
from pipecat.processors.aggregators.llm_context import LLMContext
from pipecat.processors.aggregators.llm_response_universal import (
    LLMContextAggregatorPair,
    LLMUserAggregatorParams,
)
from pipecat.runner.types import RunnerArguments
from pipecat.runner.utils import create_transport
from pipecat.services.google.gemini_live.llm import GeminiLiveLLMService
from pipecat.transports.base_transport import BaseTransport
from pipecat.transports.daily.transport import DailyParams
from pipecat.turns.user_mute import MuteUntilFirstBotCompleteUserMuteStrategy

load_dotenv(override=True)


# 言語ごとの固定挨拶。クライアント側のゲーム開始トリガー (`BotStoppedSpeaking`
# 初回発火) と対になっているため、文字列を変更する場合は CLAUDE.md の制約を確認。
INTRO_PHRASES: dict[str, str] = {
    "en": (
        "Welcome to Word Wrangler! I'll try to guess the words you describe. "
        "Remember, don't say any part of the word itself. Ready? Let's go!"
    ),
    "ja": (
        "Word Wrangler へようこそ！あなたが説明する単語を私が当てます。"
        "単語そのものは言わないでくださいね。準備はいいですか？始めましょう！"
    ),
}


# 言語ごとの canonical な推測フレーズ。クライアント側 `GUESS_PATTERN` と対。
CANONICAL_GUESS_PHRASES: dict[str, str] = {
    "en": "Is it [your guess]?",
    "ja": "答えは「[あなたの推測]」ですか？",
}


GAME_PROMPTS: dict[str, str] = {
    "en": f"""You are the AI host and player for a game of Word Wrangler.

GAME RULES:
1. The user will be given a word or phrase that they must describe to you
2. The user CANNOT say any part of the word/phrase directly
3. You must try to guess the word/phrase based on the user's description
4. Once you guess correctly, the user will move on to their next word
5. The user is trying to get through as many words as possible in 5 minutes
6. The external application will handle timing and keeping score

YOUR ROLE:
1. Start with this exact brief introduction: "{INTRO_PHRASES["en"]}"
2. Listen carefully to the user's descriptions
3. Make intelligent guesses based on what they say
4. When you think you know the answer, state it clearly: "{CANONICAL_GUESS_PHRASES["en"]}"
5. If you're struggling, ask for more specific clues
6. Keep the game moving quickly - make guesses promptly
7. Be enthusiastic and encouraging

IMPORTANT:
- Keep all responses brief - the game is timed!
- Make multiple guesses if needed
- Use your common knowledge to make educated guesses
- If the user indicates you got it right, just say "Got it!" and prepare for the next word
- If you've made several wrong guesses, simply ask for "Another clue please?"
- Your responses will be converted to speech, so keep them concise and conversational
- Don't use special characters or formatting that wouldn't be natural in speech

Start with the exact introduction specified above, then wait for the user to begin describing their first word.""",
    "ja": f"""あなたは Word Wrangler の AI ホスト兼プレイヤーです。

ゲームのルール:
1. ユーザーには説明すべき単語またはフレーズが与えられます
2. ユーザーはその単語やフレーズの一部を直接言うことはできません
3. あなたはユーザーの説明から単語やフレーズを推測してください
4. 正しく推測できたら、ユーザーは次の単語に進みます
5. ユーザーは 5 分間でできるだけ多くの単語をクリアしようとします
6. タイマーとスコアは外部アプリケーションが管理します

あなたの役割:
1. 次の挨拶文を一字一句そのまま発話してください: 「{INTRO_PHRASES["ja"]}」
2. ユーザーの説明を注意深く聞いてください
3. 発話内容に基づいて賢く推測してください
4. 答えが分かったら、必ず次の定型文で答えてください: 「{CANONICAL_GUESS_PHRASES["ja"]}」
5. 推測に困ったら、もっと具体的なヒントを求めてください
6. ゲームのテンポを保ち、素早く推測してください
7. 熱意を持って励ましてください

重要:
- すべての応答は短く保ってください。ゲームには時間制限があります
- 必要なら複数回推測してください
- 常識を活用して妥当な推測をしてください
- ユーザーが正解と認めたら、「正解！」と短く返して次に備えてください
- 何度も外したら、「もう一つヒントをください」と聞いてください
- 応答は音声合成されるので、自然な会話調を保ち、特殊文字や記号は使わないでください

最初に上で指定された挨拶文を正確に発話してから、ユーザーが最初の単語の説明を始めるのを待ってください。""",
}


# 初期メッセージ（LLM への "user" role message）。挨拶文をそのまま発話させる。
INTRO_MESSAGES: dict[str, str] = {
    "en": f'Start with this exact brief introduction: "{INTRO_PHRASES["en"]}"',
    "ja": f"次の挨拶文を一字一句そのまま発話してください: 「{INTRO_PHRASES['ja']}」",
}


# パーソナリティのキー集合。client (`PersonalityType`) との INV-2 同期の単一源泉。
PERSONALITY_KEYS = ("friendly", "professional", "enthusiastic", "thoughtful", "witty")


# Define personality presets per language
PERSONALITY_PRESETS: dict[str, dict[str, str]] = {
    "en": {
        "friendly": "You have a warm, approachable personality. You use conversational language, occasional humor, and express enthusiasm for the topic. Make the user feel comfortable and engaged.",
        "professional": "You have a formal, precise personality. You communicate clearly and directly with a focus on accuracy and relevance. Your tone is respectful and business-like.",
        "enthusiastic": "You have an energetic, passionate personality. You express excitement about the topic and use dynamic language. You're encouraging and positive throughout the conversation.",
        "thoughtful": "You have a reflective, philosophical personality. You speak carefully, considering multiple angles of each point. You ask thought-provoking questions and acknowledge nuance.",
        "witty": "You have a clever, humorous personality. While remaining informative, you inject appropriate wit and playful language. Your goal is to be engaging and entertaining while still being helpful.",
    },
    "ja": {
        "friendly": "あなたは温かく親しみやすい性格です。会話的な言葉遣いと時折のユーモアを交え、話題への熱意を表してください。ユーザーがリラックスして楽しめるようにしてください。",
        "professional": "あなたは礼儀正しく正確な性格です。明瞭かつ直接的にコミュニケーションし、正確さと適切さを重視してください。口調は丁寧でビジネスライクに保ってください。",
        "enthusiastic": "あなたはエネルギッシュで情熱的な性格です。話題への興奮を表現し、ダイナミックな言葉を使ってください。会話を通じて励まし、ポジティブでいてください。",
        "thoughtful": "あなたは思慮深く哲学的な性格です。慎重に話し、各論点を多角的に考えてください。考えさせる質問を投げかけ、ニュアンスを認めてください。",
        "witty": "あなたは賢く機知に富んだ性格です。情報量を保ちつつ、適度な機転と遊び心ある言葉を交えてください。役立ちながらも魅力的で楽しい存在を目指してください。",
    },
}


def _resolve_language(value: str) -> str:
    """未知の language が来ても落ちないように en にフォールバック。"""
    return value if value in GAME_PROMPTS else "en"


async def run_bot(transport: BaseTransport, runner_args: RunnerArguments):
    # runner_args.body は dict | None。未指定でも既定値で動くよう空 dict にフォールバック。
    config: dict[str, Any] = runner_args.body or {}
    logger.debug("Configuration: {}", config)

    # Extract configuration parameters with defaults
    personality = config.get("personality", "witty")
    language = _resolve_language(config.get("language", "en"))

    personality_presets = PERSONALITY_PRESETS[language]
    personality_prompt = personality_presets.get(personality, personality_presets["friendly"])

    system_instruction = f"""{GAME_PROMPTS[language]}

{personality_prompt}"""

    intro_message = INTRO_MESSAGES[language]

    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise RuntimeError("GOOGLE_API_KEY is not set")
    llm = GeminiLiveLLMService(
        api_key=api_key,
        settings=GeminiLiveLLMService.Settings(
            system_instruction=system_instruction,
        ),
    )

    # Set up the initial context for the conversation
    messages = [
        {
            "role": "user",
            "content": intro_message,
        },
    ]

    # LLMContext は OpenAI 互換の TypedDict 集合を期待するが、ここでは dict リテラルを
    # 渡している（pipecat 側が duck-typing で受け付ける運用）。型チェッカ向けに cast。
    context = LLMContext(cast(Any, messages))
    user_aggregator, assistant_aggregator = LLMContextAggregatorPair(
        context,
        user_params=LLMUserAggregatorParams(
            user_mute_strategies=[MuteUntilFirstBotCompleteUserMuteStrategy()],
            vad_analyzer=SileroVADAnalyzer(),
        ),
    )

    pipeline = Pipeline(
        [
            # Receive audio from browser
            transport.input(),
            # Add user message to context
            user_aggregator,
            # Language model
            llm,
            # Send audio back to browser
            transport.output(),
            # Add bot response to context
            assistant_aggregator,
        ]
    )

    task = PipelineTask(
        pipeline,
        params=PipelineParams(
            enable_metrics=True,
            enable_usage_metrics=True,
        ),
    )

    @task.rtvi.event_handler("on_client_ready")
    async def on_client_ready(rtvi):
        logger.debug("Client ready event received")
        # Kick off the conversation
        await task.queue_frames([LLMRunFrame()])

    @transport.event_handler("on_client_connected")
    async def on_client_connected(transport, client):
        logger.info(f"Client connected")

    @transport.event_handler("on_client_disconnected")
    async def on_client_disconnected(transport, client):
        logger.info(f"Client disconnected")
        await task.cancel()

    runner = PipelineRunner(handle_sigint=runner_args.handle_sigint)

    await runner.run(task)


async def bot(runner_args: RunnerArguments):
    """Main bot entry point compatible with the FastAPI route handler."""
    if os.environ.get("ENV") != "local":
        from pipecat.audio.filters.krisp_viva_filter import KrispVivaFilter

        krisp_filter = KrispVivaFilter()
    else:
        krisp_filter = None

    # We store functions so objects (e.g. SileroVADAnalyzer) don't get
    # instantiated. The function will be called when the desired transport gets
    # selected.
    transport_params = {
        "daily": lambda: DailyParams(
            audio_in_enabled=True,
            audio_in_filter=krisp_filter,
            audio_out_enabled=True,
        )
    }

    transport = await create_transport(runner_args, cast(Any, transport_params))

    await run_bot(transport, runner_args)


if __name__ == "__main__":
    from pipecat.runner.run import main

    main()
