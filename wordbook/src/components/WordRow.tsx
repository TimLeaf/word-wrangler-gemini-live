"use client";

import { useActionState, useState } from "react";
import {
  deleteWordAction,
  updateWordAction,
  type ActionState,
} from "@/app/actions";
import type { Word } from "@/types/wordbook";

const initialState: ActionState = { error: null };

export function WordRow({
  wordbookId,
  word,
}: {
  wordbookId: string;
  word: Word;
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, updateAction, updating] = useActionState(
    updateWordAction.bind(null, wordbookId, word.id),
    initialState,
  );

  if (editing) {
    return (
      <li className="rounded-xl bg-white/95 p-3 shadow">
        <form
          action={(formData) => {
            updateAction(formData);
            setEditing(false);
          }}
          className="flex gap-2"
        >
          <input
            name="text"
            defaultValue={word.text}
            required
            autoFocus
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2"
          />
          <button
            type="submit"
            disabled={updating}
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
        {updateState.error ? (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {updateState.error}
          </p>
        ) : null}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between rounded-xl bg-white/95 p-3 shadow">
      <div className="min-w-0 flex-1">
        <p className="truncate text-base">{word.text}</p>
        <p className="text-xs text-gray-500">使用回数: {word.usageCount}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-lg bg-gray-200 px-3 py-1 text-sm"
        >
          編集
        </button>
        <form
          action={async () => {
            if (confirm(`「${word.text}」を削除しますか？`)) {
              await deleteWordAction(wordbookId, word.id);
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
