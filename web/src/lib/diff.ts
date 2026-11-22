// So sánh câu trả lời chính tả với câu gốc theo từng từ (bỏ qua hoa thường và dấu câu).
export type DiffToken = { word: string; status: "ok" | "missing" | "extra" };

export const words = (s: string) =>
  s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^a-z0-9'\s]/g, " ").split(/\s+/).filter(Boolean);

export function compare(reference: string, answer: string): { score: number; tokens: DiffToken[] } {
  const a = words(reference);
  const b = words(answer);
  // Độ dài dãy con chung dài nhất, tính từ cuối về đầu.
  const L = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);

  const tokens: DiffToken[] = [];
  let i = 0, j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { tokens.push({ word: a[i], status: "ok" }); i++; j++; }
    else if (j >= b.length || (i < a.length && L[i + 1][j] >= L[i][j + 1])) tokens.push({ word: a[i++], status: "missing" });
    else tokens.push({ word: b[j++], status: "extra" });
  }
  const score = L[0][0] / Math.max(a.length, b.length, 1);
  return { score, tokens };
}
