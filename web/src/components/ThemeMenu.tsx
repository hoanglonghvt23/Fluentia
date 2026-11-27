"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { FONT_IDS, THEME_KEY, readTheme, themeToVars, type Theme } from "@/lib/theme";

const VAR_NAMES = ["--background", "--foreground", "--surface", "--line", "--muted", "--ok", "--ok-soft", "--bad", "--bad-soft",
  "--warn-soft", "--accent", "--accent-ink", "--accent-soft", "--font-body", "--font-heading", "color-scheme"];

// Nút bảng màu ở thanh trên: đổi màu nền, màu nút và phông chữ. Lưu ở trình duyệt của người dùng.
export function ThemeMenu() {
  const t = useTranslations("theme");
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>({});
  const [shown, setShown] = useState({ bg: "#fbf7f0", accent: "#b5532d" }); // giá trị hiện trên ô chọn màu
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", away); document.removeEventListener("keydown", esc); };
  }, [open]);

  const toggle = () => {
    if (!open) {
      // Mở bảng: đọc giao diện đã lưu và màu đang hiển thị thật (kể cả chế độ tối của hệ thống).
      const saved = readTheme(localStorage.getItem(THEME_KEY));
      const css = getComputedStyle(document.documentElement);
      const read = (name: string, fallback: string) => {
        const v = css.getPropertyValue(name).trim();
        return /^#[0-9a-f]{6}$/i.test(v) ? v : fallback;
      };
      setTheme(saved);
      setShown({ bg: saved.bg ?? read("--background", "#fbf7f0"), accent: saved.accent ?? read("--accent", "#b5532d") });
    }
    setOpen(!open);
  };

  const apply = (next: Theme) => {
    setTheme(next);
    const style = document.documentElement.style;
    VAR_NAMES.forEach((n) => style.removeProperty(n));
    const vars = themeToVars(next);
    for (const k of Object.keys(vars)) style.setProperty(k, vars[k]);
    try { localStorage.setItem(THEME_KEY, JSON.stringify(next)); } catch {}
  };

  const reset = () => {
    apply({});
    try { localStorage.removeItem(THEME_KEY); } catch {}
    const css = getComputedStyle(document.documentElement);
    setShown({ bg: css.getPropertyValue("--background").trim() || "#fbf7f0", accent: css.getPropertyValue("--accent").trim() || "#b5532d" });
  };

  return (
    <div ref={box} className="relative">
      <button className="btn btn-sm !px-3" aria-haspopup="dialog" aria-expanded={open} aria-label={t("title")} title={t("title")} onClick={toggle}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M12 3a9 9 0 100 18c1.1 0 1.7-.8 1.7-1.6 0-.5-.3-.9-.5-1.3-.3-.5-.2-1.3.9-1.3H17a4 4 0 004-4c0-5-4-9.8-9-9.8z" />
          <circle cx="7.5" cy="11" r="1" /><circle cx="10.5" cy="7" r="1" /><circle cx="15" cy="7.5" r="1" />
        </svg>
      </button>
      {open && (
        <div className="menu-panel flex flex-col gap-3" role="dialog" aria-label={t("title")}>
          <h2 className="!text-base">{t("title")}</h2>
          <label className="flex items-center justify-between gap-3 text-sm">{t("background")}
            <input type="color" value={shown.bg} onChange={(e) => { setShown({ ...shown, bg: e.target.value }); apply({ ...theme, bg: e.target.value }); }} className="h-9 w-14 cursor-pointer rounded border border-[var(--line)] bg-transparent p-0.5" />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">{t("buttons")}
            <input type="color" value={shown.accent} onChange={(e) => { setShown({ ...shown, accent: e.target.value }); apply({ ...theme, accent: e.target.value }); }} className="h-9 w-14 cursor-pointer rounded border border-[var(--line)] bg-transparent p-0.5" />
          </label>
          <label className="flex items-center justify-between gap-3 text-sm">{t("font")}
            <select value={theme.font ?? "default"} onChange={(e) => apply({ ...theme, font: e.target.value })} className="field !min-h-9 !w-40 !py-1 text-sm">
              {FONT_IDS.map((id) => <option key={id} value={id}>{t(`fonts.${id}`)}</option>)}
            </select>
          </label>
          <button className="btn btn-sm" onClick={reset}>{t("reset")}</button>
        </div>
      )}
    </div>
  );
}
