-- לוח חינמי לשנה (גרסה מוגבלת): מימוש אחד לכל משתמש. להריץ פעם אחת ב-Supabase → SQL Editor
create table if not exists public.free_lite (
  user_id   uuid primary key,
  email     text,
  used_at   timestamptz not null default now()
);
alter table public.free_lite enable row level security;
