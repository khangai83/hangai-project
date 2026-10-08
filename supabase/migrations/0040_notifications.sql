-- ============================================================
-- 0040_notifications.sql — 🔔 «МЭДЭГДЭЛ» (Facebook маягийн хонх)
--
-- ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-08): «facebook шиг notification тэй болгоё.
--   Өөрөөр хэлбэл ямар ямар хэрэглэгч ямар зар дээр нь like дараад байгаа нь
--   зар оруулсан хэрэглэгчид харагдаг байх. Хэзээ ямар дугаартай хэрэглэгч
--   like дарсан нь харагддаг байх. хавсралтаар явуулсан хонхны icon ийг
--   хайлтын түүх icon ний дараа оруул» ✓
--
-- 🎯 ЮУ ХИЙХ ВЭ:
--   1) `notifications` — ХҮЛЭЭН АВАГЧ (зарын эзэн) тус бүрийн мэдэгдлийн
--      мөр. Мөр бүр ХУУЛБАР (snapshot) хадгална: `listing_title`,
--      `actor_name`, `actor_phone` ⇒ зар/профайл хожим өөрчлөгдсөн ч
--      «тэр үед хэн, юу» гэдэг нь үнэнээр харагдана ✓
--   2) ТРИГГЕР `notify_listing_like()` — `listing_likes`-д мөр НЭМЭГДЭХЭД
--      зарын эзэнд мэдэгдэл ҮҮСГЭНЭ. ❤️ ба мэдэгдэл нь НЭГ транзакцад
--      бичигдэнэ ⇒ хэзээ ч зөрөхгүй (JS дээр «❤️-ийн дараа мэдэгдэл» гэж
--      тусад нь дуудах нь сүлжээ тасрахад алдагдана ✗).
--      `lib/listingStats.js` (service_role) ХӨНДӨӨГДӨХГҮЙ ✓
--   3) RLS — мөр бүрийг ЗӨВХӨН хүлээн авагч (`user_id = auth.uid()`) харна.
--      ⚠️ INSERT policy БАЙХГҮЙ ⇒ клиент мэдэгдэл ЗОХИОЖ чадахгүй
--      (зөвхөн триггер бичнэ) ✓ · UPDATE нь ЗӨВХӨН `read_at` баганад
--      (0020_messages.sql-ийн ЯГ ИЖИЛ хатууруулалт) ✓
--
-- ⚠️ ХЭН МЭДЭГДЭЛ АВАХГҮЙ ВЭ (зориуд):
--   • ЗОЧИН (`listing_likes.user_id is null`) — хэн болохыг мэдэх боломжгүй ✗
--   • ӨӨРИЙН зардаа дарсан ❤️ (`owner = actor`) — өөртөө мэдэгдэл утгагүй ✗
--   ℹ️ Иймд зөвхөн НЭВТЭРСЭН хэрэглэгч БУСДЫН зард дарсан ❤️ л мэдэгдэнэ ✓
--
-- ⚠️ ДАВХАРДЫН ДҮРЭМ: `unique (user_id, actor_id, type, listing_id)` ⇒
--   нэг хүн нэг зард хэдэн ч удаа ❤️ дарах ч мэдэгдэл НЭГ л байна
--   (`like → unlike → like` үед `created_at`/`read_at` шинэчлэгдэж,
--   «дахин шинэ» мэдэгдэл болно — эгнээ хавдахгүй ✓)
--
-- АЖИЛЛУУЛАХ (30 секунд, idempotent):
--   npm run migration:copy 0040_notifications.sql
--   → SQL нь clipboard-д орж, Supabase SQL Editor нээгдэнэ
--   → ⌘A ⌫ (хуучин агуулгыг устга) → ⌘V → Run
--
-- ⚠️ Миграц ОРООГҮЙ ч апп ЭВДРЭХГҮЙ: хонх `0` харуулж, `/notifications`
--    хуудсан дээр «хүснэгт үүсээгүй» гэсэн ойлгомжтой заавар гарна ✓
-- ============================================================

