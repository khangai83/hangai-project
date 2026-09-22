'use client';

import Link from 'next/link';
import { formatPrice, getPriceTypeLabel, getPropertyIcon, firstImage, getFloorLabel, timeAgo, formatAddress } from '../lib/format';
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
          {/* ---------- ҮНЭ ---------- */}
          <div className="mb-0.5 text-lg font-bold text-gray-900">
            ₮{formatPrice(listing.price)} <span className="text-lg font-normal text-gray-500">{getPriceTypeLabel(listing.price_type)}</span>
          </div>
          {/* ---------- ТӨРӨЛ ---------- */}
          <div className="mb-0.5 truncate text-sm font-semibold text-gray-800">
            {getPropertyIcon(listing.property_type)} {listing.property_type}
          </div>
          {/* ---------- 📍 ХАЯГ (зүүн) + 🕒 НИЙТЭЛСЭН (баруун) ----------
              ⚠️ Энэ мөр нь байрны мэдээллийн (🛏 өрөө / 📐 м² / 🏢 давхар /
                 📅 он) ӨМНӨ, хоёр захад нь тусдаа байрлана
                 (`justify-between`). Дэлгэрэнгүй хуудсан дээр ч мөн адил.
              ⚠️ Огноо нь 🕒 (цаг) — баригдсан он нь 📅 (хуанли) тул
                 хоёр 📅 зөрөхгүй.
              ⚠️ `truncate` — хаяг урт байвал картын өндөр (sm:h-[220px]) хэвээр. */}
          <div className="flex w-full items-center justify-between gap-x-3 text-[14px] text-gray-500">
            <span className="min-w-0 truncate">📍 {formatAddress(listing) || 'Хаяг тодорхойгүй'}</span>
            <span className="shrink-0 whitespace-nowrap text-[13px] text-gray-400">🕒 {timeAgo(listing.created_at)}</span>
          </div>
          {/* ---------- 🛏 БАЙРНЫ МЭДЭЭЛЭЛ (хаягийн ДОР) ----------
              Өрөө · талбай · давхар · баригдсан он.
              ⚠️ `rooms/area/build_year` нь 0 байж болох тул `> 0` шалгалттай;
                 `floorLabel` нь lib/format-аас '' (хоосон) буцаж болно. */}
          {(listing.rooms > 0 || listing.area > 0 || floorLabel || listing.build_year > 0) && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px] text-gray-500">
              {listing.rooms > 0 && <span>🛏 {listing.rooms} өрөө</span>}
              {listing.area > 0 && <span>📐 {listing.area} м²</span>}
              {floorLabel && <span>🏢 {floorLabel}</span>}
              {listing.build_year > 0 && <span>📅 {listing.build_year}</span>}
            </div>
          )}
        </div>
        {/* ДООД МӨР — зөвхөн ❤️/🤍 «Таалагдсан» товч үлдэв.
            ⚠️ ШИЛЖИЛТ: 👁 «үзсэн» тоо болон 🛏 байрны мэдээлэл (өрөө / м² /
               давхар / он) нь ДЭЭШЭЭ — 📍 ХАЯГИЙН хэсэг рүү шилжсэн
               (дээрх «📍 ХАЯГ + 👁 ҮЗСЭН» ба «🛏 БАЙРНЫ МЭДЭЭЛЭЛ» блокоос харна уу).
            ⚠️ `justify-between` БИШ: /favorites хуудсанд «Хасах» товч утсанд
               (max-sm) баруун ДОО буланд буудаг тул халхлахгүйн тулд мөр
               зүүнээс эхэлж, баруун талд `pr-20` (80px) хоосон зай үлдээв. */}
        <div className="mt-auto flex flex-wrap items-center justify-start gap-x-3 gap-y-1 border-t border-gray-100 pt-2 pr-20 text-xs text-gray-400">
          {/* ❤️/🤍 Таалагдсан — энэ нь МИНИЙ favourite toggle БА нийт тоо
              (listings.likes) хоёулаа: дарвал ❤️↔🤍 солигдож, сервер дээрх
              тоо ±1 болно (lib/favorites.js).
              ⚠️ Зурган дээр тусдаа товч БАЙХГҮЙ (зураг цэвэр байх ёстой). */}
          <span className="font-semibold text-sm text-gray-700" title="Энэ зарыг хэдэн хүн үзсэн">
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
            className={`-mx-1.5 inline-flex items-center gap-1 rounded-full px-1.5 font-semibold text-[14px] text-gray-700 transition hover:bg-red-50 hover:text-red-600 ${
              isFav ? 'text-red-600' : ''
            }`}
          >
            {isFav ? '❤️' : '🤍'} {likes}
          </button>
        </div>
      </div>
    </Link>
  );
}
