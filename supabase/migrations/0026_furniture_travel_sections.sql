-- ============================================================
-- 0026_furniture_travel_sections.sql
-- 🛋️ «Тавилга» + 🧳 «Аяны бараа» = 1-Р ТҮВШНИЙ 2 ШИНЭ ХЭСЭГ
-- ============================================================
-- 🎯 ЗОРИЛГО (хэрэглэгчийн хүсэлт, 2026-09-30 (5)):
--    «Тавилга болон Аяллын хэрэгсэл -ийг 1-р Category болго.
--     Аяллын хэрэгсэл -ийг Аяны бараа нэртэй болго»
--
-- 📐 ЮУ ӨӨРЧЛӨГДӨВ (`lib/locationData.js` → `SECTIONS`):
--    ① 🛋️ `furniture` — ШИНЭ ХЭСЭГ «**Тавилга**» (13 дэд төрөл).
--       ⚠️ Өмнө нь (2026-09-30 (2)) энэ нь 🛋️ `home` хэсгийн 3 дахь түвшний
--       БҮЛЭГ байв (`HOME_SUBTYPE_GROUPS[0]` «Тавилга»). Бүлэг нь DB-д
--       ХАДГАЛАГДАХГҮЙ (зөвхөн навигаци) тул тэр 13 дэд төрлийн зар
--       `section = 'home'` гэж хадгалагдсан байна → энэ migration
--       `'furniture'` рүү ШИЛЖҮҮЛНЭ ✓
--    ② 🧳 `travel` — ШИНЭ ХЭСЭГ «**Аяны бараа**» (12 дэд төрөл).
--       ⚠️ Өмнө нь (2026-09-30 (4)) энэ нь ⚽ `hobby` хэсгийн 3 дахь түвшний
--       «Аяллын хэрэгсэл» БҮЛЭГ байв → тэр 12 дэд төрлийн зарыг `'travel'`
--       руу ШИЛЖҮҮЛНЭ ✓
--       ✏️ ХЭСГИЙН НЭР «Аяллын хэрэгсэл» → «**Аяны бараа**».
--          ⚠️ DB-д хэсгийн НЭР хадгалагддаггүй (зөвхөн `section` утга) тул
--          нэр солиход SQL ШААРДЛАГАГҮЙ ✓ (`0025`-ын «Амралт, спорт, хобби» →
--          «Аялал, Спорт, Хобби»-ийн ЯГ ИЖИЛ зарчим)
--    ③ 🧺 `home` («Гэр ахуйн бараа») ба ⚽ `hobby` («Аялал, Спорт, Хобби») нь
--       ХЭВЭЭР — зөвхөн дэд төрлийн тоо нь 22 → **9** ба 18 → **6** болов
--       (3 дахь түвшин БҮРЭН ХАСАГДАВ: `subtypeGroups` байхгүй ✓)
--
-- ⚠️ CHECK CONSTRAINT (ЗААВАЛ — эс бөгөөс seed/form дээр 23514 алдаа гарна):
--    `0016`/`0019`/`0021`/`0023`-д `listings_section_valid` нь ЗӨВХӨН 10 утгыг
--    зөвшөөрдөг байв → энэ migration нь **12 утгатайгаар ДАХИН үүсгэнэ** ✓
--    (`lib/locationData.js`-д хэсэг нэмэх нь ХАНГАЛТГҮЙ: тэр нь зөвхөн UI)
--    ⚠️ УРЬДЧИЛСАН НӨЦӨЛ: `0016_listing_sections.sql` ажилласан байх
--       (`0019`/`0021`/`0023` ажиллаагүй байсан ч энэ migration зөв ажиллана —
--        constraint-ыг бүтнээр нь шинэчилж байгаа тул ✓)
--
-- 📊 ХАМРАХ UPDATE-үүд (зар УСТГАХГҮЙ ✓ — зөвхөн `section` шилжинэ):
--    | ХУУЧИН `section` | ШИНЭ `section` | ХАМРАХ `property_type` |
--    |------------------|----------------|------------------------|
--    | `home`           | **`furniture`**| Зочны өрөөний · Унтлагын өрөөний · Гал тогооны · Үүдний өрөөний · Оффисын тавилга · Буйдан, кресло · Ор, матрас · Шкаф, комод, авдар · Ширээ, сандал · Тавиур, полк · Толь · Сейф · Бусад (13) |
--    | `hobby`          | **`travel`**   | Аяны гэрэл, power bank · Аяны хоолны хэрэгсэл · Аяны ор гудас · Аяны ширээ сандал · Аяны цүнх, чемодан · Аяны цахилгаан хэрэгсэл · Бассейн, зөөврийн душ · Завь ба дагалдах хэрэгсэл · Майхан, сүүдрэвч · Нүдний дуран, телескоп · Уулын хэрэгсэл · Бусад (12) |
--
-- ⚠️ `property_type` нэр БҮГД ХЭВЭЭР (1 ч үсэг солигдохгүй) → `dedupe_key`
--    (0014) ХӨНДӨГДӨХГҮЙ ✓ — ГАНЦ үл хамаарах зүйл нь доорх ④ (хуучин
--    «Аяллын хэрэгсэл» → «Бусад») — тэнд `property_type` солигдоно.
--
-- ⚠️ 0025-ТЭЙ ХАРИЛЦАА: `0025_hobby_travel_groups.sql` нь «Аяллын хэрэгсэл»
--    (хуучин хавтгай дэд төрөл) зарыг `'Бусад'` болгодог байсан. Энэ
--    migration мөн адил зүйлийг ХИЙНЭ (④) боловч «Бусад» нь одоо 🧳 `travel`
--    хэсэгт байх тул `section`-ыг ч хамт сольж байна → 0025-ыг ажиллуулах
--    ШААРДЛАГАГҮЙ ✓ (ажиллуулсан байсан ч үр дүн ЯГ ИЖИЛ — ④ нь 0 мөр
--    хөндөнө ✓ идемпотент)

