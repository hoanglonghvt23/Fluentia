"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { posInt, type LessonSettings } from "@/lib/lessonSettings";
import { createClient } from "@/lib/supabase/browser";

const MAX_BYTES = 50 * 1024 * 1024; // giới hạn file của gói Supabase Free
// Gợi ý cho bài mới: đủ luyện một buổi. Xóa trống ô để lấy cả bài.
const DEFAULT_MAX_SENTENCES = 20;
const DEFAULT_MAX_WORDS = 300;

export function NewLessonForm() {
  const t = useTranslations("newLesson");
  const router = useRouter();
  const [mode, setMode] = useState<"upload" | "youtube">("upload");
  const [showInput, setShowInput] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    const form = new FormData(e.currentTarget);
    const title = String(form.get("title") ?? "").trim();
    const video = form.get("video") as File | null;
    const subs = form.get("subs") as File | null;
    const url = String(form.get("url") ?? "").trim();

    if (mode === "upload" && (!video || !video.size)) return setError(t("errNoFile"));
    if (mode === "upload" && video && video.size > MAX_BYTES) return setError(t("errTooBig"));
    if (subs && subs.size > MAX_BYTES) return setError(t("errTooBig"));
    if (mode === "youtube" && !/^https?:\/\/(www\.|m\.)?(youtube\.com|youtu\.be)\//i.test(url)) return setError(t("errUrl"));

    // Ô để trống = không giới hạn; ô có giá trị phải là số nguyên dương.
    const raw = (k: string) => String(form.get(k) ?? "").trim();
    for (const k of ["maxSentences", "maxWords"]) if (raw(k) && !posInt(raw(k))) return setError(t("errLimits"));
    const settings: LessonSettings = {
      showInput,
      maxSentences: posInt(raw("maxSentences")),
      maxWords: posInt(raw("maxWords")),
    };

    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const id = crypto.randomUUID();
    const dir = `${user.id}/${id}`;
    const row: Record<string, unknown> = { id, title: title || (video?.name ?? url), source_type: mode, settings };

    if (mode === "upload" && video) {
      const ext = (video.name.split(".").pop() ?? "bin").toLowerCase();
      row.source_path = `${dir}/source.${ext}`;
      const up = await supabase.storage.from("media").upload(row.source_path as string, video);
      if (up.error) { setBusy(false); return setError(up.error.message); }
      if (subs && subs.size) {
        const sext = subs.name.toLowerCase().endsWith(".vtt") ? "vtt" : "srt";
        row.subs_path = `${dir}/subs.${sext}`;
        const sup = await supabase.storage.from("media").upload(row.subs_path as string, subs);
        if (sup.error) { setBusy(false); return setError(sup.error.message); }
      }
    } else {
      row.source_url = url;
    }

    const { error: err } = await supabase.from("lessons").insert(row);
    if (err) { setBusy(false); return setError(err.message); }
    router.push(`/lessons/${id}`);
  }

  const tab = (m: typeof mode) => `btn btn-sm ${mode === m ? "btn-primary" : ""}`;
  const choice = (on: boolean) => `card cursor-pointer ${on ? "!border-[var(--accent)] bg-[var(--accent-soft)]" : ""}`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card flex flex-col gap-4">
          <h2>{t("stepSource")}</h2>
          <div className="flex gap-2">
            <button type="button" className={tab("upload")} onClick={() => setMode("upload")}>{t("tabUpload")}</button>
            <button type="button" className={tab("youtube")} onClick={() => setMode("youtube")}>{t("tabYoutube")}</button>
          </div>
          <label className="flex flex-col gap-1 text-sm">
            {t("title")}
            <input name="title" className="field" />
          </label>
          {mode === "upload" ? (
            <>
              <label className="flex flex-col gap-1 text-sm">
                {t("video")}
                <input name="video" type="file" accept="video/*,audio/*" className="field" />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                {t("subs")}
                <input name="subs" type="file" accept=".srt,.vtt" className="field" />
              </label>
              <p className="muted text-xs">{t("uploadHint")}</p>
            </>
          ) : (
            <label className="flex flex-col gap-1 text-sm">
              {t("url")}
              <input name="url" type="url" placeholder="https://www.youtube.com/watch?v=..." className="field" />
            </label>
          )}
        </section>

        <section className="card flex flex-col gap-5">
          <h2>{t("stepOptions")}</h2>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">{t("modeTitle")}</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className={choice(showInput)}>
                <input type="radio" name="mode" className="sr-only" checked={showInput} onChange={() => setShowInput(true)} />
                <span className="block font-medium">{t("modeInput")}</span>
                <span className="muted block text-sm">{t("modeInputDesc")}</span>
              </label>
              <label className={choice(!showInput)}>
                <input type="radio" name="mode" className="sr-only" checked={!showInput} onChange={() => setShowInput(false)} />
                <span className="block font-medium">{t("modeListen")}</span>
                <span className="muted block text-sm">{t("modeListenDesc")}</span>
              </label>
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1 text-sm font-medium">{t("limitsTitle")}</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm">{t("maxSentences")}
                <input name="maxSentences" type="number" min={1} inputMode="numeric" defaultValue={DEFAULT_MAX_SENTENCES} placeholder={t("unlimited")} className="field" />
              </label>
              <label className="flex flex-col gap-1 text-sm">{t("maxWords")}
                <input name="maxWords" type="number" min={1} inputMode="numeric" defaultValue={DEFAULT_MAX_WORDS} placeholder={t("unlimited")} className="field" />
              </label>
            </div>
            <p className="muted text-xs">{t("limitsHint")}</p>
          </fieldset>

        </section>
      </div>

      {error && <p className="msg-err text-sm">{error}</p>}
      <div className="flex justify-end">
        <button disabled={busy} className="btn btn-primary btn-lg">
          {busy ? t("uploading") : t("confirm")}
        </button>
      </div>
    </form>
  );
}
