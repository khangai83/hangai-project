'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ListingCard from './ListingCard';
import MapView from './MapView';
import { useToast, useUI } from './AppProviders';
import { fetchListings, fetchPropertyTypeCounts } from '../lib/queries';
import { normalizeError } from '../lib/errors';
import { CITIES, getDistricts, getKhoroos, CATEGORIES, PROPERTY_TYPES } from '../lib/locationData';
import { getCategoryLabel, getPropertyIcon, getPropertyTypeLabel } from '../lib/format';
import { buildHomeBreadcrumb } from '../lib/breadcrumb';
import Breadcrumb from './Breadcrumb';

const EMPTY_FILTERS = {
  propertyType: '', rooms: '', city: '', district: '', khoroo: '',
  minPrice: '', maxPrice: '', minArea: '', maxArea: '',
};

export default function HomeClient() {
  const { showToast } = useToast();
  const { dataVersion } = useUI();
  const router = useRouter();

  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [view, setView] = useState('list');
  const [listings, setListings] = useState(null); // null = ачаалж байна
  const [loadError, setLoadError] = useState(null); // холболтын алдаа (UI-д тусдаа харуулна)
  const [urlReady, setUrlReady] = useState(false); // URL-ийн шүүлтийг уншсан эсэх
  const [typeCounts, setTypeCounts] = useState({}); // төрөл тус бүрийн зарын тоо

  // ---- URL-ийн query-ээс шүүлтийг унших ----
  // breadcrumb болон хуваалцсан линк ажиллахын тулд:
  //   /?category=sell&type=Орон сууц&rooms=3
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const cat = sp.get('category');
    if (cat === 'sell' || cat === 'rent' || cat === 'all') setCategory(cat);

    const q = sp.get('q') || sp.get('search') || '';
    if (q) { setSearch(q); setQuery(q); }
    if (sp.get('view') === 'map') setView('map');

    const next = { ...EMPTY_FILTERS };
    if (sp.get('type')) next.propertyType = sp.get('type');
    if (sp.get('rooms')) next.rooms = sp.get('rooms');
    if (sp.get('city')) next.city = sp.get('city');
    if (sp.get('district')) next.district = sp.get('district');
    if (sp.get('khoroo')) next.khoroo = sp.get('khoroo');
    if (sp.get('minPrice')) next.minPrice = sp.get('minPrice');
    if (sp.get('maxPrice')) next.maxPrice = sp.get('maxPrice');
    if (sp.get('minArea')) next.minArea = sp.get('minArea');
    if (sp.get('maxArea')) next.maxArea = sp.get('maxArea');
    if (Object.values(next).some(Boolean)) setFilters(next);

    setUrlReady(true);
  }, []);

  const load = useCallback(async () => {
    setListings(null);
    setLoadError(null);
    try {
      const data = await fetchListings({
        category,
        search: query,
        propertyType: filters.propertyType || undefined,
        rooms: filters.rooms || undefined,
        city: filters.city || undefined,
        district: filters.district || undefined,
        khoroo: filters.khoroo || undefined,
        minPrice: filters.minPrice || undefined,
        maxPrice: filters.maxPrice || undefined,
        minArea: filters.minArea || undefined,
        maxArea: filters.maxArea || undefined,
      });
      setListings(data || []);
    } catch (err) {
      const e = normalizeError(err);
      console.error(e);
      setListings([]);
      setLoadError(e);
      showToast(e.message, 'error');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, query, filters, dataVersion]);

  useEffect(() => { if (urlReady) load(); }, [load, urlReady]);

  // ---- Төрөл тус бүрийн зарын тоо (сонгосон категорид) ----
  useEffect(() => {
    if (!urlReady) return;
    let mounted = true;
    (async () => {
      try {
        const counts = await fetchPropertyTypeCounts(category);
        if (mounted) setTypeCounts(counts || {});
      } catch (err) {
        // Тоо харуулахгүй — үндсэн жагсаалтад нөлөөлөхгүй
        console.warn(normalizeError(err));
        if (mounted) setTypeCounts({});
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReady, category, dataVersion]);

  // ---- Шүүлт өөрчлөгдөхөд URL-ийг шинэчлэх (хуваалцах боломжтой болгох) ----
  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (query) params.set('q', query);
    if (filters.propertyType) params.set('type', filters.propertyType);
    if (filters.rooms) params.set('rooms', filters.rooms);
    if (filters.city) params.set('city', filters.city);
    if (filters.district) params.set('district', filters.district);
    if (filters.khoroo) params.set('khoroo', filters.khoroo);
    if (filters.minPrice) params.set('minPrice', filters.minPrice);
    if (filters.maxPrice) params.set('maxPrice', filters.maxPrice);
    if (filters.minArea) params.set('minArea', filters.minArea);
    if (filters.maxArea) params.set('maxArea', filters.maxArea);
    if (view === 'map') params.set('view', 'map');

    const qs = params.toString();
    const next = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    const current = `${window.location.pathname}${window.location.search}`;
    if (next !== current) router.replace(next, { scroll: false });
  }, [urlReady, category, query, filters, view, router]);

  const setF = (k, v) => {
    setFilters((f) => {
      const next = { ...f, [k]: v };
      if (k === 'city') { next.district = ''; next.khoroo = ''; }
      if (k === 'district') { next.khoroo = ''; }
      return next;
    });
  };

  const resetAll = () => {
    setCategory('all'); setQuery(''); setSearch(''); setFilters(EMPTY_FILTERS);
  };

  const districts = useMemo(() => getDistricts(filters.city), [filters.city]);
  const khoroos = useMemo(() => getKhoroos(filters.city, filters.district), [filters.city, filters.district]);
  const hasFilters = Object.values(filters).some(Boolean) || category !== 'all' || query;

  return (
    <>
      {/* HERO */}
      <section className="bg-gradient-to-br from-primary to-primary-dark px-4 py-12 text-center text-white">
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">🏠 Үл хөдлөх хөрөнгийн зар</h1>
        <p className="mb-6 text-sm text-blue-100 sm:text-base">Худалдаа, түрээсийн үл хөдлөх хөрөнгийн зарууд</p>
        <div className="mx-auto flex w-full max-w-[620px] overflow-hidden rounded-lg shadow-card-hover">
          <input
            type="text"
            placeholder="Хайх... (жишээ нь: Баянгол, орон сууц)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') setQuery(search); }}
            className="flex-1 border-none px-4 py-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          <button
            onClick={() => setQuery(search)}
            className="shrink-0 bg-gray-900 px-6 text-sm font-medium text-white transition hover:bg-black"
          >
            🔍 Хайх
          </button>
        </div>
      </section>

      <div className="page-container">
        {/* BREADCRUMB — хэрэглэгч хаана явж байгаа (unegui.mn загвар) */}
        <Breadcrumb items={buildHomeBreadcrumb({ category, propertyType: filters.propertyType, rooms: filters.rooms })} />

        {/* CATEGORY TABS */}
        <div className="mb-6 flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              className={`rounded-full border px-6 py-2.5 text-sm font-medium transition ${
                category === c.value
                  ? 'border-primary bg-primary text-white'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-primary hover:text-primary'
              }`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>

        {/* PROPERTY TYPE NAV — Зарах/Түрээслэх-ийн бүрдэл хэсгүүд (unegui.mn загвар)
            Сонгосон категорид тохируулан нэрлэгдэнэ: 'Орон сууц зарна' / 'Орон сууц түрээслүүлнэ' */}
        <div className="-mt-3 mb-5 flex flex-wrap gap-4 border-b border-gray-200 pb-4" role="tablist" aria-label="Үл хөдлөхийн төрөл">
          <button
            type="button"
            role="tab"
            aria-selected={!filters.propertyType}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition ${
              !filters.propertyType
                ? 'border-primary bg-primary-light font-semibold text-primary'
                : 'border-gray-200 bg-white text-gray-700 hover:border-primary hover:text-primary'
            }`}
            onClick={() => setF('propertyType', '')}
          >
            <span className="text-[15px] leading-none">🗂</span> Бүх төрөл
          </button>
          {PROPERTY_TYPES.map((t) => {
            const isActive = filters.propertyType === t;
            const count = typeCounts[t];
            return (
              <button
                key={t}
                type="button"
                role="tab"
                aria-selected={isActive}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition ${
                  isActive
                    ? 'border-primary bg-primary-light font-semibold text-primary'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary hover:text-primary'
                }`}
                onClick={() => setF('propertyType', isActive ? '' : t)}
              >
                <span className="text-[15px] leading-none">{getPropertyIcon(t)}</span>
                {getPropertyTypeLabel(t, category)}
                {typeof count === 'number' && (
                  <span className={`ml-0.5 rounded-full px-1.5 py-px text-[11px] font-semibold ${isActive ? 'bg-blue-200 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* FILTERS + VIEW TOGGLE */}
        <div className="mb-6 rounded-xl border border-gray-200 bg-white p-5 shadow-card">
          <div className="mb-5 flex w-fit flex-wrap items-center gap-1 rounded-lg bg-gray-100 p-1">
            <button
              className={`rounded-md px-4 py-2 text-sm transition ${view === 'list' ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500'}`}
              onClick={() => setView('list')}
            >
              ☰ Жагсаалт
            </button>
            <button
              className={`rounded-md px-4 py-2 text-sm transition ${view === 'map' ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500'}`}
              onClick={() => setView('map')}
            >
              🗺 Газрын зураг
            </button>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Төрөл</label>
              <select className="form-select" value={filters.propertyType} onChange={(e) => setF('propertyType', e.target.value)}>
                <option value="">Бүх төрөл</option>
                {PROPERTY_TYPES.map((t) => <option key={t} value={t}>{getPropertyTypeLabel(t, category)}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Өрөө</label>
              <select className="form-select" value={filters.rooms} onChange={(e) => setF('rooms', e.target.value)}>
                <option value="">Бүгд</option>
                {[1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r === 5 ? '5+ өрөө' : `${r} өрөө`}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Хот/Аймаг</label>
              <select className="form-select" value={filters.city} onChange={(e) => setF('city', e.target.value)}>
                <option value="">Бүгд</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Дүүрэг</label>
              <select className="form-select" value={filters.district} onChange={(e) => setF('district', e.target.value)} disabled={!districts.length}>
                <option value="">Бүгд</option>
                {districts.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Хороо</label>
              <select className="form-select" value={filters.khoroo} onChange={(e) => setF('khoroo', e.target.value)} disabled={!khoroos.length}>
                <option value="">Бүгд</option>
                {khoroos.map((k) => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Үнэ (доод)</label>
              <input className="form-input" type="number" min="0" placeholder="₮" value={filters.minPrice} onChange={(e) => setF('minPrice', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Үнэ (дээд)</label>
              <input className="form-input" type="number" min="0" placeholder="₮" value={filters.maxPrice} onChange={(e) => setF('maxPrice', e.target.value)} />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Талбай (м²) доод</label>
              <input
                className="form-input"
                type="text"
                inputMode="decimal"
                placeholder="75.5"
                value={filters.minArea}
                onChange={(e) => setF('minArea', e.target.value.replace(/[^\d.,]/g, ''))}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">Талбай (м²) дээд</label>
              <input
                className="form-input"
                type="text"
                inputMode="decimal"
                placeholder="120"
                value={filters.maxArea}
                onChange={(e) => setF('maxArea', e.target.value.replace(/[^\d.,]/g, ''))}
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-3 text-sm text-gray-500">
            <span className="mr-auto">
              {loadError ? 'холболтын алдаа' : listings !== null ? `${listings.length} зар` : 'ачаалж байна...'} {query ? `— «${query}» хайлт` : ''}
            </span>
            {hasFilters && <button className="btn btn-outline btn-sm" onClick={resetAll}>↺ Шүүлтийг цэвэрлэх</button>}
          </div>
        </div>

        {/* CONTENT */}
        {view === 'map' ? (
          <div className="h-[560px] overflow-hidden rounded-xl">
            <MapView listings={listings || []} />
          </div>
        ) : listings === null ? (
          <div className="px-5 py-16 text-center">
            <div className="spinner"></div>
            <p>Заруудыг ачаалж байна...</p>
          </div>
        ) : loadError ? (
          <div className="mx-auto my-6 max-w-[720px] rounded-2xl border border-red-200 bg-white px-6 py-8 text-center">
            <div className="text-4xl">🔌</div>
            <h3 className="mb-1.5 mt-2.5 text-lg font-semibold text-red-800">Өгөгдлийн сантай холбогдож чадсангүй</h3>
            <p className="[word-break:break-word] rounded-lg border border-red-200 bg-red-50 p-3 text-left text-[13px] text-red-700">{loadError.message}</p>
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3.5 text-left text-[13px] text-gray-700">
              <p><b>Хэрхэн засах вэ:</b></p>
              <ol className="mt-2 list-decimal space-y-1.5 pl-5">
                <li><code className="rounded bg-gray-100 px-1.5 py-px text-xs">.env.local</code> доторх <code className="rounded bg-gray-100 px-1.5 py-px text-xs">NEXT_PUBLIC_SUPABASE_URL</code> болон <code className="rounded bg-gray-100 px-1.5 py-px text-xs">NEXT_PUBLIC_SUPABASE_ANON_KEY</code>-г шалгана.</li>
                <li>Supabase Dashboard → <b>Project Settings → Data API</b> → Project URL-аа хуулж тавина.</li>
                <li>Терминалд <code className="rounded bg-gray-100 px-1.5 py-px text-xs">npm run check:supabase</code> ажиллуулж баталгаажуулна.</li>
                <li>Дараа нь dev server-ээ дахин эхлүүлнэ: <code className="rounded bg-gray-100 px-1.5 py-px text-xs">npm run dev</code></li>
                <li>
                  <b>Deploy хийсэн сайт</b> (Vercel г.м.) дээр бол env хувьсагчийг <b>тухайн платформд</b>
                  {' '}(<b>Settings → Environment Variables</b>) нэмээд <b>дахин deploy</b> хийнэ.
                  {' '}<code className="rounded bg-gray-100 px-1.5 py-px text-xs">NEXT_PUBLIC_*</code> нь
                  build үед шингэдэг тул restart хангалтгүй — шинэ deployment шаардлагатай.
                </li>
              </ol>
            </div>
            <button className="btn btn-primary mt-4" onClick={load}>↻ Дахин оролдох</button>
          </div>
        ) : listings.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <div className="mb-4 text-6xl">🔎</div>
            <h3 className="mb-2 text-xl font-semibold">Зарууд олдсонгүй</h3>
            <p className="text-gray-500">Шүүлт, хайлтаа өөрчилж үзнэ үү. {query && `«${query}»`} {getCategoryLabel(category)}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}

      </div>
    </>
  );
}
