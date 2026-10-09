-- ============================================================
-- 0014_listing_dedupe.sql — ЗАРЫН ДАВХАРДЛЫН хамгаалалт (SPAM) — V2
-- ============================================================
-- 🎯 ЗОРИЛГО:
--   • Нэг хэрэглэгч НЭГ ЗАРАА давтан оруулахыг ХОРИГЛОНО.
--   • ГЭХДЭЭ нэг зарыг 2 ба түүнээс олон хүн (ж: хэд хэдэн broker нэг
--     байрыг зарна) оруулж БОЛНО — тэдний бүртгэл өөр тул хориглохгүй.
--   • ⚡ АГЕНТ / дэлгүүр (20+ зартай хэрэглэгч) ХОРИГЛОГДОХГҮЙ: өдрийн лимит
--     нь `app_metadata.listing_daily_limit` (анхдагч 3; агед 50 гэж админ өгнө).
--
-- 🧠 4 ДҮРЭМ (бүгд POSTGRES ТРИГГЕР дээр — client-ээс тойрох БОЛОМЖГҮЙ):
--   1) Ижил `user_id` + ижил `dedupe_key` → 30 ХОНОГТ давхардуулахгүй.
--   2) УСТГАСАН зартай давхцах → мөн 30 хоногт хориглоно (tombstone).
--   3) Өдрийн лимит — ЗӨВХӨН ШИНЭ оруулалтад (0 = хязгааргүй).
--   4) COOLDOWN 60 сек — дараа дараагийн ШИНЭ зар (бот-spam).
--
-- 🔑 `dedupe_key` (V2) — зарын «таних тэмдэг»:
--      section | property_type | category | хот | дүүрэг | хороо | хаяг
--        + үл хөдлөх:  | өрөө | талбай(бүхэл) | давхар
--        + бусад:      | attrs гарын үсэг (negotiable/payment_terms ХАСАВ)
--   ⚠️ ҮНЭ / ТАЙЛБАР / ЗУРАГ / УТАС ОРОХГҮЙ — тэдгээрийг бага зэрэг
--      өөрчлөөд хамгаалалтыг тойрох боломжгүй байх ёстой.
--
-- 🔁 V1 → V2 (яагаад сольсон):
--   · `section` — «Бусад» гэх мэт НЭГ НЭРТЭЙ дэд төрөл олон хэсэгт байдаг
--     (ж: `services` ба `electric`) ⇒ V1 нь ХУУРАМЧ давхардал үзэж байв ✗
--   · `category` (зарна/түрээслүүлнэ) — V1-д БАЙХГҮЙ байв ⇒ нэг байрыг
--     «зарна» ба «түрээслүүлнэ» гэж 2 удаа оруулж ЧАДАХГҮЙ байв ✗ (агент)
--   · `floor` (давхар) — ижил байрны 2 ӨӨР давхар (агентын 20+ зар)
--   · Барааны хэсэгт `rooms`/`area` нь ҮРГЭЛЖ 0 тул V1-д ижил төрлийн БҮХ
--     бараа нэг түлхүүрт орж хуурамчаар хориглогддог байв (ж: 2 өөр буйдан)
--     ✗ ⇒ оронд нь `attrs` (брэнд/загвар/төлөв/хэмжээ…) гарын үсэг
--     ⚠️ `negotiable` ба `payment_terms` ХАСАГДАНА: тохиролцооны тэмдэг тул
--        хүн бүр сольдог (шалгалттай холбоогүй) — оруулбал хамгаалалт суларна.
--
-- ⚠️ Шалгалт нь `user_id`-ээр (БҮРТГЭЛ) хийгдэнэ — талбарын `phone`-оор БИШ!
--    Учир нь «НЭГ УТАС = НЭГ БҮРТГЭЛ» нь аль хэдийн баталгаажсан:
--    `lib/phoneEmail.js → phoneToEmail()` нь утсаас ДОТОО имэйл
--    (976XXXXXXXX@phone.zarmn.mn) үүсгэдэг ба `auth.users.email` нь unique
--    тул нэг утсаар 2 дахь бүртгэл НЭЭГДЭХГҮЙ.
--    ⚠️ Харин талбарын `phone`-оор шалгавал 2 broker нэг байрыг ЭЗНИЙ
--       утасны дугаараар оруулахад 2 дахь нь БУРУУ хориглогдоно.
--
-- 🔐 ЛИМИТ ХААНА ХАДГАЛАГДАХ ВЭ — `app_metadata` (profiles БАГАНА БИШ!):
--    `profiles`-ийн UPDATE policy нь `auth.uid() = id` тул хэрэглэгч ӨӨРӨӨ
--    лимитээ 0 (хязгааргүй) болгож хамгаалалтыг ТОЙРЧ ЧАДНА ✗
--    ⇒ `auth.users.raw_app_meta_data` нь зөвхөн `service_role`-оор
--    (Admin API → `updateUserById({ app_metadata })`) бичигддэг тул
--    client хуурах боломжгүй ✓ (`is_admin`/`is_blocked`-тай ЯГ ижил хэв).
--    · Админ UI: /admin/users → «Лимит» багана (5 / 50 / ∞ гэсэн товч)
--    · Тохируулаагүй бол анхдагч 3; 0 = хязгааргүй
--
-- 🩺 `public.dedupe_status()` — триггерүүд АСААЛТТАЙ эсэхийг буцаана.
--    ⚠️ `seed:sections` нь demo заруудыг оруулахын тулд триггерийг ТҮР
--       хасдаг (`disable trigger`) ⇒ дараа нь `enable` хийхээ мартвал
--       хамгаалалт УНТАРСАН хэвээр үлдэж, хэрэглэгч зараа дахин дахин
--       оруулах боломжтой болно ✗ (README-д сануулга бий). Одоо
--       `npm run check:supabase` нь энэ функцээр шалгаж, ЧАНГААР хэлнэ ✓
--
-- ⚠️ АЖИЛЛУУЛАХ (идемпотент — давтан ажиллуулж болно):
--    Supabase Dashboard → SQL Editor → энэ файлыг бүтнээр нь тавиад RUN.
--    Туслах: `npm run migration:copy 0014_listing_dedupe.sql`
--    Шалгах: `npm run check:supabase`
--    ⚠️ Урьдчилсан нөхцөл: `0003` (floor) ба `0016` (section/attrs) ОРСОН байх
--       ёстой — V2 нь тэдгээрийг ашиглана.
-- ============================================================


