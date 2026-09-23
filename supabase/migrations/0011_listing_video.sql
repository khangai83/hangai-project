-- ============================================================
-- 0011_listing_video.sql — Зарт YouTube видео линк хадгалах
--
-- ЯАГААД ЛИНК ВЭ (видео upload БИШ):
--   Утасны 1 минут 1080p видео = 100–300 MB. Storage-д хадгалахад
--   зурагнаас ~100 дахин их зай/трафик зарцуулагдана. YouTube линк
--   хадгалахад Storage = 0 MB, харин хэрэглэгч видео харж чадна.
--
-- ⚠️ ХЭРХЭН АЖИЛЛУУЛАХ ВЭ (DDL-г зөвхөн SQL Editor-оор ажиллуулна):
--     1. Supabase Dashboard → SQL Editor → New query
--     2. Энэ файлын БҮХ агуулгыг хуулж тавиад → Run
--
-- ✅ Ажиллуулаагүй ч САЙТ ЭВДРЭХГҮЙ:
--    lib/queries.js нь `video_url`-ийг 0003-ын нэмэлт баганын группт
--    (`DETAIL_ROW_KEYS`) оруулсан тул багана байхгүй бол PostgREST-ийн
--    «schema cache» алдааг барьж, линкийг ОРХИОД бусад мэдээллийг
--    хэвийн хадгална (зөвхөн console.warn бичнэ).
--
-- ⚠️ УТГЫН ХЭЛБЭР: зөвхөн КАНОНИК линк хадгална —
--      https://www.youtube.com/watch?v=<11 тэмдэгт ID>
--    Нормалчлалыг клиент талд `lib/youtube.mjs → normalizeYouTubeUrl()`
--    хийнэ (youtu.be / shorts / embed / нэмэлт параметрүүд бүгд нэг
--    хэлбэрт орно). Ингэснээр дэлгэрэнгүй хуудас тогтвортой ажиллана.
-- ============================================================

alter table public.listings
  add column if not exists video_url text;

comment on column public.listings.video_url is
  'YouTube видеоны КАНОНИК линк (https://www.youtube.com/watch?v=ID). Зөвхөн линк хадгална — видео файл Storage-д ОРОХГҮЙ. lib/youtube.mjs → normalizeYouTubeUrl()';

-- ---------- Шалгах ----------
-- select id, property_type, video_url from public.listings
--  where video_url is not null order by created_at desc limit 10;
