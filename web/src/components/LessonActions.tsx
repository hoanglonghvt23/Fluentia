"use client";

import { useTranslations } from "next-intl";
import { useTransition } from "react";
import { deleteLesson, retranscribe } from "@/app/lessons/actions";
import { useDialog } from "./DialogProvider";

// Các thao tác nguy hiểm của bài học, có hỏi xác nhận.
export function LessonActions({ lessonId, canRetranscribe }: { lessonId: string; canRetranscribe: boolean }) {
  const t = useTranslations("lesson");
  const dialog = useDialog();
  const [pending, start] = useTransition();
  const run = async (message: string, action: () => Promise<unknown>) => {
    if (await dialog.confirm(message, { danger: true })) start(async () => { await action(); });
  };
  return (
    <div className="flex flex-wrap gap-2">
      {canRetranscribe && (
        <button type="button" disabled={pending} className="btn btn-sm" onClick={() => run(t("retranscribeConfirm"), () => retranscribe(lessonId))}>
          {t("retranscribe")}
        </button>
      )}
      <button type="button" disabled={pending} className="btn btn-sm btn-danger" onClick={() => run(t("deleteConfirm"), () => deleteLesson(lessonId))}>
        {t("delete")}
      </button>
    </div>
  );
}
