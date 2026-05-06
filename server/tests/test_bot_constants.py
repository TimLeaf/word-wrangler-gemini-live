"""bot.py の純粋データ部分（定数とプロンプト文字列）を固定するテスト。

Pipecat ランタイムには触らない。INV-2 / INV-3 / INV-4 を server 側から
直接 assert することで、client 側のテキスト読みテストとの双方向ガード
を成立させる。
"""

from bot import PERSONALITY_PRESETS, game_prompt

EXPECTED_PERSONALITY_KEYS = {
    "friendly",
    "professional",
    "enthusiastic",
    "thoughtful",
    "witty",
}

EXPECTED_INTRO = (
    "Welcome to Word Wrangler! I'll try to guess the words you describe. "
    "Remember, don't say any part of the word itself. Ready? Let's go!"
)


def test_personality_presets_keys_and_values():
    """INV-2 (server 視点): キー集合が固定 5 種で、値はすべて非空文字列。"""
    assert set(PERSONALITY_PRESETS.keys()) == EXPECTED_PERSONALITY_KEYS
    for key, value in PERSONALITY_PRESETS.items():
        assert isinstance(value, str), f"{key} の値が str ではありません"
        assert value.strip(), f"{key} の値が空です"


def test_game_prompt_contains_fixed_intro():
    """INV-3 (server 視点): client のゲーム開始トリガーが依存する固定挨拶文を含む。

    この文言を変更すると client の `BotStoppedSpeaking` 初回発火フローと整合が
    取れなくなる可能性があるため、完全一致で固定する。
    """
    assert EXPECTED_INTRO in game_prompt


def test_game_prompt_contains_is_it_directive():
    """INV-4 (server 視点): client の `GUESS_PATTERN` が依存する応答形式の指示文を含む。"""
    assert "Is it [your guess]?" in game_prompt
