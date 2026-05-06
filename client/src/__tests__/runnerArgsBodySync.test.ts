import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// vitest はデフォルトで `client/` を cwd として実行されるため、
// `__dirname` 起点の絶対パスで安定化させる。
const ROUTE_TS_PATH = resolve(
  __dirname,
  "../app/api/start/route.ts"
);
const BOT_PY_PATH = resolve(__dirname, "../../../server/bot.py");

const routeSource = readFileSync(ROUTE_TS_PATH, "utf-8");
const botSource = readFileSync(BOT_PY_PATH, "utf-8");

// route.ts の `body: { ... }` リテラル（内側）からキー集合を抽出する。
// 外側の `body: JSON.stringify(...)` は関数呼び出しなのでこの正規表現にマッチしない。
function extractClientBodyKeys(source: string): string[] {
  const m = source.match(/body:\s*\{\s*([^}]*?)\s*\}/);
  if (!m) {
    throw new Error(
      "client/src/app/api/start/route.ts から body: { ... } リテラルを抽出できませんでした。" +
        "記述スタイルが変わっていないか確認してください。"
    );
  }
  const inner = m[1];
  return inner
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((prop) => {
      // shorthand (`personality`) と explicit (`key: value`) の両方に対応
      const colonIdx = prop.indexOf(":");
      return (colonIdx >= 0 ? prop.slice(0, colonIdx) : prop).trim();
    });
}

// bot.py から `config.get("KEY", ...)` のキー集合を抽出する。
// 現状は `config = runner_args.body` の直後で読み出す前提。
function extractServerBodyKeys(source: string): string[] {
  const keyRegex = /config\.get\(\s*"([a-z_]+)"/g;
  const keys: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = keyRegex.exec(source)) !== null) {
    keys.push(m[1]);
  }
  if (keys.length === 0) {
    throw new Error(
      'server/bot.py から config.get("...") の呼び出しを抽出できませんでした。'
    );
  }
  return keys;
}

describe("INV-1: runner_args.body schema sync between client and server", () => {
  it("client が送る body のキー集合と server が読む config.get のキー集合が一致する", () => {
    const clientKeys = new Set(extractClientBodyKeys(routeSource));
    const serverKeys = new Set(extractServerBodyKeys(botSource));

    const onlyInClient = [...clientKeys].filter((k) => !serverKeys.has(k));
    const onlyInServer = [...serverKeys].filter((k) => !clientKeys.has(k));

    expect(
      { onlyInClient, onlyInServer },
      "client/src/app/api/start/route.ts の body: { ... } と server/bot.py の config.get(...) を見比べて両側を揃えてください"
    ).toEqual({ onlyInClient: [], onlyInServer: [] });
  });
});
