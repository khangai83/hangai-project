-- ============================================================
-- 0003_listing_details.sql — Орон сууцны дэлгэрэнгүй талбарууд
--
-- 1) unegui.mn загварын бүрдэл хэсгүүд (Зарах/Түрээслэх доорх 8 төрөл)
--    → хуучин property_type утгуудыг шинэ нэршил рүү шилжүүлнэ
-- 2) Орон сууцны нэмэлт мэдээлэл: ашиглалтанд орсон он, давхар,
--    нийт давхар, тагтны тоо, гараж байгаа эсэх
--
-- Supabase Dashboard → SQL Editor-т ажиллуулах (эсвэл `supabase db push`)
-- ============================================================

-- ================== 1. LISTINGS — нэмэлт талбарууд ==================
alter table public.listings
  add column if not exists build_year   integer,   -- Ашиглалтанд орсон он (ж: 2015)
  add column if not exists floor        integer,   -- Тухайн байр хэдэн давхарт
  add column if not exists total_floors integer,   -- Барилгын нийт давхар
  add column if not exists balconies    integer,   -- Тагтны тоо (1-4)
  add column if not exists has_garage   boolean;   -- Гараж байгаа эсэх

comment on column public.listings.build_year   is 'Ашиглалтанд орсон он';
comment on column public.listings.floor        is 'Тухайн байр хэдэн давхарт байрладаг';
comment on column public.listings.total_floors is 'Барилгын нийт давхар';
comment on column public.listings.balconies    is 'Тагтны тоо (1-4)';
comment on column public.listings.has_garage   is 'Гараж байгаа эсэх';

create index if not exists listings_build_year_idx  on public.listings (build_year);
create index if not exists listings_floor_idx       on public.listings (floor);
create index if not exists listings_has_garage_idx  on public.listings (has_garage);

-- ================== 2. LISTING_DRAFTS — ижил талбарууд ==================
-- Queue-ээс нийтлэх үед мэдээлэл алдагдахгүйн тулд ижил багана нэмнэ.
-- (0002 ороогүй бол хүснэгт байхгүй тул алгасна — `to_regclass` шалгана.)
do $$
begin
  if to_regclass('public.listing_drafts') is null then
    raise notice 'listing_drafts байхгүй — 0002_listing_drafts.sql-ийг эхлээд ажиллуулна уу (алгаслаа).';
    return;
  end if;

  alter table public.listing_drafts
    add column if not exists build_year   integer,
    add column if not exists floor        integer,
    add column if not exists total_floors integer,
    add column if not exists balconies    integer,
    add column if not exists has_garage   boolean;
end $$;

-- ================== 3. Хуучин property_type утгуудыг шилжүүлэх ==================
-- 0001/0002 хувилбарын нэрс → unegui.mn загварын шинэ нэрс
update public.listings
   set property_type = 'АОС, хаус, зуслан, амралтын газар'
 where property_type = 'House';

update public.listings
   set property_type = 'Худалдаа, үйлчилгээний талбай'
 where property_type = 'Худалдаа үйлчилгээний талбай';

update public.listings
   set property_type = 'Үйлдвэр, агуулах, обьект'
 where property_type = 'Обьект, үйлдвэр, агуулах';

do $$
begin
  if to_regclass('public.listing_drafts') is null then return; end if;

  update public.listing_drafts
     set property_type = 'АОС, хаус, зуслан, амралтын газар'
   where property_type = 'House';

  update public.listing_drafts
     set property_type = 'Худалдаа, үйлчилгээний талбай'
   where property_type = 'Худалдаа үйлчилгээний талбай';

  update public.listing_drafts
     set property_type = 'Үйлдвэр, агуулах, обьект'
   where property_type = 'Обьект, үйлдвэр, агуулах';
end $$;

-- ================== 4. Storage bucket (байхгүй бол) ==================
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Bucket-ийн RLS бодлогууд (0001-тэй ижил, давхар ажиллуулж болно)
drop policy if exists "listing_images_public_select" on storage.objects;
create policy "listing_images_public_select" on storage.objects
  for select using (bucket_id = 'listing-images');

drop policy if exists "listing_images_auth_insert" on storage.objects;
create policy "listing_images_auth_insert" on storage.objects
  for insert with check (
    bucket_id = 'listing-images' and auth.role() = 'authenticated'
  );

drop policy if exists "listing_images_auth_delete" on storage.objects;
create policy "listing_images_auth_delete" on storage.objects
  for delete using (
    bucket_id = 'listing-images' and owner_id = auth.uid()::text
  );
