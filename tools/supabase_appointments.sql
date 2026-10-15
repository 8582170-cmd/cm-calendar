-- פגישות ביומן האונליין (למשתמשים רשומים)
create table if not exists appointments (
  id bigserial primary key,
  user_id uuid not null,
  email text,
  date date not null,
  start_t text,
  end_t text,
  title text not null,
  place text,
  note text,
  color text,
  notify text not null default 'none',
  last_sent date,
  created_at timestamptz not null default now()
);
create index if not exists appointments_user_date on appointments (user_id, date);
create index if not exists appointments_notify on appointments (date) where notify <> 'none';
alter table appointments enable row level security;
