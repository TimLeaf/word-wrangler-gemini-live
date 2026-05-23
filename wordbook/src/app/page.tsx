import { redirect } from "next/navigation";
import { getDefaultWordbook } from "@/lib/wordbooks";

export const dynamic = "force-dynamic";

export default async function Home() {
  // デフォルトが設定されていれば、その単語帳の詳細画面を入口にする。
  // 未設定なら、一覧 (`/wordbooks`) にリダイレクト。
  const defaultBook = await getDefaultWordbook();
  if (defaultBook) {
    redirect(`/wordbooks/${defaultBook.id}`);
  }
  redirect("/wordbooks");
}
