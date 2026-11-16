import { Suspense } from "react";
import { connection } from "next/server";
import { checkSupabase } from "@/lib/supabase/health";

async function SupabaseStatus() {
  await connection(); // đọc biến môi trường lúc chạy, không phải lúc build
  const health = await checkSupabase();

  if (health.status === "ok") {
    return (
      <p className="font-medium text-green-700 dark:text-green-400">
        Kết nối Supabase: OK
      </p>
    );
  }
  return (
    <p className="font-medium text-red-700 dark:text-red-400">
      {health.status === "missing-env"
        ? "Kết nối Supabase: chưa cấu hình biến môi trường"
        : `Kết nối Supabase: lỗi (${health.message})`}
    </p>
  );
}

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-4 px-4 py-16">
      <h1 className="text-3xl font-semibold">Fluteria</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Luyện tiếng Anh: Dictation và Shadowing. Bản khung (giai đoạn 0).
      </p>
      <Suspense fallback={<p className="text-zinc-500">Đang kiểm tra kết nối Supabase…</p>}>
        <SupabaseStatus />
      </Suspense>
    </main>
  );
}
