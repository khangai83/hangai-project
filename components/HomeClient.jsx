'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ListingCard from './ListingCard';
import MapView from './MapView';
import { useToast, useUI } from './AppProviders';
import { fetchListings, fetchPropertyTypeCounts, fetchRoomCounts } from '../lib/queries';
import { normalizeError } from '../lib/errors';
import {
  CITIES, getDistricts, getKhoroos, ROOM_OPTIONS, formatRoomsLabel,
  hasRoomsFields, CATEGORIES, PROPERTY_TYPES,
} from '../lib/locationData';
import { getCategoryLabel, getPropertyIcon, getPropertyTypeLabel, formatPrice, formatCount } from '../lib/format';
import { buildHomeBreadcrumb } from '../lib/breadcrumb';
import Breadcrumb from './Breadcrumb';

// Нүүр хуудсны хайлтын анхдагч (хоосон) утга.
// ⚠️ `khoroos` нь МАССИВ — хэрэглэгч ОЛОН хороог зэрэг сонгоно (unegui.mn-ийн
//    «олон хайлт»). Массивыг санамсаргүй ХУВААЛЦАХААС сэргийлж `EMPTY_FILTERS`-ийг
//    шууд хэрэглэхгүй — `emptyFilters()`-ээр шинэ хуулбар авна.
// ℹ️ `district` нь НЭГ утга (string) — олон дүүрэг зэрэг сонгох нь ХАСАГДСАН.
const EMPTY_FILTERS = {
  propertyType: '', rooms: '', city: '', district: '', khoroos: [],
  minPrice: '', maxPrice: '', minArea: '', maxArea: '',
};

/** Массив талбаруудыг ХУВААЛЦАХГҮЙ шинэ хоосон хайлт буцаана */
const emptyFilters = () => ({ ...EMPTY_FILTERS, khoroos: [] });

