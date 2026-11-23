# Fluentia

Web luyện tiếng Anh từ video: Dictation và Shadowing. Xem [CLAUDE.md](CLAUDE.md).

- `web/`: Next.js, chạy trên Vercel. Cấu hình: `web/.env.example`.
- `worker/`: Python, chạy trên máy cá nhân. Xem `worker/README.md`.

## Chạy web trên máy

```powershell
cd web
npm install
copy .env.example .env.local   # rồi điền giá trị
npm run dev                    # mở http://localhost:3000
```
