-- ============================================================
-- 0014_listing_dedupe.sql — ЗАРЫН ДАВХАРДЛЫН хамгаалалт (SPAM)
-- ============================================================
-- 🎯 ЗОРИЛГО:
--   • Нэг хэрэглэгч НЭГ ЗАРАА давтан оруулахыг ХОРИГЛОНО.
--   • ГЭХДЭЭ нэг зарыг 2 ба түүнээс олон хүн (ж: хэд хэдэн broker нэг
--     байрыг зарна) оруулж БОЛНО — тэдний бүртгэл өөр тул хориглохгүй.
--
-- 🧠 ХЭРХЭН АЖИЛЛАДАГ ВЭ:
--   • `dedupe_key` — зарын «таних тэмдэг»:
--         төрөл | хот | дүүрэг | хороо | хаяг | өрөө | талбай
--     ⚠️ ҮНЭ / ТАЙЛБАР / ЗУРАГ / ХОЛБОО БАРИХ УТАС ОРОХГҮЙ — тэдгээрийг
--        бага зэрэг өөрчлөөд хамгаалалтыг тойрох боломжгүй байх ёстой.
--   • Шалгалт нь `user_id`-ээр (БҮРТГЭЛ) хийгдэнэ — талбарын `phone`-оор БИШ!
--     Учир нь «НЭГ УТАС = НЭГ БҮРТГЭЛ» нь аль хэдийн баталгаажсан:
--     `lib/phoneEmail.js → phoneToEmail()` нь утсаас ДОТООД имэйл
--     (`976XXXXXXXX@phone.zarmn.mn`) үүсгэдэг ба `auth.users.email` нь unique
--     тул нэг утсаар 2 дахь бүртгэл НЭЭГДЭХГҮЙ.
--     ⚠️ Харин талбарын `phone`-оор шалгавал 2 broker нэг байрыг ЭЗНИЙ
--        утасны дугаараар оруулахад 2 дахь нь БУРУУ хориглогдоно.
--   • 30 ХОНОГИЙН цонх — 30 хоногийн дараа ижил зарыг дахин оруулж болно.
--   • УСТГАСАН заруудыг `listing_history`-д бүртгэнэ → «устгаад дахин
--     оруулах» гэсэн тойрог зам МӨН хаалттай.
--   • Нэмэлт SPAM хязгаар: 24 цагт 3 зар (зөвхөн ШИНЭ оруулалтад).
--
-- 🔒 БҮХ ШАЛГАЛТ нь POSTGRES ТРИГГЕР дээр — client-ээс тойрох боломжгүй.
--
-- ⚠️ АЖИЛЛУУЛАХ: Supabase Dashboard → SQL Editor → энэ файлыг бүтнээр нь
--    хуулж тавиад RUN. (Туслах: `npm run migration:copy 0014_listing_dedupe.sql`)
-- ============================================================


-- ============================================================
-- 1) «Таних тэмдэг» (dedupe_key) — багана + тооцоолох функц
-- ============================================================

alter table public.listings add column if not exists dedupe_key text;

-- ⚠️ IMMUTABLE — зөвхөн immutable функцууд (`lower`, `btrim`, `coalesce`,
--    `round`, текст/тоон cast) ашигласан. `area` нь real тул
--    `round(area)::int::text` — 75.4 ба 75.6 хоёулаа '75' болно (санаатай:
--    хэрэглэгч талбайг бага зэрэг бөөрөнхийлж хамгаалалтыг тойрохгүй).
create or replace function public.listing_dedupe_key(l public.listings)
returns text
language sql
immutable
as $$
  select coalesce(l.property_type, '')                || '|' ||
         coalesce(l.city, '')                         || '|' ||
         coalesce(l.district, '')                     || '|' ||
         coalesce(l.khoroo, '')                       || '|' ||
         lower(btrim(coalesce(l.address_detail, ''))) || '|' ||
         coalesce(l.rooms, 0)::text                   || '|' ||
         round(coalesce(l.area, 0))::int::text;
$$;

comment on function public.listing_dedupe_key(public.listings) is
  'Зарын «таних тэмдэг» — давхардлын шалгалтад (0014). «user_id + dedupe_key» '
  'хос 30 хоногт давтагдвал шинэ зар оруулахыг хориглоно.';

