import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { LessonNotifier } from "./LessonNotifier";

// Cho phần giao diện biết trạng thái các bài của người dùng, để báo khi bài xử lý xong hoặc lỗi
// và báo khi bài chờ quá lâu (worker có thể đang tắt), ở bất kỳ trang nào.
export async function LessonNotifications() {
  if (!(await getCurrentUser())) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("lessons").select("id, title, status, error, created_at");
  if (!data?.length) return null;
  return (
    <LessonNotifier
      lessons={data.map((l) => ({ ...l, error: l.error ? String(l.error).slice(0, 200) : null }))}
    />
  );
}
