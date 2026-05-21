import { describe, it, expect } from "vitest";
import { getRandomCatchPhraseWords } from "./wordWranglerWords";
import { ALL_CATCH_PHRASE_WORDS_EN } from "./wordWranglerWords.en";
import { ALL_CATCH_PHRASE_WORDS_JA } from "./wordWranglerWords.ja";

describe("getRandomCatchPhraseWords", () => {
  it("language='en' で英語プールから抽出する", () => {
    const sample = getRandomCatchPhraseWords(20, "en");
    expect(sample).toHaveLength(20);
    for (const word of sample) {
      expect(ALL_CATCH_PHRASE_WORDS_EN).toContain(word);
    }
  });

  it("language='ja' で日本語プールから抽出する", () => {
    const sample = getRandomCatchPhraseWords(20, "ja");
    expect(sample).toHaveLength(20);
    for (const word of sample) {
      expect(ALL_CATCH_PHRASE_WORDS_JA).toContain(word);
    }
  });

  it("デフォルトは英語プール", () => {
    const sample = getRandomCatchPhraseWords(20);
    for (const word of sample) {
      expect(ALL_CATCH_PHRASE_WORDS_EN).toContain(word);
    }
  });

  it("日本語プールは十分な語数（>= 100）を持つ", () => {
    // 1 ゲーム 30 語 × 数セッション分のバリエーション確保
    expect(ALL_CATCH_PHRASE_WORDS_JA.length).toBeGreaterThanOrEqual(100);
  });

  it("日本語プール内の単語はユニーク", () => {
    // EN プールは既存資産で重複あり（PR-4 のスコープ外、別途整理）。
    // 新規追加した JA プールはここで重複ゼロを担保する。
    expect(new Set(ALL_CATCH_PHRASE_WORDS_JA).size).toBe(
      ALL_CATCH_PHRASE_WORDS_JA.length
    );
  });
});
