'use client';

import Link from 'next/link';
import { shortPriceLabel, hasRealPrice, getPropertyIcon, firstImage, getFloorLabel, timeAgo, formatAddress, listingTitle } from '../lib/format';
import { toggleFavorite, useFavorites, useLikeCount } from '../lib/favorites';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';

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
 * 🎨 ЛАВЛАХ ЗАГВАР (жишиг сайт):
 *   ┌──────────────────────────┐
 *   │  🖼 ЗУРАГ — БҮТЭН өргөн  │  ← `aspect-[4/3]`, дээд булан rounded
 *   │  [Зарах]          🖼 1/16│
 *   │  🎥                      │
 *   ├──────────────────────────┤
 *   │  [Avatar] Нийтлэгч ✅    │  ← нимгэн band (1 мөр)
 *   │  340 сая ₮          ❤️ 5 │  ← үнэ (том, bold) · зүрхэн БАРУУН
 *   │  Бзд центр аппартмент-д 3 өрөө …   ← 2 мөр гарчиг
 *   │  🛏 3 өрөө · 📐 80 м² · 🏢 5/9
 *   │  🕒 27 минутын өмнө | 📍 Баянзүрх  👁 12 │
 *   └──────────────────────────┘
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
 *   ⑥ 🆕 ❤️ нь **ҮНИЙ МӨРӨНД** (баруун захад) — ⏳ урьд нь доод мета мөрөнд
 *      байв; жишиг сайтын хэв: үнэ зүүн · зүрхэн баруун ✓
 *   ⑦ 🆕 Зургийн тоо (`🖼 1/N`) нь БАРУУН ДООД буланд — баруун ДЭЭД булан
 *      нь /favorites-ийн «Хасах» товчинд чөлөөтэй үлдэнэ ✓
 * ⚠️ `author.displayName` хоосон бол нийтлэгчийн band ОГТ ХАРАГДАХГҮЙ
 *    (`0017_profile_identity.sql` → `show_identity = false`) ✓
 * 🆕 2026-10-08 (71): 👤 ЗАР ТУС БҮРИЙН «НЭР ГАРГАХ УУ?» — хэрэглэгч форм дээр
 *    «Үгүй» гэсэн бол (`listings.show_name = false`, `0042_listing_show_name.sql`)
 *    ЭНЭ карт дээр ч нэр/профайл зураг ГАРАХГҮЙ (0017-тай ИЖИЛ үр дүн —
 *    band бүхэлдээ нуугдана ✓). ⚠️ `!== false` дүрэм: `null` (хуучин зар) →
 *    ХАРАГДАНА ✓
 * 🗑 2026-10-06: 📝 ТАЙЛБАР (`listing.description`) карт дээр ХАСАГДАВ —
 *    хэрэглэгчийн хүсэлт («Нүүр хуудас дээрх зарын карт дээрээс Тайлбарыг
 *    байхгүй болго»). ⚠️ Дэлгэрэнгүй хуудас (`ListingDetailClient`) ХӨНДӨӨГДӨӨГҮЙ.
 * 🔍 ХАЙХ ҮГ: ListingCard, aspect-[4/3], data-listing-card, line-clamp-2,
 *    grid-cols-1 sm:grid-cols-2 (жагсаалтын grid нь ХУУДАС бүр дээр)
 */
