-- ============================================================
-- 0032_search_history.sql — 🕐 «ХАЙЛТЫН ТҮҮХ» (сүүлийн хайлтууд)
--
-- ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-07): «Мессеж icon-ий дараа цагийн icon
--   оруулаад, тэр рүү орход тухайн хэрэглэгчийн хайлтуудыг КАРТ хэлбэрээр
--   харуул — карт дээр категорийн сүүлийн нэр (ж: Цахилгаан бараа →
--   «Угаалгын машин»), байршил, хайсан түлхүүр үг гэх мэтийг оруул» ✓
--
-- 🎯 ЮУ ХИЙХ ВЭ:
--   Мөр бүр = «нэг хэрэглэгчийн НЭГ хайлт». Утга нь хайлтын КАНОНИК URL
--   (`/?category=sell&section=real-estate&…`) — `components/HomeClient.jsx`
--   аль хэдийн бичдэг линк. ⚠️ Шинэ багана/шүүлт/query ЗОХИОХГҮЙ ✓
--
-- ⚠️ ЯЛГАА 0031 (`saved_searches`)-ээс (ЧУХАЛ):
--   • 0031 = хэрэглэгч ГАРААР хадгална, `unique (user_id, url)`, UPDATE БАЙХГҮЙ
--   • 0032 = АВТОМАТААР бүртгэгдэнэ, `unique (user_id, key)`, UPDATE БАЙНА ✓
--     `key` = `lib/savedSearch.mjs → savedSearchKey(url)` (`page`/`view`/`sort`
--     -ыг ХАСАЖ, параметрийг эрэмбэлсэн түлхүүр) — ИЖИЛ хайлт дахин хийгдвэл
--     шинэ мөр ҮҮСЭХГҮЙ, зөвхөн `last_seen_at` ШИНЭЧЛЭГДЭНЭ (түүх хавдахаас
--     сэргийлнэ ✓). Тиймээс энэ хүснэгтэд UPDATE policy ЗААВАЛ хэрэгтэй —
--     0031-ийн «UPDATE БАЙХГҮЙ» зарчмыг энд ДАГАХГҮЙ ✗
--
-- ⚠️ АНХААР: `lib/searchHistory.js` нь (1) нэвтэрсэн бол ЭНЭ хүснэгт,
--   (2) зочин бол localStorage — хоёуланг нь дэмжинэ. Энэ миграц ОРООГҮЙ
--   ч гэсэн функц БҮРЭН ажиллана (localStorage руу чимээгүй буцна ✓);
--   зөвхөн төхөөрөмж хоорондын синхрон идэвхжихгүй.
--
-- АЖИЛЛУУЛАХ (30 секунд, idempotent):
--   npm run migration:copy 0032_search_history.sql
--   → SQL нь clipboard-д орж, Supabase SQL Editor нээгдэнэ
--   → ⌘A ⌫ (хуучин агуулгыг устга) → ⌘V → Run
-- ============================================================

-- ---------- 1. Хүснэгт ----------
create table if not exists public.search_history (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  -- Давхардлын түлхүүр (`savedSearchKey(url)` — page/view/sort хасна)
  key          text not null,
  -- Хайлтын каноник линк (`/?category=…&section=…` эсвэл `https://…/?…`)
  url          text not null,
  created_at   timestamptz not null default now(),
  -- Сүүлд хайсан цаг — upsert бүрд шинэчлэгдэнэ (жагсаалт үүгээр эрэмбэлэгдэнэ)
  last_seen_at timestamptz not null default now(),
  -- ⚠️ Нэг хэрэглэгчийн ИЖИЛ хайлтыг 2 удаа хадгалахгүй (upsert `onConflict`)
  constraint search_history_unique unique (user_id, key),
  constraint search_history_url_len check (char_length(btrim(url)) between 1 and 2000),
  constraint search_history_key_len check (char_length(btrim(key)) between 1 and 2000)
);

comment on table public.search_history is
  'Хайлтын түүх (хэрэглэгч тус бүрээр, авто-бүртгэл). lib/searchHistory.js-ийн DB горим — зочинд localStorage.';
comment on column public.search_history.url is
  'Хайлтын каноник линк (HomeClient-ийн URL эффект бичдэг). Дарахад тэр үр дүн буцна.';
comment on column public.search_history.key is
  'Давхардлын түлхүүр (savedSearchKey — page/view/sort хассан). upsert-ийн onConflict.';

-- Жагсаалтыг «хамгийн сүүлд хайснаар» нэг query-ээр зурах индекс
create index if not exists search_history_user_idx
  on public.search_history (user_id, last_seen_at desc);

-- ---------- 2. RLS — зөвхөн өөрийн мөр ----------
alter table public.search_history enable row level security;

drop policy if exists "search_history_select_own" on public.search_history;
create policy "search_history_select_own" on public.search_history
  for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "search_history_insert_own" on public.search_history;
create policy "search_history_insert_own" on public.search_history
  for insert to authenticated
  with check (auth.uid() = user_id);

-- ⚠️ 0031-ээс ЯЛГААТАЙ: UPDATE policy БАЙНА — upsert (дахин хайх) хэрэгтэй ✓
drop policy if exists "search_history_update_own" on public.search_history;
create policy "search_history_update_own" on public.search_history
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "search_history_delete_own" on public.search_history;
create policy "search_history_delete_own" on public.search_history
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---------- 3. Эрхүүд ----------
-- ⚠️ `revoke` ХЭРЭГТЭЙ: Supabase нь public схемд шинэ хүснэгт үүсэхэд
--    anon/authenticated-д DEFAULT PRIVILEGES-ээр БҮТЭН эрх өгдөг тул
--    эхлээд буцааж аваад дараа нь шаардлагатайг л олгоно ✓
revoke all on public.search_history from anon;
grant select, insert, update, delete on public.search_history to authenticated;

-- ---------- 4. ШАЛГАХ (сонголтоор) ----------
--   select count(*) from public.search_history;
--   select tablename, policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'search_history'
--    order by policyname;
