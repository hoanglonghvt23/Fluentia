"use client";

import { useTranslations } from "next-intl";
import { deleteLesson, retranscribe } from "@/app/lessons/actions";

// Các thao tác nguy hiểm của bài học, có hỏi xác nhận.
export function LessonActions({ lessonId, canRetranscribe }: { lessonId: string; canRetranscribe: boolean }) {
  const t = useTranslations("lesson");
  const confirmed = (msg: string) => (e: React.FormEvent) => { if (!confirm(msg)) e.preventDefault(); };
  return (
    <div className="flex flex-wrap gap-2">
      {canRetranscribe && (
        <form action={() => retranscribe(lessonId)} onSubmit={confirmed(t("retranscribeConfirm"))}>
          <button className="btn btn-sm">{t("retranscribe")}</button>
        </form>
      )}
      <form action={() => deleteLesson(lessonId)} onSubmit={confirmed(t("deleteConfirm"))}>
        <button className="btn btn-sm btn-danger">{t("delete")}</button>
      </form>
    </div>
  );
}
