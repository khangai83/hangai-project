'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import MapView from './MapView';
import Breadcrumb from './Breadcrumb';
import { useToast } from './AppProviders';
import { fetchListingById } from '../lib/queries';
import { trackListingView } from '../lib/statsClient';
import { normalizeError } from '../lib/errors';
import { formatPrice, getPriceTypeLabel, getPropertyIcon, getCategoryLabel, getPropertyTypeLabel, getGarageLabel, timeAgo } from '../lib/format';
import { buildListingBreadcrumb } from '../lib/breadcrumb';
import { toggleFavorite, useFavorites, useLikeCount } from '../lib/favorites';

export default function ListingDetailClient({ id }) {
  const { showToast } = useToast();
  const [listing, setListing] = useState(null); // null = loading, false = not found
  const [loadError, setLoadError] = useState(null); // холболтын алдаа
  const [active, setActive] = useState(0);
  const [phoneShown, setPhoneShown] = useState(false);
  const [views, setViews] = useState(null); // 👁 серверээс ирсэн «үзсэн» тоо (null = миграцгүй)
  const favoriteIds = useFavorites(); // ❤️ (дээрх hook-уудтай хамт дуудагдах ёстой)
  const likes = useLikeCount(id, listing ? listing.likes : 0); // ❤️ нийт хэдэн хүн дарсан

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchListingById(id);
        if (mounted) { setListing(data || false); setActive(0); setPhoneShown(false); }
      } catch (err) {
        const e = normalizeError(err);
        console.error(e);
        if (mounted) { setListing(false); setLoadError(e); showToast(e.message, 'error'); }
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  /**
   * 👁 «Үзсэн» тоог +1.
   * ⚠️ Нэг browser session-д НЭГ л удаа — F5 дарах бүрд хөөрөгдөхгүй.
   *    (Шинэ tab/session нээхэд дахин тоолно — энэ нь зөв.)
   */
  useEffect(() => {
    if (!id) return undefined;
    try {
      const key = `zarmn_viewed_${id}`;
      if (window.sessionStorage.getItem(key)) return undefined;
      window.sessionStorage.setItem(key, '1');
    } catch (e) {
      return undefined; // private mode гэх мэт — тоолохгүй
    }
    let mounted = true;
    trackListingView(id).then((n) => {
      if (mounted && typeof n === 'number') setViews(n);
    });
    return () => { mounted = false; };
  }, [id]);

  if (listing === null) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Зарыг ачаалж байна...</p>
        </div>
      </div>
    );
  }

  if (listing === false) {
    if (loadError) {
      return (
        <div className="page-container">
          <div className="mx-auto my-6 max-w-[720px] rounded-2xl border border-red-200 bg-white px-6 py-8 text-center">
            <div className="text-4xl">🔌</div>
            <h3 className="mb-1.5 mt-2.5 text-lg font-semibold text-red-800">Өгөгдлийн сантай холбогдож чадсангүй</h3>
            <p className="[word-break:break-word] rounded-lg border border-red-200 bg-red-50 p-3 text-left text-[13px] text-red-700">{loadError.message}</p>
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3.5 text-left text-[13px] text-gray-700">
              <p><b>Хэрхэн засах вэ:</b></p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                <li><code className="rounded bg-gray-100 px-1.5 py-px text-xs">.env.local</code> доторх <code className="rounded bg-gray-100 px-1.5 py-px text-xs">NEXT_PUBLIC_SUPABASE_URL</code>-г шалгана.</li>
                <li>Терминалд <code className="rounded bg-gray-100 px-1.5 py-px text-xs">npm run check:supabase</code> ажиллуулна.</li>
              </ol>
            </div>
            <Link href="/" className="btn btn-primary mt-4">← Нүүр рүү буцах</Link>
          </div>
        </div>
      );
    }
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="mb-4 text-6xl">❌</div>
          <h3 className="mb-4 text-xl font-semibold">Зар олдсонгүй</h3>
          <Link href="/" className="btn btn-outline">← Нүүр рүү буцах</Link>
        </div>
      </div>
    );
  }

  const images = Array.isArray(listing.images) ? listing.images : [];
  const address = [listing.address_detail, listing.khoroo, listing.district, listing.city].filter(Boolean).join(', ');
  const typeLabel = getPropertyTypeLabel(listing.property_type, listing.category);
  const garageLabel = getGarageLabel(listing.has_garage);
  const isSell = listing.category === 'sell';
  const phoneDigits = String(listing.phone || '').replace(/^976/, '').replace(/^\+/, '');

  // 👁/❤️ — серверээс ирсэн тоо (миграц 0006 хийгээгүй бол 0 харагдана)
  const viewCount = views != null ? views : Number(listing.views) || 0;
  const likeCount = likes;

  // unegui.mn-ийн <section data-component="AdvertFeaturesApp"> хэсэгт харагдах шинж чанарууд.
  // Зөвхөн утгатай (хоосон биш) мөрүүдийг харуулна.
  const isFav = favoriteIds.includes(listing.id);
  const features = [
    //{ label: 'Төрөл', value: typeLabel },
    listing.rooms > 0 && { label: 'Өрөөний тоо', value: `${listing.rooms} өрөө` },
    listing.area > 0 && { label: 'Талбай', value: `${listing.area} м²` },
    listing.floor > 0 && { label: 'Хэдэн давхарт', value: `${listing.floor} давхарт` },
    listing.total_floors > 0 && { label: 'Барилгын давхар', value: `${listing.total_floors} давхар` },
    listing.build_year > 0 && { label: 'Ашиглалтанд орсон он', value: `${listing.build_year} он` },
    listing.balconies > 0 && { label: 'Тагт', value: `${listing.balconies} тагттай` },
    garageLabel && { label: 'Гараж', value: garageLabel },
    /*{ label: 'Зарын төрөл', value: getCategoryLabel(listing.category) },*/
    /*{ label: 'Нийтэлсэн', value: timeAgo(listing.created_at) },*/
    // { label: 'Зарын дугаар', value: `ID: ${listing.id}` },
    { label: 'Байршил', value: address || 'Тодорхойгүй' },
    // 👁/❤️ статистик (listings.views / listings.likes — 0006_listing_stats.sql)
    // { label: 'Үзсэн', value: `${viewCount} удаа` },
    // { label: 'Таалагдсан', value: `${likeCount} хүн` },
  ].filter(Boolean);

  return (
    <div className="page-container">
      <Breadcrumb items={buildListingBreadcrumb(listing)} />

      {/* ===== ГАРЧИГ (HEADER) ===== */}
      <header className="mb-5">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className={`badge ${isSell ? 'badge-sell' : 'badge-rent'}`}>{getCategoryLabel(listing.category)}</span>
          <button
            type="button"
            onClick={() => toggleFavorite(listing.id)}
            title="Надад таалагдсан зарууд"
            className={`btn btn-sm ${isFav ? 'btn-danger' : 'btn-outline'}`}
          >
            {isFav ? '❤️ Таалагдсан' : '🤍 Таалагдсан'}
            <span className="ml-1.5 font-bold tabular-nums">{likeCount}</span>
          </button>
          {/* 👁/❤️ тоог «зар хэзээ орсон» огнооны хажууд харуулна (доор) */}
          <span className="text-[13px] text-gray-400">ID: {listing.id}</span>
        </div>
        <h1 className="mb-1.5 text-2xl font-bold leading-snug text-gray-900 sm:text-[28px]">
          {getPropertyIcon(listing.property_type)} {typeLabel}
        </h1>
        <p className="text-sm text-gray-500">
          📍 {address || 'Хаяг тодорхойгүй'} · 📅 {timeAgo(listing.created_at)} ·{' '}
          <span title="Энэ зарыг хэдэн хүн үзсэн">👁 {viewCount} үзсэн</span> ·{' '}
          <span title="Хэдэн хүн ❤️ дарсан">❤️ {likeCount} таалагдсан</span>
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
        {/* ===== ЗҮҮН БАГАНА ===== */}
        <div className="min-w-0">
          {/* Gallery */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
            <div className="relative">
              {/* ❤️ Таалагдах — зургийн баруун дээд буланд (карт дээрхтэй ижил)
                  Зар луу ормогц шууд ❤️ дарж болно. */}
              <button
                type="button"
                onClick={() => toggleFavorite(listing.id)}
                aria-label={isFav ? 'Таалагдсан жагсаалтаас хасах' : 'Таалагдсан жагсаалтад нэмэх'}
                title={isFav ? 'Таалагдсанаас хасах' : 'Надад таалагдсан'}
                className={`absolute right-3 top-3 z-10 flex h-11 items-center gap-1.5 rounded-full bg-white/95 px-3.5 text-xl shadow-lg backdrop-blur transition hover:scale-110 ${
                  isFav ? 'text-red-600' : 'text-gray-700'
                }`}
              >
                <span>{isFav ? '❤️' : '🤍'}</span>
                <span className="text-sm font-bold tabular-nums">{likeCount}</span>
              </button>
              {images.length ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={images[active]} alt={typeLabel} className="h-[280px] w-full object-cover sm:h-[440px]" />
                  {images.length > 1 && (
                    <>
                      <span className="absolute bottom-3 right-3 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white">
                        {active + 1} / {images.length}
                      </span>
                      <button
                        type="button"
                        aria-label="Өмнөх зураг"
                        onClick={() => setActive((i) => (i - 1 + images.length) % images.length)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-lg leading-none shadow-card transition hover:bg-white"
                      >
                        ‹
                      </button>
                      <button
                        type="button"
                        aria-label="Дараагийн зураг"
                        onClick={() => setActive((i) => (i + 1) % images.length)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white/85 px-3 py-2 text-lg leading-none shadow-card transition hover:bg-white"
                      >
                        ›
                      </button>
                    </>
                  )}
                </>
              ) : (
                <div className="flex h-[280px] w-full items-center justify-center bg-gray-100 text-7xl">
                  {getPropertyIcon(listing.property_type)}
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto p-3">
                {images.map((src, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={src}
                    alt=""
                    onClick={() => setActive(i)}
                    className={`h-14 w-[72px] shrink-0 cursor-pointer rounded-lg border-2 object-cover transition ${
                      i === active ? 'border-primary opacity-100' : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>

          {/* ===== ШИНЖ ЧАНАР — unegui.mn-ийн <section data-component="AdvertFeaturesApp" class="mt-6"> хэсэгтэй ижил загвар ===== */}
          <section data-component="AdvertFeaturesApp" className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white">
            <h2 className="border-b border-gray-100 px-5 py-4 text-base font-semibold text-gray-800">Зарын дэлгэрэнгүй</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2">
              {features.map((f) => (
                <div
                  key={f.label}
                  className="flex items-baseline gap-3 border-b border-gray-100 px-5 py-3 text-sm last:border-b-0 ]:border-r sm:[&:nth-last-child(-n+2)]:border-b-0"
                >
                  <dt className="w-[45%] shrink-0 text-gray-500">{f.label}:</dt>
                  <dd className="min-w-0 flex-1 font-medium text-gray-900">{f.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ===== ТАЙЛБАР ===== */}
          {listing.description && (
            <section className="mt-6 rounded-xl border border-gray-200 bg-white p-5 sm:p-6">
              <h2 className="mb-4 text-base font-semibold text-gray-800">Тайлбар</h2>
              <p className="whitespace-pre-line text-[15px] leading-[1.8] text-gray-600">{listing.description}</p>
            </section>
          )}
        </div>

        {/* ===== БАРУУН БАГАНА (ХОЛБОО БАРИХ) ===== */}
        <aside className="space-y-4 lg:sticky lg:top-[88px] lg:self-start">
          <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-card sm:p-6">
            <div className="text-3xl font-bold text-primary">₮{formatPrice(listing.price)}</div>
            {getPriceTypeLabel(listing.price_type) && (
              <div className="mt-0.5 text-sm text-gray-500">{getPriceTypeLabel(listing.price_type)}</div>
            )}

            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                <span className="text-2xl">👤</span>
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold text-gray-800">
                    {listing.contact_name || 'Холбоо барих хүн'}
                  </div>
                  <div className="text-xs text-gray-500">Зар нийтэлсэн</div>
                </div>
              </div>

              {listing.phone && (
                phoneShown ? (
                  <a href={`tel:+976${phoneDigits}`} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3 transition hover:bg-gray-100">
                    <span className="text-2xl">📱</span>
                    <div className="text-base font-semibold text-primary">{listing.phone}</div>
                  </a>
                ) : (
                  <button type="button" className="btn btn-primary w-full" onClick={() => setPhoneShown(true)}>
                    📞 Дугаар харах
                  </button>
                )
              )}
            </div>
          </div>

          {listing.latitude && listing.longitude && (
            <div className="h-[280px] overflow-hidden rounded-xl border border-gray-200">
              <MapView listings={[listing]} />
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
