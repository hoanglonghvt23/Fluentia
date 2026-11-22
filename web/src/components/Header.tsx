import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { setLocale, signOut } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";

export async function Header() {
  const [t, locale, me] = await Promise.all([getTranslations("nav"), getLocale(), getCurrentUser()]);
  const other = locale === "vi" ? "en" : "vi";

  return (
    <header className="border-b border-[var(--line)]">
      <div className="mx-auto flex max-w-[44rem] flex-wrap items-center gap-2 px-4 py-3">
        <Link href="/" className="mr-auto font-[family-name:var(--font-heading)] text-xl font-semibold">
          Fluteria<span className="text-[var(--accent)]">.</span>
        </Link>
        {me && <Link href="/progress" className="btn btn-sm">{t("progress")}</Link>}
        {me?.role === "admin" && <Link href="/admin" className="btn btn-sm">{t("admin")}</Link>}
        <form action={setLocale}>
          <input type="hidden" name="locale" value={other} />
          <button className="btn btn-sm" aria-label={other === "en" ? "English" : "Tiếng Việt"}>{other.toUpperCase()}</button>
        </form>
        {me && (
          <form action={signOut}>
            <button className="btn btn-sm">{t("logout")}</button>
          </form>
        )}
      </div>
    </header>
  );
}
