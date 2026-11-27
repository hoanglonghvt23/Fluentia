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

const PAUSE_END = 6; // trọng số nghỉ sau chữ kết thúc câu (tính theo ký tự), để chữ cuối câu không bị kéo dài sang chỗ nghỉ
const PAUSE_CLAUSE = 3; // nghỉ sau dấu phẩy, chấm phẩy, hai chấm

// Mỗi cue chia thành từ, thời gian nội suy theo số ký tự cộng thêm chỗ nghỉ sau dấu câu: chữ cuối câu kết thúc
// trước khoảng nghỉ và câu kế bắt đầu sau nó. Từ đầu mỗi cue mang khoảng nghỉ trước nó.
function tokenize(cues: Cue[]): Token[] {
  const out: Token[] = [];
  let prevEnd = -Infinity;
  for (const cue of cues) {
    const gapBefore = out.length ? cue.start - prevEnd : 0;
    prevEnd = cue.end;
    const words = cue.text.replace(/<[^>]*>/g, " ").replace(/[♪♫]/g, " ").split(/\s+/).filter(Boolean);
    const pause = (w: string, last: boolean) => (last ? 0 : endsSentence(w) ? PAUSE_END : CLAUSE.test(w) ? PAUSE_CLAUSE : 0);
    const total = words.reduce((n, w, k) => n + w.length + 1 + pause(w, k === words.length - 1), 0);
    let pos = 0;
    words.forEach((w, k) => {
      const s = cue.start + ((cue.end - cue.start) * pos) / total;
      const e = cue.start + ((cue.end - cue.start) * (pos + w.length + 1)) / total;
      pos += w.length + 1 + pause(w, k === words.length - 1);
      out.push({ text: w, start: s, end: e, gapBefore: k === 0 ? gapBefore : 0 });
    });
  }
  return out;
}

const toSentence = (g: Token[]): Sentence => ({
  start: g[0].start,
  end: g[g.length - 1].end,
  text: g.map((t) => t.text).join(" "),
});

// Giữ các câu đầu cho tới khi chạm giới hạn số câu hoặc tổng số chữ. Luôn giữ ít nhất câu đầu tiên.
export function limitSentences(
  list: Sentence[],
  { maxSentences, maxWords }: { maxSentences?: number | null; maxWords?: number | null },
): Sentence[] {
  const out: Sentence[] = [];
  let words = 0;
  for (const s of list) {
    const n = s.text.split(/\s+/).filter(Boolean).length;
    if (maxSentences && out.length >= maxSentences) break;
    if (maxWords && out.length && words + n > maxWords) break;
    out.push(s);
    words += n;
  }
  return out;
}

export function segment(cues: Cue[], { maxChars = 140, minChars = 0 }: SegmentOptions = {}): Sentence[] {
  const tokens = tokenize(cues);
  // Phụ đề đã có dấu câu thì câu chỉ kết thúc ở dấu chấm/hỏi/chấm than, không ngắt giữa chừng vì khoảng lặng.
  // Chỉ khi phụ đề gần như không có dấu câu (lời hát) mới dùng khoảng lặng để chia.
  const punctuated = tokens.filter((t) => endsSentence(t.text)).length * 80 >= tokens.length;
  const groups: Token[][] = [];
  let cur: Token[] = [];
  let len = 0;

  for (const tok of tokens) {
    const gap = tok.gapBefore ?? 0;
    if (!punctuated && cur.length && (gap > MAX_GAP || (gap >= SOFT_GAP && len >= SOFT_MIN))) {
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
