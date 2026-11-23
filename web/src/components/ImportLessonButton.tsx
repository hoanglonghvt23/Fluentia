"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { parseLessonZip } from "@/lib/lessonZip";
import { createClient } from "@/lib/supabase/browser";

const MAX_BYTES = 50 * 1024 * 1024; // giới hạn mỗi file trong Storage của gói Supabase Free
const MAX_ZIP_BYTES = 200 * 1024 * 1024; // zip có thể chứa thêm bản ghi âm; giới hạn để trình duyệt không hết bộ nhớ
const CHUNK = 500;

// Đưa lại bài học từ file zip đã tải xuống. Giải nén ngay trên trình duyệt và tải âm thanh
// thẳng lên Storage (không qua Vercel), giống lúc tạo bài mới.
export function ImportLessonButton() {
  const t = useTranslations("home");
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phép chọn lại cùng một file
    if (!file) return;
    setError("");
    if (file.size > MAX_ZIP_BYTES) return setError(t("importTooBig"));

    setBusy(true);
    try {
      const lesson = parseLessonZip(new Uint8Array(await file.arrayBuffer()));
      if (lesson.audio.data.length > MAX_BYTES || lesson.recordings.some((r) => r.data.length > MAX_BYTES)) throw new Error("big");

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const id = crypto.randomUUID();
      const audioPath = `${user.id}/${id}/audio.${lesson.audio.ext}`;
      const blob = new Blob([lesson.audio.data as BlobPart], { type: lesson.audio.ext === "mp3" ? "audio/mpeg" : "application/octet-stream" });
      const up = await supabase.storage.from("media").upload(audioPath, blob);
      if (up.error) throw new Error(up.error.message);

      const uploaded = [audioPath];
      const cleanup = () => supabase.storage.from("media").remove(uploaded);
      const recRows: Record<string, unknown>[] = [];
      const sentenceIds = lesson.sentences.map(() => crypto.randomUUID());
      for (const r of lesson.recordings) {
        const recId = crypto.randomUUID();
        const path = `${user.id}/rec/${recId}.${r.ext}`;
        const ru = await supabase.storage.from("media").upload(path, new Blob([r.data as BlobPart], { type: r.mime }), { contentType: r.mime });
        if (ru.error) { await cleanup(); throw new Error(ru.error.message); }
        uploaded.push(path);
        recRows.push({
          id: recId, user_id: user.id, lesson_id: id,
          sentence_id: r.sentenceIdx !== null ? (sentenceIds[r.sentenceIdx] ?? null) : null,
          start_sec: r.start, end_sec: r.end, sentence_text: r.text, path, mime: r.mime, created_at: r.createdAt,
        });
      }

      // cues = các câu đã chỉnh, để "Nhận dạng lại" / "Tách lại câu" vẫn hoạt động trên bài nhập lại.
      const cues = lesson.sentences.map((s) => ({ start: s.start, end: s.end, text: s.text }));
      const { error: e1 } = await supabase.from("lessons").insert({
        id,
        title: lesson.title,
        source_type: lesson.sourceType,
        source_url: lesson.sourceUrl,
        status: "ready",
        audio_path: audioPath,
        duration: lesson.duration,
        cues,
        settings: lesson.settings,
        ...(lesson.createdAt ? { created_at: lesson.createdAt } : {}),
      });
      if (e1) {
        await cleanup();
        throw new Error(e1.message);
      }

      const sentenceRows = lesson.sentences.map((s, i) => ({
        id: sentenceIds[i], lesson_id: id, idx: i, start_sec: s.start, end_sec: s.end, text: s.text,
      }));
      const attemptRows = lesson.attempts.map((a) => ({
        user_id: user.id,
        lesson_id: id,
        sentence_id: sentenceIds[a.sentenceIdx] ?? null,
        sentence_idx: Math.max(0, a.sentenceIdx),
        sentence_text: a.sentenceText,
        answer: a.answer,
        score: a.score,
        created_at: a.createdAt,
      }));
      const jobs: [string, Record<string, unknown>[]][] = [["sentences", sentenceRows], ["attempts", attemptRows], ["recordings", recRows]];
      for (const [table, rows] of jobs) {
        for (let i = 0; i < rows.length; i += CHUNK) {
          const { error } = await supabase.from(table).insert(rows.slice(i, i + CHUNK));
          if (error) {
            await supabase.from("lessons").delete().eq("id", id); // xóa kéo theo câu và lịch sử đã chèn
            await cleanup();
            throw new Error(error.message);
          }
        }
      }
      router.push(`/lessons/${id}`);
    } catch (err) {
      const m = err instanceof Error ? err.message : "";
      setError(m === "zip" || m.startsWith("missing:") || m.startsWith("invalid:") ? t("importInvalid") : m === "big" ? t("importTooBig") : m);
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <input ref={input} type="file" accept=".zip,application/zip" className="sr-only" onChange={onFile} />
      <button type="button" className="btn" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? t("importing") : t("import")}
      </button>
      {error && <p className="msg-err text-sm">{error}</p>}
    </div>
  );
}
