import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseEnv } from "./env";

// Client theo phiên đăng nhập của người dùng (khóa công khai + cookie).
export async function createClient() {
  const env = getSupabaseEnv();
  if (!env) throw new Error("Thiếu NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const store = await cookies();
  return createServerClient(env.url, env.publishableKey, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Gọi từ Server Component thì không ghi cookie được; proxy.ts đã làm mới phiên.
        }
      },
    },
  });
}
