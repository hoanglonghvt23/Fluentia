"""Worker Fluentia: lấy bài học đang chờ từ Supabase, tách âm thanh, lấy phụ đề (hoặc Whisper), ghi kết quả.

Chạy: python main.py   (dừng bằng Ctrl+C)
      python main.py --check   (chỉ kiểm tra kết nối Supabase)
"""
import sys
import tempfile
import time
import traceback
from pathlib import Path

from supabase import Client, create_client

import config
import media
import subtitles

BUCKET = "media"
POLL_SECONDS = 5
MAX_UPLOAD = 50 * 1024 * 1024  # giới hạn file của Supabase gói Free


def check_connection(db: Client) -> None:
    print(f"Kết nối Supabase OK. Số bucket Storage hiện có: {len(db.storage.list_buckets())}")


def process(db: Client, lesson: dict, work: Path) -> None:
    store = db.storage.from_(BUCKET)
    owner, lid = lesson["owner"], lesson["id"]
    update: dict = {}
    subs_file: Path | None = None

    # Nhận dạng lại: bài đã có âm thanh nhưng bị xóa phụ đề (người dùng bấm "Nhận dạng lại").
    if lesson.get("audio_path") and not lesson.get("cues"):
        audio = work / "audio.mp3"
        audio.write_bytes(store.download(lesson["audio_path"]))
        cues = media.transcribe(audio)
        if not cues:
            raise RuntimeError("Không nhận ra lời nói trong file này.")
        db.table("lessons").update({"cues": cues, "status": "ready", "error": None}).eq("id", lid).execute()
        return

    if lesson["source_type"] == "youtube":
        src, subs_file, title = media.download_youtube(lesson["source_url"], work)
        if lesson["title"] == lesson["source_url"]:
            update["title"] = title
    else:
        src = work / "source.bin"
        src.write_bytes(store.download(lesson["source_path"]))
        if lesson.get("subs_path"):
            subs_file = work / "subs.txt"
            subs_file.write_bytes(store.download(lesson["subs_path"]))

    audio = work / "audio.mp3"
    update["duration"] = media.extract_audio(src, audio)
    if audio.stat().st_size > MAX_UPLOAD:
        raise RuntimeError("Âm thanh sau khi tách vượt 50 MB (giới hạn Supabase Free). Hãy dùng video ngắn hơn.")

    cues = subtitles.parse(subs_file.read_text(encoding="utf-8", errors="replace")) if subs_file else []
    if not cues:
        print("  Không có phụ đề, dùng Whisper...")
        cues = media.transcribe(audio)
    if not cues:
        raise RuntimeError("Không nhận ra lời nói trong file này.")

    audio_path = f"{owner}/{lid}/audio.mp3"
    store.upload(audio_path, audio.read_bytes(), {"content-type": "audio/mpeg", "upsert": "true"})

    # Xóa video và phụ đề gốc, chỉ giữ âm thanh (đã chốt để tiết kiệm 1 GB của Supabase).
    old = [p for p in (lesson.get("source_path"), lesson.get("subs_path")) if p]
    if old:
        store.remove(old)
    db.table("lessons").update(
        {**update, "audio_path": audio_path, "cues": cues, "source_path": None, "subs_path": None,
         "status": "ready", "error": None}
    ).eq("id", lid).execute()


def run() -> None:
    db = create_client(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY)
    check_connection(db)
    # Bài đang xử lý dở từ lần chạy trước (worker bị tắt giữa chừng) thì xếp hàng lại.
    db.table("lessons").update({"status": "queued"}).eq("status", "processing").execute()
    print("Worker đang chờ bài học mới. Ctrl+C để dừng.")

    while True:
        try:
            rows = db.table("lessons").select("*").eq("status", "queued").order("created_at").limit(1).execute().data
            if not rows:
                time.sleep(POLL_SECONDS)
                continue
            lesson = rows[0]
            # Nhận việc: chỉ một worker thắng nếu chạy nhiều bản.
            claimed = db.table("lessons").update({"status": "processing"}).eq("id", lesson["id"]).eq("status", "queued").execute()
            if not claimed.data:
                continue
            print(f"Xử lý: {lesson['title']}")
            try:
                with tempfile.TemporaryDirectory() as tmp:
                    process(db, lesson, Path(tmp))
                print("  Xong.")
            except Exception as e:  # noqa: BLE001 - ghi lỗi vào bài học để người dùng thấy
                traceback.print_exc()
                db.table("lessons").update({"status": "error", "error": str(e)[:500]}).eq("id", lesson["id"]).execute()
        except KeyboardInterrupt:
            raise
        except Exception:  # lỗi mạng tạm thời: thử lại sau
            traceback.print_exc()
            time.sleep(POLL_SECONDS * 2)


if __name__ == "__main__":
    try:
        if "--check" in sys.argv:
            check_connection(create_client(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY))
        else:
            run()
    except KeyboardInterrupt:
        print("\nĐã dừng worker.")
