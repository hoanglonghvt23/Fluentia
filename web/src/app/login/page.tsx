import { getTranslations } from "next-intl/server";
import { signIn } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [t, { error }] = await Promise.all([getTranslations("login"), searchParams]);
  const input = "w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";

  return (
    <main className="mx-auto w-full max-w-sm flex-1 px-4 py-12">
      <h1 className="mb-6 text-2xl font-semibold">{t("title")}</h1>
      <form action={signIn} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("username")}
          <input name="username" required autoComplete="username" autoCapitalize="none" className={input} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("password")}
          <input name="password" type="password" required autoComplete="current-password" className={input} />
        </label>
        {error && <p className="text-sm text-red-700 dark:text-red-400">{t("invalid")}</p>}
        <button className="rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900">
          {t("submit")}
        </button>
      </form>
      <p className="mt-6 text-sm text-zinc-500">{t("forgot")}</p>
    </main>
  );
}
