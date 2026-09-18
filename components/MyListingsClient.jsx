'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, useToast, useUI } from './AppProviders';
import { fetchMyListings, deleteListing } from '../lib/queries';
import { normalizeError } from '../lib/errors';
import { formatPrice, getPriceTypeLabel, getPropertyIcon, timeAgo, getFloorLabel, getGarageLabel } from '../lib/format';

export default function MyListingsClient() {
  const { user, authLoading } = useAuth();
  const { showToast } = useToast();
  const { openAdd, dataVersion, notifyListingsChanged } = useUI();
  const [listings, setListings] = useState(null);

  useEffect(() => {
    if (!user) { setListings(null); return; }
    let mounted = true;
    (async () => {
      try {
        const data = await fetchMyListings(user.id);
        if (mounted) setListings(data || []);
      } catch (err) {
        console.error(normalizeError(err));
        if (mounted) { setListings([]); showToast(err.message, 'error'); }
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, dataVersion]);

  const handleDelete = async (l) => {
    if (!window.confirm('Та энэ зарыг устгахдаа итгэлтэй байна уу?')) return;
    try {
      await deleteListing(user.id, l);
      showToast('Зар амжилттай устгагдлаа');
      notifyListingsChanged();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  if (authLoading) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      </div>
    );
  }
  if (!user) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="mb-4 text-6xl">🔑</div>
          <h3 className="text-xl font-semibold">Миний заруудыг харахын тулд нэвтрэх шаардлагатай</h3>
        </div>
      </div>
    );
  }
  if (listings === null) {
    return (
      <div className="page-container">
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h1 className="mt-2 mb-5 text-2xl font-bold">📋 Миний зарууд</h1>

      {listings.length === 0 ? (
        <div className="px-5 py-16 text-center">
          <div className="mb-4 text-6xl">🏠</div>
          <h3 className="mb-2 text-xl font-semibold">Танд зар байхгүй байна</h3>
          <p className="text-gray-500">Та эхний зарыг нэмэх үү?</p>
          <button className="btn btn-primary mt-4" onClick={openAdd}>➕ Зар нэмэх</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {listings.map((l) => {
            const firstImage = Array.isArray(l.images) && l.images.length ? l.images[0] : null;
            return (
              <div
                key={l.id}
                className="flex flex-col items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 sm:flex-row sm:items-center"
              >
                <div className="h-[150px] w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-20 sm:w-[100px]">
                  {firstImage ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={firstImage} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-2xl">{getPropertyIcon(l.property_type)}</div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="mb-1 text-base font-semibold">{getPropertyIcon(l.property_type)} {l.property_type}</h4>
                  <p className="text-[13px] text-gray-500">📍 {[l.city, l.district].filter(Boolean).join(', ')}</p>
                  <p className="text-[13px] text-gray-500">💰 ₮{formatPrice(l.price)} {getPriceTypeLabel(l.price_type)}</p>
                  {l.rooms > 0 && <p className="text-[13px] text-gray-500">🛏 {l.rooms} өрөө</p>}
                  {l.area > 0 && <p className="text-[13px] text-gray-500">📐 {l.area} м²</p>}
                  {getFloorLabel(l.floor, l.total_floors) && <p className="text-[13px] text-gray-500">🏢 {getFloorLabel(l.floor, l.total_floors)}</p>}
                  {l.build_year > 0 && <p className="text-[13px] text-gray-500">📅 Ашиглалтанд орсон: {l.build_year} он</p>}
                  {l.balconies > 0 && <p className="text-[13px] text-gray-500">🚪 Тагт: {l.balconies}</p>}
                  {getGarageLabel(l.has_garage) && <p className="text-[13px] text-gray-500">🅿️ Гараж: {getGarageLabel(l.has_garage)}</p>}
                  <p className="text-xs text-gray-400">📅 {timeAgo(l.created_at)}</p>
                </div>
                <div className="flex w-full flex-row gap-2 sm:w-auto sm:flex-col">
                  <Link href={`/listings/${l.id}`} className="btn btn-primary btn-sm">👁 Харах</Link>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l)}>🗑 Устгах</button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
