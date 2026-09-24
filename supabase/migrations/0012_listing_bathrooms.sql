-- ============================================================
-- 0012_listing_bathrooms.sql — «Угаалгын өрөө» (bathrooms) багана
--
-- 3 ба түүнээс олон өрөөтэй орон сууц, эсвэл амины орон сууц (АОС/хаус)
-- заруудад угаалгын өрөөний тоог оруулж, зарын карт/дэлгэрэнгүй хуудсанд
-- 🛁 тэмдэгтэйгээр харуулна (lib/locationData.js → hasBathroomFields).
--
-- Supabase Dashboard → SQL Editor-т ажиллуулах (эсвэл `supabase db push`)
-- ============================================================

alter table public.listings
  add column if not exists bathrooms integer;  -- Угаалгын өрөөний тоо

comment on column public.listings.bathrooms is 'Угаалгын өрөөний тоо (3+ өрөө, АОС/хаус)';

create index if not exists listings_bathrooms_idx on public.listings (bathrooms);
