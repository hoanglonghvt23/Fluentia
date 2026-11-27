"""Đọc phụ đề .srt và .vtt thành danh sách cue [{start, end, text}] (giây)."""
import html
import re

_TIME = re.compile(
    r"(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{3})"
)


def _sec(h, m, s, ms) -> float:
    return int(h or 0) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def _clean(line: str) -> str:
    line = html.unescape(re.sub(r"<[^>]*>|\{\\[^}]*\}", "", line))
    return re.sub(r"\s+", " ", line).strip()


def parse(text: str) -> list[dict]:
    raw = []  # (start, end, [các dòng chữ])
    for block in re.split(r"\r?\n\s*\r?\n", text.lstrip("﻿").strip()):
        lines = block.splitlines()
        for n, line in enumerate(lines):
            m = _TIME.search(line)
            if not m:
                continue
            g = m.groups()
            body = [c for c in (_clean(x) for x in lines[n + 1 :]) if c]
            raw.append((_sec(*g[:4]), _sec(*g[4:]), body))
            break

    # Phụ đề cuốn chiếu (kiểu YouTube): mỗi cue lặp lại dòng cuối của cue trước.
    # Bỏ phần lặp để chữ không bị nhân đôi và mốc giờ không bị lệch.
    cues = []
    prev: list[str] = []
    for start, end, body in raw:
        k = next((k for k in range(min(len(prev), len(body)), 0, -1) if prev[-k:] == body[:k]), 0)
        fresh = body[k:]
        prev = body
        if not fresh:
            continue
        cues.append({"start": start, "end": end, "text": " ".join(fresh)})

    # Cue chồng lên cue sau thì cắt cho khớp, để mốc giờ không lấn sang câu kế.
    for a, b in zip(cues, cues[1:]):
        if a["end"] > b["start"]:
            a["end"] = max(a["start"], b["start"])
    return cues
