# worker (Python)

Chạy trên máy của bạn, chủ động đọc hàng đợi từ Supabase (không cần mở máy ra internet).

## Cài đặt (Windows PowerShell)

```powershell
cd worker
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env   # rồi điền SUPABASE_URL, SUPABASE_SECRET_KEY
python main.py
```

Kết quả đúng: `Kết nối Supabase OK. ...`
