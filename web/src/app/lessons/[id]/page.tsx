import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { AutoRefresh } from "@/components/AutoRefresh";
import { DownloadZipButton } from "@/components/DownloadZipButton";
import { LessonActions } from "@/components/LessonActions";
import { SentenceEditor } from "@/components/SentenceEditor";
import { isYoutubeBlocked } from "@/lib/lessonError";
import { readSettings } from "@/lib/lessonSettings";
import { generateSentences } from "@/lib/sentences";
import { createClient } from "@/lib/supabase/server";

export default async function LessonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const t = await getTranslations("lesson");

  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", id).maybeSingle();
  if (!lesson) notFound();

  const waiting = lesson.status === "queued" || lesson.status === "processing";
  let body: React.ReactNode;
  let missing = false; // bài đã xong nhưng chưa thấy câu (các lần làm mới chồng nhau): tiếp tục làm mới

  if (lesson.status === "ready") {
    const load = () => supabase.from("sentences").select("id, text, start_sec, end_sec").eq("lesson_id", id).order("idx");
    let { data: sentences } = await load();
    if (!sentences?.length && lesson.cues?.length) {
      await generateSentences(supabase, id); // lần đầu mở bài: tách câu tự động từ phụ đề
      ({ data: sentences } = await load());
    }
    missing = !sentences?.length && !!lesson.cues?.length;
    const { data: signed } = await supabase.storage.from("media").createSignedUrl(lesson.audio_path, 3 * 3600);
    body = (
      <>
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <Link href={`/lessons/${id}/dictation`} className="card card-link">
            <h2 className="mb-1">{t("dictation")}</h2>
            <p className="muted text-sm">{t("dictationDesc")}</p>
          </Link>
          <Link href={`/lessons/${id}/shadowing`} className="card card-link">
            <h2 className="mb-1">{t("shadowing")}</h2>
            <p className="muted text-sm">{t("shadowingDesc")}</p>
          </Link>
        </div>
        <SentenceEditor
          key={(sentences ?? []).map((x) => x.id).join(",")} // dữ liệu đổi thì dựng lại, vì SentenceEditor chỉ đọc `initial` một lần
          lessonId={id}
          settings={readSettings(lesson.settings)}
          audioUrl={signed?.signedUrl ?? ""}
          initial={(sentences ?? []).map((s) => ({ id: s.id, text: s.text, start: s.start_sec, end: s.end_sec }))}
        />
      </>
    );
  } else if (lesson.status === "error") {
    body = isYoutubeBlocked(lesson.error)
      ? <p className="msg-err">{t("youtubeBlocked")}</p>
      : <p className="msg-err">{t("failed")}: {lesson.error}</p>;
  } else {
    body = <p className="muted">{t(lesson.status === "queued" ? "queued" : "processing")}</p>;
  }

  return (
    <main className="page">
      {(waiting || missing) && <AutoRefresh seconds={waiting ? 4 : 2} />}
      <div className="mb-4 flex items-start justify-between gap-3">
        <h1>{lesson.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {lesson.status === "ready" && (
            <DownloadZipButton lessonId={id} title={lesson.title} variant="text" />
          )}
          <LessonActions lessonId={id} canRetranscribe={!!lesson.audio_path && !waiting} />
        </div>
      </div>
      {body}
    </main>
  );
}
