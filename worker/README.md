# worker (Python)

Chạy trên máy của bạn, chủ động đọc hàng đợi từ Supabase (không cần mở máy ra internet).
Với mỗi bài học mới (tải file lên hoặc link YouTube), worker:

1. Tải video (hoặc âm thanh YouTube), tách âm thanh bằng ffmpeg thành mp3 nhẹ.
2. Lấy phụ đề: file .srt/.vtt người dùng tải lên, hoặc phụ đề do người đăng YouTube tải lên. Không có thì dùng Whisper (model small, CPU).
3. Tải âm thanh lên Supabase Storage, xóa video gốc, ghi phụ đề thô vào bài học.

## Cài đặt (Windows PowerShell)

Cần ffmpeg: `winget install Gyan.FFmpeg` (rồi mở lại terminal).

```powershell
cd worker
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # rồi điền SUPABASE_URL, SUPABASE_SECRET_KEY
python main.py --check   # kiểm tra kết nối
python main.py           # chạy worker (Ctrl+C để dừng)
```

Lần đầu dùng Whisper sẽ tự tải model khoảng 500 MB.

## Kiểm tra phần xử lý media (không cần Supabase)

```powershell
python test_worker.py            # đọc phụ đề + ffmpeg
python test_worker.py --whisper  # thêm nhận dạng giọng nói
```

## Lưu ý

- yt-dlp hay hỏng khi YouTube đổi: cập nhật định kỳ bằng `pip install -U yt-dlp`.
- Nếu tải YouTube báo thiếu bộ giải JS, xem https://github.com/yt-dlp/yt-dlp/wiki/EJS.
- Bài đang xử lý dở khi tắt worker sẽ tự xếp hàng lại ở lần chạy sau.
