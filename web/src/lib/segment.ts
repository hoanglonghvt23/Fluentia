// Tách phụ đề thô (cues) thành câu. Hàm thuần, không phụ thuộc framework.
export type Cue = { start: number; end: number; text: string };
export type Sentence = { start: number; end: number; text: string };
export type SegmentOptions = { maxChars?: number; minChars?: number };

const ABBR = new Set(["mr.", "mrs.", "ms.", "dr.", "prof.", "st.", "jr.", "sr.", "vs.", "etc.", "e.g.", "i.e.", "no."]);
const ENDS = /[.!?…]["')\]”’]*$/;
const CLAUSE = /[,;:]["')\]”’]*$/;

const endsSentence = (t: string) =>
  ENDS.test(t) && !ABBR.has(t.toLowerCase()) && !/^(?:[A-Za-z]\.){2,}$/.test(t);

type Token = { text: string; start: number; end: number; gapBefore?: number };

const MAX_GAP = 1.5; // khoảng lặng (giây) giữa hai cue coi như ngắt câu
const SOFT_GAP = 0.5; // nghỉ nhẹ giữa hai cue (lời hát, thoại không dấu câu) cũng ngắt câu...
const SOFT_MIN = 25; // ...nhưng chỉ khi câu đang dở đã đủ dài, để không vụn thành 2-3 chữ
const MERGE_GAP = 3; // câu ngắn chỉ được gộp với câu sau nếu cách nhau không quá ngần này giây

// Mỗi cue chia thành từ, thời gian nội suy theo số ký tự. Từ đầu mỗi cue mang khoảng nghỉ trước nó.
function tokenize(cues: Cue[]): Token[] {
  const out: Token[] = [];
  let prevEnd = -Infinity;
  for (const cue of cues) {
    const gapBefore = out.length ? cue.start - prevEnd : 0;
    prevEnd = cue.end;
    const words = cue.text.replace(/<[^>]*>/g, " ").replace(/[♪♫]/g, " ").split(/\s+/).filter(Boolean);
    const total = words.reduce((n, w) => n + w.length + 1, 0);
    let pos = 0;
    for (const w of words) {
      const s = cue.start + ((cue.end - cue.start) * pos) / total;
      pos += w.length + 1;
      out.push({ text: w, start: s, end: cue.start + ((cue.end - cue.start) * pos) / total, gapBefore: pos === w.length + 1 ? gapBefore : 0 });
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
    const gap = tok.gapBefore ?? 0;
    if (cur.length && (gap > MAX_GAP || (gap >= SOFT_GAP && len >= SOFT_MIN))) {
      groups.push(cur);
      cur = [];
      len = 0;
    }
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

  // Gộp câu ngắn hơn minChars vào câu sau, nếu câu gộp không vượt maxChars và hai câu không cách nhau quá xa.
  const size = (g: Token[]) => g.reduce((n, t) => n + t.text.length + 1, 0);
  const out: Token[][] = [];
  for (const g of groups) {
    const prev = out[out.length - 1];
    const near = prev && g[0].start - prev[prev.length - 1].end <= MERGE_GAP;
    if (prev && near && size(prev) < minChars && size(prev) + size(g) <= maxChars) prev.push(...g);
    else out.push([...g]);
  }
  return out.map(toSentence);
}
