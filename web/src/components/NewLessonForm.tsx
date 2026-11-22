"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { createClient } from "@/lib/supabase/browser";

const MAX_BYTES = 50 * 1024 * 1024; // giới hạn file của gói Supabase Free

export function NewLessonForm() {
  const t = useTranslations("newLesson");
  const router = useRouter();
  const [mode, setMode] = useState<"upload" | "youtube">("upload");
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

    setBusy(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return router.push("/login");

    const id = crypto.randomUUID();
    const dir = `${user.id}/${id}`;
    const row: Record<string, unknown> = { id, title: title || (video?.name ?? url), source_type: mode };

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

  const input = "w-full rounded border border-zinc-300 bg-transparent px-3 py-2 dark:border-zinc-700";
  const tab = (m: typeof mode) =>
    `rounded px-3 py-1.5 text-sm ${mode === m ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900" : "border border-zinc-300 dark:border-zinc-700"}`;

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex gap-2">
        <button type="button" className={tab("upload")} onClick={() => setMode("upload")}>{t("tabUpload")}</button>
        <button type="button" className={tab("youtube")} onClick={() => setMode("youtube")}>{t("tabYoutube")}</button>
      </div>
      <label className="flex flex-col gap-1 text-sm">
        {t("title")}
        <input name="title" className={input} />
      </label>
      {mode === "upload" ? (
        <>
          <label className="flex flex-col gap-1 text-sm">
            {t("video")}
            <input name="video" type="file" accept="video/*,audio/*" className={input} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            {t("subs")}
            <input name="subs" type="file" accept=".srt,.vtt" className={input} />
          </label>
          <p className="text-xs text-zinc-500">{t("uploadHint")}</p>
        </>
      ) : (
        <label className="flex flex-col gap-1 text-sm">
          {t("url")}
          <input name="url" type="url" placeholder="https://www.youtube.com/watch?v=..." className={input} />
        </label>
      )}
      {error && <p className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <button disabled={busy} className="rounded bg-zinc-900 px-4 py-2 text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900">
        {busy ? t("uploading") : t("submit")}
      </button>
    </form>
  );
}
