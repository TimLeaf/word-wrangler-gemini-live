import { describe, it, expect, vi, beforeEach } from "vitest";
import { GAME_CONFIG } from "@/constants/gameConstants";

const getDefaultWordbook = vi.fn();
const listWordsForGame = vi.fn();

vi.mock("@/lib/wordbook/wordbooks", () => ({
  getDefaultWordbook: () => getDefaultWordbook(),
}));
vi.mock("@/lib/wordbook/words", () => ({
  listWordsForGame: (wordbookId: string, limit: number) =>
    listWordsForGame(wordbookId, limit),
}));

import { GET } from "./route";

describe("GET /api/words", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("アクティブ単語帳が無ければ空配列を返す", async () => {
    getDefaultWordbook.mockResolvedValue(null);

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({ words: [] });
    expect(listWordsForGame).not.toHaveBeenCalled();
  });

  it("アクティブ単語帳の単語を {id,text}[] で返す", async () => {
    getDefaultWordbook.mockResolvedValue({ id: "wb1", language: "ja" });
    listWordsForGame.mockResolvedValue([
      { id: "w1", text: "りんご", createdAt: 1, correctCount: 0 },
      { id: "w2", text: "ばなな", createdAt: 2, correctCount: 3 },
    ]);

    const res = await GET();
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      words: [
        { id: "w1", text: "りんご" },
        { id: "w2", text: "ばなな" },
      ],
    });
    expect(listWordsForGame).toHaveBeenCalledWith(
      "wb1",
      GAME_CONFIG.WORD_POOL_SIZE,
    );
  });

  it("Firestore でエラーが起きたら 500 を返す", async () => {
    getDefaultWordbook.mockRejectedValue(new Error("firestore down"));

    const res = await GET();
    expect(res.status).toBe(500);
  });
});
