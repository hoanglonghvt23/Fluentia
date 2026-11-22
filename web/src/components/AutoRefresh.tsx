"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Vẽ lại trang theo chu kỳ để thấy trạng thái bài học do worker cập nhật.
export function AutoRefresh({ seconds = 4 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
  return null;
}
