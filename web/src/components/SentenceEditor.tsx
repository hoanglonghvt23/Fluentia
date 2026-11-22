"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { playSegment } from "@/lib/audio";
import { regenerateSentences, saveSentences, type SentenceRow } from "@/app/lessons/actions";

type Row = SentenceRow & { key: string };

export function SentenceEditor({ lessonId, initial, audioUrl }: { lessonId: string; initial: SentenceRow[]; audioUrl: string }) {
  const t = useTranslations("editor");
  const [rows, setRows] = useState<Row[]>(() => initial.map((r) => ({ ...r, key: r.id ?? crypto.randomUUID() })));
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const cancel = useRef({ v: false });

  const patch = (i: number, p: Partial<Row>) => {
    setSaved(false);
    setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...p } : r)));
  };

  const play = (r: Row) => {
    cancel.current.v = true;
    cancel.current = { v: false };
    if (audio.current) playSegment(audio.current, r.start, r.end, 1, cancel.current);
  };

  const merge = (i: number) => {
    setSaved(false);
    setRows((rs) => {
      const [a, b] = [rs[i], rs[i + 1]];
      const m = { ...a, text: `${a.text} ${b.text}`.trim(), start: Math.min(a.start, b.start), end: Math.max(a.end, b.end) };
      return [...rs.slice(0, i), m, ...rs.slice(i + 2)];
    });
  };

  const split = (i: number) => {
    const el = document.getElementById(`t-${rows[i].key}`) as HTMLTextAreaElement | null;
    const r = rows[i];
    const pos = el?.selectionStart ?? 0;
    if (pos <= 0 || pos >= r.text.length) return alert(t("splitHint"));
    const mid = r.start + ((r.end - r.start) * pos) / r.text.length;
    const left = { ...r, text: r.text.slice(0, pos).trim(), end: mid };
    const right = { key: crypto.randomUUID(), text: r.text.slice(pos).trim(), start: mid, end: r.end };
    setSaved(false);
    setRows((rs) => [...rs.slice(0, i), left, right, ...rs.slice(i + 1)]);
  };

  const input = "field !min-h-10 !px-2 !py-1";
  const btn = "btn btn-sm";

  return (
    <div>
      <audio ref={audio} src={audioUrl} preload="auto" />

      <form
        action={(fd) => start(() => regenerateSentences(lessonId, fd).then(() => location.reload()))}
        onSubmit={(e) => { if (!confirm(t("regenConfirm"))) e.preventDefault(); }}
        className="card mb-6 flex flex-wrap items-end gap-3 text-sm"
      >
        <label className="flex flex-col gap-1">{t("maxChars")}
          <input name="maxChars" type="number" defaultValue={140} min={20} max={400} className={`${input} w-24`} />
        </label>
        <label className="flex flex-col gap-1">{t("minChars")}
          <input name="minChars" type="number" defaultValue={0} min={0} max={400} className={`${input} w-24`} />
        </label>
        <button className={btn} disabled={pending}>{t("regen")}</button>
      </form>

      <ol className="flex flex-col gap-3">
        {rows.map((r, i) => (
          <li key={r.key} className="card">
            <div className="muted mb-2 flex items-center gap-2 text-xs">
              <span>#{i + 1}</span>
              <input type="number" step="0.05" value={Number(r.start.toFixed(2))} onChange={(e) => patch(i, { start: Number(e.target.value) })} className={`${input} w-24`} aria-label={t("start")} />
              <span>→</span>
              <input type="number" step="0.05" value={Number(r.end.toFixed(2))} onChange={(e) => patch(i, { end: Number(e.target.value) })} className={`${input} w-24`} aria-label={t("end")} />
            </div>
            <textarea id={`t-${r.key}`} value={r.text} rows={2} onChange={(e) => patch(i, { text: e.target.value })} className={`${input} mb-2 w-full`} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btn} onClick={() => play(r)}>▶ {t("play")}</button>
              <button type="button" className={btn} onClick={() => split(i)}>{t("split")}</button>
              {i < rows.length - 1 && <button type="button" className={btn} onClick={() => merge(i)}>{t("merge")}</button>}
              <button type="button" className={btn} onClick={() => { setSaved(false); setRows((rs) => rs.filter((_, j) => j !== i)); }}>{t("remove")}</button>
            </div>
          </li>
        ))}
      </ol>

      <div className="sticky bottom-0 mt-4 flex items-center gap-3 border-t border-[var(--line)] bg-[var(--background)] py-3">
        <button
          disabled={pending}
          onClick={() => start(async () => { await saveSentences(lessonId, rows.map((r) => ({ id: r.id, text: r.text, start: r.start, end: r.end }))); setSaved(true); })}
          className="btn btn-primary"
        >
          {t("save")}
        </button>
        {saved && <span className="msg-ok text-sm">{t("saved")}</span>}
      </div>
    </div>
  );
}
