"""Điểm vào của backend Fluentia: lấy bài học đang chờ từ Supabase, tách âm thanh, lấy phụ đề (hoặc Whisper), ghi kết quả.

Cấu trúc (MVC2 áp dụng cho một tiến trình nền, không có giao diện):
  models/       Model: đọc và ghi dữ liệu (bảng lessons, Storage)
  services/     xử lý nghiệp vụ nặng: ffmpeg, yt-dlp, Whisper, đọc phụ đề
  controllers/  Controller: điều phối từng bài và vòng lặp nhận việc

Chạy: python main.py   (dừng bằng Ctrl+C)
      python main.py --check   (chỉ kiểm tra kết nối Supabase)
      python main.py --once    (xử lý hết các bài đang chờ rồi thoát; dùng cho GitHub Actions)
"""
import sys

from supabase import create_client

import config
from controllers import worker_controller

if __name__ == "__main__":
    try:
        db = create_client(config.SUPABASE_URL, config.SUPABASE_SECRET_KEY)
        if "--check" in sys.argv:
            worker_controller.check_connection(db)
        else:
            worker_controller.run(db, once="--once" in sys.argv)
    except KeyboardInterrupt:
        print("\nĐã dừng worker.")