-- Одоо байгаа заруудын түлхүүрийг бөглөх
-- ⚠️ Триггер үүсгэхээс ӨМНӨ хийх ЁСТОЙ (доорх шалгалт хөндлөнгөөс орохгүйн тулд).
update public.listings
   set dedupe_key = public.listing_dedupe_key(listings)
 where dedupe_key is null;

-- Давхардлын шалгалтыг хурдан болгох индекс
create index if not exists listings_dedupe_idx
  on public.listings (user_id, dedupe_key, created_at desc);


-- ============================================================
-- 2) УСТГАСАН зарын түүх (tombstone) — «устгаад дахин оруулах»-ыг хаана
-- ============================================================
-- ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ: зар бүрмөсөн устах тул дараа нь «ийм зар байсан уу»
--    гэж асуух боломжгүй болно → хэрэглэгч устгаад шууд дахин оруулж
--    хамгаалалтыг тойрно. Тиймээс устгах үед түлхүүрийг энд хадгална.

create table if not exists public.listing_history (
  id            bigserial primary key,
  listing_id    uuid        not null,
  user_id       uuid        not null,
  dedupe_key    text,
  property_type text,
  city          text,
  district      text,
  khoroo        text,
  rooms         integer,
  area          real,
  price         bigint,
  created_at    timestamptz,
  deleted_at    timestamptz not null default now()
);

create index if not exists listing_history_dedupe_idx
  on public.listing_history (user_id, dedupe_key, deleted_at desc);

-- 🔒 RLS идэвхтэй, ГЭХДЭЭ ямар ч policy БАЙХГҮЙ →
--    anon / authenticated хэн ч унших, бичих, засах БОЛОМЖГҮЙ.
--    Зөвхөн доорх SECURITY DEFINER триггер (эзэн нь хүснэгтийн эзэн тул
--    RLS-ыг тойрно) л мөр нэмнэ. Админд хэрэгтэй бол service_role ашиглана.
alter table public.listing_history enable row level security;

create or replace function public.log_deleted_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.listing_history (
    listing_id, user_id, dedupe_key, property_type,
    city, district, khoroo, rooms, area, price, created_at
  ) values (
    old.id, old.user_id, old.dedupe_key, old.property_type,
    old.city, old.district, old.khoroo, old.rooms, old.area, old.price, old.created_at
  );
  return old;
end $$;

drop trigger if exists listings_log_delete on public.listings;
create trigger listings_log_delete
  after delete on public.listings
  for each row execute procedure public.log_deleted_listing();



-- ============================================================
-- 3) ГОЛ ТРИГГЕР — давхардал + SPAM хязгаар
-- ============================================================
create or replace function public.prevent_duplicate_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days         constant int      := 30;                    -- давхардлын цонх (хоног)
  v_daily_max    constant int      := 3;                     -- 24 цагт хэдэн ШИНЭ зар
  v_fresh        constant interval := interval '10 minutes';  -- DELETE+INSERT fallback-ийн цонх
  v_is_fallback  boolean           := false;
