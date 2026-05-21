"""bot.py の純粋データ部分（定数とプロンプト文字列）を固定するテスト。

Pipecat ランタイムには触らない。INV-2 / INV-3 / INV-4 を server 側から
直接 assert することで、client 側のテキスト読みテストとの双方向ガード
を成立させる。
"""

import pytest

from bot import (
    CANONICAL_GUESS_PHRASES,
    GAME_PROMPTS,
    INTRO_MESSAGES,
    INTRO_PHRASES,
    PERSONALITY_KEYS,
    PERSONALITY_PRESETS,
)

EXPECTED_PERSONALITY_KEYS = {
    "friendly",
    "professional",
    "enthusiastic",
    "thoughtful",
    "witty",
}

EXPECTED_LANGUAGES = {"en", "ja"}

EXPECTED_INTRO_PHRASES = {
    "en": (
        "Welcome to Word Wrangler! I'll try to guess the words you describe. "
        "Remember, don't say any part of the word itself. Ready? Let's go!"
    ),
    "ja": (
        "Word Wrangler へようこそ！あなたが説明する単語を私が当てます。"
        "単語そのものは言わないでくださいね。準備はいいですか？始めましょう！"
    ),
}

EXPECTED_CANONICAL_GUESS_PHRASES = {
    "en": "Is it [your guess]?",
    "ja": "答えは「[あなたの推測]」ですか？",
}


def test_personality_keys_match():
    """INV-2 (server 視点): 単一源泉 `PERSONALITY_KEYS` が固定 5 種。"""
    assert set(PERSONALITY_KEYS) == EXPECTED_PERSONALITY_KEYS


@pytest.mark.parametrize("lang", sorted(EXPECTED_LANGUAGES))
def test_personality_presets_keys_and_values(lang: str):
    """INV-2 (server 視点): 各言語の PERSONALITY_PRESETS が 5 キー揃い、値はすべて非空。"""
    assert lang in PERSONALITY_PRESETS, f"PERSONALITY_PRESETS に言語 {lang} がありません"
    presets = PERSONALITY_PRESETS[lang]
    assert set(presets.keys()) == set(PERSONALITY_KEYS)
    for key, value in presets.items():
        assert isinstance(value, str), f"{lang}/{key} の値が str ではありません"
        assert value.strip(), f"{lang}/{key} の値が空です"


def test_supported_languages():
    """GAME_PROMPTS / INTRO_MESSAGES / INTRO_PHRASES / CANONICAL_GUESS_PHRASES /
    PERSONALITY_PRESETS が同じ言語キー集合を持つ。"""
    assert set(GAME_PROMPTS.keys()) == EXPECTED_LANGUAGES
    assert set(INTRO_MESSAGES.keys()) == EXPECTED_LANGUAGES
    assert set(INTRO_PHRASES.keys()) == EXPECTED_LANGUAGES
    assert set(CANONICAL_GUESS_PHRASES.keys()) == EXPECTED_LANGUAGES
    assert set(PERSONALITY_PRESETS.keys()) == EXPECTED_LANGUAGES


@pytest.mark.parametrize("lang", sorted(EXPECTED_LANGUAGES))
def test_game_prompt_contains_fixed_intro(lang: str):
    """INV-3 (server 視点): client のゲーム開始トリガーが依存する固定挨拶文を含む。

    この文言を変更すると client の `BotStoppedSpeaking` 初回発火フローと整合が
    取れなくなる可能性があるため、完全一致で固定する。
    """
    assert INTRO_PHRASES[lang] == EXPECTED_INTRO_PHRASES[lang]
    assert INTRO_PHRASES[lang] in GAME_PROMPTS[lang]
    assert INTRO_PHRASES[lang] in INTRO_MESSAGES[lang]


@pytest.mark.parametrize("lang", sorted(EXPECTED_LANGUAGES))
def test_game_prompt_contains_canonical_guess_phrase(lang: str):
    """INV-4 (server 視点): client の `GUESS_PATTERN` が依存する応答形式の指示文を含む。"""
    assert CANONICAL_GUESS_PHRASES[lang] == EXPECTED_CANONICAL_GUESS_PHRASES[lang]
    assert CANONICAL_GUESS_PHRASES[lang] in GAME_PROMPTS[lang]
