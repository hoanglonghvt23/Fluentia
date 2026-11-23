import { getTranslations } from "next-intl/server";
import { signIn, signInWithGoogle } from "../actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const [t, tApp, { error }] = await Promise.all([getTranslations("login"), getTranslations("app"), searchParams]);

  return (
    <main className="page page-narrow flex flex-col justify-center">
      <h1 className="mb-1">{t("title")}</h1>
      <p className="muted mb-6">{tApp("tagline")}</p>
      <form action={signIn} className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          {t("username")}
          <input name="username" required autoComplete="username" autoCapitalize="none" className="field" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t("password")}
          <input name="password" type="password" required autoComplete="current-password" className="field" />
        </label>
        {error && (
          <p className="msg-err text-sm">
            {error === "google_denied" ? t("googleDenied") : error === "google" ? t("googleFailed") : t("invalid")}
          </p>
        )}
        <button className="btn btn-primary">{t("submit")}</button>
      </form>
      <p className="muted my-3 text-center text-sm">{t("or")}</p>
      <form action={signInWithGoogle}>
        <button className="btn w-full">{t("google")}</button>
      </form>
      <p className="muted mt-4 text-sm">{t("forgot")}</p>
    </main>
  );
}
