import { FieldValue } from "@google-cloud/firestore";
import { getFirestore, WORDBOOKS_COLLECTION } from "./firestore";
import type { Language, Wordbook } from "@/types/wordbook";

type WordbookDoc = {
  name: string;
  language: Language;
  createdAt: FirebaseFirestore.Timestamp;
  updatedAt: FirebaseFirestore.Timestamp;
};

function toWordbook(
  id: string,
  data: FirebaseFirestore.DocumentData,
): Wordbook {
  const doc = data as WordbookDoc;
  return {
    id,
    name: doc.name,
    language: doc.language,
    createdAt: doc.createdAt.toMillis(),
    updatedAt: doc.updatedAt.toMillis(),
  };
}

export async function listWordbooks(): Promise<Wordbook[]> {
  const db = getFirestore();
  const snapshot = await db
    .collection(WORDBOOKS_COLLECTION)
    .orderBy("updatedAt", "desc")
    .get();
  return snapshot.docs.map((doc) => toWordbook(doc.id, doc.data()));
}

export async function createWordbook(input: {
  name: string;
  language: Language;
}): Promise<string> {
  const db = getFirestore();
  const ref = await db.collection(WORDBOOKS_COLLECTION).add({
    name: input.name,
    language: input.language,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return ref.id;
}

export async function renameWordbook(id: string, name: string): Promise<void> {
  const db = getFirestore();
  await db.collection(WORDBOOKS_COLLECTION).doc(id).update({
    name,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteWordbook(id: string): Promise<void> {
  const db = getFirestore();
  await db.collection(WORDBOOKS_COLLECTION).doc(id).delete();
}
