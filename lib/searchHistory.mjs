// ============================================================
// searchHistory.mjs — «🕐 ХАЙЛТЫН ТҮҮХ» (сүүлийн ҮЗСЭН ЗАРУУД)-ын ЦЭВЭР логик
//
// ⏳ 2026-10-07 (анхны хүсэлт): «Мессеж icon-ий дараа цагийн icon оруулаад,
//   тэр рүү орход тухайн хэрэглэгчийн хайлтуудыг КАРТ хэлбэрээр харуул»
// ✏️ 2026-10-08 (68, хэрэглэгчийн хүсэлт): «хайлтын түүх дээр орж үзсэн
//   заруудыг л зөвхөн гаргадаг болгоорой, одоо хайлтыг гаргаад байгаа, энэ
//   нэрийг хэвээр үлдээ» ⇒
//   ① Бүртгэгдэх утга нь ХАЙЛТЫН URL БИШ, ЗАРЫН линк (`/listings/<id>`) —
//      `components/ListingDetailClient.jsx` зар нээх БҮРД бичнэ ✓
//   ② Хуучин хайлтын мөрүүд (`/?category=…`) түүхээс ШҮҮГДЭНЭ (харагдахгүй,
//      дараагийн бичилтээр арилна) ✓
//   ③ Хуудас/товч/хэсгийн НЭР «🕐 Хайлтын түүх» ХЭВЭЭР ✓ (хэрэглэгчийн хүсэлт)
//
// ✨ ЯЛГАА «🔖 Таалагдсан хайлт» (§4.1)-аас:
//   • 🔖 = хэрэглэгч ГАРААР хадгална (`saved_searches`, 0031) — цөөн, зориуд
//   • 🕐 = ЗАР НЭЭХ бүрд АВТОМАТААР бүртгэгдэнэ (`search_history`, 0032)
//     — олон, санамсаргүй. Иймд дээд тоо (60) + давхардлыг нэгтгэж
//     «хамгийн сүүлд үзсэнээр» эрэмбэлнэ ✓ (Chrome-ийн түүхтэй ижил зарчим)
//
// ⚠️ ХАДГАЛАХ УТГА нь ЗАРЫН КАНОНИК ЛИНК (`/listings/<uuid>`) — DB-ийн
//    0032-ын `search_history.url` баганад ЯГ тэр мөр бичигдэнэ. Хүснэгтийн
//    нэр/багана ХӨНДӨӨГДӨӨГҮЙ (нэмэлт миграц ШААРДЛАГАГҮЙ ✓) — `url`/`key`
//    нь `text`, 2000 хүртэл тэмдэгт тул зарын линк бүрэн багтана ✓
// ⚠️ Зарын ГАРЧИГ/ҮНЭ/ЗУРГИЙГ энэ модуль ХАДГАЛАХГҮЙ — карт нь `listings`
//    хүснэгтээс (`fetchListingsByIds`, зөвхөн ХАРАГДАХ үед) татагдана ⇒
//    үнэ/гарчиг засагдсан ч карт ШИНЭ утгыг харуулна, УСТСАН зар картаас
//    АВТОМАТААР хасагдана ✓ (хуулбар хадгалах нь энд илүүц/хортой ✗)
//
// ЯАГААД ТУСДАА МОДУЛЬ ВЭ: `scripts/test-search-history.mjs` нь Node-оор
//   ШУУД ачаалж тестлэнэ — React/DB/window хөндөхгүй, зөвхөн ДҮРЭМ (линк
//   задлах, бүртгэх, давхардал, дээд тоо, картын нэгтгэл) л шалгагдана ✓
// ============================================================
import { SAVED_SEARCH_URL_MAX } from './savedSearch.mjs';

