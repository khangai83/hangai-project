'use client';

import Link from 'next/link';
import { priceLabel, hasRealPrice, getPropertyIcon, firstImage, getFloorLabel, timeAgo, formatAddress, listingTitle } from '../lib/format';
import { toggleFavorite, useFavorites, useLikeCount } from '../lib/favorites';
import Avatar from './Avatar';
import VerifiedBadge from './VerifiedBadge';

/*
 * ══════════════════════════════════════════════════════════════════════
 * 📇 ЗАРЫН КАРТ — unegui.mn-ийн хэв маяг (2026-10-03, хэрэглэгчийн хүсэлт)
 * ══════════════════════════════════════════════════════════════════════
 * Хэрэглэгчийн хүсэлт: «зарын картын дизайн их зүгээр юмаа, ийм дизайнтай
 * болгоорой» + unegui.mn-ийн жишээ картууд (ажил · орон сууц).
 *
 * 🎨 ЛАВЛАХ ЗАГВАР (unegui.mn):
 *   ┌──────────────────────────┬──────────────────────────────────────┐
 *   │  🖼 ЗУРАГ (42%)           │  [Avatar] Нийтлэгч ✅     ← нимгэн band │
 *   │  [Зарах]          🖼 1/16 │  ────────────────────────────────────  │
 *   │                          │  340 сая ₮          ← үнэ (том, bold) │
 *   │                          │  Бзд центр аппартмент-д 3 өрөө …   ← 2 мөр│
 *   │                          │  🛏 3 өрөө · 📐 80 м² · 🏢 5/9        │
 *   │                          │  Тайлбар … (2 мөр, бүдэг саарал)       │
 *   │  🎥                      │  🕒 27 минутын өмнө | 📍 Баянзүрх  ❤️ 5 │
 *   └──────────────────────────┴──────────────────────────────────────┘
 *
 * 📐 ӨНДӨР: `sm:h-[300px]` — мэдээллийн баганын агуулга ~246px + `sm:p-5`
 *    (40px) → ~286px хамгийн ихдээ, тул 300px нь ~14px нөөцтэй ✓
 *    🔧 Өндрийг солих бол доорх `sm:h-[300px]`-г л өөрчилнө (зураг `sm:h-full`)
 *    📏 ФОРМУЛА: картын өндөр ≥ (мэдээллийн агуулга) + 40px (p-5)
 *    ⚠️ Мобайл дээр бэхлэгдсэн өндөр БАЙХГҮЙ (`flex-col`, auto) — тайрагдахгүй ✓
 *
 * ⚠️ ХАДГАЛАГДСАН ДҮРМҮҮД (өмнөх хэрэглэгчийн шийдвэрүүд — хөндөхгүй):
 *   ① «Үнэ тохирно» КАРТ ДЭЭР ГАРАХГҮЙ — зөвхөн `hasRealPrice` үед үнэ харагдана
 *   ② «Зарах / Түрээслэх» badge ЗӨВХӨН үл хөдлөхөд
 *   ③ ❤️/🤍 нь МИНИЙ favourite toggle БА нийт тоо (listings.likes) хоёулаа
 *   ④ Карт бүхэлдээ `<Link>` — дотор нь өөр `<Link>` БАЙХГҮЙ (HTML хориг)
 *   ⑤ /favorites хуудсанд «Хасах» товч утсанд баруун ДОО буланд буудаг тул
 *      доод мөр нь `max-sm:pr-20` (80px) хоосон зай үлдээнэ
 * ⚠️ `author.displayName` хоосон бол нийтлэгчийн band ОГТ ХАРАГДАХГҮЙ
 *    (`0017_profile_identity.sql` → `show_identity = false`) ✓
 * 🔍 ХАЙХ ҮГ: ListingCard, sm:h-[300px], data-listing-card, line-clamp-2
 */
