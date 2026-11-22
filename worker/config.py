"""Đọc cấu hình worker từ biến môi trường (file worker/.env)."""
import os
import sys
from pathlib import Path

import truststore
from dotenv import load_dotenv

# Dùng kho chứng chỉ của Windows cho mọi kết nối HTTPS (tránh lỗi "self-signed certificate"
# khi máy có phần mềm quét HTTPS). Phải chạy trước khi tạo client Supabase.
truststore.inject_into_ssl()

# Console Windows mặc định không phải UTF-8, ép lại để in tiếng Việt.
sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

load_dotenv(Path(__file__).with_name(".env"))


def require(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise SystemExit(f"Thiếu biến môi trường {name}. Xem worker/.env.example.")
    return value


SUPABASE_URL = require("SUPABASE_URL")
SUPABASE_SECRET_KEY = require("SUPABASE_SECRET_KEY")
