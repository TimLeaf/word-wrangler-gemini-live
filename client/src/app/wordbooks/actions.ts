"use server";

import { revalidatePath } from "next/cache";
import {
  createWordbook,
  deleteWordbook,
  renameWordbook,
  setDefaultWordbook,
} from "@/lib/wordbook/wordbooks";
import { addWord, deleteWord, updateWordText } from "@/lib/wordbook/words";
import { parseWordbookInput, parseWordText } from "@/lib/wordbook/validation";

export type ActionState = { error: string | null };

export async function createWordbookAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseWordbookInput(
    formData.get("name"),
    formData.get("language"),
  );
  if (!parsed.ok) {
    return { error: parsed.message };
  }
  await createWordbook(parsed.value);
  revalidatePath("/wordbooks");
  return { error: null };
}

export async function renameWordbookAction(
  id: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const rawName = formData.get("name");
  if (typeof rawName !== "string" || rawName.trim().length === 0) {
    return { error: "name is required" };
  }
  await renameWordbook(id, rawName.trim());
  revalidatePath("/wordbooks");
  return { error: null };
}

export async function deleteWordbookAction(id: string): Promise<void> {
  await deleteWordbook(id);
  revalidatePath("/wordbooks");
}

export async function setDefaultWordbookAction(
  id: string,
  makeDefault: boolean,
): Promise<void> {
  await setDefaultWordbook(id, makeDefault);
  revalidatePath("/wordbooks");
}

export async function addWordAction(
  wordbookId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseWordText(formData.get("text"));
  if (!parsed.ok) {
    return { error: parsed.message };
  }
  await addWord(wordbookId, parsed.value);
  revalidatePath(`/wordbooks/${wordbookId}`);
  return { error: null };
}

export async function updateWordAction(
  wordbookId: string,
  wordId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = parseWordText(formData.get("text"));
  if (!parsed.ok) {
    return { error: parsed.message };
  }
  await updateWordText(wordbookId, wordId, parsed.value);
  revalidatePath(`/wordbooks/${wordbookId}`);
  return { error: null };
}

export async function deleteWordAction(
  wordbookId: string,
  wordId: string,
): Promise<void> {
  await deleteWord(wordbookId, wordId);
  revalidatePath(`/wordbooks/${wordbookId}`);
}
