-- להריץ פעם אחת ב-Supabase → SQL Editor → New query → Run
create table if not exists public.orders (
  id          text primary key,
  plan        text not null,
  amount      numeric not null,
  status      text not null default 'pending',   -- pending / paid / failed / underpaid
  txn         text,
  callback    jsonb,
  email       text,
  created_at  timestamptz not null default now(),
  paid_at     timestamptz
);
-- רק השרת (עם מפתח ה-service_role) ניגש לטבלה. אין גישה מהדפדפן.
alter table public.orders enable row level security;
