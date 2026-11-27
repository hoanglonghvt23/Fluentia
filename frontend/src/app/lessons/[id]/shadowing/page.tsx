import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Shadowing } from "@/components/Shadowing";
import { createClient } from "@/lib/supabase/server";

export default async function ShadowingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const t = await getTranslations("shadowing");

  const { data: lesson } = await supabase.from("lessons").select("title, status, audio_path").eq("id", id).maybeSingle();
  if (!lesson || lesson.status !== "ready") notFound();

  const [{ data: sentences }, { data: recs }, { data: signed }] = await Promise.all([
    supabase.from("sentences").select("id, text, start_sec, end_sec").eq("lesson_id", id).order("idx"),
    supabase.from("recordings").select("id, sentence_id, path, mime, created_at").eq("lesson_id", id).order("created_at", { ascending: false }),
    supabase.storage.from("media").createSignedUrl(lesson.audio_path, 3 * 3600),
  ]);

  return (
    <main className="page">
      <Link href={`/lessons/${id}`} className="muted text-sm">← {lesson.title}</Link>
      <h1 className="mb-4 mt-2">{t("title")}</h1>
      <Shadowing
        lessonId={id}
        audioUrl={signed?.signedUrl ?? ""}
        initialRecs={recs ?? []}
        sentences={(sentences ?? []).map((s) => ({ id: s.id, text: s.text, start: s.start_sec, end: s.end_sec }))}
      />
    </main>
  );
}
