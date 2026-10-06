-- ============================================================
-- 0031_saved_searches.sql — 🔖 «ХАДГАЛСАН ХАЙЛТ» (Таалагдсан хайлтууд)
--
-- ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-06, unegui.mn-ийн жишээ зурагтай):
--   «unegui.mn шиг хайлтаа гоё хадгалдаг болъё» → хэрэглэгч хайлтын
--   шүүлтээ хадгалаад, дараа нь нэг дарахад тэр үр дүнгээ буцаж харна ✓
--
-- 🎯 ЮУ ХИЙХ ВЭ:
--   Мөр бүр = «нэг хэрэглэгчийн НЭГ хадгалсан хайлт». Хадгалах утга нь
--   хайлтын КАНОНИК URL (`/?category=sell&section=real-estate&…`) —
--   `components/HomeClient.jsx` аль хэдийн бичдэг хуваалцах боломжтой линк.
--   ⚠️ Тиймээс шинэ багана/шүүлт/query ЗОХИОХГҮЙ — зөвхөн линк хадгална ✓
--
-- ⚠️ АНХААР: `lib/savedSearches.js` нь (1) нэвтэрсэн бол ЭНЭ хүснэгт,
--   (2) зочин бол localStorage — хоёуланг нь дэмжинэ. Энэ миграц ОРООГҮЙ
--   ч гэсэн функц БҮРЭН ажиллана (localStorage руу чимээгүй буцна ✓);
--   зөвхөн төхөөрөмж хоорондын синхрон идэвхжихгүй.
--
-- АЖИЛЛУУЛАХ (30 секунд, idempotent):
--   npm run migration:copy 0031_saved_searches.sql
--   → SQL нь clipboard-д орж, Supabase SQL Editor нээгдэнэ
--   → ⌘A ⌫ (хуучин агуулгыг устга) → ⌘V → Run
-- ============================================================

-- ---------- 1. Хүснэгт ----------
create table if not exists public.saved_searches (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  -- Хайлтын каноник линк (`/?category=…&section=…` эсвэл `https://…/?…`)
  url        text not null,
  created_at timestamptz not null default now(),
  -- ⚠️ Нэг хэрэглэгч ижил линкийг 2 удаа хадгалахгүй (UI давхардлыг
  --    `lib/savedSearch.mjs → savedSearchKey()`-ээр урьдчилан барьдаг ч
  --    DB-ийн энэ хязгаар нь зэрэгцээ хүсэлтийн сүлжээ ✓)
  constraint saved_searches_unique unique (user_id, url),
  constraint saved_searches_url_len check (char_length(btrim(url)) between 1 and 2000)
);

comment on table public.saved_searches is
  'Хадгалсан хайлтууд (хэрэглэгч тус бүрээр). lib/savedSearches.js-ийн DB горим — зочинд localStorage.';
comment on column public.saved_searches.url is
  'Хайлтын каноник линк (HomeClient-ийн URL эффект бичдэг). Дарахад тэр үр дүн буцна.';

-- Жагсаалтыг «шинэ нь эхэнд» нэг query-ээр зурах индекс
create index if not exists saved_searches_user_idx
  on public.saved_searches (user_id, created_at desc);

-- ---------- 2. RLS — зөвхөн өөрийн мөр ----------
alter table public.saved_searches enable row level security;

drop policy if exists "saved_searches_select_own" on public.saved_searches;
create policy "saved_searches_select_own" on public.saved_searches
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "saved_searches_insert_own" on public.saved_searches;
create policy "saved_searches_insert_own" on public.saved_searches
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "saved_searches_delete_own" on public.saved_searches;
create policy "saved_searches_delete_own" on public.saved_searches
  for delete to authenticated
  using (auth.uid() = user_id);

-- ⚠️ UPDATE policy БАЙХГҮЙ (санаатай) — хадгалсан хайлтыг «засах» гэж
--    байдаггүй, зөвхөн нэмэх (insert) эсвэл устгах (delete) (`favorites`-ийн адил)

-- ---------- 3. Эрхүүд ----------
-- ⚠️ `revoke` ХЭРЭГТЭЙ: Supabase нь public схемд шинэ хүснэгт үүсэхэд
--    anon/authenticated-д DEFAULT PRIVILEGES-ээр БҮТЭН эрх өгдөг тул
--    эхлээд буцааж аваад дараа нь шаардлагатайг л олгоно ✓
revoke all on public.saved_searches from anon;
revoke update on public.saved_searches from authenticated;
grant select, insert, delete on public.saved_searches to authenticated;

-- ---------- 4. ШАЛГАХ (сонголтоор) ----------
--   select count(*) from public.saved_searches;
--   select tablename, policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'saved_searches'
--    order by policyname;
