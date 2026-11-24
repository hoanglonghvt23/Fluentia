# Fluentia

> **Đây là web dùng cá nhân, không phục vụ mục đích thương mại.**
> *This is a personal-use project, not intended for commercial purposes.*

Web luyện tiếng Anh từ video với hai tính năng: Dictation (nghe chép chính tả) và Shadowing (nhại theo).

## Cấu trúc

- `web/`: Next.js, chạy trên Vercel. Cấu hình: `web/.env.example`.
- `worker/`: Python (yt-dlp, ffmpeg, faster-whisper), chạy trên GitHub Actions hoặc máy cá nhân. Xem `worker/README.md`.
- `supabase/migrations/`: các file SQL tạo bảng, chạy tay theo thứ tự trong SQL Editor của Supabase.

## Chạy web trên máy

```powershell
cd web
npm install
copy .env.example .env.local   # rồi điền giá trị
npm run dev                    # mở http://localhost:3000
```
