import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";

type Attempt = { lesson_id: string; sentence_idx: number; score: number; created_at: string; sentence_text: string; answer: string };

export default async function ProgressPage() {
  const supabase = await createClient();
  const t = await getTranslations("progress");

  const [{ data: lessons }, { data: attempts }, { data: recs }] = await Promise.all([
    supabase.from("lessons").select("id, title"),
    supabase.from("attempts").select("lesson_id, sentence_idx, score, created_at, sentence_text, answer").order("created_at", { ascending: false }).limit(2000),
    supabase.from("recordings").select("lesson_id"),
  ]);
  const all = (attempts ?? []) as Attempt[];

  const rows = (lessons ?? []).map((l) => {
    const mine = all.filter((a) => a.lesson_id === l.id);
    return {
      ...l,
      done: new Set(mine.map((a) => a.sentence_idx)).size,
      avg: mine.length ? mine.reduce((n, a) => n + a.score, 0) / mine.length : null,
      last: mine[0]?.created_at,
      recs: (recs ?? []).filter((r) => r.lesson_id === l.id).length,
    };
  });
  const title = new Map((lessons ?? []).map((l) => [l.id, l.title]));

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>

      <h2 className="mb-2 font-medium">{t("byLesson")}</h2>
      <ul className="mb-8 flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <Link href={`/lessons/${r.id}`} className="font-medium">{r.title}</Link>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {t("summary", { done: r.done, avg: r.avg === null ? "-" : Math.round(r.avg * 100), recs: r.recs })}
              {r.last && ` · ${new Date(r.last).toLocaleDateString()}`}
            </p>
          </li>
        ))}
        {!rows.length && <li className="text-zinc-600 dark:text-zinc-400">{t("empty")}</li>}
      </ul>

      <h2 className="mb-2 font-medium">{t("history")}</h2>
      <ul className="flex flex-col gap-2">
        {all.slice(0, 30).map((a, k) => (
          <li key={k} className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
            <p className="flex justify-between gap-2 text-xs text-zinc-500">
              <span>{title.get(a.lesson_id) ?? "—"} · #{a.sentence_idx + 1}</span>
              <span>{new Date(a.created_at).toLocaleString()} · {Math.round(a.score * 100)}%</span>
            </p>
            <p>{a.sentence_text}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
