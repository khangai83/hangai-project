'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import ListingCard from './ListingCard';
import { useAuth, useToast, useUI } from './AppProviders';
import { fetchListingsByIds } from '../lib/queries';
import { normalizeError } from '../lib/errors';
import { useFavorites, removeFavorite, clearFavorites } from '../lib/favorites';
import { downloadCsv, printTablePdf } from '../lib/exporters';
import { formatPrice, getCategoryLabel, getFloorLabel } from '../lib/format';

/** Экспортод (Excel/PDF) гарах баганын тодорхойлолт */
function exportColumns(origin) {
  return [
    { label: 'Төрөл', value: (l) => l.property_type || '' },
    { label: 'Зар/Түрээс', value: (l) => getCategoryLabel(l.category) },
    { label: 'Үнэ', value: (l) => formatPrice(l.price) },
    { label: 'Өрөө', value: (l) => (l.rooms > 0 ? l.rooms : '') },
    { label: 'Угаалгын өрөө', value: (l) => (l.bathrooms > 0 ? l.bathrooms : '') },
    { label: 'Талбай (м²)', value: (l) => (l.area > 0 ? l.area : '') },
    { label: 'Давхар', value: (l) => getFloorLabel(l.floor, l.total_floors) },
    { label: 'Он', value: (l) => (l.build_year > 0 ? l.build_year : '') },
    { label: 'Хот', value: (l) => l.city || '' },
    { label: 'Дүүрэг', value: (l) => l.district || '' },
    { label: 'Хороо', value: (l) => l.khoroo || '' },
    { label: 'Хаяг', value: (l) => l.address_detail || '' },
    { label: 'Утас', value: (l) => l.phone || '' },
    { label: 'Нийтэлсэн', value: (l) => (l.created_at ? new Date(l.created_at).toLocaleDateString('mn-MN') : '') },
    { label: 'Холбоос', value: (l) => `${origin}/listings/${l.id}` },
  ];
}

function todayStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** '5 зар (3 нь олдсон)' гэх мэт тайлбар */
function countLabel(savedCount, foundCount) {
  if (!savedCount) return 'Хоосон байна';
  if (savedCount === foundCount) return `${savedCount} зар`;
  return `${savedCount} зар хадгалагдсан (${foundCount} нь олдсон)`;
}

