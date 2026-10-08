-- ============================================================
-- 0041_notification_phone_title.sql — 🔔 МЭДЭГДЭЛ: 📞 ДУГААР ба 🏠 ГАРЧИГ
--
-- ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-08 (69)): «notification руу ороод үзхэд ямар зар
--   дээр нь like дарсаныг хараад шууд мэдэж болохоор, зарын гарчигийг нь оруулж
--   өгөөрэй. бас like дарсан хүний дугаарыг харуулвал ямар вэ» ✓
--
-- 🐞 БОДИТ АЛДАА (0040-ийн дараа амьд DB-ээс шалгав):
--   ① `actor_phone` нь БҮХ мөрөнд `null` байв ✗ — 0040-ийн триггер нь зөвхөн
--      `auth.users.phone`-ыг уншдаг байв. Гэтэл энэ системд дийлэнх хэрэглэгч
--      УТАСНЫ provider идэвхгүй үед ДОТООД синтетик имэйлээр бүртгэгдсэн
--      (`lib/phoneEmail.js`: `88093663@phone.zarmn.mn`) тул `auth.users.phone`
--      нь ХООСОН (`''`) байдаг ⇒ зарын эзэн «📞 Дугаар байхгүй» гэж харж,
--      хэнд залгахаа мэдэхгүй байв ✗
--   ② `listing_title` нь ихэвчлэн «Зар» болж хадгалагдав ✗ — `listings.title`
--      нь ЗААВАЛ БИШ талбар (0027) тул 0040-ийн `coalesce(…, 'Зар')` нөөц рүү
--      унадаг ⇒ «таны «Зар» зарыг таалагдлав» — АЛЬ ЗАР вэ нь ойлгомжгүй ✗
--
-- 🎯 ЮУ ХИЙХ ВЭ:
--   ① 🆕 `public.phone_from_email(text)` — `lib/phoneEmail.js → emailToPhone`-ын
--      SQL хувилбар (`88093663@phone.zarmn.mn` → `+97688093663`) ✓
--   ② `notify_listing_like()` СОЛИГДОВ: 📞 дугаарыг `auth.users.phone` БИШ,
--      `coalesce(phone, phone_from_email(email))`-ээр авна ✓ · 🏠 гарчиг нь
--      `title` → `property_type · district` → `'Зар'` дарааллаар нөөцлөгдөнө
--      (жишээ: «Орон сууц · Баянгол») ⇒ аль зар вэ нь ШУУД мэдэгдэнэ ✓
--   ③ ХУУЧИН мөрүүд БӨГЛӨГДӨНӨ (📞 дугаар + 🏠 гарчиг) — ДАХИН ажиллуулж
--      болно (idempotent ✓). ⚠️ Жинхэнэ гарчиг/дугаартай мөрийг ХӨНДӨӨХГҮЙ ✓
--
-- ⚠️ ХҮСНЭГТ/RLS/ЭРХ ХӨНДӨӨГДӨХГҮЙ — зөвхөн функц + ӨГӨГДӨЛ. `notifications`
--    бүтэц (0040), `notifications_select_own`/`update`/`delete` policy, `grant
--    update (read_at)` бүгд ХЭВЭЭР ⇒ клиент талаас нэмэлт эрх ГАРАХГҮЙ ✓
--
-- ⚠️ Триггерийг ДАХИН ҮҮСГЭХГҮЙ: `create or replace function` нь функцийн OID-ыг
--    хадгалдаг тул `listing_likes_notify` (0040) ШИНЭ бие рүүгээ автоматаар
--    залгагдана ✓
--
-- АЖИЛЛУУЛАХ (30 секунд, idempotent):
--   npm run migration:copy 0041_notification_phone_title.sql
--   → SQL нь clipboard-д орж, Supabase SQL Editor нээгдэнэ
--   → ⌘A ⌫ (хуучин агуулгыг устга) → ⌘V → Run
-- ============================================================

-- ---------- 1. 📞 Дотоод (синтетик) имэйл → утас ----------
-- ⚠️ `lib/phoneEmail.js → emailToPhone`-ын ЯГ ИЖИЛ дүрэм: сүүлийн 8 цифр +
--    '+976' угтвар. Хоёр өөр дүрэм үүсэхээс сэргийлж нэг л газарт (энд)
--    тодорхойлж, ТРИГГЕР ба БӨГЛӨЛТ хоёулаа энэ функцийг дуудна ✓
create or replace function public.phone_from_email(p_email text)
returns text
language sql
immutable
as $$
  select case
    when p_email is null then null
    when p_email not like '%@phone.zarmn.mn' then null
    when length(regexp_replace(split_part(p_email, '@', 1), '\D', '', 'g')) < 8 then null
    else '+976' || right(regexp_replace(split_part(p_email, '@', 1), '\D', '', 'g'), 8)
  end;
