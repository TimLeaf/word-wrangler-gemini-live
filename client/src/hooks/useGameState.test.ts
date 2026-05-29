import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { useGameState } from "./useGameState";
import { GAME_CONFIG, GAME_STATES } from "@/constants/gameConstants";

const originalFetch = global.fetch;

// デフォルトでは /api/words が空を返す → 組み込み単語へフォールバックする想定。
function mockFetchWords(words: { id: string; text: string }[]) {
  global.fetch = vi.fn(
    async () =>
      new Response(JSON.stringify({ words }), { status: 200 }),
  ) as unknown as typeof fetch;
}

describe("useGameState (INV-3)", () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetchWords([]); // 既定はフォールバック経路
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("初期状態", () => {
    const { result } = renderHook(() => useGameState());

    expect(result.current.gameState).toBe(GAME_STATES.IDLE);
    expect(result.current.score).toBe(0);
    expect(result.current.skipsRemaining).toBe(GAME_CONFIG.MAX_SKIPS);
    expect(result.current.timeLeft).toBe(GAME_CONFIG.GAME_DURATION);
    expect(result.current.currentWord).toBe("");
    expect(result.current.currentWordId).toBeNull();
  });

  it("initializeGame() で ACTIVE に遷移し、各カウンタが初期化される (INV-3 の核)", async () => {
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame();
    });

    expect(result.current.gameState).toBe(GAME_STATES.ACTIVE);
    expect(result.current.words.length).toBe(GAME_CONFIG.WORD_POOL_SIZE);
    expect(result.current.score).toBe(0);
    expect(result.current.skipsRemaining).toBe(GAME_CONFIG.MAX_SKIPS);
    expect(result.current.timeLeft).toBe(GAME_CONFIG.GAME_DURATION);
  });

  it("/api/words が単語を返したらそれを使い、id を保持する", async () => {
    mockFetchWords([
      { id: "a", text: "りんご" },
      { id: "b", text: "ばなな" },
    ]);
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame();
    });

    expect(result.current.words).toEqual([
      { id: "a", text: "りんご" },
      { id: "b", text: "ばなな" },
    ]);
    expect(result.current.currentWord).toBe("りんご");
    expect(result.current.currentWordId).toBe("a");
  });

  it("/api/words が空ならフォールバックし、id は null", async () => {
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame();
    });

    expect(result.current.words.length).toBe(GAME_CONFIG.WORD_POOL_SIZE);
    expect(result.current.currentWordId).toBeNull();
  });

  it("/api/words が失敗してもフォールバックで単語が埋まる", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("network down");
    }) as unknown as typeof fetch;
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame();
    });

    expect(result.current.words.length).toBe(GAME_CONFIG.WORD_POOL_SIZE);
    expect(result.current.currentWordId).toBeNull();
  });

  it("initializeGame() で localStorage が空のとき bestScore は 0", async () => {
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame();
    });

    expect(result.current.bestScore).toBe(0);
  });

  it("initializeGame() で localStorage の bestScore を読み込む", async () => {
    localStorage.setItem("bestScore", "42");
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame();
    });

    expect(result.current.bestScore).toBe(42);
  });

  it("finishGame() で FINISHED に遷移する", async () => {
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame();
    });
    act(() => {
      result.current.finishGame();
    });

    expect(result.current.gameState).toBe(GAME_STATES.FINISHED);
  });

  it("incrementScore() で score が +1 される", () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.incrementScore();
    });
    expect(result.current.score).toBe(1);

    act(() => {
      result.current.incrementScore();
    });
    expect(result.current.score).toBe(2);
  });

  it("setBestScore() で state が更新され localStorage にも書かれる", () => {
    const { result } = renderHook(() => useGameState());

    act(() => {
      result.current.setBestScore(100);
    });

    expect(result.current.bestScore).toBe(100);
    expect(localStorage.getItem("bestScore")).toBe("100");
  });

  it("moveToNextWord() で currentWord が次の語に進む", async () => {
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame();
    });
    const firstWord = result.current.currentWord;

    act(() => {
      result.current.moveToNextWord();
    });

    expect(result.current.currentWord).not.toBe(firstWord);
    expect(result.current.currentWord).toBe(result.current.words[1].text);
  });

  it("moveToNextWord() で末尾に達すると単語プールを再充填して index が 0 に戻る", async () => {
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame();
    });
    const initialWords = result.current.words;

    // 末尾まで進める (WORD_POOL_SIZE - 1 回、いずれも同期経路)
    for (let i = 0; i < GAME_CONFIG.WORD_POOL_SIZE - 1; i++) {
      act(() => {
        result.current.moveToNextWord();
      });
    }
    // ここで index は最後 (= words.length - 1)
    expect(result.current.currentWord).toBe(
      initialWords[GAME_CONFIG.WORD_POOL_SIZE - 1].text,
    );

    // もう 1 回呼ぶと再充填され (非同期)、index が 0 に戻る
    await act(async () => {
      result.current.moveToNextWord();
    });

    expect(result.current.words.length).toBe(GAME_CONFIG.WORD_POOL_SIZE);
    expect(result.current.currentWord).toBe(result.current.words[0].text);
  });

  it("useSkip() は残数があれば 1 減らして true を返す", () => {
    const { result } = renderHook(() => useGameState());
    let returned: boolean | undefined;

    act(() => {
      returned = result.current.useSkip();
    });

    expect(returned).toBe(true);
    expect(result.current.skipsRemaining).toBe(GAME_CONFIG.MAX_SKIPS - 1);
  });

  it("useSkip() は残数 0 なら false を返し変化なし", () => {
    const { result } = renderHook(() => useGameState());

    // MAX_SKIPS 回呼んで使い切る
    for (let i = 0; i < GAME_CONFIG.MAX_SKIPS; i++) {
      act(() => {
        result.current.useSkip();
      });
    }
    expect(result.current.skipsRemaining).toBe(0);

    let returned: boolean | undefined;
    act(() => {
      returned = result.current.useSkip();
    });

    expect(returned).toBe(false);
    expect(result.current.skipsRemaining).toBe(0);
  });

  it("decrementTimer() は 0 でクランプされる", () => {
    const { result } = renderHook(() => useGameState());

    // GAME_DURATION + 5 回呼んでも timeLeft は 0 で止まる
    for (let i = 0; i < GAME_CONFIG.GAME_DURATION + 5; i++) {
      act(() => {
        result.current.decrementTimer();
      });
    }

    expect(result.current.timeLeft).toBe(0);
  });
});
