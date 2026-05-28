import { FieldValue } from "@google-cloud/firestore";
import { getFirestore, WORDBOOKS_COLLECTION } from "@/lib/wordbook/firestore";
import { deleteAllWordsIn } from "@/lib/wordbook/words";
import type { Language, Wordbook } from "@/types/wordbook";

type WordbookDoc = {
  name: string;
  language: Language;
  isDefault?: boolean;
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
    isDefault: doc.isDefault === true,
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
  await deleteAllWordsIn(id);
  await getFirestore().collection(WORDBOOKS_COLLECTION).doc(id).delete();
}

export async function getWordbook(id: string): Promise<Wordbook | null> {
  const doc = await getFirestore()
    .collection(WORDBOOKS_COLLECTION)
    .doc(id)
    .get();
  if (!doc.exists) {
    return null;
  }
  return toWordbook(doc.id, doc.data() as FirebaseFirestore.DocumentData);
}

export async function getDefaultWordbook(): Promise<Wordbook | null> {
  const snapshot = await getFirestore()
    .collection(WORDBOOKS_COLLECTION)
    .where("isDefault", "==", true)
    .limit(1)
    .get();
  if (snapshot.empty) {
    return null;
  }
  const doc = snapshot.docs[0];
  return toWordbook(doc.id, doc.data());
}

export async function setDefaultWordbook(
  id: string,
  makeDefault: boolean,
): Promise<void> {
  const db = getFirestore();
  const batch = db.batch();
  if (makeDefault) {
    const existing = await db
      .collection(WORDBOOKS_COLLECTION)
      .where("isDefault", "==", true)
      .get();
    existing.docs.forEach((doc) => {
      if (doc.id !== id) {
        batch.update(doc.ref, { isDefault: false });
      }
    });
    batch.update(db.collection(WORDBOOKS_COLLECTION).doc(id), {
      isDefault: true,
    });
  } else {
    batch.update(db.collection(WORDBOOKS_COLLECTION).doc(id), {
      isDefault: false,
    });
  }
  await batch.commit();
}
