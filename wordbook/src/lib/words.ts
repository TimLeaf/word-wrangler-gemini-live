import { FieldValue } from "@google-cloud/firestore";
import { getFirestore, WORDBOOKS_COLLECTION } from "./firestore";
import type { Word } from "@/types/wordbook";

const WORDS_SUBCOLLECTION = "words";

type WordDoc = {
  text: string;
  createdAt: FirebaseFirestore.Timestamp;
  usageCount: number;
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
    usageCount: doc.usageCount ?? 0,
  };
}

export async function listWords(wordbookId: string): Promise<Word[]> {
  const snapshot = await wordsRef(wordbookId)
    .orderBy("createdAt", "desc")
    .get();
  return snapshot.docs.map((doc) => toWord(doc.id, doc.data()));
}

export async function addWord(
  wordbookId: string,
  text: string,
): Promise<string> {
  const ref = await wordsRef(wordbookId).add({
    text,
    createdAt: FieldValue.serverTimestamp(),
    usageCount: 0,
  });
  // Bump the parent wordbook's updatedAt so the list view reflects activity.
  await getFirestore()
    .collection(WORDBOOKS_COLLECTION)
    .doc(wordbookId)
    .update({ updatedAt: FieldValue.serverTimestamp() });
  return ref.id;
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

// Cascade delete: Firestore does not delete subcollections when the parent
// doc is removed. Called by deleteWordbook to keep the data tidy.
export async function deleteAllWordsIn(wordbookId: string): Promise<void> {
  const db = getFirestore();
  const ref = wordsRef(wordbookId);
  // Batch up to 500 deletes at a time (Firestore batch limit).
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