// ---- ТОГТМОЛУУД ----------------------------------------------------------
/** localStorage-ийн түлхүүр (`lib/favorites.js`-ийн хэв маяг) */
export const SEARCH_HISTORY_KEY = 'zarmn_search_history_v1';
/** Нэг хуудасны бүх компонентыг мэдэгдэх event нэр */
export const SEARCH_HISTORY_EVENT = 'zarmn:search-history-changed';
/** Түүхийн дээд тоо (хадгалснаас (100) БАГА — түүх нь олон болдог) */
export const SEARCH_HISTORY_LIMIT = 60;
/** URL-ийн дээд урт (DB CHECK-тэй ИЖИЛ — `savedSearch`-ийнхтэй ижил 2000) */
export const SEARCH_HISTORY_URL_MAX = SAVED_SEARCH_URL_MAX;
/** Зарын дэлгэрэнгүй линкийн хэв — `/listings/<id>` (query/hash/сүүлийн `/` хасна) */
const LISTING_PATH_RE = /^\/listings\/([^/?#]+)$/;

// ---- Түвшин: URL → зарын id ----------------------------------------------

/**
 * `/listings/<id>` (эсвэл бүтэн линк `https://…/listings/<id>`) → зарын id.
 * ⚠️ ХАЙЛТЫН линк (`/?category=…`) эсвэл өөр хуудас → `''` (түүхэд ОРОХГҮЙ ✓)
 */
export function historyListingId(url) {
  const raw = String(url == null ? '' : url).trim();
  if (!raw) return '';
  let pathname = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      pathname = new URL(raw).pathname;
    } catch (e) {
      return '';
    }
  }
  const path = pathname.split('?')[0].split('#')[0].replace(/\/+$/, '');
  const m = path.match(LISTING_PATH_RE);
  return m ? m[1] : '';
}

/** Зарын id → түүхэд хадгалах КАНОНИК линк (`/listings/<id>`); id хоосон бол `''` */
export function listingHistoryUrl(id) {
  const clean = String(id == null ? '' : id).trim();
  return clean ? `/listings/${clean}` : '';
}

/** Түүхэд бүртгэх УТГА байгаа эсэх — ЗӨВХӨН зарын линк дээр `true` ✓ */
export function isHistoryUrl(url) {
  return !!historyListingId(url);
}

/** Давхардлын түлхүүр — зарын линк (`/listings/<id>`); зарын линк биш бол `''` */
export function historyKey(url) {
  const id = historyListingId(url);
  return id ? listingHistoryUrl(id) : '';
}

/** Линк — trim хийж, дээд уртаар таслана (DB CHECK-тэй ИЖИЛ) */
export function normalizeHistoryUrl(url) {
  const raw = String(url == null ? '' : url).trim();
  if (!raw) return '';
  return raw.length > SEARCH_HISTORY_URL_MAX ? raw.slice(0, SEARCH_HISTORY_URL_MAX) : raw;
}


// ---- Харьцангуй цаг -------------------------------------------------------

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

// ---- Картын нэгтгэл (түүх + зарын мэдээлэл) ------------------------------

/**
 * 🃏 Түүхийн мөрүүдийг `listings`-ийн БОДИТ мэдээлэлтэй НЭГТГЭНЭ — картын
 * мөр нь `{ id, url, listingId, createdAt, listing }`.
 *
 * ⚠️ ЯАГААД ВЭ: түүхэнд зөвхөн ЛИНК хадгалагддаг тул гарчиг/үнэ/зургийг
 *    ХАРАГДАХ үед нь татна ⇒ үнэ засагдсан ч ШИНЭ утга харагдана, УСТСАН
 *    зар картаас ГАРАХГҮЙ ✓ (хуучин утгыг хуулбарлаж хадгалах нь «худал»
 *    карт үүсгэнэ ✗)
 *
 * @param {Array<{id?:string,url:string,listingId?:string,createdAt?:string}>} items
 *        түүхийн мөрүүд (аль хэдийн «хамгийн сүүлд үзсэнээр» эрэмбэлэгдсэн)
 * @param {Array<object>} listings — `fetchListingsByIds()`-ийн үр дүн (дараалал ХАМААГҮЙ)
 * @returns {Array<object>} ⚠️ Оролтын ДАРААЛАЛ хадгалагдана (шинэ нь ЭХЭНД ✓)
 */
