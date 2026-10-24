-- לוחות ציבוריים מהלוח המקוון: myluach.org/<שם>
-- מריצים פעם אחת ב-Supabase: SQL Editor -> New query -> מדביקים -> Run
create table if not exists public.public_cals (
  slug text primary key,
  user_id uuid not null unique,
  email text,
  title text not null default '',
  about text,
  city text,
  data jsonb not null default '{}'::jsonb,
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.public_cals enable row level security;
