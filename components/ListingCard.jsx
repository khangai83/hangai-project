'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { shortPriceLabel, hasRealPrice, getPropertyIcon, firstImage, carTitle, timeAgo, formatAddress, listingTitle } from '../lib/format';
import { toggleFavorite, useFavorites, useLikeCount } from '../lib/favorites';
import VerifiedBadge from './VerifiedBadge';

/**
 * 🖼 КАРТ ДЭЭРХ ЦЭГИЙН ДЭЭД ХЯЗГААР (🆕 (85)) — 5-аас олон зурагтай үед цэгүүд
 *    нь хэт жижиг болж/нэгдэж харагдана ⇒ зөвхөн тоолуур (`🖼 2/16`) үлдэнэ ✓
 */
const MAX_CARD_DOTS = 5;

/*
 * ══════════════════════════════════════════════════════════════════════
 * 📇 ЗАРЫН КАРТ — БОСОО (vertical) жишиг сайтын хэв (2026-10-09, хэрэглэгчийн хүсэлт)
 * ══════════════════════════════════════════════════════════════════════
 * Хэрэглэгчийн хүсэлт: «зарыг харуулж байгаа картын загварыг жишиг сайт шиг
 * болгоорой» + жишиг сайтын нүүр ба зарын дэлгэрэнгүй дээрх картууд.
 * ⏳ Урьд нь карт нь ХЭВТЭЭ байв (зураг зүүн 42% + мэдээлэл баруун,
 *    `sm:h-[300px]`) — ОДОО **БОСОО**: ЗУРАГ ДЭЭРЭЭ бүтэн өргөн, доор нь
 *    мэдээлэл ⇒ жагсаалт нь БАГАНАТ GRID болно (карт бүр ~290px өргөн) ✓
 *
 * 🎨 ЛАВЛАХ ЗАГВАР (жишиг сайт) — 🆕 (86): хайрцаггүй, ГАРЧИГ → МЭДЭЭЛЭЛ → ҮНЭ:
 *   ┌─────────────────────────────────┐
 *   │  🖼 ЗУРАГ — БҮТЭН өргөн + КАРУСЕЛЬ│ ← `aspect-[4/3]` + `rounded-xl` (85)
 *   │  [Зарах]    ❤️ 5      ‹      ›   │ ← ❤️ БАРУУН ДЭЭД (🆕 (86), цагаан товч)
 *   │         • • ○ • •                │ ← цэгүүд (2…5 зурагтай үед)
 *   │  🎥                  🖼 2/16      │ ← АМЬД тоолуур (баруун ДООД)
 *   ├─────────────────────────────────┤  ⛔ хүрээ/сүүдэр/саарал хайрцаг БАЙХГҮЙ
 *   │  Toyota Vellfire, 2017/2026      │ ← 🏷️ гарчиг (🚗 АВТО-гарчиг, 2 мөр)
 *   │  135,500 км · Автомат · 2.5 л    │ ← 📋 мэдээллийн мөр
 *   │  🕒 27 минутын өмнө | 📍 Баянзүрх │ ← 📅 мета мөр (+ 👁 баруун захад)
 *   │  340 сая ₮ ✅                    │ ← 💰 ҮНЭ (22px, bold) ХАМГИЙН ДООР
 *   └─────────────────────────────────┘
 *
 * 🆕 (86) 2026-10-09 — «жишиг сайтын design» 3 ДАХЬ ЗАСВАР (хэрэглэгчийн хүсэлт:
 *    «like ийг картныхаа баруун дээд буланд гаргачих … картны design харагдах
 *     байдлыг жишиг сайт шиг болго»):
 *   ① ❤️/🤍 нь **ЗУРГИЙН БАРУУН ДЭЭД БУЛАНД** — цагаан товч (`h-8`,
 *      `bg-white/90`, `z-10`) дотор зүрхэн + нийт тоо (`data-fav-toggle` хэвээр,
 *      `preventDefault`+`stopPropagation` — карт `<Link>` тул ЗААВАЛ ✓)
 *   ② 💳 **ХҮРЭЭ/СААРАЛ ХАЙРЦАГ ХАСАГДАВ** — ⏳ (83)-ийн `bg-gray-100` + хүрээ +
 *      `shadow-card` БАЙХГҮЙ ⇒ карт нь зөвхөн ЗУРАГ (`rounded-xl`) + ТЕКСТ;
 *      текст нь зургийн зүүн захад тэгш (`p-3.5` → `pt-2.5`) ✓
 *   ③ 🔀 **ДАРААЛАЛ:** 🏷️ ГАРЧИГ → 📋 мэдээлэл → 🕒/📍 мета → 💰 ҮНЭ (хамгийн
 *      доор, `mt-auto`) — ⏳ (78)/(85)-д үнэ нь ХАМГИЙН ДЭЭД мөрөнд байв ✓
 *   ④ 🗑 мөрүүдийн хоорондох зураас (`border-t border-gray-100`) ХАСАГДАВ ✓
 *   ⑤ ⚠️ `/favorites`-ийн «Хасах» товч БҮХ дэлгэцэд картын баруун ДОО буланд
 *      (`max-sm:*` классууд ХАСАГДАВ) ⇒ мета мөр `pr-20` (⏳ `sm:pr-0` ХАСАГДАВ),
 *      үний мөрийн баруун тал ХООСОН (товч тэнд overlay болж сууна) ✓
 *
 * 🆕 (85) 2026-10-09 — «жишиг сайт шиг» ХОЁР ДАХЬ ЗАСВАР (хэрэглэгчийн хүсэлт:
 *    «Автомашины картыг … мэдээлэлтэй болго. Мөн дээрх зураг нь жишиг сайт шиг
 *     солих боломжтой болго. Мөн байрны зарын картыг ч жишиг сайт шиг болго,
 *     харин мэдээллийн хувьд Өрөөний тоо, угаалгын өрөөний тоо, талбайн хэмжээ,
 *     давхар гэх мэдээллийг хасна уу. Мөн зар оруулагчийн Profile зураг нэрийг
 *     ч хасна уу.»):
 *   ① 🖼 ЗУРГИЙН КАРУСЕЛЬ (ШИНЭ) — карт дээрх зураг ОДОО СОЛИГДОНО:
 *      📱 хуруугаар гүйлгэх (`overflow-x-auto` + `snap-x snap-mandatory`) ·
 *      🖥 ≥sm-д зүүн/баруун ‹ › товч (зөвхөн hover/фокус дээр) · ≤5 зурагтай
 *      үед доод ГОЛД ЦЭГҮҮД · баруун доод буланд АМЬД тоолуур (`🖼 2/6`) ✓
 *   ② 👤 НИЙТЛЭГЧИЙН BAND (Avatar 28px + нэр) КАРТ ДЭЭР ХАСАГДАВ — жишиг
 *      сайтын машин/байрны карт дээр нэр/профайл зураг ОГТ БАЙХГҮЙ ⇒ харин
 *      ✅ `VerifiedBadge` нь ҮНИЙ ЯГ ХАЖУУД үлдэв (`authorVisible`) ✓
 *   ③ 🚗 МАШИНЫ АВТО-ГАРЧИГ — зар оруулагч гарчиг БИЧЭЭГҮЙ бол `carTitle()`
 *      нь `attrs`-аас «Toyota Vellfire, 2017/2026» гэж бүтээнэ ✓
 *   ④ 🏠 БАЙРНЫ МӨР — 🛏 өрөө · 🚿 угаалгын өрөө · 📐 м² · 🏢 давхар ХАСАГДАВ
 *      (хэрэглэгчийн хүсэлт); 📅 «ашиглалтанд орсон он» ХЭВЭЭР ✓
 *
 * 📐 ХЭМЖЭЭ: картын өргөнийг ЖАГСААЛТЫН GRID тодорхойлно (🆕 (84) `HomeClient` →
 *    нүүр (сайдбаргүй) `lg:grid-cols-3 xl:grid-cols-4` ⇒ 4 карт ≈296px;
 *    хэсэг (280px сайдбартай) `xl:grid-cols-3`; /favorites · /history →
 *    `lg:grid-cols-3`; «🔎 Төстэй зарууд» → `lg:grid-cols-3 xl:grid-cols-4`).
 *    Зураг нь `aspect-[4/3]` тул өндөр нь өргөнөөсөө 75% — бэхлэгдсэн өндөр
 *    (`h-*`) БАЙХГҮЙ, агуулга чөлөөтэй уртасна ✓
 *    🔧 Зургийн харьцааг солих бол доорх `aspect-[4/3]`-г л өөрчилнө.
 *
 * ⚠️ ХАДГАЛАГДСАН ДҮРМҮҮД (өмнөх хэрэглэгчийн шийдвэрүүд — хөндөхгүй):
 *   ① «Үнэ тохирно» КАРТ ДЭЭР ГАРАХГҮЙ — зөвхөн `hasRealPrice` үед үнэ харагдана
 *   ② «Зарах / Түрээслэх» badge ЗӨВХӨН үл хөдлөхөд
 *   ③ ❤️/🤍 нь МИНИЙ favourite toggle БА нийт тоо (listings.likes) хоёулаа
 *   ④ Карт бүхэлдээ `<Link>` — дотор нь өөр `<Link>` БАЙХГҮЙ (HTML хориг)
 *   ⑤ /favorites хуудсанд «Хасах» товч утсанд баруун ДОО буланд буудаг тул
 *      доод мөр нь `max-sm:pr-20` (80px) хоосон зай үлдээнэ
 *   ⑥ 🆕 ❤️ нь **ЗУРГИЙН БАРУУН ДЭЭД БУЛАНД** (⏳ (78) үнийн мөрөнд, (85) үнийн
 *      хажууд байв ⇒ 🆕 (86) зурган дээр, цагаан товчин дотор ✓); ✅ баталгаа
 *      нь ҮНИЙ ЯГ ХАЖУУД (хамгийн доод мөр) ХЭВЭЭР ✓
 *   ⑦ 🆕 Зургийн тоо (`🖼 1/N`) нь БАРУУН ДООД буланд — баруун ДЭЭД булан
 *      нь /favorites-ийн «Хасах» товчинд чөлөөтэй үлдэнэ ✓
 *      ⚠️ 🆕 (85): тоолуур нь АМЬД (`🖼 2/16`) — гүйлгэх/товч дарахад шинэчлэгдэнэ ✓
 *      (⏳ (78) дээр «1/N» — зөвхөн ЭХНИЙ зураг байв)
 *   ⑧ 🖼 ХҮРЭЭ нь `overflow-x-auto` — картын `overflow-hidden`-тай зохицно:
 *      slide бүр `w-full shrink-0` тул нэг дор ЯГ 1 зураг харагдана ✓
 *      ⚠️ Scrollbar-ыг НУУНА (`[&::-webkit-scrollbar]:hidden`) — эс бөгөөс
 *      зургийн өндөр хэдэн px нэмэгдэж 4:3 харьцаа зөрчигдөнө ✗
 *   ⑨ 🚫 Slide/товч/цэг нь `<Link>`-ийн ДОТОР тул БҮГД `goToImage()`-ээр
 *      `preventDefault()` + `stopPropagation()` хийнэ (эс бөгөөс товч дарахад
 *      ЗАР РУУ үсрэнэ ✗) — ❤️ товчны ИЖИЛ дүрэм ✓

 * 🗑 (85): 👤 Band (Avatar + нэр) КАРТ ДЭЭР ХАСАГДАВ ⇒ `0017_profile_identity.sql`
 *    (`show_identity`) ба 🆕 (71) `0042_listing_show_name.sql` (`show_name`) нь
 *    карт дээр ЗӨВХӨН ✅ тэмдгийг удирдана. ⚠️ `!== false` дүрэм ХЭВЭЭР: `null`
 *    (хуучин зар/баганагүй) → ✅ ХАРАГДАНА ✓
 *    ⚠️ `author` проп ХӨНДӨӨГДӨӨГҮЙ (HomeClient · SimilarListings дамжуулсаар) —
 *    band-ыг буцаах бол зөвхөн доорх блокыг сэргээнэ (revert хялбар ✓)
 * 🗑 2026-10-06: 📝 ТАЙЛБАР (`listing.description`) карт дээр ХАСАГДАВ —
 *    хэрэглэгчийн хүсэлт («Нүүр хуудас дээрх зарын карт дээрээс Тайлбарыг
 *    байхгүй болго»). ⚠️ Дэлгэрэнгүй хуудас (`ListingDetailClient`) ХӨНДӨӨГДӨӨГҮЙ.
 * 🔍 ХАЙХ ҮГ: ListingCard, aspect-[4/3], data-listing-card, line-clamp-2,
 *    data-card-images, data-card-slide, data-card-prev, data-card-next,
 *    data-card-counter, data-card-dots, data-fav-toggle, activeIdx, goToImage,
 *    MAX_CARD_DOTS, carTitle, snap-x snap-mandatory, rounded-xl, bg-white/90,
 *    pt-2.5, border-t ХАСАГДАВ, pr-20
 *    grid-cols-1 sm:grid-cols-2 (жагсаалтын grid нь ХУУДАС бүр дээр)
 */
