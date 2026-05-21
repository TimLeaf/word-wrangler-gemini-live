import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

const originalFetch = global.fetch;

function makeRequest(body: unknown, opts?: { rawBody?: string }): NextRequest {
  const init: RequestInit = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: opts?.rawBody ?? JSON.stringify(body),
  };
  return new NextRequest("http://localhost/api/start", init);
}

describe("POST /api/start input validation", () => {
  beforeEach(() => {
    global.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    ) as unknown as typeof fetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("不正な JSON body で 400 を返す", async () => {
    const req = makeRequest(undefined, { rawBody: "not-json{" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("personality が欠落していたら 400 を返す", async () => {
    const req = makeRequest({ language: "en" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("personality が未知の文字列なら 400 を返す", async () => {
    const req = makeRequest({ personality: "stranger", language: "en" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("personality が string でなければ 400 を返す", async () => {
    const req = makeRequest({ personality: 123, language: "en" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("language が欠落していたら 400 を返す", async () => {
    const req = makeRequest({ personality: "witty" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("language が未知の文字列なら 400 を返す", async () => {
    const req = makeRequest({ personality: "witty", language: "fr" });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("payload が object でなければ 400 を返す", async () => {
    const req = makeRequest(undefined, { rawBody: JSON.stringify("just a string") });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("正しい personality と language なら BOT_START_URL にプロキシして 200 を返す", async () => {
    const req = makeRequest({ personality: "witty", language: "ja" });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(global.fetch).toHaveBeenCalledTimes(1);

    const [, init] = (global.fetch as unknown as ReturnType<typeof vi.fn>).mock
      .calls[0];
    const forwarded = JSON.parse(init.body as string);
    expect(forwarded.body).toEqual({ personality: "witty", language: "ja" });
    expect(forwarded.createDailyRoom).toBe(true);
  });
});
