"""Model: truy cập bảng lessons (chính là hàng đợi công việc của worker)."""
from supabase import Client


class LessonModel:
    def __init__(self, db: Client):
        self._table = lambda: db.table("lessons")

    def requeue_stuck(self) -> None:
        """Bài đang xử lý dở từ lần chạy trước (worker bị tắt giữa chừng) thì xếp hàng lại."""
        self._table().update({"status": "queued"}).eq("status", "processing").execute()

    def next_queued(self) -> dict | None:
        rows = self._table().select("*").eq("status", "queued").order("created_at").limit(1).execute().data
        return rows[0] if rows else None

    def claim(self, lesson_id: str) -> bool:
        """Nhận việc: chỉ một worker thắng nếu chạy nhiều bản."""
        claimed = self._table().update({"status": "processing"}).eq("id", lesson_id).eq("status", "queued").execute()
        return bool(claimed.data)

    def mark_ready(self, lesson_id: str, fields: dict) -> None:
        self._table().update({**fields, "status": "ready", "error": None}).eq("id", lesson_id).execute()

    def mark_error(self, lesson_id: str, message: str) -> None:
        self._table().update({"status": "error", "error": message[:500]}).eq("id", lesson_id).execute()
