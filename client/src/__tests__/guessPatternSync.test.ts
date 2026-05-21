import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { GUESS_PATTERNS } from "@/constants/gameConstants";

// vitest はデフォルトで `client/` を cwd として実行されるため、`../server/bot.py`
// を相対参照する。`__dirname` 起点の絶対パスで安定化させる。
const BOT_PY_PATH = resolve(__dirname, "../../../server/bot.py");

const botSource = readFileSync(BOT_PY_PATH, "utf-8");

// server/bot.py の `CANONICAL_GUESS_PHRASES: dict[str, str] = { ... }` を抽出。
// 各言語の canonical 推測フレーズが client 側 `GUESS_PATTERNS` でマッチすることを assert。
function extractCanonicalGuessPhrases(source: string): Record<string, string> {
  const blockMatch = source.match(
    /CANONICAL_GUESS_PHRASES[^=]*=\s*\{([\s\S]*?)\n\}/
  );
  if (!blockMatch) {
    throw new Error(
      "server/bot.py から CANONICAL_GUESS_PHRASES = { ... } ブロックを抽出できませんでした。" +
        "定義スタイルが変わっていないか確認してください。"
    );
  }
  const body = blockMatch[1];
  // `"en": "Is it [your guess]?",` のようなエントリを抽出。Python の文字列は ".." 前提。
  const entryRegex = /"([a-z]+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  const result: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = entryRegex.exec(body)) !== null) {
    result[m[1]] = m[2];
  }
  return result;
}

// canonical フレーズのプレースホルダ部分（[your guess] / [あなたの推測]）を
// サンプル単語に差し替える。
const SAMPLE_WORDS: Record<string, string> = {
  en: "apple",
  ja: "りんご",
};
const PLACEHOLDERS: Record<string, RegExp> = {
  en: /\[your guess\]/,
  ja: /\[あなたの推測\]/,
};

describe("INV-4: canonical guess phrase ↔ GUESS_PATTERNS sync", () => {
  it("server で宣言されている言語と client `GUESS_PATTERNS` のキー集合が一致する", () => {
    const serverPhrases = extractCanonicalGuessPhrases(botSource);
    expect(new Set(Object.keys(serverPhrases))).toEqual(
      new Set(Object.keys(GUESS_PATTERNS))
    );
  });

  it.each(Object.keys(GUESS_PATTERNS))(
    "%s の canonical 推測フレーズが GUESS_PATTERNS にマッチし、推測語を抽出できる",
    (lang) => {
      const serverPhrases = extractCanonicalGuessPhrases(botSource);
      const template = serverPhrases[lang];
      expect(
        template,
        `server/bot.py の CANONICAL_GUESS_PHRASES に "${lang}" が見つかりません`
      ).toBeDefined();

      const sample = SAMPLE_WORDS[lang];
      const utterance = template.replace(PLACEHOLDERS[lang], sample);

      const pattern = GUESS_PATTERNS[lang as keyof typeof GUESS_PATTERNS];
      const match = utterance.match(pattern);

      expect(
        match,
        `言語 ${lang} の canonical フレーズ "${utterance}" が GUESS_PATTERNS[${lang}] にマッチしません`
      ).not.toBeNull();

      const captured = (match![1] ?? match![2] ?? "").trim();
      expect(captured.toLowerCase()).toBe(sample.toLowerCase());
    }
  );
});
