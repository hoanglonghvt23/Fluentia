import type { SupabaseClient } from "@supabase/supabase-js";
import { readSettings, type LessonSettings } from "./lessonSettings";
import { limitSentences, segment, type Cue } from "./segment";

// Câu chỉ bị cắt giữa chừng khi một đoạn không dấu câu và không chỗ nghỉ dài quá MAX_CHARS ký tự;
// câu ngắn hơn MIN_CHARS được gộp với câu sau. Người dùng không phải chọn các con số này.
const MAX_CHARS = 300;
const MIN_CHARS = 30;

// Tách lại câu từ phụ đề thô của bài học theo tùy chỉnh của bài (có thể ghi đè bằng `override`)
// và thay toàn bộ câu hiện có.
export async function generateSentences(supabase: SupabaseClient, lessonId: string, override: Partial<LessonSettings> = {}) {
  const { data: lesson, error } = await supabase.from("lessons").select("cues, settings").eq("id", lessonId).single();
  if (error) throw new Error(error.message);
  const st = { ...readSettings(lesson.settings), ...override };
  const cues = (lesson.cues ?? []) as Cue[];

  const del = await supabase.from("sentences").delete().eq("lesson_id", lessonId);
  if (del.error) throw new Error(del.error.message);

  const sentences = limitSentences(segment(cues, { maxChars: MAX_CHARS, minChars: MIN_CHARS }), st);
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
