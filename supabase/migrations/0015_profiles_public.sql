-- ============================================================
-- 0015_profiles_public.sql — Профайл (нэр + зураг) ба НУУЦ ҮГ СЭРГЭЭХ
-- ============================================================
-- 🎯 ЮУ ХИЙХ ВЭ:
--   1) `profiles.display_name` — нэр. Зар дээр НИЙТЭД энэ харагдана.
--      ⚠️ `name` (жинхэнэ нэр) нь ЗӨВХӨН дотоод/хувийн — UI дээр хэзээ ч
--         нийтэд харуулахгүй (хэрэглэгч жинхэнэ нэрээ нууцалж чадна).
--   2) `profiles.avatar_url` — профайлын зураг (сонголтоор).
--   3) `avatars` Storage bucket + RLS — зөвхөн ӨӨРИЙН фолдерт бичнэ.
--   4) `auth_events` — SMS/нууц үг сэргээх ХЯЗГААР (spam + мөнгө хамгаалалт).
--   5) `handle_new_user` триггер — бүртгэлд `display_name`-ыг ч бөглөнө.
--
-- ⚠️ АЖИЛЛУУЛАХ: Supabase Dashboard → SQL Editor → бүтнээр нь хуулж RUN.
--    Туслах: `npm run migration:copy 0015_profiles_public.sql`
-- ============================================================


-- ============================================================
-- 1) profiles — нэр (display_name) ба ПРОФАЙЛ ЗУРАГ (avatar_url)
-- ============================================================
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists avatar_url   text;

comment on column public.profiles.display_name is
  'НИЙТЭД харагдах нэр (зар, нийтлэгчийн хуудсан дээр). Хоосон бол `name` '
  'руу fallback хийнэ. `name` нь хувийн — хэрэглэгч жинхэнэ нэрээ нууцалж болно.';
comment on column public.profiles.avatar_url is
  'Профайлын зургийн нийтийн URL (avatars bucket). Сонголтоор.';

-- ⚠️ Уртын хязгаар — UI-д 40 тэмдэгт хүртэл (давхцахгүйн тулд эхлээд DROP)
alter table public.profiles drop constraint if exists profiles_display_name_len;
alter table public.profiles add constraint profiles_display_name_len
  check (display_name is null or char_length(btrim(display_name)) between 1 and 40);

-- Хуучин профайлуудын нэрийг нэрээр нь бөглөх (хоосон харагдахаас сэргийлнэ)
update public.profiles
   set display_name = btrim(name)
 where display_name is null
   and name is not null
   and btrim(name) <> '';

-- ============================================================
-- 2) Бүртгэлийн триггер — `display_name`-ыг ч бөглөнө
-- ============================================================
-- ⚠️ Урьд нь зөвхөн `name` бичигддэг байв → зар дээр нэр хоосон гарах болно.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_name text := nullif(btrim(coalesce(new.raw_user_meta_data ->> 'name', '')), '');
begin
  insert into public.profiles (id, name, display_name)
  values (new.id, v_name, v_name)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- ============================================================
-- 3) `avatars` Storage bucket + RLS
-- ============================================================
-- Зам: `avatars/<user_id>/<файл>` — эхний фолдер нь ХЭРЭГЛЭГЧИЙН ID байна.
-- ⚠️ Ингэснээр RLS нь «зөвхөн ӨӨРИЙН фолдерт» гэж хянах боломжтой болно
--    (өөр хүний зургийг дарж бичих, устгах боломжгүй).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set
  public             = true,
  file_size_limit    = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- Бүгд уншина (профайл зураг нь нийтийн)
drop policy if exists "avatars_public_select" on storage.objects;
create policy "avatars_public_select" on storage.objects
  for select using (bucket_id = 'avatars');

-- Нэвтэрсэн хэрэглэгч ЗӨВХӨН ӨӨРИЙН фолдерт (avatars/<uid>/…) байршуулна
drop policy if exists "avatars_own_insert" on storage.objects;
create policy "avatars_own_insert" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and auth.role() = 'authenticated'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Дарж бичих (шинэ зураг оруулах)
drop policy if exists "avatars_own_update" on storage.objects;
create policy "avatars_own_update" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Устгах
drop policy if exists "avatars_own_delete" on storage.objects;
create policy "avatars_own_delete" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );


-- ============================================================
-- 4) `auth_events` — НУУЦ ҮГ СЭРГЭЭХ / SMS-ийн ХЯЗГААР
-- ============================================================
-- ⚠️ ЯАГААД ЗААВАЛ ВЭ: verify.mn-ийн SMS нь МӨНГӨ ЗАРЦУУЛДАГ. Хэн нэгэн
--    таны сайтаар дамжуулан олон мянган SMS илгээж үлдэгдлийг шавхаж болно.
--    Тиймээс «утас + IP» тус бүрээр цагийн хязгаар тавина.
create table if not exists public.auth_events (
  id         bigserial primary key,
  kind       text        not null,   -- 'register_start' | 'reset_start'
  phone      text,
  ip         text,
  created_at timestamptz not null default now()
);

create index if not exists auth_events_phone_idx
  on public.auth_events (phone, kind, created_at desc);
create index if not exists auth_events_ip_idx
  on public.auth_events (ip, kind, created_at desc);

-- 🔒 RLS идэвхтэй, ямар ч policy БАЙХГҮЙ → client (anon/authenticated)
--    унших, бичих БОЛОМЖГҮЙ. Зөвхөн сервер (`service_role`) хандана.
alter table public.auth_events enable row level security;

comment on table public.auth_events is
  'SMS/нууц үг сэргээх хязгаарын бүртгэл (0015). Зөвхөн сервер тал '
  '(service_role) уншиж/бичнэ — RLS policy байхгүй тул client хандахгүй.';


-- ============================================================
-- 5) ШАЛГАХ (сонголтоор — SQL Editor-т ажиллуулж болно)
-- ============================================================
-- Профайлын баганууд:
--   select id, name, display_name, avatar_url from public.profiles limit 5;
--
-- Bucket + policy:
--   select id, public, file_size_limit, allowed_mime_types
--     from storage.buckets where id = 'avatars';
--   select policyname from pg_policies
--    where schemaname = 'storage' and tablename = 'objects'
--      and policyname like 'avatars%';
--
-- SMS хязгаарын бүртгэл:
--   select kind, phone, ip, created_at from public.auth_events
--    order by created_at desc limit 10;
-- ============================================================

