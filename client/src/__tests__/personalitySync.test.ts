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

// `PERSONALITY_PRESETS = { ... }` ブロックを抽出して dict のキーを取り出す。
// 抽出失敗時は server/bot.py の定義スタイルが変わっている可能性が高い。
function extractServerPresetKeys(source: string): string[] {
  const blockMatch = source.match(
    /PERSONALITY_PRESETS\s*=\s*\{([\s\S]*?)\n\}/
  );
  if (!blockMatch) {
    throw new Error(
      "server/bot.py から PERSONALITY_PRESETS = { ... } ブロックを抽出できませんでした。" +
        "定義スタイルが変わっていないか確認してください。"
    );
  }
  const body = blockMatch[1];
  const keyRegex = /^\s*"([a-z_]+)"\s*:/gm;
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
  it("client の PersonalityType と server の PERSONALITY_PRESETS のキー集合が一致する", () => {
    const clientKeys = new Set(Object.keys(PERSONALITY_PRESETS));
    const serverKeys = new Set(extractServerPresetKeys(botSource));

    const onlyInClient = [...clientKeys].filter((k) => !serverKeys.has(k));
    const onlyInServer = [...serverKeys].filter((k) => !clientKeys.has(k));

    expect(
      { onlyInClient, onlyInServer },
      "client/src/types/personality.ts の PersonalityType と server/bot.py の PERSONALITY_PRESETS を見比べて両側を揃えてください"
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
