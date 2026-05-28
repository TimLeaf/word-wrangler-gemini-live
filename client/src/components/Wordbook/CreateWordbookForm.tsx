"use client";

import { useActionState } from "react";
import { createWordbookAction, type ActionState } from "@/app/wordbooks/actions";

const initialState: ActionState = { error: null };

export function CreateWordbookForm() {
  const [state, formAction, pending] = useActionState(
    createWordbookAction,
    initialState,
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          name="name"
          placeholder="単語帳名"
          required
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base"
        />
        <select
          name="language"
          defaultValue="ja"
          className="rounded-lg border border-gray-300 px-3 py-2 text-base"
          aria-label="言語"
        >
          <option value="ja">日本語</option>
          <option value="en">English</option>
        </select>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {pending ? "作成中…" : "作成"}
        </button>
      </div>
      {state.error ? (
        <p role="alert" className="text-sm text-red-600">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
