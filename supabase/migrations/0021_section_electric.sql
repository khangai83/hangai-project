-- ============================================================
-- 0021_section_electric.sql — ШИНЭ ХЭСЭГ: «Цахилгаан бараа»
-- ============================================================
-- 🎯 ЗОРИЛГО (хэрэглэгчийн хүсэлт: «Цахилгаан бараа гэсэн категори нэм, бас тэр
--    категори болон subcategory-тай шүү»):
--    ⚡ ТОП-ТҮВШНИЙ шинэ хэсэг нээв. Дэд төрөл нь 3 ТҮВШНИЙ МОД
--    (`lib/locationData.js` → `ELECTRIC_SUBTYPE_GROUPS`) — 💻 «Компьютер»,
--    🛠️ «Үйлчилгээ»-гийн ЯГ ИЖИЛ загвар:
--      8 бүлэг: ТВ, Аудио + Видео · Хөргөгч, хөлдөөгч · Гал тогооны цахилгаан
--      бараа · Дижитал аппарат, Видео камер · Угаалгын машин · Тоос сорогч,
--      Хивс угаагч · Агаар шүүгч · ТЭН, Халаагуур
--      (⚠️ доод item нийт 26 — бүлэг өөрөө `property_type` болж ХАДГАЛАГДАХГҮЙ)
--
-- 📐 ХИЙЦ:
--    0016/0019-д `listings_section_valid` CHECK constraint нь ЗӨВХӨН 7 утгыг
--    зөвшөөрдөг байв. Тэр нь ЗӨВХӨН ХАТУУ SQL дээр байдаг тул
--    (`lib/locationData.js`-д хэсэг нэмэх нь ХАНГАЛТГҮЙ) энэ migration нь
--    constraint-ыг 8 утгатайгаар ДАХИН үүсгэнэ.
--
-- ⚠️ ЭНЭ MIGRATION-ГҮЙ БОЛ: «Цахилгаан бараа» хэсэг нь харагдана (код
--    SECTIONS-ээс уншдаг) ч, тэр хэсэгт ЗАР НЭМЭХ/SEED ХИЙХ үед
--    `23514 check constraint "listings_section_valid"` алдаа гарна ✗
--    (жишээ: `npm run seed:sections -- 88093663 --section=electric`).
--    ⚠️ УРЬДЧИЛСАН НӨХЦӨЛ: `0016_listing_sections.sql` ажилласан байх.
--
-- ⚠️ АЖИЛЛУУЛАХ: Supabase Dashboard → SQL Editor → бүтнээр нь RUN.
--    Туслах: `npm run migration:copy 0021_section_electric.sql`
-- ============================================================

-- ---------- 1. Хэсгийн утгуудыг өргөтгөх ----------
alter table public.listings drop constraint if exists listings_section_valid;

alter table public.listings add constraint listings_section_valid
  check (section in (
    'real-estate', 'auto', 'jobs', 'computers', 'home', 'electric',
    'hobby', 'services'
  ));

comment on column public.listings.section is
  'Зарын ХЭСЭГ (0016, 0019, 0021): real-estate | auto | jobs | computers | '
  'home | electric | hobby | services. ⚠️ «Цахилгаан бараа» (electric) нь '
  '0021-д нэмэгдэв. Утгууд нь `lib/locationData.js` → SECTIONS-тэй ЯГ '
  'ТААРАХ ёстой.';

-- ---------- 2. Хуучин «Гэр ахуйн бараа › Цахилгаан бараа» заруудыг шилжүүлэх ----------
-- ⚠️ ЯАГААД: `home` хэсгийн `subtypes`-аас «Цахилгаан бараа» ХАСАГДСАН
--    (`lib/locationData.js`) — одоо тэр нь ТУСДАА хэсэг. Хэрэв энэ UPDATE-ыг
--    хийхгүй бол хуучин зарууд нь `section='home'` хэвээр үлдэж, «Цахилгаан
--    бараа» дэд төрөл нь ТООНООС ГАДУУР (ж: шүүлтээр олдохгүй давхардсан
--    зүйл) орхигдоно ✗ (0018_auto_subtype_rename.sql-ийн зарчимтай ижил)
-- ⚠️ `property_type` нь «Бусад» болно: хуучин зарын нэр нь шинэ хэсгийн
--    дэд төрлийн жагсаалтад БАЙХГҮЙ тул хэвээр үлдээвэл форм/sidebar
--    (`getSubtypes('electric')`) тэднийг олохгүй, breadcrumb ч бүлэг
--    олж чадахгүй ✗. «Бусад» нь ТВ ба Гал тогооны бүлэгт байгаа НЭГ утга
--    (компьютерийн 3 «Бусад»-тай ижил зарчим — `findSubtypeGroup` нь
--    ЭХНИЙ бүлгийг харуулна). Зар УСТГАХГҮЙ ✓
update public.listings
   set section = 'electric',
       property_type = 'Бусад'
 where section = 'home'
   and property_type = 'Цахилгаан бараа';

-- ---------- 3. Шалгалт ----------
-- ⚠️ Дараах нь 8 мөр буцаах ЁСТОЙ (constraint-ийн утгууд):
--    select pg_get_constraintdef(oid) from pg_constraint
--     where conname = 'listings_section_valid';
--
-- ℹ️ Шилжүүлэлтийн үр дүн (шинэ хэсэгт хэдэн зар орсон бэ):
--    select section, count(*) from public.listings
--     where section = 'electric' group by section;
--
-- ℹ️ Дараа нь демо өгөгдөл үүсгэх (хүсвэл):
--    npm run seed:sections -- 88093663 --section=electric
