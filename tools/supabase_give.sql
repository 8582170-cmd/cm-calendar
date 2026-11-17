-- אתר התרמה (myluach.org/give): קמפיינים, קבוצות, נציגים ותרומות.
-- להריץ פעם אחת ב-Supabase → SQL Editor. בטוח להריץ שוב.

create table if not exists public.give_campaign (
  id bigserial primary key,
  slug text not null unique,          -- הכתובת: /give/<slug>
  user_id uuid,                       -- מי שפתח את הקמפיין
  email text,
  name text,
  status text default 'draft',        -- draft / open / closed
  cfg jsonb default '{}'::jsonb,      -- כל ההגדרות: יעד, זמנים, עיצוב, מאצ'ינג, סליקה, מה מופעל
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists give_campaign_user on public.give_campaign(user_id);

create table if not exists public.give_team (
  id bigserial primary key,
  campaign_id bigint not null references public.give_campaign(id) on delete cascade,
  name text not null,
  descr text,
  img text,
  goal numeric default 0,
  sort int default 0,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists give_team_c on public.give_team(campaign_id);

create table if not exists public.give_rep (
  id bigserial primary key,
  campaign_id bigint not null references public.give_campaign(id) on delete cascade,
  team_id bigint,
  code text not null,                 -- קוד הנציג (ספרות): לקישור האישי ולבחירה בטופס
  name text,
  phone text,
  email text,
  goal numeric default 0,
  img text,
  story text,                         -- הסיפור האישי בדף הנציג
  active boolean default true,
  created_at timestamptz default now(),
  unique (campaign_id, code)
);
create index if not exists give_rep_team on public.give_rep(team_id);

create table if not exists public.give_donation (
  id text primary key,                -- 'gv' + 22 תווים
  campaign_id bigint not null references public.give_campaign(id) on delete cascade,
  rep_id bigint,
  team_id bigint,
  amount numeric not null default 0,  -- סכום החיוב (בהוראת קבע: לחודש)
  months int default 1,               -- 1 = חד פעמי. יותר = הוראת קבע לכמה חודשים. 0 = הוראת קבע ללא הגבלה
  total numeric not null default 0,   -- כמה נספר ליעד
  status text default 'pending',      -- pending / paid / failed / refunded
  channel text default 'web',         -- web / offline
  method text,                        -- בתרומה ידנית: מזומן / צ'ק / העברה / אשראי
  name text,
  show_name text,                     -- השם שמוצג ברשימת התורמים
  anon boolean default false,
  dedic_type text,                    -- לעילוי נשמת / לרפואת / ...
  dedic_name text,
  message text,
  phone text, email text, city text,
  hidden boolean default false,       -- הוסתר מהרשימה הציבורית
  pinned boolean default false,       -- מוצמד לראש הרשימה
  txn text,
  callback jsonb,
  ip text, ip_geo text, ua text,
  created_at timestamptz default now(),
  paid_at timestamptz
);
create index if not exists give_donation_c on public.give_donation(campaign_id, status, created_at desc);
create index if not exists give_donation_rep on public.give_donation(rep_id);
create index if not exists give_donation_team on public.give_donation(team_id);

alter table public.give_campaign enable row level security;
alter table public.give_team enable row level security;
alter table public.give_rep enable row level security;
alter table public.give_donation enable row level security;

-- קוד אישי לנציג (4-6 ספרות): לכניסת נציגים בשלוחה הטלפונית
alter table public.give_rep add column if not exists pin text;
