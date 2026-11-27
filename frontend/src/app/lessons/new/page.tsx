import { getTranslations } from "next-intl/server";
import { NewLessonForm } from "@/components/NewLessonForm";

export default async function NewLessonPage() {
  const t = await getTranslations("newLesson");
  return (
    <main className="page">
      <h1 className="mb-6">{t("heading")}</h1>
      <NewLessonForm />
    </main>
  );
}