-- ---------- 1. Хүснэгт ----------
create table if not exists public.notifications (
  id            uuid primary key default gen_random_uuid(),
  -- ХҮЛЭЭН АВАГЧ — зарын эзэн (мэдэгдэл түүнд харагдана)
  user_id       uuid not null references auth.users (id) on delete cascade,
  -- ҮЙЛДЭЛ ХИЙСЭН хүн (❤️ дарсан). Хэрэглэгч устахад мэдэгдэл үлдэнэ
  actor_id      uuid references auth.users (id) on delete set null,
  -- Төрөл — одоогоор зөвхөн 'like' (ирээдүйд 'message'/'price' г.м. нэмэгдэнэ)
  type          text not null default 'like',
  -- Аль зар вэ. Зар УСТАХАД мэдэгдэл ч устана (`on delete cascade`) — устсан
  -- зарын мэдэгдэл хэрэглэгчид ямар ч утгагүй ✗
  listing_id    uuid references public.listings (id) on delete cascade,
  -- Хуулбарууд (snapshot) — «тэр үед» гэсэн утга хадгална
  listing_title text not null,
  actor_name    text,
  actor_phone   text,
  read_at       timestamptz,
  created_at    timestamptz not null default now(),
  constraint notifications_type_valid check (type in ('like')),
  -- ⚠️ Нэг (хүлээн авагч, хүн, төрөл, зар) хослолд НЭГ л мөр ✓
  constraint notifications_unique unique (user_id, actor_id, type, listing_id)
);

comment on table public.notifications is
  '🔔 Мэдэгдэл (Facebook маягийн хонх). RLS: зөвхөн хүлээн авагч (user_id = auth.uid()) харна. Мөрийг ЗӨВХӨН триггер бичнэ (INSERT policy БАЙХГҮЙ).';
comment on column public.notifications.actor_phone is
  '❤️ дарсан хэрэглэгчийн УТАСНЫ ДУГААР (auth.users.phone) — энэ системийн гол ID. Хуулбар тул профайл солигдсон ч хадгалагдана. Зөвхөн зарын эзэн харна.';
comment on column public.notifications.listing_title is
  'Зарын гарчгийн ХУУЛБАР — зар засагдсан ч «тэр үед» гэсэн утга хадгалагдана.';
comment on column public.notifications.read_at is
  'Уншсан цаг (null = ШИНЭ). Хонхны badge нь read_at is null тоог харуулна.';

-- Жагсаалтыг «шинэ нь эхэнд» нэг query-ээр зурах индекс
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);
-- Хонхны badge (уншаагүй тоо) хурдан байхын тулд хэсэгчилсэн индекс
create index if not exists notifications_unread_idx
  on public.notifications (user_id) where read_at is null;
-- Зарын эзэн «энэ зард хэн дарсан» гэж харах / зарын бүлэглэлт
create index if not exists notifications_listing_idx
  on public.notifications (listing_id);
create index if not exists notifications_actor_idx
  on public.notifications (actor_id);

-- ---------- 2. ❤️ дарсан үед мэдэгдэл үүсгэх триггер ----------
-- ⚠️ `security definer`: функц нь `auth.users`-ээс дугаарыг унших ёстой
--    (энгийн хэрэглэгчийн эрхээр боломжгүй ✗) ба `notifications`-д бичихэд
--    RLS-ийг тойрох ёстой (мөр нь ХҮЛЭЭН АВАГЧИЙН мэргээ биш) ✓
create or replace function public.notify_listing_like()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  owner_id uuid;
  l_title  text;
  a_name   text;
  a_phone  text;
