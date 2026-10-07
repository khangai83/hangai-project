-- ============================================================
-- 0038_user_blocks.sql — 🚫 ХЭРЭГЛЭГЧ БЛОКЛОХ (админ)
-- ============================================================
-- 🎯 ЗОРИЛГО (хэрэглэгчийн хүсэлт):
--   «admin хэрэглэгч тухайн хэрэглэгчийг block хийх боломжтой байх.
--    Ингэснээр түүний зар нийтэд харагдахгүй болох ба системд нэвтрэх
--    боломжгүй болох юм»
--
-- 📐 ХИЙЦ — ХОЁР ҮР ДАГАВАР:
--   ① ЗАР НИЙТЭД ХАРАГДАХГҮЙ → `profiles.blocked = true` + `listings_select`
--      RLS бодлогыг СОЛИНО (блоклогдсон эзний зар ЯМАР Ч нийтийн query-д
--      гарахгүй: нүүр, хайлт, дэлгэрэнгүй, нийтлэгчийн хуудас, санал API …).
--      ⚠️ Админ (service_role) RLS-ыг ТОЙРДОГ тул зарыг ХАРАХ/УСТГАХ
--         боломжтой хэвээр ✓ (`/admin/listings`).
--   ② СИСТЕМД НЭВТРЭХГҮЙ → энэ нь SQL биш, Supabase-ийн БАН
--      (`admin.auth.admin.updateUserById(id, { ban_duration })`) —
--      `lib/adminAuth.js → setUserBlocked()`-д хийнэ. Ban-тай хэрэглэгч
--      `signInWithPassword`-аар НЭВТЭРЧ ЧАДАХГҮЙ ✓.
--
-- ⚠️ ХОЁР УТГА НЬ ЗЭРЭГ БИЧИГДЭНЭ (`setUserBlocked`): `profiles.blocked`
--    (харагдалт) ба `auth.users.banned_until` (нэвтрэлт). Аль нэг нь
--    дутуу бол үр дагавар нь дутуу болно — тиймээс ХАМТ бичнэ ✓.
--
-- ⚠️ АЖИЛЛУУЛАХ: Supabase Dashboard → SQL Editor → бүтнээр нь RUN.
--    Туслах: `npm run migration:copy 0038_user_blocks.sql`
--    Дахин ажиллуулж болно (idempotent).
-- ============================================================

-- ---------- 1. profiles.blocked / blocked_at ----------
alter table public.profiles add column if not exists blocked    boolean;
alter table public.profiles add column if not exists blocked_at timestamptz;

-- ⚠️ Одоо байгаа хэрэглэгчид: блоклогдоогүй (`false`)
update public.profiles set blocked = false where blocked is null;

alter table public.profiles alter column blocked set default false;
alter table public.profiles alter column blocked set not null;

comment on column public.profiles.blocked is
  'Админ блоклосон эсэх (0038). true үед: ① зар нь `listings_select` RLS-ээр '
  'НИЙТЭД ХАРАГДАХГҮЙ, ② Supabase-ийн бан (`auth.users.banned_until`) нь '
  'нэвтрэлтийг хориглоно. Хоёулаа `lib/adminAuth.js → setUserBlocked()`-д ХАМТ '
  'бичигдэнэ.';
comment on column public.profiles.blocked_at is
  'Блоклосон огноо (0038). Блокыг авахад NULL болно.';

-- Хурдны индекс — `is_user_blocked` нь зөвхөн `blocked = true` мөрийг хайна.
create index if not exists profiles_blocked_idx
  on public.profiles (id) where blocked;

-- ---------- 2. Туслах функц: хэрэглэгч блоклогдсон эсэх ----------
-- ⚠️ ЯАГААД `security definer` ФУНКЦ ВЭ (RLS доторх subquery БИШ):
--   • `listings_select` бодлого нь БҮХ нийтийн query-д ажиллана. Хэрэв
--     бодлого дотор `select … from profiles` subquery бичвэл `profiles`-ийн
--     RLS дахин үнэлэгдэж, ирээдүйд `profiles`-ийн бодлого өөрчлөгдвөл
--     зарын харагдалт САНААГҮЙ эвдэрнэ ✗
--   • `security definer` функц нь эзэмшигчийн эрхээр (RLS-гүй) шууд уншина →
--     тогтвортой, хурдан, мөн хэрэглэгчийн `blocked` талбарыг ГАДНАА
--     ил гаргахгүй ✓
create or replace function public.is_user_blocked(uid uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select coalesce((select p.blocked from public.profiles p where p.id = uid), false);
$$;

grant execute on function public.is_user_blocked(uuid) to anon, authenticated;

-- ---------- 3. listings_select — блоклогдсон эзний зарыг ХАСНА ----------
-- ⚠️ 0001_schema.sql-ийн `using (true)`-г СОЛИНО. Блоклогдоогүй (эсвэл
--    профайлгүй) эзний зар нь ХУУЧИН хэвээр бүгдэд харагдана ✓
drop policy if exists "listings_select" on public.listings;
create policy "listings_select" on public.listings
  for select using (not public.is_user_blocked(user_id));

-- ---------- 4. ШАЛГАХ (сонголтоор) ----------
--   -- Блоклогдсон хэрэглэгчид:
--   select id, blocked, blocked_at from public.profiles where blocked limit 5;
--   -- Админ блоклох (туршилт — ⚠️ нэвтрэлт нь ЗӨВХӨН аппаас хийгдэх болно):
--   -- update public.profiles set blocked = true, blocked_at = now() where id = '<uuid>';
--   -- Блокыг авах:
--   -- update public.profiles set blocked = false, blocked_at = null where id = '<uuid>';
-- ============================================================
