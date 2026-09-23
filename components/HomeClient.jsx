'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ListingCard from './ListingCard';
import MapView from './MapView';
import { useToast, useUI } from './AppProviders';
import { fetchListings, fetchPropertyTypeCounts } from '../lib/queries';
import { normalizeError } from '../lib/errors';
import { CITIES, getDistricts, getKhoroos, CATEGORIES, PROPERTY_TYPES } from '../lib/locationData';
import { getCategoryLabel, getPropertyIcon, getPropertyTypeLabel, formatPrice } from '../lib/format';
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
  const [filtersOpen, setFiltersOpen] = useState(false); // «Дэлгэрэнгүй хайлт» панель нээлттэй эсэх

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

  /** Идэвхтэй шүүлтүүд — toolbar-ын доор «чип» хэлбэрээр (✕ дарж тус тусад нь арилгана) */
  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.propertyType) {
      chips.push({ key: 'propertyType', label: `${getPropertyIcon(filters.propertyType)} ${getPropertyTypeLabel(filters.propertyType, category)}` });
    }
    if (filters.rooms) chips.push({ key: 'rooms', label: `🛏 ${Number(filters.rooms) >= 5 ? '5+' : filters.rooms} өрөө` });
    if (filters.city) chips.push({ key: 'city', label: `🏙 ${filters.city}` });
    if (filters.district) chips.push({ key: 'district', label: `📍 ${filters.district}` });
    if (filters.khoroo) chips.push({ key: 'khoroo', label: filters.khoroo });
    if (filters.minPrice) chips.push({ key: 'minPrice', label: `₮${formatPrice(filters.minPrice)}-с дээш` });
    if (filters.maxPrice) chips.push({ key: 'maxPrice', label: `₮${formatPrice(filters.maxPrice)} хүртэл` });
    if (filters.minArea) chips.push({ key: 'minArea', label: `${filters.minArea} м²-с дээш` });
    if (filters.maxArea) chips.push({ key: 'maxArea', label: `${filters.maxArea} м² хүртэл` });
    return chips;
  }, [filters, category]);

  const activeFilterCount = activeFilterChips.length;
  // «Дэлгэрэнгүй хайлт» товчны төлөв: панель нээлттэй эсвэл идэвхтэй шүүлт байвал
  // илүү хүчтэй гэрэлтэлт (glow) → анхаарал татана.
  const advancedActive = filtersOpen || activeFilterCount > 0;

  /** Нэг чипийг арилгах */
  const removeFilterChip = (key) => setF(key, '');

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

        {/* ===== ХАЙЛТЫН TOOLBAR =====
            unegui.mn-ийн «Олон шүүлт» хэсгийг эндээс нээнэ:
            • «⚙️ Дэлгэрэнгүй хайлт» — шүүлтийн панелийг нээх/хаах (идэвхтэй шүүлтийн тоотой)
            • Баруун талд — ☰ Жагсаалт / 🗺 Газрын зураг харах горим
            • Доор нь — идэвхтэй шүүлтүүд «чип» хэлбэрээр (✕ дарж тус тусад нь арилгана) */}
        <div className="mb-4 rounded-xl border border-gray-200 bg-white p-3 shadow-card sm:p-4">
          <div className="flex flex-wrap items-center gap-2">
            {/* ⚙️ ДЭЛГЭРЭНГҮЙ ХАЙЛТ — анхаарал татах ёстой үндсэн шүүлтийн орох хаалга:
                • градиент + бодит сүүдэр (товчны нэгдсэн системтэй ижил)
                • цаана нь blur-тай ГЭРЭЛТЭЛТ (glow) → нүд шууд түүн дээр очно
                • идэвхтэй шүүлттэй үед гэрэлтэлт хүчтэй болно
                • идэвхтэй тоо нь ЦАГААН дугуй дотор (бусад шүүлтээс ялгарна) */}
            <span className="relative inline-flex">
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute -inset-[3px] rounded-full blur-[7px] transition-opacity duration-300 ${
                  advancedActive ? 'bg-primary/45' : 'bg-primary/25'
                }`}
              />
              <button
                type="button"
                onClick={() => setFiltersOpen((v) => !v)}
                aria-expanded={filtersOpen}
                aria-controls="advanced-filters"
                className="relative inline-flex items-center gap-2 rounded-full bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] px-4 py-2.5 text-sm font-bold text-white shadow-btn-primary transition-all duration-150 ease-out hover:-translate-y-0.5 hover:from-[#2563eb] hover:to-[#1e3fae] hover:shadow-btn-primary-hover active:translate-y-0 active:shadow-btn-primary-active focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary/45"
              >
                <span aria-hidden="true" className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-white/20 text-[11px]">
                  ⚙️
                </span>
                Дэлгэрэнгүй хайлт
                {activeFilterCount > 0 && (
                  <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-white px-1 text-[11px] font-bold text-primary">
                    {activeFilterCount}
                  </span>
                )}
                <span aria-hidden="true" className={`text-[10px] transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
            </span>

            <span className="text-sm text-gray-500">
              {loadError ? 'холболтын алдаа' : listings !== null ? `${listings.length} зар` : 'ачаалж байна...'}
              {query ? ` · «${query}»` : ''}
            </span>

            <div className="ml-auto flex items-center gap-1 rounded-lg bg-gray-100 p-1" role="group" aria-label="Харах горим">
              <button
                type="button"
                aria-pressed={view === 'list'}
                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition ${
                  view === 'list' ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-800'
                }`}
                onClick={() => setView('list')}
              >
                ☰ Жагсаалт
              </button>
              <button
                type="button"
                aria-pressed={view === 'map'}
                className={`inline-flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-[13px] font-semibold transition ${
                  view === 'map' ? 'bg-white text-gray-900 shadow-card' : 'text-gray-500 hover:text-gray-800'
                }`}
                onClick={() => setView('map')}
              >
                🗺 Газрын зураг
              </button>
            </div>
          </div>

          {activeFilterChips.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-gray-100 pt-3">
              <span className="mr-0.5 text-[12px] font-semibold uppercase tracking-wide text-gray-400">Шүүлт</span>
              {activeFilterChips.map((chip) => (
                <span
                  key={chip.key}
                  className="inline-flex items-center gap-1 rounded-full bg-gray-100 py-1 pl-2.5 pr-1 text-[12px] font-medium text-gray-700"
                >
                  {chip.label}
                  <button
                    type="button"
                    onClick={() => removeFilterChip(chip.key)}
                    aria-label={`${chip.label} шүүлтийг хасах`}
                    className="grid h-4 w-4 place-items-center rounded-full text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </span>
              ))}
              <button type="button" onClick={resetAll} className="ml-0.5 text-[12px] font-semibold text-primary hover:underline">
                Бүгдийг цэвэрлэх
              </button>
            </div>
          )}
        </div>

        {/* ===== ДЭЛГЭРЭНГҮЙ ХАЙЛТ — зөвхөн товч дарвал нээгдэнэ =====
            ⚠️ «Төрөл» нь энд БАЙХГҮЙ: дээрх төрлийн табуудаас сонгогдоно (давхардлаас зайлсхийв). */}
        <div
          id="advanced-filters"
          className={`${filtersOpen ? 'mb-6 block animate-slide-down' : 'hidden'} rounded-xl border-2 border-primary/25 bg-white p-5 shadow-card-hover`}
        >
          {/* Толгой нь primary өнгөөр будсан зурвас — нээгдсэн үед «энэ бол шүүлт»
              гэдэг нь нэг харцаар мэдэгдэнэ (сөрөг margin-аар container-ийн padding
              дээгүүр гарна — доорх агуулгыг дахин бүтэцлэх шаардлагагүй). */}
          <div className="-mx-5 -mt-5 mb-4 flex items-center justify-between gap-3 rounded-t-xl border-b border-primary/15 bg-primary/5 px-5 py-3.5">
            <h2 className="flex items-center gap-2 text-sm font-bold text-primary">
              <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-[12px] text-white">
                ⚙️
              </span>
              Дэлгэрэнгүй хайлт
              {activeFilterCount > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                  {activeFilterCount} шүүлт
                </span>
              )}
            </h2>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="rounded-full border border-primary/20 bg-white px-3 py-1 text-[13px] font-semibold text-primary transition hover:bg-primary hover:text-white"
            >
              ✕ Хаах
            </button>
          </div>

          <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">

            {/* «Төрөл» энд БАЙХГҮЙ — дээрх ⬆ төрлийн табуудаас сонгогдоно (дубликат зайлсхийв) */}
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

          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-gray-100 pt-4">
            {hasFilters && <button className="btn btn-outline btn-sm" onClick={resetAll}>↺ Шүүлтийг цэвэрлэх</button>}
            <button className="btn btn-primary btn-sm" onClick={() => setFiltersOpen(false)}>Дуусгах</button>
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
