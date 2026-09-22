-- ============================================================
-- 0008_feedback.sql — «Санал хүсэлт» (feedback) хүснэгт + RLS
--
-- ⚠️ ХЭРХЭН АЖИЛЛУУЛАХ ВЭ (DDL-г зөвхөн SQL Editor-оор ажиллуулна):
--   1. https://supabase.com/dashboard → төслөө сонгоно
--   2. Зүүн цэс → «SQL Editor» → «New query»
--   3. Энэ файлын БҮХ агуулгыг хуулж тавиад → «Run» (Cmd+Enter)
--   4. «Success. No rows returned» гэж гарах ёстой
--
-- ⚠️ Ажиллуулаагүй бол /feedback хуудас «хүснэгт олдсонгүй» гэсэн
--    ойлгомжтой мессеж харуулна (бусад хуудсууд хэвийн ажиллана).
--
-- ЭРХИЙН ЗАГВАР:
--   • INSERT — ЗӨВХӨН нэвтэрсэн хэрэглэгч, ЗӨВХӨН өөрийн user_id-ээр
--   • SELECT — хэрэглэгч зөвхөн ӨӨРИЙН илгээсэн саналыг харна
--   • Админ нь service_role-оор (/api/admin/feedback) БҮГДИЙГ харна
--   • UPDATE/DELETE — хэрэглэгчид БАЙХГҮЙ (админ төлөв солино)
-- ============================================================

-- ---------- 1. Хүснэгт ----------
create table if not exists public.feedback (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  category     text not null default 'suggestion',
  subject      text,
  message      text not null,
  -- Хэрэглэгчийн мэдээллийн ХУУЛБАР (snapshot): админ жагсаалт дээр
  -- auth.users руу нэмэлт query хийхгүйн тулд илгээх үед хуулж хадгална
  contact_name text,
  phone        text,
  status       text not null default 'new',
  admin_note   text,
  created_at   timestamptz not null default now(),
  handled_at   timestamptz,
  constraint feedback_category_valid check (category in ('suggestion', 'complaint', 'bug', 'other')),
  constraint feedback_status_valid check (status in ('new', 'read', 'resolved')),
  constraint feedback_message_len check (char_length(message) between 5 and 4000)
);

comment on table public.feedback is 'Хэрэглэгчээс ирсэн санал хүсэлт/гомдол — админ /admin/feedback хуудсаар харна';
comment on column public.feedback.status is 'new = шинэ, read = харсан, resolved = шийдсэн';
comment on column public.feedback.category is 'suggestion | complaint | bug | other';

create index if not exists feedback_created_idx on public.feedback (created_at desc);
create index if not exists feedback_status_idx  on public.feedback (status);
create index if not exists feedback_user_idx    on public.feedback (user_id);

-- ---------- 2. RLS ----------
alter table public.feedback enable row level security;

-- Илгээх: зөвхөн өөрийн нэрээр (auth.uid() = user_id)
drop policy if exists "feedback_insert_own" on public.feedback;
create policy "feedback_insert_own" on public.feedback
  for insert to authenticated
  with check (auth.uid() = user_id);

-- Өөрийн илгээсэн саналыг харах (admin нь service_role-оор бүгдийг харна)
drop policy if exists "feedback_select_own" on public.feedback;
create policy "feedback_select_own" on public.feedback
  for select to authenticated
  using (auth.uid() = user_id);

grant insert, select on public.feedback to authenticated;

-- ---------- 3. Шалгах ----------
-- select count(*) as total,
--        count(*) filter (where status = 'new') as шинэ
--   from public.feedback;
