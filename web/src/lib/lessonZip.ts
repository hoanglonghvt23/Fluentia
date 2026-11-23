import { strFromU8, unzipSync } from "fflate";

// Đọc file zip do chức năng "Tải zip" tạo ra (app/lessons/[id]/export/route.ts).
export type ImportedSentence = { idx: number; start: number; end: number; text: string };
export type ImportedAttempt = { createdAt: string; sentenceIdx: number; sentenceText: string; answer: string; score: number };
export type ImportedRecording = {
  sentenceIdx: number | null; // vị trí câu trong sentences (đã lọc), null nếu câu gốc đã bị xóa
  start: number;
  end: number;
  text: string;
  mime: string;
  createdAt: string;
  ext: string;
  data: Uint8Array;
};
export type ImportedLesson = {
  title: string;
  sourceType: "upload" | "youtube";
  sourceUrl: string | null;
  duration: number | null;
  createdAt: string | null;
  settings: unknown;
  sentences: ImportedSentence[];
  attempts: ImportedAttempt[];
  audio: { ext: string; data: Uint8Array };
  recordings: ImportedRecording[];
};

// Tách CSV có ngoặc kép (ô có thể chứa dấu phẩy, xuống dòng, "" là một dấu ngoặc kép).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((v) => v !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((v) => v !== "")) rows.push(row);
  return rows;
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);

export function parseLessonZip(bytes: Uint8Array): ImportedLesson {
  let files: Record<string, Uint8Array>;
  try {
    files = unzipSync(bytes);
  } catch {
    throw new Error("zip");
  }
  const json = (name: string) => {
    if (!files[name]) throw new Error(`missing:${name}`);
    try { return JSON.parse(strFromU8(files[name])); } catch { throw new Error(`invalid:${name}`); }
  };

  const info = json("lesson.json");
  const rawSentences = json("sentences.json");
  if (!Array.isArray(rawSentences)) throw new Error("invalid:sentences.json");

  const audioName = Object.keys(files).find((n) => /^audio\.[a-z0-9]+$/i.test(n));
  if (!audioName) throw new Error("missing:audio");

  const sentences: ImportedSentence[] = [];
  for (const s of rawSentences) {
    const start = num(s?.start), end = num(s?.end);
    const text = typeof s?.text === "string" ? s.text.trim() : "";
    if (text && start !== null && end !== null && end > start) sentences.push({ idx: sentences.length, start, end, text });
  }

  const attempts: ImportedAttempt[] = [];
  if (files["dictation_history.csv"]) {
    const [, ...rows] = parseCsv(strFromU8(files["dictation_history.csv"]));
    for (const [time, no, sentence, answer, score] of rows) {
      const n = Number(no), sc = Number(score), t = new Date(time);
      if (!Number.isFinite(n) || !Number.isFinite(sc) || Number.isNaN(t.getTime())) continue;
      attempts.push({ createdAt: t.toISOString(), sentenceIdx: n - 1, sentenceText: sentence ?? "", answer: answer ?? "", score: sc });
    }
  }

  const recordings: ImportedRecording[] = [];
  if (files["recordings.json"]) {
    const manifest = json("recordings.json");
    if (!Array.isArray(manifest)) throw new Error("invalid:recordings.json");
    for (const m of manifest) {
      const data = typeof m?.file === "string" ? files[m.file] : undefined;
      const start = num(m?.start), end = num(m?.end), t = new Date(m?.created_at);
      if (!data?.length || start === null || end === null || Number.isNaN(t.getTime())) continue;
      const si = num(m.sentence_index);
      recordings.push({
        sentenceIdx: si !== null && si >= 0 ? si : null,
        start,
        end,
        text: typeof m.text === "string" ? m.text : "",
        mime: typeof m.mime === "string" ? m.mime : "audio/webm",
        createdAt: t.toISOString(),
        ext: (m.file.split(".").pop() || "webm").toLowerCase().replace(/[^a-z0-9]/g, "") || "webm",
        data,
      });
    }
  }

  return {
    title: typeof info.title === "string" && info.title.trim() ? info.title.trim() : "Lesson",
    sourceType: info.source_type === "youtube" ? "youtube" : "upload",
    sourceUrl: typeof info.source_url === "string" ? info.source_url : null,
    duration: num(info.duration_sec),
    createdAt: typeof info.created_at === "string" ? info.created_at : null,
    settings: info.settings && typeof info.settings === "object" ? info.settings : {},
    sentences,
    attempts,
    recordings,
    audio: { ext: audioName.split(".").pop()!.toLowerCase(), data: files[audioName] },
  };
}
