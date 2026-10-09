// ============================================================
// savedSearch.mjs — «🔖 ХАДГАЛСАН ХАЙЛТ»-ын ЦЭВЭР логик
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-06, жишиг сайтын жишээ зурагтай):
//   «жишиг сайт шиг хайлтаа гоё хадгалдаг болъё» → хэрэглэгч хайлтын
//   шүүлтээ (категори + байршил) хадгалаад, дараа нь нэг дарахад буцаж
//   тэр үр дүнгээ харна ✓ (жишиг сайтын «Таалагдсан хайлтууд»).
//
// ЯАГААД ТУСДАА МОДУЛЬ ВЭ (roomFilter/districtFilter-ийн ЯГ ИЖИЛ зарчим):
//   `scripts/test-saved-searches.mjs` нь Node-оор ШУУД ачаалж тестлэнэ —
//   React/DB/window хөндөхгүй, зөвхөн ДҮРЭМ (URL → шошго, key, хадгалах
//   эсэх) л шалгагдана ✓
//
// ⚠️ ХАДГАЛАХ УТГА нь ХАЙЛТЫН URL (`/?category=sell&section=real-estate&…`)
//    — энэ нь аль хэдийн `components/HomeClient.jsx`-ийн эффектээр бичигддэг
//    КАНОНИК линк (хуваалцах боломжтой ✓). Тиймээс нэмэлт DB/URL бүтэц
//    шаардлагагүй — зөвхөн тэр линкийг хадгална.
//
// ⚠️ НЭГ ЭХ СУРВАЛЖ: UI (`components/HomeClient.jsx` → «Хайлтыг хадгалах» товч),
//    /favorites хуудас (`components/SavedSearchesClient.jsx`) ба тест БҮГД
//    энэ модулийг дуудна — шошго/түлхүүр нэг газар бичигдэнэ ✓
// ============================================================
import {
  findSubtypeGroup, formatRoomsLabel, getPropertyTypePathLabel, getSection,
} from './locationData.js';
import { parseDistrictList } from './districtFilter.mjs';
import { isRoomsEmpty, parseRoomList } from './roomFilter.mjs';

// ---- ТОГТМОЛУУД ----------------------------------------------------------
/** localStorage-ийн түлхүүр (`lib/favorites.js`-ийн хэв маяг) */
export const SAVED_SEARCHES_KEY = 'zarmn_saved_searches_v1';
/** Нэг хуудасны бүх компонентыг мэдэгдэх event нэр */
export const SAVED_SEARCH_EVENT = 'zarmn:saved-searches-changed';
/** Хадгалах дээд тоо (localStorage/DB-г хэтрүүлэхээс сэргийлнэ) */
export const SAVED_SEARCH_LIMIT = 100;
/** URL-ийн дээд урт (`saved_searches.url` CHECK-тэй ИЖИЛ — 0031) */
export const SAVED_SEARCH_URL_MAX = 2000;
/** Карт/мөрөнд харуулах гарчгийн дээд урт (хэт урт шүүлт таслана) */
export const SAVED_SEARCH_TITLE_MAX = 140;

/**
 * «Хайлт БИШ» (зөвхөн харагдацын) параметрүүд — эдгээр нь өөрчлөгдөхөд
 * хадгалсан хайлт ДАВХАРДАХГҮЙ (ж: ижил шүүлтээр 3-р хуудас руу орсон ч
 * нэг л хадгалсан хайлт байна ✓)
 *   • `page` — хуудаслалт   • `view` — жагсаалт/зураг   • `sort` — эрэмбэлэлт
 */
const PRESENTATION_PARAMS = new Set(['page', 'view', 'sort']);

// ---- URL-ийн түвшин ------------------------------------------------------

