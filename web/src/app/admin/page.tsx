import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createUser, resetPassword } from "./actions";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  const me = await getCurrentUser();
  if (me?.role !== "admin") redirect("/");

  const [t, { msg }] = await Promise.all([getTranslations("admin"), searchParams]);
  const { data: users } = await createAdminClient()
    .from("profiles").select("id, username, role").order("created_at");

  const input = "rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";
  const btn = "rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900";

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="mb-4 text-2xl font-semibold">{t("title")}</h1>
      {msg && (
        <p className={`mb-4 text-sm ${msg.startsWith("ok") ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}>
          {t.has(msg) ? t(msg) : ""}
        </p>
      )}

      <h2 className="mb-2 font-medium">{t("create")}</h2>
      <form action={createUser} className="mb-1 flex flex-col gap-3 sm:flex-row">
        <input name="username" placeholder="username" required autoCapitalize="none" className={`${input} flex-1`} />
        <input name="password" type="password" placeholder="password" required autoComplete="new-password" className={`${input} flex-1`} />
        <button className={btn}>{t("save")}</button>
      </form>
      <p className="mb-8 text-xs text-zinc-500">{t("hint")}</p>

      <h2 className="mb-2 font-medium">{t("users")}</h2>
      <ul className="flex flex-col gap-3">
        {users?.map((u) => (
          <li key={u.id} className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
            <p className="mb-2 font-medium">{u.username} <span className="text-xs text-zinc-500">({u.role})</span></p>
            <form action={resetPassword} className="flex flex-col gap-3 sm:flex-row">
              <input type="hidden" name="id" value={u.id} />
              <input name="password" type="password" placeholder={t("newPassword")} required autoComplete="new-password" className={`${input} flex-1`} />
              <button className={btn}>{t("reset")}</button>
            </form>
          </li>
        ))}
      </ul>
    </main>
  );
}