-- ---------- ① CHECK CONSTRAINT: 10 → 12 утга ----------
alter table public.listings drop constraint if exists listings_section_valid;

alter table public.listings add constraint listings_section_valid
  check (section in (
    'real-estate', 'auto', 'jobs', 'computers', 'home', 'electric',
    'hobby', 'services', 'construction', 'equipment',
    -- 🆕 2026-09-30 (5): 1-р түвшний 2 ШИНЭ хэсэг
    'furniture', 'travel'
  ));

comment on column public.listings.section is
  'Зарын ХЭСЭГ (0016, 0019, 0021, 0023, 0026): real-estate | auto | jobs | '
  'computers | home | electric | hobby | services | construction | equipment | '
  'furniture | travel. ⚠️ 🛋️ «Тавилга» (furniture) ба 🧳 «Аяны бараа» (travel) '
  'нь 0026-д нэмэгдэв. Утгууд нь `lib/locationData.js` → SECTIONS-тэй ЯГ '
-- ---------- ② 🛋️ «ТАВИЛГА»: home → furniture (13 дэд төрөл) ----------
-- ⚠️ `property_type` НЭР ХЭВЭЭР — зөвхөн `section` шилжинэ. `dedupe_key`
--    (0014) нь `section`-ыг АГУУЛДАГГҮЙ (`property_type|city|district|khoroo|
--    address_detail|rooms|area`) тул триггер шалгалт ХИЙХГҮЙ ✓ (0014
--    ажиллаагүй байсан ч асуудалгүй — үр дүн ижил ✓)
update public.listings
   set section = 'furniture'
 where section = 'home'
   and property_type in (
     'Зочны өрөөний', 'Унтлагын өрөөний', 'Гал тогооны', 'Үүдний өрөөний',
     'Оффисын тавилга', 'Буйдан, кресло', 'Ор, матрас', 'Шкаф, комод, авдар',
     'Ширээ, сандал', 'Тавиур, полк', 'Толь', 'Сейф',
     -- ⚠️ «Бусад» нь ЗӨВХӨН «Тавилга» хэсэгт (хэрэглэгчийн 13 дахь мөр);
     --    🧺 `home`-д «Бусад» БАЙХГҮЙ ✓
     'Бусад'
   );

-- ---------- ③ 🧳 «АЯНЫ БАРАА»: hobby → travel (12 дэд төрөл) ----------
update public.listings
   set section = 'travel'
 where section = 'hobby'
   and property_type in (
     'Аяны гэрэл, power bank', 'Аяны хоолны хэрэгсэл', 'Аяны ор гудас',
     'Аяны ширээ сандал', 'Аяны цүнх, чемодан', 'Аяны цахилгаан хэрэгсэл',
     'Бассейн, зөөврийн душ', 'Завь ба дагалдах хэрэгсэл', 'Майхан, сүүдрэвч',
     'Нүдний дуран, телескоп', 'Уулын хэрэгсэл',
     'Бусад'
   );

