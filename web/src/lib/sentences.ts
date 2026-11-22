import type { SupabaseClient } from "@supabase/supabase-js";
import { readSettings, type LessonSettings } from "./lessonSettings";
import { limitSentences, segment, type Cue } from "./segment";

// Tách lại câu từ phụ đề thô của bài học theo tùy chỉnh của bài (có thể ghi đè bằng `override`)
// và thay toàn bộ câu hiện có.
export async function generateSentences(supabase: SupabaseClient, lessonId: string, override: Partial<LessonSettings> = {}) {
  const { data: lesson, error } = await supabase.from("lessons").select("cues, settings").eq("id", lessonId).single();
  if (error) throw new Error(error.message);
  const st = { ...readSettings(lesson.settings), ...override };
  const cues = (lesson.cues ?? []) as Cue[];

  const del = await supabase.from("sentences").delete().eq("lesson_id", lessonId);
  if (del.error) throw new Error(del.error.message);

  const sentences = limitSentences(segment(cues, { maxChars: st.sentenceMax, minChars: st.sentenceMin }), st);
  const rows = sentences.map((s, i) => ({
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
