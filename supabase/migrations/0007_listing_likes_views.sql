-- ============================================================
-- 0007_listing_likes_views.sql — ❤️ Таалагдсан ба 👁 Үзсэн (хүн тус бүрээр)
--
-- ⚠️ ХЭРХЭН АЖИЛЛУУЛАХ ВЭ (DDL-г зөвхөн SQL Editor-оор ажиллуулж болно):
--   npm run stats:setup   → SQL-ийг clipboard-д хуулж, SQL Editor-ийг нээнэ
--   (эсвэл гараар: Supabase → SQL Editor → New query → paste → Run)
--   Дараа нь:  npm run stats:check
--
-- ✅ Ажиллуулаагүй ч сайт ХЭВИЙН ажиллана — тоолуур 0 харагдана.
-- ============================================================
--
-- ЗАГВАР (яагаад ингэж):
--   ❤️ listing_likes / 👁 listing_views — «хэн» хийснийг хүснэгтэд хадгална.
--      PRIMARY KEY (listing_id, viewer_key) → нэг хүн нэг зард НЭГ л удаа ✅
--   listings.likes / listings.views     — тоолуурыг ТРИГГЕР автоматаар
--      `count(*)`-ээр шинэчилнэ (карт дээр JOIN хийхгүйн тулд хурдан).
--      Триггер нь INSERT-тэй НЭГ транзакцад ажиллана → тоо хэзээ ч зөрөхгүй,
--      зэрэгцээ хүсэлтэд ч зөв (JS дээр «унших→+1→бичих» алдаа гарахгүй).
-- ============================================================

-- ---------- 0. Хуучин (0006) функцууд хэрэггүй болсон ----------
drop function if exists public.listing_bump_views(uuid);
drop function if exists public.listing_bump_likes(uuid, integer);

-- ---------- 1. Тоолуурын багана (карт дээр хурдан харуулах) ----------
alter table public.listings add column if not exists views integer not null default 0;
alter table public.listings add column if not exists likes integer not null default 0;

comment on column public.listings.views is 'Хэдэн хүн үзсэн = count(listing_views). Триггер автоматаар шинэчилнэ.';
comment on column public.listings.likes is 'Хэдэн хүн ❤️ дарсан = count(listing_likes). Триггер автоматаар шинэчилнэ.';

-- ---------- 2. ❤️ Хэн таалагдсан ----------
create table if not exists public.listing_likes (
  listing_id uuid not null references public.listings (id) on delete cascade,
  -- 'u:<user_id>' — нэвтэрсэн хэрэглэгч ; 'd:<uuid>' — зочин (browser-ийн id)
  viewer_key text not null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (listing_id, viewer_key)
);
create index if not exists listing_likes_user_idx on public.listing_likes (user_id);

-- ---------- 3. 👁 Хэн үзсэн ----------
create table if not exists public.listing_views (
  listing_id uuid not null references public.listings (id) on delete cascade,
  viewer_key text not null,
  user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (listing_id, viewer_key)
);
create index if not exists listing_views_user_idx on public.listing_views (user_id);

-- ---------- 4. Тоолуурыг count(*)-ээр автоматаар шинэчлэх триггер ----------
create or replace function public.sync_listing_counters()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  target_id uuid;
  cnt integer;
begin
  if tg_op = 'DELETE' then
    target_id := old.listing_id;
  else
    target_id := new.listing_id;
  end if;

  if tg_table_name = 'listing_likes' then
    select count(*) into cnt from public.listing_likes where listing_id = target_id;
    update public.listings set likes = cnt where id = target_id;
  else
    select count(*) into cnt from public.listing_views where listing_id = target_id;
    update public.listings set views = cnt where id = target_id;
  end if;

  return null;
end $$;

drop trigger if exists listing_likes_sync on public.listing_likes;
create trigger listing_likes_sync
  after insert or delete on public.listing_likes
  for each row execute function public.sync_listing_counters();

drop trigger if exists listing_views_sync on public.listing_views;
create trigger listing_views_sync
  after insert or delete on public.listing_views
  for each row execute function public.sync_listing_counters();

-- ---------- 5. Одоо байгаа мөрүүдээс тоог бодож тавих (хүснэгт хоосон бол 0) ----------
update public.listings l set likes = (select count(*) from public.listing_likes k where k.listing_id = l.id);
update public.listings l set views = (select count(*) from public.listing_views v where v.listing_id = l.id);

-- ---------- 6. Аюулгүй байдал ----------
-- RLS асааж, БОДЛОГО (policy) ЗОРИУД нэмэхгүй → anon/authenticated хэрэглэгч
-- эдгээр хүснэгтийг шууд унших/бичих боломжгүй. Зөвхөн сервер (service_role,
-- RLS-ийг тойрдог) API route-оор дамжина.
alter table public.listing_likes enable row level security;
alter table public.listing_views enable row level security;
revoke all on public.listing_likes from anon, authenticated;
revoke all on public.listing_views from anon, authenticated;
