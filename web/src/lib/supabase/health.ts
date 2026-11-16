import { getSupabaseEnv } from "./env";

export type SupabaseHealth =
  | { status: "missing-env" }
  | { status: "ok" }
  | { status: "error"; message: string };

// Gọi endpoint health của Supabase Auth để xác nhận URL và khóa dùng được.
// Không cần bảng nào trong database.
export async function checkSupabase(): Promise<SupabaseHealth> {
  const env = getSupabaseEnv();
  if (!env) return { status: "missing-env" };
  try {
    const res = await fetch(`${env.url}/auth/v1/health`, {
      headers: { apikey: env.publishableKey },
      cache: "no-store",
    });
    if (res.ok) return { status: "ok" };
    return { status: "error", message: `HTTP ${res.status}` };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}
