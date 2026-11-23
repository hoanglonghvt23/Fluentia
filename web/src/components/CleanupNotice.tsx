"use client";

import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { deleteLessonQuietly } from "@/app/lessons/actions";
import { zipFileName } from "@/lib/zipName";
import { useDialog } from "./DialogProvider";

type L = { id: string; title: string };

// Báo dung lượng sắp đầy. Trước hạn: một dải thông báo. Quá hạn: màn hình chặn cho đến khi tải hết bài.
// Mỗi bài tải về một file zip rồi mới bị xóa khỏi hệ thống (bài nào tải lỗi thì giữ lại).
export function CleanupNotice({ deadline, overdue, lessons }: { deadline: string; overdue: boolean; lessons: L[] }) {
  const t = useTranslations("cleanup");
  const format = useFormatter();
  const router = useRouter();
  const dialog = useDialog();
  const [done, setDone] = useState(0);
  const [running, setRunning] = useState(false);
  const [failed, setFailed] = useState("");

  const when = format.dateTime(new Date(deadline), { dateStyle: "medium", timeStyle: "short" });

  async function downloadAll() {
    if (running) return;
    if (!overdue && !(await dialog.confirm(t("confirm", { n: lessons.length }), { danger: true }))) return;
    setRunning(true);
    setFailed("");
    setDone(0);
    let n = 0;
    for (const l of lessons) {
      try {
        const res = await fetch(`/lessons/${l.id}/export`);
        if (!res.ok) throw new Error(String(res.status));
        const blob = await res.blob();
        if (!blob.size) throw new Error("empty");

        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = zipFileName(l.title);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60_000);

        await deleteLessonQuietly(l.id); // chỉ xóa sau khi đã nhận đủ file
        setDone(++n);
        await new Promise((r) => setTimeout(r, 400)); // giãn nhịp để trình duyệt không chặn tải nhiều file
      } catch {
        setFailed(l.title);
        setRunning(false);
        return;
      }
    }
    setRunning(false);
    router.refresh();
  }

  const progress = running ? <p className="text-sm">{t("progress", { done, total: lessons.length })}</p> : null;
  const error = failed ? <p className="msg-err text-sm">{t("failed", { title: failed })}</p> : null;
  const button = (
    <button type="button" className="btn btn-primary" disabled={running} onClick={downloadAll}>
      {running ? t("running") : failed ? t("retry") : t("downloadAll", { n: lessons.length })}
    </button>
  );

  if (overdue) {
    return (
      <div className="fixed inset-0 z-[60] grid place-items-center bg-[rgb(27_23_20/0.6)] p-4" role="alertdialog" aria-modal="true" aria-labelledby="cleanup-title">
        <div className="card flex w-full max-w-md flex-col gap-4">
          <h2 id="cleanup-title">{t("overdueTitle")}</h2>
          <p className="text-sm">{t("overdueBody", { n: lessons.length })}</p>
          <p className="muted text-xs">{t("multipleHint")}</p>
          {progress}
          {error}
          <div className="flex justify-end">{button}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="shell pt-3">
      <div className="card flex flex-wrap items-center justify-between gap-3 !border-[var(--accent)] bg-[var(--accent-soft)] text-sm">
        <div className="min-w-0 flex-1">
          <p className="font-medium">{t("bannerTitle")}</p>
          <p>{t("bannerBody", { date: when, n: lessons.length })}</p>
          {progress}
          {error}
        </div>
        {button}
      </div>
    </div>
  );
}
