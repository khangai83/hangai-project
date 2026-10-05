-- ============================================================
-- 0028_listing_search.sql — 🔎 ХАЙЛТЫГ ХУРДАН болгох (pg_trgm GIN индекс)
--
-- 🎯 ЗОРИЛГО (2026-10-05, хэрэглэгчийн хүсэлт: «Хайлтыг сайжруулж өгөөч…»):
--   Үндсэн хайлт нь `title`, `description`, `city`, `district`, `khoroo`,
--   `contact_name`, `property_type` дээр `ILIKE '%…%'` (дунд таасан дэд мөр)
--   хийдэг. Тийм хэлбэрийн `LIKE` нь ЭНГИЙН btree индексийг АШИГЛАХГҮЙ ✗
--   ⇒ зарууд олширмогц бүх мөр скан → хайлт удаан.
--
-- ✅ ШИЙДЭЛ: PostgreSQL-ийн `pg_trgm` (trigram) нэмэлт модуль + GIN индекс.
--   Триграм индекс нь `%-аар эхлэхгүй` (дунд таасан) `LIKE/ILIKE`-д Ч
--   ажилладаг тул «цемент» гэсэн үг гарчиг/тайлбарын ДУНДАА байсан ч
--   миллисекундэд олдоно ✓ (хэрэглэгчийн жишиг зургийн ③-р шаардлага:
--   «Зарын гарчиг болон тайлбар дотроос "цемент" гэдэг үг орсон бүх зарыг
--   секундээс бага хугацаанд шүүж харуулах болно»).
--
-- ⚠️ ЭНЭ MIGRATION ЗААВАЛ БИШ: шинэ багана НЭМЭХГҮЙ, өгөгдөл/RLS/query-г
--    ХӨНДӨХГҮЙ — зөвхөн ХУРД нэмнэ. Ороогүй ч хайлт ЗӨВ ажиллана (зүгээр
--    л хөдөлгөөнт мөр ихэссэн үед удаан болно). Иймд build/тестэд саад
--    болохгүй ✓ (`scripts/cdp-search.mjs` шиг тест DB-гүй ч дамжина).
--
-- ⚠️ ЯАГААД Elasticsearch/Meilisearch БИШ ВЭ (хэрэглэгчийн жишиг зургийн ②):
--   · Elasticsearch/OpenSearch — тусдаа кластер, сервер, синхрончлол
--     (их зардал; жижиг/дунд маркетплейст ИЛҮҮЦЭЛ ✗)
--   · Meilisearch/Algolia — тусдаа сервис + API түлхүүр (мөнгө/тохиргоо)
--   · pg_trgm — Supabase (Postgres)-ийн ДОТОР, 0 нэмэлт зардал, 1 SQL ✓
--   Хэрэглэгчийн жишиг зургийн ③-т ч ЯГ энэ сонголтыг санал болгосон ✓
--
-- 📖 ХЭРХЭН АЖИЛЛУУЛАХ: Supabase Dashboard → SQL Editor → бүтнээр нь RUN
--    (эсвэл `npm run migration:copy 0028_listing_search.sql`)
-- ============================================================

-- ---------- 1. pg_trgm модуль (Supabase-д бэлэн байдаг) ----------
create extension if not exists pg_trgm;

-- ---------- 2. GIN (trigram) индексүүд ----------
-- ⚠️ `gin_trgm_ops` нь `ILIKE '%…%'` (дунд таасан) хайлтад тохирно.
--    `if not exists` тул ДАХИН ажиллуулж болно (idempotent ✓).

-- 🏷️ Зарын ГАРЧИГ — хамгийн их хайгддаг чөлөөт текст (2026-10-05-нд хайлтад
--    нэмэгдсэн гол талбар)
create index if not exists listings_title_trgm_idx
  on public.listings using gin (title gin_trgm_ops);

-- 📝 Зарын ТАЙЛБАР — хоёр дахь чөлөөт текст
create index if not exists listings_description_trgm_idx
  on public.listings using gin (description gin_trgm_ops);

-- 📞 ХОЛБОО БАРИХ НЭР — чөлөөт текст
create index if not exists listings_contact_name_trgm_idx
  on public.listings using gin (contact_name gin_trgm_ops);

-- 📍 Байршил / хэсэг — богино текст ч `%…%` хайлтад trgm индекс ашигтай
--    (энгийн btree нь дунд таасан `%…%`-д АЖИЛЛАХГҮЙ ✗)
create index if not exists listings_city_trgm_idx
  on public.listings using gin (city gin_trgm_ops);
create index if not exists listings_district_trgm_idx
  on public.listings using gin (district gin_trgm_ops);
create index if not exists listings_khoroo_trgm_idx
  on public.listings using gin (khoroo gin_trgm_ops);
create index if not exists listings_property_type_trgm_idx
  on public.listings using gin (property_type gin_trgm_ops);

-- ---------- 3. PostgREST-д мэдэгдэх ----------
notify pgrst, 'reload schema';

-- ============================================================
-- 4. ШАЛГАХ (сонголтоор)
-- ============================================================
--   -- Индексүүд үүссэн эсэх:
--   select indexname from pg_indexes
--    where tablename = 'listings' and indexname like '%trgm%';
--
--   -- Хайлт индекс АШИГЛАЖ байгаа эсэх (Seq Scan БИШ):
--   explain analyze
--     select id from public.listings
--      where title ilike '%цемент%' or description ilike '%цемент%';
-- ============================================================
