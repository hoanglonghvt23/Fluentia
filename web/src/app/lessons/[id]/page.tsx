import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DeleteLessonButton } from "@/components/DeleteLessonButton";
import { SentenceEditor } from "@/components/SentenceEditor";
import { generateSentences } from "@/lib/sentences";
import { createClient } from "@/lib/supabase/server";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const t = await getTranslations("lesson");

  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", id).maybeSingle();
  if (!lesson) notFound();

  const waiting = lesson.status === "queued" || lesson.status === "processing";
  const btn = "rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700";
  let body: React.ReactNode;

  if (lesson.status === "ready") {
    const load = () => supabase.from("sentences").select("id, text, start_sec, end_sec").eq("lesson_id", id).order("idx");
    let { data: sentences } = await load();
    if (!sentences?.length && lesson.cues?.length) {
      await generateSentences(supabase, id); // lần đầu mở bài: tách câu tự động từ phụ đề
      ({ data: sentences } = await load());
    }
    const { data: signed } = await supabase.storage.from("media").createSignedUrl(lesson.audio_path, 3 * 3600);
    body = (
      <>
        <div className="mb-6 flex flex-wrap gap-2">
          <Link href={`/lessons/${id}/dictation`} className={btn}>{t("dictation")}</Link>
          <Link href={`/lessons/${id}/shadowing`} className={btn}>{t("shadowing")}</Link>
        </div>
        <SentenceEditor
          lessonId={id}
          audioUrl={signed?.signedUrl ?? ""}
          initial={(sentences ?? []).map((s) => ({ id: s.id, text: s.text, start: s.start_sec, end: s.end_sec }))}
        />
      </>
    );
  } else if (lesson.status === "error") {
    body = <p className="text-red-700 dark:text-red-400">{t("failed")}: {lesson.error}</p>;
  } else {
    body = <p className="text-zinc-600 dark:text-zinc-400">{t(lesson.status === "queued" ? "queued" : "processing")}</p>;
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      {waiting && <AutoRefresh />}
      <div className="mb-4 flex items-start justify-between gap-3">
        <h1 className="text-2xl font-semibold">{lesson.title}</h1>
        <DeleteLessonButton lessonId={id} />
      </div>
      {body}
    </main>
  );
}
