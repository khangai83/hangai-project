-- ============================================================
-- 0013_favorites.sql — ❤️ «Таалагдсан зарууд»-ыг DB-д хадгалах
--
-- ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ:
--   Одоогоор (lib/favorites.js) таалагдсан зарууд нь зөвхөн browser-ийн
--   localStorage-д хадгалагддаг тул нэг хүн утсаараа, компьютерээрээ
--   өөр өөр жагсаалт хардаг. Энэ хүснэгт нь «хэрэглэгч ↔ зар» холбоог
--   серверт хадгалж, олон төхөөрөмж дээр синхрон болгох суурийг тавина.
--
--   Энэ SQL нь өмнө нь 0005_listings_update_policy.sql-ийн доод хэсэгт
--   КОММЕНТ болгон бэлдсэн байсан `favorites` хүснэгтийн тодорхойлолт —
--   одоо ажиллуулах боломжтой тусдаа файл болгож гаргав.
--
-- АЖИЛЛУУЛАХ (30 секунд):
--   1) node scripts/setup-migration.js 0013_favorites.sql
--      → SQL нь clipboard-д орж, Supabase нээгдэнэ
--   2) SQL Editor дээр ⌘A ⌫ → ⌘V → Run
--      («Success. No rows returned» гарвал бэлэн)
--   Дахин ажиллуулж болно (idempotent).
--
-- ⚠️ АНХААР: зөвхөн энэ хүснэгтийг үүсгэх нь хангалтгүй — UI-д харагдахын
--   тулд lib/favorites.js-ийг DB хувилбар руу СОЛИХ шаардлагатай
--   (нэвтэрсэн бол Supabase, нэвтрээгүй бол localStorage).
-- ============================================================

-- ---------- 1. Хүснэгт ----------
-- Мөр бүр = «нэг хэрэглэгч нэг зарыг таалагдлаа»
create table if not exists public.favorites (
  user_id    uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)   -- давхардал хамгаалалт (нэг удаа л ❤️)
);

comment on table public.favorites is
  'Таалагдсан зарууд (хэрэглэгч тус бүрээр). lib/favorites.js-ийн DB хувилбар ашиглана.';

-- Хурдны индекс: «энэ зарыг хэдэн хүн таалагдсан» гэсэн асуулгад
create index if not exists favorites_listing_idx on public.favorites (listing_id);

-- ---------- 2. RLS — зөвхөн өөрийнхөө мөрийг ----------
alter table public.favorites enable row level security;

drop policy if exists "favorites_select_own" on public.favorites;
create policy "favorites_select_own" on public.favorites
  for select using (auth.uid() = user_id);

drop policy if exists "favorites_insert_own" on public.favorites;
create policy "favorites_insert_own" on public.favorites
  for insert with check (auth.uid() = user_id);

drop policy if exists "favorites_delete_own" on public.favorites;
create policy "favorites_delete_own" on public.favorites
  for delete using (auth.uid() = user_id);

-- ⚠️ UPDATE policy БАЙХГҮЙ (санаатай) — favorite-ыг «засах» гэж байдаггүй,
--    зөвхөн нэмэх (insert) эсвэл устгах (delete) боломжтой.

-- ---------- 3. Эрх ----------
grant select, insert, delete on public.favorites to authenticated;
