import type { SupabaseClient } from "@supabase/supabase-js";
import { segment, type Cue, type SegmentOptions } from "./segment";

// Tách lại câu từ phụ đề thô của bài học và thay toàn bộ câu hiện có.
// Mặc định minChars 30: tránh câu chỉ 2-3 chữ (nhất là lời hát, thoại ngắt quãng).
export async function generateSentences(supabase: SupabaseClient, lessonId: string, opts: SegmentOptions = { maxChars: 140, minChars: 30 }) {
  const { data: lesson, error } = await supabase.from("lessons").select("cues").eq("id", lessonId).single();
  if (error) throw new Error(error.message);
  const cues = (lesson.cues ?? []) as Cue[];

  const del = await supabase.from("sentences").delete().eq("lesson_id", lessonId);
  if (del.error) throw new Error(del.error.message);

  const rows = segment(cues, opts).map((s, i) => ({
    lesson_id: lessonId,
    idx: i,
    start_sec: s.start,
    end_sec: s.end,
    text: s.text,
  }));
  if (rows.length) {
    const ins = await supabase.from("sentences").insert(rows);
    if (ins.error) throw new Error(ins.error.message);
  }
}
