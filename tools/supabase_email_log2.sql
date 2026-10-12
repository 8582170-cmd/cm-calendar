-- דוח מיילים מלא: למי נשלח, הנושא, והשגיאה אם נכשל. להריץ פעם אחת ב-Supabase → SQL Editor
alter table public.email_log add column if not exists to_email text;
alter table public.email_log add column if not exists subject  text;
alter table public.email_log add column if not exists error    text;
create index if not exists email_log_created_idx on public.email_log (created_at desc);
