import Link from "next/link";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DeleteLessonButton } from "@/components/DeleteLessonButton";
import { DownloadZipButton } from "@/components/DownloadZipButton";
import { ImportLessonButton } from "@/components/ImportLessonButton";
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
    <main className="page">
      {busy && <AutoRefresh />}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1>{t("hello", { username: me.username })}</h1>
        <div className="flex flex-wrap items-start gap-2">
          <ImportLessonButton />
          <Link href="/lessons/new" className="btn btn-primary"><span aria-hidden className="text-xl leading-none">+</span> {t("newLesson")}</Link>
        </div>
      </div>
      {!lessons?.length ? (
        <p className="muted">{t("empty")}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {lessons.map((l) => (
            <li key={l.id} className="relative">
              <Link href={`/lessons/${l.id}`} className={`card card-link flex h-full flex-col items-start gap-2 pb-16`}>
                <span className="line-clamp-2 break-words font-medium">{l.title}</span>
                <span className={`chip ${l.status === "ready" ? "chip-ready" : l.status === "error" ? "chip-error" : ""}`}>
                  {t(`status.${l.status}`)}
                </span>
              </Link>
              <div className="absolute bottom-3 right-3 flex gap-2">
                {l.status === "ready" && <DownloadZipButton lessonId={l.id} title={l.title} variant="icon" />}
                <DeleteLessonButton lessonId={l.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
