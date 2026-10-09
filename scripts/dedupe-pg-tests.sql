-- ============================================================
-- dedupe-pg-tests.sql — 0014 (V2) давхардлын хамгаалалтын БОДИТ тест
--
-- ⚠️ Энэ файлыг ШУУД ажиллуулахгүй — `npm run test:dedupe:pg` нь
--    түр PostgreSQL 16 кластер үүсгэж, хамгийн бага схемийг (auth.users,
--    public.profiles, public.listings) үүсгээд, 0014-ийг ажиллуулаад
--    дараа нь ЭНЭ файлыг гүйцэтгэнэ.
--
-- Хүлээлт: `_t_results` хүснэгтэд БҮХ мөр `ok = true` байх.
-- ============================================================

-- ---------- Туслах: нэг тестийг гүйцэтгэж үр дүнг бүртгэх ----------
create table if not exists public._t_results (
  n      serial primary key,
  ok     boolean not null,
  name   text    not null,
  detail text
);

create or replace function public._expect(p_name text, p_sql text, p_want text)
returns void
language plpgsql
as $$
declare
  r  text;
  ok boolean;
begin
  begin
    execute p_sql;
    r := 'OK';
  exception when others then
    r := 'ERR: ' || SQLERRM;
  end;

  if p_want = 'OK' then
    ok := (r = 'OK');
  else
    ok := (r like 'ERR:%' and r ilike '%' || p_want || '%');
  end if;

  insert into public._t_results (ok, name, detail) values (ok, p_name, r);
end $$;

-- Дараагийн шинэ зар cooldown-д орохгүйн тулд бүх зарыг хөгшрүүлнэ
-- ---------- Туслах: шууд boolean шалгалт бүртгэх ----------
create or replace function public._assert(p_name text, p_ok boolean, p_detail text default '')
returns void
language plpgsql
as $$
begin
  insert into public._t_results (ok, name, detail)
  values (coalesce(p_ok, false), p_name, p_detail);
end $$;

-- ---------- Хэрэглэгчид (auth.users) ----------
insert into auth.users (id, email, raw_app_meta_data) values
  ('00000000-0000-0000-0000-000000000001', 'u1@x',  '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000002', 'u2@x',  '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000003', 'u3@x',  '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000004', 'u4@x',  '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000005', 'u5@x',  '{"listing_daily_limit": 50}'::jsonb),
  ('00000000-0000-0000-0000-000000000006', 'u6@x',  '{"listing_daily_limit": 0}'::jsonb),
  ('00000000-0000-0000-0000-000000000007', 'u7@x',  '{"listing_daily_limit": "abc"}'::jsonb),
  ('00000000-0000-0000-0000-000000000008', 'u8@x',  '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000009', 'u9@x',  '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000010', 'u10@x', '{}'::jsonb),
  ('00000000-0000-0000-0000-000000000011', 'u11@x', '{}'::jsonb);
insert into public.profiles (id, name) select id, 't' from auth.users;

-- ════════════════════════════════════════════════════════════
-- ДҮРЭМ 1 — ижил бүртгэл + ижил түлхүүр (30 хоног)
-- ════════════════════════════════════════════════════════════
select public._expect('T1 эхний зар орох', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, khoroo, rooms, area, floor, price, attrs)
  values ('00000000-0000-0000-0000-000000000001','real-estate','Орон сууц','sell','Улаанбаатар','Хан-Уул','23-р хороо',3,70,13,245000000,'{"negotiable":"yes"}')
$q$, 'OK');

select public._expect('T2 ижил зар + үнэ өөр → ХОРИГЛОГДОХ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, khoroo, rooms, area, floor, price, attrs)
  values ('00000000-0000-0000-0000-000000000001','real-estate','Орон сууц','sell','Улаанбаатар','Хан-Уул','23-р хороо',3,70,13,250000000,'{"negotiable":"yes"}')
$q$, 'Ижил зар');

