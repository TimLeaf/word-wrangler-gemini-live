import { FieldValue } from "@google-cloud/firestore";
import { getFirestore, WORDBOOKS_COLLECTION } from "@/lib/wordbook/firestore";
import type { Word } from "@/types/wordbook";

const WORDS_SUBCOLLECTION = "words";

type WordDoc = {
  text: string;
  createdAt: FirebaseFirestore.Timestamp;
  correctCount: number;
};

function wordsRef(wordbookId: string) {
  return getFirestore()
    .collection(WORDBOOKS_COLLECTION)
    .doc(wordbookId)
    .collection(WORDS_SUBCOLLECTION);
}

function toWord(id: string, data: FirebaseFirestore.DocumentData): Word {
  const doc = data as WordDoc;
  return {
    id,
    text: doc.text,
    createdAt: doc.createdAt.toMillis(),
    // Firestore に usageCount で保存された既存データも読めるよう両フィールドを参照する
    correctCount: (doc.correctCount ?? (data as { usageCount?: number }).usageCount) ?? 0,
  };
}

export async function listWords(wordbookId: string): Promise<Word[]> {
  const snapshot = await wordsRef(wordbookId)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => toWord(doc.id, doc.data()));
}

// ゲーム出題用。correctCount 昇順（AI が当てた回数が少ない語を優先）で limit 件返す。
// Firestore の orderBy はフィールド未保有のドキュメントを除外してしまい、レガシーの
// usageCount だけ持つ語が落ちるため、全件取得してメモリ上でソートする。
// （単語帳は手動キュレーションで件数が小さい前提）
export async function listWordsForGame(
  wordbookId: string,
  limit: number,
): Promise<Word[]> {
  const snapshot = await wordsRef(wordbookId).get();
  const words = snapshot.docs.map((doc) => toWord(doc.id, doc.data()));
  words.sort((a, b) => a.correctCount - b.correctCount);
  return words.slice(0, limit);
}

export async function addWord(
  wordbookId: string,
  text: string,
): Promise<string> {
  const ref = await wordsRef(wordbookId).add({
    text,
    createdAt: FieldValue.serverTimestamp(),
    correctCount: 0,
  });
  await getFirestore()
    .collection(WORDBOOKS_COLLECTION)
    .doc(wordbookId)
    .update({ updatedAt: FieldValue.serverTimestamp() });
  return ref.id;
}

// AI が正解した単語の correctCount を増分する（PR-3）。
// 同じ単語が 1 ゲーム内で複数回出題され得るため、id ごとに出現回数を集約してから
// increment(n) する（同一 doc を 1 つの batch で二重 update できない制約の回避も兼ねる）。
export async function incrementCorrectCounts(
  wordbookId: string,
  ids: string[],
): Promise<void> {
  const counts = new Map<string, number>();
  for (const id of ids) {
    counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  if (counts.size === 0) {
    return;
  }
  const db = getFirestore();
  const ref = wordsRef(wordbookId);
  const batch = db.batch();
  for (const [id, n] of counts) {
    batch.update(ref.doc(id), { correctCount: FieldValue.increment(n) });
  }
  await batch.commit();
}

export async function updateWordText(
  wordbookId: string,
  wordId: string,
  text: string,
): Promise<void> {
  await wordsRef(wordbookId).doc(wordId).update({ text });
}

export async function deleteWord(
  wordbookId: string,
  wordId: string,
): Promise<void> {
  await wordsRef(wordbookId).doc(wordId).delete();
}

// Firestore はサブコレクションをカスケード削除しないため、
// deleteWordbook から呼んで手動でバッチ削除する。
export async function deleteAllWordsIn(wordbookId: string): Promise<void> {
  const db = getFirestore();
  const ref = wordsRef(wordbookId);
  while (true) {
    const snapshot = await ref.limit(500).get();
    if (snapshot.empty) {
      return;
    }
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    if (snapshot.size < 500) {
      return;
    }
  }
}
