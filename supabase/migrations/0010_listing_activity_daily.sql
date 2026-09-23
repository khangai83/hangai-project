-- ============================================================
-- 0010_listing_activity_daily.sql — Өдөр тутмын ХАНДАЛТ (traffic)
--
-- ЯАГААД ЭНЭ ХҮСНЭГТ ХЭРЭГТЭЙ ВЭ:
--   0007-ийн `listing_views` нь PRIMARY KEY (listing_id, viewer_key) тул
--   нэг хүн нэг зард ЗӨВХӨН НЭГ удаа бичигддэг (created_at = анх үзсэн цаг).
--   Иймээс «сүүлийн 7 хоногт хэдэн хандалт байсан бэ» гэдгийг тэр
--   хүснэгтээс мэдэх БОЛОМЖГҮЙ — зөвхөн «хэдэн ШИНЭ хүн ирсэн» гэж мэднэ.
--
--   Энэ хүснэгт нь (listing_id, өдөр) хос бүрд хандалтын ТООГ хуримтлуулна:
--     • views — тухайн өдөр зарын хуудас нээгдсэн тоо (давтагдаж болно)
--     • likes — тухайн өдөр ❤️ нэмэгдсэн/хасагдсан цэвэр өөрчлөлт
--   Ингэснээр «Миний зарууд → 📈 Статистик» хуудсан дээр 1/3/7/30 хоногийн
--   хандлагыг ГРАФИКТАЙ харуулах боломжтой болно.
--
-- ⚠️ ХУГАЦААНЫ БҮС (timezone): бүх `day` утга нь Postgres-ийн
--    `current_date` (Supabase дээр default нь UTC) ашиглана. Код талд ч
--    мөн адил UTC өдрөөр бүлэглэнэ (lib/listingActivity.js → todayUtc()).
--
-- ⚠️ ХЭРХЭН АЖИЛЛУУЛАХ ВЭ (DDL-г зөвхөн SQL Editor-оор ажиллуулна):
--      npm run stats:setup   → SQL-ийг clipboard-д хуулж, SQL Editor-ийг нээнэ
--      npm run stats:check   → ажилласан эсэхийг шалгана
--
-- ✅ Ажиллуулаагүй ч САЙТ ЭВДРЭХГҮЙ: `lib/listingStats.js → logViewEvent()`
--    нь хүснэгт байхгүй бол чимээгүй буцаана; харин UI нь зөвхөн
--    «шинэ үзсэн хүн» горимд шилжиж, миграцын сануулга харуулна.
-- ============================================================

-- ---------- 1. Хүснэгт ----------
create table if not exists public.listing_activity_daily (
  listing_id uuid not null references public.listings (id) on delete cascade,
  -- Тухайн өдөр (UTC). `current_date` нь триггер/функц дуудагдах үед бодогдоно.
  day        date not null default current_date,
  views      integer not null default 0,
  likes      integer not null default 0,
  primary key (listing_id, day)
);

comment on table public.listing_activity_daily is
  'Өдөр тутмын хандалтын хуримтлал — «Миний зарууд → Статистик» хуудсанд 1/3/7/30 хоногийн хандлага харуулахад';
comment on column public.listing_activity_daily.views is
  'Тухайн өдөр зарын дэлгэрэнгүй хуудас нээгдсэн ТОО (нэг хүн давтан нээвэл олон удаа тоологдоно)';
comment on column public.listing_activity_daily.likes is
  'Тухайн өдөр ❤️-ийн цэвэр өөрчлөлт (+1 нэмэх, -1 хасах). 0-ээс доош болохгүй.';

-- Уншилтын индексүүд:
--   • (listing_id, day desc) — нэг хэрэглэгчийн заруудын 30 хоногийн мөрүүд
--   • (day)                  — бүх системийн өдөр тутмын нийт (ирээдүйд)
create index if not exists listing_activity_listing_day_idx
  on public.listing_activity_daily (listing_id, day desc);
create index if not exists listing_activity_day_idx
  on public.listing_activity_daily (day desc);

-- ---------- 2. Атомар нэмэгдүүлэх функц ----------
-- ЯАГААД ФУНКЦ ВЭ: PostgREST-ийн upsert нь `views = views + 1` гэж бичиж
-- чаддаггүй (зөвхөн бүтэн утга тавьдаг). Тиймээс «унших → +1 → бичих»
-- хэлбэрээр JS дээр хийвэл ЗЭРЭГЦЭЭ хүсэлтэд алдаа өгнө (2 хүн зэрэг
-- харвал 1 л нэмэгдэнэ). Энэ функц нэг транзакцад атомар ажиллана.
--
-- ⚠️ p_views / p_likes нь сөрөг ч байж болно (unlike) — тиймээс greatest(0,…)
create or replace function public.bump_listing_activity(
  p_id    uuid,
  p_views integer default 0,
  p_likes integer default 0
)
returns void
language sql
security definer set search_path = public
as $$
  insert into public.listing_activity_daily (listing_id, day, views, likes)
  values (p_id, current_date, greatest(0, p_views), greatest(0, p_likes))
  on conflict (listing_id, day) do update
    set views = greatest(0, public.listing_activity_daily.views + p_views),
        likes = greatest(0, public.listing_activity_daily.likes + p_likes);
$$;

comment on function public.bump_listing_activity(uuid, integer, integer) is
  'Тухайн зарын тухайн өдрийн хандалт/❤️-г атомар нэмнэ. Зөвхөн сервер (service_role) дуудна.';

-- ---------- 3. Аюулгүй байдал ----------
-- anon/authenticated: огт хүрэхгүй (0007-ийн listing_views-тай ижил зарчим).
-- Зөвхөн сервер (service_role, RLS-ийг тойрдог) API route-оор дамжина.
alter table public.listing_activity_daily enable row level security;
revoke all on public.listing_activity_daily from anon, authenticated;

-- ⚠️ ЧУХАЛ: `revoke … from public` нь БҮХ роль (service_role-ийг ч) хамардаг
-- тул service_role-д тусгайлан олгох ёстой — эс бөгөөд RPC дуудагдахгүй.
revoke all on function public.bump_listing_activity(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.bump_listing_activity(uuid, integer, integer)
  to service_role;
grant select, insert, update on public.listing_activity_daily to service_role;

-- ---------- 4. Одоо байгаа өгөгдлөөр суурийг бөглөх ----------
-- 0007-ийн listing_views (хүн тус бүрээр, анх үзсэн цаг) болон
-- listing_likes-ийг өдрөөр нь бүлэглэж, түүхэн суурийг үүсгэнэ.
-- (Дахин ажиллуулбал ДАВХАРДЖ БОЛОХГҮЙ — эхлээд тухайн өдрийн мөрийг
--  устгаад дахин бичнэ.)
delete from public.listing_activity_daily;

insert into public.listing_activity_daily (listing_id, day, views, likes)
select listing_id, (created_at at time zone 'UTC')::date, count(*), 0
  from public.listing_views
 group by listing_id, (created_at at time zone 'UTC')::date
on conflict (listing_id, day) do update
  set views = public.listing_activity_daily.views + excluded.views;

insert into public.listing_activity_daily (listing_id, day, views, likes)
select listing_id, (created_at at time zone 'UTC')::date, 0, count(*)
  from public.listing_likes
 group by listing_id, (created_at at time zone 'UTC')::date
on conflict (listing_id, day) do update
  set likes = public.listing_activity_daily.likes + excluded.likes;

-- ---------- 5. Шалгах ----------
-- select day, sum(views) as хандалт, sum(likes) as like
--   from public.listing_activity_daily
--  where day >= current_date - 6
--  group by day order by day;
