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
    <main className="page">
      <h1 className="mb-6">{t("title")}</h1>

      <div className="grid items-start gap-8 lg:grid-cols-2">
      <section>
      <h2 className="mb-3">{t("byLesson")}</h2>
      <ul className="flex flex-col gap-3">
        {rows.map((r) => (
          <li key={r.id} className="card">
            <Link href={`/lessons/${r.id}`} className="font-medium">{r.title}</Link>
            <p className="muted text-sm">
              {t("summary", { done: r.done, avg: r.avg === null ? "-" : Math.round(r.avg * 100), recs: r.recs })}
              {r.last && ` · ${new Date(r.last).toLocaleDateString()}`}
            </p>
          </li>
        ))}
        {!rows.length && <li className="muted">{t("empty")}</li>}
      </ul>

      </section>
      <section>
      <h2 className="mb-3">{t("history")}</h2>
      <ul className="flex flex-col gap-3">
        {all.slice(0, 30).map((a, k) => (
          <li key={k} className="card text-sm">
            <p className="muted flex flex-wrap justify-between gap-2 text-xs">
              <span>{title.get(a.lesson_id) ?? "—"} · #{a.sentence_idx + 1}</span>
              <span>{new Date(a.created_at).toLocaleString()} · {Math.round(a.score * 100)}%</span>
            </p>
            <p>{a.sentence_text}</p>
          </li>
        ))}
      </ul>
      </section>
      </div>
    </main>
  );
}
