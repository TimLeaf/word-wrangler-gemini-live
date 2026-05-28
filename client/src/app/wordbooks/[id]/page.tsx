import Link from "next/link";
import { notFound } from "next/navigation";
import { AddWordForm } from "@/components/Wordbook/AddWordForm";
import { WordRow } from "@/components/Wordbook/WordRow";
import { getWordbook } from "@/lib/wordbook/wordbooks";
import { listWords } from "@/lib/wordbook/words";

export const dynamic = "force-dynamic";

export default async function WordbookDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [wordbook, words] = await Promise.all([
    getWordbook(id),
    listWords(id),
  ]);

  if (!wordbook) {
    notFound();
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-6 p-6">
      <header className="text-white">
        <Link href="/wordbooks" className="text-sm opacity-80 hover:underline">
          ← 単語帳一覧へ
        </Link>
        <h1 className="mt-2 text-3xl font-bold">{wordbook.name}</h1>
        <p className="mt-1 text-sm opacity-90">
          {wordbook.language === "ja" ? "日本語" : "English"} ・ 単語{" "}
          {words.length} 件
        </p>
      </header>

      <section className="rounded-2xl bg-white/90 p-4 shadow">
        <h2 className="mb-3 text-lg font-semibold">単語を追加</h2>
        <AddWordForm wordbookId={wordbook.id} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold text-white">単語一覧</h2>
        {words.length === 0 ? (
          <p className="rounded-xl bg-white/80 p-4 text-sm text-gray-600">
            まだ単語がありません。上のフォームから追加してください。
          </p>
        ) : (
          <ul className="space-y-2">
            {words.map((w) => (
              <WordRow key={w.id} wordbookId={wordbook.id} word={w} />
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
