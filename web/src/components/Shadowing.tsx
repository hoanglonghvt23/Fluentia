"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { playSegment } from "@/lib/audio";
import { createClient } from "@/lib/supabase/browser";

type S = { id: string; text: string; start: number; end: number };
export type Rec = { id: string; sentence_id: string | null; path: string; mime: string; created_at: string };

// Chrome ghi webm/opus, Safari (iPhone) ghi mp4: chọn định dạng trình duyệt hỗ trợ.
function pickMime() {
  const list = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return list.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

export function Shadowing({ lessonId, sentences, audioUrl, initialRecs }: { lessonId: string; sentences: S[]; audioUrl: string; initialRecs: Rec[] }) {
  const t = useTranslations("shadowing");
  const [i, setI] = useState(0);
  const [recs, setRecs] = useState(initialRecs);
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const audio = useRef<HTMLAudioElement>(null);
  const cancel = useRef({ v: false });
  const recorder = useRef<MediaRecorder | null>(null);
  const s = sentences[i];

  useEffect(() => () => { cancel.current.v = true; recorder.current?.stream.getTracks().forEach((tr) => tr.stop()); }, []);

  const playOriginal = () => {
    cancel.current.v = true;
    cancel.current = { v: false };
    if (audio.current) playSegment(audio.current, s.start, s.end, 1, cancel.current);
  };

  const startRec = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = pickMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: Blob[] = [];
      mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
      mr.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        const blob = new Blob(chunks, { type: mr.mimeType || mime });
        setDraft({ blob, url: URL.createObjectURL(blob) });
      };
      recorder.current = mr;
      mr.start();
      setRecording(true);
    } catch {
      setError(t("errMic"));
    }
  };

  const stopRec = () => { recorder.current?.stop(); setRecording(false); };

  const save = async () => {
    if (!draft) return;
    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const id = crypto.randomUUID();
    const ext = draft.blob.type.includes("mp4") ? "m4a" : draft.blob.type.includes("ogg") ? "ogg" : "webm";
    const path = `${user.id}/rec/${id}.${ext}`;
    const up = await supabase.storage.from("media").upload(path, draft.blob, { contentType: draft.blob.type });
    if (up.error) { setBusy(false); return setError(up.error.message); }
    const row = { id, lesson_id: lessonId, sentence_id: s.id, start_sec: s.start, end_sec: s.end, sentence_text: s.text, path, mime: draft.blob.type };
    const ins = await supabase.from("recordings").insert(row).select("id, sentence_id, path, mime, created_at").single();
    setBusy(false);
    if (ins.error) return setError(ins.error.message);
    setRecs((r) => [ins.data, ...r]);
    URL.revokeObjectURL(draft.url);
    setDraft(null);
  };

  const playRec = async (r: Rec) => {
    const { data } = await createClient().storage.from("media").createSignedUrl(r.path, 3600);
    if (data) new Audio(data.signedUrl).play();
  };

  const removeRec = async (r: Rec) => {
    if (!confirm(t("deleteConfirm"))) return;
    const supabase = createClient();
    await supabase.storage.from("media").remove([r.path]);
    await supabase.from("recordings").delete().eq("id", r.id);
    setRecs((all) => all.filter((x) => x.id !== r.id));
  };

  const go = (n: number) => {
    if (n < 0 || n >= sentences.length) return;
    cancel.current.v = true;
    if (draft) URL.revokeObjectURL(draft.url);
    setDraft(null);
    setError("");
    setI(n);
  };

  const btn = "rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700";
  const primary = "rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900";
  if (!s) return <p>{t("empty")}</p>;
  const mine = recs.filter((r) => r.sentence_id === s.id);

  return (
    <div className="flex flex-col gap-4">
      <audio ref={audio} src={audioUrl} preload="auto" />
      <p className="text-sm text-zinc-500">{t("progress", { n: i + 1, total: sentences.length })}</p>
      <p className="text-xl leading-relaxed">{s.text}</p>

      <div className="flex flex-wrap gap-2">
        <button className={primary} onClick={playOriginal}>▶ {t("playOriginal")}</button>
        {!recording ? (
          <button className={btn} onClick={startRec} disabled={!!draft}>● {t("record")}</button>
        ) : (
          <button className="rounded bg-red-600 px-4 py-2 text-white" onClick={stopRec}>■ {t("stop")}</button>
        )}
      </div>

      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}

      {draft && (
        <div className="flex flex-col gap-2 rounded border border-zinc-200 p-3 dark:border-zinc-800">
          <audio src={draft.url} controls className="w-full" />
          <div className="flex gap-2">
            <button className={primary} onClick={save} disabled={busy}>{t("save")}</button>
            <button className={btn} onClick={() => { URL.revokeObjectURL(draft.url); setDraft(null); }}>{t("discard")}</button>
          </div>
        </div>
      )}

      {mine.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium">{t("saved")}</h2>
          <ul className="flex flex-col gap-2">
            {mine.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2 rounded border border-zinc-200 p-2 text-sm dark:border-zinc-800">
                <span className="text-zinc-500">{new Date(r.created_at).toLocaleString()}</span>
                <span className="flex gap-2">
                  <button className={btn} onClick={() => playRec(r)}>▶ {t("listen")}</button>
                  <button className={btn} onClick={() => removeRec(r)}>{t("delete")}</button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <button className={btn} onClick={() => go(i - 1)} disabled={i === 0 || recording}>{t("prev")}</button>
        <button className={btn} onClick={() => go(i + 1)} disabled={i === sentences.length - 1 || recording}>{t("next")}</button>
      </div>
    </div>
  );
}
