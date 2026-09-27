-- ============================================================
-- 0017_profile_identity.sql — «Зар дээр нэр/зургаа харуулах уу?»
-- ============================================================
-- 🎯 ЗОРИЛГО (хэрэглэгчийн хүсэлт):
--    Агент/дэлгүүрүүд зар дээр нэр, зургаа харуулахыг ХҮСДЭГ.
--    Энгийн хэрэглэгч ихэвчлэн ХҮСДЭГГҮЙ.
--    → Тиймээс БҮРТГЭЛИЙН үед АСУУЖ, хүсвэл харуулна. Хүсэхгүй бол
--      зар дээр нэр/зураг ОГТ харагдахгүй. Тохиргоог дараа нь
--      «👤 Профайл» цонхноос ӨӨРЧЛӨХ боломжтой.
--
-- 📐 ХИЙЦ:
--    • `profiles.show_identity` (boolean) — НИЙТЭД харагдах эсэх
--         true  → зар дээр `display_name` + `avatar_url` ХАРАГДАНА
--         false → зар дээр нэр/зураг ХАРАГДАХГҮЙ (зөвхөн утас)
--    ⚠️ АНХДАГЧ нь `false` — НУУЦЛАЛЫГ ЭРХЭМЛЭНЭ (opt-in, зөвшөөрөл
--       асуухгүйгээр нэрийг нийтлэхгүй). Хэрэглэгч өөрөө `true` болгоно.
--
-- ⚠️ УРЬДЧИЛСАН НӨХЦӨЛ: `0015_profiles_public.sql` ЗААВАЛ ажилласан байх
--    (`display_name`, `avatar_url` багана + `avatars` bucket).
--    Хэрэв 0015 ороогүй бол 0017 нь АЛДАА өгнө — тэгвэл эхлээд 0015-ыг
--    ажиллуулна уу.
--
-- ⚠️ АЖИЛЛУУЛАХ: Supabase Dashboard → SQL Editor → бүтнээр нь RUN.
--    Туслах: `npm run migration:copy 0017_profile_identity.sql`
-- ============================================================

-- ---------- 1. Багана ----------
alter table public.profiles add column if not exists show_identity boolean;

-- ⚠️ Одоо байгаа хэрэглэгчид: НУУЦЛАЛЫГ эрхэмлэж `false` болгоно
update public.profiles set show_identity = false where show_identity is null;

alter table public.profiles alter column show_identity set default false;
alter table public.profiles alter column show_identity set not null;

comment on column public.profiles.show_identity is
  'Зар дээр нэр (display_name) ба зургаа (avatar_url) НИЙТЭД харуулах эсэх '
  '(0017). АНХДАГЧ false = нууцлал. Бүртгэлийн үед асууж, дараа нь '
  '«Профайл» цонхноос солих боломжтой. false үед `fetchProfilesByIds()` '
  'нь нэр/зургийг ХООСОН буцаана → зар дээр харагдахгүй.';

-- ---------- 2. Индекс ----------
-- ⚠️ Зар дээр нийтлэгчийн нэрийг татахдаа `show_identity = true`-гээр
--    шүүх нь түгээмэл (жагсаалтын 2 дахь query).
create index if not exists profiles_show_identity_idx
  on public.profiles (show_identity)
  where show_identity = true;

-- ---------- 3. RLS: нийтэд уншихыг зөвшөөрөх ----------
-- ⚠️ 0015-д `profiles`-ийн SELECT бодлого нь «нийтэд нээлттэй» байх ёстой
--    (зар дээр нэр харуулахын тулд). Байхгүй бол энд нэмнэ.
do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public' and tablename = 'profiles'
       and policyname = 'profiles_public_read'
  ) then
    execute 'create policy "profiles_public_read" on public.profiles
               for select using (true)';
  end if;
end $$;

-- ============================================================
-- 4. ШАЛГАХ (сонголтоор)
-- ============================================================
--   select show_identity, count(*) from public.profiles group by 1;
--   select id, display_name, avatar_url, show_identity from public.profiles limit 5;
--
--   -- Нэг хэрэглэгчийг харуулах болгох (туршилт):
--   -- update public.profiles set show_identity = true where id = '<uuid>';
-- ============================================================
