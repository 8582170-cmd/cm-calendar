-- מאגר התמונות ללקוחות: דלי ציבורי בשם library (הרשימה עצמה נשמרת בטבלת settings, מפתח library)
insert into storage.buckets (id, name, public)
values ('library', 'library', true)
on conflict (id) do update set public = true;
