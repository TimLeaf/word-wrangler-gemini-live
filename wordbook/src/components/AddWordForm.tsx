"use client";

import { useActionState, useEffect, useRef } from "react";
import { addWordAction, type ActionState } from "@/app/actions";

const initialState: ActionState = { error: null };

export function AddWordForm({ wordbookId }: { wordbookId: string }) {
  const [state, formAction, pending] = useActionState(
    addWordAction.bind(null, wordbookId),
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && state.error === null) {
      formRef.current?.reset();
      // 連続追加しやすいよう、フォーカスは入力欄に戻す
      formRef.current?.querySelector<HTMLInputElement>('input[name="text"]')?.focus();
    }
  }, [state, pending]);

  return (
    <form ref={formRef} action={formAction} className="space-y-2">
      <div className="flex gap-2">
        <input
          name="text"
          placeholder="単語を入力して Enter"
          required
          autoComplete="off"
          autoFocus
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-base"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          追加
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
