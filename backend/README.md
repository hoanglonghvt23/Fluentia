# backend (Python)

Chạy trên máy của bạn, chủ động đọc hàng đợi từ Supabase (không cần mở máy ra internet).
Với mỗi bài học mới (tải file lên hoặc link YouTube), worker:

1. Tải video (hoặc âm thanh YouTube), tách âm thanh bằng ffmpeg thành mp3 nhẹ.
2. Lấy phụ đề: file .srt/.vtt người dùng tải lên, hoặc phụ đề do người đăng YouTube tải lên. Không có thì dùng Whisper (model small, CPU).
3. Tải âm thanh lên Supabase Storage, xóa video gốc, ghi phụ đề thô vào bài học.

## Cấu trúc (MVC2 cho tiến trình nền)

- `main.py`: điểm vào (`--check`, `--once`).
- `models/`: Model, đọc/ghi dữ liệu (`lesson_model.py` cho bảng `lessons`, `storage_model.py` cho Storage).
- `services/`: xử lý nghiệp vụ nặng (`media_service.py`: ffmpeg, yt-dlp, Whisper; `subtitle_service.py`: đọc .srt/.vtt).
- `controllers/`: Controller, điều phối từng bài và vòng lặp nhận việc (`worker_controller.py`).
- Backend không có giao diện; phần View nằm ở `frontend/`.

## Cài đặt (Windows PowerShell)

Cần ffmpeg: `winget install Gyan.FFmpeg` (rồi mở lại terminal).

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # rồi điền SUPABASE_URL, SUPABASE_SECRET_KEY
python main.py --check   # kiểm tra kết nối
python main.py           # chạy worker (Ctrl+C để dừng)
```

Lần đầu dùng Whisper sẽ tự tải model khoảng 500 MB.

## Chạy trên GitHub Actions (không cần bật máy)

Workflow `.github/workflows/worker.yml` chạy `python main.py --once` trên máy chủ GitHub (miễn phí): xử lý hết các bài đang chờ rồi tự tắt.
Nó chạy khi web gọi (có bài mới hoặc bấm "Nhận dạng lại") và mỗi giờ một lần để vét bài sót. Giờ cũng là hoạt động giúp Supabase khỏi bị tạm dừng.

1. Repo GitHub > Settings > Secrets and variables > Actions > **New repository secret**: thêm `SUPABASE_URL` và `SUPABASE_SECRET_KEY` (cùng giá trị như `backend/.env`).
2. Tạo token: GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens. Chỉ chọn repo này, quyền **Actions: Read and write**.
3. Vercel > Environment Variables: `GITHUB_DISPATCH_TOKEN` = token trên, `GITHUB_REPOSITORY` = `chủ-sở-hữu/tên-repo`. Rồi Redeploy.
4. Thử: tab Actions > worker > **Run workflow**, hoặc tạo một bài mới trên web.

Không chạy worker ở máy cá nhân cùng lúc (hai bên sẽ tranh bài). Bài mới chờ khoảng 1 đến 2 phút để bắt đầu.
Repo công khai thì GitHub Actions không giới hạn phút; repo riêng có 2000 phút mỗi tháng (lượt chạy không có bài chờ chỉ tốn vài giây).
GitHub tắt workflow theo lịch sau 60 ngày repo không có hoạt động: vào tab Actions bật lại nếu gặp.

## Kiểm tra phần xử lý media (không cần Supabase)

```powershell
python test_worker.py            # đọc phụ đề + ffmpeg
python test_worker.py --whisper  # thêm nhận dạng giọng nói
```

## Lưu ý

- yt-dlp hay hỏng khi YouTube đổi: cập nhật định kỳ bằng `pip install -U yt-dlp`.
- Nếu tải YouTube báo thiếu bộ giải JS, xem https://github.com/yt-dlp/yt-dlp/wiki/EJS.
- Máy chủ GitHub hay bị YouTube chặn khi dùng yt-dlp; bài tải file lên thì không bị ảnh hưởng.
- Bài đang xử lý dở khi tắt worker sẽ tự xếp hàng lại ở lần chạy sau.
