-- משתמשים, טלפונים ותזכורות קוליות. להריץ פעם אחת ב-Supabase → SQL Editor
create table if not exists public.profiles (
  user_id            uuid primary key,
  email              text,
  phone              text,
  phone_verified_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists profiles_email_idx on public.profiles (lower(email));
create table if not exists public.phone_codes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  phone      text not null,
  code_hash  text not null,
  tries      int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists phone_codes_user_idx on public.phone_codes (user_id, created_at desc);
create table if not exists public.voice_reminders (
  id         bigint generated always as identity primary key,
  user_id    uuid not null,
  phone      text not null,
  name       text not null,
  rule       jsonb not null,
  notice     int[] not null default '{1}',
  status     text not null default 'active',
  last_sent  date,
  created_at timestamptz not null default now()
);
create index if not exists voice_rem_user_idx on public.voice_reminders (user_id);
alter table public.profiles enable row level security;
alter table public.phone_codes enable row level security;
alter table public.voice_reminders enable row level security;