begin
  -- (0) Таних тэмдгийг (дахин) тооцоолно — `generated column` БИШ тул BEFORE
  --     триггер дотор өөрсдөө бичнэ (generated column-ийн утга BEFORE
  --     триггер дотор хараахан тооцоологдоогүй байдаг).
  new.dedupe_key := public.listing_dedupe_key(new);

  -- ЗАСВАР: таних тэмдэг ӨӨРЧЛӨГДӨӨГҮЙ бол юу ч шалгахгүй
  -- (ж: зөвхөн үнэ/тайлбар/зураг зассан → давхардал үүсэхгүй).
  -- ⚠️ `old.dedupe_key is null` = migration-ийн дараа түлхүүр АНХ удаа
  --    оноогдож байгаа хуучин мөр → мөн шалгалт хийхгүй. Эс бөгөөс хуучин
  --    давхардалтай хэрэглэгч зараа ЗАСАХ боломжгүй болно.
  if tg_op = 'UPDATE' and (
       old.dedupe_key is null
       or old.dedupe_key is not distinct from new.dedupe_key
     ) then
    return new;
  end if;

  -- (1) ӨӨРИЙН идэвхтэй зартай давхцаж байна уу?
  if exists (
    select 1 from public.listings l
     where l.user_id    = new.user_id
       and l.dedupe_key = new.dedupe_key
       and l.id is distinct from new.id
       and l.created_at > now() - make_interval(days => v_days)
  ) then
    raise exception using
      errcode = '23505',
      message = format(
        'Ижил зар таны бүртгэлд аль хэдийн байна (%s хоногийн дотор давхардуулахгүй). '
        'Дахин оруулахын оронд өмнөх зараа ЗАСААРАЙ.', v_days);
  end if;

  -- (2) УСТГАСАН зартай давхцаж байна уу?
  -- ⚠️ ГАДНА: `lib/queries.js → updateListing()`-ийн DELETE+INSERT fallback нь
  --    ЯГ ИЖИЛ id-гаар 10 минутын дотор буцааж оруулдаг (created_at хадгална).
  --    Түүнийг хоригловол зар АЛГА БОЛНО — тиймээс тэр тохиолдлыг хасаж өгнө.
  if exists (
    select 1 from public.listing_history h
     where h.user_id    = new.user_id
       and h.dedupe_key = new.dedupe_key
       and h.deleted_at > now() - make_interval(days => v_days)
       and not (h.listing_id = new.id and h.deleted_at > now() - v_fresh)
  ) then
    raise exception using
      errcode = '23505',
      message = format(
        'Энэ зарыг саяхан устгасан байна. %s хоногийн дараа дахин оруулж болно.', v_days);
  end if;

  -- (3) SPAM хязгаар — ЗӨВХӨН ШИНЭ оруулалтад (засварт хамаарахгүй)
  if tg_op = 'INSERT' then
    -- ⚠️ ГАДНА: `updateListing()`-ийн DELETE+INSERT fallback нь ШИНЭ ЗАР БИШ
    --    (мөн id, 10 минутын дотор устгасан). Түүнийг хязгаарт оруулбал
    --    хэрэглэгчийн зар АЛГА БОЛНО (устгачихаад оруулж чадахгүй болно)!
    v_is_fallback := exists (
      select 1 from public.listing_history h
       where h.listing_id = new.id and h.deleted_at > now() - v_fresh
    );

    if not v_is_fallback
       and (select count(*) from public.listings
             where user_id = new.user_id
               and created_at > now() - interval '24 hours') >= v_daily_max then
      raise exception using
        errcode = '23505',
        message = format(
          'Өдөрт %s зарын хязгаар (SPAM хамгаалалт). Маргааш дахин оролдоно уу.', v_daily_max);
    end if;
  end if;

  return new;
end $$;

comment on function public.prevent_duplicate_listing() is
  'Зарын давхардал + SPAM-ыг хориглоно (0014). Нэг бүртгэл (user_id) нэг зарыг '
  '30 хоногт 2 удаа оруулахгүй; 24 цагт 3-аас олон ШИНЭ зар оруулахгүй.';

drop trigger if exists listings_prevent_duplicate on public.listings;
create trigger listings_prevent_duplicate
  before insert or update on public.listings
  for each row execute procedure public.prevent_duplicate_listing();


-- ============================================================
-- 4) ШАЛГАХ (сонголтоор — SQL Editor-т ажиллуулж болно)
-- ============================================================
-- Одоо байгаа давхардлуудыг харах (migration-ийн дараа ШИНЭ давхардал
-- үүсэхгүй, гэхдээ ХУУЧИН давхардлууд байж болно):
--
--   select user_id, dedupe_key, count(*) as too_many, array_agg(id) as ids
--     from public.listings
--    group by user_id, dedupe_key
--   having count(*) > 1
--    order by too_many desc;
--
-- Триггерүүд суусан эсэх:
--
--   select tgname from pg_trigger
--    where tgrelid = 'public.listings'::regclass and not tgisinternal;
--
-- Түүхийн хэмжээ (устгагдсан зарууд):
--
--   select count(*) as deleted_rows, min(deleted_at), max(deleted_at)
--     from public.listing_history;
-- ============================================================

