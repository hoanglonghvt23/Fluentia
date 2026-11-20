import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";

export default async function Home() {
  const [t, me] = await Promise.all([getTranslations(), getCurrentUser()]);
  if (!me) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center gap-3 px-4 py-16">
      <h1 className="text-3xl font-semibold">{t("home.hello", { username: me.username })}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        {t(me.role === "admin" ? "home.role_admin" : "home.role_user")}
      </p>
      <p className="text-zinc-600 dark:text-zinc-400">{t("app.tagline")}</p>
    </main>
  );
}
