"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { deleteLesson } from "@/app/lessons/actions";
import { useDialog } from "./DialogProvider";

// Tải bài học dạng zip rồi XÓA bài khỏi hệ thống. Chỉ xóa sau khi trình duyệt đã nhận đủ file zip.
export function DownloadZipButton({ lessonId, title, variant }: { lessonId: string; title: string; variant: "icon" | "text" }) {
  const t = useTranslations("lesson");
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy || !(await dialog.confirm(t("downloadConfirm"), { danger: true }))) return;
    setBusy(true);
    try {
      const res = await fetch(`/lessons/${lessonId}/export`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      if (!blob.size) throw new Error("empty");

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[\\/:*?"<>|\x00-\x1f]/g, "_").trim().slice(0, 80) || "lesson"}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      setBusy(false);
      await dialog.alert(t("downloadFailed")); // chưa tải được thì giữ nguyên bài, không xóa
      return;
    }
    await deleteLesson(lessonId); // xóa bài, âm thanh, bản ghi rồi chuyển về trang chủ
  }

  const label = busy ? t("downloading") : t("download");
  if (variant === "text") {
    return <button type="button" className="btn" disabled={busy} onClick={onClick}>{label}</button>;
  }
  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      title={label}
      aria-label={label}
      className="btn absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center !p-0"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
      </svg>
    </button>
  );
}
