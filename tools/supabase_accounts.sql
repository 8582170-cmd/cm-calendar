-- חשבונות משתמשים: להריץ פעם אחת ב-Supabase → SQL Editor → New query → Run (בטוח להריץ שוב)

-- רכישות משויכות לחשבון
alter table public.orders add column if not exists user_id uuid;
create index if not exists orders_user_idx on public.orders(user_id);
create index if not exists orders_email_idx on public.orders(email);

-- אחסון הלוחות של המשתמשים: תיקייה לכל משתמש, פרטית
insert into storage.buckets (id, name, public) values ('calendars', 'calendars', false)
on conflict (id) do nothing;

drop policy if exists "own calendars read" on storage.objects;
drop policy if exists "own calendars insert" on storage.objects;
drop policy if exists "own calendars update" on storage.objects;
drop policy if exists "own calendars delete" on storage.objects;
create policy "own calendars read" on storage.objects for select to authenticated
  using (bucket_id = 'calendars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own calendars insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'calendars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own calendars update" on storage.objects for update to authenticated
  using (bucket_id = 'calendars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own calendars delete" on storage.objects for delete to authenticated
  using (bucket_id = 'calendars' and (storage.foldername(name))[1] = auth.uid()::text);
