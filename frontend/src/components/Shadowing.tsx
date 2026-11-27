"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { playSegment } from "@/lib/audio";
import { createClient } from "@/lib/supabase/browser";
import { useDialog } from "./DialogProvider";
import { SentenceList } from "./SentenceList";

const SUBS_KEY = "fluteria.shadowing.subs";

type S = { id: string; text: string; start: number; end: number };
export type Rec = { id: string; sentence_id: string | null; path: string; mime: string; created_at: string };

// Chrome ghi webm/opus, Safari (iPhone) ghi mp4: chọn định dạng trình duyệt hỗ trợ.
function pickMime() {
  const list = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg;codecs=opus"];
  return list.find((m) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(m)) ?? "";
}

export function Shadowing({ lessonId, sentences, audioUrl, initialRecs }: { lessonId: string; sentences: S[]; audioUrl: string; initialRecs: Rec[] }) {
  const t = useTranslations("shadowing");
  const tp = useTranslations("practice");
  const dialog = useDialog();
  const [i, setI] = useState(0);
  const [recs, setRecs] = useState(initialRecs);
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showSubs, setShowSubs] = useState(true);
  const audio = useRef<HTMLAudioElement>(null);
  const cancel = useRef({ v: false });
  const recorder = useRef<MediaRecorder | null>(null);
  const s = sentences[i];

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { if (localStorage.getItem(SUBS_KEY) === "0") setShowSubs(false); } catch {}
  }, []);
  const toggleSubs = () => {
    setShowSubs(!showSubs);
    try { localStorage.setItem(SUBS_KEY, showSubs ? "0" : "1"); } catch {}
  };

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
    if (!(await dialog.confirm(t("deleteConfirm"), { danger: true }))) return;
    const supabase = createClient();
    await supabase.storage.from("media").remove([r.path]);
    await supabase.from("recordings").delete().eq("id", r.id);
    setRecs((all) => all.filter((x) => x.id !== r.id));
  };

  const go = (n: number) => {
    if (n < 0 || n >= sentences.length || recording) return;
    cancel.current.v = true;
    if (draft) URL.revokeObjectURL(draft.url);
    setDraft(null);
    setError("");
    setI(n);
  };

  if (!s) return <p>{t("empty")}</p>;
  const mine = recs.filter((r) => r.sentence_id === s.id);
  const marks: Record<number, string> = {};
  sentences.forEach((x, k) => { const n = recs.filter((r) => r.sentence_id === x.id).length; if (n) marks[k] = `●${n}`; });

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <audio ref={audio} src={audioUrl} preload="auto" />

      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-48 flex-1">
            <p className="muted mb-1 text-sm">{t("progress", { n: i + 1, total: sentences.length })}</p>
            <div className="progress"><span style={{ width: `${((i + 1) / sentences.length) * 100}%` }} /></div>
          </div>
          <button className={`btn btn-sm ${showSubs ? "btn-primary" : ""}`} aria-pressed={showSubs} onClick={toggleSubs}>{t("subsToggle")}</button>
        </div>

        {/* Ẩn phụ đề: mỗi chữ thành dấu chấm tròn như ô mật khẩu, giữ nguyên khoảng trắng. */}
        <p
          className="card break-words font-[family-name:var(--font-heading)] text-2xl leading-relaxed"
          aria-label={showSubs ? undefined : t("subsHidden")}
        >
          {showSubs ? s.text : s.text.replace(/\S/g, "•")}
        </p>

        <div className="flex flex-wrap gap-3">
          <button className="btn btn-primary btn-lg flex-1" onClick={playOriginal}>▶ {t("playOriginal")}</button>
          {!recording ? (
            <button className="btn btn-lg flex-1" onClick={startRec} disabled={!!draft}>● {t("record")}</button>
          ) : (
            <button className="btn btn-danger btn-lg flex-1" onClick={stopRec}><span className="rec-dot" /> {t("stop")}</button>
          )}
        </div>

        {error && <p className="msg-err text-sm">{error}</p>}

        {draft && (
          <div className="card flex flex-col gap-3">
            <audio src={draft.url} controls className="w-full" />
            <div className="flex gap-2">
              <button className="btn btn-primary flex-1" onClick={save} disabled={busy}>{t("save")}</button>
              <button className="btn" onClick={() => { URL.revokeObjectURL(draft.url); setDraft(null); }}>{t("discard")}</button>
            </div>
          </div>
        )}

        {mine.length > 0 && (
          <div>
            <h2 className="mb-2">{t("saved")}</h2>
            <ul className="flex flex-col gap-2">
              {mine.map((r) => (
                <li key={r.id} className="card flex flex-wrap items-center justify-between gap-2 text-sm">
                  <span className="muted">{new Date(r.created_at).toLocaleString()}</span>
                  <span className="flex gap-2">
                    <button className="btn btn-sm" onClick={() => playRec(r)}>▶ {t("listen")}</button>
                    <button className="btn btn-sm btn-danger" onClick={() => removeRec(r)}>{t("delete")}</button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <details className="card lg:hidden">
          <summary className="cursor-pointer font-medium">{tp("sentences")}</summary>
          <div className="mt-2 max-h-72 overflow-auto">
            <SentenceList texts={sentences.map((x) => x.text)} current={i} marks={marks} hideText={!showSubs} hiddenLabel={(n) => tp("sentenceN", { n })} onSelect={go} />
          </div>
        </details>

        <div className="sticky-bar">
          <button className="btn" onClick={() => go(i - 1)} disabled={i === 0 || recording}>← {t("prev")}</button>
          <button className="btn btn-primary flex-1" onClick={() => go(i + 1)} disabled={i === sentences.length - 1 || recording}>{t("next")} →</button>
        </div>
      </section>

      <aside className="card hidden max-h-[calc(100vh-11rem)] overflow-auto lg:sticky lg:top-20 lg:block">
        <h2 className="mb-2 px-2">{tp("sentences")}</h2>
        <SentenceList texts={sentences.map((x) => x.text)} current={i} marks={marks} hideText={!showSubs} hiddenLabel={(n) => tp("sentenceN", { n })} onSelect={go} />
      </aside>
    </div>
  );
}
