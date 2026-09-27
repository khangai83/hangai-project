-- ============================================================
-- 0016_listing_sections.sql — ЗАРЫН ХЭСГҮҮД (Автомашин, Ажлын зар, …)
-- ============================================================
-- 🎯 ЗОРИЛГО: апп нь зөвхөн үл хөдлөхөөс гадна бусад ХЭСЭГТЭЙ болно.
--
-- 📐 ХИЙЦ:
--   • `section`     — аль үндсэн хэсэг вэ (үл хөдлөх / автомашин / …)
--   • `attrs`       — тухайн хэсгийн НЭМЭЛТ талбарууд (jsonb)
--                     ж: автомашины `{ brand: 'Toyota', year: 2021, mileage: 95200,
--                     transmission: 'Автомат', engine: '2.5', fuel: 'Хайбрид' }`
--   • `property_type` — ХЭВЭЭР: одоо «дэд төрөл» болж өргөжинө
--                       (үл хөдлөх: «Орон сууц»; авто: «Седан»; ажил: «Программист»)
--   • `category`    — ХЭВЭЭР (`sell`/`rent`). ⚠️ Шинэ хэсгүүд ихэвчлэн `sell`
--                     (борлуулалт) ашиглана; авто нь `sell`/`rent` хоёуланг
--                     (зарна / түрээслүүлнэ) ашиглана → CHECK өөрчлөх ШААРДЛАГАГҮЙ.
--
-- ⚠️ ЯАГААД jsonb вэ: хэсэг бүр өөр талбартай (авто: км/хүрд; ажил: цалин/компани;
--    компьютер: CPU/RAM…). Тусдаа багана нэмэх нь 20+ багана, форм, шүүлт
--    болгонд өөрчлөлт шаардана. jsonb нь нэг л талбараар шийднэ.
--    ⚠️ GIN индекс нь jsonb шүүлтийг (`attrs->>brand=eq.Toyota`) хурдан болгоно.
--
-- ⚠️ АЖИЛЛУУЛАХ: Supabase Dashboard → SQL Editor → бүтнээр нь RUN.
--    Туслах: `npm run migration:copy 0016_listing_sections.sql`
-- ============================================================

-- ---------- 1. Багана ----------
alter table public.listings add column if not exists section text;
alter table public.listings add column if not exists attrs   jsonb;

-- Одоо байгаа бүх зар нь үл хөдлөх (хуучин өгөгдөл) → default-оор бөглөнө
update public.listings set section = 'real-estate' where section is null;
update public.listings set attrs = '{}'::jsonb      where attrs   is null;

alter table public.listings alter column section set default 'real-estate';
alter table public.listings alter column section set not null;
alter table public.listings alter column attrs   set default '{}'::jsonb;
alter table public.listings alter column attrs   set not null;

comment on column public.listings.section is
  'Зарын үндсэн хэсэг: real-estate | auto | jobs | computers | home | services '
  '(0016). ⚠️ `property_type` нь тухайн хэсгийн ДЭД ТӨРӨЛ болно.';
comment on column public.listings.attrs is
  'Хэсэг тус бүрийн нэмэлт талбарууд (jsonb). Авто: brand/model/year/mileage/'
  'transmission/engine/fuel/drive; Ажил: company/salary/jobType/experience; '
  'Компьютер: brand/cpu/ram/storage. ⚠️ Шүүлт: `attrs->>key=eq.value`.';

-- ---------- 2. CHECK — зөвхөн зөвшөөрөгдсөн хэсгүүд ----------
alter table public.listings drop constraint if exists listings_section_valid;
alter table public.listings add constraint listings_section_valid
  check (section in ('real-estate', 'auto', 'jobs', 'computers', 'home', 'services'));

-- ---------- 3. Индексүүд ----------
-- Хэсгээр шүүж, шинээр эрэмбэлэх (үндсэн жагсаалт)
create index if not exists listings_section_idx
  on public.listings (section, created_at desc);

-- `attrs` доторх утгаар шүүх (ж: брэнд, төлөв)
-- ⚠️ `jsonb_path_ops` нь `@>` (containment) хүсэлтэд тохирно. Харин
--    PostgREST-ийн `attrs->>brand=eq.Toyota` хэлбэрийн шүүлт нь `->>`
--    оператор тул GIN-ийг АШИГЛАХГҮЙ → тэдэнд ЗОРИУЛЖ expression index хэрэгтэй.
create index if not exists listings_attrs_idx
  on public.listings using gin (attrs jsonb_path_ops);

-- Шүүлтэд хамгийн их хэрэглэгддэг 2 түлхүүр (брэнд, төлөв) — бүх хэсэгт байдаг
create index if not exists listings_attrs_brand_idx
  on public.listings ((attrs ->> 'brand'));
create index if not exists listings_attrs_condition_idx
  on public.listings ((attrs ->> 'condition'));

-- ============================================================
-- 4. ШАЛГАХ (сонголтоор)
-- ============================================================
--   select section, count(*) from public.listings group by section order by 2 desc;
--   select id, section, property_type, attrs from public.listings
--    where section <> 'real-estate' limit 10;
--
--   -- jsonb шүүлт ажиллах эсэх (ж: Toyota):
--   select count(*) from public.listings where attrs->>'brand' = 'Toyota';
-- ============================================================
