import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AutoRefresh } from "@/components/AutoRefresh";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const [t, me] = await Promise.all([getTranslations("home"), getCurrentUser()]);
  if (!me) redirect("/login");

  const supabase = await createClient();
  const { data: lessons } = await supabase
    .from("lessons").select("id, title, status, created_at").order("created_at", { ascending: false });
  const busy = lessons?.some((l) => l.status === "queued" || l.status === "processing");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      {busy && <AutoRefresh />}
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{t("hello", { username: me.username })}</h1>
        <Link href="/lessons/new" className="rounded bg-zinc-900 px-4 py-2 text-sm text-white dark:bg-zinc-100 dark:text-zinc-900">
          {t("newLesson")}
        </Link>
      </div>
      {!lessons?.length ? (
        <p className="text-zinc-600 dark:text-zinc-400">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {lessons.map((l) => (
            <li key={l.id}>
              <Link href={`/lessons/${l.id}`} className="flex items-center justify-between gap-3 rounded border border-zinc-200 p-3 dark:border-zinc-800">
                <span className="font-medium">{l.title}</span>
                <span className="text-xs text-zinc-500">{t(`status.${l.status}`)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
