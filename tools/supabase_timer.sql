-- דף הזמנה לאירוע (שעון הספירה): אישורי הגעה וברכות. להריץ פעם אחת ב-Supabase → SQL Editor.
create table if not exists public.timer_rsvp (
  id bigserial primary key,
  slug text not null,
  name text,
  phone text,
  status text,          -- yes / no / maybe
  adults int default 0,
  kids int default 0,
  note text,
  ip text, ip_geo text, ua text,
  created_at timestamptz default now()
);
create index if not exists timer_rsvp_slug on public.timer_rsvp(slug, created_at desc);

create table if not exists public.timer_wall (
  id bigserial primary key,
  slug text not null,
  name text,
  text text,
  public boolean default true,   -- false = רק בעל האירוע רואה
  hidden boolean default false,  -- בעל האירוע הסתיר
  ip text, ip_geo text, ua text,
  created_at timestamptz default now()
);
create index if not exists timer_wall_slug on public.timer_wall(slug, created_at desc);

-- חלוקת תהילים: כל פרק נלקח פעם אחת בכל סבב
create table if not exists public.timer_teh (
  id bigserial primary key,
  slug text not null,
  round int default 1,
  chapter int not null,
  name text,
  ip text, ip_geo text, ua text,
  created_at timestamptz default now(),
  unique (slug, round, chapter)
);
alter table public.timer_teh enable row level security;

-- רק השרת (מפתח השירות) ניגש לטבלאות
alter table public.timer_rsvp enable row level security;
alter table public.timer_wall enable row level security;
notify pgrst, 'reload schema';

-- דף הזמנה בתשלום: רשימת נמענים לשליחת ההזמנה במייל
create table if not exists public.timer_recip (
  id bigserial primary key,
  slug text not null,
  name text,
  email text not null,
  token text,
  status text default 'new',   -- new / queued / sent / fail / unsub
  err text,
  sent_at timestamptz,
  created_at timestamptz default now(),
  unique (slug, email)
);
create index if not exists timer_recip_slug on public.timer_recip(slug, status);
create index if not exists timer_recip_token on public.timer_recip(token);
alter table public.timer_recip enable row level security;
notify pgrst, 'reload schema';
