import "server-only";
import { createClient } from "@supabase/supabase-js";

// Client toàn quyền bằng secret key. CHỈ dùng trong code máy chủ sau khi đã kiểm tra admin.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SECRET_KEY");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