export default function ListingCard({ listing, author, attrsLine }) {
  const img = firstImage(listing);
  /**
   * 👤 НИЙТЛЭГЧИЙН НЭР/ЗУРАГ (картын дээд band) — 🆕 2026-10-08 (71):
   *    «Профайл нэрээ зар дээр гаргах уу? → Үгүй» (`show_name === false`) үед
   *    нэр нь ХООСОН болно ⇒ band бүхэлдээ ГАРАХГҮЙ ✓
   *    ⚠️ `!== false` (БИШ `=== true`): багана байхгүй/`null` үед ХАРАГДАНА —
   *       хуучин заруудын хэв ХӨНДӨӨГДӨХГҮЙ ✓
   */
  const authorVisible = listing.show_name !== false;
  const authorName = authorVisible ? (author?.displayName || '') : '';
  const authorAvatar = authorVisible ? (author?.avatarUrl || null) : null;
  const images = Array.isArray(listing.images) ? listing.images : [];
  const imageCount = images.length;
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
  const floorLabel = getFloorLabel(listing.floor, listing.total_floors);
  // 🏷️ Зарын гарчиг (0027_listing_title.sql) — хоосон бол мөр ГАРАХГҮЙ
  const title = listingTitle(listing);
  const address = formatAddress(listing);
  // ⚠️ 2026-10-06: 📝 ТАЙЛБАР карт дээр ХАСАГДАВ (хэрэглэгчийн хүсэлт:
  //    «Нүүр хуудас дээрх зарын карт дээрээс Тайлбарыг байхгүй болго»).
  //    `listing.description`-ыг унших/харуулах код БАЙХГҮЙ; карт нь НЭГ
  //    компонент тул нүүр · Таалагдсан · Нийтлэгч · газрын зураг БҮГДЭД хасагдана ✓.
  //    ⚠️ Дэлгэрэнгүй хуудсанд (`ListingDetailClient`) Тайлбар ХЭВЭЭР ✓.
  // 🛏 Байрны мэдээлэл — 0 байж болох тул `> 0` шалгалттай; `floorLabel` '' байж болно
  const hasPropertyLine =
    listing.rooms > 0 || listing.bathrooms > 0 || listing.area > 0 || floorLabel || listing.build_year > 0;

  return (
    <Link
      href={`/listings/${listing.id}`}
      data-listing-card
      /* 🎨 2026-10-09 (83): `bg-white` → `bg-gray-100` — хуудасны дэвсгэр ЦАГААН
         болсон тул карт нь «дээр нь байгаа саарал зүйл» болов ✓ (хүрээ +
         `shadow-card` нь цагаан дэвсгэрээс ялгана ✓) */
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-gray-100 shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card-hover"
    >
      {/* ══════ 🖼 ЗУРАГ (дээд) — БҮТЭН өргөн, `aspect-[4/3]` ══════ */}
      <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden bg-gray-100">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={listing.property_type}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
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

        {/* 🖼 ЗУРГИЙН ТОО — «🖼 1/16» (баруун ДООД булан)
            ⚠️ Баруун ДЭЭД булан нь /favorites-ийн «Хасах» товчинд чөлөөтэй
               (товч нь картын ГАДНА overlay) — тиймээс тоо нь доод буланд ✓
            ⚠️ Зөвхөн 2+ зурагтай үед (1 зурагт «1/1» утгагүй) */}
        {imageCount > 1 && (
          <span
            title={`Нийт ${imageCount} зураг`}
            className="absolute bottom-2 right-2 flex h-6 items-center gap-1 rounded-full bg-black/60 px-2 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm"
          >
            🖼 1/{imageCount}
          </span>
        )}

        {/* 🎥 Видео байгаа зарын тэмдэг (0011_listing_video.sql → video_url)
            ⚠️ Зүүн ДООД буланд — баруун дээд нь зургийн тооны тэмдэгтэй
               давхцахаас сэргийлэв ✓ (`listing.video_url` нь КАНОНИК линк) */}
        {listing.video_url && (
          <span
            title="Энэ зарт видео бий"
            className="absolute bottom-2 left-2 flex h-7 items-center gap-1 rounded-full bg-black/65 px-2.5 text-[12px] font-bold text-white shadow backdrop-blur-sm"
          >
            🎥 Видео
          </span>
        )}
      </div>

      {/* ══════ 📋 МЭДЭЭЛЭЛ (доод) — ЗУРГИЙН ДООР ══════ */}
      <div className="flex flex-1 flex-col p-3.5">
        {/* 👤 ЗАР НИЙТЛЭГЧ — мэдээллийн хэсгийн дээд band (жишиг сайтын хэв)
            ⚠️ `show_identity = false` (0017) бол `displayName` ХООСОН буцах тул
               энэ band ОГТ ХАРАГДАХГҮЙ ✓ */}
        {authorName && (
          <div className="mb-2 flex items-center gap-2 border-b border-gray-100 pb-2">
            <Avatar src={authorAvatar} name={authorName} size={28} />
            <span className="truncate text-[13.5px] font-semibold text-gray-800" title={authorName}>
              {authorName}
            </span>
            <VerifiedBadge size={13} className="text-primary" />
          </div>
        )}

        {/* 💰 ҮНЭ + ❤️ — НЭГ МӨРӨНД (жишиг сайтын хэв: үнэ зүүн · зүрхэн баруун)
            ⚠️ «Үнэ тохирно» карт дээр ГАРАХГҮЙ (`hasRealPrice` — 2026-10-02-ын
               хэрэглэгчийн шийдвэр ✓)
            🆕 2026-10-06 (хэрэглэгчийн хүсэлт): ҮНЭ НЬ ТОВЧ ФОРМАТТАЙ БОЛОВ —
            `shortPriceLabel` нь «760,000,000» БИШ «760 сая ₮», «44.8 сая ₮»
            гэж харуулна (`lib/format.js → shortPriceLabel`, нэгж нь `shortPrice`-
            ийн «сая/тэрбум/мянга»-тай ИЖИЛ). ⚠️ «₮» нь ТӨГСГӨЛД.
            📏 `text-[22px] font-extrabold` ХӨНДӨӨГДӨӨГҮЙ (`test-card` гэрээ ✓) */}
        <div className="flex items-start gap-2">
          {hasRealPrice(listing) && (
            <div className="min-w-0 text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-gray-900">
              {shortPriceLabel(listing)}
            </div>
          )}
          {/* ❤️/🤍 — МИНИЙ favourite toggle БА нийт тоо (`listings.likes`)
              🆕 2026-10-09: үнийн мөрөнд шилжив (жишиг сайтын хэв)
              ⚠️ `ml-auto` — үнэ БАЙХГҮЙ зар дээр ч баруун захад тогтоно ✓ */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(listing.id);
            }}
            aria-label={isFav ? 'Таалагдсан жагсаалтаас хасах' : 'Таалагдсан жагсаалтад нэмэх'}
            title={isFav ? 'Таалагдсанаас хасах' : 'Надад таалагдсан'}
            className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 text-[13px] font-semibold transition hover:bg-red-50 hover:text-red-600 ${
              isFav ? 'text-red-600' : 'text-gray-600'
            }`}
          >
            {isFav ? '❤️' : '🤍'} {likes}
          </button>
        </div>

        {/* 🏷️ ЗАРЫН ГАРЧИГ — үнийн доор, дээд тал нь 2 мөр (жишиг сайт) */}
        {title && (
          <div className="mt-1 line-clamp-2 text-[15px] font-semibold leading-snug text-gray-800" title={title}>
            {title}
          </div>
        )}

        {/* 📋 ДЭЛГЭРЭНГҮЙ МӨР
            ① үл хөдлөх → 🛏 өрөө · 🚿 угаалгын өрөө · 📐 м² · 🏢 давхар · 📅 он
            ② бусад хэсэг → `attrsLine` (HomeClient нь `formatAttrsLine`-ээр бэлдэнэ)
            ⚠️ Хоёулаа хоосон бол мөр ОГТ ГАРАХГҮЙ (`false`/`''`) ✓ */}
        {isRealEstate
          ? hasPropertyLine && (
              <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-gray-600">
                {listing.rooms > 0 && <span>🛏 {listing.rooms} өрөө</span>}
                {listing.bathrooms > 0 && <span>🚿 {listing.bathrooms} угаалгын өрөө</span>}
                {listing.area > 0 && <span>📐 {listing.area} м²</span>}
                {floorLabel && <span>🏢 {floorLabel}</span>}
                {listing.build_year > 0 && <span>📅 {listing.build_year}</span>}
              </div>
            )
          : attrsLine && (
              <div className="mt-1.5 truncate text-[14px] text-gray-600" title={attrsLine}>
                {attrsLine}
              </div>
            )}

        {/* ⚠️ 2026-10-06: 📝 ТАЙЛБАР блок ХАСАГДАВ (хэрэглэгчийн хүсэлт) —
            карт дээр `listing.description` харуулахгүй ✓ (Дэлгэрэнгүй хуудсанд ХЭВЭЭР) */}

        {/* 📅 ДООД МЕТА МӨР — 🕒 огноо | 📍 хаяг   …   👁 үзсэн
            ⚠️ ❤️/🤍 энд БАЙХГҮЙ (2026-10-09: ҮНИЙ МӨРӨНД шилжсэн ✓)
            ⚠️ `mt-auto` — агуулга бага байсан ч мөрийг картын ёроолд тогтооно ✓
            📱 МОБАЙЛ: хаяг нь `order-last w-full` → БҮТЭН мөр болж доош бууна
               (эс бөгөөс `pr-20`-ийн дараа хаяг «…» болж бүрэн алга болно ✗);
               ≥640px-д `sm:order-none sm:flex-1` → нэг мөрөнд буцаж эгнэнэ ✓
            ⚠️ `pr-20` — /favorites-ийн «Хасах» товч утсанд баруун ДОО буланд
               буудаг тул мөргөлдөхөөс сэргийлнэ (`sm:pr-0` — desktop-д чөлөө) */}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-gray-100 pt-2 pr-20 text-[13px] text-gray-500 sm:flex-nowrap sm:pr-0">
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
      </div>
    </Link>
  );
}

