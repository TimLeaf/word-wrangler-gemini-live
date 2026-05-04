import { describe, it, expect, vi, beforeEach } from "vitest";
import { act, renderHook } from "@testing-library/react";

// モジュール全体を差し替え。useRTVIClientEvent に渡されたコールバックを
// テストから手動で呼び出せるよう、モジュールスコープの参照に保存する。
let capturedListener: ((...args: unknown[]) => void) | null = null;

vi.mock("@pipecat-ai/client-react", () => ({
  useRTVIClientEvent: (_event: string, callback: (...args: unknown[]) => void) => {
    capturedListener = callback;
  },
}));

import { useFirstBotStoppedSpeaking } from "./useFirstBotStoppedSpeaking";

describe("useFirstBotStoppedSpeaking (INV-3 dedup)", () => {
  beforeEach(() => {
    capturedListener = null;
  });

  it("enabled=true のとき初回発火で onFire が呼ばれる", () => {
    const onFire = vi.fn();
    renderHook(() =>
      useFirstBotStoppedSpeaking({
        enabled: true,
        resetKey: "session-1",
        onFire,
      })
    );

    act(() => {
      capturedListener?.();
    });

    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it("enabled=true で連続発火しても onFire は 1 回だけ呼ばれる", () => {
    const onFire = vi.fn();
    renderHook(() =>
      useFirstBotStoppedSpeaking({
        enabled: true,
        resetKey: "session-1",
        onFire,
      })
    );

    act(() => {
      capturedListener?.();
      capturedListener?.();
      capturedListener?.();
    });

    expect(onFire).toHaveBeenCalledTimes(1);
  });

  it("enabled=false のときは発火しても onFire は呼ばれない", () => {
    const onFire = vi.fn();
    renderHook(() =>
      useFirstBotStoppedSpeaking({
        enabled: false,
        resetKey: "session-1",
        onFire,
      })
    );

    act(() => {
      capturedListener?.();
    });

    expect(onFire).not.toHaveBeenCalled();
  });

  it("resetKey が変化すると次の発火で onFire がまた呼ばれる", () => {
    const onFire = vi.fn();
    const { rerender } = renderHook(
      ({ resetKey }) =>
        useFirstBotStoppedSpeaking({
          enabled: true,
          resetKey,
          onFire,
        }),
      { initialProps: { resetKey: "session-1" } }
    );

    // 初回発火
    act(() => {
      capturedListener?.();
    });
    expect(onFire).toHaveBeenCalledTimes(1);

    // 同セッション中の再発火は無視
    act(() => {
      capturedListener?.();
    });
    expect(onFire).toHaveBeenCalledTimes(1);

    // resetKey 変化（再接続を模倣）
    rerender({ resetKey: "session-2" });

    // 新セッションでは再び 1 回呼ばれる
    act(() => {
      capturedListener?.();
    });
    expect(onFire).toHaveBeenCalledTimes(2);
  });
});
