import { zipSync, strToU8 } from "fflate";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const pad = (n: number, w = 2) => String(n).padStart(w, "0");
function srtTime(sec: number) {
  const ms = Math.round(sec * 1000);
  return `${pad(Math.floor(ms / 3600000))}:${pad(Math.floor(ms / 60000) % 60)}:${pad(Math.floor(ms / 1000) % 60)},${pad(ms % 1000, 3)}`;
}
const csvCell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
const safeName = (s: string) => s.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").trim().slice(0, 80) || "lesson";

// Tải bài học dạng zip. Dùng client của người dùng nên RLS chỉ cho tải bài của chính họ.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: lesson } = await supabase.from("lessons").select("*").eq("id", id).maybeSingle();
  if (!lesson) return new NextResponse("Not found", { status: 404 });
  if (lesson.status !== "ready" || !lesson.audio_path) return new NextResponse("Lesson not ready", { status: 409 });

  const [{ data: sentences }, { data: attempts }, audio] = await Promise.all([
    supabase.from("sentences").select("id, idx, start_sec, end_sec, text").eq("lesson_id", id).order("idx"),
    supabase.from("attempts").select("created_at, sentence_idx, sentence_text, answer, score").eq("lesson_id", id).order("created_at"),
    supabase.storage.from("media").download(lesson.audio_path),
  ]);
  if (audio.error || !audio.data) return new NextResponse("Audio unavailable", { status: 502 });

  const { data: recs } = await supabase
    .from("recordings")
    .select("sentence_id, start_sec, end_sec, sentence_text, path, mime, created_at")
    .eq("lesson_id", id).order("created_at");
  const idxById = new Map((sentences ?? []).map((s) => [s.id, s.idx]));
  // Tải song song các bản ghi âm Shadowing; bản nào không tải được thì bỏ qua.
  const recFiles = (
    await Promise.all(
      (recs ?? []).map(async (r) => {
        const { data } = await supabase.storage.from("media").download(r.path);
        return data ? { r, bytes: new Uint8Array(await data.arrayBuffer()) } : null;
      }),
    )
  ).filter((x): x is NonNullable<typeof x> => !!x);

  const rows = sentences ?? [];
  const info = {
    title: lesson.title,
    source_type: lesson.source_type,
    source_url: lesson.source_url,
    duration_sec: lesson.duration,
    created_at: lesson.created_at,
    settings: lesson.settings,
    sentence_count: rows.length,
  };
  const srt = rows
    .map((s, i) => `${i + 1}\n${srtTime(s.start_sec)} --> ${srtTime(s.end_sec)}\n${s.text}\n`)
    .join("\n");
  const csv = [
    ["time", "sentence_no", "sentence", "answer", "score"].map(csvCell).join(","),
    ...(attempts ?? []).map((a) =>
      [a.created_at, a.sentence_idx + 1, a.sentence_text, a.answer, a.score].map(csvCell).join(","),
    ),
  ].join("\r\n");

  const ext = lesson.audio_path.split(".").pop() || "mp3";
  const recFileMap: Record<string, Uint8Array | [Uint8Array, { level: 0 }]> = {};
  const recManifest = recFiles.map(({ r, bytes }, i) => {
    const file = `recordings/${pad(i + 1, 3)}.${r.path.split(".").pop() || "webm"}`;
    recFileMap[file] = [bytes, { level: 0 }]; // âm thanh đã nén sẵn
    return {
      file,
      sentence_index: r.sentence_id ? (idxById.get(r.sentence_id) ?? null) : null,
      start: r.start_sec,
      end: r.end_sec,
      text: r.sentence_text,
      mime: r.mime,
      created_at: r.created_at,
    };
  });

  const zip = zipSync(
    {
      ...recFileMap,
      "recordings.json": strToU8(JSON.stringify(recManifest, null, 2)),
      "lesson.json": strToU8(JSON.stringify(info, null, 2)),
      [`audio.${ext}`]: [new Uint8Array(await audio.data.arrayBuffer()), { level: 0 }], // mp3 đã nén sẵn
      "sentences.json": strToU8(JSON.stringify(rows.map((s) => ({ index: s.idx, start: s.start_sec, end: s.end_sec, text: s.text })), null, 2)),
      "sentences.srt": strToU8(srt),
      // BOM để Excel đọc đúng tiếng Việt
      "dictation_history.csv": strToU8("﻿" + csv),
    },
    { level: 6 },
  );

  const name = safeName(lesson.title);
  return new NextResponse(new Blob([zip as BlobPart], { type: "application/zip" }), {
    headers: {
      "Content-Disposition": `attachment; filename="lesson.zip"; filename*=UTF-8''${encodeURIComponent(name)}.zip`,
      "Cache-Control": "no-store",
    },
  });
}
