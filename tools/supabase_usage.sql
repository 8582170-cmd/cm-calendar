-- מד גודל מסד הנתונים לדף הניהול (לא חובה). מריצים פעם אחת ב-Supabase: SQL Editor → Run
create or replace function public.myluach_db_size() returns bigint
language sql security definer set search_path = public
as $$ select pg_database_size(current_database()) $$;
revoke execute on function public.myluach_db_size() from public, anon, authenticated;
