import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const getDefaultWordbook = vi.fn();
const incrementCorrectCounts = vi.fn();

vi.mock("@/lib/wordbook/wordbooks", () => ({
  getDefaultWordbook: () => getDefaultWordbook(),
}));
vi.mock("@/lib/wordbook/words", () => ({
  incrementCorrectCounts: (wordbookId: string, ids: string[]) =>
    incrementCorrectCounts(wordbookId, ids),
}));

import { POST } from "./route";

function makeRequest(body: unknown, opts?: { rawBody?: string }): NextRequest {
  return new NextRequest("http://localhost/api/words/increment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: opts?.rawBody ?? JSON.stringify(body),
  });
}

describe("POST /api/words/increment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getDefaultWordbook.mockResolvedValue({ id: "wb1" });
    incrementCorrectCounts.mockResolvedValue(undefined);
  });

  it("不正な JSON body は 400", async () => {
    const res = await POST(makeRequest(undefined, { rawBody: "not-json{" }));
    expect(res.status).toBe(400);
    expect(incrementCorrectCounts).not.toHaveBeenCalled();
  });

  it("ids が配列でなければ 400", async () => {
    const res = await POST(makeRequest({ ids: "abc" }));
    expect(res.status).toBe(400);
  });

  it("ids に文字列以外が混ざれば 400", async () => {
    const res = await POST(makeRequest({ ids: ["a", 1] }));
    expect(res.status).toBe(400);
  });

  it("空配列は 200 で updated:0、Firestore は呼ばない", async () => {
    const res = await POST(makeRequest({ ids: [] }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ updated: 0 });
    expect(getDefaultWordbook).not.toHaveBeenCalled();
    expect(incrementCorrectCounts).not.toHaveBeenCalled();
  });

  it("空文字を除外しても残らなければ updated:0", async () => {
    const res = await POST(makeRequest({ ids: ["", ""] }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ updated: 0 });
    expect(incrementCorrectCounts).not.toHaveBeenCalled();
  });

  it("アクティブ帳が無ければ updated:0、増分しない", async () => {
    getDefaultWordbook.mockResolvedValue(null);
    const res = await POST(makeRequest({ ids: ["w1"] }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ updated: 0 });
    expect(incrementCorrectCounts).not.toHaveBeenCalled();
  });

  it("有効な ids はアクティブ帳に対して増分する", async () => {
    const res = await POST(makeRequest({ ids: ["w1", "w2", "w1"] }));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ updated: 3 });
    expect(incrementCorrectCounts).toHaveBeenCalledWith("wb1", [
      "w1",
      "w2",
      "w1",
    ]);
  });

  it("Firestore エラーは 500", async () => {
    incrementCorrectCounts.mockRejectedValue(new Error("firestore down"));
    const res = await POST(makeRequest({ ids: ["w1"] }));
    expect(res.status).toBe(500);
  });
});
