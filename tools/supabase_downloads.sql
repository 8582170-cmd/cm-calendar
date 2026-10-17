-- יומן ההורדות וההדפסות באתר (מוצג בדף הניהול). מריצים פעם אחת ב-Supabase: SQL Editor → Run
create table if not exists public.downloads (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid,
  email       text,
  kind        text not null,      -- paid / lite / sample / countdown
  plan        text,
  cal         text,               -- איזה לוח: השנה, סוג הלוח
  view        text,
  size        text,
  pages       int,
  page        text                -- מאיזה דף באתר (app / simple / countdown)
);
create index if not exists downloads_created_idx on public.downloads (created_at desc);
create index if not exists downloads_email_idx on public.downloads (lower(email));
alter table public.downloads enable row level security;

-- דוגמיות של לוחות שהורדו (בלי תמונות), לבדיקת תקינות. דלי פרטי.
alter table public.downloads add column if not exists snap text;
insert into storage.buckets (id, name, public) values ('samples', 'samples', false) on conflict (id) do nothing;
