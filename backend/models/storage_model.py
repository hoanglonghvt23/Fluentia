"""Model: truy cập Supabase Storage (bucket media)."""
from supabase import Client

BUCKET = "media"
MAX_UPLOAD = 50 * 1024 * 1024  # giới hạn file của Supabase gói Free


class StorageModel:
    def __init__(self, db: Client):
        self._bucket = db.storage.from_(BUCKET)
        self._db = db

    def count_buckets(self) -> int:
        return len(self._db.storage.list_buckets())

    def download(self, path: str) -> bytes:
        return self._bucket.download(path)

    def upload(self, path: str, data: bytes, options: dict) -> None:
        self._bucket.upload(path, data, options)

    def remove(self, paths: list[str]) -> None:
        self._bucket.remove(paths)