/** Хадгалах линк `'/?a=b'` / `'a=b'` / бүтэн URL — аль ч хэлбэрийг хүлээнэ */
export function savedSearchQueryString(url) {
  const raw = String(url == null ? '' : url).trim();
  if (!raw) return '';
  // ⚠️ `URL`-ийг ЗӨВХӨН бүтэн линк (`scheme://…`) дээр ашиглана — эс бөгөөс
  //    `'/?'` гэсэн харьцангуй линк дээр throw хийнэ ✗
  const qIndex = raw.indexOf('?');
  if (qIndex >= 0) return raw.slice(qIndex + 1);
  // `'a=b'` (query-only) — тэр ч query
  if (!raw.startsWith('/') && raw.includes('=')) return raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      return new URL(raw).search.replace(/^\?/, '');
    } catch (e) {
      return '';
    }
  }
  return '';
}

/** URL → URLSearchParams (алдаа гарвал хоосон) */
export function savedSearchParams(url) {
  try {
    return new URLSearchParams(savedSearchQueryString(url));
  } catch (e) {
    return new URLSearchParams();
  }
}

/**
 * URL → хайлтын төлөв (шошго угсрахад хэрэгтэй хэсэг).
 * ⚠️ Утгууд нь `components/HomeClient.jsx`-ийн URL-аас уншихтай ЯГ ИЖИЛ
 *    нэрээр (`category`/`section`/`type`/`rooms`/`district`/`khoroo`/`city`/`q`).
 */
