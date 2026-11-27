// Giao diện tùy chỉnh: màu nền, màu nút và phông chữ. Lưu ở trình duyệt (localStorage), áp dụng bằng biến CSS.
export type Theme = { bg?: string; accent?: string; font?: string };
export const THEME_KEY = "fluteria.theme";
export const FONT_IDS = ["default", "times", "arial", "calibri"] as const;

// Hàm này được nhúng nguyên văn vào <script> chạy trước khi vẽ trang (tránh nháy màu), nên phải tự đủ:
// không dùng biến hay hàm bên ngoài, không dùng spread.
export function themeToVars(theme: { bg?: string; accent?: string; font?: string }): Record<string, string> {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const hex = (c: number[]) => "#" + c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const mix = (a: string, b: string, t: number) => {
    const x = rgb(a), y = rgb(b);
    return hex(x.map((v, i) => v + (y[i] - v) * t));
  };
  const lum = (h: string) => {
    const [r, g, b] = rgb(h).map((v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4); });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ok = /^#[0-9a-f]{6}$/i;
  const out: Record<string, string> = {};

  if (theme.bg && ok.test(theme.bg)) {
    const bg = theme.bg;
    const dark = lum(bg) < 0.25;
    const fg = dark ? "#f1e9df" : "#2a2420";
    out["--background"] = bg;
    out["--foreground"] = fg;
    out["--surface"] = dark ? mix(bg, "#ffffff", 0.06) : mix(bg, "#ffffff", 0.55);
    out["--line"] = mix(bg, fg, 0.16);
    out["--muted"] = mix(bg, fg, 0.62);
    out["--ok"] = dark ? "#9bc59d" : "#3f6b42";
    out["--ok-soft"] = dark ? "#26362a" : "#e1ecd9";
    out["--bad"] = dark ? "#f0907c" : "#a63a27";
    out["--bad-soft"] = dark ? "#3d2420" : "#f6dcd5";
    out["--warn-soft"] = dark ? "#4a3f1c" : "#f4e2a8";
    out["color-scheme"] = dark ? "dark" : "light";
  }
  if (theme.accent && ok.test(theme.accent)) {
    const a = theme.accent;
    const base = out["--background"] || "#fbf7f0";
    out["--accent"] = a;
    out["--accent-ink"] = lum(a) > 0.4 ? "#1b1714" : "#ffffff";
    out["--accent-soft"] = mix(base, a, 0.18);
  }
  // Phông có sẵn trong máy (không tải từ mạng). Calibri chỉ có trên máy cài Office/Windows, nơi khác dùng phông tương tự.
  const fonts: Record<string, string> = {
    times: '"Times New Roman", Times, "Liberation Serif", serif',
    arial: "Arial, Helvetica, \"Liberation Sans\", sans-serif",
    calibri: "Calibri, Carlito, \"Segoe UI\", sans-serif",
  };
  if (theme.font && fonts[theme.font]) {
    out["--font-body"] = fonts[theme.font];
    out["--font-heading"] = fonts[theme.font];
  }
  return out;
}

export function readTheme(raw: string | null): Theme {
  try { return raw ? (JSON.parse(raw) as Theme) : {}; } catch { return {}; }
}

// Đoạn script đặt vào <head>: áp dụng giao diện đã lưu ngay khi trang bắt đầu vẽ.
export const themeInitScript = `(function(){try{var f=${themeToVars.toString()};var r=localStorage.getItem(${JSON.stringify(THEME_KEY)});if(!r)return;var v=f(JSON.parse(r)),s=document.documentElement.style;for(var k in v)s.setProperty(k,v[k]);}catch(e){}})();`;
