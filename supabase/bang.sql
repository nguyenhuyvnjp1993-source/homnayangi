-- Chặng C2: bảng lưu món đã chốt cho từng ngày.
-- Cách dùng: Supabase → SQL Editor → New query → dán toàn bộ file này → Run.
-- Chạy lại nhiều lần cũng không sao (không xóa dữ liệu cũ).

create table if not exists public.bua_an (
  ngay      date primary key,                       -- ngày ăn (giờ Nhật)
  man       text not null,                          -- mã món mặn trong data/mon-an.json, ví dụ M1
  rau       text not null,                          -- mã món rau, ví dụ R4
  nguon     text not null default 'yen'
            check (nguon in ('yen', 'tu_chon')),    -- Yến chọn, hay app tự chọn lúc 16:30 (chặng C4)
  da_doi    boolean not null default false,         -- ngày này đã bấm "Đổi món"
  cap_nhat  timestamptz not null default now()
);

-- Khóa kín bảng: app trên iPhone không đọc/ghi trực tiếp được.
-- Chỉ code máy chủ (Netlify Functions, giữ khóa secret) mới vào được.
alter table public.bua_an enable row level security;
