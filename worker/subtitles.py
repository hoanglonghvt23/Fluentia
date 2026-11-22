"""Đọc phụ đề .srt và .vtt thành danh sách cue [{start, end, text}] (giây)."""
import html
import re

_TIME = re.compile(
    r"(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{3})\s*-->\s*(?:(\d+):)?(\d{1,2}):(\d{2})[.,](\d{3})"
)


def _sec(h, m, s, ms) -> float:
    return int(h or 0) * 3600 + int(m) * 60 + int(s) + int(ms) / 1000


def parse(text: str) -> list[dict]:
    cues = []
    for block in re.split(r"\r?\n\s*\r?\n", text.lstrip("﻿").strip()):
        lines = block.splitlines()
        for n, line in enumerate(lines):
            m = _TIME.search(line)
            if not m:
                continue
            g = m.groups()
            body = " ".join(lines[n + 1 :])
            body = html.unescape(re.sub(r"<[^>]*>|\{\\[^}]*\}", "", body))
            body = re.sub(r"\s+", " ", body).strip()
            if body:
                cues.append({"start": _sec(*g[:4]), "end": _sec(*g[4:]), "text": body})
            break
    return cues