export default function ListingCard({ listing, author, attrsLine }) {
  const img = firstImage(listing);
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
  // 📝 Тайлбар — зөвхөн 2 МӨР хүртэл (`line-clamp-2`), хоосон бол блок харагдахгүй
  const description = typeof listing.description === 'string' ? listing.description.trim() : '';
  // 🛏 Байрны мэдээлэл — 0 байж болох тул `> 0` шалгалттай; `floorLabel` '' байж болно
  const hasPropertyLine =
    listing.rooms > 0 || listing.bathrooms > 0 || listing.area > 0 || floorLabel || listing.build_year > 0;

  return (
    <Link
      href={`/listings/${listing.id}`}
      data-listing-card
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card-hover sm:h-[300px] sm:flex-row"
    >
      {/* ══════ 🖼 ЗУРАГ (зүүн) — мобайлд бүтэн өргөн, ≥640px-д 42% ══════ */}
      <div className="relative h-52 w-full shrink-0 overflow-hidden bg-gray-100 sm:h-full sm:w-[42%]">
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

        {/* 🖼 ЗУРГИЙН ТОО — «🖼 1/16» (баруун дээд булан, unegui-ийн хэв)
            ⚠️ Зөвхөн 2+ зурагтай үед (1 зурагт «1/1» утгагүй) */}
        {imageCount > 1 && (
          <span
            title={`Нийт ${imageCount} зураг`}
            className="absolute right-2 top-2 flex h-6 items-center gap-1 rounded-full bg-black/60 px-2 text-[11px] font-semibold tabular-nums text-white backdrop-blur-sm"
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

      {/* ══════ 📋 МЭДЭЭЛЭЛ (баруун) ══════ */}
      <div className="flex flex-1 flex-col overflow-hidden p-4 sm:p-5">
        {/* 👤 ЗАР НИЙТЛЭГЧ — мэдээллийн хэсгийн дээд band (unegui-ийн хэв)
            ⚠️ `show_identity = false` (0017) бол `displayName` ХООСОН буцах тул
               энэ band ОГТ ХАРАГДАХГҮЙ ✓ */}
        {author?.displayName && (
          <div className="mb-3 flex items-center gap-2 border-b border-gray-100 pb-2.5">
            <Avatar src={author.avatarUrl} name={author.displayName} size={28} />
            <span className="truncate text-[13.5px] font-semibold text-gray-800" title={author.displayName}>
              {author.displayName}
            </span>
            <VerifiedBadge size={13} className="text-primary" />
          </div>
        )}

        {/* 💰 ҮНЭ — том, bold (unegui). ⚠️ «Үнэ тохирно» карт дээр ГАРАХГҮЙ
            (`hasRealPrice` — 2026-10-02-ын хэрэглэгчийн шийдвэр ✓) */}
        {hasRealPrice(listing) && (
          <div className="text-[22px] font-extrabold leading-tight tracking-[-0.01em] text-gray-900">
            {priceLabel(listing)}
          </div>
        )}

        {/* 🏷️ ЗАРЫН ГАРЧИГ — үнийн доор, дээд тал нь 2 мөр (unegui) */}
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

        {/* 📝 ТАЙЛБАР — 2 мөр хүртэл (unegui: бүдэг саарал) */}
        {description && (
          <p className="mt-1.5 line-clamp-2 text-[14px] leading-relaxed text-gray-500">{description}</p>
        )}

        {/* 📅 ДООД МЕТА МӨР — 🕒 огноо | 📍 хаяг   …   👁 үзсэн  ❤️/🤍 таалагдсан
            ⚠️ `mt-auto` — агуулга бага байсан ч мөрийг картын ёроолд тогтооно ✓
            📱 МОБАЙЛ: хаяг нь `order-last w-full` → БҮТЭН мөр болж доош бууна
               (эс бөгөөс `pr-20`-ийн дараа хаяг «…» болж бүрэн алга болно ✗);
               ≥640px-д `sm:order-none sm:flex-1` → нэг мөрөнд буцаж эгнэнэ ✓
            ⚠️ `pr-20` — /favorites-ийн «Хасах» товч утсанд баруун ДОО буланд
               буудаг тул ❤️-тэй мөргөлдөхөөс сэргийлнэ (`sm:pr-0` — desktop-д чөлөө) */}
        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 border-t border-gray-100 pt-2.5 pr-20 text-[13.5px] text-gray-500 sm:flex-nowrap sm:pr-0">
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
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(listing.id);
              }}
              aria-label={isFav ? 'Таалагдсан жагсаалтаас хасах' : 'Таалагдсан жагсаалтад нэмэх'}
              title={isFav ? 'Таалагдсанаас хасах' : 'Надад таалагдсан'}
              className={`-mr-1 inline-flex items-center gap-1 rounded-full px-1.5 text-[14px] font-semibold transition hover:bg-red-50 hover:text-red-600 ${
                isFav ? 'text-red-600' : 'text-gray-600'
              }`}
            >
              {isFav ? '❤️' : '🤍'} {likes}
            </button>
          </span>
        </div>
      </div>
    </Link>
  );
}