select public._expect('T3 ижил зар + ӨӨР хэрэглэгч (broker) → АМЖИЛТ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, khoroo, rooms, area, floor, price, attrs)
  values ('00000000-0000-0000-0000-000000000002','real-estate','Орон сууц','sell','Улаанбаатар','Хан-Уул','23-р хороо',3,70,13,245000000,'{"negotiable":"yes"}')
$q$, 'OK');

select public._expect('T4 зөвхөн ҮНЭ засах → АМЖИЛТ', $q$
  update public.listings set price = price + 1, attrs = '{"negotiable":"no"}'::jsonb
   where user_id = '00000000-0000-0000-0000-000000000001'
$q$, 'OK');


select public._expect('T5 category зарах→түрээслэх → АМЖИЛТ (V2 шинэ)', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, khoroo, rooms, area, floor, price)
  values ('00000000-0000-0000-0000-000000000001','real-estate','Орон сууц','rent','Улаанбаатар','Хан-Уул','23-р хороо',3,70,13,3000000)
$q$, 'OK');

select public._expect('T6 давхар (floor) өөр → АМЖИЛТ (V2 шинэ)', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, khoroo, rooms, area, floor, price)
  values ('00000000-0000-0000-0000-000000000001','real-estate','Орон сууц','sell','Улаанбаатар','Хан-Уул','23-р хороо',3,70,14,245000000)
$q$, 'OK');

-- Нэмэлт тестийн хэрэглэгчид (u12…u15)
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000012', 'u12@x'),
  ('00000000-0000-0000-0000-000000000013', 'u13@x'),
  ('00000000-0000-0000-0000-000000000014', 'u14@x'),
  ('00000000-0000-0000-0000-000000000015', 'u15@x');
insert into public.profiles (id, name)
select u.id, 't' from auth.users u
 where not exists (select 1 from public.profiles p where p.id = u.id);


select public._expect('T7 ижил нэртэй дэд төрөл (Бусад) ӨӨР хэсэгт → АМЖИЛТ (V2 шинэ)', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price, attrs)
  values ('00000000-0000-0000-0000-000000000011','services','Бусад','sell','Улаанбаатар','Сүхбаатар',0,0,50000,'{"condition":"Шинэ"}')
$q$, 'OK');

select public._expect('T7b мөн утгатай electric/Бусад → АМЖИЛТ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price, attrs)
  values ('00000000-0000-0000-0000-000000000011','electric','Бусад','sell','Улаанбаатар','Сүхбаатар',0,0,50000,'{"condition":"Шинэ"}')
$q$, 'OK');

select public._assert('T7c тэдгээрийн түлхүүр ЯЛГААТАЙ (section түлхүүрт орсон)',
  (select count(distinct dedupe_key) = 2 from public.listings
    where user_id = '00000000-0000-0000-0000-000000000011'),
  (select string_agg(dedupe_key, ' // ') from public.listings
    where user_id = '00000000-0000-0000-0000-000000000011'));

-- ════════════════════════════════════════════════════════════
-- БАРАА — attrs нь таних тэмдэг (rooms/area нь үргэлж 0 тул)
-- ════════════════════════════════════════════════════════════

select public._expect('T8 бараа: ШИНЭВТЭР буйдан → АМЖИЛТ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, price, attrs)
  values ('00000000-0000-0000-0000-000000000012','furniture','Буйдан, кресло','sell','Улаанбаатар','Баянгол',250000,'{"condition":"Шинэвтэр","sofaBed":"Тийм","negotiable":"yes"}')
$q$, 'OK');

select public._expect('T8b бараа: ХУУЧИН буйдан (өөр attrs) → АМЖИЛТ (V2 шинэ)', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, price, attrs)
  values ('00000000-0000-0000-0000-000000000012','furniture','Буйдан, кресло','sell','Улаанбаатар','Баянгол',150000,'{"condition":"Хуучин","negotiable":"yes"}')
$q$, 'OK');

select public._assert('T8c 2 буйданы түлхүүр ЯЛГААТАЙ',
  (select count(distinct dedupe_key) = 2 from public.listings
    where user_id = '00000000-0000-0000-0000-000000000012'));

