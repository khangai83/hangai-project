-- ============================================================
-- 0002_listing_drafts.sql — Facebook агентын баталгаажуулалтын queue
-- Агент (скрипт) FB-ээс зар скрейп хийж энд draft болгон хадгална.
-- Зөвхөн хүн баталгаажуулсны дараа (published) listings-руу нийтлэнэ.
-- ============================================================

create table if not exists public.listing_drafts (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'facebook',
  group_name text,
  post_url text,                 -- Facebook post-ийн url (dedupe key)
  posted_by text,                -- FB post хэн тавьсан
  posted_at timestamptz,
  raw_text text not null,        -- FB post-ын бүрэн анхны текст
  raw_images jsonb not null default '[]'::jsonb,  -- FB-ээс авсан зурагнyyд
  -- parse хийгдсэн / хүний засаж болох зарын талбарууд
  title text,
  category text check (category in ('sell', 'rent')),
  property_type text,
  rooms integer,
  area real,
  price bigint,
  price_type text default 'total',
  city text default 'Улаанбаатар',
  district text,
  khoroo text,
  address_detail text,
  description text,
  phone text,
  contact_name text,
  images jsonb not null default '[]'::jsonb,     -- нийтлэхэд ашиглагдах зургууд
  parsed jsonb not null default '{}'::jsonb,     -- parser-ын бүх гаралт (audit)
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'published', 'rejected')),
  notes text,
  reviewed_by uuid references auth.users (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

-- duplicate url-аар шалгах (post_url байхгүй бол null давхардал зөвшөөрнө)
create unique index if not exists listing_drafts_post_url_idx
  on public.listing_drafts (post_url) where post_url is not null;

create index if not exists listing_drafts_status_idx on public.listing_drafts (status);
create index if not exists listing_drafts_created_at_idx on public.listing_drafts (created_at desc);

-- ================== RLS ==================
alter table public.listing_drafts enable row level security;

-- Агент service_role-ээр бичих тул RLS-ыг тойрно.
-- Баталгаажуулагч хэрэглэгчид (authenticated) queue-г уншиж/засварлаж болно.
drop policy if exists "listing_drafts_select" on public.listing_drafts;
create policy "listing_drafts_select" on public.listing_drafts
  for select using (auth.role() = 'authenticated');

drop policy if exists "listing_drafts_insert" on public.listing_drafts;
create policy "listing_drafts_insert" on public.listing_drafts
  for insert with check (auth.role() = 'authenticated');

drop policy if exists "listing_drafts_update" on public.listing_drafts;
create policy "listing_drafts_update" on public.listing_drafts
  for update using (auth.role() = 'authenticated');

drop policy if exists "listing_drafts_delete" on public.listing_drafts;
create policy "listing_drafts_delete" on public.listing_drafts
  for delete using (auth.role() = 'authenticated');

grant all on public.listing_drafts to authenticated;
