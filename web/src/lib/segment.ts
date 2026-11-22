// Tách phụ đề thô (cues) thành câu. Hàm thuần, không phụ thuộc framework.
export type Cue = { start: number; end: number; text: string };
export type Sentence = { start: number; end: number; text: string };
export type SegmentOptions = { maxChars?: number; minChars?: number };

const ABBR = new Set(["mr.", "mrs.", "ms.", "dr.", "prof.", "st.", "jr.", "sr.", "vs.", "etc.", "e.g.", "i.e.", "no."]);
const ENDS = /[.!?…]["')\]”’]*$/;
const CLAUSE = /[,;:]["')\]”’]*$/;

const endsSentence = (t: string) =>
  ENDS.test(t) && !ABBR.has(t.toLowerCase()) && !/^(?:[A-Za-z]\.){2,}$/.test(t);

type Token = { text: string; start: number; end: number };

// Mỗi cue chia thành từ, thời gian nội suy theo số ký tự.
function tokenize(cues: Cue[]): Token[] {
  const out: Token[] = [];
  for (const cue of cues) {
    const words = cue.text.replace(/<[^>]*>/g, " ").replace(/[♪♫]/g, " ").split(/\s+/).filter(Boolean);
    const total = words.reduce((n, w) => n + w.length + 1, 0);
    let pos = 0;
    for (const w of words) {
      const s = cue.start + ((cue.end - cue.start) * pos) / total;
      pos += w.length + 1;
      out.push({ text: w, start: s, end: cue.start + ((cue.end - cue.start) * pos) / total });
    }
  }
  return out;
}

const toSentence = (g: Token[]): Sentence => ({
  start: g[0].start,
  end: g[g.length - 1].end,
  text: g.map((t) => t.text).join(" "),
});

export function segment(cues: Cue[], { maxChars = 140, minChars = 0 }: SegmentOptions = {}): Sentence[] {
  const groups: Token[][] = [];
  let cur: Token[] = [];
  let len = 0;

  for (const tok of tokenize(cues)) {
    if (cur.length && len + 1 + tok.text.length > maxChars) {
      // Quá dài: cắt tại dấu phẩy gần nhất (nửa sau của nhóm), nếu không có thì cắt ngay.
      let at = -1;
      for (let i = cur.length - 1; i >= cur.length * 0.4; i--) if (CLAUSE.test(cur[i].text)) { at = i; break; }
      const cut = at >= 0 && at < cur.length - 1 ? at + 1 : cur.length;
      groups.push(cur.slice(0, cut));
      cur = cur.slice(cut);
      len = cur.reduce((n, t) => n + t.text.length + 1, 0);
    }
    cur.push(tok);
    len += tok.text.length + 1;
    if (endsSentence(tok.text)) {
      groups.push(cur);
      cur = [];
      len = 0;
    }
  }
  if (cur.length) groups.push(cur);

  // Gộp câu ngắn hơn minChars vào câu sau.
  const out: Token[][] = [];
  for (const g of groups) {
    const prev = out[out.length - 1];
    if (prev && prev.reduce((n, t) => n + t.text.length + 1, 0) < minChars) prev.push(...g);
    else out.push([...g]);
  }
  return out.map(toSentence);
}
