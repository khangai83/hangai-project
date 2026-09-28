-- ============================================================
-- 0020_messages.sql — ХЭРЭГЛЭГЧ ХООРОНДЫН МЕССЕЖ (чат)
--
-- 🎯 ЮУ ХИЙХ ВЭ:
--   1) `conversations` — ХОЁР хэрэглэгчийн яриа (thread).
--      • `listing_id` — аль зарын талаар ярьж байгаа (зар устсан ч яриа
--        ҮЛДЭНЭ: `on delete set null` + `listing_title` хуулбар ✓)
--      • `buyer_id` — яриаг ЭХЭЛСЭН хэрэглэгч, `seller_id` — зар нийтлэгч
--      • `last_message` / `last_sender_id` / `last_message_at` — жагсаалтыг
--        нэг query-ээр зурахын тулд сүүлийн мессежийн ХУУЛБАР
--   2) `messages` — мессежүүд (`read_at` — уншсан эсэх)
--   3) RLS — ЗӨВХӨН оролцогч хоёр харна/бичнэ (бусдын чат ХАРАГДАХГҮЙ)
--   4) `is_conversation_participant()` — RLS-ийн доторх эрх шалгах helper
--   5) `touch_conversation_on_message()` триггер — мессеж орох бүрд
--      `conversations.last_*`-ийг шинэчилнэ (client-ээс тойрох боломжгүй ✓)
--
-- ⚠️ АЖИЛЛУУЛАХ (DDL-г зөвхөн SQL Editor эсвэл Mgmt API-аар ажиллуулна):
--   `npm run messages:setup`  → SQL-ийг clipboard-д хийж, SQL Editor нээнэ
--   `npm run messages:check`  → миграц ажилласан эсэхийг шалгана
--   (эсвэл Supabase Dashboard → SQL Editor → бүтнээр нь хуулж RUN)
--
-- ⚠️ Миграц ОРООГҮЙ бол `/messages` хуудас «хүснэгт олдсонгүй» гэсэн
--    ойлгомжтой мессеж харуулна — бусад хуудсууд хэвийн ажиллана ✓
--
-- ЭРХИЙН ЗАГВАР (энэ бол энэ хүснэгтийн ХАМГИЙН чухал хэсэг):
--   • SELECT  — зөвхөн `buyer_id`/`seller_id` нь `auth.uid()` байх мөр
--   • INSERT  — мессежийг ЗӨВХӨН өөрийн нэрээр (`sender_id = auth.uid()`)
--               ба зөвхөн ӨӨРИЙН оролцсон ярианд
--   • UPDATE  — ⚠️ ЗӨВХӨН `read_at` багана (`grant update (read_at)`) —
--               бусдын мессежийн ТЕКСТ-ийг дарж бичих боломжгүй ✓
--   • DELETE  — хэрэглэгчид БАЙХГҮЙ (яриа/мессеж устгах нь ирээдүйн ажил)
-- ============================================================

-- ---------- 1. conversations (яриа) ----------
create table if not exists public.conversations (
  id              uuid primary key default gen_random_uuid(),
  -- Аль зарын талаар вэ (зар устсан ч яриа үлдэнэ — `set null`)
  listing_id      uuid references public.listings (id) on delete set null,
  -- Зарын гарчгийн ХУУЛБАР — зар устсан/хуучирсан ч жагсаалтад харагдана
  listing_title   text,
  buyer_id        uuid not null references auth.users (id) on delete cascade,
  seller_id       uuid not null references auth.users (id) on delete cascade,
  -- Сүүлийн мессежийн хуулбар (жагсаалтыг 1 query-ээр зурахын тулд)
  last_message    text,
  last_sender_id  uuid references auth.users (id) on delete set null,
  last_message_at timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  -- ⚠️ Өөртэйгээ чатлах нь утгагүй (UI дээр ч хориглоно)
  constraint conversations_distinct check (buyer_id <> seller_id)
);

comment on table public.conversations is
  'Хоёр хэрэглэгчийн яриа (thread). RLS: зөвхөн buyer_id/seller_id нь auth.uid() мөрийг харна.';
comment on column public.conversations.last_message is
  'Сүүлийн мессежийн 160 тэмдэгт хүртэлх хуулбар (триггерээр шинэчлэгдэнэ) — жагсаалтын preview.';
comment on column public.conversations.listing_title is
  'Зарын гарчгийн хуулбар — зар устсан ч «ямар зарын талаар» гэдэг нь харагдана.';

create index if not exists conversations_buyer_idx
  on public.conversations (buyer_id, last_message_at desc);
create index if not exists conversations_seller_idx
  on public.conversations (seller_id, last_message_at desc);

-- ⚠️ НЭГ ХОС хэрэглэгч нэг ЗАРЫН талаар зөвхөн НЭГ яриатай байна.
--    Зар заагаагүй (профайлаас эхэлсэн) яриа нь nil uuid-гаар тэмдэглэгдэж,
--    «нэг хос → нэг ерөнхий яриа» болно ✓
create unique index if not exists conversations_unique_idx
  on public.conversations (
    buyer_id,
    seller_id,
    coalesce(listing_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

-- ---------- 2. messages (мессежүүд) ----------
create table if not exists public.messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id       uuid not null references auth.users (id) on delete cascade,
  body            text not null,
  created_at      timestamptz not null default now(),
  -- Хүлээн авагч уншсан цаг (NULL = уншаагүй → badge/тоолуур)
  read_at         timestamptz,
  -- ⚠️ Хоосон мессеж, эсвэл 2000+ тэмдэгт (spam) хориглоно
  constraint messages_body_len check (char_length(btrim(body)) between 1 and 2000)
);

comment on table public.messages is
  'Ярианы мессежүүд. RLS: зөвхөн тухайн ярианы оролцогч харна/бичнэ.';
comment on column public.messages.read_at is
  'Хүлээн авагч уншсан цаг (NULL = уншаагүй). Зөвхөн энэ баганыг update хийх эрхтэй.';

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at desc);
-- Уншаагүй мессежийн тоолуур хурдан байхын тулд хэсэгчилсэн индекс
create index if not exists messages_unread_idx
  on public.messages (conversation_id) where read_at is null;

