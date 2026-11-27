"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

// Đồng hồ đếm thời gian đã trôi qua kể từ lúc bài được tạo, chạy từng giây trong khi bài còn chờ worker.
export function ElapsedTimer({ since }: { since: string }) {
  const t = useTranslations("lesson");
  const [now, setNow] = useState<number | null>(null); // đặt sau khi mount để HTML máy chủ và trình duyệt không lệch nhau

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  if (now === null) return null;
  const sec = Math.max(0, Math.floor((now - new Date(since).getTime()) / 1000));
  const mm = String(Math.floor(sec / 60)).padStart(2, "0");
  const ss = String(sec % 60).padStart(2, "0");
  return <p className="muted mt-1 text-sm tabular-nums">{t("elapsed", { time: `${mm}:${ss}` })}</p>;
}