$$;

comment on function public.phone_from_email(text) is
  '📞 Дотоод (синтетик) имэйлээс утас: 88093663@phone.zarmn.mn → +97688093663. lib/phoneEmail.js → emailToPhone-ын SQL хувилбар (нэг дүрэм).';

-- ---------- 2. Триггер: 📞 дугаар + 🏠 гарчиг ----------
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

  -- ② Зарын эзэн ба 🏠 ГАРЧИГ: `title` → «төрөл · дүүрэг» → 'Зар'
  --    (⚠️ (69): `title` нь заавал биш тул хуучин 0040 нь бараг үргэлж «Зар»
  --     гэж хадгалдаг байв — тэгвэл АЛЬ ЗАР вэ гэдэг нь мэдэгдэхгүй ✗)
  select l.user_id,
         coalesce(
           nullif(btrim(l.title), ''),
           nullif(btrim(concat_ws(' · ',
             nullif(btrim(l.property_type), ''),
             nullif(btrim(l.district), '')
           )), ''),
           'Зар'
         )
    into owner_id, l_title
    from public.listings l
   where l.id = new.listing_id;

  -- ③ Зар олдохгүй (устсан) эсвэл эзэн нь ӨӨРӨӨ дарсан → мэдэгдэлгүй
  if owner_id is null or owner_id = new.user_id then
    return null;
  end if;

  -- ④ Хуулбарууд: хоч нэр (`profiles`, байхгүй бол null) + 📞 утас
  --    (⚠️ (69): `auth.users.phone` нь дотоод имэйлээр бүртгэгдсэн хэрэглэгчдэд
  --     ХООСОН байдаг ⇒ имэйлээс нь салгаж авна ✓)
  select nullif(btrim(p.display_name), '')
    into a_name
    from public.profiles p
   where p.id = new.user_id;

  select coalesce(
           nullif(btrim(u.phone), ''),
           public.phone_from_email(u.email)
         )
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
  '❤️ listing_likes-д мөр нэмэгдэхэд зарын эзэнд мэдэгдэл (хуулбартай) үүсгэнэ. 📞 дугаар нь auth.users.phone, хоосон бол дотоод имэйлээс (phone_from_email). 🏠 гарчиг нь title, байхгүй бол төрөл · дүүрэг. Зочин/өөрийн зарын ❤️-д юу ч хийхгүй.';

-- ---------- 3. ХУУЧИН мөрүүдийг БӨГЛӨХ (idempotent) ----------
-- ⚠️ Дараагийн удаа ажиллуулахад `where` нь хоосон болно ⇒ 0 мөр ✓
--    ① 📞 ДУГААР — зөвхөн ХООСОН/`null` мөрүүд (0040-ийн хуучин мөрүүд)
update public.notifications n
   set actor_phone = coalesce(
         nullif(btrim(u.phone), ''),
         public.phone_from_email(u.email)
       )
  from auth.users u
 where u.id = n.actor_id
   and nullif(btrim(n.actor_phone), '') is null
   and coalesce(nullif(btrim(u.phone), ''), public.phone_from_email(u.email)) is not null;

-- ② 🏠 ГАРЧИГ — зөвхөн НӨӨЦ «Зар» болсон мөрүүд; жинхэнэ гарчиг ХӨНДӨӨГДӨХГҮЙ ✓
update public.notifications n
   set listing_title = coalesce(
         nullif(btrim(l.title), ''),
         nullif(btrim(concat_ws(' · ',
           nullif(btrim(l.property_type), ''),
           nullif(btrim(l.district), '')
         )), ''),
         'Зар'
       )
  from public.listings l
 where l.id = n.listing_id
   and coalesce(nullif(btrim(n.listing_title), ''), 'Зар') = 'Зар'
   and coalesce(
         nullif(btrim(l.title), ''),
         nullif(btrim(concat_ws(' · ',
           nullif(btrim(l.property_type), ''),
           nullif(btrim(l.district), '')
         )), ''),
         'Зар'
       ) <> 'Зар';

-- ---------- 4. ШАЛГАХ (сонголтоор) ----------
--   select listing_title, actor_name, actor_phone, created_at
--     from public.notifications order by created_at desc limit 10;
--   select public.phone_from_email('88093663@phone.zarmn.mn');  -- +97688093663