-- ---------- 3. Helper — оролцогч эсэх ----------
-- ⚠️ `security definer` — RLS-ийн policy дотроос дуудагдах тул
--    `conversations`-ийн RLS-д дахин орохгүй (recursion-оос сэргийлнэ).
create or replace function public.is_conversation_participant(p_conversation uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from public.conversations c
     where c.id = p_conversation
       and (c.buyer_id = auth.uid() or c.seller_id = auth.uid())
  );
$$;

comment on function public.is_conversation_participant(uuid) is
  'RLS-ийн туслах: одоогийн хэрэглэгч тухайн ярианы оролцогч эсэх.';

-- ---------- 4. Триггер — ярианы «сүүлийн мессеж» ----------
-- ⚠️ ЗААВАЛ `security definer`: хэрэглэгчид `conversations`-д UPDATE эрх
--    БАЙХГҮЙ тул энгийн триггер нь RLS-д тээглэж алдаа өгнө ✗
create or replace function public.touch_conversation_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
     set last_message    = left(btrim(new.body), 160),
         last_sender_id  = new.sender_id,
         last_message_at = new.created_at
   where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists on_message_created on public.messages;
create trigger on_message_created
  after insert on public.messages
  for each row execute procedure public.touch_conversation_on_message();

-- ---------- 5. RLS ----------
alter table public.conversations enable row level security;
alter table public.messages      enable row level security;

-- 5.1 Яриа: зөвхөн оролцогч хоёр харна
drop policy if exists "conversations_select_participant" on public.conversations;
create policy "conversations_select_participant" on public.conversations
  for select to authenticated
  using (auth.uid() = buyer_id or auth.uid() = seller_id);

-- 5.2 Яриа үүсгэх: зөвхөн ӨӨРИЙГӨӨ `buyer` болгож, өөр хүнтэй
--     ⚠️ Ингэснээр хэн ч бусдын нэрээр яриа үүсгэж чадахгүй ✓
drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own" on public.conversations
  for insert to authenticated
  with check (auth.uid() = buyer_id and buyer_id <> seller_id);

-- 5.3 Мессеж унших: зөвхөн оролцсон ярианыхаа
drop policy if exists "messages_select_participant" on public.messages;
create policy "messages_select_participant" on public.messages
  for select to authenticated
  using (public.is_conversation_participant(conversation_id));

-- 5.4 Мессеж бичих: зөвхөн өөрийн нэрээр + оролцсон ярианд
drop policy if exists "messages_insert_participant" on public.messages;
create policy "messages_insert_participant" on public.messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_conversation_participant(conversation_id)
  );

-- 5.5 «Уншсан» тэмдэглэх: зөвхөн БУСДЫН илгээсэн мессежид
--     ⚠️ Баганын эрх (`grant update (read_at)`) хамт байх ёстой —
--        эс бөгөөс текст/илгээгчийг дарж бичих боломжтой болно ✗
drop policy if exists "messages_mark_read" on public.messages;
create policy "messages_mark_read" on public.messages
  for update to authenticated
  using (sender_id <> auth.uid() and public.is_conversation_participant(conversation_id))
  with check (public.is_conversation_participant(conversation_id));

-- 5.6 Эрхүүд
-- ⚠️ ЯАГААД `revoke` ХЭРЭГТЭЙ ВЭ: Supabase нь `public` схемд шинэ хүснэгт
--    үүсэхэд `anon`/`authenticated`-д DEFAULT PRIVILEGES-ээр **БҮТЭН** эрх
--    өгдөг. Тиймээс зөвхөн `grant update (read_at)` бичих нь ХАНГАЛТГҮЙ —
--    өмнөх бүтэн UPDATE эрх хэвээр үлдэж, хэн ч бусдын мессежийн ТЕКСТ-ийг
--    дарж бичих боломжтой болно ✗ → эхлээд БУЦААЖ АВААД дараа нь олгоно ✓
revoke all              on public.conversations from anon;
revoke all              on public.messages      from anon;
revoke update, delete   on public.conversations from anon, authenticated;
revoke update, delete   on public.messages      from anon, authenticated;

grant select, insert    on public.conversations to authenticated;
grant select, insert    on public.messages      to authenticated;
-- 🔒 ЗӨВХӨН `read_at` — мессежийн ТЕКСТ ба ИЛГЭЭГЧИЙГ өөрчлөх боломжгүй
grant update (read_at)  on public.messages      to authenticated;

-- ---------- 6. ШАЛГАХ (сонголтоор) ----------
-- Хүснэгтүүд:
--   select count(*) from public.conversations;
--   select count(*) from public.messages;
-- Policy-нууд:
--   select tablename, policyname, cmd from pg_policies
--    where schemaname = 'public' and tablename in ('conversations', 'messages')
--    order by tablename, policyname;
-- Баганын эрх (зөвхөн read_at байх ёстой):
--   select column_name, privilege_type from information_schema.column_privileges
--    where table_schema = 'public' and table_name = 'messages'
--      and grantee = 'authenticated' and privilege_type = 'UPDATE';
