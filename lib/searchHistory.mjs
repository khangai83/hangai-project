// ============================================================
// searchHistory.mjs — «🕐 ХАЙЛТЫН ТҮҮХ» (сүүлийн хайлтууд)-ын ЦЭВЭР логик
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-07): «Мессеж icon-ий дараа цагийн icon
//   оруулаад, тэр рүү орход тухайн хэрэглэгчийн хайлтуудыг КАРТ хэлбэрээр
//   харуул — карт дээр категорийн СҮҮЛИЙН нэр (ж: Цахилгаан бараа →
//   «Угаалгын машин»), байршил, хайсан түлхүүр үг гэх мэтийг оруул» ✓
//
// ✨ ЯЛГАА «🔖 Таалагдсан хайлт»-аас:
//   • 🔖 = хэрэглэгч ГАРААР хадгална (`saved_searches`, 0031) — цөөн, зориуд
//   • 🕐 = хэрэглэгч хайх БҮРД АВТОМАТААР бүртгэгдэнэ (`search_history`, 0032)
//     — олон, санамсаргүй. Иймд дээд тоо (60) + давхардлыг нэгтгэж
//     «хамгийн сүүлд хайснаар» эрэмбэлнэ ✓ (Chrome-ийн түүхтэй ижил зарчим)
//
// ⚠️ ХАДГАЛАХ УТГА нь ХАЙЛТЫН URL (`/?category=sell&section=…`) — энэ нь
//    `components/HomeClient.jsx`-ийн эффектээр бичигддэг КАНОНИК линк ✓
//    Тиймээс нэмэлт бүтэц ЗОХИОХГҮЙ — зөвхөн тэр линкийг хадгална.
//
// ⚠️ НЭГ ЭХ СУРВАЛЖ: URL задлах/шошго бодох/давхардлын түлхүүр нь
//    `lib/savedSearch.mjs`-д аль хэдийн бий тул ДАХИН БИЧИХГҮЙ — энд зөвхөн
//    хайлтын түүхэд хамаарах ДҮРЭМ (бүртгэх, дээд тоо, категорийн leaf,
//    харьцангуй цаг) л бичнэ ✓
//
// ЯАГААД ТУСДАА МОДУЛЬ ВЭ: `scripts/test-search-history.mjs` нь Node-оор
//   ШУУД ачаалж тестлэнэ — React/DB/window хөндөхгүй, зөвхөн ДҮРЭМ л
//   шалгагдана ✓ (savedSearch.mjs-ийн ЯГ ИЖИЛ зарчим)
// ============================================================
import {
  SAVED_SEARCH_URL_MAX, isSaveableSearch, normalizeSavedSearchUrl,
  savedSearchCategoryPath, savedSearchDescriptor, savedSearchKey,
  savedSearchLocationLine, savedSearchParams, savedSearchState,
} from './savedSearch.mjs';

// ---- ТОГТМОЛУУД ----------------------------------------------------------
/** localStorage-ийн түлхүүр (`lib/favorites.js`-ийн хэв маяг) */
export const SEARCH_HISTORY_KEY = 'zarmn_search_history_v1';
/** Нэг хуудасны бүх компонентыг мэдэгдэх event нэр */
export const SEARCH_HISTORY_EVENT = 'zarmn:search-history-changed';
/** Хайлтын түүхийн дээд тоо (хадгалснаас (100) БАГА — түүх нь олон болдог) */
export const SEARCH_HISTORY_LIMIT = 60;
/** URL-ийн дээд урт (DB CHECK-тэй ИЖИЛ — `savedSearch`-ийнхтэй ижил) */
export const SEARCH_HISTORY_URL_MAX = SAVED_SEARCH_URL_MAX;

// ---- Түвшин: URL → картын мэдээлэл --------------------------------------

/** «Хайлт» түлхүүр (давхардал шалгах) — `savedSearchKey`-ийн alias */
export function historyKey(url) {
  return savedSearchKey(url);
}

/** Түүхэд бүртгэх УТГА байгаа эсэх (зөвхөн «Бүх зар» бол false) */
export function isHistoryUrl(url) {
  return isSaveableSearch(url);
}

/**
 * Категорийн СҮҮЛИЙН нэр — картын ГОЛ шошго.
 *   «Цахилгаан бараа — Угаалгын машин» → «Угаалгын машин»
 * ⚠️ Өрөөний мөр (`3 өрөө`) нь категори БИШ тул ХАСАЖ бодно — эс бөгөөд
 *    «... Орон сууц зарна — 3 өрөө» дээр leaf нь «3 өрөө» болж, хэрэглэгчийн
 *    хүссэн «категорийн нэр» алдагдана ✗
 */
export function historyCategoryLeaf(state) {
  const path = savedSearchCategoryPath({ ...(state || {}), rooms: [] });
  if (!path) return '';
  const parts = path.split(' — ');
  return parts[parts.length - 1] || '';
}

