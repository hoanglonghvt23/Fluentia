-- Dán toàn bộ file này vào Supabase > SQL Editor rồi bấm Run.
-- Đăng nhập Google: chỉ email có trong bảng allowed_emails mới tạo được tài khoản.

create table public.allowed_emails (
  email text primary key check (email = lower(email)),
  created_at timestamptz not null default now()
);

-- Bật RLS và không có policy: chỉ khóa bí mật (trang /admin) đọc/ghi được.
alter table public.allowed_emails enable row level security;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  base text;
  uname text;
  n int := 0;
begin
  if new.raw_app_meta_data ->> 'provider' = 'google' then
    if not exists (select 1 from public.allowed_emails where email = lower(new.email)) then
      raise exception 'email_not_allowed';
    end if;
    -- username từ phần trước @, chỉ giữ a-z 0-9 _, dài 3-20 ký tự.
    base := left(regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '', 'g'), 16);
    if length(base) < 3 then base := 'user'; end if;
    uname := base;
    while exists (select 1 from public.profiles where username = uname) loop
      n := n + 1;
      uname := base || n::text;
    end loop;
  else
    uname := split_part(new.email, '@', 1);
  end if;

  insert into public.profiles (id, username) values (new.id, uname);
  return new;
end $$;