select public._expect('T8d бараа: ИЖИЛ attrs-тай дахин → ХОРИГЛОГДОХ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, price, attrs)
  values ('00000000-0000-0000-0000-000000000012','furniture','Буйдан, кресло','sell','Улаанбаатар','Баянгол',99000,'{"condition":"Хуучин","negotiable":"no"}')
$q$, 'Ижил зар');


select public._expect('T9 negotiable түлхүүрт ОРОХГҮЙ (1-р зар)', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, price, attrs)
  values ('00000000-0000-0000-0000-000000000013','computers','Notebook','sell','Улаанбаатар','Баянзүрх',1200000,'{"brand":"Lenovo","negotiable":"yes"}')
$q$, 'OK');

select public._expect('T9b зөвхөн negotiable=no → ХОРИГЛОГДОХ (түлхүүр ижил)', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, price, attrs)
  values ('00000000-0000-0000-0000-000000000013','computers','Notebook','sell','Улаанбаатар','Баянзүрх',1200000,'{"brand":"Lenovo","negotiable":"no"}')
$q$, 'Ижил зар');

-- ════════════════════════════════════════════════════════════
-- ДҮРЭМ 4 — COOLDOWN 60 сек
-- ⚠️ Бусад тестийн `created_at` нь 5 минутын өмнөх (cooldown саад болохгүй)
--    ⇒ энд ЗОРИУДАА `created_at = now()` гэж бичнэ ✓
-- ════════════════════════════════════════════════════════════
select public._expect('T10 cooldown: 1-р зар → АМЖИЛТ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price, created_at)
  values ('00000000-0000-0000-0000-000000000003','real-estate','Газар','sell','Улаанбаатар','Налайх',0,500,90000000, now())
$q$, 'OK');

select public._expect('T10b cooldown: ШУУД дараагийн шинэ зар → ХОРИГЛОГДОХ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price, created_at)
  values ('00000000-0000-0000-0000-000000000003','real-estate','Газар','rent','Улаанбаатар','Налайх',0,600,900000, now())
$q$, 'Хэт хурдан');

-- ════════════════════════════════════════════════════════════
-- ДҮРЭМ 3 — өдрийн лимит (`app_metadata.listing_daily_limit`)
-- ════════════════════════════════════════════════════════════
select public._expect('T11 лимит 3 (анхдагч): 1-р зар', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000004','real-estate','Газар','sell','Улаанбаатар','Налайх',0,61,1)
$q$, 'OK');
select public._expect('T11b лимит 3: 2-р зар', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000004','real-estate','Газар','sell','Улаанбаатар','Налайх',0,62,2)
$q$, 'OK');
select public._expect('T11c лимит 3: 3-р зар', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000004','real-estate','Газар','sell','Улаанбаатар','Налайх',0,63,3)
$q$, 'OK');
select public._expect('T11d лимит 3: 4-р зар → ХОРИГЛОГДОХ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000004','real-estate','Газар','sell','Улаанбаатар','Налайх',0,64,4)
$q$, 'зарын хязгаар');

select public._expect('T12 АГЕНТ (лимит 50): 1-р зар', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000005','real-estate','Орон сууц','sell','Улаанбаатар','Хан-Уул',0,71,1)
$q$, 'OK');
select public._expect('T12b АГЕНТ: 2-р зар', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000005','real-estate','Орон сууц','sell','Улаанбаатар','Хан-Уул',0,72,2)
$q$, 'OK');
select public._expect('T12c АГЕНТ: 3-р зар (анхдагч лимит ХАДСАН) → АМЖИЛТ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000005','real-estate','Орон сууц','sell','Улаанбаатар','Хан-Уул',0,73,3)
$q$, 'OK');
select public._expect('T12d АГЕНТ: 4-р зар ч АМЖИЛТ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000005','real-estate','Орон сууц','sell','Улаанбаатар','Хан-Уул',0,74,4)
$q$, 'OK');

