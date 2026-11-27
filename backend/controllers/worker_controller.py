"""Controller: điều phối việc xử lý một bài học (Model lấy/ghi dữ liệu, Service làm việc nặng) và vòng lặp nhận việc."""
import tempfile
import time
import traceback
from pathlib import Path

from supabase import Client

from models.lesson_model import LessonModel
from models.storage_model import MAX_UPLOAD, StorageModel
from services import media_service as media
from services import subtitle_service as subtitles

POLL_SECONDS = 5


def process(lessons: LessonModel, store: StorageModel, lesson: dict, work: Path) -> None:
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
        lessons.mark_ready(lid, {"cues": cues})
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
    lessons.mark_ready(lid, {**update, "audio_path": audio_path, "cues": cues, "source_path": None, "subs_path": None})


def check_connection(db: Client) -> None:
    print(f"Kết nối Supabase OK. Số bucket Storage hiện có: {StorageModel(db).count_buckets()}")


def run(db: Client, once: bool = False) -> None:
    lessons, store = LessonModel(db), StorageModel(db)
    check_connection(db)
    lessons.requeue_stuck()
    print("Xử lý các bài đang chờ rồi thoát." if once else "Worker đang chờ bài học mới. Ctrl+C để dừng.")

    while True:
        try:
            lesson = lessons.next_queued()
            if not lesson:
                if once:
                    print("Không còn bài chờ.")
                    return
                time.sleep(POLL_SECONDS)
                continue
            if not lessons.claim(lesson["id"]):
                continue
            print(f"Xử lý: {lesson['title']}")
            try:
                with tempfile.TemporaryDirectory() as tmp:
                    process(lessons, store, lesson, Path(tmp))
                print("  Xong.")
            except Exception as e:  # noqa: BLE001 - ghi lỗi vào bài học để người dùng thấy
                traceback.print_exc()
                lessons.mark_error(lesson["id"], str(e))
        except KeyboardInterrupt:
            raise
        except Exception:  # lỗi mạng tạm thời: thử lại sau
            traceback.print_exc()
            time.sleep(POLL_SECONDS * 2)
