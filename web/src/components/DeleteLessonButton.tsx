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
      <button className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 dark:border-red-900 dark:text-red-400">
        {t("delete")}
      </button>
    </form>
  );
}