export function mergeHistoryListings(items, listings) {
  const byId = new Map();
  (Array.isArray(listings) ? listings : []).forEach((l) => {
    if (l && l.id) byId.set(String(l.id), l);
  });
  const out = [];
  (Array.isArray(items) ? items : []).forEach((it) => {
    if (!it) return;
    const listingId = it.listingId || historyListingId(it.url);
    if (!listingId) return;
    const listing = byId.get(listingId);
    if (!listing) return; // 🗑 устсан/олдохгүй зар → карт ГАРАХГҮЙ ✓
    out.push({
      id: it.id || listingId,
      url: listingHistoryUrl(listingId),
      listingId,
      createdAt: it.createdAt || '',
      listing,
    });
  });
  return out;
}

// ---- Бүртгэх (цэвэр) -----------------------------------------------------

/** Шинэ түүхийн id (localStorage горимд) — DB бол `gen_random_uuid()` */
export function newHistoryId() {
  const rnd = Math.random().toString(36).slice(2, 10);
  return `h${Date.now().toString(36)}${rnd}`;
}

/**
 * ЗАР ҮЗСНИЙГ түүхэнд БҮРТГЭХ (цэвэр функц — өгөгдсөн массивыг ӨӨРЧЛӨХГҮЙ).
 *   ① Зарын линк БИШ (`/?category=…`, `''`) → `{ ok:false }` (огт бүртгэхгүй ✓)
 *   ② Ижил зар аль хэдийн байвал → хуучин мөрийг ХАСАЖ, шинэ цагтай нь
 *      ЭХЭНД тавина (давхардахгүй, «хамгийн сүүлд үзсэн» нь эхэнд ✓)
 *   ③ Дээд тоо (`SEARCH_HISTORY_LIMIT`) хүндэтгэнэ
 *   ⚠️ Утга нь КАНОНИК болно (`/listings/<id>` — query/hash хасна)
 * @returns {{ list: Array, entry: object|null, ok: boolean }}
 */
export function recordHistory(list, url, now) {
  const prev = Array.isArray(list) ? list : [];
  const listingId = historyListingId(url);
  if (!listingId) return { list: prev, entry: null, ok: false };
  const existing = prev.find((it) => historyListingId(it.url) === listingId);
  const entry = {
    id: (existing && existing.id) || newHistoryId(),
    url: listingHistoryUrl(listingId),
    listingId,
    createdAt: now || new Date().toISOString(),
  };
  const kept = prev.filter((it) => historyListingId(it.url) !== listingId);
  return { list: [entry, ...kept].slice(0, SEARCH_HISTORY_LIMIT), entry, ok: true };
}

// ---- Жагсаалтын түвшин (localStorage/DB) --------------------------------

/**
 * localStorage/DB-ээс ирсэн мөрийг НЭГ хэлбэрт оруулна →
 * `{ id, url, listingId, createdAt }`.
 * ⚠️ ЗАРЫН линк биш мөр (`/?category=…` — 2026-10-07-ны хуучин хайлтын түүх)
 *    нь `null` болно ⇒ жагсаалтад ОРОХГҮЙ ✓
 * ⚠️ DB нь `last_seen_at` (сүүлд үзсэн цаг), localStorage нь `createdAt`
 */
export function normalizeHistoryRow(row) {
  if (!row || typeof row !== 'object') return null;
  const listingId = historyListingId(normalizeHistoryUrl(row.url));
  if (!listingId) return null;
  const id = row.id == null ? '' : String(row.id);
  const createdAt = row.createdAt || row.last_seen_at || row.lastSeenAt || row.created_at || '';
  return { id, url: listingHistoryUrl(listingId), listingId, createdAt: String(createdAt || '') };
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
    if (seen.has(norm.listingId)) return;
    seen.add(norm.listingId);
    out.push(norm);
  });
  return out.slice(0, limit);
}

/** Жагсаалтыг localStorage-д бичих JSON мөр */
export function serializeHistoryList(list) {
  return JSON.stringify(Array.isArray(list) ? list : []);
}