/** URL-ийн таслалаар бичсэн жагсаалтыг массив болгох (хороо) */
function parseListParam(raw) {
  return String(raw || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Sidebar-ийн НЭГ БЛОК — unegui.mn загвараар: дээрээ БОЛД гарчиг,
 * доор нь оролтууд. Блокууд нь `divide-y`-ээр тусгаарлагдана.
 */
function SideBlock({ label, children }) {
  return (
    <div className="py-3.5">
      <span className="mb-2 block text-[13px] font-bold text-gray-800">{label}</span>
      <div className="flex flex-col gap-2">{children}</div>
    </div>
  );
}

export default function HomeClient() {
  const { showToast } = useToast();
  const { dataVersion } = useUI();
  const router = useRouter();

  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(() => emptyFilters());
  const [view, setView] = useState('list');
  const [listings, setListings] = useState(null); // null = ачаалж байна
  const [loadError, setLoadError] = useState(null); // холболтын алдаа (UI-д тусдаа харуулна)
  const [urlReady, setUrlReady] = useState(false); // URL-ийн хайлтыг уншсан эсэх
  const [typeCounts, setTypeCounts] = useState({}); // төрөл тус бүрийн зарын тоо
  const [roomCounts, setRoomCounts] = useState({}); // өрөө тус бүрийн зарын тоо (unegui.mn загвар)
  const [filtersOpen, setFiltersOpen] = useState(false); // «Дэлгэрэнгүй хайлт» панель нээлттэй эсэх

  // ---- URL-ийн query-ээс хайлтыг унших ----
  // breadcrumb болон хуваалцсан линк ажиллахын тулд:
  //   /?category=sell&type=Орон сууц&rooms=3
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const cat = sp.get('category');
    if (cat === 'sell' || cat === 'rent' || cat === 'all') setCategory(cat);

    const q = sp.get('q') || sp.get('search') || '';
    if (q) { setSearch(q); setQuery(q); }
    if (sp.get('view') === 'map') setView('map');

    const next = emptyFilters(); // массив хуваалцахгүй
    if (sp.get('type')) next.propertyType = sp.get('type');
    if (sp.get('rooms')) next.rooms = sp.get('rooms');
    // ⚠️ «Өрөө» талбаргүй төрөлд (ж: Худалдаа, үйлчилгээний талбай) өрөөний
    //    хайлт нь утгагүй тул хуучин линкээс ирсэн ч орхигдуулна.
    if (next.propertyType && !hasRoomsFields(next.propertyType)) next.rooms = '';
    if (sp.get('city')) next.city = sp.get('city');
    // ⚠️ ХОРОО: URL-д `khoroo=1-р хороо,3-р хороо` (таслалаар) — хуваалцсан
    //    линк эвдрэхгүйн тулд НЭГ утгатай хуучин линкийг ч зөв уншина.
    // ⚠️ ДҮҮРЭГ нь НЭГ утга. Хуучин ОЛОН дүүрэгтэй линк (`district=А,Б`)
    //    ирвэл ЭХНИЙ дүүргийг л авна (олон дүүрэг сонгох нь хасагдсан).
    const districtRaw = sp.get('district');
    if (districtRaw) next.district = parseListParam(districtRaw)[0] || '';
    const khorooRaw = sp.get('khoroo');
    if (khorooRaw) next.khoroos = parseListParam(khorooRaw);
    if (sp.get('minPrice')) next.minPrice = sp.get('minPrice');
    if (sp.get('maxPrice')) next.maxPrice = sp.get('maxPrice');
    if (sp.get('minArea')) next.minArea = sp.get('minArea');
    if (sp.get('maxArea')) next.maxArea = sp.get('maxArea');
    if (Object.values(next).some((v) => (Array.isArray(v) ? v.length : v))) setFilters(next);

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
        khoroos: filters.khoroos.length ? filters.khoroos : undefined,
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

  // ---- Өрөө тус бүрийн зарын тоо (unegui.mn загварын «1 өрөө 1,088» мөр) ----
  // ⚠️ Зөвхөн КАТЕГОРИ + ТӨРӨЛ өөрчлөгдөхөд дахин татна — бусад шүүлт
  //    (үнэ, байршил г.м.) нөлөөлөхгүй (`lib/queries.js` → `fetchRoomCounts`).
  useEffect(() => {
    if (!urlReady) return;
    // Төрөл сонгоогүй эсвэл «Өрөө» талбаргүй төрөлд тоо ХЭРЭГГҮЙ — мөр нь
    // ч харагдахгүй тул дэмий 5 query явуулахгүй.
    if (!hasRoomsFields(filters.propertyType)) {
      setRoomCounts({});
      return;
    }
    let mounted = true;
    (async () => {
      try {
        const counts = await fetchRoomCounts({
          category,
          propertyType: filters.propertyType || undefined,
        });
        if (mounted) setRoomCounts(counts || {});
      } catch (err) {
        // Тоо харуулахгүй — үндсэн жагсаалтад нөлөөлөхгүй
        console.warn(normalizeError(err));
        if (mounted) setRoomCounts({});
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReady, category, filters.propertyType, dataVersion]);

  // ---- Хайлт өөрчлөгдөхөд URL-ийг шинэчлэх (хуваалцах боломжтой болгох) ----
  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (query) params.set('q', query);
    if (filters.propertyType) params.set('type', filters.propertyType);
    if (filters.rooms) params.set('rooms', filters.rooms);
    if (filters.city) params.set('city', filters.city);
    if (filters.district) params.set('district', filters.district);
    if (filters.khoroos.length) params.set('khoroo', filters.khoroos.join(','));
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
      // Хот/аймаг солигдвол дүүрэг, хорооны сонголт ХҮЧИНГҮЙ болно (жагсаалт өөр)
      if (k === 'city') { next.district = ''; next.khoroos = []; }
      // Дүүрэг солигдвол хороодын жагсаалт өөр болно
      if (k === 'district') { next.khoroos = []; }
      // «Өрөө» талбаргүй төрөл сонговол өрөөний хайлтыг цэвэрлэнэ (ж: Худалдаа…)
      if (k === 'propertyType' && v && !hasRoomsFields(v)) next.rooms = '';
      return next;
    });
  };

  /** ОЛОН ХОРОО — нэг дарж нэмэх/хасах (checkbox мэт) */
  const toggleKhoroo = (k) => {
    setFilters((f) => ({
      ...f,
      khoroos: f.khoroos.includes(k) ? f.khoroos.filter((x) => x !== k) : [...f.khoroos, k],
    }));
  };

  const resetAll = () => {
    setCategory('all'); setQuery(''); setSearch('');
    setFilters(emptyFilters()); // массив хуваалцахгүй
  };

  /** Breadcrumb-ийн линк дээр дарахад тухайн түвшин рүү буцаана.
   *  ⚠️ `<Link>`-ээр ЯВАХГҮЙ: бүх линк нь `/` зам дээр байдаг тул Next.js
   *     компонентийг ДАХИН MOUNT хийдэггүй → `useEffect([])` нь URL-ийг дахин
   *     уншихгүй, шүүлт ХУУЧНААРАА үлдэнэ. Тиймээс төлөвийг ШУУД өөрчилнө
   *     (URL-ийг доорх эффект өөрөө бичнэ). */
  const goToCrumb = (item) => {
    const nav = item?.nav;
    if (!nav) return;
    if (nav.reset) { resetAll(); return; }
    if (nav.category !== undefined) setCategory(nav.category);
    if (nav.filters) setFilters((f) => ({ ...f, ...nav.filters }));
  };

  /** Дүүргийн сонголтууд (сонгосон хот/аймагт) — НЭГ сонголттой */
  const districtOptions = useMemo(() => getDistricts(filters.city), [filters.city]);
  /** Хороодын сонголтууд (сонгосон хот + дүүрэгт) */
  const khoroos = useMemo(
    () => getKhoroos(filters.city, filters.district),
    [filters.city, filters.district]
  );
  /** «Өрөө» мөр ба тоо харагдах эсэх.
   *  ⚠️ PROGRESSIVE DISCLOSURE: ЗӨВХӨН төрөл сонгосон үед (`filters.propertyType`)
   *     БА тухайн төрөл «Өрөө» талбартай үед. Худалдаа/үйлчилгээний талбай,
   *     Оффис, Газар, Үйлдвэр, Гараж зэрэгт «өрөө» гэдэг ойлголт БАЙХГҮЙ. */
  const showRooms = hasRoomsFields(filters.propertyType);

  /** Хуудасны гарчиг — unegui.mn загвар: «Орон сууц түрээслүүлнэ 16,345».
   *  Төрөл > категори > бүгд гэсэн дарааллаар тодорхойлно. */
  const pageTitle = filters.propertyType
    ? getPropertyTypeLabel(filters.propertyType, category)
    : category === 'rent'
      ? 'Үл хөдлөх түрээслүүлнэ'
      : category === 'sell'
        ? 'Үл хөдлөх зарна'
        : 'Бүх зар';
  const hasFilters = Object.values(filters).some((v) => (Array.isArray(v) ? v.length : v)) || category !== 'all' || query;

  /** Идэвхтэй хайлтууд — статус мөрийн доор «чип» хэлбэрээр (✕ дарж тус тусад нь арилгана) */
  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.propertyType) {
      chips.push({ key: 'propertyType', label: `${getPropertyIcon(filters.propertyType)} ${getPropertyTypeLabel(filters.propertyType, category)}` });
    }
    if (filters.rooms) chips.push({ key: 'rooms', label: `🛏 ${formatRoomsLabel(filters.rooms)}` });
    if (filters.city) chips.push({ key: 'city', label: `🏙 ${filters.city}` });
    if (filters.district) chips.push({ key: 'district', label: `📍 ${filters.district}` });
    // ⚠️ Хороо: 1 сонгосон бол нэрийг, олон бол «N хороо» гэж товчлон харуулна
    if (filters.khoroos.length) {
      chips.push({
        key: 'khoroos',
        label: filters.khoroos.length === 1 ? `🏘 ${filters.khoroos[0]}` : `🏘 ${filters.khoroos.length} хороо`,
      });
    }
    if (filters.minPrice) chips.push({ key: 'minPrice', label: `₮${formatPrice(filters.minPrice)}-с дээш` });
    if (filters.maxPrice) chips.push({ key: 'maxPrice', label: `₮${formatPrice(filters.maxPrice)} хүртэл` });
    if (filters.minArea) chips.push({ key: 'minArea', label: `${filters.minArea} м²-с дээш` });
    if (filters.maxArea) chips.push({ key: 'maxArea', label: `${filters.maxArea} м² хүртэл` });
    return chips;
  }, [filters, category]);

  const activeFilterCount = activeFilterChips.length;

  /** Нэг чипийг арилгах (`khoroos` нь массив тул хоосон массив) */
  const removeFilterChip = (key) => setF(key, key === 'khoroos' ? [] : '');

  // ---- PROGRESSIVE DISCLOSURE: ТӨРӨЛ сонгомогц хайлт нээгдэнэ ----
  // ⚠️ ЯАГААД: урьд нь hero-ийн хайлтын мөр БА том «⚙️ Дэлгэрэнгүй хайлт»
  //    товчтой карт хоёулаа нэгэн зэрэг харагддаг байв → хэрэглэгчид
  //    «дэлгэц дээр 2 хайлтын хэсэг» мэт санагддаг. Одоо урсгал нь:
  //      категори (Зарах/Түрээслэх) → ТӨРӨЛ → дараа нь л дэлгэрэнгүй хайлт.
  //    Ингэснээр эхлээд л дэлгэц цэвэр, дараа нь хэрэгцээтэй үед нээгдэнэ
  //    (Zillow / Airbnb-гийн progressive disclosure загвар).
  //    Хэрэглэгч гараар хаасан бол дахин албадаж нээхгүй (зөвхөн төрөл
  //    СОЛИГДОХ үед ажиллана).
  useEffect(() => {
    setFiltersOpen(!!filters.propertyType);
  }, [filters.propertyType]);

  return (
    <>
      {/* HERO — фон нь Улаанбаатарын панорама зураг (`public/hero-ub.jpg`)
          ⚠️ OVERLAY ЗААВАЛ: зураг нь маш тод (нар жаргах тэнгэр) тул overlay
             байхгүй бол цагаан гарчиг уншигдахгүй. Доорх хар градиент нь
             white текстэд ~12:1 контраст өгнө (WCAG AA-аас хол давсан).
             `isolate` + `-z-10` нь overlay-г контентын АРД, гэхдээ хуудасны
             дэвсгэрээс ГАДНА байлгана. */}
      <section className="relative isolate overflow-hidden bg-primary-dark px-4 py-12 text-center text-white">
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-ub.jpg')" }}
        />
        <span
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-b from-black/70 via-black/55 to-black/75"
        />
        <h1 className="mb-2 text-3xl font-bold sm:text-4xl">🏠 Үл хөдлөх хөрөнгийн зар</h1>
        <p className="mb-6 text-sm text-white/90 sm:text-base">Худалдаа, түрээсийн үл хөдлөх хөрөнгийн зарууд</p>

        {/* ===== ЦОРЫН ГАНЦ ХАЙЛТЫН МӨР =====
            ⚠️ ЯАГААД НЭГ ВЭ: дараа нь «⚙️ Дэлгэрэнгүй хайлт» товчтой ЦАГААН
               КАРТ байсныг «статус мөр» болгож бууруулсан (доор) → дэлгэц
               дээр хайлт нэг л удаа харагдана. Хайлтын мөр нь `<form>` тул
               Enter дарахад ч, товч дарахад ч ИЖИЛ ажиллана (a11y дээр зөв).
            ⚠️ Товч нь .btn БИШ: container нь `rounded-xl overflow-hidden` тул
               дотроос нь брэнд градиентаар дүүрнэ (товчны pill хэлбэр хэрэггүй). */}
        <form
          className="mx-auto flex w-full max-w-[620px] overflow-hidden rounded-xl bg-white shadow-card-hover ring-1 ring-black/10"
          onSubmit={(e) => { e.preventDefault(); setQuery(search); }}
          role="search"
        >
          <label className="sr-only" htmlFor="home-search">Зар хайх</label>
          <input
            id="home-search"
            type="text"
            placeholder="Хайх... (жишээ нь: Баянгол, орон сууц)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-w-0 flex-1 border-none px-4 py-3.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          <button
            type="submit"
            className="shrink-0 bg-gradient-to-b from-[#4B8EF8] via-[#3B82F6] to-[#1D4ED8] px-6 text-sm font-bold text-white transition-all duration-150 ease-out hover:from-[#3B82F6] hover:to-[#1E3FAE]"
          >
            🔍 Хайх
          </button>
        </form>
      </section>

      <div className="page-container">
        {/* BREADCRUMB — хэрэглэгч хаана явж байгаа (unegui.mn загвар).
            ⚠️ Хайлт ХИЙГЭЭГҮЙ ч гэсэн харагдана («Бүх зар › Үл хөдлөх») —
               байр суурь нь байнга мэдэгдэж байх ёстой. */}
        <Breadcrumb
          items={buildHomeBreadcrumb({
            category,
            propertyType: filters.propertyType,
            rooms: filters.rooms,
            district: filters.district,
          })}
          onNavigate={goToCrumb}
        />

        {/* ===== АНГИЛАЛ БА ТӨРЛИЙН НАВИГАЦИ — ЗӨВХӨН ТӨРӨЛ СОНГООГҮЙ ҮЕД =====
            ⚠️ PROGRESSIVE DISCLOSURE (хэрэглэгчийн хүсэлт): төрөл сонгомогц
               энэ ХОЁР МӨР БҮРЭН АЛГА БОЛЖ, дэлгэц минимал болно — зөвхөн
               BREADCRUMB + гарчиг + шүүлт + зарууд үлдэнэ (unegui.mn шиг).
               Буцах / төрөл солих зам нь дээрх breadcrumb (линкүүд нь ажиллана).
            ⚠️ «Бүх төрөл» таб нь `propertyType = ''` болгодог тул энэ хэсгийг
               буцааж харуулна. */}
        {!filters.propertyType && (
        <>
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
                  <span className={`ml-0.5 rounded-full px-1.5 py-px text-[11px] font-semibold ${isActive ? 'bg-primary-light text-primary' : 'bg-gray-100 text-gray-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        </>
        )}

        {/* ===== 2 БАГАНАТ БҮТЭЦ — unegui.mn загвар =====
            ⚠️ PROGRESSIVE DISCLOSURE: sidebar нь БАЙНГИЙН ХАРАГДАХГҮЙ —
               ЗӨВХӨН ТӨРӨЛ сонгосон үед гарч ирнэ (хэрэглэгчийн хүсэлт).
               Төрөл сонгоогүй үед үр дүн нь БҮТЭН ӨРГӨНӨӨР харагдаж,
               дэлгэц цэвэр, анхаарал сарниулахгүй байна.
            ⚠️ Мобайл дээр (`lg`-ээс доош) sidebar нь НУУГДАЖ, баруун талын
               «⚙️ Шүүлт» товчоор нээгдэнэ — товч нь DOM-д sidebar-ийн ӨМНӨ
               байрлана (нээгдэхэд дээгүүр гарна). Төрөл сонгоогүй үед оронд
               нь «Төрөл сонгоход шүүлт нээгдэнэ» гэсэн зөвлөмж харагдана.
            ⚠️ Sidebar нь `lg:sticky lg:top-4` — урт жагсаалт гүйлгэхэд шүүлт
               хамт гүйлгэхгүй, дэлгэц дээр барина (unegui.mn-тэй ижил). */}
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* ================= SIDEBAR — ШҮҮЛТ (зүүн багана) =================
              ⚠️ ЗӨВХӨН төрөл сонгосон үед render болно (дээрх тайлбарыг харна уу).
              ⚠️ `lg:block` нь мобайл дээрх `hidden`-ыг дарах тул `lg` дээр
                 нээлттэй; мобайл дээр «⚙️ Шүүлт» товчоор нээгдэнэ. */}
          {filters.propertyType && (
          <aside
            id="advanced-filters"
            className={`w-full shrink-0 lg:sticky lg:top-4 lg:block lg:w-[280px] ${filtersOpen ? '' : 'hidden'}`}
          >
            <div className="rounded-xl border border-gray-200 bg-white shadow-card">
              {/* Толгой — unegui.mn-д тусдаа гарчиг байхгүй ч «N шүүлт» badge нь
                  хэрэглэгчид ямар нэг зүйл сонгосноо мэдэгдэхэд тустай. */}
              <div className="flex items-center justify-between gap-2 border-b border-gray-100 px-4 py-3.5">
                <h2 className="flex items-center gap-2 text-[15px] font-bold text-gray-900">
                  <span aria-hidden="true" className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-primary text-[12px] text-white">
                    ⚙️
                  </span>
                  Шүүлт
                  {activeFilterCount > 0 && (
                    <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </h2>
                {/* Мобайл дээр л — sheet-ийг хаах */}
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="rounded-full border border-gray-200 px-2.5 py-1 text-[12px] font-semibold text-gray-500 transition hover:border-primary hover:text-primary lg:hidden"
                >
                  ✕ Хаах
                </button>
              </div>

              <div className="divide-y divide-gray-100 px-4">
                {/* ===== БАЙРШИЛ — Хот/Аймаг · Дүүрэг · ХОРОО =====
                    ⚠️ «Төрөл» энд БАЙХГҮЙ — төрлийг BREADCRUMB-ээс сольж буцаана
                       (төрөл сонгосон үед дээрх табууд хаагддаг тул).
                    ⚠️ Дүүрэг нь НЭГ сонголттой `<select>` (олон дүүрэг сонгох нь
                       хасагдсан), харин хороо нь ОЛОН сонголттой чип. */}
                <SideBlock label="Байршил">
                  <select
                    className="form-select"
                    aria-label="Хот/Аймаг"
                    value={filters.city}
                    onChange={(e) => setF('city', e.target.value)}
                  >
                    <option value="">Бүх байршил — Хот/Аймаг</option>
                    {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>

                  {districtOptions.length > 0 && (
                    <select
                      className="form-select"
                      aria-label="Дүүрэг / Сум"
                      value={filters.district}
                      onChange={(e) => setF('district', e.target.value)}
                    >
                      <option value="">Дүүрэг / Сум — Бүгд</option>
                      {districtOptions.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                  )}

                  {/* ХОРОО — ОЛОН СОНГОЛТ. Сонгосон дүүргийн хороодыг харуулна
                      (40+ хороо багтах ёстой тул жагсаалт скроллтой). */}
                  {khoroos.length ? (
                    <div className="flex flex-col gap-1.5">
                      <span className="text-[12px] font-semibold text-gray-500">
                        Хороо
                        {filters.khoroos.length > 0 && (
                          <span className="ml-1.5 rounded-full bg-primary-light px-1.5 py-px text-[11px] font-bold text-primary">
                            {filters.khoroos.length} сонгосон
                          </span>
                        )}
                      </span>
                      <div className="max-h-[150px] overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/70 p-2">
                        <div className="flex flex-wrap gap-1.5">
                          {khoroos.map((k) => {
                            const on = filters.khoroos.includes(k);
                            return (
                              <button
                                key={k}
                                type="button"
                                aria-pressed={on}
                                onClick={() => toggleKhoroo(k)}
                                className={`chip-toggle ${on ? 'chip-toggle-active' : ''}`}
                              >
                                {on && <span aria-hidden="true">✓</span>}
                                {k}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[12px] text-gray-500">
                      {filters.city
                        ? '💡 Дүүргээ сонгоход хорооны жагсаалт нээгдэнэ.'
                        : '💡 Эхлээд хот/аймгаа сонгоно уу.'}
                    </p>
                  )}
                </SideBlock>
                {/* ===== ҮНЭ, ₮ — unegui.mn-ийн «Эхлэх / Дуусах» хос оролт ===== */}
                <SideBlock label="Үнэ, ₮">
                  <div className="flex items-center gap-2">
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      placeholder="Эхлэх"
                      aria-label="Үнэ (эхлэх)"
                      value={filters.minPrice}
                      onChange={(e) => setF('minPrice', e.target.value)}
                    />
                    <input
                      className="form-input"
                      type="number"
                      min="0"
                      placeholder="Дуусах"
                      aria-label="Үнэ (дуусах)"
                      value={filters.maxPrice}
                      onChange={(e) => setF('maxPrice', e.target.value)}
                    />
                  </div>
                </SideBlock>

                {/* ===== ТАЛБАЙ, м² =====
                    ⚠️ `inputMode="decimal"` + «75,5» хэлбэрийн монгол бутархайг
                       зөвшөөрнө (`lib/queries.js` → `toNumber`). */}
                <SideBlock label="Талбай, м²">
                  <div className="flex items-center gap-2">
                    <input
                      className="form-input"
                      type="text"
                      inputMode="decimal"
                      placeholder="Эхлэх"
                      aria-label="Талбай (эхлэх)"
                      value={filters.minArea}
                      onChange={(e) => setF('minArea', e.target.value.replace(/[^\d.,]/g, ''))}
                    />
                    <input
                      className="form-input"
                      type="text"
                      inputMode="decimal"
                      placeholder="Дуусах"
                      aria-label="Талбай (дуусах)"
                      value={filters.maxArea}
                      onChange={(e) => setF('maxArea', e.target.value.replace(/[^\d.,]/g, ''))}
                    />
                  </div>
                </SideBlock>
              </div>

              {/* Доод хэсэг — unegui.mn-ийн «N зар харуулах» хэсэг.
                  ⚠️ Шүүлт нь амьд (real-time) хэрэгждэг тул энэ товч нь зөвхөн
                     мобайл дээрх sheet-ийг хаана — unegui.mn-тэй ижил байрлал. */}
              <div className="border-t border-gray-100 px-4 py-3.5">
                <button
                  type="button"
                  onClick={() => setFiltersOpen(false)}
                  className="btn btn-primary btn-sm w-full"
                >
                  🔍 Хайх
                </button>
                <p className="mt-2 text-center text-[12px] text-gray-500">
                  {loadError
                    ? 'холболтын алдаа'
                    : listings !== null
                      ? `${formatCount(listings.length)} зар харуулах`
                      : 'ачаалж байна…'}
                </p>
                {hasFilters && (
                  <button
                    type="button"
                    onClick={resetAll}
                    className="mt-1.5 w-full text-center text-[12px] font-semibold text-primary hover:underline"
                  >
                    ↺ Хайлтыг цэвэрлэх
                  </button>
                )}
              </div>
            </div>
          </aside>
          )}

          {/* ================= ҮР ДҮН (баруун багана) ================= */}
          <div className="min-w-0 flex-1">
            {/* ГАРЧИГ + НИЙТ ТОО — unegui.mn: «Өрөө байр зарна 16,345» */}
            <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
              <div className="min-w-0">
                <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                  {pageTitle}
                  {listings !== null && !loadError && (
                    <span className="ml-2 align-middle text-base font-normal text-gray-500">
                      {formatCount(listings.length)}
                    </span>
                  )}
                </h1>
                {query && <p className="mt-0.5 text-[13px] text-gray-500">«{query}» хайлтын үр дүн</p>}
                {loadError && <p className="mt-0.5 text-[13px] text-red-600">Өгөгдлийн сантай холбогдож чадсангүй</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* ⚠️ PROGRESSIVE DISCLOSURE: төрөл сонгоогүй бол нээх «шүүлт»
                    байхгүй тул оронд нь юу хийхийг хэлсэн зөвлөмж харуулна. */}
                {!filters.propertyType && (
                  <span className="text-[12.5px] text-gray-400">
                    💡 Төрөл сонгоход шүүлт нээгдэнэ
                  </span>
                )}

                {/* МОБАЙЛ дээр л — sidebar-ийг нээх/хаах. Зөвхөн төрөл сонгосон үед */}
                {filters.propertyType && (
                <button
                  type="button"
                  onClick={() => setFiltersOpen((v) => !v)}
                  aria-expanded={filtersOpen}
                  aria-controls="advanced-filters"
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 lg:hidden ${
                    filtersOpen || activeFilterCount > 0
                      ? 'border-primary bg-primary-light text-primary shadow-chip'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-primary/60 hover:text-primary'
                  }`}
                >
                  ⚙️ Шүүлт
                  {activeFilterCount > 0 && (
                    <span className="grid h-4 min-w-[16px] place-items-center rounded-full bg-primary px-1 text-[11px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                  <span aria-hidden="true" className={`text-[10px] transition-transform duration-200 ${filtersOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                )}

                {/* Харах горим — `.segmented` */}
                <div className="segmented" role="group" aria-label="Харах горим">
            <button
              type="button"
              aria-pressed={view === 'list'}
              className={`segmented-item ${view === 'list' ? 'segmented-item-active' : ''}`}
              onClick={() => setView('list')}
            >
              ☰ Жагсаалт
            </button>
            <button
              type="button"
              aria-pressed={view === 'map'}
              className={`segmented-item ${view === 'map' ? 'segmented-item-active' : ''}`}
              onClick={() => setView('map')}
            >
              🗺 Газрын зураг
            </button>
                </div>
              </div>
            </div>

            {/* ===== ӨРӨӨНИЙ ТООТОЙ МӨР (unegui.mn загвар) =====
                ⚠️ unegui.mn нь «1 өрөө 1,088 · 2 өрөө 6,509 …» гэж ТООТОЙ линк
                   хэлбэрээр харуулдаг. Тоо нь тухайн ангиллын НИЙТ тоо
                   (`fetchRoomCounts` — зөвхөн категори + төрлийг харгалзана)
                   тул «аль өрөө хэдэн зартай вэ» гэдгээ нэг харцаар мэднэ.
                ⚠️ `showRooms` — «Худалдаа, үйлчилгээний талбай» / Оффис /
                   Газар / Үйлдвэр зэрэг төрөлд өрөө гэсэн ойлголт БАЙХГҮЙ
                   тул мөр бүрэн харагдахгүй. */}
            {showRooms && (
              <div className="mb-3 flex flex-wrap items-baseline gap-x-5 gap-y-2">
                {ROOM_OPTIONS.map((r) => {
                  const on = filters.rooms === r.value;
                  const c = roomCounts[r.value];
                  return (
                    <button
                      key={r.value}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setF('rooms', on ? '' : r.value)}
                      className={`inline-flex items-baseline gap-1.5 text-[15px] transition ${
                        on ? 'font-bold text-primary underline' : 'font-medium text-primary hover:underline'
                      }`}
                    >
                      {r.label}
                      {typeof c === 'number' && (
                        <span className={`text-[13px] ${on ? 'font-semibold text-primary' : 'font-normal text-gray-500'}`}>
                          {formatCount(c)}
                        </span>
                      )}
                    </button>
                  );
                })}
                {filters.rooms && (
                  <button
                    type="button"
                    onClick={() => setF('rooms', '')}
                    className="text-[12px] font-semibold text-gray-500 hover:underline"
                  >
                    ✕ Цуцлах
                  </button>
                )}
              </div>
            )}

            {/* Идэвхтэй хайлтууд — «чип» хэлбэрээр (✕ дарж ТУС ТУСАД нь арилгана). */}
            {activeFilterChips.length > 0 && (
          <div className="mb-5 flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 text-[12px] font-semibold uppercase tracking-wide text-gray-400">Хайлт</span>
            {activeFilterChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white py-1 pl-2.5 pr-1 text-[12px] font-medium text-gray-700"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={() => removeFilterChip(chip.key)}
                  aria-label={`${chip.label} хайлтыг хасах`}
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
            <p className="text-gray-500">Хайлтаа өөрчилж үзнэ үү. {query && `«${query}»`} {getCategoryLabel(category)}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {listings.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
        )}

          </div>
        </div>
      </div>
    </>
  );
}
