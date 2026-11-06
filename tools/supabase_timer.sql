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

-- שדרוג דף ההזמנה (נובמבר 2026): קבוצות, מספר מוזמנים, טלפון, קישור אישי לאישור הגעה, תזכורות אוטומטיות, שאלות נוספות, מתנות באשראי
alter table public.timer_recip add column if not exists grp text, add column if not exists cnt int, add column if not exists phone text,
  add column if not exists nr_at timestamptz, add column if not exists dr_at timestamptz, add column if not exists ty_at timestamptz, add column if not exists sms_at timestamptz, add column if not exists sms_err text;
alter table public.timer_rsvp add column if not exists rtok text, add column if not exists ans jsonb, add column if not exists seat text;
create index if not exists timer_rsvp_rtok on public.timer_rsvp(slug, rtok);
create table if not exists public.timer_gift (
  id bigserial primary key,
  slug text not null,
  order_id text unique,
  name text,
  msg text,
  amount numeric,     -- מה שהאורח שילם
  fee numeric,        -- העמלה שנשארת באתר
  net numeric,        -- מה שמגיע לבעל האירוע
  status text default 'pending',   -- pending / paid / failed
  payout text default 'open',      -- open / requested / done
  ip text, ip_geo text, ua text,
  created_at timestamptz default now(),
  paid_at timestamptz
);
create index if not exists timer_gift_slug on public.timer_gift(slug, status);
alter table public.timer_gift enable row level security;
notify pgrst, 'reload schema';

-- מעקב פתיחה של הקישור האישי
alter table public.timer_recip add column if not exists opened_at timestamptz, add column if not exists last_open timestamptz, add column if not exists opens int default 0;
notify pgrst, 'reload schema';

-- הודעות קוליות (ימות המשיח): סטטוס שיחה לכל מוזמן
alter table public.timer_recip add column if not exists call_at timestamptz, add column if not exists call_st text, add column if not exists call_cid text, add column if not exists call_rem int;
create index if not exists timer_recip_phone on public.timer_recip (phone);
notify pgrst, 'reload schema';

-- אינדקס האירועים לדף ניהול האירועים (admin-events.html). מתעדכן בכל שמירה; כפתור "סריקה" בונה אותו מחדש
create table if not exists public.timer_event (
  slug text primary key, title text, date date, kind text, lang text, plan text, email text,
  emails int default 0, sms int default 0, calls int default 0, calls_used int default 0,
  disabled boolean default false, created_at timestamptz default now(), updated_at timestamptz default now());
create index if not exists timer_event_date on public.timer_event (date);
alter table public.timer_event enable row level security;
notify pgrst, 'reload schema';
