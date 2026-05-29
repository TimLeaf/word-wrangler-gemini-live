import { NextRequest, NextResponse } from "next/server";
import { getDefaultWordbook } from "@/lib/wordbook/wordbooks";
import { incrementCorrectCounts } from "@/lib/wordbook/words";

export const dynamic = "force-dynamic";

// Firestore の batch 上限。集約後のユニーク id 数がこれを超えないよう丸める。
const MAX_IDS = 500;

// AI が正解した単語の correctCount を増分する。client がゲーム終了時に
// fire-and-forget で叩くため、入力が空・アクティブ帳が無い場合も 200 で無害に返す。
export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const ids = (payload as { ids?: unknown })?.ids;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === "string")) {
    return NextResponse.json(
      { error: "Body must be { ids: string[] }" },
      { status: 400 },
    );
  }

  const cleaned = (ids as string[]).filter((id) => id.length > 0);
  if (cleaned.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  try {
    const wordbook = await getDefaultWordbook();
    if (!wordbook) {
      return NextResponse.json({ updated: 0 });
    }
    const limited = cleaned.slice(0, MAX_IDS);
    await incrementCorrectCounts(wordbook.id, limited);
    return NextResponse.json({ updated: limited.length });
  } catch (error) {
    console.error("Failed to increment correctCount:", error);
    return NextResponse.json(
      { error: "Failed to increment" },
      { status: 500 },
    );
  }
}
