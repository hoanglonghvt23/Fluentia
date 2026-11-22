"""Xử lý media: tách âm thanh (ffmpeg), tải YouTube (yt-dlp), nhận dạng giọng nói (Whisper)."""
import subprocess
from pathlib import Path

WHISPER_MODEL = "small"  # đã chốt: small chạy bằng CPU
_model = None


def extract_audio(src: Path, out: Path) -> float:
    """Tách âm thanh thành mp3 mono 64 kbps (nhẹ, đủ cho giọng nói). Trả về thời lượng (giây)."""
    subprocess.run(
        ["ffmpeg", "-y", "-i", str(src), "-vn", "-ac", "1", "-b:a", "64k", str(out)],
        check=True, capture_output=True,
    )
    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(out)],
        check=True, capture_output=True, text=True,
    )
    return float(probe.stdout.strip())


def transcribe(audio: Path) -> list[dict]:
    """Nhận dạng tiếng Anh bằng faster-whisper (tải model lần đầu, khoảng 500 MB)."""
    global _model
    if _model is None:
        from faster_whisper import WhisperModel

        _model = WhisperModel(WHISPER_MODEL, device="cpu", compute_type="int8")
    segments, _ = _model.transcribe(str(audio), language="en", vad_filter=True)
    return [{"start": s.start, "end": s.end, "text": s.text.strip()} for s in segments if s.text.strip()]


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
