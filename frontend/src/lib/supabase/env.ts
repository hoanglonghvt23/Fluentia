// Đọc cấu hình Supabase từ biến môi trường. Không ghi khóa vào code.
// Chỉ dùng khóa công khai (publishable/anon) ở web. Khóa bí mật chỉ ở worker
// hoặc biến môi trường phía máy chủ (không có tiền tố NEXT_PUBLIC_).
export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) return null;
  return { url, publishableKey };
}
