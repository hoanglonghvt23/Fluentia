"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { isYoutubeBlocked } from "@/lib/lessonError";
import { useDialog } from "./DialogProvider";

type L = { id: string; title: string; status: string; error: string | null; created_at: string };
const BUSY = new Set(["queued", "processing"]);
const WORKER_WAIT_MS = 5 * 60_000; // bài chờ quá 5 phút mà chưa được nhận thì nghi worker đang tắt

// Báo bài xử lý xong hoặc lỗi ở mọi trang, và cảnh báo khi worker có vẻ đang tắt.
export function LessonNotifier({ lessons }: { lessons: L[] }) {
  const t = useTranslations("notify");
  const { toast } = useDialog();
  const router = useRouter();
  const prev = useRef<Map<string, string> | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const busy = lessons.some((l) => BUSY.has(l.status));

  // So trạng thái với lần trước: bài đang chờ/xử lý mà giờ đã xong hoặc lỗi thì báo.
  useEffect(() => {
    const before = prev.current;
    prev.current = new Map(lessons.map((l) => [l.id, l.status]));
    if (!before) return; // lần đầu mở web: không báo lại chuyện cũ
    for (const l of lessons) {
      if (!BUSY.has(before.get(l.id) ?? "")) continue;
      if (l.status === "ready") toast(t("ready", { title: l.title }), "ok");
      else if (l.status === "error") {
        toast(isYoutubeBlocked(l.error) ? t("failedYoutube", { title: l.title }) : t("failed", { title: l.title, error: l.error ?? "" }), "error");
      }
    }
  }, [lessons, t, toast]);

  // Còn bài đang chờ thì tự làm mới 5 giây một lần để nhận trạng thái mới ở bất kỳ trang nào.
  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(id);
  }, [busy, router]);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, 30_000);
    return () => { clearTimeout(first); clearInterval(id); };
  }, []);

  const stale = now !== null && lessons.some((l) => l.status === "queued" && now - Date.parse(l.created_at) > WORKER_WAIT_MS);
  if (!stale) return null;

  return (
    <div className="shell pt-3">
      <p role="status" className="card !border-[var(--bad)] text-sm">{t("workerOff")}</p>
    </div>
  );
}
