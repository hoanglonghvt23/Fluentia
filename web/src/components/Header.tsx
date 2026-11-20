import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { setLocale, signOut } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";

export async function Header() {
  const [t, locale, me] = await Promise.all([getTranslations("nav"), getLocale(), getCurrentUser()]);
  const other = locale === "vi" ? "en" : "vi";
  const btn = "rounded border border-zinc-300 px-3 py-1.5 text-sm dark:border-zinc-700";

  return (
    <header className="flex flex-wrap items-center gap-3 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <Link href="/" className="mr-auto text-lg font-semibold">Fluteria</Link>
      {me?.role === "admin" && <Link href="/admin" className={btn}>{t("admin")}</Link>}
      <form action={setLocale}>
        <input type="hidden" name="locale" value={other} />
        <button className={btn}>{other.toUpperCase()}</button>
      </form>
      {me && (
        <form action={signOut}>
          <button className={btn}>{t("logout")}</button>
        </form>
      )}
    </header>
  );
}
