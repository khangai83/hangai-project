'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import ListingCard from './ListingCard';
import MapView from './MapView';
import { useToast, useUI } from './AppProviders';
import {
  fetchListings, fetchPropertyTypeCounts, fetchRoomCounts, fetchProfilesByIds,
} from '../lib/queries';
import { normalizeError } from '../lib/errors';
import {
  CITIES, getDistricts, getKhoroos, ROOM_OPTIONS, formatRoomsLabel,
  hasRoomsFields, SECTIONS, getSection, getSubtypes, getSectionCategories,
  hasCategoryChoice, getAttrFilters, getAttrField, formatAttrsLine,
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
  propertyType: '', rooms: '', city: '', district: '', khoroos: [], attrs: {},
  minPrice: '', maxPrice: '', minArea: '', maxArea: '',
};

/** Массив талбаруудыг ХУВААЛЦАХГҮЙ шинэ хоосон хайлт буцаана */
const emptyFilters = () => ({ ...EMPTY_FILTERS, khoroos: [], attrs: {} });

/**
 * Шүүлт «хоосон» эсэх.
 * ⚠️ `attrs` нь ОБЪЕКТ тул `!!{}` нь `true` — тусдаа шалгана, эс бөгөөс
 *    «Хайлтыг цэвэрлэх» товч үргэлж харагдана.
 */
