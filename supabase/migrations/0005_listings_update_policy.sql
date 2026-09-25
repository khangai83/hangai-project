-- ============================================================
-- 0005_listings_update_policy.sql — Зар ЗАСАХ боломж нээх
--
-- ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ:
--   0001_schema.sql нь `listings` хүснэгтэд select / insert / delete policy
--   үүсгэсэн БОЛОВЧ **update policy БАЙХГҮЙ**. RLS идэвхтэй үед policy байхгүй
--   бол UPDATE нь чимээгүйгээр 0 мөр буцаадаг тул «зар засах» ажиллахгүй.
--
-- Ажиллуулах: Supabase Dashboard → SQL Editor → (энэ файлыг) Run.
-- Дахин ажиллуулж болно (idempotent).
-- ============================================================

-- Зөвхөн өөрийн зарыг засах боломжтой
drop policy if exists "listings_update" on public.listings;
create policy "listings_update" on public.listings
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant update on public.listings to authenticated;

-- ============================================================
-- (Сонголтоор) ИРЭЭДҮЙД: «таалагдсан зарууд»-ыг DB-д хадгалах бол
-- ------------------------------------------------------------
-- 👉 ЭНЭ БЛОК ОДОО ТУСДАА ФАЙЛ БОЛСОН:
--    supabase/migrations/0013_favorites.sql
--    Ажиллуулах: node scripts/setup-migration.js 0013_favorites.sql
--    (Доорх хуучин хувилбарыг зөвхөн түүхэн лавлагаа болгож үлдээв.)
-- ------------------------------------------------------------
-- Одоогоор таалагдсан зарууд нь browser-ийн localStorage-д хадгалагдаж
-- байна (lib/favorites.js) — сервер тохиргоо шаардахгүй. Хэрэв олон
-- төхөөрөмж дээр синхрон болгохыг хүсвэл доорх хэсгийг ажиллуулж,
-- lib/favorites.js-ийг DB хувилбар руу сольж болно.
-- ============================================================
-- create table if not exists public.favorites (
--   user_id    uuid not null references auth.users (id) on delete cascade,
--   listing_id uuid not null references public.listings (id) on delete cascade,
--   created_at timestamptz not null default now(),
--   primary key (user_id, listing_id)
-- );
-- alter table public.favorites enable row level security;
-- drop policy if exists "favorites_select_own" on public.favorites;
-- create policy "favorites_select_own" on public.favorites
--   for select using (auth.uid() = user_id);
-- drop policy if exists "favorites_insert_own" on public.favorites;
-- create policy "favorites_insert_own" on public.favorites
--   for insert with check (auth.uid() = user_id);
-- drop policy if exists "favorites_delete_own" on public.favorites;
-- create policy "favorites_delete_own" on public.favorites
--   for delete using (auth.uid() = user_id);
-- grant select, insert, delete on public.favorites to authenticated;
