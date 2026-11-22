-- זימון תורים (myluach.org/book): עסקים, קבוצות משאבים, משאבים, שירותים, תוספות, שאלונים, לקוחות (CRM), תורים ורשימת המתנה.
-- להריץ פעם אחת ב-Supabase → SQL Editor. בטוח להריץ שוב.
-- ההרשאות: כל הגישה עוברת דרך השרת (מפתח השירות), ולכן RLS מופעל בלי מדיניות.

create extension if not exists btree_gist;

create table if not exists public.book_biz (
  id bigserial primary key,
  slug text not null unique,          -- הכתובת: /book/<slug>
  user_id uuid,                       -- הבעלים
  email text,
  name text,
  status text default 'draft',        -- draft / open / closed
  cfg jsonb default '{}'::jsonb,      -- שעות, חריגים, שבת, כללים, תקנון, תשלום, עיצוב, צוות
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists book_biz_user on public.book_biz(user_id);
create index if not exists book_biz_email on public.book_biz(email);

create table if not exists public.book_group (
  id bigserial primary key,
  biz_id bigint not null references public.book_biz(id) on delete cascade,
  name text not null,                 -- למשל: קומה 1
  descr text,
  img text,
  adj jsonb default '{}'::jsonb,      -- התאמת מחיר לקבוצה: {t:'pct'|'add'|'set', v}
  sort int default 0,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists book_group_biz on public.book_group(biz_id);

create table if not exists public.book_res (
  id bigserial primary key,
  biz_id bigint not null references public.book_biz(id) on delete cascade,
  group_id bigint,
  name text not null,                 -- חדר 1, ד"ר כהן, עמדה 3
  descr text,
  img text,
  cfg jsonb default '{}'::jsonb,      -- hours (עוקף את שעות העסק), adj (מחיר), blocks (חסימות), phone
  sort int default 0,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists book_res_biz on public.book_res(biz_id);

create table if not exists public.book_svc (
  id bigserial primary key,
  biz_id bigint not null references public.book_biz(id) on delete cascade,
  name text not null,
  descr text,
  img text,
  cfg jsonb default '{}'::jsonb,      -- משך, שינוי משך, הפסקות, מחיר, כללי מחיר, הקצאה, משאבים, תוספות, שאלון, מקדמה
  sort int default 0,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists book_svc_biz on public.book_svc(biz_id);

create table if not exists public.book_addon (
  id bigserial primary key,
  biz_id bigint not null references public.book_biz(id) on delete cascade,
  name text not null,
  descr text,
  img text,
  cfg jsonb default '{}'::jsonb,      -- price, per (fixed/unit), max, addMin, req, def
  sort int default 0,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists book_addon_biz on public.book_addon(biz_id);

create table if not exists public.book_form (
  id bigserial primary key,
  biz_id bigint not null references public.book_biz(id) on delete cascade,
  name text not null,
  fields jsonb default '[]'::jsonb,   -- [{id,type,label,help,req,opts,perm,sens}]
  created_at timestamptz default now()
);
create index if not exists book_form_biz on public.book_form(biz_id);

create table if not exists public.book_cust (
  id bigserial primary key,
  biz_id bigint not null references public.book_biz(id) on delete cascade,
  phone text not null,
  email text,
  name text,
  fields jsonb default '{}'::jsonb,   -- שדות קבועים בכרטיס: {id:{label,v,at}}
  tags text[] default '{}',
  note text,
  marketing boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (biz_id, phone)
);
create index if not exists book_cust_biz on public.book_cust(biz_id);

create table if not exists public.book_appt (
  id text primary key,                -- 'bk' + 18 תווים
  biz_id bigint not null references public.book_biz(id) on delete cascade,
  cust_id bigint,
  svc_id bigint,
  res_id bigint,
  group_id bigint,
  start_at timestamptz not null,
  end_at timestamptz not null,
  busy_start timestamptz not null,    -- כולל הפסקה לפני
  busy_end timestamptz not null,      -- כולל הפסקה אחרי
  status text default 'confirmed',    -- held (ממתין לתשלום, עם שעון) / pending (ממתין לאישור) / confirmed / done / cancelled / noshow / expired
  hold_until timestamptz,
  dur int,                            -- אורך התור בדקות
  price numeric default 0,
  detail jsonb,                       -- פירוט המחיר שהוצג ללקוח
  addons jsonb,                       -- [{id,name,n,amt}]
  answers jsonb,                      -- [{id,label,v}] בנוסח שהוצג
  consent jsonb,                      -- [{id,text,v,at,ip}]
  pay jsonb,                          -- {mode,due,paid,at,ref}
  source text default 'web',          -- web / phone / manual
  name text,
  phone text,
  email text,
  note text,
  token text,                         -- לקישור האישי של הלקוח
  remind jsonb,                       -- מה כבר נשלח: {d1:true}
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  -- מניעת כפל הזמנות במסד הנתונים: אותו משאב לא יכול להיות בשני תורים חופפים
  constraint book_appt_no_overlap exclude using gist (res_id with =, tstzrange(busy_start, busy_end) with &&) where (status in ('held','pending','confirmed'))
);
create index if not exists book_appt_biz_start on public.book_appt(biz_id, start_at);
create index if not exists book_appt_cust on public.book_appt(cust_id);
create index if not exists book_appt_phone on public.book_appt(biz_id, phone);

create table if not exists public.book_wait (
  id bigserial primary key,
  biz_id bigint not null references public.book_biz(id) on delete cascade,
  svc_id bigint,
  group_id bigint,
  day date not null,
  from_t text,
  to_t text,
  name text,
  phone text,
  email text,
  notified_at timestamptz,
  created_at timestamptz default now()
);
create index if not exists book_wait_biz_day on public.book_wait(biz_id, day);

alter table public.book_biz enable row level security;
alter table public.book_group enable row level security;
alter table public.book_res enable row level security;
alter table public.book_svc enable row level security;
alter table public.book_addon enable row level security;
alter table public.book_form enable row level security;
alter table public.book_cust enable row level security;
alter table public.book_appt enable row level security;
alter table public.book_wait enable row level security;
