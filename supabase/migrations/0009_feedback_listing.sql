-- ============================================================
-- 0009_feedback_listing.sql — Санал хүсэлтийг ТУХАЙН ЗАРТАЙ холбох
--
-- ЯАГААД: хэрэглэгч зарын дэлгэрэнгүй хуудсанд «⚠️ Зар санал гомдол
--   мэдэгдэх» товчоор гомдол илгээхэд тухайн ЗАРЫН ID-г хамт хадгалах
--   шаардлагатай. Ингэснээр админ «аль зар, хэнээс, ямар гомдол» гэдгийг
--   нэг дороос харж, шаардлагатай бол зарыг шууд устгах боломжтой.
--
-- ⚠️ ХЭРХЭН АЖИЛЛУУЛАХ ВЭ (DDL → зөвхөн SQL Editor):
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Энэ файлын БҮХ агуулгыг хуулж тавиад → Run
--   3. «Success. No rows returned» гарах ёстой
--
-- ⚠️ Ажиллуулаагүй ч САЙТ ЭВДРЭХГҮЙ: `submitFeedback()` нь `listing_id`
--    багана байхгүй бол автоматаар түүнгүйгээр дахин илгээж, зарын ID-г
--    гарчигт нь бичиж хадгална (lib/queries.js → submitFeedback).
-- ============================================================

alter table public.feedback
  add column if not exists listing_id uuid references public.listings (id) on delete set null;

comment on column public.feedback.listing_id is
  'Гомдол гаргасан ЗАР (зарын дэлгэрэнгүй хуудаснаас илгээсэн бол). Зар устгахад NULL болно.';

create index if not exists feedback_listing_idx on public.feedback (listing_id);

-- ---------- Шалгах ----------
-- select id, created_at, category, listing_id, subject
--   from public.feedback order by created_at desc limit 10;
