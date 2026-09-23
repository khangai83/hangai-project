'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, useToast, useUI } from './AppProviders';
import { fetchMyListings, deleteListing } from '../lib/queries';
import { normalizeError } from '../lib/errors';
import { formatPrice, getPropertyIcon, timeAgo, getFloorLabel, getGarageLabel } from '../lib/format';
import MyListingsStatsPanel from './MyListingsStatsPanel';

/**
 * Энэ хуудас нь ЗӨВХӨН ӨӨРИЙН зарыг харуулна.
 *   ℹ️ Өмнө нь «🌐 Бүх зарууд» гэсэн таб байсан бөгөөд бүх хэрэглэгчийн зарыг
 *      энд харуулдаг байв. Гэхдээ «Миний зарууд» гэдэг нэртэй хуудас дээр
 *      БУСДЫН зарууд харагдах нь төөрөгдүүлж, «миний» гэдэг утгыг алдагдуулж
 *      байсан тул ХАСАГДСАН. Бүх зарыг харах бол нүүр хуудас (`/`) — тэнд хайлт,
 *      шүүлт, газрын зураг бүгд бий. Тухайн зарын нийтлэгчийн бусад зарыг
 *      `/sellers/[id]` хуудаснаас харна.
 */
const TABS = [
  { key: 'mine', label: '📋 Миний зарууд' },
  { key: 'stats', label: '📈 Статистик' },
];

export default function MyListingsClient() {
  const { user, authLoading } = useAuth();
  const { showToast } = useToast();
  const { openAdd, openEdit, dataVersion, notifyListingsChanged } = useUI();
  const [tab, setTab] = useState('mine');
  const [listings, setListings] = useState(null);

  useEffect(() => {
    // «📈 Статистик» таб нь ӨӨРИЙН дата-аа татдаг (MyListingsStatsPanel)
    if (tab === 'stats') return undefined;

    if (!user) {
      setListings([]);
      return undefined;
    }

    let mounted = true;
    setListings(null);
    (async () => {
      try {
        const data = await fetchMyListings(user.id);
        if (mounted) setListings(data || []);
      } catch (err) {
        console.error(normalizeError(err));
        if (mounted) {
          setListings([]);
          showToast(err.message, 'error');
        }
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab, dataVersion]);

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
  const isStats = tab === 'stats';

  if (listings === null && !isStats) {
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
      <div className="mt-2 mb-5 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">
          {tab === 'mine' ? '📋 Миний зарууд' : '📈 Хандалтын статистик'}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Табууд — статистикийн хугацааны сонголттой ижил сегмент стиль */}
          <div className="segmented">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                aria-pressed={tab === t.key}
                className={`segmented-item ${tab === t.key ? 'segmented-item-active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===== 📈 Статистик таб — өөрийн заруудын хандалт ===== */}
      {isStats ? (
        <MyListingsStatsPanel />
      ) : (
        <>
          <p className="mb-3 text-[13px] text-gray-500">
            Энэ хуудас зөвхөн <b>таны</b> заруудыг харуулна. Бүх зарыг хайх бол{' '}
            <Link href="/" className="font-semibold text-primary hover:underline">
              нүүр хуудас
            </Link>{' '}
            руу орно уу.
          </p>
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
                    className="group flex flex-col items-start gap-4 rounded-xl border border-gray-200 bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:border-primary hover:shadow-card-hover sm:flex-row sm:items-center"
                  >
                    {/* ⚠️ КАРТ БҮХЭЛДЭЭ линк — «👁 Харах» товч ХЭРЭГГҮЙ.
                        Үйлдлийн товчнууд (Засах/Устгах) нь линкээс ГАДНА —
                        `<a>` дотор `<button>` хийх нь invalid HTML. */}
                    <Link
                      href={`/listings/${l.id}`}
                      title="Зарын дэлгэрэнгүйг харах"
                      className="flex min-w-0 flex-1 flex-col items-start gap-4 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45 sm:flex-row sm:items-center"
                    >
                      <div className="h-[150px] w-full shrink-0 overflow-hidden rounded-lg bg-gray-100 sm:h-20 sm:w-[100px]">
                        {firstImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={firstImage}
                            alt=""
                            loading="lazy"
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-2xl">{getPropertyIcon(l.property_type)}</div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h4 className="mb-1 text-base font-semibold transition group-hover:text-primary">
                          {getPropertyIcon(l.property_type)} {l.property_type}
                        </h4>
                        <p className="text-[13px] text-gray-500">📍 {[l.city, l.district].filter(Boolean).join(', ')}</p>
                        <p className="text-[13px] text-gray-500">💰 ₮{formatPrice(l.price)}</p>
                        {l.rooms > 0 && <p className="text-[13px] text-gray-500">🛏 {l.rooms} өрөө</p>}
                        {l.area > 0 && <p className="text-[13px] text-gray-500">📐 {l.area} м²</p>}
                        {getFloorLabel(l.floor, l.total_floors) && <p className="text-[13px] text-gray-500">🏢 {getFloorLabel(l.floor, l.total_floors)}</p>}
                        {l.build_year > 0 && <p className="text-[13px] text-gray-500">📅 Ашиглалтанд орсон: {l.build_year} он</p>}
                        {l.balconies > 0 && <p className="text-[13px] text-gray-500">🚪 Тагт: {l.balconies}</p>}
                        {getGarageLabel(l.has_garage) && <p className="text-[13px] text-gray-500">🅿️ Гараж: {getGarageLabel(l.has_garage)}</p>}
                        <p className="text-xs text-gray-400">📅 {timeAgo(l.created_at)}</p>
                      </div>
                    </Link>
                    <div className="flex w-full flex-row gap-2 sm:w-auto sm:flex-col">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(l)}>✏️ Засах</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l)}>🗑 Устгах</button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
