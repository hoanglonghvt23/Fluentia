"""Xử lý media: tách âm thanh (ffmpeg), tải YouTube (yt-dlp), nhận dạng giọng nói (Whisper)."""
import os
import subprocess
from pathlib import Path

WHISPER_MODEL = "small"  # đã chốt: small chạy bằng CPU
_model = None


def extract_audio(src: Path, out: Path) -> float:
    """Tách âm thanh thành mp3 mono 64 kbps (nhẹ, đủ cho giọng nói). Trả về thời lượng (giây)."""
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(src), "-vn", "-ac", "1",
         # Nếu âm thanh bắt đầu trễ so với hình thì chèn im lặng ở đầu, để mốc giờ trong file mp3 khớp mốc giờ phụ đề.
         "-af", "aresample=async=1:first_pts=0", "-b:a", "64k", str(out)],
        check=True, capture_output=True,
    )
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)],
        check=True, capture_output=True, text=True,
    )
    return float(probe.stdout.strip())


def words_to_cues(words, max_words: int = 14, max_gap: float = 0.5) -> list[dict]:
    """Gom từng từ (có mốc giờ riêng) thành đoạn ngắn: hết câu, nghỉ lâu, hoặc đủ số từ thì ngắt.

    Mốc giờ theo từ chính xác hơn nhiều so với mốc giờ của cả đoạn Whisper (đoạn có thể dài 30-50 giây).
    """
    cues: list[dict] = []
    cur: list = []

    def flush():
        if cur:
            text = "".join(w.word for w in cur).strip()
            if text:
                cues.append({"start": cur[0].start, "end": cur[-1].end, "text": text})
            cur.clear()

    for w in words:
        if cur and (w.start - cur[-1].end > max_gap or len(cur) >= max_words):
            flush()
        cur.append(w)
        if w.word.strip().endswith((".", "!", "?", "…")):
            flush()
    flush()
    return cues


GAP_SECONDS = 4.0  # khoảng trống từ mức này trở lên mới cần vá bằng lượt phụ


def _gap_edges(words: list) -> list:
    """Các khoảng giữa từ (kể cả từ đầu bài tính từ giây 0): [(điểm bắt đầu hoặc None, điểm kết thúc)]."""
    return [(None, words[0].start)] + [(a.end, b.start) for a, b in zip(words, words[1:])]


def has_gap(main: list, min_gap: float = GAP_SECONDS) -> bool:
    """Lượt chính có khoảng trống đủ dài để cần lượt phụ không? Không có thì lượt phụ chắc chắn không thêm từ nào."""
    if not main:
        return True
    return any(hi - (lo if lo is not None else 0.0) >= min_gap for lo, hi in _gap_edges(main))


def fill_gaps(main: list, fill: list, min_gap: float = GAP_SECONDS) -> list:
    """Vá lượt nhận dạng chính bằng từ của lượt phụ, chỉ ở những khoảng trống dài (>= min_gap giây).

    Lượt chính hay bỏ sót đoạn đầu có nhạc nền; lượt phụ (VAD nhẹ) nghe được nhưng kém chính xác ở chỗ khác,
    nên chỉ lấy từ của nó ở nơi lượt chính không có gì.
    """
    if not main:
        return list(fill)
    out = list(main)
    for lo, hi in _gap_edges(main):
        if hi - (lo if lo is not None else 0.0) >= min_gap:
            lo = 0.0 if lo is None else lo
            out += [w for w in fill if w.start >= lo - 0.1 and w.end <= hi + 0.1]
    return sorted(out, key=lambda w: w.start)


def _run(audio: Path, **options) -> list:
    """Một lượt Whisper, trả về danh sách từ có mốc giờ. Bỏ đoạn mà Whisper tự chấm là nhiễu (hay ra chữ 'You')."""
    segments, _ = _model.transcribe(
        str(audio), language="en", word_timestamps=True, condition_on_previous_text=False,
        beam_size=1,  # giải mã tham lam: nhanh hơn khoảng một nửa so với mặc định (5), chỉ kém chính xác chút ít
        **options,
    )
    return [
        w for s in segments
        if not (s.no_speech_prob > 0.8 and s.avg_logprob < -0.7)
        for w in (s.words or [])
    ]


def transcribe(audio: Path) -> list[dict]:
    """Nhận dạng tiếng Anh bằng faster-whisper (tải model lần đầu, khoảng 500 MB).

    Hai lượt: (1) tắt VAD, vì VAD mặc định nhầm giọng hát có nhạc nền là im lặng và bỏ mất hơn nửa số chữ;
    (2) VAD nhẹ để vá các khoảng trống dài của lượt 1 (thường là đoạn mở đầu).
    """
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        # Dùng hết số nhân CPU của máy (mặc định chỉ 4 luồng).
        _model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4)
    main = _run(audio, vad_filter=False, no_speech_threshold=None, log_prob_threshold=None)
    if not has_gap(main):
        return words_to_cues(main)  # không có khoảng trống cần vá: bỏ lượt phụ, kết quả y hệt mà nhanh gần gấp đôi
    fill = _run(
        audio, vad_filter=True,
        vad_parameters={"threshold": 0.25, "min_silence_duration_ms": 1500, "speech_pad_ms": 500},
    )
    return words_to_cues(fill_gaps(main, fill))


def download_youtube(url: str, workdir: Path) -> tuple[Path, Path | None, str]:
    """Tải âm thanh và phụ đề do người đăng tải (KHÔNG lấy phụ đề tự động). Trả về (âm thanh, phụ đề, tiêu đề)."""
    import truststore

    truststore.inject_into_ssl()  # dùng kho chứng chỉ của Windows (tránh lỗi khi có phần mềm quét HTTPS)
    import yt_dlp

    opts = {
        "format": "bestaudio/best",
        "outtmpl": str(workdir / "source.%(ext)s"),
        "writesubtitles": True,
        "writeautomaticsub": False,
        "subtitleslangs": ["en.*"],
        "subtitlesformat": "vtt",
        "noplaylist": True,
        "quiet": True,
        "js_runtimes": {"node": {}},  # yt-dlp mới cần trình chạy JS để đọc YouTube
    }
    with yt_dlp.YoutubeDL(opts) as ydl:
        info = ydl.extract_info(url, download=True)
    subs = next(iter(sorted(workdir.glob("source*.vtt"))), None)
    audio = next(p for p in workdir.glob("source.*") if p.suffix != ".vtt")
    return audio, subs, info.get("title") or url
