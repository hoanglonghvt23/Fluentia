-- Dán vào Supabase > SQL Editor rồi bấm Run (sau 0002_lessons.sql).
-- Tùy chỉnh chọn lúc tạo bài: giới hạn số câu và số chữ, độ dài mỗi câu, chế độ có hoặc không ô nhập.
alter table public.lessons
  add column if not exists settings jsonb not null default '{}'::jsonb;
