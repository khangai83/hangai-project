-- ============================================================
-- 0004_remove_listing_drafts.sql — Facebook агентын queue-г бүрэн устгах
--
-- Төслөөс агент/n8n автоматжуулалтыг хассан тул listing_drafts хүснэгт,
-- түүний index, RLS policy-нууд шаардлагагүй болсон.
--
-- ⚠️ АНХААР: энэ нь ХҮСНЭГТИЙГ БҮРЭН УСТГАНА (доторх draft-ууд хамт).
--    Хэрэв 0002_listing_drafts.sql ороогүй байсан бол энэ нь no-op.
--    Ажиллуулах: Supabase Dashboard → SQL Editor (эсвэл supabase db push).
-- ============================================================

drop table if exists public.listing_drafts cascade;