/**
 * URL → картанд харуулах тодорхойлолт.
 * @returns {{
 *   leaf: string, category: string, location: string, keyword: string,
 *   rooms: string[], minPrice: string, maxPrice: string, title: string,
 * }}
 */
export function historyDescriptor(url) {
  const state = savedSearchState(url);
  const sp = savedSearchParams(url);
  const category = savedSearchCategoryPath(state);
  return {
    leaf: historyCategoryLeaf(state),
    category,
    location: savedSearchLocationLine(state),
    keyword: state.query || '',
    rooms: state.rooms || [],
    minPrice: sp.get('minPrice') || '',
    maxPrice: sp.get('maxPrice') || '',
    title: savedSearchDescriptor(url).title,
  };
}

/**
 * Харьцангуй цаг — «Саяхан · 5 минутын өмнө · 2 цагийн өмнө · Өчигдөр ·
 * 3 өдрийн өмнө · 2026.10.01» (Монгол хэлээр).
 * ⚠️ ЦЭВЭР функц (`now`-ыг гаднаас өгнө) → тестэд тогтвортой ✓
 */
export function historyTimeAgo(iso, now) {
  const t = Date.parse(iso || '');
  if (!t) return '';
  const base = now == null ? Date.now() : (typeof now === 'number' ? now : Date.parse(now));
  let diff = Math.floor((base - t) / 1000);
  if (diff < 0) diff = 0;
  if (diff < 60) return 'Саяхан';
  const m = Math.floor(diff / 60);
  if (m < 60) return `${m} минутын өмнө`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} цагийн өмнө`;
  const d = Math.floor(h / 24);
  if (d === 1) return 'Өчигдөр';
  if (d < 7) return `${d} өдрийн өмнө`;
  const date = new Date(t);
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}.${p(date.getMonth() + 1)}.${p(date.getDate())}`;
}

// ---- Бүртгэх (цэвэр) -----------------------------------------------------

/** Шинэ түүхийн id (localStorage горимд) — DB бол `gen_random_uuid()` */
export function newHistoryId() {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `h${Date.now().toString(36)}${rnd}`;
}

/**
 * Хайлтыг түүхэнд БҮРТГЭХ (цэвэр функц — өгөгдсөн массивыг ӨӨРЧЛӨХГҮЙ).
 *   ① «Бүх зар» (утгагүй) → `{ ok:false }`
 *   ② Ижил хайлт аль хэдийн байвал → хуучин мөрийг ХАСАЖ, шинэ цагтай нь
 *      ЭХЭНД тавина (давхардахгүй, «хамгийн сүүлд хайсан» нь эхэнд ✓)
 *   ③ Дээд тоо (`SEARCH_HISTORY_LIMIT`) хүндэтгэнэ
 * @returns {{ list: Array, entry: object|null, ok: boolean }}
 */
export function recordHistory(list, url, now) {
  const prev = Array.isArray(list) ? list : [];
  const clean = normalizeSavedSearchUrl(url);
  const key = savedSearchKey(clean);
  if (!key) return { list: prev, entry: null, ok: false };
  const existing = prev.find((it) => savedSearchKey(it.url) === key);
  const entry = {
    id: (existing && existing.id) || newHistoryId(),
    url: clean,
    createdAt: now || new Date().toISOString(),
  };
  const kept = prev.filter((it) => savedSearchKey(it.url) !== key);
  return { list: [entry, ...kept].slice(0, SEARCH_HISTORY_LIMIT), entry, ok: true };
}

// ---- Жагсаалтын түвшин (localStorage/DB) --------------------------------

/** localStorage/DB-ээс ирсэн мөрийг НЭГ хэлбэрт оруулна → `{ id, url, createdAt }` */
export function normalizeHistoryRow(row) {
  if (!row || typeof row !== 'object') return null;
  const url = normalizeSavedSearchUrl(row.url);
  if (!url) return null;
  const id = row.id == null ? '' : String(row.id);
  // ⚠️ DB нь `last_seen_at` (сүүлд хайсан цаг), localStorage нь `createdAt`
  const createdAt = row.createdAt || row.last_seen_at || row.lastSeenAt || row.created_at || '';
  return { id, url, createdAt: String(createdAt || '') };
}

/** localStorage-аас уншсан «түүхий» утгыг массив болгоно (эвдэрхий хог → []) */
export function parseHistoryList(raw, limit = SEARCH_HISTORY_LIMIT) {
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
    const norm = normalizeHistoryRow(row);
    if (!norm) return;
    const key = savedSearchKey(norm.url);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(norm);
  });
  return out.slice(0, limit);
}

/** Жагсаалтыг localStorage-д бичих JSON мөр */
export function serializeHistoryList(list) {
  return JSON.stringify(Array.isArray(list) ? list : []);
}