export function savedSearchState(url) {
  const sp = savedSearchParams(url);
  return {
    category: sp.get('category') || 'all',
    section: sp.get('section') || 'all',
    type: sp.get('type') || '',
    rooms: parseRoomList(sp.get('rooms') || ''),
    districts: parseDistrictList(sp.get('district') || ''),
    khoroos: (sp.get('khoroo') || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    city: sp.get('city') || '',
    query: sp.get('q') || '',
  };
}

/** Дараалсан ижил утгыг арилгана (ж: авто хэсэгт «Автомашин — Автомашин») */
function dedupeConsecutive(list) {
  const out = [];
  (list || []).forEach((v) => {
    const s = String(v == null ? '' : v).trim();
    if (s && s !== out[out.length - 1]) out.push(s);
  });
  return out;
}

/**
 * Категорийн зам — `lib/breadcrumb.js → buildHomeBreadcrumb`-ийн 2 дахь
 * түвшнээс хойшхи мөрүүдтэй ЯГ ИЖИЛ дүрэм (нэг хэлбэрээр харуулна):
 *   `Үл хөдлөх — Үл хөдлөх зарна — Орон сууц зарна — 3 өрөө`
 * ⚠️ `lib/breadcrumb.js` нь `./locationData` (extension-гүй) import-той тул
 *    Node-оос ШУУД ачаалагдахгүй ⇒ дүрмийг энд толь бичнэ (тестээр түгжинэ).
 */
export function savedSearchCategoryPath(state) {
  const { section, category, type, rooms } = state || {};
  if (!section || section === 'all') return '';
  const sec = getSection(section);
  const isRE = section === 'real-estate';
  const parts = [isRE ? 'Үл хөдлөх' : sec.label];
  if (category === 'sell' || category === 'rent') {
    parts.push(
      isRE
        ? (category === 'rent' ? 'Үл хөдлөх түрээслүүлнэ' : 'Үл хөдлөх зарна')
        : (category === 'rent' ? `${sec.label} түрээслүүлнэ` : sec.label)
    );
  }
  const group = type ? findSubtypeGroup(section, type) : null;
  if (group) parts.push(group.label);
  if (type) parts.push(getPropertyTypePathLabel(type, category));
  if (!isRoomsEmpty(rooms)) parts.push(formatRoomsLabel(rooms));
  return dedupeConsecutive(parts).join(' — ');
}

/** Байршлын мөр — «Улаанбаатар, Баянгол, 1-р хороо» (байхгүй бол '') */
export function savedSearchLocationLine(state) {
  const s = state || {};
  return dedupeConsecutive([s.city, ...(s.districts || []), ...(s.khoroos || [])]).join(', ');
}

/**
 * URL → карт/мөрөнд харуулах тодорхойлолт: `{ category, location, title }`
 * `title` нь ««хайлт» · Категори · Байршил» нэгтгэсэн нэг мөр (toast, tooltip).
 */
export function savedSearchDescriptor(url) {
  const state = savedSearchState(url);
  const category = savedSearchCategoryPath(state);
  const location = savedSearchLocationLine(state);
  const query = state.query ? `«${state.query}»` : '';
  let title = dedupeConsecutive([query, category, location]).join(' · ') || 'Бүх зар';
  if (title.length > SAVED_SEARCH_TITLE_MAX) {
    title = `${title.slice(0, SAVED_SEARCH_TITLE_MAX - 1).trimEnd()}…`;
  }
  return { category, location, title };
}

/**
 * ДАВХАРДАЛ шалгах түлхүүр — `page`/`view`/`sort`-ыг ХАСАЖ, параметрүүдийг
 * ҮСГИЙН дарааллаар эрэмбэлнэ (ижил шүүлт = ижил түлхүүр ✓ — параметрийн
 * дараалал URL-д өөр байсан ч давхардахгүй).
 */
export function savedSearchKey(url) {
  const sp = savedSearchParams(url);
  const pairs = [];
  sp.forEach((value, key) => {
    if (PRESENTATION_PARAMS.has(key)) return;
    pairs.push([key, value]);
  });
  pairs.sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  return pairs.map(([k, v]) => `${k}=${v}`).join('&');
}

/**
 * Хадгалах утгатай эсэх — «Бүх зар» (ямар ч шүүлт/хайлтгүй, зөвхөн `page`/
 * `view`/`sort`) үед `false` ⇒ товч идэвхгүй (хоосон хайлт хадгалах нь
 * утгагүй ✗).
 */
export function isSaveableSearch(url) {
  return savedSearchKey(url).length > 0;
}

/** Хадгалах линк — trim хийж, дээд уртаар таслана (DB CHECK-тэй ИЖИЛ) */
export function normalizeSavedSearchUrl(url) {
  const raw = String(url == null ? '' : url).trim();
  if (!raw) return '';
  return raw.length > SAVED_SEARCH_URL_MAX ? raw.slice(0, SAVED_SEARCH_URL_MAX) : raw;
}

// ---- ХАДГАЛСАН ЖАГСААЛТЫН түвшин (localStorage/DB) ----------------------

/** localStorage/DB-ээс ирсэн мөрийг НЭГ хэлбэрт оруулна → `{ id, url, createdAt }` */
export function normalizeSavedSearchRow(row) {
  if (!row || typeof row !== 'object') return null;
  const url = normalizeSavedSearchUrl(row.url);
  if (!url) return null;
  const id = row.id == null ? '' : String(row.id);
  const createdAt = row.createdAt || row.created_at || row.savedAt || '';
  return { id, url, createdAt: String(createdAt || '') };
}

/** localStorage-аас уншсан «түүхий» утгыг массив болгоно (эвдэрхий хог → []) */
export function parseSavedSearchList(raw) {
  if (!raw) return [];
  let arr = raw;
  if (typeof raw === 'string') {
    try {
      arr = JSON.parse(raw);
    } catch (e) {
      return [];
    }
  }
  if (!Array.isArray(arr)) return [];
  const out = [];
  const seen = new Set();
  arr.forEach((row) => {
    const norm = normalizeSavedSearchRow(row);
    if (!norm) return;
    const key = savedSearchKey(norm.url);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(norm);
  });
  return out.slice(0, SAVED_SEARCH_LIMIT);
}

/** Жагсаалтыг localStorage-д бичих JSON мөр */
export function serializeSavedSearchList(list) {
  return JSON.stringify(Array.isArray(list) ? list : []);
}

/** Шинэ хадгалалтын id (localStorage горимд) — DB бол `gen_random_uuid()` */
export function newSavedSearchId() {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `s${Date.now().toString(36)}${rnd}`;
}
