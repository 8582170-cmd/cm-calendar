-- שיתוף לוח עם המשפחה (קישור למשתתפים בלי הרשמה). להריץ פעם אחת ב-Supabase → SQL Editor.
create table if not exists public.shares (
  id text primary key,
  user_id uuid not null,
  owner_email text,
  title text,
  owner_name text,
  months jsonb default '[]'::jsonb,
  cal text default 'heb',
  auto boolean default false,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists shares_user on public.shares(user_id);

create table if not exists public.share_items (
  id bigserial primary key,
  share_id text not null references public.shares(id) on delete cascade,
  who text,
  kind text,
  data jsonb default '{}'::jsonb,
  img text,
  status text default 'new',
  created_at timestamptz default now()
);
create index if not exists share_items_share on public.share_items(share_id, status);

-- רק השרת (מפתח השירות) ניגש לטבלאות
alter table public.shares enable row level security;
alter table public.share_items enable row level security;

-- דלי פרטי לתמונות שהמשפחה מעלה (נמחקות אחרי שבעל הלוח מאשר או דוחה)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('shared', 'shared', false, 6291456, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