-- ============================================================
-- 1) «Таних тэмдэг» (dedupe_key) — багана + тооцоолох функц (V2)
-- ============================================================

alter table public.listings add column if not exists dedupe_key text;

-- ⚠️ IMMUTABLE — зөвхөн immutable илэрхийлэл (`lower`, `btrim`, `coalesce`,
--    `round`, `case`, jsonb-ийн `-` оператор, текст/тоон cast) ашигласан.
--    ⚠️ `area` нь real тул `round(area)::int::text` — 75.4 ба 75.6 хоёулаа
--       '75' болно (санаатай: талбайг бага зэрэг бөөрөнхийлж тойрохгүй).
create or replace function public.listing_dedupe_key(l public.listings)
returns text
language sql
immutable
as $$
  select coalesce(l.section, '')                      || '|' ||
         coalesce(l.property_type, '')                || '|' ||
         coalesce(l.category, '')                     || '|' ||
         coalesce(l.city, '')                         || '|' ||
         coalesce(l.district, '')                     || '|' ||
         coalesce(l.khoroo, '')                       || '|' ||
         lower(btrim(coalesce(l.address_detail, ''))) || '|' ||
         case
           when l.section = 'real-estate' then
             coalesce(l.rooms, 0)::text               || '|' ||
             round(coalesce(l.area, 0))::int::text    || '|' ||
             coalesce(l.floor, 0)::text
           else
             coalesce(l.attrs - 'negotiable' - 'payment_terms', '{}'::jsonb)::text
         end;
$$;

comment on function public.listing_dedupe_key(public.listings) is
  'Зарын «таних тэмдэг» (0014 V2) — давхардлын шалгалтад. «user_id + dedupe_key» '
  'хос 30 хоногт давтагдвал шинэ зар оруулахыг хориглоно.';

-- Одоо байгаа заруудын түлхүүрийг V2 томъёогоор бөглөнө
-- (V1-ээр бөглөгдсөн бол шинэ томъёо руу шилжинэ — идемпотент ✓)
-- ⚠️ Триггер ажиллаж байвал энэ UPDATE нь дүрэм 1-ийг өдөөж, migration
--    НУРЖ БОЛЗОШГҮЙ (ж: 2 ижил зар шинэ түлхүүрээр давхцана) ⇒ дараах
--    DO блок нь байгаа триггерийг ТҮР хасч, дараа нь буцааж асаана.
do $$
begin
  if exists (
    select 1 from pg_trigger
     where tgrelid = 'public.listings'::regclass
       and tgname  = 'listings_prevent_duplicate'
       and not tgisinternal
  ) then
    execute 'alter table public.listings disable trigger listings_prevent_duplicate';
  end if;
