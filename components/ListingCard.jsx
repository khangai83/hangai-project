'use client';

import Link from 'next/link';
import { formatPrice, getPriceTypeLabel, getPropertyIcon, firstImage, getFloorLabel } from '../lib/format';
import { toggleFavorite, useFavorites } from '../lib/favorites';

export default function ListingCard({ listing }) {
  const img = firstImage(listing);
  const favoriteIds = useFavorites();
  const isFav = favoriteIds.includes(listing.id);
  const isSell = listing.category === 'sell';
  const floorLabel = getFloorLabel(listing.floor, listing.total_floors);
  const hasMeta = listing.rooms > 0 || listing.area > 0 || !!floorLabel || listing.build_year > 0;
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
        <button
          type="button"
          aria-label={isFav ? 'Таалагдсан жагсаалтаас хасах' : 'Таалагдсан жагсаалтад нэмэх'}
          title={isFav ? 'Таалагдсанаас хасах' : 'Надад таалагдсан'}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(listing.id);
          }}
          className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-lg shadow transition hover:scale-110"
        >
          {isFav ? '❤️' : '🤍'}
        </button>
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
        {hasMeta && (
          <div className="mt-auto flex flex-wrap justify-between gap-2 border-t border-gray-100 pt-1.5 text-xs text-gray-400">
            {listing.rooms > 0 && <span>🛏 {listing.rooms} өрөө</span>}
            {listing.area > 0 && <span>📐 {listing.area} м²</span>}
            {floorLabel && <span>🏢 {floorLabel}</span>}
            {listing.build_year > 0 && <span>📅 {listing.build_year}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}
