import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Dictation } from "@/components/Dictation";
import { readSettings } from "@/lib/lessonSettings";
import { createClient } from "@/lib/supabase/server";

export default async function DictationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const t = await getTranslations("dictation");

  const { data: lesson } = await supabase.from("lessons").select("title, status, audio_path, settings").eq("id", id).maybeSingle();
  if (!lesson || lesson.status !== "ready") notFound();

  const [{ data: sentences }, { data: last }, { data: signed }] = await Promise.all([
    supabase.from("sentences").select("id, text, start_sec, end_sec").eq("lesson_id", id).order("idx"),
    supabase.from("attempts").select("sentence_idx").eq("lesson_id", id).order("created_at", { ascending: false }).limit(1),
    supabase.storage.from("media").createSignedUrl(lesson.audio_path, 3 * 3600),
  ]);
  // Tiếp tục từ câu sau câu luyện gần nhất.
  const startAt = last?.length ? last[0].sentence_idx + 1 : 0;

  return (
    <main className="page">
      <Link href={`/lessons/${id}`} className="muted text-sm">← {lesson.title}</Link>
      <h1 className="mb-4 mt-2">{t("title")}</h1>
      <Dictation
        lessonId={id}
        audioUrl={signed?.signedUrl ?? ""}
        startAt={startAt}
        showInput={readSettings(lesson.settings).showInput}
        sentences={(sentences ?? []).map((s) => ({ id: s.id, text: s.text, start: s.start_sec, end: s.end_sec }))}
      />
    </main>
  );
}
