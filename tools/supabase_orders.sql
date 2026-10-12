-- להריץ ב-Supabase → SQL Editor → New query → Run (בטוח להריץ שוב)
create table if not exists public.orders (
  id          text primary key,
  plan        text not null,
  amount      numeric not null,
  status      text not null default 'pending',   -- pending / paid / failed / underpaid
  txn         text,
  callback    jsonb,
  email       text,
  coupon      text,
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);
alter table public.orders add column if not exists coupon text;
alter table public.orders enable row level security;

-- הגדרות דף הניהול: מחירים, מבצע וקופונים
create table if not exists public.settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);
alter table public.settings enable row level security;
