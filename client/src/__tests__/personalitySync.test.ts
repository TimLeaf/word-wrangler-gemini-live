import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  PERSONALITY_PRESETS,
  DEFAULT_PERSONALITY,
} from "@/types/personality";

// vitest はデフォルトで `client/` を cwd として実行されるため、`../server/bot.py`
// を相対参照する。`__dirname` 起点の絶対パスで安定化させる。
const BOT_PY_PATH = resolve(
  __dirname,
  "../../../server/bot.py"
);

const botSource = readFileSync(BOT_PY_PATH, "utf-8");

// `PERSONALITY_KEYS = ("a", "b", ...)` の中身を抽出。
// 2026-05-20 以降 PERSONALITY_PRESETS は 2 段辞書 (`{lang: {personality: prompt}}`)
// になったため、単一源泉のタプル `PERSONALITY_KEYS` を cross-language 同期チェックの
// アンカーとして使う。
function extractServerPersonalityKeys(source: string): string[] {
  const blockMatch = source.match(
    /PERSONALITY_KEYS\s*=\s*\(([\s\S]*?)\)/
  );
  if (!blockMatch) {
    throw new Error(
      "server/bot.py から PERSONALITY_KEYS = (...) タプルを抽出できませんでした。" +
        "定義スタイルが変わっていないか確認してください。"
    );
  }
  const body = blockMatch[1];
  const keyRegex = /"([a-z_]+)"/g;
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = keyRegex.exec(body)) !== null) {
    keys.push(m[1]);
  }
  return keys;
}

// `config.get("personality", "<default>")` の第 2 引数を抽出。
function extractServerDefaultPersonality(source: string): string {
  const m = source.match(
    /config\.get\(\s*"personality"\s*,\s*"([a-z_]+)"\s*\)/
  );
  if (!m) {
    throw new Error(
      'server/bot.py から config.get("personality", "...") の default を抽出できませんでした。'
    );
  }
  return m[1];
}

describe("INV-2: PERSONALITY_PRESETS sync between client and server", () => {
  it("client の PersonalityType と server の PERSONALITY_KEYS が一致する", () => {
    const clientKeys = new Set(Object.keys(PERSONALITY_PRESETS));
    const serverKeys = new Set(extractServerPersonalityKeys(botSource));

    const onlyInClient = [...clientKeys].filter((k) => !serverKeys.has(k));
    const onlyInServer = [...serverKeys].filter((k) => !clientKeys.has(k));

    expect(
      { onlyInClient, onlyInServer },
      "client/src/types/personality.ts の PersonalityType と server/bot.py の PERSONALITY_KEYS を見比べて両側を揃えてください"
    ).toEqual({ onlyInClient: [], onlyInServer: [] });
  });

  it("client の DEFAULT_PERSONALITY と server の fallback default が一致する", () => {
    const serverDefault = extractServerDefaultPersonality(botSource);
    expect(
      serverDefault,
      "client の DEFAULT_PERSONALITY と server の config.get の default 引数を揃えてください"
    ).toBe(DEFAULT_PERSONALITY);
  });
});
