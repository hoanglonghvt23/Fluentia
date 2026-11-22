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

  const input = "field";
  const btn = "btn btn-primary";

  return (
    <main className="page">
      <h1 className="mb-4">{t("title")}</h1>
      {msg && (
        <p className={`mb-4 text-sm ${msg.startsWith("ok") ? "msg-ok" : "msg-err"}`}>
          {t.has(msg) ? t(msg) : ""}
        </p>
      )}

      <div className="grid items-start gap-8 lg:grid-cols-2">
      <section>
      <h2 className="mb-3">{t("create")}</h2>
      <form action={createUser} className="card mb-2 flex flex-col gap-3 sm:flex-row">
        <input name="username" placeholder="username" required autoCapitalize="none" className={`${input} flex-1`} />
        <input name="password" type="password" placeholder="password" required autoComplete="new-password" className={`${input} flex-1`} />
        <button className={btn}>{t("save")}</button>
      </form>
      <p className="muted text-xs">{t("hint")}</p>
      </section>

      <section>
      <h2 className="mb-3">{t("users")}</h2>
      <ul className="flex flex-col gap-3">
        {users?.map((u) => (
          <li key={u.id} className="card">
            <p className="mb-2 font-medium">{u.username} <span className="muted text-xs">({u.role})</span></p>
            <form action={resetPassword} className="flex flex-col gap-3 sm:flex-row">
              <input type="hidden" name="id" value={u.id} />
              <input name="password" type="password" placeholder={t("newPassword")} required autoComplete="new-password" className={`${input} flex-1`} />
              <button className={btn}>{t("reset")}</button>
            </form>
          </li>
        ))}
      </ul>
      </section>
      </div>
    </main>
  );
}