export default function FavoritesClient() {
  const { showToast } = useToast();
  const { user } = useAuth();
  const { openAuth } = useUI();
  const ids = useFavorites();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      if (!ids.length) {
        if (active) {
          setListings([]);
          setLoading(false);
        }
        return;
      }
      setLoading(true);
      try {
        const data = await fetchListingsByIds(ids);
        if (active) {
          setListings(data);
          setError('');
        }
      } catch (err) {
        const e = normalizeError(err);
        if (active) setError(e.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [ids]);

  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  const total = useMemo(() => listings.reduce((s, l) => s + (Number(l.price) || 0), 0), [listings]);

  const doCsv = () => {
    downloadCsv(`taalagsan-zaruud-${todayStamp()}.csv`, exportColumns(origin), listings);
    setNotice(`📊 Excel (CSV) файл татагдлаа — ${listings.length} зар`);
  };

  const doPdf = () => {
    const opened = printTablePdf({
      title: 'Таалагдсан зарууд',
      subtitle: `ZAR.mn — нийт ${listings.length} зар · ${new Date().toLocaleString('mn-MN')}`,
      columns: exportColumns(origin),
      rows: listings,
    });
    if (!opened) {
      setNotice('⚠️ Pop-up хаагдсан байна — PDF гаргахын тулд pop-up-ыг зөвшөөрнө үү.');
      return;
    }
    setNotice('🖨 Хэвлэх цонх нээгдлээ → «Save as PDF / PDF болгон хадгалах»-ыг сонгоно уу');
  };

  const removeOne = (l) => {
    removeFavorite(l.id);
    showToast('Таалагдсанаас хассан');
  };

  const clearAll = () => {
    if (!window.confirm(`${listings.length} зарыг таалагдсан жагсаалтаас бүгдийг нь хасах уу?`)) return;
    clearFavorites();
    setNotice('Жагсаалтыг цэвэрлэв');
  };

  return (
    <div className="page-container">
      <div className="mt-2 mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">❤️ Таалагдсан зарууд</h1>
          <p className="text-sm text-gray-500">
            {countLabel(ids.length, listings.length)}
            {total > 0 && listings.length > 0 && <> · Нийт үнэ ₮{formatPrice(total)}</>}
          </p>
        </div>

        {listings.length > 0 && (
          <div className="flex flex-wrap gap-2">
            <button className="btn btn-secondary btn-sm" onClick={doCsv} title="Excel-д нээгдэх CSV файл">
              📊 Excel татах
            </button>
            <button className="btn btn-secondary btn-sm" onClick={doPdf} title="Хэвлэх цонхоор PDF болгоно">
              🖨 PDF болгох
            </button>
            <button className="btn btn-outline btn-sm" onClick={clearAll}>
              🗑 Бүгдийг цэвэрлэх
            </button>
          </div>
        )}
      </div>

      {notice && <p className="mb-3 rounded-lg bg-gray-50 px-3.5 py-2.5 text-[13px] text-gray-700">{notice}</p>}

      {loading ? (
        <div className="px-5 py-16 text-center">
          <div className="spinner"></div>
          <p>Ачаалж байна...</p>
        </div>
      ) : error ? (
        <div className="mx-auto my-6 max-w-[640px] rounded-2xl border border-red-200 bg-white px-6 py-8 text-center">
          <div className="text-4xl">⚠️</div>
          <h3 className="mb-2 mt-3 text-lg font-semibold text-red-800">Алдаа гарлаа</h3>
          <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-left text-[13px] text-red-700">{error}</p>
        </div>
      ) : !listings.length ? (
        <div className="px-5 py-16 text-center">
          <div className="mb-4 text-6xl">🤍</div>
          <h3 className="mb-2 text-xl font-semibold">Одоогоор Танд таалагдсан зар байхгүй байна</h3>
          <p className="text-gray-500">
            Зар үзэхдээ зүрхэн дээр дарж «Таалагдсан»-д нэмээрэй — дараа нь эндээс бүгдийг нь хараад
            Excel/PDF болгон татаж авах боломжтой.
          </p>
          <Link href="/" className="btn btn-primary mt-4">
            🔍 Зар хайх
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {listings.map((l) => (
            <div key={l.id} className="relative">
              <ListingCard listing={l} />
              {/* ⚠️ Товчийг картын ГАДНА (баруун дээд булан) байрлуулав —
                  ингэснээр картын доод мөрийн текстийг халхлахгүй.
                  📱 Утасны дэлгэцэд (max-sm) доош буулгав: тэнд ❤️ товч
                  баруун дээд буланд байдаг тул мөргөлдөхөөс сэргийлнэ. */}
              <button
                type="button"
                onClick={() => removeOne(l)}
                title="Таалагдсанаас хасах"
                className="absolute right-3 top-3 z-10 flex h-8 items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 text-xs font-semibold text-gray-600 shadow-sm transition hover:border-red-300 hover:bg-red-50 hover:text-red-600 max-sm:bottom-3 max-sm:right-2 max-sm:top-auto"
              >
                Хасах
              </button>
            </div>
          ))}
        </div>
      )}

      <p className="mt-4 text-[12px] text-gray-400">
        ℹ️ Одоогоор Таалагдсан зарууд нь энэ browser-т хадгалагдана (localStorage).
        {/* ⚠️ Нэвтрэх уриалга нь зөвхөн НЭВТРЭЭГҮЙ үед харагдана —
            нэвтэрсэн хэрэглэгчид энэ өгүүлбэр утгагүй тул нууна. */}
        {!user && (
          <>
            {' '}
            Хэрэв та өөртөө хадгалахыг хүсвэл{' '}
            <button
              type="button"
              onClick={openAuth}
              className="font-semibold text-primary underline underline-offset-2 hover:text-primary"
            >
              нэвтэрч орно уу
            </button>
            .
          </>
        )}
      </p>
    </div>
  );
}