const isFilterValueEmpty = (v) => {
  if (Array.isArray(v)) return v.length === 0;
  if (v && typeof v === 'object') return Object.keys(v).length === 0;
  return !v;
};

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
  // ---- ХЭСЭГ (0016_listing_sections.sql) ----
  // ⚠️ `'all'` = хэсэг СОНГООГҮЙ (БҮХ ХЭСГИЙН зар) — үндсэн дэлгэцийн анхдагч.
  //    Үл хөдлөх нь АНХДАГЧААР сонгогдохгүй (хэрэглэгчийн хүсэлт).
  const [section, setSection] = useState('all');
  // ⚠️ DRILL-DOWN: `false` → БҮХ хэсэг tile хэлбэрээр;
  //    `true` → зөвхөн тухайн хэсгийн ДОТООД (дэд төрөл) багана болж харагдана.
  const [sectionOpen, setSectionOpen] = useState(false);
  // ⚠️ ЭНД, бүх `useEffect`-ийн ӨМНӨ: эффектүүдийн deps массив РЕНДЕРИЙН ҮЕД
  //    үнэлэгддэг тул хойш зарлавал TDZ алдаа гарна.
  const noSection = section === 'all';
  const [authors, setAuthors] = useState({}); // { [user_id]: { displayName, avatarUrl } }

  // ---- URL-ийн query-ээс хайлтыг унших ----
  // breadcrumb болон хуваалцсан линк ажиллахын тулд:
  //   /?category=sell&type=Орон сууц&rooms=3
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);

    // ---- ХЭСЭГ (0016) — `?section=auto` ----
    // ⚠️ ЭХЛЭЭД уншина: «Зарах / Түрээслэх» нь зөвхөн үл хөдлөхөд байдаг.
    const secRaw = sp.get('section');
    const secParam = secRaw && SECTIONS.some((s) => s.value === secRaw) ? secRaw : 'all';
    if (secParam !== 'all') setSection(secParam);
    // ⚠️ DRILL-DOWN: URL-д `section` БАЙВАЛ шууд тэр хэсэг рүү нээгдэнэ
    if (secRaw) setSectionOpen(true);

    // ⚠️ ЗӨВХӨН үл хөдлөхөд `category` уншина (бусад хэсэгт ийм сонголт байхгүй)
    if (secParam === 'real-estate') {
      const cat = sp.get('category');
      if (cat === 'sell' || cat === 'rent' || cat === 'all') setCategory(cat);
    }

    const q = sp.get('q') || sp.get('search') || '';
    if (q) { setSearch(q); setQuery(q); }
    if (sp.get('view') === 'map') setView('map');

    const next = emptyFilters(); // массив хуваалцахгүй
    if (sp.get('type')) next.propertyType = sp.get('type');
    if (sp.get('rooms')) next.rooms = sp.get('rooms');
    // ⚠️ «Өрөө» талбаргүй төрөлд (ж: Худалдаа, үйлчилгээний талбай) өрөөний
    //    хайлт нь утгагүй тул хуучин линкээс ирсэн ч орхигдуулна.
    if (next.propertyType && !hasRoomsFields(next.propertyType)) next.rooms = '';
    // ⚠️ Тухайн ХЭСЭГТ тохирохгүй дэд төрлийг орхино (ж: авто хэсэгт «Орон сууц»)
    if (next.propertyType && !getSubtypes(secParam).includes(next.propertyType)) {
      next.propertyType = '';
      next.rooms = '';
    }
    // ---- ATTR шүүлтүүд — `?attr_brand=Toyota&attr_fuel=Хайбрид` ----
    const attrs = {};
    sp.forEach((value, key) => {
      if (key.startsWith('attr_') && value) attrs[key.slice(5)] = value;
    });
    if (Object.keys(attrs).length) next.attrs = attrs;
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
    if (Object.entries(next).some(([, v]) => !isFilterValueEmpty(v))) setFilters(next);

    setUrlReady(true);
  }, []);

  const load = useCallback(async () => {
    setListings(null);
    setLoadError(null);
    try {
      const data = await fetchListings({
        category,
        section,
        attrs: Object.keys(filters.attrs || {}).length ? filters.attrs : undefined,
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
  }, [category, section, query, filters, dataVersion]);

  useEffect(() => { if (urlReady) load(); }, [load, urlReady]);

  // ---- 👤 ЗАР НИЙТЛЭГЧДИЙН ХОЧ НЭР + ЗУРАГ ----
  // ⚠️ `listings.user_id` нь `profiles` руу FK-ГҮЙ тул PostgREST join
  //    ажиллахгүй → 2 дахь query (`fetchProfilesByIds`) хийж нэгтгэнэ.
  useEffect(() => {
    if (!listings || !listings.length) { setAuthors({}); return; }
    let mounted = true;
    (async () => {
      try {
        const map = await fetchProfilesByIds(listings.map((l) => l.user_id));
        if (mounted) setAuthors(map || {});
      } catch (err) {
        console.warn(normalizeError(err));
        if (mounted) setAuthors({});
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listings]);

  // ---- Дэд төрөл тус бүрийн зарын тоо (сонгосон ХЭСЭГ + категорид) ----
  useEffect(() => {
    if (!urlReady) return;
    // ⚠️ Хэсэг сонгоогүй бол дэд төрөл БАЙХГҮЙ → query явуулахгүй
    if (noSection) { setTypeCounts({}); return; }
    let mounted = true;
    (async () => {
      try {
        const counts = await fetchPropertyTypeCounts(category, section);
        if (mounted) setTypeCounts(counts || {});
      } catch (err) {
        // Тоо харуулахгүй — үндсэн жагсаалтад нөлөөлөхгүй
        console.warn(normalizeError(err));
        if (mounted) setTypeCounts({});
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlReady, category, section, noSection, dataVersion]);

  // ---- Өрөө тус бүрийн зарын тоо (unegui.mn загварын «1 өрөө 1,088» мөр) ----
  // ⚠️ Зөвхөн КАТЕГОРИ + ТӨРӨЛ өөрчлөгдөхөд дахин татна — бусад шүүлт
  //    (үнэ, байршил г.м.) нөлөөлөхгүй (`lib/queries.js` → `fetchRoomCounts`).
  useEffect(() => {
    if (!urlReady) return;
    // ⚠️ «Өрөө» тоо нь ЗӨВХӨН үл хөдлөхөд (0016) — бусад хэсэгт өрөө гэж байхгүй
    if (section !== 'real-estate' || !hasRoomsFields(filters.propertyType)) {
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
  }, [urlReady, category, section, filters.propertyType, dataVersion]);

  // ---- Хайлт өөрчлөгдөхөд URL-ийг шинэчлэх (хуваалцах боломжтой болгох) ----
  useEffect(() => {
    if (!urlReady) return;
    const params = new URLSearchParams();
    if (category && category !== 'all') params.set('category', category);
    if (query) params.set('q', query);
    // ⚠️ Хэсэг (0016) — `'all'` (сонгоогүй) нь URL-д БИЧИГДЭХГҮЙ (цэвэр линк)
    if (section && section !== 'all') params.set('section', section);
    if (filters.propertyType) params.set('type', filters.propertyType);
    if (filters.rooms) params.set('rooms', filters.rooms);
    // ⚠️ ATTR шүүлтүүд — `attr_brand=Toyota` (jsonb)
    Object.entries(filters.attrs || {}).forEach(([k, v]) => {
      if (v) params.set(`attr_${k}`, v);
    });
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
  }, [urlReady, category, section, query, filters, view, router]);

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
    // ⚠️ ХЭСЭГ ба drill-down-ыг ч сэргээнэ — эс бөгөөс «Бүх зар» дарсан ч
    //    тухайн хэсгийн (ж: Автомашин) зарууд хэвээр үлддэг байв (АЛДАА).
    setSection('all');
    setSectionOpen(false);
    setFilters(emptyFilters()); // массив хуваалцахгүй
  };

  /** «← Бүх хэсэг» — хэсгийн сонголтыг БҮРЭН арилгаж, БҮХ ЗАР руу буцаана.
   *  ⚠️ Зөвхөн панелийг хаадаг байсан нь алдаа байв: хэсэг хэвээр үлдэж,
   *     буцах боломжгүй мэт санагддаг байсан. Байршил/үнэ хэвээр. */
  const backToAllSections = () => {
    setSection('all');
    setSectionOpen(false);
    setCategory('all');
    setFilters((f) => ({ ...f, propertyType: '', rooms: '', attrs: {} }));
  };

  /**
   * ХЭСЭГ солих (0016) — дэд төрөл/attr/өрөө бүгд ХҮЧИНГҮЙ болно.
   * ⚠️ DRILL-DOWN: хэсэг дээр дарах нь түүнийг НЭЭНЭ (`sectionOpen = true`) —
   *    бусад хэсэг алга болж, дотрох дэд төрлүүд багана болж харагдана.
   * ⚠️ Аль хэдийн сонгогдсон хэсэг дээр дарахад ч НЭЭНЭ.
   */
  const changeSection = (nextSection, { open = true } = {}) => {
    if (nextSection !== section) {
      setSection(nextSection);
      // ⚠️ «Зарах / Түрээслэх» нь ЗӨВХӨН үл хөдлөхөд
      setCategory((c) => (hasCategoryChoice(nextSection) && c !== 'all' ? c : 'all'));
      setFilters((f) => ({ ...f, propertyType: '', rooms: '', attrs: {} }));
      setFiltersOpen(false);
    }
    if (open) setSectionOpen(true);
  };

  /** ATTR шүүлт (jsonb) — утга тавих / хоослох (`delete` тул URL/DB цэвэр) */
  const setAttr = (key, value) => {
    setFilters((f) => {
      const attrs = { ...(f.attrs || {}) };
      if (value) attrs[key] = value;
      else delete attrs[key];
      return { ...f, attrs };
    });
  };

  /** Хэсгийн attr шүүлтийн одоогийн утга */
  const attrValue = (key) => (filters.attrs || {})[key] || '';

  /** Breadcrumb-ийн линк дээр дарахад тухайн түвшин рүү буцаана.
   *  ⚠️ `<Link>`-ээр ЯВАХГҮЙ: бүх линк нь `/` зам дээр байдаг тул Next.js
   *     компонентийг ДАХИН MOUNT хийдэггүй → `useEffect([])` нь URL-ийг дахин
   *     уншихгүй, шүүлт ХУУЧНААРАА үлдэнэ. Тиймээс төлөвийг ШУУД өөрчилнө
   *     (URL-ийг доорх эффект өөрөө бичнэ). */
  const goToCrumb = (item) => {
    const nav = item?.nav;
    if (!nav) return;
    if (nav.reset) { resetAll(); return; }
    // ⚠️ ХЭСЭГ (0016) — breadcrumb-ийн «Үл хөдлөх» / «Автомашин» линк.
    //    ⚠️ `nav.section` байхгүй бол хэсэг ХӨНДӨГДӨХГҮЙ
    if (nav.section !== undefined) { setSection(nav.section); setSectionOpen(false); }
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
  /** ХЭСГИЙН тодорхойлолт ба уламжлагдсан утгууд (0016)
   *  ⚠️ `noSection` нь ДЭЭР (бүх hook-ийн өмнө) зарлагдсан.
   *  ⚠️ `sec`/`isRealEstate` нь `showRooms`-ООС ӨМНӨ байх ЁСТОЙ (TDZ алдаа). */
  const sec = getSection(noSection ? 'real-estate' : section);
  const isRealEstate = section === 'real-estate';

  /** «Өрөө» мөр ба тоо харагдах эсэх.
   *  ⚠️ ЗӨВХӨН үл хөдлөх хэсэгт (0016) БА төрөл «Өрөө» талбартай үед. */
  const showRooms = isRealEstate && hasRoomsFields(filters.propertyType);

  // ⚠️ Хэсэг сонгоогүй бол дэд төрөл БАЙХГҮЙ (дэмий query явуулахгүй)
  const subtypes = useMemo(
    () => (noSection ? [] : getSubtypes(section)),
    [section, noSection]
  );
  const sectionCategories = useMemo(() => getSectionCategories(section), [section]);
  const attrFilters = useMemo(() => getAttrFilters(section), [section]);
  /** «Зарах / Түрээслэх» сонголт харагдах эсэх — ⚠️ ЗӨВХӨН үл хөдлөхөд */
  const showCategories = hasCategoryChoice(section);
  /** Хэсгийн НИЙТ зарын тоо (дэд төрлүүдийн нийлбэр) — панелийн толгойд */
  const sectionTotal = useMemo(
    () => Object.values(typeCounts).reduce((sum, n) => sum + (Number(n) || 0), 0),
    [typeCounts]
  );

  /** Хуудасны гарчиг — «Бүх зар» / «Орон сууц түрээслүүлнэ 12» / «Автомашин 34» */
  const pageTitle = filters.propertyType
    ? getPropertyTypeLabel(filters.propertyType, category)
    // ⚠️ Хэсэг сонгоогүй → БҮХ ХЭСГИЙН зар
    : noSection
      ? 'Бүх зар'
      : isRealEstate
        ? (category === 'rent'
            ? 'Үл хөдлөх түрээслүүлнэ'
            : category === 'sell'
              ? 'Үл хөдлөх зарна'
              : 'Бүх зар')
        // ⚠️ Бусад хэсэг (0016): «Автомашин», «Ажлын зар», «Компьютер» …
        : (category === 'rent' ? `${sec.label} түрээслүүлнэ` : sec.label);

  const hasFilters =
    Object.entries(filters).some(([, v]) => !isFilterValueEmpty(v)) ||
    category !== 'all' ||
    section !== 'all' ||
    query;

  /** Идэвхтэй хайлтууд — статус мөрийн доор «чип» хэлбэрээр (✕ дарж тус тусад нь арилгана) */
  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.propertyType) {
      chips.push({ key: 'propertyType', label: `${getPropertyIcon(filters.propertyType, section)} ${getPropertyTypeLabel(filters.propertyType, category)}` });
    }
    // ⚠️ ATTR шүүлтүүд (0016) — ж: «🏷️ Toyota», «⛽ Хайбрид»
    Object.entries(filters.attrs || {}).forEach(([k, v]) => {
      if (!v) return;
      const field = getAttrField(section, k);
      chips.push({ key: `attr_${k}`, label: `${(field && field.icon) || '🔎'} ${v}` });
    });
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
  }, [filters, category, section]);

  const activeFilterCount = activeFilterChips.length;

  /** Нэг чипийг арилгах (`khoroos` нь массив; `attr_*` нь jsonb түлхүүр) */
  const removeFilterChip = (key) => {
    if (key.startsWith('attr_')) { setAttr(key.slice(5), ''); return; }
    setF(key, key === 'khoroos' ? [] : '');
  };

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
            section,
            propertyType: filters.propertyType,
            rooms: filters.rooms,
            district: filters.district,
          })}
          onNavigate={goToCrumb}
        />

        {/* ===== ХЭСЭГ БА ДЭД ТӨРЛИЙН НАВИГАЦИ (0016) — DRILL-DOWN =====
            ⚠️ ХОЁР ТӨЛӨВ:
              1) `sectionOpen = false` → БҮХ 6 ХЭСЭГ tile хэлбэрээр, БАГАНА болж
                 (2 → 3 → 6, дэлгэцэнд тааруулж).
              2) Хэсэг дээр дарвал → БУСАД ХЭСЭГ БҮРЭН АЛГА БОЛЖ, зөвхөн
                 ТУХАЙН ХЭСГИЙН ДОТООД (дэд төрөл) багана болж харагдана +
                 «← Бүх хэсэг» буцах товч.
            ⚠️ Дэд төрөл сонгомогц ЭНЭ ПАНЕЛЬ БҮРЭН АЛГА БОЛНО (progressive
               disclosure — хэрэглэгчийн өмнөх хүсэлт). Буцах зам нь breadcrumb.
            ⚠️ «Зарах / Түрээслэх» нь ЗӨВХӨН үл хөдлөх хэсэгт.
            ⚠️ `tile-grid` = багана хоорондын зай (app/globals.css → `.tile-grid`)
            ⚠️ EMOJI ICON: `leading-none` БИЧИХГҮЙ (мөрийн хайрцгаас ХАЛЬЖ
               гардаг) → `leading-[1.4]` хэрэглэнэ. */}
        {!filters.propertyType && (
        <section
          className={`mb-5 ${
            sectionOpen
              /* unegui.mn-ийн «SubcategoryPanel» — саарал дугуй панел */
              ? 'rounded-2xl bg-gray-100 px-3 py-4 pt-5 sm:px-8'
              /* 6 хэсгийн tile сүлжээ — цагаан карт */
              : 'rounded-xl border border-gray-200 bg-white p-2.5 shadow-card sm:p-3.5'
          }`}
        >

        {sectionOpen ? (
          <>
            {/* ══════════ unegui.mn ЗАГВАР — SubcategoryPanel ══════════
                ⚠️ БҮТЭЦ (unegui-ийн DOM-той ижил):
                   • ТОЛГОЙ: «X» категорийн бүх зарууд  N  + [← Бүх хэсэг]
                   • SEPARATOR (1px зураас)
                   • БАГАНУУД: `columns-*` — CSS multi-column нь дээшээс
                     доош дүүргэж, дараа нь ДАРААГИЙН багана руу шилжинэ
                ⚠️ Линк бүр нь: chevron (›) + текст, hover-т bg-white
                🔧 Баганын тоо: доорх `columns-1 sm:columns-2 lg:columns-4` */}

            {/* ---------- ТОЛГОЙ: «бүх зарууд» + БУЦАХ ---------- */}
            <div className="mb-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
              <button
                type="button"
                onClick={() => setSectionOpen(false)}
                title="Энэ хэсгийн БҮХ зарыг харах"
                className="flex items-center justify-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-bold text-primary transition hover:bg-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="shrink-0 opacity-40" aria-hidden="true">
                  <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                «{sec.label}» категорийн бүх зарууд
                {sectionTotal > 0 && (
                  <span className="text-[12px] font-normal text-gray-500">{formatCount(sectionTotal)}</span>
                )}
              </button>
              <button
                type="button"
                onClick={backToAllSections}
                className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1 text-[12px] font-semibold text-gray-600 transition hover:border-primary hover:text-primary"
              >
                ← Бүх хэсэг
              </button>
            </div>

            {/* ---------- SEPARATOR ---------- */}
            <div className="mb-1.5 h-px w-full bg-gray-200" />

            {/* ---------- КАТЕГОРИ (зөвхөн үл хөдлөх) ---------- */}
            {showCategories && (
              <div className="mb-2 flex flex-wrap items-center justify-center gap-1.5">
                {sectionCategories.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    className={`rounded-md px-3 py-1 text-[12px] font-semibold transition ${
                      category === c.value
                        ? 'bg-primary text-white'
                        : 'text-gray-600 hover:bg-white hover:text-primary'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}

            {/* ---------- ДЭД ТӨРӨЛ — unegui.mn шиг БАГАНА ----------
                ⚠️ unegui нь ХҮРЭЭТЭЙ TILE БИШ, энгийн ТЕКСТ ЛИНК-үүдийг
                   БАГАНА болгодог: CSS `columns-*` нь дээшээс доош дүүргэж,
                   дараа нь ДАРААГИЙН багана руу шилжинэ (unegui-тэй ижил).
                ⚠️ `break-inside-avoid` — линк баганы зааг дээр ТАСРАХГҮЙ.
                ⚠️ unegui-тэй ижил: дэд төрөл тус бүрийн ТОО ХАРАГДАХГҮЙ
                   (нийт тоо нь дээрх толгойд байна). Тоог буцаах бол
                   доорх `<span>`-ы дараа `{typeCounts[t]}` badge нэмнэ.
                🔧 Баганын тоо: `columns-1 sm:columns-2 lg:columns-4` */}
            <div className="columns-1 gap-x-6 sm:columns-2 lg:columns-4" role="tablist" aria-label="Зарын дэд төрөл">
              {subtypes.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={false}
                  onClick={() => setF('propertyType', t)}
                  className="group flex w-full break-inside-avoid items-start gap-1.5 rounded-md px-2 py-1 text-left transition hover:bg-white"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0 opacity-30" aria-hidden="true">
                    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="line-clamp-2 overflow-hidden text-[12px] font-medium text-ellipsis text-gray-700 group-hover:text-primary">
                    {getPropertyTypeLabel(t, category)}
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          /* ---------- БҮХ ХЭСЭГ — tile сүлжээ (багана) ----------
             ⚠️ 2 → 3 → 6 багана. Сонгогдсон хэсэг нь онцлогдож харагдана.
             ⚠️ `min-h-[88px]` → бүх tile ИЖИЛ өндөртэй (шошго 1-2 мөр ч). */
          <div className="tile-grid grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" role="tablist" aria-label="Зарын хэсэг">
            {SECTIONS.map((s) => {
              const on = s.value === section;
              return (
                <button
                  key={s.value}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => changeSection(s.value)}
                  className={`flex min-h-[28px] w-full flex-row items-center justify-center gap-1 rounded-lg border px-1 py-1 transition ${
                    on
                      ? 'border-primary bg-primary-light'
                      : 'border-gray-200 bg-white hover:border-primary hover:bg-primary-light'
                  }`}
                >
                  <span className="shrink-0 text-[34px] leading-[1.4]">{s.icon}</span>
                  <span className={`w-full text-left text-[14px] font-semibold leading-snug ${on ? 'text-primary' : 'text-gray-700'}`}>
                    {s.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        </section>
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
                {/* ===== ХЭСГИЙН ATTR ШҮҮЛТҮҮД (0016) =====
                    ⚠️ Хэсэг тус бүрийн `attrFilters` (зөвхөн `select` төрөл) —
                       ж: Автомашин → Брэнд, Түлш, Хурдны хайрцаг, Хөтлөгч;
                       Ажлын зар → Ажлын төрөл, Туршлага, Ажлын хэлбэр.
                    ⚠️ Утга нь `listings.attrs` (jsonb) дотор → `?attr_brand=Toyota` */}
                {attrFilters.map((f) => (
                  <SideBlock key={f.key} label={`${f.icon ? `${f.icon} ` : ''}${f.label}`}>
                    <select
                      className="form-select"
                      aria-label={f.label}
                      value={attrValue(f.key)}
                      onChange={(e) => setAttr(f.key, e.target.value)}
                    >
                      <option value="">Бүгд</option>
                      {f.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </SideBlock>
                ))}

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
                {/* ===== ТАЛБАЙ, м² =====
                    ⚠️ «Талбай» нь ЗӨВХӨН үл хөдлөх хэсэгт (0016) — автомашин/
                       ажил/компьютер/бараа/үйлчилгээнд талбай гэдэг ойлголт байхгүй. */}
                {isRealEstate && (
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
                )}
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
            <div className="mb-3 flex flex-wrap items-start justify-between gap-x-1 gap-y-1">
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
            {listings.map((l) => (
              <ListingCard
                key={l.id}
                listing={l}
                author={authors[l.user_id]}
                attrsLine={formatAttrsLine(l.section || section, l.attrs, l.category)}
              />
            ))}
          </div>
        )}

          </div>
        </div>
      </div>
    </>
  );
}
