'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { shortPriceLabel, hasRealPrice, getPropertyIcon, firstImage, autoTitle, timeAgo, formatCardAddress, listingTitle } from '../lib/format';
import { toggleFavorite, useFavorites, useLikeCount } from '../lib/favorites';
import VerifiedBadge from './VerifiedBadge';
// 📍👁 2026-10-10 (96) — МЕТА МӨРИЙН ICONУУД EMOJI → SVG (хэрэглэгчийн хүсэлт):
//    ① 📍 → `MapPinIcon` (🗺 «Газрын зураг» товчны pin-тай ЯГ ИЖИЛ).
//    ⚠️ 🆕 (97) Карт дээр 👁 «үзсэн» тоо ХАСАГДАВ — жишиг сайтын карт нь зөвхөн
//       «📍 хаяг | 📅 огноо» харуулна (🆕 (107)-д дараалал нь хаяг → огноо
//       болов) ⇒ `EyeIcon` импорт хэрэггүй болов ✓
import { MapPinIcon, HeartIcon } from './HeaderIcons';

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
 * 🎨 ЛАВЛАХ ЗАГВАР (жишиг сайт) — 🆕 (97): ҮНЭ → ГАРЧИГ → МЭДЭЭЛЭЛ → МЕТА:
 *   ┌─────────────────────────────────┐
 *   │  🖼 ЗУРАГ — БҮТЭН өргөн + КАРУСЕЛЬ│ ← `aspect-[4/3]` + `rounded-xl` (85)
 *   │  [Зарах]          ‹      ›      │ ← «Зарах/Түрээслэх» badge (зүүн дээд)
 *   │         • • ○ • •                │ ← цэгүүд (2…5 зурагтай үед)
 *   │  🎥                  🖼 2/16      │ ← АМЬД тоолуур (баруун ДООД)
 *   ├─────────────────────────────────┤  ⛔ хүрээ/сүүдэр/саарал хайрцаг БАЙХГҮЙ
 *   │  340 сая ₮ ✅            ❤️      │ ← 💰 ҮНЭ (22px, bold) + ✅ | ❤️ баруун захад
 *   │  Toyota Vellfire, 2017/2026      │ ← 🏷️ гарчиг (🚗 АВТО-гарчиг, 2 мөр)
 *   │  135,500 км · Автомат · 2.5 л    │ ← 📋 мэдээллийн мөр
 *   │  (pin) Улаанбаатар — Баянгол   │ ← 📍📅 мета мөр (ХАМГИЙН ДООР, emoji-гүй)
 *   │  2-р хороо | 27 минутын өмнө   │ ←    🆕 (107): хаяг ЭХЭНД, огноо ТӨГСГӨЛД
 *   └─────────────────────────────────┘
 *
 * 🆕 (107) 2026-10-10 — «ЖИШИГ ЗУРГИЙН КАРТ ШИГ ТЕКСТИЙН ХЭВ» (хэрэглэгчийн
 *   хүсэлт: «change cards design text style to like attached cards to real
 *   estate, notebook, cars cards. Also, swap location, the date of creation on
 *   the card of bottom section»):
 *   ① 📍📅 МЕТА МӨРИЙН ДАРААЛАЛ СОЛИГДОВ — ⏳ (97)–(101) «огноо | 📍 хаяг»
 *      байсныг **⬅ буцаав**: ОДОО **хаяг ЭХЭНД, огноо ТӨГСГӨЛД**
 *      («📍 Улаанбаатар — Баянгол — 2-р хороо | 2 өдрийн өмнө») ✓
 *   ② 🗺 ХАЯГ нь `formatCardAddress` — **хот → дүүрэг → хороо**, « — »
 *      тусгаарлагчтай (⏳ `formatAddress` — «2-р хороо, Баянгол, Улаанбаатар»);
 *      ⚠️ дэлгэрэнгүй хуудсанд `formatAddress` ХЭВЭЭР ✓
 *   ③ 🔤 ТЕКСТИЙН ХЭВ: гарчиг `font-semibold` → **`font-normal`** (жишиг зургийн
 *      картын гарчиг нь BOLD биш), 📋 мэдээлэл `text-[14px] text-gray-600` →
 *      **`text-[15px] text-gray-500`**, 📍📅 мета `text-[13px]` → **`text-[15px]`**
 *      + `leading-snug` (жишиг зургийн мэдээлэл ба мета НЭГ хэмжээтэй) ✓
 *   ④ 🧩 Мета мөр нь `flex` БИШ — **ТЕКСТИЙН УРСГАЛ** (жишиг зургийн карт дээр
 *      «1 минутын өмнө | Улаанбаатар — Сонгинохайрхан — Авто худалдааны
 *      цогцолбор» гэж мөр таслан зөөгддөг) ✓
 *   ⑤ ⚠️ Байршил ХООСОН бол `|` ч, хаяг ч ГАРАХГҮЙ (зөвхөн огноо) ✓
 *   ⚠️ ҮНЭ (`text-[22px] font-extrabold` + `shortPriceLabel`), 🖼 4:3, ❤️-ийн
 *      байрлал, ✅ баталгаа, карусель — БҮГД ХӨНДӨӨГДӨӨГҮЙ ✓
 *
 * 🆕 (101) 2026-10-10 — «ХАВСАРГАСАН 2 КАРТ ШИГ» (хэрэглэгчийн хүсэлт):
 *   «change to all detail card … attached 2 cards, study and change my card
 *    information. one is car card, one is product card» ⇒ карт нь жишиг зургийн
 *    хэв рүү БҮРЭН нийцэв:
 *   ① `🤍`/`❤️` EMOJI → **`HeartIcon` SVG** (`components/HeaderIcons.jsx`,
 *      `filled={isFav}`) — зургийн зүрхэн нь нимгэн ХАР зураастай; ⏳ emoji нь
 *      OS бүрд өөр өөрөөр зурагдаж, `text-*` өнгийг дагадаггүй байв ✗
 *   ② `🕒` ба `📅` EMOJI ХАСАГДАВ — зургийн мэдээллийн мөр нь ЗӨВХӨН текст
 *      («20,400 км · Автомат · 4.0 л · Бензин», «4 минутын өмнө | Улаанбаатар …»)
 *   ③ ХАЯГ нь `truncate`-ГҮЙ — БҮТЭН харагдана, урт үедээ доош мөр таслана ✓
 *   ④ Гарчиг 15px → **16px** (зургийн гарчиг мэдээллийн мөрөөс ТОМ харагдана) ✓
 *   ⚠️ «Миний зарууд» (`MyListingsClient`) ба админ (`AdminListingsClient`)-ийн
 *      ТУСДАА картууд ч ижил хэв рүү шилжив (хайрцаг/сүүдэр/саарал ХАСАГДАВ) ✓
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
 *   ③ 🚗💻 АВТО-ГАРЧИГ (🆕 (105)) — 🚗 Машин ба 💻 Notebook-д гарчгийн талбар
 *      БАЙХГҮЙ ⇒ `autoTitle()` нь `attrs`-аас бүтээнэ: 🚗 «Toyota Vellfire,
 *      2017/2026» (брэнд загвар, он) · 💻 «14.0", Intel Core i5, 16 GB» ✓
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
 *    MAX_CARD_DOTS, autoTitle, carTitle, notebookTitle, snap-x snap-mandatory,
 *    rounded-xl, bg-white/90,
 *    pt-2.5, border-t ХАСАГДАВ, pr-20, formatCardAddress, text-[15px],
 *    leading-snug, font-normal, mx-1.5 text-gray-300
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
  // ⚠️ 🆕 (97): 👁 «үзсэн» тоо карт дээр ХАСАГДАВ — жишиг сайтын карт нь зөвхөн
  //    «🕒 огноо | 📍 хаяг» харуулдаг; тоо нь дэлгэрэнгүй хуудсанд ХЭВЭЭР ✓
  const isSell = listing.category === 'sell';
  // ⚠️ «Зарах / Түрээслэх» нь ЗӨВХӨН үл хөдлөхөд (хэрэглэгчийн хүсэлт) —
  //    бусад хэсэгт (авто/ажил/компьютер…) энэ badge ХАРАГДАХГҮЙ.
  const isRealEstate = (listing.section || 'real-estate') === 'real-estate';
  // 🏷️ Зарын гарчиг (0027_listing_title.sql) — хоосон бол мөр ГАРАХГҮЙ
  //    🆕 (105): 🚗 Машин ба 💻 Notebook-д гарын гарчгийн талбар БАЙХГҮЙ
  //    (`hasAutoTitle`) ⇒ гарчиг нь `autoTitle(listing)`-ээр аттрибутаас
  //    автоматаар бүтнэ (🚗 «Toyota Vellfire, 2017/2026» · 💻 «14.0", Intel
  //    Core i5, 16 GB»); ⚠️ авто-гарчиг ХООСОН бол (аттр дутуу) хуучин
  //    заруудын бичсэн `title` нөөцөөрөө харагдана ✓
  const title = autoTitle(listing) || listingTitle(listing);
  // 📍 Хаяг — 🆕 (107): КАРТЫН хэв («Улаанбаатар — Баянгол — 2-р хороо» —
  //    хот → дүүрэг → хороо, « — » тусгаарлагчтай, жишиг сайтын карт) ✓
  //    ⚠️ Дэлгэрэнгүй хуудас нь `formatAddress` (хороо → дүүрэг → хот) ХЭВЭЭР ✓
  const address = formatCardAddress(listing);
  // ⚠️ 2026-10-06: 📝 ТАЙЛБАР карт дээр ХАСАГДАВ (хэрэглэгчийн хүсэлт:
  //    «Нүүр хуудас дээрх зарын карт дээрээс Тайлбарыг байхгүй болго»).
  //    `listing.description`-ыг унших/харуулах код БАЙХГҮЙ; карт нь НЭГ
  //    компонент тул нүүр · Таалагдсан · Нийтлэгч · газрын зураг БҮГДЭД хасагдана ✓.
  //    ⚠️ Дэлгэрэнгүй хуудсанд (`ListingDetailClient`) Тайлбар ХЭВЭЭР ✓.
  // 🗑 (108) 2026-10-10: `buildYear` (`listing.build_year`) КАРТ ДЭЭР ХЭРЭГГҮЙ
  //    БОЛОВ — 🏠 үл хөдлөхийн «ашиглалтанд орсон он» мөр бүхэлдээ ХАСАГДАВ
  //    (хэрэглэгчийн хүсэлт: «remove Ашиглалтанд орсон он from on the card»);
  //    `build_year` нь Дэлгэрэнгүй хуудас · форм · шүүлтэд ХЭВЭЭР ✓

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

      </div>

      {/* ══════ 📋 МЭДЭЭЛЭЛ (доод) — ЗУРГИЙН ДООР ══════
          🆕 (86): хайрцаг БАЙХГҮЙ болов ⇒ текст нь ЗУРГИЙН зүүн захад ТЭГШ
          (⏳ (78)-д `p-3.5` — саарал карт дотор «доторлосон» байв ✓) */}
      <div className="flex flex-1 flex-col pt-2.5">
        {/* 💰 ҮНЭ — ЗУРГИЙН ЯГ ДОР (хамгийн дээд мөр) + ✅ баталгаа ЯГ ХАЖУУД;
            ❤️/🤍 favourite toggle нь мөрийн БАРУУН ЗАХАД (🆕 (97) — жишиг сайтын
            картын хэв). Дараалал: ҮНЭ → ГАРЧИГ → МЭДЭЭЛЭЛ → МЕТА.
            ⚠️ «Үнэ тохирно» карт дээр ГАРАХГҮЙ (`hasRealPrice` — 2026-10-02) ✓
            ⚠️ 🗑 👤 НИЙТЛЭГЧИЙН BAND (Avatar 28px + нэр) КАРТ ДЭЭР БАЙХГҮЙ (85) —
               `listing.show_name` (0042/0017) нь карт дээр ЗӨВХӨН ✅ тэмдгийг удирдана;
               `author` проп хуудсууд дээр ХЭВЭЭР (band-ыг буцаах бол блок сэргээнэ ✓) */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            {hasRealPrice(listing) && (
              <div className="min-w-0 text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-gray-900">
                {shortPriceLabel(listing)}
              </div>
            )}
            {/* ✅ БАТАЛГААЖСАН — үнийн ЯГ ХАЖУУД (🆕 (85), жишиг сайтын хэв)
                ⚠️ `show_name === false` (зар оруулагч нэрээ нуусан) бол ГАРАХГҮЙ ✓ */}
            {authorVisible && <VerifiedBadge size={15} className="text-primary" />}
          </div>
          {/* ❤️/🤍 — МИНИЙ favourite toggle БА нийт тоо (`listings.likes`, 0007)
              🆕 (97): жишиг сайтын картын хэвээр ҮНИЙ МӨРИЙН БАРУУН ЗАХАД
              (⏳ (86)-д зургийн баруун дээд буланд цагаан товчтой байв ✓)
              ⚠️ Карт бүхэлдээ `<Link>` тул `preventDefault` + `stopPropagation`
                 ЗААВАЛ (эс бөгөөс зүрхэн дарахад ЗАР РУУ шилжинэ ✗) ✓
              ⚠️ `/favorites`-ийн «Хасах» товч нь картын баруун ДОО буланд —
                 энэ зүрхэнтэй мөргөлдөхгүй ✓ */}
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
            className={`-mr-1 -mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:text-red-600 ${
              isFav ? 'text-red-600' : 'text-gray-900'
            }`}
          >
            {/* 🆕 (101) ⏳ `{isFav ? '❤️' : '🤍'}` emoji → **`HeartIcon` SVG**
                (жишиг зургийн хэв: нимгэн ХАР зураастай зүрхэн). ⏳ emoji нь OS
                бүрд өөр өөрөөр/өөрийн өнгөтэй зурагдаж, `text-*`-г дагадаггүй байв ✗
                ⇒ одоо `currentColor` — идэвхтэй үед `text-red-600`, `filled` ✓ */}
            <HeartIcon className="h-6 w-6" filled={isFav} />
          </button>
        </div>

        {/* 🏷️ ЗАРЫН ГАРЧИГ — ҮНИЙ ЯГ ДООР (🆕 (97) жишиг сайтын ДАРААЛАЛ:
            ҮНЭ → ГАРЧИГ → МЭДЭЭЛЭЛ → МЕТА; ⏳ (86)-д гарчиг ХАМГИЙН ДЭЭД мөрөнд,
            үнэ ХАМГИЙН ДООР байв ✗)
            🆕 (107) ТЕКСТИЙН ХЭВ (хэрэглэгчийн хүсэлт: «change cards design
               text style to like attached cards»): ⏳ `font-semibold` (600) →
               **`font-normal`** (400) — жишиг зургийн картын гарчиг нь ТОМООС
               биш, энгийн жингээр харагдана (үнэ л BOLD байна) ✓
            ⚠️ `line-clamp-2` (**2 мөр**) + `text-[16px]` ХӨНДӨӨГДӨӨГҮЙ
               (`test-card` гэрээ ✓) */ }
        {title && (
          <div className="mt-1 line-clamp-2 text-[16px] font-normal leading-snug text-gray-900" title={title}>
            {title}
          </div>
        )}

        {/* 📋 МЭДЭЭЛЛИЙН МӨР
            ① 🏠 үл хөдлөх → **МӨР БАЙХГҮЙ** (🆕 (108) 2026-10-10) — ⏳ (85)–(107)
               «📅 ашиглалтанд орсон он» (`{buildYear} он` + `title="Ашиглалтанд
               орсон он"`) гардаг байв ⇒ хэрэглэгчийн хүсэлт: «remove Ашиглалтанд
               орсон он from on the card … just delete from real estate card» ⇒
               БҮРЭН ХАСАГДАВ ✓ (жишиг зургийн үл хөдлөхийн карт дээр мэдээллийн
               мөр БАЙХГҮЙ: «770 сая ₮ / Paradise plaza-д 125.8 мкв оффис /
               1 минутын өмнө | Улаанбаатар — Баянзүрх — 26-р хороо»)
               ⚠️ `build_year` нь DB · форм · ДЭЛГЭРЭНГҮЙ хуудас · шүүлтэд
               ХЭВЭЭР (`ListingDetailClient` ⑦ хүснэгтэд «Ашиглалтанд орсон он» ✓)
            ② бусад хэсэг → `attrsLine` (HomeClient нь `formatAttrsLine`-ээр бэлдэнэ;
               🆕 (112): 🚗 машин дээр ЗӨВХӨН гүйлт · түлш — хэрэглэгчийн хүсэлт
               «Let's display only the mileage and fuel type on the car listing
               card» ⇒ толгой (брэнд+загвар+он) нь картын ГАРЧИГТ бий тул
               мөрөнд давхардахгүй ✓ «95,200 км · ⛽ Хайбрид»)
            ⚠️ Хоосон бол мөр ОГТ ГАРАХГҮЙ (`''`) ✓
            ⚠️ 🗑 `getFloorLabel` импорт + `floorLabel` ХАСАГДАВ (карт дээр
               хэрэггүй болов; Дэлгэрэнгүй хуудсанд ХЭВЭЭР ✓) */}
        {!isRealEstate && attrsLine && (
          <div className="mt-1.5 truncate text-[15px] text-gray-500" title={attrsLine}>
            {attrsLine}
          </div>
        )}

        {/* ⚠️ 2026-10-06: 📝 ТАЙЛБАР блок ХАСАГДАВ (хэрэглэгчийн хүсэлт) —
            карт дээр `listing.description` харуулахгүй ✓ (Дэлгэрэнгүй хуудсанд ХЭВЭЭР) */}

        {/* 📍📅 МЕТА МӨР — 📍 хаяг | 📅 огноо (🆕 (107) — ХАМГИЙН ДООД мөр)
            🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «change cards design text style to like
               attached cards … Also, swap location, the date of creation on the
               card of bottom section» ⇒ ⏳ (97)–(101)-ийн «огноо | хаяг»
               дараалал СОЛИГДОВ — ОДОО **хаяг ЭХЭНД, огноо ТӨГСГӨЛД**:
               «📍 Улаанбаатар — Баянгол — 2-р хороо | 2 өдрийн өмнө» ✓
            ⚠️ `mt-auto` — бүх картын мета мөр НЭГ ЗУРААСАНД эгнэхийн тулд картын
               ёроолд тогтоно ✓ (⏳ (86)-д `mt-auto` нь үний мөрөнд байв — үнэ
               одоо ДЭЭШЭЭ (зургийн яг дор) гарсан ✓)
            🆕 (86): хүрээ-зураас (`border-t`) ХАСАГДАВ — жишиг сайтын карт дээр
               мөрүүдийн хооронд зураас БАЙХГҮЙ ✓
            🆕 (107) ТЕКСТИЙН УРСГАЛ (`flex flex-wrap` БИШ): жишиг зургийн карт
               дээр доод мөр нь НЭГ урсгал текст мэтээр мөр таслан зөөгддөг
               («1 минутын өмнө | Улаанбаатар — Сонгинохайрхан — Авто …») ⇒
               `text-[15px]` (⏳ `text-[13px]` — жишиг зүйгээс ЖИЖИГ байв) +
               `leading-snug`, тусгаарлагч `|` нь `mx-1.5 text-gray-300` ✓
            ⚠️ Хаяг ХООСОН бол `|` ч ГАРАХГҮЙ (зөвхөн огноо гарна) — хяналт
               `{address && …}` ХОЁУЛАНД (хаяг + тусгаарлагч) ✓
            ⚠️ `break-words` — хаяг урт үедээ ДООШОО мөр таслана (`truncate` ХОРИГ) ✓
            ⚠️ `pr-20` — /favorites-ийн «Хасах» товч (БҮХ дэлгэцэд баруун ДОО
               буланд) энэ мөрийн баруун захад давхарлаж болзошгүй тул 80px нөөц ✓
            🆕 (96): `MapPinIcon` SVG (📍 emoji БИШ) хаягны ӨМНӨ; `inline-block`
               тул мөр таслалтыг ХӨНДӨӨХГҮЙ ✓
            ⚠️ `data-listing-meta` — CDP/тестийн ТОГТВОРТОЙ selector ✓ */}
        <div data-listing-meta className="mt-auto pr-20 pt-0.5 text-[15px] leading-snug text-gray-500">
          {address && (
            <span className="break-words" title={address}>
              <MapPinIcon className="mr-1 inline-block h-5 w-5 align-[-4px]" />
              {address}
            </span>
          )}
          <span className="whitespace-nowrap" title="Нийтэлсэн огноо">
            {address && <span aria-hidden="true" className="mx-1.5 text-gray-300">|</span>}
            {timeAgo(listing.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}

