"use client";

import { useEffect, useRef } from "react";

// Danh sách câu của bài: bấm để nhảy tới câu, câu đang luyện được tô nổi, câu đã làm hiện điểm.
export function SentenceList({ texts, current, onSelect, marks, hideText, hiddenLabel }: {
  texts: string[]; current: number; onSelect: (i: number) => void; marks?: Record<number, string>;
  hideText?: boolean; hiddenLabel?: (n: number) => string; // phụ đề đang ẩn: chỉ hiện nhãn "Câu n"
}) {
  const active = useRef<HTMLButtonElement>(null);
  useEffect(() => { active.current?.scrollIntoView({ block: "nearest" }); }, [current]);

  return (
    <ol className="flex flex-col gap-1">
      {texts.map((text, i) => (
        <li key={i}>
          <button
            ref={i === current ? active : undefined}
            className="sentence-item"
            aria-current={i === current}
            onClick={() => onSelect(i)}
          >
            {!hideText && <span className="muted w-6 shrink-0 text-right">{i + 1}</span>}
            <span className="line-clamp-2 flex-1">{hideText ? (hiddenLabel?.(i + 1) ?? "") : text}</span>
            {marks?.[i] && <span className="chip chip-ready h-fit shrink-0">{marks[i]}</span>}
          </button>
        </li>
      ))}
    </ol>
  );
}