select public._expect('T13 лимит 0 = ХЯЗГААРГҮЙ: 1-р зар', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000006','real-estate','Газар','sell','Улаанбаатар','Налайх',0,81,1)
$q$, 'OK');
select public._expect('T13b лимит 0: 3-р зар ч АМЖИЛТ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000006','real-estate','Газар','sell','Улаанбаатар','Налайх',0,83,3)
$q$, 'OK');
select public._expect('T13c лимит 0: 4-р зар ч АМЖИЛТ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000006','real-estate','Газар','sell','Улаанбаатар','Налайх',0,84,4)
$q$, 'OK');

select public._expect('T14 лимит буруу утга (abc) → анхдагч 3: 1-р зар', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000007','real-estate','Газар','sell','Улаанбаатар','Налайх',0,91,1)
$q$, 'OK');
select public._expect('T14b буруу утга: 2-р зар', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000007','real-estate','Газар','sell','Улаанбаатар','Налайх',0,92,2)
$q$, 'OK');
select public._expect('T14c буруу утга: 3-р зар', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000007','real-estate','Газар','sell','Улаанбаатар','Налайх',0,93,3)
$q$, 'OK');
select public._expect('T14d буруу утга: 4-р зар → ХОРИГЛОГДОХ (анхдагч 3)', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000007','real-estate','Газар','sell','Улаанбаатар','Налайх',0,94,4)
$q$, 'зарын хязгаар');

-- ════════════════════════════════════════════════════════════
-- ДҮРЭМ 2 — tombstone (устгаад дахин оруулах)
-- ════════════════════════════════════════════════════════════
select public._expect('T15 зар оруулах (tombstone тест)', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, khoroo, rooms, area, floor, price)
  values ('00000000-0000-0000-0000-000000000008','real-estate','Орон сууц','sell','Улаанбаатар','Хан-Уул','23-р хороо',2,55,5,180000000)
$q$, 'OK');
select public._expect('T15b уг зарыг УСТГАХ', $q$
  delete from public.listings where user_id = '00000000-0000-0000-0000-000000000008'
$q$, 'OK');
select public._assert('T15c устгасан зар listing_history-д бичигдсэн',
  (select count(*) >= 1 from public.listing_history
    where user_id = '00000000-0000-0000-0000-000000000008'));
select public._expect('T15d устгасны дараа ижил зар (ШИНЭ id) → ХОРИГЛОГДОХ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, khoroo, rooms, area, floor, price)
  values ('00000000-0000-0000-0000-000000000008','real-estate','Орон сууц','sell','Улаанбаатар','Хан-Уул','23-р хороо',2,55,5,175000000)
$q$, 'саяхан устгасан');

-- ════════════════════════════════════════════════════════════
-- ЗАСВАРЫН FALLBACK — DELETE + INSERT (МӨН id) → АМЖИЛТ
-- ════════════════════════════════════════════════════════════
select public._expect('T16 fallback: зар оруулах', $q$
  insert into public.listings (id, user_id, section, property_type, category, city, district, rooms, area, price)
  values ('44444444-4444-4444-4444-444444444444','00000000-0000-0000-0000-000000000009','real-estate','Орон сууц','sell','Улаанбаатар','Сүхбаатар',2,60,7)
$q$, 'OK');
select public._expect('T16b fallback: зар УСТГАХ (1-р алхам)', $q$
  delete from public.listings where id = '44444444-4444-4444-4444-444444444444'
$q$, 'OK');
select public._expect('T16c МӨН id-гаар ШУУД буцааж оруулах → АМЖИЛТ (зар алга болохгүй, cooldown ч хамаарахгүй)', $q$
  insert into public.listings (id, user_id, section, property_type, category, city, district, rooms, area, price)
  values ('44444444-4444-4444-4444-444444444444','00000000-0000-0000-0000-000000000009','real-estate','Орон сууц','sell','Улаанбаатар','Сүхбаатар',2,60,8)
$q$, 'OK');

