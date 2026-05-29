import { NextResponse } from "next/server";
import { GAME_CONFIG } from "@/constants/gameConstants";
import { getDefaultWordbook } from "@/lib/wordbook/wordbooks";
import { listWordsForGame } from "@/lib/wordbook/words";

export const dynamic = "force-dynamic";

// アクティブ（isDefault）単語帳の単語を correctCount 昇順で返す。
// 未設定・空・エラー時はクライアント側が組み込み単語にフォールバックするため、
// ここでは常に { words: {id,text}[] } を 200 で返す（空配列もあり得る）。
export async function GET() {
  try {
    const wordbook = await getDefaultWordbook();
    if (!wordbook) {
      return NextResponse.json({ words: [] });
    }
    const words = await listWordsForGame(
      wordbook.id,
      GAME_CONFIG.WORD_POOL_SIZE,
    );
    return NextResponse.json({
      words: words.map((w) => ({ id: w.id, text: w.text })),
    });
  } catch (error) {
    console.error("Failed to load game words:", error);
    return NextResponse.json(
      { error: "Failed to load words" },
      { status: 500 },
    );
  }
}
