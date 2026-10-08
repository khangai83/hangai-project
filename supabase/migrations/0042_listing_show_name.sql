-- ============================================================
-- 0042_listing_show_name.sql — 👤 «ПРОФАЙЛ НЭРЭЭ ЗАР ДЭЭР ГАРГАХ УУ?»
--
-- ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-08 (71)): «Зар нийтлэх үед Профайл нэрээ зар
--   дээрээ гаргах үгүйг асуудаг болох. Үүнийг нэр оруулах хэсгийн доор
--   оруулах» ✓ — мөн «Үгүй» гэвэл «зар дээр нэр ОГТ гарахгүй — «Холбоо барих
--   хүн» болж, профайл зураг ч гарахгүй (утас/мессеж хэвээр)».
--
-- ⚠️ 0017 (`profiles.show_identity`) нь ПРОФАЙЛ тус бүрийн дүрэм байсан —
--    ЭНЭ нь ЗАР тус бүрийн (per-listing) дүрэм: нэг хэрэглэгч нэг зар дээр
--    нэрээ харуулаад, нөгөө дээр (ж: байгууллагын өмнөөс) харуулахгүй
--    байж болно ✓
--
-- 🎯 ЮУ ХИЙХ ВЭ: `listings.show_name boolean not null default true`
--    ① `true` (анхдагч) → одоогийн зан төлөв ХЭВЭЭР: карт/дэлгэрэнгүй дээр
--       `contact_name` → `display_name` → «Холбоо барих хүн» дараалал ✓
--    ② `false` → нэр ба профайл зураг ОГТ ХАРАГДАХГҮЙ («Холбоо барих хүн»),
--       утас/мессеж ХЭВЭЭР ✓. ⚠️ `contact_name` нь DB-д ХЭВЭЭР хадгалагдана
--       (хэрэглэгч дараа нь «Тийм» болговол нэр нь буцаж гарна ✓)
--
-- ⚠️ ХУУЧИН ЗАРУУД: `default true` тул бүгд өмнөх шигээ харагдана ✓
--    (`show_name is null`/багана огтоос байхгүй орчинд ч клиент тал
--     `listing.show_name !== false`-ээр «харагдана» гэж уншина ✓)
--
-- ⚠️ RLS/POLICY ХӨНДӨӨГДӨХГҮЙ — зөвхөн ШИНЭ багана (select/insert/update нь
--    `listings_*` policy-гоор ХЭВЭЭР зохицуулагдана ✓)
--
-- АЖИЛЛУУЛАХ (30 секунд, idempotent):
--   npm run migration:copy 0042_listing_show_name.sql
--   → SQL нь clipboard-д орж, Supabase SQL Editor нээгдэнэ
--   → ⌘A ⌫ (хуучин агуулгыг устга) → ⌘V → Run
-- ============================================================

-- ---------- 👤 ЗАР ТУС БҮРИЙН «НЭР ХАРУУЛАХ» ТУГ ----------
alter table public.listings
  add column if not exists show_name boolean not null default true;

comment on column public.listings.show_name is
  '👤 Зар дээр нэр/профайл зургийг харуулах эсэх (per-listing, 2026-10-08 (71)). true (анхдагч) = contact_name → display_name → «Холбоо барих хүн»; false = нэр, профайл зураг ОГТ гарахгүй (зөвхөн утас/мессеж). Форм: components/AddListingClient.jsx (Нэр талбарын доор), харагдац: ListingDetailClient/ListingCard, хадгалалт: lib/queries.js → listingPayloadToRow (showName → show_name).';

-- ---------- ШАЛГАХ (сонголтоор) ----------
--   select show_name, count(*) from public.listings group by 1;
--   select id, title, contact_name, show_name from public.listings
--    order by created_at desc limit 5;
--   -- update public.listings set show_name = false where id = '<uuid>';
