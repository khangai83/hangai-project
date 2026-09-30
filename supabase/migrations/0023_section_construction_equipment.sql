-- ============================================================
-- 0023_section_construction_equipment.sql — ШИНЭ 2 ХЭСЭГ:
--   🧱 «Барилгын материал» ба 🏭 «Тоног төхөөрөмж»
-- ============================================================
-- 🎯 ЗОРИЛГО (хэрэглэгчийн хүсэлт: «Барилгын материал … Тоног төхөөрөмж …
--    ийм 2 category орууж өгөөрэй»):
--    ТОП-ТҮВШНИЙ ШИНЭ 2 хэсэг нээв:
--      🧱 `construction` — «Барилгын материал» (23 дэд төрөл: Агааржуулалт ·
--         Барилгын багаж · Арматур, металл хийц, хэв хашмал · … · Хаалга)
--      🏭 `equipment`    — «Тоног төхөөрөмж» (20 дэд төрөл: Авто засвар, авто
--         угаалгын тоног төхөөрөмж · … · Фото студийн тоног төхөөрөмж)
--    ⚠️ Дэд төрөл нь ХАВТГАЙ (2 түвшин) — `subtypeGroups` БАЙХГҮЙ, тул панель
--    дээр бүлэг (3 дахь түвшин) ХАРАГДАХГҮЙ ✓
--    📍 Эх сурвалж: `lib/locationData.js` → `CONSTRUCTION_SUBTYPES` (23),
--    `EQUIPMENT_SUBTYPES` (20) ба `SECTIONS`-ийн 2 шинэ бичлэг.
--
-- 📐 ХИЙЦ: 0016/0019/0021-д `listings_section_valid` CHECK constraint нь
--    ЗӨВХӨН 8 утгыг зөвшөөрдөг байв (`… 'home', 'electric', 'hobby',
--    'services'`). Тэр нь ЗӨВХӨН ХАТУУ SQL дээр байдаг тул
--    (`lib/locationData.js`-д хэсэг нэмэх нь ХАНГАЛТГҮЙ) энэ migration нь
--    constraint-ыг 10 утгатайгаар ДАХИН үүсгэнэ.
--
-- ⚠️ ЭНЭ MIGRATION-ГҮЙ БОЛ: 2 хэсэг нь UI-д ХАРАГДАНА (код нь `SECTIONS`-ээс
--    уншдаг) ч, тэр хэсэгт ЗАР НЭМЭХ/SEED ХИЙХ үед
--    `23514 check constraint "listings_section_valid"` алдаа гарна ✗
--    (жишээ: `npm run seed:sections -- 88093663 --section=construction`).
--    ⚠️ УРЬДЧИЛСАН НӨХЦӨЛ: `0016_listing_sections.sql` ажилласан байх.
--
-- ✅ ӨГӨГДӨЛ ШИЛЖҮҮЛЭХ (UPDATE) ШААРДЛАГАГҮЙ — 0018/0022-оос ЯЛГААТАЙ нь:
--    ① 0018 (`auto` «Хэтчбек» → «Суудлын машин») ба 0022 (🛋️ home-ийн 10
--       хавтгай дэд төрөл → шинэ мод) нь ХУУЧИН дэд төрлийн нэрийг СОЛЬСОН
--       тул `update … set property_type = …` хийсэн.
--    ② ЭНД тийм ажил БАЙХГҮЙ: `construction` ба `equipment` нь ШИНЭ хэсэг —
--       тэдгээрт ямар ч хуучин зар байхгүй (DB-д ийм `section` утга өмнө нь
--       боломжгүй байсан ✓) → `listings`-ийн НЭГ Ч МӨР ХӨНДӨГДӨХГҮЙ ✓
--    ⚠️ Улмаар `0014_listing_dedupe.sql`-ийн `before insert OR UPDATE`
--       триггер (`listings_prevent_duplicate`) энэ migration дээр ОГТ
--       АСАХГҮЙ (мөр солигдохгүй тул `dedupe_key` дахин бодогдохгүй ✓) —
--       тиймээс дараалал нь ЧУХАЛ БИШ (0022-оос ЯЛГААТАЙ ✓)
--
-- ⚠️ АЖИЛЛУУЛАХ: Supabase Dashboard → SQL Editor → бүтнээр нь RUN.
--    Туслах: `npm run migration:copy 0023_section_construction_equipment.sql`
-- ============================================================

-- ---------- 1. Хэсгийн утгуудыг өргөтгөх (8 → 10) ----------
alter table public.listings drop constraint if exists listings_section_valid;

alter table public.listings add constraint listings_section_valid
  check (section in (
    'real-estate', 'auto', 'jobs', 'computers', 'home', 'electric',
    'hobby', 'services', 'construction', 'equipment'
  ));

comment on column public.listings.section is
  'Зарын ХЭСЭГ (0016, 0019, 0021, 0023): real-estate | auto | jobs | computers | '
  'home | electric | hobby | services | construction | equipment. ⚠️ 🧱 '
  '«Барилгын материал» (construction) ба 🏭 «Тоног төхөөрөмж» (equipment) нь '
  '0023-д нэмэгдэв. Утгууд нь `lib/locationData.js` → SECTIONS-тэй ЯГ '
  'ТААРАХ ёстой.';

-- ---------- 2. Шалгалт ----------
-- ⚠️ Дараах нь 10 утга буцаах ЁСТОЙ (constraint-ийн тодорхойлолт):
--    select pg_get_constraintdef(oid) from pg_constraint
--     where conname = 'listings_section_valid';
--
-- ℹ️ Шинэ хэсгүүдэд хэдэн зар байгааг харах (migration-ийн дараа 0 байх нь
--    ХЭВИЙН — зар нь seed/form-оор нэмэгдэнэ):
--    select section, count(*) from public.listings
--     where section in ('construction', 'equipment') group by section;
--
-- ℹ️ Дараа нь демо өгөгдөл үүсгэх (🧱 23 × 10 = 230, 🏭 20 × 10 = 200 зар):
--    npm run seed:sections -- 88093663 --section=construction
--    npm run seed:sections -- 88093663 --section=equipment
--    -- эсвэл хоёуланг нь хамт:  npm run seed:sections -- 88093663
