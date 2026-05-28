import { Firestore } from "@google-cloud/firestore";

const DATABASE_ID = "wordbook";

let firestoreSingleton: Firestore | null = null;

export function getFirestore(): Firestore {
  if (firestoreSingleton) {
    return firestoreSingleton;
  }
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.FIRESTORE_PROJECT_ID ??
    (process.env.FIRESTORE_EMULATOR_HOST ? "demo-wordbook" : undefined);

  firestoreSingleton = new Firestore({
    projectId,
    databaseId: DATABASE_ID,
  });
  return firestoreSingleton;
}

export const WORDBOOKS_COLLECTION = "wordbooks";
