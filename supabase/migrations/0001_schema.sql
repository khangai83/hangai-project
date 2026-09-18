-- ============================================================
-- 0001_schema.sql — ZAR.mn (unegui) Next.js + Supabase schema
-- Supabase SQL Editor эсвэл `supabase db push`-ээр ажиллуулна.
-- ============================================================

-- ================== PROFILES (хэрэглэгчийн профайл) ==================
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text,
  created_at timestamptz not null default now()
);

-- Шинэ хэрэглэгч бүртгүүлэхэд автоматаар profile мөр үүсгэх
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', null));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ================== LISTINGS (зарууд) ==================
create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  category text not null check (category in ('sell', 'rent')) default 'sell',
  property_type text not null,
  rooms integer not null default 0,
  area real not null default 0,
  city text not null default 'Улаанбаатар',
  district text,
  khoroo text,
  address_detail text,
  latitude double precision,
  longitude double precision,
  price bigint not null default 0,
  price_type text not null default 'total',
  description text,
  phone text,
  contact_name text,
  images jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists listings_category_idx on public.listings (category);
create index if not exists listings_city_idx on public.listings (city);
create index if not exists listings_property_type_idx on public.listings (property_type);
create index if not exists listings_user_id_idx on public.listings (user_id);
create index if not exists listings_created_at_idx on public.listings (created_at desc);

-- ================== RLS ==================
alter table public.profiles enable row level security;
alter table public.listings enable row level security;

-- profiles: хүн бүр уншиж болно; өөрсдийнхөө мөрийг өөрчилж болно
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (true);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles for insert with check (auth.uid() = id);

-- listings: бүгд уншина (хувийн бус нийтийн зар)
drop policy if exists "listings_select" on public.listings;
create policy "listings_select" on public.listings for select using (true);

-- зөвхөн өөрсдийнхөө зар нэмнэ
drop policy if exists "listings_insert" on public.listings;
create policy "listings_insert" on public.listings for insert with check (auth.uid() = user_id);

-- зөвхөн өөрийн зарыг устгана
drop policy if exists "listings_delete" on public.listings;
create policy "listings_delete" on public.listings for delete using (auth.uid() = user_id);

-- ================== STORAGE BUCKET (listing-images) ==================
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

-- Бүгд public уншина
drop policy if exists "listing_images_public_select" on storage.objects;
create policy "listing_images_public_select" on storage.objects
  for select using (bucket_id = 'listing-images');

-- Нэвтэрсэн хэрэглэгч listing-images bucket-руу upload хийж болно
drop policy if exists "listing_images_auth_insert" on storage.objects;
create policy "listing_images_auth_insert" on storage.objects
  for insert with check (
    bucket_id = 'listing-images' and auth.role() = 'authenticated'
  );

-- Зөвхөн өөрийн upload хийсэн зургаа устгаж болно
-- Анхаар: storage.objects.owner_id нь text төрөлтэй тул auth.uid()-ыг text болгох шаардлагатай
drop policy if exists "listing_images_auth_delete" on storage.objects;
create policy "listing_images_auth_delete" on storage.objects
  for delete using (
    bucket_id = 'listing-images' and owner_id = auth.uid()::text
  );

grant all on public.profiles to authenticated;
grant all on public.listings to authenticated;
