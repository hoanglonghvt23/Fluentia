"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { deleteLessonQuietly } from "@/app/lessons/actions";
import { useDialog } from "./DialogProvider";

// Nút xóa bài ở danh sách bài: hỏi xác nhận rồi mới xóa.
export function DeleteLessonButton({ lessonId }: { lessonId: string }) {
  const t = useTranslations("lesson");
  const dialog = useDialog();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (busy || !(await dialog.confirm(t("deleteConfirm"), { danger: true }))) return;
    setBusy(true);
    try {
      await deleteLessonQuietly(lessonId);
    } catch {
      setBusy(false);
      await dialog.alert(t("deleteFailed"));
    }
  }

  return (
    <button
      type="button"
      disabled={busy}
      onClick={onClick}
      title={t("delete")}
      aria-label={t("delete")}
      className="btn btn-danger flex size-9 items-center justify-center !p-0"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
      </svg>
    </button>
  );
}
