"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { playSegment, sleep } from "@/lib/audio";
import { compare, type DiffToken } from "@/lib/diff";
import { createClient } from "@/lib/supabase/browser";

type S = { id: string; text: string; start: number; end: number };
type Settings = { speed: number; repeats: number; pause: number };
const DEFAULTS: Settings = { speed: 1, repeats: 2, pause: 1.5 };
const KEY = "fluteria.dictation";

export function Dictation({ lessonId, sentences, audioUrl, startAt }: { lessonId: string; sentences: S[]; audioUrl: string; startAt: number }) {
  const t = useTranslations("dictation");
  const [i, setI] = useState(Math.min(startAt, sentences.length - 1));
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ score: number; tokens: DiffToken[] } | null>(null);
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [playing, setPlaying] = useState(false);
  const audio = useRef<HTMLAudioElement>(null);
  const cancel = useRef({ v: false });
  const s = sentences[i];

  useEffect(() => {
    // Đọc localStorage sau khi mount để tránh lệch giữa HTML máy chủ và trình duyệt.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { const raw = localStorage.getItem(KEY); if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) }); } catch {}
  }, []);
  const change = (p: Partial<Settings>) => {
    const next = { ...settings, ...p };
    setSettings(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };

  // Phát câu hiện tại `repeats` lần, nghỉ `pause` giây giữa các lần.
  const play = useCallback(async (sent: S, cfg: Settings, delay = 0) => {
    cancel.current.v = true;
    const token = { v: false };
    cancel.current = token;
    setPlaying(true);
    if (delay) await sleep(delay * 1000);
    for (let r = 0; r < cfg.repeats && !token.v; r++) {
      if (r) await sleep(cfg.pause * 1000);
      if (token.v || !audio.current) break;
      await playSegment(audio.current, sent.start, sent.end, cfg.speed, token);
    }
    if (!token.v) setPlaying(false);
  }, []);

  useEffect(() => () => { cancel.current.v = true; }, []);

  const check = async () => {
    const r = compare(s.text, answer);
    setResult(r);
    const supabase = createClient();
    await supabase.from("attempts").insert({
      lesson_id: lessonId, sentence_id: s.id, sentence_idx: i, sentence_text: s.text, answer, score: r.score,
    });
  };

  const go = (n: number, autoplay: boolean) => {
    if (n < 0 || n >= sentences.length) return;
    cancel.current.v = true;
    setPlaying(false);
    setI(n);
    setAnswer("");
    setResult(null);
    if (autoplay) play(sentences[n], settings, settings.pause);
  };

  const input = "rounded border border-zinc-300 bg-transparent px-2 py-1 dark:border-zinc-700";
  const btn = "rounded border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700";
  const primary = "rounded bg-zinc-900 px-4 py-2 text-white dark:bg-zinc-100 dark:text-zinc-900";

  if (!s) return <p>{t("empty")}</p>;

  return (
    <div className="flex flex-col gap-4">
      <audio ref={audio} src={audioUrl} preload="auto" />

      <details className="rounded border border-zinc-200 p-3 text-sm dark:border-zinc-800">
        <summary className="cursor-pointer">{t("settings")}</summary>
        <div className="mt-3 flex flex-wrap gap-4">
          <label className="flex flex-col gap-1">{t("speed")}: {settings.speed}x
            <input type="range" min="0.5" max="1.5" step="0.05" value={settings.speed} onChange={(e) => change({ speed: Number(e.target.value) })} />
          </label>
          <label className="flex flex-col gap-1">{t("repeats")}
            <input type="number" min={1} max={10} value={settings.repeats} onChange={(e) => change({ repeats: Math.max(1, Number(e.target.value) || 1) })} className={`${input} w-20`} />
          </label>
          <label className="flex flex-col gap-1">{t("pause")}
            <input type="number" min={0} max={30} step={0.5} value={settings.pause} onChange={(e) => change({ pause: Math.max(0, Number(e.target.value) || 0) })} className={`${input} w-20`} />
          </label>
        </div>
      </details>

      <p className="text-sm text-zinc-500">{t("progress", { n: i + 1, total: sentences.length })}</p>

      <div className="flex flex-wrap gap-2">
        <button className={primary} onClick={() => play(s, settings)} disabled={playing}>▶ {t("play")}</button>
        {playing && <button className={btn} onClick={() => { cancel.current.v = true; setPlaying(false); }}>{t("stop")}</button>}
      </div>

      <textarea
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        disabled={!!result}
        rows={3}
        placeholder={t("placeholder")}
        autoCapitalize="none"
        spellCheck={false}
        className={`${input} w-full text-lg`}
      />

      {!result ? (
        <button className={primary} onClick={check}>{t("check")}</button>
      ) : (
        <div className="rounded border border-zinc-200 p-3 dark:border-zinc-800">
          <p className="mb-2 font-medium">{t("score", { pct: Math.round(result.score * 100) })}</p>
          <p className="mb-2 leading-relaxed">
            {result.tokens.map((tk, k) => (
              <span key={k} className={
                tk.status === "ok" ? "mr-1" :
                tk.status === "missing" ? "mr-1 rounded bg-amber-200 px-1 text-black" :
                "mr-1 rounded bg-red-200 px-1 text-black line-through"
              }>{tk.word}</span>
            ))}
          </p>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">{s.text}</p>
        </div>
      )}

      <div className="flex gap-2">
        <button className={btn} onClick={() => go(i - 1, false)} disabled={i === 0}>{t("prev")}</button>
        <button className={btn} onClick={() => go(i + 1, true)} disabled={i === sentences.length - 1}>{t("next")}</button>
      </div>
    </div>
  );
}
