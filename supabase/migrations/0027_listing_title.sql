-- ============================================================
-- 0027_listing_title.sql — «ЗАРЫН ГАРЧИГ» (title) багана
--
-- Хэрэглэгчийн хүсэлт (2026-10-02): «Бүх зард Зарын гарчиг гэдэг утга
-- оруулахаа мартсан байна. Тэр нь зарын карт дээр Үнэ мэдээллийн доор bold
-- font-той, бас Үнээс бага зэрэг жижиг харагдах юм.»
--
-- ⚠️ Өмнө нь зарын «гарчиг» гэсэн ойлголт ОГТ БАЙГААГҮЙ: `property_type`
--    («Орон сууц») ба `formatAddress()` (хороо → дүүрэг → хот) нь автомат
--    утга, `description` нь урт тайлбар байв ⇒ хэрэглэгчийн өөрөө бичсэн
--    товч нэр (ж: «3 өрөө байр, Баянгол, 16-р байр») байхгүй байв.
--
-- 📍 ХААНА ХАРАГДАХ ВЭ: зарын карт (`components/ListingCard.jsx`) — үнэ ба
--    «Үнэ тохирно» мөрийн ЯГ ДОР, `font-bold` + үнээс 1 алхам жижиг
--    (`text-base` = 16px vs үнэ `text-lg` = 18px) ✓ (`lib/format.js` →
--    `listingTitle()`, хоосон бол мөр ОГТ ГАРАХГҮЙ).
--    ⚠️ Хуучин зарууд (гарчиг `null`) ХӨНДӨГДӨХГҮЙ — DB-д утга бичихгүй
--    (хэрэглэгчийн шийдвэр: «гарчиг байхгүй зарууд дээр карт дээр мөр
--    гарахгүй»), backfill/UPDATE ХИЙХГҮЙ ✓
--    ⚠️ Формд «Зарын гарчиг» нь 3-Р АЛХАМ (📋 Дэлгэрэнгүй) дээр БҮХ хэсэгт
--    (үл хөдлөх, авто, ажил …) харагдана; шинэ зард ЗААВАЛ, засах горимд
--    заавал биш (хуучин зарууд дээр багана хоосон байж болно ✓)
--
-- ⚠️ `dedupe_key` (0014_listing_dedupe.sql) ХӨНДӨГДӨХГҮЙ — гарчиг нь
--    `description`/үнэ/зураг шиг «дахин оруулахад тойрох» талбар тул
--    давхардлын шалгалтад ОРОХГҮЙ ✓
--
-- Supabase Dashboard → SQL Editor-т ажиллуулах (эсвэл `supabase db push`)
-- ============================================================

alter table public.listings
  add column if not exists title text;  -- Зарын гарчиг (ж: «3 өрөө байр, Баянгол»)

-- Урт хязгаар — UI-тай ЯГ ИЖИЛ (lib/format.js → MAX_LISTING_TITLE_LENGTH = 120)
alter table public.listings drop constraint if exists listings_title_len;
alter table public.listings add constraint listings_title_len
  check (title is null or char_length(btrim(title)) between 1 and 120);

comment on column public.listings.title is
  'Зарын гарчиг — хэрэглэгчийн бичсэн товч нэр (карт дээр үнийн доор харагдана). Хоосон бол карт дээр мөр гарахгүй.';

-- ⚠️ DDL-ийн дараа PostgREST-ийн schema cache хуучирдаг → шинэ багана
--    `insert`/`select` дээр «Could not find the ''title'' column» алдаа өгнө ✗
notify pgrst, 'reload schema';
