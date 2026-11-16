"""Worker Fluteria.

Giai đoạn 0: chỉ kiểm tra kết nối Supabase.
Các giai đoạn sau: đọc hàng đợi công việc, chạy yt-dlp, ffmpeg, Whisper.
"""
from supabase import create_client

import config


def check_connection() -> None:
    client = create_client(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY)
    buckets = client.storage.list_buckets()
    print(f"Kết nối Supabase OK. Số bucket Storage hiện có: {len(buckets)}")


if __name__ == "__main__":
    check_connection()
