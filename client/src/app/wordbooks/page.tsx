import { CreateWordbookForm } from "@/components/Wordbook/CreateWordbookForm";
import { WordbookRow } from "@/components/Wordbook/WordbookRow";
import { listWordbooks } from "@/lib/wordbook/wordbooks";

export const dynamic = "force-dynamic";

export default async function WordbookList() {
  const wordbooks = await listWordbooks();

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <header className="text-white">
        <h1 className="text-3xl font-bold">単語帳一覧</h1>
        <p className="mt-1 text-sm opacity-90">
          Word Wrangler 用のカスタム単語帳を管理します。
        </p>
      </header>

      <section className="rounded-2xl bg-white/90 p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">新しい単語帳</h2>
        <CreateWordbookForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white">単語帳</h2>
        {wordbooks.length === 0 ? (
          <p className="rounded-xl bg-white/80 p-4 text-sm text-gray-600">
            まだ単語帳がありません。上のフォームから作成してください。
          </p>
        ) : (
          <ul className="space-y-2">
            {wordbooks.map((wb) => (
              <WordbookRow key={wb.id} wordbook={wb} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
