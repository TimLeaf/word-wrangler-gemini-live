import { describe, it, expect } from "vitest";
import { detectWordGuess } from "./wordDetection";

describe("detectWordGuess (INV-4)", () => {
  it.each([
    {
      name: "明示的な推測 (シンプル)",
      transcript: "Is it apple?",
      target: "apple",
      expected: { isCorrect: true, isExplicitGuess: true, guessedWord: "apple" },
    },
    {
      name: "明示的な推測 (冠詞 'an' を除去)",
      transcript: "Is it an elephant?",
      target: "elephant",
      expected: {
        isCorrect: true,
        isExplicitGuess: true,
        guessedWord: "elephant",
      },
    },
    {
      name: "明示的な推測 (引用符を除去)",
      transcript: 'Is it "banana"?',
      target: "banana",
      expected: {
        isCorrect: true,
        isExplicitGuess: true,
        guessedWord: "banana",
      },
    },
    {
      name: "明示的な推測 (不正解)",
      transcript: "Is it cat?",
      target: "dog",
      expected: { isCorrect: false, isExplicitGuess: true, guessedWord: "cat" },
    },
    {
      name: "フォールバック検出 (含有マッチ)",
      transcript: "I think the word might be apple.",
      target: "apple",
      expected: {
        isCorrect: true,
        isExplicitGuess: false,
        guessedWord: "apple",
      },
    },
    {
      name: "明示的な推測 (大文字小文字非依存)",
      transcript: "Is it APPLE?",
      target: "apple",
      expected: { isCorrect: true, isExplicitGuess: true, guessedWord: "apple" },
    },
  ])("$name", ({ transcript, target, expected }) => {
    expect(detectWordGuess(transcript, target)).toEqual(expected);
  });
});
