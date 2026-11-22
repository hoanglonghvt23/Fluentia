"use client";

import { useTranslations } from "next-intl";
import { deleteLesson } from "@/app/lessons/actions";

export function DeleteLessonButton({ lessonId }: { lessonId: string }) {
  const t = useTranslations("lesson");
  return (
    <form
      action={() => deleteLesson(lessonId)}
      onSubmit={(e) => { if (!confirm(t("deleteConfirm"))) e.preventDefault(); }}
    >
      <button className="btn btn-sm btn-danger">
        {t("delete")}
      </button>
    </form>
  );
}
