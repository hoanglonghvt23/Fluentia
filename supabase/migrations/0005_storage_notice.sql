-- Dán toàn bộ file này vào Supabase > SQL Editor rồi bấm Run (sau 0004).
-- Thông báo dọn dữ liệu: khi Storage đạt 80% (800 MB trong gói Free 1 GB) thì mở hạn 3 ngày
-- để người dùng tải bài về máy. Web gọi refresh_storage_notice() mỗi lần mở trang, hàm tự đo
-- dung lượng (tối đa 10 phút một lần) nên không cần khóa bí mật hay lịch chạy riêng.

create table public.storage_notice (
  id int primary key default 1 check (id = 1), -- chỉ một dòng duy nhất
  used_bytes bigint not null default 0,
  checked_at timestamptz not null default 'epoch',
  deadline_at timestamptz                      -- null = không có thông báo
);
insert into public.storage_notice (id) values (1);

alter table public.storage_notice enable row level security;
create policy "doc thong bao dung luong" on public.storage_notice
  for select to authenticated using (true);

create function public.refresh_storage_notice() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare
  threshold constant bigint := 800 * 1024 * 1024; -- 80% của 1 GB
  n public.storage_notice;
  used bigint;
  new_deadline timestamptz;
begin
  select * into n from public.storage_notice where id = 1 for update;
  if n.checked_at > now() - interval '10 minutes' then
    return n.deadline_at;
  end if;

  select coalesce(sum((metadata ->> 'size')::bigint), 0) into used
  from storage.objects where bucket_id = 'media';

  if used >= threshold then
    new_deadline := coalesce(n.deadline_at, now() + interval '3 days');
  else
    new_deadline := null; -- đã xuống dưới ngưỡng: hủy thông báo
  end if;

  update public.storage_notice
  set used_bytes = used, checked_at = now(), deadline_at = new_deadline
  where id = 1;
  return new_deadline;
end $$;

revoke all on function public.refresh_storage_notice() from public, anon;
grant execute on function public.refresh_storage_notice() to authenticated;
