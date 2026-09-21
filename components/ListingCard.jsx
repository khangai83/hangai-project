'use client';

import Link from 'next/link';
import { formatPrice, getPriceTypeLabel, getPropertyIcon, firstImage, getFloorLabel } from '../lib/format';
import { toggleFavorite, useFavorites, useLikeCount } from '../lib/favorites';

export default function ListingCard({ listing }) {
  const img = firstImage(listing);
  const favoriteIds = useFavorites();
  const isFav = favoriteIds.includes(listing.id);
  // ❤️ Нийт хэдэн хүн таалагдсан (listings.likes — supabase/migrations/0007)
  const likes = useLikeCount(listing.id, listing.likes);
  // 👁 Нийт хэдэн хүн үзсэн (listings.views — 0007_listing_likes_views.sql,
  //    триггер count(*) -ээр автоматаар бодно)
  const views = Number(listing.views) || 0;
  const isSell = listing.category === 'sell';
  const floorLabel = getFloorLabel(listing.floor, listing.total_floors);
  return (
    <Link
      href={`/listings/${listing.id}`}
      className="group flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card-hover sm:flex-row sm:h-[220px]"
    >
      <div className="relative h-52 w-full shrink-0 overflow-hidden bg-gray-100 sm:h-full sm:w-[320px]">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={listing.property_type}
            loading="lazy"
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-5xl">{getPropertyIcon(listing.property_type)}</div>
        )}
        <span className={`badge absolute left-2 top-2 ${isSell ? 'badge-sell' : 'badge-rent'}`}>
          {isSell ? 'Зарах' : 'Түрээс'}
        </span>
        {/* ⚠️ ЗУРАГ дээр «таалагдсан» тэмдэглээ (зүрх/тоо) БАЙХГҮЙ.
            Нийт тоо + ❤️/🤍 товч нь доорх МЭДЭЭЛЛИЙН хэсэгт (мета мөр) байна. */}

        {/* 👁 Хичнээн хүн үзсэн — зургийн ЗҮҮН ДООД буланд.
            ⚠️ Баруун доод буланд биш: /favorites хуудсанд «✕ Хасах» товч
            (absolute bottom-3 right-3) нь тэнд байрладаг тул халхлагдана. */}
        {/* <span
          title="Энэ зарыг хэдэн хүн үзсэн"
          className="absolute bottom-2 left-2 flex h-7 items-center gap-1 rounded-full bg-black/65 px-2.5 text-[12px] font-bold tabular-nums text-white shadow backdrop-blur-sm"
        >
          👁 {views}
        </span> */}
      </div>
      <div className="flex flex-1 flex-col justify-between overflow-hidden p-4">
        <div>
          <div className="mb-0.5 text-lg font-bold text-gray-900">
            ₮{formatPrice(listing.price)} <span className="text-lg font-normal text-gray-500">{getPriceTypeLabel(listing.price_type)}</span>
          </div>
          <div className="mb-0.5 truncate text-sm font-semibold text-gray-800">
            {getPropertyIcon(listing.property_type)} {listing.property_type}
          </div>
          <div className="text-[13px] text-gray-500">
            📍 {[listing.city, listing.district, listing.khoroo].filter(Boolean).join(', ')}
          </div>
        </div>
        {/* Мета мөр — ҮРГЭЛЖ харагдана.
            ⚠️ `justify-between` БИШ: баруун захад элемент үлдвэл /favorites-ийн
            «Хасах» товч түүнийг халхална. Тиймээс зүүнээс эхлэн жагсааж,
            баруун талд `pr-20` (80px) хоосон зай үлдээв. */}
        <div className="mt-auto flex flex-wrap justify-start gap-x-3 gap-y-1 border-t border-gray-100 pt-1.5 pr-20 text-xs text-gray-400">
          {/* 👁 Хэдэн хүн үзсэн — хамгийн тод харагдахын тулд ЭХЭНД */}
          <span className="font-semibold text-gray-500" title="Энэ зарыг хэдэн хүн үзсэн">
            👁 {views} үзсэн
          </span>
          {/* ❤️/🤍 Таалагдсан — «үзсэн»-ий ЯГ хажууд (зургийн хажуугийн мэдээлэл).
              Энэ нь МИНИЙ favourite toggle БА нийт тоо (listings.likes) хоёулаа:
              дарвал ❤️↔🤍 солигдож, сервер дээрх тоо ±1 болно (lib/favorites.js).
              ⚠️ Зурган дээр тусдаа товч БАЙХГҮЙ (зураг цэвэр байх ёстой).
              ⚠️ «Хасах» товч (/favorites, баруун доод/дээд) халхлахгүйн тулд
                 мета мөр зүүн талаас эхэлж, баруун талд `pr-20` зайтай. */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(listing.id);
            }}
            aria-label={isFav ? 'Таалагдсан жагсаалтаас хасах' : 'Таалагдсан жагсаалтад нэмэх'}
            title={isFav ? 'Таалагдсанаас хасах' : 'Надад таалагдсан'}
            className={`-mx-1.5 inline-flex items-center gap-1 rounded-full px-1.5 font-semibold text-gray-500 transition hover:bg-red-50 hover:text-red-600 ${
              isFav ? 'text-red-600' : ''
            }`}
          >
            {isFav ? '❤️' : '🤍'} {likes} таалагдсан
          </button>
          {listing.rooms > 0 && <span>🛏 {listing.rooms} өрөө</span>}
          {listing.area > 0 && <span>📐 {listing.area} м²</span>}
          {floorLabel && <span>🏢 {floorLabel}</span>}
          {listing.build_year > 0 && <span>📅 {listing.build_year}</span>}
        </div>
      </div>
    </Link>
  );
}
