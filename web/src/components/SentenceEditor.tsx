"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { playSegment } from "@/lib/audio";
import type { LessonSettings } from "@/lib/lessonSettings";
import { regenerateSentences, saveSentences, type SentenceRow } from "@/app/lessons/actions";

type Row = SentenceRow & { key: string };

export function SentenceEditor({ lessonId, initial, audioUrl, settings }: { lessonId: string; initial: SentenceRow[]; audioUrl: string; settings: LessonSettings }) {
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

  const num = "field !min-h-10 !w-32 !px-2 !py-1 text-sm";
  const icon = "btn btn-sm !px-3";

  return (
    <div>
      <audio ref={audio} src={audioUrl} preload="auto" />

      <details className="card mb-4 text-sm">
        <summary className="cursor-pointer font-medium">{t("options")}</summary>
        <form
          action={(fd) => start(() => regenerateSentences(lessonId, fd).then(() => location.reload()))}
          onSubmit={(e) => { if (!confirm(t("regenConfirm"))) e.preventDefault(); }}
          className="mt-3 flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1">{t("maxSentences")}
            <input name="maxSentences" type="number" defaultValue={settings.maxSentences ?? ""} min={1} placeholder={t("unlimited")} className={num} />
          </label>
          <label className="flex flex-col gap-1">{t("maxWords")}
            <input name="maxWords" type="number" defaultValue={settings.maxWords ?? ""} min={1} placeholder={t("unlimited")} className={num} />
          </label>
          <button className="btn btn-sm" disabled={pending}>{t("regen")}</button>
        </form>
      </details>

      <ol className="grid gap-3 xl:grid-cols-2">
        {rows.map((r, i) => (
          <li key={r.key} className="card">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="muted w-8 text-sm">#{i + 1}</span>
              <input type="number" step="0.05" value={Number(r.start.toFixed(2))} onChange={(e) => patch(i, { start: Number(e.target.value) })} className={num} aria-label={t("start")} />
              <span className="muted">→</span>
              <input type="number" step="0.05" value={Number(r.end.toFixed(2))} onChange={(e) => patch(i, { end: Number(e.target.value) })} className={num} aria-label={t("end")} />
              <span className="ml-auto flex gap-2">
                <button type="button" className={`${icon} btn-primary`} title={t("play")} aria-label={t("play")} onClick={() => play(r)}>▶</button>
                <button type="button" className={icon} title={t("split")} aria-label={t("split")} onClick={() => split(i)}>✂</button>
                {i < rows.length - 1 && <button type="button" className={icon} title={t("merge")} aria-label={t("merge")} onClick={() => merge(i)}>⤵</button>}
                <button type="button" className={`${icon} btn-danger`} title={t("remove")} aria-label={t("remove")} onClick={() => { setSaved(false); setRows((rs) => rs.filter((_, j) => j !== i)); }}>✕</button>
              </span>
            </div>
            <textarea id={`t-${r.key}`} value={r.text} rows={2} onChange={(e) => patch(i, { text: e.target.value })} className="field" />
          </li>
        ))}
      </ol>

      <div className="sticky-bar mt-4">
        <button
          disabled={pending}
          onClick={() => start(async () => { await saveSentences(lessonId, rows.map((r) => ({ id: r.id, text: r.text, start: r.start, end: r.end }))); setSaved(true); })}
          className="btn btn-primary"
        >
          {t("save")}
        </button>
        {saved && <span className="msg-ok text-sm">{t("saved")}</span>}
        <span className="muted ml-auto hidden text-xs sm:inline">✂ {t("split")} · ⤵ {t("merge")}</span>
      </div>
    </div>
  );
}
