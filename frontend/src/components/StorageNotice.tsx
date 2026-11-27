import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CleanupNotice } from "./CleanupNotice";

const isPast = (iso: string) => new Date(iso).getTime() < Date.now();

// Khi dung lượng Storage đạt ngưỡng, báo người dùng tải bài về máy trước hạn 3 ngày.
// Hàm refresh_storage_notice() (migration 0005) tự đo dung lượng, tối đa 10 phút một lần.
export async function StorageNotice() {
  const me = await getCurrentUser();
  if (!me) return null;

  const supabase = await createClient();
  const { data: deadline } = await supabase.rpc("refresh_storage_notice");
  if (!deadline) return null;

  // Chỉ bài đã sẵn sàng mới có gì để tải; bài đang chờ hay lỗi không bị tính.
  const { data: lessons } = await supabase
    .from("lessons").select("id, title").eq("status", "ready").order("created_at");
  if (!lessons?.length) return null;

  return <CleanupNotice deadline={deadline} overdue={isPast(deadline)} lessons={lessons} />;
}
