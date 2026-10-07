-- ============================================================
-- 0039_computers_notebook_single_subtype.sql
--   💻 «Компьютер»-ийн «Notebook» нь ГАНЦ дэд төрөл болов (21 брэнд ХАСАГДАВ)
-- ============================================================
-- 🎯 ЗОРИЛГО (хэрэглэгчийн хүсэлт, 2026-10-07):
--    «Notebook ний зар оруулах хэсгийн step=1 дээр брэнд сонгох хэсгийг
--     delete хийнэ үү. байхгүй болго» ⇒ `lib/locationData.js` →
--    `COMPUTER_SUBTYPE_GROUPS`-ийн «Notebook» бүлэг нь `items: []` (leaf)
--    болж, 21 брэндийн дэд төрөл ХАСАГДАВ. Одоо «Notebook» нь ӨӨРӨӨ
--    `property_type` болно (💻 «Чихэвч»-ийн ЯГ ИЖИЛ хэлбэр ✓).
--    ⚠️ Брэнд нь форм дээрх ХЭВИЙН attr талбар (`attrs.brand`) хэвээр ✓.
--
-- ⚠️ ЯАГААД ЭНЭ MIGRATION ХЭРЭГТЭЙ ВЭ:
--    ХУУЧИН заруудын `property_type` нь БРЭНДИЙН НЭР (Apple, Dell, Lenovo…)
--    байсан. Одоо «Notebook» дэд төрлөөр шүүхэд (`getSubtypes`) эдгээр зар
--    модноос ГАДУУР үлдэж, хайлт/тооллоос ХАСАГДАНА ✗ → §2 нь тэдгээрийг
--    'Notebook' болгоно ✓ (`0024_jobs_subtype_rename.sql`-ийн ЯГ ИЖИЛ
--    зарчим: зар УСТГАХГҮЙ, зөвхөн нэрийг шинэ дэд төрөл рүү шилжүүлнэ).
--    ⚠️ `attrs.brand` нь ихэвчлэн АЛЬ ХЭДИЙН хадгалагдсан (seed) — §1 нь
--       ЗӨВХӨН ХООСОН үед л `property_type`-аас бөглөнө ⇒ мэдээлэл
--       алдагдахгүй (брэнд хэвээр үлдэнэ ✓).
--
-- 📐 ХИЙЦ: ЗӨВХӨН `section = 'computers'` мөрүүдэд хүрнэ.
--    ⚠️ «Бусад» ХӨНДӨӨГДӨХГҮЙ — тэр нэр нь PS/XBox/Nintendo ба
--       Дагалдах хэрэгслийн бүлэгт Ч хүчинтэй хэвээр (модноос хасагдаагүй) ✓
--
-- ⚠️ УРЬДЧИЛСАН НӨХЦӨЛ: `0016_listing_sections.sql` (ба `listings.attrs`).
--    ⚠️ `0014_listing_dedupe.sql` орсон бол §2 нь `property_type`-ийг
--       сольсноор нэг хэрэглэгчийн 2 зар ижил dedupe түлхүүртэй болж
--       (`23505` алдаа) гарч болзошгүй — тэр үед триггерийг түр хаана:
--         alter table public.listings disable trigger listings_prevent_duplicate;
--         -- … доорх UPDATE-уудыг ажиллуул …
--         alter table public.listings enable trigger listings_prevent_duplicate;
--
-- ⚠️ АЖИЛЛУУЛАХ: Supabase Dashboard → SQL Editor → бүтнээр нь RUN.
--    Туслах: `npm run migration:copy 0039_computers_notebook_single_subtype.sql`
-- ============================================================

-- ---------- 1. Брэнд нь зөвхөн `attrs`-д байгаа эсэхийг батлах ----------
-- ⚠️ `property_type` (брэнд) нь зөвхөн бүтэн объектод л хадгалагддаг тул
--    `jsonb_set` нь БАЙХГҮЙ/`null` объектод ч аюулгүй (coalesce '' → {}) ✓
--    ⚠️ `jsonb_array_length`/`jsonb_typeof` шаардлагагүй — `coalesce(...,'{}')`
--       нь скаляр/массив байсан ч `jsonb_set`-ийг крашгүй болгоно ✓
update public.listings
   set attrs = jsonb_set(coalesce(attrs, '{}'::jsonb), '{brand}', to_jsonb(property_type), true)
 where section = 'computers'
   and property_type in (
     'Apple', 'Acer', 'Asus', 'Toshiba', 'Compaq', 'Dell', 'Dere', 'Evoo',
     'Fujitsu', 'Gateway', 'Haier', 'HP', 'Lenovo', 'LG', 'Microsoft Surface',
     'MSI', 'Samsung', 'Sony', 'Redmi', 'Razer Blade', 'Huawei'
   )
   and coalesce(attrs->>'brand', '') = '';

-- ---------- 2. Хуучин брэнд дэд төрлийг «Notebook» болгох ----------
-- ⚠️ «Бусад»-ыг ОРХИХГҮЙ (бусад бүлэгт хүчинтэй хэвээр) ✓
update public.listings
   set property_type = 'Notebook'
 where section = 'computers'
   and property_type in (
     'Apple', 'Acer', 'Asus', 'Toshiba', 'Compaq', 'Dell', 'Dere', 'Evoo',
     'Fujitsu', 'Gateway', 'Haier', 'HP', 'Lenovo', 'LG', 'Microsoft Surface',
     'MSI', 'Samsung', 'Sony', 'Redmi', 'Razer Blade', 'Huawei'
   );

-- ---------- 3. Шалгалт ----------
-- ⚠️ Дараах нь 0 мөр буцаах ЁСТОЙ — 0 БИШ бол хуучин брэнд үлдсэн байна:
--    select property_type, count(*) from public.listings
--     where section = 'computers'
--       and property_type in ('Apple', 'Acer', 'Asus', 'Toshiba', 'Compaq',
--         'Dell', 'Dere', 'Evoo', 'Fujitsu', 'Gateway', 'Haier', 'HP', 'Lenovo',
--         'LG', 'Microsoft Surface', 'MSI', 'Samsung', 'Sony', 'Redmi',
--         'Razer Blade', 'Huawei')
--     group by property_type;
--
-- ℹ️ Шилжүүлэлтийн дүн (шинэ тархалт):
--    select property_type, count(*) from public.listings
--     where section = 'computers' group by property_type order by 2 desc;
--
-- ℹ️ Дараа нь демо өгөгдөл үүсгэх (хүсвэл):
--    npm run seed:sections -- 88093663 --section=computers
-- ============================================================
