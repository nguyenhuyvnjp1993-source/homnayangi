-- Chặng C4: lưu "địa chỉ nhận thông báo" của iPhone Yến (mỗi lần Yến bấm "Bật thông báo").
-- Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ file này → Run.
-- Chạy lại nhiều lần cũng không sao.

create table if not exists public.thong_bao (
  endpoint  text primary key,                 -- địa chỉ do Apple cấp cho iPhone đã bật thông báo
  p256dh    text not null,                    -- khóa mã hóa của iPhone (không phải mã bí mật của mình)
  auth      text not null,
  tao_luc   timestamptz not null default now()
);

-- Khóa kín bảng như bua_an: chỉ code máy chủ (khóa secret) đọc/ghi được.
alter table public.thong_bao enable row level security;
