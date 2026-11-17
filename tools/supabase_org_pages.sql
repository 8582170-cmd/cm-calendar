-- דפי הארגון (אודות, יצירת קשר, רשימת תפוצה) למכירה סינית ולקמפיין התרמה.
-- להריץ פעם אחת ב-Supabase → SQL Editor. בטוח להריץ שוב.
create table if not exists public.org_msg (
  id uuid primary key default gen_random_uuid(),
  wing text not null,           -- auction | give
  slug text not null,
  kind text not null,           -- contact | list
  name text,
  email text,
  phone text,
  msg text,
  consent boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists org_msg_slug_idx on public.org_msg (wing, slug, kind, created_at desc);
alter table public.org_msg enable row level security;
