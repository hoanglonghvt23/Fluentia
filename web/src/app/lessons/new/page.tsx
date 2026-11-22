import { getTranslations } from "next-intl/server";
import { NewLessonForm } from "@/components/NewLessonForm";

export default async function NewLessonPage() {
  const t = await getTranslations("newLesson");
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-8">
      <h1 className="mb-6 text-2xl font-semibold">{t("heading")}</h1>
      <NewLessonForm />
    </main>
  );
}
