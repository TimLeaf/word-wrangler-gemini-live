import { Firestore } from "@google-cloud/firestore";

// Firestore データベース ID（plan.md で `wordbook` 別 DB に確定）。
const DATABASE_ID = "wordbook";

// Cloud Run では ADC（Application Default Credentials）で自動認証。
// ローカル開発では `FIRESTORE_EMULATOR_HOST` 環境変数があれば SDK が
// 自動で emulator に接続する（手動切替不要）。
// 参考: https://cloud.google.com/firestore/docs/emulator#use_the_emulator_with_your_application
let firestoreSingleton: Firestore | null = null;

export function getFirestore(): Firestore {
  if (firestoreSingleton) {
    return firestoreSingleton;
  }
  const projectId =
    process.env.GOOGLE_CLOUD_PROJECT ??
    process.env.FIRESTORE_PROJECT_ID ??
    // Emulator 利用時はダミー project ID で動く
    (process.env.FIRESTORE_EMULATOR_HOST ? "demo-wordbook" : undefined);

  firestoreSingleton = new Firestore({
    projectId,
    databaseId: DATABASE_ID,
  });
  return firestoreSingleton;
}

export const WORDBOOKS_COLLECTION = "wordbooks";
