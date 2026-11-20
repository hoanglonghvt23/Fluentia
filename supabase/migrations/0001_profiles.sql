-- Dán toàn bộ file này vào Supabase > SQL Editor rồi bấm Run.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  role text not null default 'user' check (role in ('admin', 'user')),
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Người dùng chỉ đọc được hồ sơ của mình. Không có policy ghi: vai trò chỉ đổi qua SQL hoặc khóa bí mật.
create policy "doc ho so cua minh" on public.profiles
  for select using (auth.uid() = id);

-- Tự tạo hồ sơ khi có tài khoản mới; username lấy từ phần trước @ của email giả.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, username)
  values (new.id, split_part(new.email, '@', 1));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
