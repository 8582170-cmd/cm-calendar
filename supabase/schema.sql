-- =========================================================
-- סכמת בסיס נתונים - מחולל לוחות שנה עבריים
-- הרץ קובץ זה ב-Supabase: SQL Editor -> New query -> הדבק -> Run
-- =========================================================

-- הרחבה ל-UUID
create extension if not exists "uuid-ossp";

-- ---------------------------------------------------------
-- טבלת פרופילים (מורחבת מעל auth.users המובנה של Supabase)
-- ---------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "המשתמש רואה ומעדכן רק את הפרופיל שלו"
  on public.profiles for all
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- טריגר: יצירת שורת פרופיל אוטומטית עם כל הרשמה חדשה
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------
-- טבלת לוחות שנה (כל משתמש יכול ליצור כמה לוחות)
-- ---------------------------------------------------------
create table public.calendars (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null default 'הלוח שלי',

  -- הגדרות בסיס
  calendar_type text not null default 'hebrew' check (calendar_type in ('hebrew', 'gregorian')),
  year_gregorian int,           -- שנה לועזית מתחילה, אם רלוונטי
  year_hebrew int,               -- שנה עברית (למשל 5787), אם רלוונטי
  view_mode text not null default 'monthly' check (view_mode in ('yearly','monthly','weekly')),
  show_secondary_date boolean not null default true, -- false = לוח טהור (למשל לועזי בלבד, בלי תאריך עברי כלל)
  language text not null default 'he' check (language in ('he','en')),
  print_size text not null default 'A4' check (print_size in ('A4','A3','A5','Letter')),

  -- עיצוב
  design_theme text not null default 'classic',
  color_primary text not null default '#1f3a5f',
  color_secondary text not null default '#c9a24b',

  -- זמני הלכה
  zmanim_enabled boolean not null default false,
  zmanim_method text default 'gra', -- gra / mga / chazon_shamayim / baal_hatanya ...
  zmanim_city text,
  zmanim_lat numeric,
  zmanim_lng numeric,
  zmanim_display jsonb default '[]'::jsonb, -- מערך מזהי זמנים שנבחרו להצגה

  -- סדרי לימוד
  torah_study_cycles jsonb default '[]'::jsonb, -- למשל ["daf_yomi","mishna_yomit"]

  -- יארצייטים
  show_tzadikim_yahrzeits boolean not null default false,

  -- סטטוס תשלום
  is_paid boolean not null default false,
  paid_at timestamptz,

  -- תמונות דף הבית של הלוח
  cover_images jsonb default '[]'::jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendars enable row level security;

create policy "המשתמש מנהל רק את הלוחות שלו"
  on public.calendars for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- טבלת אירועים אישיים (עם תמיכה בחזרה עברית/לועזית)
-- ---------------------------------------------------------
create table public.calendar_events (
  id uuid primary key default uuid_generate_v4(),
  calendar_id uuid not null references public.calendars(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  description text,

  -- תאריך הבסיס של האירוע
  is_hebrew_date boolean not null default false,
  date_gregorian date,           -- אם is_hebrew_date = false
  hebrew_day int,                 -- אם is_hebrew_date = true (1-30)
  hebrew_month text,              -- למשל 'Nisan','Kislev' (שמות @hebcal/core)
  hebrew_year int,                -- שנה עברית מקורית של האירוע (לחישוב "שנה X" בעתיד, אופציונלי)

  -- חוקי חזרה
  recurrence text not null default 'once' check (recurrence in ('once','daily','weekly','monthly','yearly')),
  recurrence_until date,          -- עד מתי לחזור (null = לתמיד)

  event_color text,
  event_icon text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.calendar_events enable row level security;

create policy "המשתמש מנהל רק את האירועים שלו"
  on public.calendar_events for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- תמונות המקושרות לאירועים (Storage bucket יוגדר בנפרד)
-- ---------------------------------------------------------
create table public.event_images (
  id uuid primary key default uuid_generate_v4(),
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null,     -- נתיב בתוך ה-bucket
  created_at timestamptz not null default now()
);

alter table public.event_images enable row level security;

create policy "המשתמש מנהל רק תמונות של האירועים שלו"
  on public.event_images for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------
-- רשימת יארצייטים של צדיקים (מנוהלת ע"י אדמין בלבד, קריאה לכולם)
-- ---------------------------------------------------------
create table public.tzadikim_yahrzeits (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  hebrew_day int not null,
  hebrew_month text not null,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.tzadikim_yahrzeits enable row level security;

create policy "כולם יכולים לקרוא את רשימת הצדיקים"
  on public.tzadikim_yahrzeits for select
  using (true);

-- הערה: הכנסה/עדכון/מחיקה בטבלה זו תתבצע רק דרך ה-Dashboard של Supabase
-- או service_role key (לא מהלקוח), כדי שרק אתה תוכל לערוך את הרשימה.

-- ---------------------------------------------------------
-- טבלת תשלומים (רישום כל עסקה שמגיעה מ-Webhook של ספק הסליקה)
-- ---------------------------------------------------------
create table public.payments (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  calendar_id uuid references public.calendars(id) on delete set null,
  provider text not null default 'grow',
  provider_transaction_id text,
  amount numeric not null,
  currency text not null default 'ILS',
  status text not null default 'pending' check (status in ('pending','success','failed')),
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

alter table public.payments enable row level security;

create policy "המשתמש רואה רק את התשלומים שלו"
  on public.payments for select
  using (auth.uid() = user_id);

-- אין policy ל-insert/update מהלקוח: רק שרת (service_role key בתוך
-- ה-Webhook Function) יכול לכתוב לטבלה הזו. זה מונע מהלקוח "לזייף" תשלום.

-- ---------------------------------------------------------
-- אינדקסים לביצועים
-- ---------------------------------------------------------
create index idx_calendars_user on public.calendars(user_id);
create index idx_events_calendar on public.calendar_events(calendar_id);
create index idx_events_user on public.calendar_events(user_id);
create index idx_payments_user on public.payments(user_id);
