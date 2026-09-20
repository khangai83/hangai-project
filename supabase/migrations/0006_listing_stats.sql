-- ============================================================
-- 0006_listing_stats.sql — «Үзсэн» ба «Таалагдсан» тоолуур
--
-- ⚠️ ХЭРХЭН АЖИЛЛУУЛАХ ВЭ (DDL-г зөвхөн SQL Editor-оор ажиллуулж болно):
--   1. https://supabase.com/dashboard → төслөө сонгоно
--   2. Зүүн цэс → «SQL Editor» → «New query»
--   3. Энэ файлын БҮХ агуулгыг хуулж тавиад → «Run» (эсвэл Cmd+Enter)
--   4. «Success. No rows returned» гэж гарах ёстой
--
-- ✅ Ажиллуулаагүй ч сайт ХЭВИЙН ажиллана — зөвхөн тоолуур 0-д байх бөгөөд
--    листингийн query (`select('*')`) багана байхгүйгээс болж эвдрэхгүй.
-- ============================================================

-- ---------- 1. Багана нэмэх ----------
alter table public.listings add column if not exists views integer not null default 0;
alter table public.listings add column if not exists likes integer not null default 0;

comment on column public.listings.views is 'Зар руу хэдэн удаа орж үзсэн (detail хуудас нээгдэх бүрд +1)';
comment on column public.listings.likes is 'Хэдэн хүн ❤️ дарсан (нэмэх/хасах нь /api/listings/[id]/like)';

-- ---------- 2. Атомар нэмэгдүүлэх функцууд ----------
-- ЯАГААД: JS дээр «уншиж → +1 → бичих» нь зэрэгцээ хүсэлтэд алдаа өгдөг
-- (2 хүн зэрэг харвал 1 л нэмэгдэнэ). SQL дотор `views = views + 1` нь атомар.
--
-- ⚠️ EXECUTE-ыг REVOKE хийсэн: тоолуурыг ЗӨВХӨН сервер (service_role) дуудна.
--    Ингэснээр хэн ч anon key-ээр тоог хиймлээр хөөрөгдөж чадахгүй.
create or replace function public.listing_bump_views(p_id uuid)
returns integer
language sql
as $$
  update public.listings
     set views = views + 1
   where id = p_id
  returning views;
$$;

create or replace function public.listing_bump_likes(p_id uuid, p_delta integer)
returns integer
language sql
as $$
  update public.listings
     set likes = greatest(0, likes + p_delta)   -- 0-ээс доош болохгүй
   where id = p_id
  returning likes;
$$;

revoke all on function public.listing_bump_views(uuid) from public, anon, authenticated;
revoke all on function public.listing_bump_likes(uuid, integer) from public, anon, authenticated;
