import { describe, it, expect } from "vitest";
import { detectWordGuess } from "./wordDetection";

describe("detectWordGuess (INV-4) — English", () => {
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
    expect(detectWordGuess(transcript, target, "en")).toEqual(expected);
  });
});

describe("detectWordGuess (INV-4) — Japanese", () => {
  it.each([
    {
      name: "canonical 形式（「」付き・ですか？）",
      transcript: "答えは「りんご」ですか？",
      target: "りんご",
      expected: {
        isCorrect: true,
        isExplicitGuess: true,
        guessedWord: "りんご",
      },
    },
    {
      name: "「」省略・半角クエスチョン",
      transcript: "答えはバナナですか?",
      target: "バナナ",
      expected: {
        isCorrect: true,
        isExplicitGuess: true,
        guessedWord: "バナナ",
      },
    },
    {
      name: "句点で終わる (です。)",
      transcript: "答えは「みかん」ですか。",
      target: "みかん",
      expected: {
        isCorrect: true,
        isExplicitGuess: true,
        guessedWord: "みかん",
      },
    },
    {
      name: "短縮形 (か？)",
      transcript: "答えは「ぶどう」か？",
      target: "ぶどう",
      expected: {
        isCorrect: true,
        isExplicitGuess: true,
        guessedWord: "ぶどう",
      },
    },
    {
      name: "明示的な推測 (不正解)",
      transcript: "答えは「ねこ」ですか？",
      target: "いぬ",
      expected: {
        isCorrect: false,
        isExplicitGuess: true,
        guessedWord: "ねこ",
      },
    },
    {
      name: "フォールバック検出 (含有マッチ)",
      transcript: "もしかして、その単語はりんごでしょうか。",
      target: "りんご",
      expected: {
        isCorrect: true,
        isExplicitGuess: false,
        guessedWord: "りんご",
      },
    },
    {
      name: "明示的推測パターンに該当しない雑談は含有判定にフォールバック",
      transcript: "もう少しヒントをください。",
      target: "りんご",
      expected: {
        isCorrect: false,
        isExplicitGuess: false,
        guessedWord: null,
      },
    },
  ])("$name", ({ transcript, target, expected }) => {
    expect(detectWordGuess(transcript, target, "ja")).toEqual(expected);
  });
});