end $$;

update public.listings
   set dedupe_key = public.listing_dedupe_key(listings)
 where dedupe_key is null
    or dedupe_key is distinct from public.listing_dedupe_key(listings);

do $$
begin
  if exists (
    select 1 from pg_trigger
     where tgrelid = 'public.listings'::regclass
       and tgname  = 'listings_prevent_duplicate'
       and not tgisinternal
  ) then
    execute 'alter table public.listings enable trigger listings_prevent_duplicate';
  end if;
end $$;

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
--    Зөвхөн доорх SECURITY DEFINER триггер л мөр нэмнэ.
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
-- 3) ГОЛ ТРИГГЕР — давхардал + өдрийн лимит + cooldown
-- ============================================================
create or replace function public.prevent_duplicate_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_days        constant int      := 30;                    -- давхардлын цонх (хоног)
  v_daily_max   constant int      := 3;                     -- анхдагч өдрийн лимит
  v_fresh       constant interval := interval '10 minutes'; -- DELETE+INSERT fallback-ийн цонх
  v_cooldown    constant interval := interval '60 seconds'; -- дараагийн ШИНЭ зар хүртэл
  v_limit       int;
  v_is_fallback boolean           := false;
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

  -- ==========================================================
  -- (3) ШИНЭ оруулалтын хязгаар — ЗӨВХӨН `INSERT` (засварт хамаарахгүй)
  -- ==========================================================
  if tg_op = 'INSERT' then
    -- ⚠️ ГАДНА: `updateListing()`-ийн DELETE+INSERT fallback нь ШИНЭ ЗАР БИШ
    --    (мөн id, 10 минутын дотор устгасан). Түүнийг хязгаарт оруулбал
    --    хэрэглэгчийн зар АЛГА БОЛНО (устгачихаад оруулж чадахгүй болно)!
    v_is_fallback := exists (
      select 1 from public.listing_history h
       where h.listing_id = new.id and h.deleted_at > now() - v_fresh
    );

    if not v_is_fallback then
      -- (3a) ӨДРИЙН ЛИМИТ — `app_metadata.listing_daily_limit` (бүртгэл тус бүр)
      --   · Тохируулаагүй / буруу утга → анхдагч 3
      --   · 0 → ХЯЗГААРГҮЙ (агент/дэлгүүр)
      --   ⚠️ `app_metadata` нь ЗӨВХӨН service_role-оор бичигддэг (Admin API)
      --      тул хэрэглэгч өөрөө лимитээ сольж тойрч ЧАДАХГҮЙ ✓
      select case
               when u.raw_app_meta_data ->> 'listing_daily_limit' ~ '^[0-9]+$'
                 then (u.raw_app_meta_data ->> 'listing_daily_limit')::int
               else v_daily_max
             end
        into v_limit
        from auth.users u
       where u.id = new.user_id;
      v_limit := coalesce(v_limit, v_daily_max);

      if v_limit > 0
         and (select count(*) from public.listings
               where user_id = new.user_id
                 and created_at > now() - interval '24 hours') >= v_limit then
        raise exception using
          errcode = '23505',
          message = format(
            'Өдөрт %s зарын хязгаар (SPAM хамгаалалт). Маргааш дахин оролдоно уу.', v_limit);
      end if;

      -- (3b) COOLDOWN — дараа дараагийн ШИНЭ зар (бот-spam-ыг зогсооно)
      if exists (
        select 1 from public.listings l
         where l.user_id = new.user_id
           and l.created_at > now() - v_cooldown
      ) then
        raise exception using
          errcode = '23505',
          message = format(
            'Хэт хурдан оруулж байна. %s секунд хүлээгээд дахин оролдоно уу.',
            ceil(extract(epoch from v_cooldown))::int);
      end if;
    end if;
  end if;

  return new;
end $$;

