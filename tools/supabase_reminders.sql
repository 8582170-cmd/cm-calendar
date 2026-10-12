-- תזכורות במייל מהלוח המקוון: להריץ פעם אחת ב-Supabase → SQL Editor → New query → Run (בטוח להריץ שוב)
create table if not exists public.reminders (
  id          bigint generated always as identity primary key,
  email       text not null,
  name        text not null,
  rule        jsonb not null,           -- {rec: heb/greg/monthly/once, d, m, date}
  notice      int[] not null default '{1}',  -- כמה ימים לפני לשלוח (0 = באותו יום)
  lang        text not null default 'he',
  status      text not null default 'pending',  -- pending / active / off
  token       text not null unique,
  last_sent   date,
  created_at  timestamptz not null default now()
);
create index if not exists reminders_email_idx on public.reminders(email);
create index if not exists reminders_status_idx on public.reminders(status);
alter table public.reminders enable row level security;

-- יומן שליחות (לספירה בדף הניהול)
create table if not exists public.email_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  provider    text,
  kind        text,
  ok          boolean
);
alter table public.email_log enable row level security;