begin
  -- ① Зочийн ❤️ (хэн болох нь тодорхойгүй) → мэдэгдэлгүй
  if new.user_id is null then
    return null;
  end if;

  -- ② Зарын эзэн ба гарчиг
  select l.user_id, l.title
    into owner_id, l_title
    from public.listings l
   where l.id = new.listing_id;

  -- ③ Зар олдохгүй (устсан) эсвэл эзэн нь ӨӨРӨӨ дарсан → мэдэгдэлгүй
  if owner_id is null or owner_id = new.user_id then
    return null;
  end if;

  -- ④ Хуулбарууд: хоч нэр (`profiles`, байхгүй бол null) + утас (`auth.users`)
  select nullif(btrim(p.display_name), '')
    into a_name
    from public.profiles p
   where p.id = new.user_id;

  select u.phone
    into a_phone
    from auth.users u
   where u.id = new.user_id;

  -- ⑤ Мэдэгдэл бичих. Давхардвал (`like → unlike → like`) ХУУЧИН мөрийг
  --    «шинэ» болгоно — эгнээ нэмэгдэхгүй, badge буцаж асаана ✓
  insert into public.notifications (
    user_id, actor_id, type, listing_id, listing_title, actor_name, actor_phone
  ) values (
    owner_id, new.user_id, 'like', new.listing_id,
    coalesce(nullif(btrim(l_title), ''), 'Зар'), a_name, a_phone
  )
  on conflict (user_id, actor_id, type, listing_id) do update
     set created_at    = now(),
         read_at       = null,
         listing_title = excluded.listing_title,
         actor_name    = excluded.actor_name,
         actor_phone   = excluded.actor_phone;

  return null;
end $$;

comment on function public.notify_listing_like() is
  '❤️ listing_likes-д мөр нэмэгдэхэд зарын эзэнд мэдэгдэл (хуулбартай) үүсгэнэ. Зочин/өөрийн зарын ❤️-д юу ч хийхгүй.';

drop trigger if exists listing_likes_notify on public.listing_likes;
create trigger listing_likes_notify
  after insert on public.listing_likes
  for each row execute function public.notify_listing_like();

-- ---------- 3. Хуучин ❤️-үүдээс суурийг бөглөх ----------
-- ⚠️ Миграц орохоос ӨМНӨ дарсан ❤️-үүд ч мэдэгдэл болж харагдана
--    (дахин ажиллуулбал давхардахгүй — `on conflict do nothing` ✓)
insert into public.notifications (
  user_id, actor_id, type, listing_id, listing_title, actor_name, actor_phone, created_at
)
select l.user_id,
       k.user_id,
       'like',
       k.listing_id,
       coalesce(nullif(btrim(l.title), ''), 'Зар'),
       nullif(btrim(p.display_name), ''),
       u.phone,
       k.created_at
  from public.listing_likes k
  join public.listings l on l.id = k.listing_id
  left join public.profiles p on p.id = k.user_id
  left join auth.users   u on u.id = k.user_id
 where k.user_id is not null
   and l.user_id is not null
   and l.user_id <> k.user_id
on conflict (user_id, actor_id, type, listing_id) do nothing;

-- ---------- 4. RLS — зөвхөн хүлээн авагч ----------
alter table public.notifications enable row level security;

drop policy if exists "notifications_select_own" on public.notifications;
create policy "notifications_select_own" on public.notifications
  for select to authenticated
  using (auth.uid() = user_id);

-- ⚠️ INSERT policy ЗОРИУДААР БАЙХГҮЙ — мөрийг зөвхөн триггер
--    (`security definer`) үүсгэнэ. Клиент хуурамч мэдэгдэл бичих боломжгүй ✓

drop policy if exists "notifications_update_own" on public.notifications;
create policy "notifications_update_own" on public.notifications
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_delete_own" on public.notifications
  for delete to authenticated
  using (auth.uid() = user_id);

-- ---------- 5. Эрхүүд ----------
-- ⚠️ `revoke` ХЭРЭГТЭЙ: Supabase нь public схемд шинэ хүснэгт үүсэхэд
--    anon/authenticated-д DEFAULT PRIVILEGES-ээр БҮТЭН эрх өгдөг ✓
revoke all on public.notifications from anon, authenticated;
grant select, delete on public.notifications to authenticated;
-- ⚠️ UPDATE нь ЗӨВХӨН `read_at` баганад (0020-ийн ЯГ ИЖИЛ хатууруулалт) —
--    хүлээн авагч өөрийн мөрийн текст/дугаарыг дарж бичих боломжгүй ✓
grant update (read_at) on public.notifications to authenticated;

-- ---------- 6. ШАЛГАХ (сонголтоор) ----------
--   select count(*) from public.notifications;
--   select user_id, listing_title, actor_name, actor_phone, created_at, read_at
--     from public.notifications order by created_at desc limit 10;
--   select tablename, policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename = 'notifications' order by policyname;
