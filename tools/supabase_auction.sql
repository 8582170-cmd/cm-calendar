-- מכירה סינית (myluach.org/auction): מכירות, מוצרים, חבילות, מגייסים, לקוחות, הזמנות, כרטיסים והגרלות.
-- להריץ פעם אחת ב-Supabase → SQL Editor. בטוח להריץ שוב.

create table if not exists public.auction_sale (
  id bigserial primary key,
  slug text not null unique,          -- הכתובת: /auction/<slug>
  user_id uuid,                       -- מנהל המכירה (החשבון באתר)
  email text,
  name text,                          -- שם הארגון / המכירה
  status text default 'draft',        -- draft / open / closed
  cfg jsonb default '{}'::jsonb,      -- כל ההגדרות: סליקה (מוסד), קוד נציג, יעד, מועדים, מה מוצג בדף ההתקדמות
  next_serial int default 1,          -- המספר הסידורי הבא לכרטיס
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists auction_sale_user on public.auction_sale(user_id);

create table if not exists public.auction_product (
  id bigserial primary key,
  sale_id bigint not null references public.auction_sale(id) on delete cascade,
  num int not null,                   -- מק"ט: המספר שמקישים בטלפון ומופיע בקטלוג
  name text not null,
  descr text,
  price numeric not null default 0,   -- מחיר כרטיס
  draws int not null default 1,       -- מספר הגרלות למוצר
  img text,
  audio text,                         -- קובץ שמע שמושמע בטלפון
  cfg jsonb default '{}'::jsonb,      -- maxPer, repeatWin, reserves
  sort int default 0,
  active boolean default true,
  created_at timestamptz default now(),
  unique (sale_id, num)
);

create table if not exists public.auction_pkg (
  id bigserial primary key,
  sale_id bigint not null references public.auction_sale(id) on delete cascade,
  name text not null,
  descr text,
  kind text not null,                 -- free = כרטיסים לחלוקה חופשית / fixed = הרכב קבוע / credit = לפי שווי
  price numeric not null default 0,
  qty int default 0,                  -- free: כמה כרטיסים
  credit numeric default 0,           -- credit: שווי לניצול
  products jsonb,                     -- על אילו מוצרים חל (רשימת מזהים). ריק = כל המוצרים
  comp jsonb,                         -- fixed: ההרכב [{p, n}]. ריק = כרטיס אחד בכל מוצר
  cfg jsonb default '{}'::jsonb,      -- until, maxPer, key (ההקשה בטלפון)
  sort int default 0,
  active boolean default true,
  created_at timestamptz default now()
);
create index if not exists auction_pkg_sale on public.auction_pkg(sale_id);

create table if not exists public.auction_rep (
  id bigserial primary key,
  sale_id bigint not null references public.auction_sale(id) on delete cascade,
  code text not null,                 -- קוד הנציג (ספרות), להקשה באתר ובטלפון ולקישור האישי
  name text,
  phone text,
  email text,
  grp text,                           -- קבוצה
  goal numeric default 0,
  token text,                         -- לדף האישי של המגייס
  active boolean default true,
  created_at timestamptz default now(),
  unique (sale_id, code)
);

create table if not exists public.auction_customer (
  id bigserial primary key,
  sale_id bigint not null references public.auction_sale(id) on delete cascade,
  name text,
  phone text,
  email text,
  city text,
  addr text,
  note text,
  tags jsonb default '[]'::jsonb,
  ip text, ip_geo text, ua text,
  created_at timestamptz default now()
);
create index if not exists auction_customer_phone on public.auction_customer(sale_id, phone);
create index if not exists auction_customer_email on public.auction_customer(sale_id, email);

create table if not exists public.auction_order (
  id text primary key,                -- 'au' + 22 תווים
  sale_id bigint not null references public.auction_sale(id) on delete cascade,
  customer_id bigint,
  rep_id bigint,
  rep_src text,                       -- link / code / line
  channel text default 'web',         -- web / phone / manual
  pkg_id bigint,
  items jsonb default '[]'::jsonb,    -- מה נבחר: [{p, n}]
  lines jsonb default '[]'::jsonb,    -- החישוב: [{p, n, pkg}] (pkg = כמה מהם מהחבילה)
  pkg_left jsonb,                     -- מה נשאר לא מנוצל בחבילה
  amount numeric not null default 0,
  status text default 'pending',      -- pending / paid / failed / refunded
  txn text,
  callback jsonb,
  name text, phone text, email text,
  ip text, ip_geo text, ua text,
  created_at timestamptz default now(),
  paid_at timestamptz
);
create index if not exists auction_order_sale on public.auction_order(sale_id, created_at desc);
create index if not exists auction_order_rep on public.auction_order(rep_id);

create table if not exists public.auction_ticket (
  id bigserial primary key,
  sale_id bigint not null references public.auction_sale(id) on delete cascade,
  serial int not null,                -- המספר הסידורי של הכרטיס במכירה
  product_id bigint not null,
  order_id text not null,
  customer_id bigint,
  pkg boolean default false,          -- הכרטיס הגיע מחבילה
  void boolean default false,         -- בוטל (זיכוי)
  created_at timestamptz default now(),
  unique (sale_id, serial)
);
create index if not exists auction_ticket_product on public.auction_ticket(product_id);
create index if not exists auction_ticket_order on public.auction_ticket(order_id);

create table if not exists public.auction_draw (
  id bigserial primary key,
  sale_id bigint not null references public.auction_sale(id) on delete cascade,
  product_id bigint not null,
  round int not null,                 -- הגרלה מספר (1, 2, 3) במוצר
  kind text default 'win',            -- win / reserve
  ticket_id bigint not null,
  serial int not null,
  customer_id bigint,
  pool int not null,                  -- כמה כרטיסים השתתפו בהגרלה הזאת
  pool_hash text not null,            -- טביעת אצבע של רשימת הכרטיסים שהשתתפו
  shuffles int not null default 3,
  by_email text,
  created_at timestamptz default now()
);
create index if not exists auction_draw_product on public.auction_draw(product_id, round);
-- הגרלה אחת לכל סיבוב במוצר: גם אם שני מנהלים לוחצים באותו רגע, רק אחת נשמרת
create unique index if not exists auction_draw_once on public.auction_draw(product_id, round) where kind = 'win';

-- הקצאת מספרים סידוריים לכרטיסים, בלי כפילויות גם כשכמה רכישות מגיעות יחד. מחזיר את המספר הראשון
create or replace function public.auction_serials(p_sale bigint, p_n int) returns int
language sql as $$
  update public.auction_sale set next_serial = next_serial + p_n where id = p_sale returning next_serial - p_n;
$$;

-- הטבלאות נגישות רק לשרת (service role)
alter table public.auction_sale enable row level security;
alter table public.auction_product enable row level security;
alter table public.auction_pkg enable row level security;
alter table public.auction_rep enable row level security;
alter table public.auction_customer enable row level security;
alter table public.auction_order enable row level security;
alter table public.auction_ticket enable row level security;
alter table public.auction_draw enable row level security;