-- ---------- ④ ⚠️ ХУУЧИН ХАВТГАЙ «Аяллын хэрэгсэл» (0025-ыг орлоно) ----------
-- 2026-09-30 (4)-өөс өмнө ⚽ `hobby`-гийн нэг дэд төрөл нь ХАВТГАЙ
-- «Аяллын хэрэгсэл» байв (7 утгын нэг). ②③-ын дараа тэр зарууд нь
-- `section = 'hobby'`, `property_type = 'Аяллын хэрэгсэл'` хэвээр үлдэнэ
-- (шинэ модонд ийм дэд төрөл БАЙХГҮЙ) → хамгийн ойр утга болох «Бусад»
-- руу шилжүүлж, 🧳 `travel` хэсэгт оруулна ✓
--   ⚠️ ЯАГААД «Бусад»: эдгээр зарын БОДИТ дэд төрөл (майхан, чемодан,
--      power bank…) тодорхойгүй тул аль нэг рүү дур мэдэн шилжүүлэх нь
--      БУРУУ ✗ (`0025`-ын ижил үндэслэл) — «Бусад» нь 🧳 хэсгийн 12 дахь
--      (хамгийн ерөнхий) item ✓
--   ⚠️ `property_type` СОЛИГДОНО → `dedupe_key` (0014) ч солигдоно →
--      **0014-ийн ӨМНӨ** ажиллуулахыг ЗӨВЛӨНӨ (0022/0025-тай ижил дэг).
--      Хэрэв 0014 аль хэдийн орсон бөгөөд `23505` гарвал:
--        alter table public.listings disable trigger listings_prevent_duplicate;
--        --  ... энэ migration-ыг дахин ажиллуулна ...
--        alter table public.listings enable trigger listings_prevent_duplicate;
--   ℹ️ `0025` ажилласан байсан бол энэ UPDATE 0 мөр хөндөнө ✓ (идемпотент)
update public.listings
   set section = 'travel', property_type = 'Бусад'
 where section = 'hobby'
   and property_type = 'Аяллын хэрэгсэл';

-- ============================================================
-- ✅ ШАЛГАХ (migration-ийн дараа SQL Editor-т ажиллуулна)
-- ============================================================
-- ① Хэсэг тус бүрийн зар (хүлээгдэж буй: furniture ≈ 130, travel ≈ 70-80,
--    home ≈ 90, hobby ≈ 60 — demo өгөгдөл дээр):
--    select section, count(*) from public.listings
--     where section in ('furniture', 'travel', 'home', 'hobby')
--     group by section order by section;
--
-- ② Дэд төрлийн хуваарилалт (шинэ хэсгүүдэд ХУУЧИН зарууд шилжсэн эсэх):
--    select property_type, count(*) from public.listings
--     where section = 'furniture' group by property_type order by 1;
--    select property_type, count(*) from public.listings
--     where section = 'travel' group by property_type order by 1;
--
-- ③ ⚠️ «Хөрөнгөгүй» үлдэгдэл (0 мөр байх ЁСТОЙ):
--    select section, property_type, count(*) from public.listings
--     where section = 'hobby' group by 1, 2 order by 2;
--    -- (зөвхөн 6 дэд төрөл харагдах ёстой: Загас ан агнуур · Ном, сонин,
--    --  сэтгүүл · Спортын хэрэгсэл · Хөгжмийн зэмсэг · Цуглуулга ·
--    --  Унадаг дугуй, сэлбэг — өөр юу ч БАЙХГҮЙ ✓)
--    select property_type, count(*) from public.listings
--     where section = 'home' group by 1 order by 1;
--    -- (зөвхөн 9 утга: Абажур… · Угаалгын өрөө… · Гал тогооны хэрэгсэл… ·
--    --  Гэрийн чимэглэл… · Хивс… · Цагаан хэрэглэл… · Хөшиг… · Зуух… · Өлгүүр)
--
-- ④ CHECK constraint 12 утгатай эсэх:
--    select pg_get_constraintdef(oid) from pg_constraint
--     where conname = 'listings_section_valid';
--
-- ℹ️ Дараа нь демо өгөгдлийг шинэ хэсгүүдээр (13 × 10 = 130, 12 × 10 = 120)
--    болон хуучин 2 хэсгээр (9 × 10 = 90, 6 × 10 = 60) шинэчилнэ:
--      npm run seed:sections -- 88093663 --section=furniture
--      npm run seed:sections -- 88093663 --section=travel
--      npm run seed:sections -- 88093663 --section=home
--      npm run seed:sections -- 88093663 --section=hobby
--    ⚠️ Энэ migration-ГҮЙ бол seed дээр
--       `23514 check constraint "listings_section_valid"` алдаа гарна ✗
--
-- ⚠️ БУЦААХ (rollback) — хэрэв шаардлагатай бол:
--    update public.listings set section = 'home'  where section = 'furniture';
--    update public.listings set section = 'hobby' where section = 'travel'
--      and property_type <> 'Аяллын хэрэгсэл';
--    alter table public.listings drop constraint if exists listings_section_valid;
--    alter table public.listings add constraint listings_section_valid
--      check (section in ('real-estate', 'auto', 'jobs', 'computers', 'home',
--        'electric', 'hobby', 'services', 'construction', 'equipment'));