comment on function public.prevent_duplicate_listing() is
  'Зарын давхардал + SPAM-ыг хориглоно (0014 V2). «user_id + dedupe_key» 30 хоногт '
  '1 удаа; өдрийн лимит нь `app_metadata.listing_daily_limit` (анхдагч 3, 0 = хязгааргүй); '
  'дараагийн ШИНЭ зар 60 секундын дараа.';

drop trigger if exists listings_prevent_duplicate on public.listings;
create trigger listings_prevent_duplicate
  before insert or update on public.listings
  for each row execute procedure public.prevent_duplicate_listing();


-- ============================================================
-- 4) 🩺 ЭРҮҮЛ МЭНДИЙН ШАЛГАЛТ — `dedupe_status()` (RPC)
-- ============================================================
-- ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ: `dedupe_key` багана байх нь ХАНГАЛТГҮЙ —
--    `seed:sections` нь demo заруудыг оруулахын тулд триггерийг ТҮР
--    хасдаг (README-д заавар бий). Дараа нь `enable` хийхээ мартвал
--    хамгаалалт УНТАРСАН хэвээр үлдэж, хэрэглэгч зараа дахин дахин
--    оруулах боломжтой болно ✗ (энэ нь чимээгүй алдаа — SQL Editor-т
--    гараар `select tgname, tgenabled from pg_trigger ...` хийж л харна).
--    ⇒ Энэ функц нь `npm run check:supabase`-д БОДИТ төлвийг хэлнэ ✓
--
-- 🔓 `anon` / `authenticated` ч дуудаж болно (зөвхөн триггерийн төлөв —
--    нууц мэдээлэл БАЙХГҮЙ). `security definer` нь `pg_trigger`-ыг
--    уншихад л шаардлагатай.
create or replace function public.dedupe_status()
returns jsonb
language sql
security definer
stable
set search_path = pg_catalog
as $$
  select jsonb_build_object(
    'trigger_enabled', coalesce((
      select t.tgenabled = 'O'
        from pg_trigger t
       where t.tgrelid = 'public.listings'::regclass
         and t.tgname  = 'listings_prevent_duplicate'
         and not t.tgisinternal), false),
    'history_trigger_enabled', coalesce((
      select t.tgenabled = 'O'
        from pg_trigger t
       where t.tgrelid = 'public.listings'::regclass
         and t.tgname  = 'listings_log_delete'
         and not t.tgisinternal), false),
    'daily_default', 3,
    'cooldown_seconds', 60
  );
$$;

comment on function public.dedupe_status() is
  'Зарын давхардлын хамгаалалтын ЭРҮҮЛ МЭНД (0014 V2): триггерүүд асаалттай '
  'эсэх + анхдагч лимит/cooldown. `npm run check:supabase` дуудна.';

grant execute on function public.dedupe_status() to anon, authenticated, service_role;


-- ============================================================
-- 5) ШАЛГАХ (сонголтоор — SQL Editor-т ажиллуулж болно)
-- ============================================================
-- Триггерүүд суусан ба АСААЛТТАЙ эсэх (tgenabled = 'O' байх ЁСТОЙ):
--
--   select tgname, tgenabled from pg_trigger
--    where tgrelid = 'public.listings'::regclass and not tgisinternal;
--
--   select public.dedupe_status();   -- {trigger_enabled: true, ...}
--
-- Одоо байгаа давхардлуудыг харах (migration-ийн дараа ШИНЭ давхардал
-- үүсэхгүй, гэхдээ ХУУЧИН давхардлууд байж болно):
--
--   select user_id, dedupe_key, count(*) as too_many, array_agg(id) as ids
--     from public.listings
--    group by user_id, dedupe_key
--   having count(*) > 1
--    order by too_many desc;
--
-- Агентын лимит (0 = хязгааргүй; тохируулаагүй бол анхдагч 3):
--
--   select id, coalesce(raw_app_meta_data ->> 'listing_daily_limit', '3 (анхдагч)')
--     from auth.users order by created_at desc limit 10;
--
-- Түүхийн хэмжээ (устгагдсан зарууд):
--
--   select count(*) as deleted_rows, min(deleted_at), max(deleted_at)
--     from public.listing_history;
--
-- ⚠️ `seed:sections`-ийг ажиллуулах бол триггерийг ТҮР хааж, дараа нь
--    ЗААВАЛ асаана (README → «Demo seed-тэй зөрчил»):
--
--      alter table public.listings disable trigger listings_prevent_duplicate;
--      alter table public.listings enable trigger listings_prevent_duplicate;
-- ============================================================
