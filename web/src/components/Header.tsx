import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { setLocale } from "@/app/actions";
import { getCurrentUser } from "@/lib/auth";
import { UserMenu } from "./UserMenu";

export async function Header() {
  const [t, locale, me] = await Promise.all([getTranslations("nav"), getLocale(), getCurrentUser()]);
  const other = locale === "vi" ? "en" : "vi";

  return (
    <header className="border-b border-[var(--line)]">
      <div className="shell flex flex-wrap items-center gap-2 py-3">
        <Link href="/" className="mr-4 font-[family-name:var(--font-heading)] text-xl font-semibold">
          Fluteria<span className="text-[var(--accent)]">.</span>
        </Link>
        {me && <Link href="/" className="navlink">{t("lessons")}</Link>}
        {me && <Link href="/progress" className="navlink">{t("progress")}</Link>}
        {me?.role === "admin" && <Link href="/admin" className="navlink">{t("admin")}</Link>}
        <form action={setLocale} className="ml-auto">
          <input type="hidden" name="locale" value={other} />
          <button className="btn btn-sm" aria-label={other === "en" ? "English" : "Tiếng Việt"}>{other.toUpperCase()}</button>
        </form>
        {me && (
          <UserMenu
            username={me.username}
            role={t(me.role === "admin" ? "roleAdmin" : "roleUser")}
            labels={{ account: t("account"), signedInAs: t("signedInAs"), logout: t("logout") }}
          />
        )}
      </div>
    </header>
  );
}
