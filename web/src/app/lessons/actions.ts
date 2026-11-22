"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readSettings } from "@/lib/lessonSettings";
import { generateSentences } from "@/lib/sentences";

export type SentenceRow = { id?: string; text: string; start: number; end: number };

// Lưu danh sách câu sau khi chỉnh. RLS đảm bảo chỉ chủ bài học ghi được.
export async function saveSentences(lessonId: string, rows: SentenceRow[]) {
  const supabase = await createClient();
  const payload = rows
    .map((r) => ({ ...r, text: r.text.trim() }))
    .filter((r) => r.text && Number.isFinite(r.start) && Number.isFinite(r.end) && r.end > r.start)
    .map((r, i) => ({
      id: r.id ?? crypto.randomUUID(),
      lesson_id: lessonId,
      idx: i,
      start_sec: r.start,
      end_sec: r.end,
      text: r.text,
    }));

  // Xóa câu đã bị bỏ; câu còn lại giữ nguyên id để không mất liên kết với lịch sử và bản ghi.
  const del = supabase.from("sentences").delete().eq("lesson_id", lessonId);
  const keep = payload.map((p) => p.id);
  const { error: e1 } = keep.length ? await del.not("id", "in", `(${keep.join(",")})`) : await del;
  if (e1) throw new Error(e1.message);
  const { error: e2 } = await supabase.from("sentences").upsert(payload);
  if (e2) throw new Error(e2.message);
  revalidatePath(`/lessons/${lessonId}`);
}

// Lưu tùy chỉnh mới vào bài rồi tách lại câu theo đó.
export async function regenerateSentences(lessonId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: lesson, error } = await supabase.from("lessons").select("settings").eq("id", lessonId).single();
  if (error) throw new Error(error.message);

  const settings = readSettings({
    ...readSettings(lesson.settings),
    sentenceMax: formData.get("sentenceMax"),
    sentenceMin: formData.get("sentenceMin"),
    maxSentences: formData.get("maxSentences"),
    maxWords: formData.get("maxWords"),
  });
  const upd = await supabase.from("lessons").update({ settings }).eq("id", lessonId);
  if (upd.error) throw new Error(upd.error.message);

  await generateSentences(supabase, lessonId);
  revalidatePath(`/lessons/${lessonId}`);
}

// Nhận dạng lại giọng nói từ âm thanh đã lưu: xóa phụ đề và câu cũ, xếp bài vào hàng đợi cho worker.
export async function retranscribe(lessonId: string) {
  const supabase = await createClient();
  const del = await supabase.from("sentences").delete().eq("lesson_id", lessonId);
  if (del.error) throw new Error(del.error.message);
  const { error } = await supabase.from("lessons").update({ cues: null, status: "queued", error: null }).eq("id", lessonId);
  if (error) throw new Error(error.message);
  revalidatePath(`/lessons/${lessonId}`);
}

export async function deleteLesson(lessonId: string) {
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons").select("audio_path, source_path, subs_path").eq("id", lessonId).single();
  const { data: recs } = await supabase.from("recordings").select("path").eq("lesson_id", lessonId);

  const paths = [lesson?.audio_path, lesson?.source_path, lesson?.subs_path, ...(recs ?? []).map((r) => r.path)]
    .filter((p): p is string => !!p);
  if (paths.length) await supabase.storage.from("media").remove(paths);
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw new Error(error.message);
  redirect("/");
}
