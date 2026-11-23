"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { playSegment, sleep } from "@/lib/audio";
import { compare, type DiffToken } from "@/lib/diff";
import { createClient } from "@/lib/supabase/browser";
import { SentenceList } from "./SentenceList";

type S = { id: string; text: string; start: number; end: number };
type Settings = { speed: number; repeats: number; pause: number };
const DEFAULTS: Settings = { speed: 1, repeats: 2, pause: 1.5 };
const KEY = "fluteria.dictation";
const SUBS_KEY = "fluteria.dictation.subs";
const SPEEDS = [0.75, 1, 1.25];

export function Dictation({ lessonId, sentences, audioUrl, startAt, showInput }: {
  lessonId: string; sentences: S[]; audioUrl: string; startAt: number; showInput: boolean;
}) {
  const t = useTranslations("dictation");
  const tp = useTranslations("practice");
  const [i, setI] = useState(Math.min(startAt, Math.max(sentences.length - 1, 0)));
  const [answer, setAnswer] = useState("");
  const [result, setResult] = useState<{ score: number; tokens: DiffToken[] } | null>(null);
  const [marks, setMarks] = useState<Record<number, string>>({});
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [playing, setPlaying] = useState(false);
  const [withInput, setWithInput] = useState(showInput); // bật/tắt ô nhập khi đang luyện
  const [showSubs, setShowSubs] = useState(!showInput); // có ô nhập thì ẩn phụ đề (tránh lộ đáp án), không có thì hiện
  const audio = useRef<HTMLAudioElement>(null);
  const cancel = useRef({ v: false });
  const s = sentences[i];

  useEffect(() => {
    // Đọc localStorage sau khi mount để tránh lệch giữa HTML máy chủ và trình duyệt.
    /* eslint-disable react-hooks/set-state-in-effect */
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setSettings({ ...DEFAULTS, ...JSON.parse(raw) });
      const subs = localStorage.getItem(SUBS_KEY);
      if (subs) setShowSubs(subs === "1");
    } catch {}
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);
  const change = (p: Partial<Settings>) => {
    const next = { ...settings, ...p };
    setSettings(next);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  };
  const toggleSubs = () => {
    setShowSubs(!showSubs);
    try { localStorage.setItem(SUBS_KEY, showSubs ? "0" : "1"); } catch {}
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
    if (result) return;
    const r = compare(s.text, answer);
    setResult(r);
    setMarks((m) => ({ ...m, [i]: `${Math.round(r.score * 100)}%` }));
    await createClient().from("attempts").insert({
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

  const last = i === sentences.length - 1;
  if (!s) return <p>{t("empty")}</p>;
  const toggle = (on: boolean) => `btn btn-sm ${on ? "btn-primary" : ""}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      <audio ref={audio} src={audioUrl} preload="auto" />

      <section className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-48 flex-1">
            <p className="muted mb-1 text-sm">{t("progress", { n: i + 1, total: sentences.length })}</p>
            <div className="progress"><span style={{ width: `${((i + 1) / sentences.length) * 100}%` }} /></div>
          </div>
          <div className="flex gap-2" role="group">
            <button className={toggle(withInput)} aria-pressed={withInput} onClick={() => setWithInput(!withInput)}>{t("inputToggle")}</button>
            <button className={toggle(showSubs)} aria-pressed={showSubs} onClick={toggleSubs}>{t("subsToggle")}</button>
          </div>
        </div>

        <div className="card flex flex-col items-center gap-4 py-6">
          {showSubs && (
            <p className="max-w-3xl text-center font-[family-name:var(--font-heading)] text-2xl leading-relaxed">{s.text}</p>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {!playing ? (
              <button className="btn btn-primary btn-lg" onClick={() => play(s, settings)}>▶ {t("play")}</button>
            ) : (
              <button className="btn btn-lg" onClick={() => { cancel.current.v = true; setPlaying(false); }}>■ {t("stop")}</button>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2" role="group" aria-label={t("speed")}>
            {SPEEDS.map((v) => (
              <button key={v} className={`btn btn-sm ${settings.speed === v ? "btn-primary" : ""}`} onClick={() => change({ speed: v })}>{v}x</button>
            ))}
          </div>
          <details className="w-full text-sm">
            <summary className="muted cursor-pointer text-center">{t("settings")}</summary>
            <div className="mt-3 flex flex-wrap justify-center gap-4">
              <label className="flex flex-col gap-1">{t("speed")}: {settings.speed}x
                <input type="range" min="0.5" max="1.5" step="0.05" value={settings.speed} onChange={(e) => change({ speed: Number(e.target.value) })} />
              </label>
              <label className="flex flex-col gap-1">{t("repeats")}
                <input type="number" min={1} max={10} value={settings.repeats} onChange={(e) => change({ repeats: Math.max(1, Number(e.target.value) || 1) })} className="field !w-24" />
              </label>
              <label className="flex flex-col gap-1">{t("pause")}
                <input type="number" min={0} max={30} step={0.5} value={settings.pause} onChange={(e) => change({ pause: Math.max(0, Number(e.target.value) || 0) })} className="field !w-24" />
              </label>
            </div>
          </details>
        </div>

        {withInput && (
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => {
              // Enter: kiểm tra, rồi Enter nữa: sang câu sau. Shift+Enter xuống dòng.
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (result) go(i + 1, true); else check(); }
            }}
            disabled={!!result}
            rows={3}
            placeholder={t("placeholder")}
            autoCapitalize="none"
            spellCheck={false}
            className="field text-lg"
          />
        )}

        {withInput && result && (
          <div className="card">
            <p className="mb-2 font-medium">{t("score", { pct: Math.round(result.score * 100) })}</p>
            <p className="mb-2 leading-relaxed">
              {result.tokens.map((tk, k) => (
                <span key={k} className={`mr-1 ${tk.status === "missing" ? "mark-missing" : tk.status === "extra" ? "mark-extra" : ""}`}>{tk.word}</span>
              ))}
            </p>
            <p className="muted text-sm">{s.text}</p>
          </div>
        )}

        <details className="card lg:hidden">
          <summary className="cursor-pointer font-medium">{tp("sentences")}</summary>
          <div className="mt-2 max-h-72 overflow-auto">
            <SentenceList texts={sentences.map((x) => x.text)} current={i} marks={marks} hideText={!showSubs} hiddenLabel={(n) => tp("sentenceN", { n })} onSelect={(n) => go(n, false)} />
          </div>
        </details>

        <div className="sticky-bar">
          <button className="btn" onClick={() => go(i - 1, false)} disabled={i === 0}>← {t("prev")}</button>
          {withInput && !result ? (
            <button className="btn btn-primary flex-1" onClick={check}>{t("check")}</button>
          ) : (
            <button className="btn btn-primary flex-1" onClick={() => go(i + 1, true)} disabled={last}>{t("next")} →</button>
          )}
        </div>
      </section>

      <aside className="card hidden max-h-[calc(100vh-11rem)] overflow-auto lg:sticky lg:top-20 lg:block">
        <h2 className="mb-2 px-2">{tp("sentences")}</h2>
        <SentenceList texts={sentences.map((x) => x.text)} current={i} marks={marks} hideText={!showSubs} hiddenLabel={(n) => tp("sentenceN", { n })} onSelect={(n) => go(n, false)} />
      </aside>
    </div>
  );
}
