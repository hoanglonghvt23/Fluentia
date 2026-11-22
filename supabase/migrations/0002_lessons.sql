-- Dán toàn bộ file này vào Supabase > SQL Editor rồi bấm Run (sau 0001_profiles.sql).

-- Bài học. Hàng đợi công việc: worker lấy các bài có status = 'queued'.
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  owner uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  source_type text not null check (source_type in ('upload', 'youtube')),
  source_url text,
  source_path text,   -- file video tải lên (Storage), worker xóa sau khi tách âm thanh
  subs_path text,     -- file phụ đề .srt/.vtt tải lên (nếu có)
  status text not null default 'queued' check (status in ('queued', 'processing', 'ready', 'error')),
  error text,
  audio_path text,    -- âm thanh đã tách (Storage)
  duration real,
  cues jsonb,         -- phụ đề thô [{start, end, text}], web tách thành câu từ đây
  created_at timestamptz not null default now()
);

-- Câu đã tách và chỉnh.
create table public.sentences (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  idx int not null,
  start_sec real not null,
  end_sec real not null,
  text text not null
);
create index on public.sentences (lesson_id, idx);

-- Lịch sử Dictation. Lưu bản chụp câu để giữ lịch sử khi câu bị sửa hoặc xóa.
create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  sentence_id uuid references public.sentences (id) on delete set null,
  sentence_idx int not null,
  sentence_text text not null,
  answer text not null,
  score real not null,
  created_at timestamptz not null default now()
);
create index on public.attempts (user_id, created_at desc);

-- Bản ghi Shadowing, gắn với câu gốc và mốc thời gian (chừa chỗ cho phần chấm phát âm sau này).
create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  sentence_id uuid references public.sentences (id) on delete set null,
  start_sec real not null,
  end_sec real not null,
  sentence_text text not null,
  path text not null,
  mime text not null,
  created_at timestamptz not null default now()
);
create index on public.recordings (user_id, lesson_id);

alter table public.lessons enable row level security;
alter table public.sentences enable row level security;
alter table public.attempts enable row level security;
alter table public.recordings enable row level security;

create policy "bai hoc cua minh" on public.lessons
  for all using (owner = auth.uid()) with check (owner = auth.uid());

create policy "cau cua bai minh" on public.sentences
  for all using (exists (select 1 from public.lessons l where l.id = lesson_id and l.owner = auth.uid()))
  with check (exists (select 1 from public.lessons l where l.id = lesson_id and l.owner = auth.uid()));

create policy "lich su cua minh" on public.attempts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "ban ghi cua minh" on public.recordings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Kho file riêng tư, giới hạn 50 MB mỗi file (mức tối đa của gói Free).
-- Mỗi người chỉ truy cập thư mục mang id của mình: media/<user_id>/...
insert into storage.buckets (id, name, public, file_size_limit)
values ('media', 'media', false, 52428800)
on conflict (id) do nothing;

create policy "file cua minh" on storage.objects
  for all to authenticated
  using (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'media' and (storage.foldername(name))[1] = auth.uid()::text);