export default function ListingCard({ listing, author, attrsLine }) {
  const img = firstImage(listing);
  /**
   * ✅ БАТАЛГААЖСАН тэмдэг — 🆕 2026-10-08 (71): «Профайл нэрээ зар дээр гаргах
   *    уу? → Үгүй» (`show_name === false`) үед ✅ ГАРАХГҮЙ ✓
   *    ⚠️ 2026-10-09 (85): ⏳ band (Avatar 28px + нэр) нь картаас ХАСАГДАВ —
   *       тиймээс ✅ нь ҮНИЙ ЯГ ХАЖУУД л харагдана (жишиг сайтын машин карт дээр
   *       «68 сая ₮ ✓» гэж яг ийм байрлалтай ✓)
   *    ⚠️ `!== false` (БИШ `=== true`): багана байхгүй/`null` үед ХАРАГДАНА —
   *       хуучин заруудын хэв ХӨНДӨӨГДӨХГҮЙ ✓
   *    ⚠️ `author` проп ХЭВЭЭР (HomeClient · SimilarListings дамжуулсаар) — band-ыг
   *       буцаахад дахин уншина; одоо карт дээр РЕНДЭРЛЭГДЭХГҮЙ ✓
   */
  const authorVisible = listing.show_name !== false;
  const images = Array.isArray(listing.images) ? listing.images : [];
  const imageCount = images.length;
  // 🖼 КАРУСЕЛЬ (🆕 (85)) — `activeIdx` нь ХАРАГДАЖ буй зургийн дугаар: тоолуур
  //    ба цэгүүд түүнээс уншина; `scrollerRef` нь `scrollTo()`-г хүлээнэ ✓
  const scrollerRef = useRef(null);
  const scrollRafRef = useRef(0);
  const [activeIdx, setActiveIdx] = useState(0);
  // ⚠️ `requestAnimationFrame` — `scroll` нь секундэд олон удаа ажилладаг тул
  //    state-ийг НЭГ фрэймд 1 удаа л шинэчилнэ (мобайлд ч хөнгөн ✓);
  //    unmount дээр хийгдээгүй фрэймийг цуцална ✓
  useEffect(() => () => {
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current);
  }, []);
  const favoriteIds = useFavorites();
  const isFav = favoriteIds.includes(listing.id);
  // ❤️ Нийт хэдэн хүн таалагдсан (listings.likes — supabase/migrations/0007)
  const likes = useLikeCount(listing.id, listing.likes);
  // 👁 Нийт хэдэн хүн үзсэн (listings.views — 0007_listing_likes_views.sql)
  const views = Number(listing.views) || 0;
  const isSell = listing.category === 'sell';
  // ⚠️ «Зарах / Түрээслэх» нь ЗӨВХӨН үл хөдлөхөд (хэрэглэгчийн хүсэлт) —
  //    бусад хэсэгт (авто/ажил/компьютер…) энэ badge ХАРАГДАХГҮЙ.
  const isRealEstate = (listing.section || 'real-estate') === 'real-estate';
  // 🚗 Машин уу? — 🆕 (85) АВТО-гарчиг нь зөвхөн `auto` хэсэгт ✓
  const isAuto = (listing.section || 'real-estate') === 'auto';
  // 🏷️ Зарын гарчиг (0027_listing_title.sql) — хоосон бол мөр ГАРАХГҮЙ
  //    🆕 (85): 🚗 машин дээр зар оруулагч гарчиг БИЧЭЭГҮЙ бол `attrs`-аас
  //    «Toyota Vellfire, 2017/2026» гэж бүтээнэ (`carTitle`) — жишиг сайтын хэв;
  //    ⚠️ бичсэн гарчиг БАЙВАЛ түрүүлнэ (хэрэглэгчийн үгийг дарж бичихгүй ✓)
  const title = listingTitle(listing) || (isAuto ? carTitle(listing.attrs) : '');
  const address = formatAddress(listing);
  // ⚠️ 2026-10-06: 📝 ТАЙЛБАР карт дээр ХАСАГДАВ (хэрэглэгчийн хүсэлт:
  //    «Нүүр хуудас дээрх зарын карт дээрээс Тайлбарыг байхгүй болго»).
  //    `listing.description`-ыг унших/харуулах код БАЙХГҮЙ; карт нь НЭГ
  //    компонент тул нүүр · Таалагдсан · Нийтлэгч · газрын зураг БҮГДЭД хасагдана ✓.
  //    ⚠️ Дэлгэрэнгүй хуудсанд (`ListingDetailClient`) Тайлбар ХЭВЭЭР ✓.
  // 🏠 Байрны мөр — 🆕 (85): 🛏 өрөө · 🚿 угаалгын өрөө · 📐 м² · 🏢 давхар
  //    ХАСАГДАВ (хэрэглэгчийн хүсэлт) ⇒ үлдсэн нь 📅 ашиглалтанд орсон он ✓
  const buildYear = Number(listing.build_year) > 0 ? Number(listing.build_year) : 0;

  /**
   * 🖼 КАРУСЕЛЬ — ‹ › товч, цэг, 📱 хурууны гүйлгээ БҮГД НЭГ МЕХАНИЗМТАЙ:
   *    зөвхөн `scroller.scrollTo()`-г хөдөлгөнө (React state нь ХАРАГДАЦ) ✓
   * ⚠️ `scrollLeft / clientWidth` — slide бүр `w-full` тул бүхэл тоо гарна;
   *    `Math.round` нь хагас зайд зогссон үеийн хэлбэлзлийг дарна ✓
   */
  const handleScroll = () => {
    if (scrollRafRef.current) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = 0;
      const el = scrollerRef.current;
      if (!el || !el.clientWidth) return;
      const next = Math.max(0, Math.min(imageCount - 1, Math.round(el.scrollLeft / el.clientWidth)));
      setActiveIdx((prev) => (prev === next ? prev : next));
    });
  };

  /**
   * Товч/цэг дээр дарвал → тухайн зураг руу гүйлгэнэ (эсрэг зүгт тойрно ✓)
   * ⚠️ Карт бүхэлдээ `<Link>` тул `preventDefault` + `stopPropagation` ЗААВАЛ —
   *    эс бөгөөс товч дарахад ЗАР РУУ шилжинэ ✗ (❤️ товчны ИЖИЛ хамгаалалт ✓)
   */
  const goToImage = (e, i) => {
    e.preventDefault();
    e.stopPropagation();
    const el = scrollerRef.current;
    if (!el || !el.clientWidth || imageCount < 2) return;
    const next = ((i % imageCount) + imageCount) % imageCount;
    el.scrollTo({ left: next * el.clientWidth, behavior: 'smooth' });
    setActiveIdx(next);
  };

  return (
    <Link
      href={`/listings/${listing.id}`}
      data-listing-card
      /* 🎨 2026-10-09 (86): ХҮРЭЭ/СААРАЛ ХАЙРЦАГ ХАСАГДАВ — ⏳ (83)-д карт нь
         `bg-gray-100` + хүрээ + `shadow-card` байв ⇒ ОДОО **жишиг сайтын хэв**:
         карт нь ЗӨВХӨН зураг (дугуйрсан `rounded-xl`) + доор нь текст — цагаан
         дэвсгэр дээр ямар ч хайрцаг/хүрээ/сүүдэр БАЙХГҮЙ ✓ (хэрэглэгчийн хүсэлт:
         «картны design харагдах байдлыг жишиг сайт шиг болго»)  */
      className="group flex flex-col"
    >
      {/* ══════ 🖼 ЗУРАГ (дээд) — БҮТЭН өргөн, `aspect-[4/3]` + КАРУСЕЛЬ (85) ══════
          🎨 2026-10-09 (87): дүүргэлт `bg-gray-100` ХАСАГДАВ (хэрэглэгчийн хүсэлт:
          «бүх саарал өнгийг үгүй хий») — зургийн хайрцаг нь ЦАГААН дэвсгэртэй
          болов; зураг ачаалагдах хүртэл ч, зураггүй зарын icon ч цагаан дээр
          харагдана (жишиг сайтын хэв) ✓ */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl">
        {img ? (
          <>
            {/* 🖼 КАРУСЕЛЬ — slide бүр картын БҮТЭН өргөн (`w-full shrink-0`) тул
                нэг дор ЯГ 1 зураг харагдана; 📱 хуруугаар гүйлгэхэд `snap-center`
                голлуулж, `scroll` дээр `activeIdx` шинэчлэгдэнэ ✓
                ⚠️ Scrollbar-ыг НУУНА (`[&::-webkit-scrollbar]:hidden`) — эс бөгөөс
                   зургийн өндөр хэдэн px нэмэгдэж 4:3 харьцаа зөрчигдөнө ✗
                ⚠️ `overscroll-x-contain` — мобайлд swipe нь хуудасны «буцах»
                   дохио (back gesture) болохоос сэргийлнэ ✓
                ⚠️ 🗑 `group-hover:scale-105` (зургийн зум) ХАСАГДАВ — жишиг сайтын
                   карт дээр зураг ЗУМДАГГҮЙ (карусельд хэт «үсэргэлттэй» ✗) */}
            <div
              ref={scrollerRef}
              data-card-images
              onScroll={handleScroll}
              className="flex h-full w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {images.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={i}
                  src={src}
                  alt={`${listing.property_type || 'Зар'} — ${i + 1}`}
                  loading="lazy"
                  draggable={false}
                  data-card-slide={i}
                  className="h-full w-full shrink-0 snap-center object-cover"
                />
              ))}
            </div>

            {imageCount > 1 && (
              <>
                {/* ‹ › — ЗӨВХӨН 🖥 (≥sm) ба ЗӨВХӨН hover/фокус дээр (жишиг сайтын
                    хэв); 📱 дээр хурууны гүйлгээ хангалттай ⇒ товч ХЭРЭГГҮЙ ✓ */}
                <button
                  type="button"
                  data-card-prev
                  aria-label="Өмнөх зураг"
                  onClick={(e) => goToImage(e, activeIdx - 1)}
                  className="absolute left-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 pb-0.5 text-lg font-bold leading-none text-gray-700 shadow-card transition hover:bg-white sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  ‹
                </button>
                <button
                  type="button"
                  data-card-next
                  aria-label="Дараагийн зураг"
                  onClick={(e) => goToImage(e, activeIdx + 1)}
                  className="absolute right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 pb-0.5 text-lg font-bold leading-none text-gray-700 shadow-card transition hover:bg-white sm:flex sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                >
                  ›
                </button>

                {/* • ЦЭГҮҮД — доод ГОЛД (жишиг сайтын хэв); ⚠️ зөвхөн 2…5 зурагтай
                    үед (`MAX_CARD_DOTS`) — 6+ бол «🖼 2/16» тоолуур л утгатай ✓ */}
                {imageCount <= MAX_CARD_DOTS && (
                  <div data-card-dots className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        type="button"
                        aria-label={`${i + 1}-р зураг`}
                        aria-current={i === activeIdx ? 'true' : undefined}
                        onClick={(e) => goToImage(e, i)}
                        className={`h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_0_1px_rgba(0,0,0,0.2)] transition ${
                          i === activeIdx ? 'opacity-100' : 'opacity-60 hover:opacity-90'
                        }`}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">
            {getPropertyIcon(listing.property_type, listing.section)}
          </div>
        )}

        {/* 🏷️ Зарах / Түрээслэх — зөвхөн үл хөдлөхөд (зүүн дээд булан) */}
        {isRealEstate && (
          <span className={`badge absolute left-2 top-2 ${isSell ? 'badge-sell' : 'badge-rent'}`}>
            {isSell ? 'Зарах' : 'Түрээс'}
          </span>
        )}

        {/* 🖼 ЗУРГИЙН ТООЛУУР — «🖼 2/16» (баруун ДООД булан) — 🆕 (85): АМЬД
            (гүйлгэх эсвэл ‹ › товч дарахад `activeIdx`-ээр шинэчлэгдэнэ ✓)
            ⚠️ Баруун ДЭЭД булан нь ❤️ товч (🆕 (86)), баруун ДОО булан нь
               /favorites-ийн «Хасах» товч (картын хүрээн дэх overlay) — 3 нь
               ЯЛГААТАЙ буланд тул давхцахгүй ✓
            ⚠️ Зөвхөн 2+ зурагтай үед (1 зурагт «1/1» утгагүй)
            ⚠️ `data-card-counter` — CDP-ийн тогтвортой дэгээ (`bottom-2 right-2`) ✓ */}
        {imageCount > 1 && (
          <span
            data-card-counter
            title={`Нийт ${imageCount} зураг — ${activeIdx + 1}-д харагдаж байна`}
            className="absolute bottom-2 right-2 flex h-6 items-center gap-1 rounded-full bg-black/60 px-2 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm"
          >
            🖼 {activeIdx + 1}/{imageCount}
          </span>
        )}

        {/* 🎥 Видео байгаа зарын тэмдэг (0011_listing_video.sql → video_url)
            ⚠️ Зүүн ДООД буланд — баруун ДООД нь 🖼 тоолуур, баруун ДЭЭД нь
               ❤️ товч (🆕 (86)) тул давхцахгүй ✓ (`video_url` нь КАНОНИК линк) */}
        {listing.video_url && (
          <span
            title="Энэ зарт видео бий"
            className="absolute bottom-2 left-2 flex h-7 items-center gap-1 rounded-full bg-black/65 px-2.5 text-[12px] font-bold text-white shadow backdrop-blur-sm"
          >
            🎥 Видео
          </span>
        )}

        {/* ❤️/🤍 — МИНИЙ favourite toggle БА нийт тоо (`listings.likes`, 0007)
            🆕 2026-10-09 (86): **ЗУРГИЙН БАРУУН ДЭЭД БУЛАНД** — хэрэглэгчийн
            хүсэлт: «like ийг картныхаа баруун дээд буланд гаргачих» (жишиг сайтын
            хэв: зургийн баруун дээд буланд ЦАГААН товчтой зүрхэн ✓)
            ⚠️ ⏳ (78) — үнийн мөрөнд, (85) — үнийн хажууд байв ⇒ ОДОО зурган дээр ✓
            ⚠️ `z-10` — «Зарах / Түрээслэх» badge ба 🖼 тоолуураас ДЭЭР байрлана ✓
            ⚠️ Карт бүхэлдээ `<Link>` тул `preventDefault` + `stopPropagation`
               ЗААВАЛ (эс бөгөөс зүрхэн дарахад ЗАР РУУ шилжинэ ✗) ✓
            ⚠️ Товч нь `/favorites`-ийн «Хасах» товчтой МӨРГӨЛДӨХГҮЙ — тэр нь
               картын баруун ДОО буланд (🆕 (86): бүх дэлгэцэд) байрлана ✓ */ }
        <button
          type="button"
          data-fav-toggle
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(listing.id);
          }}
          aria-label={isFav ? 'Таалагдсан жагсаалтаас хасах' : 'Таалагдсан жагсаалтад нэмэх'}
          title={isFav ? 'Таалагдсанаас хасах' : 'Надад таалагдсан'}
          className={`absolute right-2 top-2 z-10 inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-white/90 px-2.5 text-[13px] font-semibold shadow-card backdrop-blur-sm transition hover:bg-white hover:text-red-600 ${
            isFav ? 'text-red-600' : 'text-gray-700'
          }`}
        >
          {isFav ? '❤️' : '🤍'} {likes}
        </button>
      </div>

      {/* ══════ 📋 МЭДЭЭЛЭЛ (доод) — ЗУРГИЙН ДООР ══════
          🆕 (86): хайрцаг БАЙХГҮЙ болов ⇒ текст нь ЗУРГИЙН зүүн захад ТЭГШ
          (⏳ (78)-д `p-3.5` — саарал карт дотор «доторлосон» байв ✓) */}
      <div className="flex flex-1 flex-col pt-2.5">
        {/* 🗑 👤 НИЙТЛЭГЧИЙН BAND (Avatar 28px + нэр + ✅) ХАСАГДАВ — 2026-10-09 (85)
            (хэрэглэгч: «зар оруулагчийн Profile зураг нэрийг ч хасна уу») ⇒
            ✅ `VerifiedBadge` нь доорх ҮНИЙ МӨРӨНД шилжив — жишиг сайтын машин
            карт дээр «68 сая ₮ ✓» гэж яг ийм байрлалтай ✓
            ⚠️ `listing.show_name` (0042) ба `0017` нь карт дээр ЗӨВХӨН ✅ тэмдгийг
               удирдана; `author` проп нь хуудсууд дээр ХЭВЭЭР дамжигдана
               (band-ыг буцаах бол зөвхөн энэ блокыг сэргээнэ ✓) */}

        {/* 🏷️ ЗАРЫН ГАРЧИГ — ХАМГИЙН ДЭЭД МӨР (🆕 (86) жишиг сайтын ДАРААЛАЛ:
            ГАРЧИГ → МЭДЭЭЛЭЛ → ҮНЭ; ⏳ (78)/(85)-д үнэ нь ЭХЭНД байв)
            ⚠️ `line-clamp-2` (**2 мөр**) + `text-[15px] font-semibold`
               ХӨНДӨӨГДӨӨГҮЙ (`test-card` гэрээ ✓) */ }
        {title && (
          <div className="line-clamp-2 text-[15px] font-semibold leading-snug text-gray-900" title={title}>
            {title}
          </div>
        )}

        {/* 📋 МЭДЭЭЛЛИЙН МӨР
            ① 🏠 үл хөдлөх → ЗӨВХӨН 📅 «ашиглалтанд орсон он» (🆕 (85): 🛏 өрөө ·
               🚿 угаалгын өрөө · 📐 м² · 🏢 давхар ХАСАГДАВ — хэрэглэгчийн хүсэлт:
               «мэдээллийн хувьд, Өрөөний тоо, угаалгын өрөөний тоо, талбайн
               хэмжээ, давхар гэх мэдээллийг хасна уу»)
            ② бусад хэсэг → `attrsLine` (HomeClient нь `formatAttrsLine`-ээр бэлдэнэ;
               🚗 машин: гүйлт · хурдны хайрцаг · хөдөлгүүр · түлш ✓)
            ⚠️ Хоёулаа хоосон бол мөр ОГТ ГАРАХГҮЙ (`false`/`0`/`''`) ✓
            ⚠️ 🗑 `getFloorLabel` импорт + `floorLabel` ХАСАГДАВ (карт дээр
               хэрэггүй болов; Дэлгэрэнгүй хуудсанд ХЭВЭЭР ✓) */}
        {isRealEstate
          ? buildYear > 0 && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-gray-600">
                <span title="Ашиглалтанд орсон он">📅 {buildYear} он</span>
              </div>
            )
          : attrsLine && (
              <div className="mt-1.5 truncate text-[14px] text-gray-600" title={attrsLine}>
                {attrsLine}
              </div>
            )}

        {/* ⚠️ 2026-10-06: 📝 ТАЙЛБАР блок ХАСАГДАВ (хэрэглэгчийн хүсэлт) —
            карт дээр `listing.description` харуулахгүй ✓ (Дэлгэрэнгүй хуудсанд ХЭВЭЭР) */}

        {/* 📅 МЕТА МӨР — 🕒 огноо | 📍 хаяг   …   👁 үзсэн
            🆕 (86): хүрээ-зураас (`border-t`) ХАСАГДАВ — жишиг сайтын карт дээр
               мөрүүдийн хооронд зураас БАЙХГҮЙ ✓ · `mt-auto` ХАСАГДСАН (үнэ нь
               хамгийн доор тогтоно — доорх үний мөр `mt-auto`-тай ✓)
            ⚠️ ❤️/🤍 энд БАЙХГҮЙ (78: үнийн мөрөнд → 🆕 (86): ЗУРГИЙН баруун
               дээд буланд ✓)
            📱 МОБАЙЛ: хаяг нь `order-last w-full` → БҮТЭН мөр болж доош бууна
               (эс бөгөөс `pr-20`-ийн дараа хаяг «…» болж бүрэн алга болно ✗);
               ≥640px-д `sm:order-none sm:flex-1` → нэг мөрөнд буцаж эгнэнэ ✓
            ⚠️ `pr-20` — /favorites-ийн «Хасах» товч (🆕 (86): БҮХ дэлгэцэд баруун
               ДОО буланд) доод 2 мөрний баруун захад давхцаж болзошгүй тул мөр
               БҮРД 80px нөөц үлдээнэ (⏳ `sm:pr-0` ХАСАГДАВ ✓) */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pr-20 pt-0.5 text-[13px] text-gray-500 sm:flex-nowrap">
          <span className="whitespace-nowrap" title="Нийтэлсэн огноо">🕒 {timeAgo(listing.created_at)}</span>
          {address && (
            <span className="order-last w-full truncate sm:order-none sm:w-auto sm:flex-1" title={address}>
              <span aria-hidden="true" className="mr-1.5 hidden text-gray-300 sm:inline">|</span>
              📍 {address}
            </span>
          )}
          <span className="ml-auto flex shrink-0 items-center gap-2">
            <span className="font-semibold tabular-nums text-gray-600" title="Энэ зарыг хэдэн хүн үзсэн">
              👁 {views}
            </span>
          </span>
        </div>

        {/* 💰 ҮНЭ — ХАМГИЙН ДООД МӨР (🆕 (86) жишиг сайтын хэв: үнэ нь ХАМГИЙН
            ДООР, ТОМ bold) + ✅ баталгаа ЯГ ХАЖУУД ✓
            ⚠️ 22px extrabold + товч формат ХӨНДӨӨГДӨӨГҮЙ (`test-card` гэрээ ✓);
               «Үнэ тохирно» карт дээр ГАРАХГҮЙ (`hasRealPrice` — 2026-10-02) ✓
            ⚠️ `mt-auto` — бүх картын үнэ НЭГ ЗУРААСАНД эгнэхийн тулд мөрийг
               картын ёроолд тогтооно ✓ (⏳ (86)-аас өмнө энэ нь мета мөрд байв)
            ⚠️ Баруун тал нь ХООСОН — /favorites-ийн «Хасах» товч тэнд overlay
               болж сууна (тиймээс `pr-*` нөөц ШААРДЛАГАГҮЙ) ✓ */}
        <div className="mt-auto flex items-center gap-2 pt-1.5">
          {hasRealPrice(listing) && (
            <div className="min-w-0 text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-gray-900">
              {shortPriceLabel(listing)}
            </div>
          )}
          {/* ✅ БАТАЛГААЖСАН — үнийн ЯГ ХАЖУУД (🆕 (85), жишиг сайтын хэв)
              ⚠️ `show_name === false` (зар оруулагч нэрээ нуусан) бол ГАРАХГҮЙ ✓ */}
          {authorVisible && <VerifiedBadge size={15} className="text-primary" />}
        </div>
      </div>
    </Link>
  );
}

