"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  deleteWordbookAction,
  renameWordbookAction,
  setDefaultWordbookAction,
  type ActionState,
} from "@/app/actions";
import type { Wordbook } from "@/types/wordbook";

const initialState: ActionState = { error: null };

export function WordbookRow({ wordbook }: { wordbook: Wordbook }) {
  const [editing, setEditing] = useState(false);
  const [renameState, renameAction, renaming] = useActionState(
    renameWordbookAction.bind(null, wordbook.id),
    initialState,
  );

  if (editing) {
    return (
      <li className="rounded-xl bg-white/95 p-4 shadow">
        <form
          action={(formData) => {
            renameAction(formData);
            setEditing(false);
          }}
          className="flex flex-col gap-2 sm:flex-row"
        >
          <input
            name="name"
            defaultValue={wordbook.name}
            required
            autoFocus
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={renaming}
            className="rounded-lg bg-blue-600 px-3 py-2 text-white disabled:opacity-50"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-lg bg-gray-200 px-3 py-2"
          >
            キャンセル
          </button>
        </form>
        {renameState.error ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {renameState.error}
          </p>
        ) : null}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl bg-white/95 p-4 shadow">
      <form
        action={async () => {
          await setDefaultWordbookAction(wordbook.id, !wordbook.isDefault);
        }}
      >
        <button
          type="submit"
          aria-label={
            wordbook.isDefault ? "デフォルトを解除" : "デフォルトに設定"
          }
          title={
            wordbook.isDefault ? "デフォルトを解除" : "デフォルトに設定"
          }
          className={`text-2xl leading-none ${
            wordbook.isDefault ? "text-yellow-500" : "text-gray-300"
          }`}
        >
          {wordbook.isDefault ? "★" : "☆"}
        </button>
      </form>
      <Link
        href={`/wordbooks/${wordbook.id}`}
        className="min-w-0 flex-1 hover:opacity-80"
      >
        <p className="text-lg font-medium">{wordbook.name}</p>
        <p className="text-xs text-gray-500">
          {wordbook.language === "ja" ? "日本語" : "English"} ・ 更新:{" "}
          {new Date(wordbook.updatedAt).toLocaleString()}
        </p>
      </Link>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg bg-gray-200 px-3 py-1 text-sm"
        >
          名前変更
        </button>
        <form
          action={async () => {
            if (confirm(`「${wordbook.name}」を削除しますか？`)) {
              await deleteWordbookAction(wordbook.id);
            }
          }}
        >
          <button
            type="submit"
            className="rounded-lg bg-red-100 px-3 py-1 text-sm text-red-700"
          >
            削除
          </button>
        </form>
      </div>
    </li>
  );
}
