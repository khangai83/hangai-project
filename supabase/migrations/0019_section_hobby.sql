-- ============================================================
-- 0019_section_hobby.sql — ШИНЭ ХЭСЭГ: «Амралт, спорт, хобби»
-- ============================================================
-- 🎯 ЗОРИЛГО (хэрэглэгчийн хүсэлт):
--    unegui.mn-д байдаг «Амралт, спорт, хобби` (`/hobbi-sport/`) хэсгийг
--    нэмэв. Дэд төрлүүд (7): Аяллын хэрэгсэл · Загас ан агнуур ·
--    Ном, сонин, сэтгүүл · Спортын хэрэгсэл · Хөгжмийн зэмсэг · Цуглуулга ·
--    Унадаг дугуй, сэлбэг
--
-- 📐 ХИЙЦ:
--    0016-д `listings_section_valid` CHECK constraint нь ЗӨВХӨН 6 утгыг
--    зөвшөөрдөг байв. Тэр нь ЗӨВХӨН ХАТУУ SQL дээр байдаг тул
--    (`lib/locationData.js`-д хэсэг нэмэх нь ХАНГАЛТГҮЙ) энэ migration нь
--    constraint-ыг 7 утгатайгаар ДАХИН үүсгэнэ.
--
-- ⚠️ ЭНЭ MIGRATION-ГҮЙ БОЛ: «Амралт, спорт, хобби» хэсэг нь харагдана
--    (код SECTIONS-ээс уншдаг) ч, тэр хэсэгт ЗАР НЭМЭХ/SEED ХИЙХ үед
--    `23514 check constraint "listings_section_valid"` алдаа гарна ✗
--    (жишээ: `npm run seed:sections`).
--    ⚠️ УРЬДЧИЛСАН НӨХЦӨЛ: `0016_listing_sections.sql` ажилласан байх.
--
-- ⚠️ АЖИЛЛУУЛАХ: Supabase Dashboard → SQL Editor → бүтнээр нь RUN.
--    Туслах: `npm run migration:copy 0019_section_hobby.sql`
-- ============================================================

-- ---------- 1. Хэсгийн утгуудыг өргөтгөх ----------
alter table public.listings drop constraint if exists listings_section_valid;

alter table public.listings add constraint listings_section_valid
  check (section in (
    'real-estate', 'auto', 'jobs', 'computers', 'home', 'hobby', 'services'
  ));

comment on column public.listings.section is
  'Зарын ХЭСЭГ (0016, 0019): real-estate | auto | jobs | computers | home | '
  'hobby | services. ⚠️ «Амралт, спорт, хобби» (hobby) нь 0019-д нэмэгдэв. '
  'Утгууд нь `lib/locationData.js` → SECTIONS-тэй ЯГ ТААРАХ ёстой.';

-- ---------- 2. Шалгалт ----------
-- ⚠️ Дараах нь 7 мөр буцаах ЁСТОЙ (constraint-ийн утгууд):
--    select pg_get_constraintdef(oid) from pg_constraint
--     where conname = 'listings_section_valid';
--
-- ℹ️ «Амралт, спорт, хобби» хэсэгт зар байгаа эсэх (шинэ хэсэг тул 0 байна):
--    select count(*) from public.listings where section = 'hobby';
