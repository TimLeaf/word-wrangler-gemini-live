"use server";

import { revalidatePath } from "next/cache";
import {
  createWordbook,
  deleteWordbook,
  renameWordbook,
} from "@/lib/wordbooks";
import { parseWordbookInput } from "@/lib/validation";

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
  revalidatePath("/");
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
  revalidatePath("/");
  return { error: null };
}

export async function deleteWordbookAction(id: string): Promise<void> {
  await deleteWordbook(id);
  revalidatePath("/");
}