-- ════════════════════════════════════════════════════════════
-- 30 ХОНОГИЙН ЦОНХ
-- ════════════════════════════════════════════════════════════
select public._expect('T17 30 хоногийн цонх: зар оруулах', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000012','real-estate','Газар','sell','Улаанбаатар','Налайх',0,101,1)
$q$, 'OK');
select public._expect('T17b зар нь 40 хоногийн ӨМНӨХ болов', $q$
  update public.listings set created_at = now() - interval '40 days'
   where user_id = '00000000-0000-0000-0000-000000000012'
$q$, 'OK');
select public._expect('T17c 30 хоногийн дараа ижил зар → АМЖИЛТ', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('00000000-0000-0000-0000-000000000012','real-estate','Газар','sell','Улаанбаатар','Налайх',0,101,2)
$q$, 'OK');

-- ════════════════════════════════════════════════════════════
-- 🩺 dedupe_status() — триггерийн БОДИТ төлөв
-- ════════════════════════════════════════════════════════════
select public._assert('T18 dedupe_status(): триггер асаалттай',
  (public.dedupe_status() ->> 'trigger_enabled')::boolean, public.dedupe_status()::text);
select public._expect('T18b триггерийг ТҮР хаах (seed-ийн хэв)', $q$
  alter table public.listings disable trigger listings_prevent_duplicate
$q$, 'OK');
select public._assert('T18c унтарсан үед FALSE гэж ЧАНГААР хэлнэ (чимээгүй алдааг барина)',
  (public.dedupe_status() ->> 'trigger_enabled')::boolean is false, public.dedupe_status()::text);
select public._expect('T18d буцааж асаах', $q$
  alter table public.listings enable trigger listings_prevent_duplicate
$q$, 'OK');
select public._assert('T18e дахин асаалттай',
  (public.dedupe_status() ->> 'trigger_enabled')::boolean, public.dedupe_status()::text);
select public._assert('T18f устгалын триггер ч асаалттай',
  (public.dedupe_status() ->> 'history_trigger_enabled')::boolean, public.dedupe_status()::text);

-- ════════════════════════════════════════════════════════════
-- ТҮЛХҮҮРИЙН ХЭЛБЭР ба бусад
-- ════════════════════════════════════════════════════════════
select public._assert('T19 үл хөдлөхийн түлхүүр яг тодорхой хэлбэртэй',
  (select dedupe_key = 'real-estate|Орон сууц|sell|Улаанбаатар|Хан-Уул|23-р хороо||3|70|14'
     from public.listings
    where user_id = '00000000-0000-0000-0000-000000000001' and floor = 14 limit 1),
  (select dedupe_key from public.listings
    where user_id = '00000000-0000-0000-0000-000000000001' and floor = 14 limit 1));

select public._assert('T19b барааны түлхүүрт attrs орсон (negotiable ХАСАГДСАН)',
  (select dedupe_key like '%"brand"%' and dedupe_key not like '%negotiable%'
     from public.listings where user_id = '00000000-0000-0000-0000-000000000013' limit 1),
  (select dedupe_key from public.listings where user_id = '00000000-0000-0000-0000-000000000013' limit 1));

select public._assert('T20 listing_dedupe_key нь IMMUTABLE',
  (select provolatile = 'i' from pg_proc where proname = 'listing_dedupe_key'),
  (select provolatile from pg_proc where proname = 'listing_dedupe_key'));

select public._expect('T21 auth.users-д мөргүй хэрэглэгч → анхдагч лимитээр', $q$
  insert into public.listings (user_id, section, property_type, category, city, district, rooms, area, price)
  values ('aaaaaaaa-0000-0000-0000-000000000001','real-estate','Газар','sell','Улаанбаатар','Налайх',0,99,9)
$q$, 'OK');

-- ════════════════════════════════════════════════════════════
-- ДҮГНЭЛТ (runner нь энэ хоёр query-г уншина)
-- ════════════════════════════════════════════════════════════
select n, case when ok then 'PASS' else 'FAIL' end as res, name, detail
  from public._t_results order by n;
select count(*) as total, count(*) filter (where ok) as passed,
       count(*) filter (where not ok) as failed
  from public._t_results;
