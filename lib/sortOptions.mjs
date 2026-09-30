// ============================================================
// sortOptions.mjs — «ЭРЭМБЭЛЭХ» сонголтын ЦЭВЭР логик
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   eBay-ийн хайлтын толгойд «Sort: Best Match ▾» гэж БАЙДАГ шиг, үр дүнгийн
//   гарчгийн баруун талд ЭРЭМБЭЛЭХ сонголт нэмэв (хэрэглэгчийн хүсэлт:
//   «зар хайх хэсэг eBay их таалагдлаа, үүнээс сурацаад хийж өгөөч»).
//   ⚠️ Урьд нь дараалал нь КОДОД хатуу бичсэн байв (`created_at desc`) —
//      хэрэглэгч «хамгийн хямдаас» эхлэхийг сонгох боломжгүй байсан ✗
//
// ⚠️ Импортгүй (цэвэр) — `scripts/test-search.mjs` нь DB/React-гүйгээр
//    шууд тестлэнэ ✓ ; `lib/queries.js` нь энэ модулиас дарааллыг авна.
// ⚠️ URL-д нэвтрэх утга нь ЗӨВХӨН энэ жагсаалт дотор байх ёстой
//    (`normalizeSort()` — танихгүй `?sort=xxx` ирвэл анхдагч руу буцаана,
//    ингэснээр PostgREST-д БАЙХГҮЙ баганаар эрэмбэлэх эрсдэл ГАРАХГҮЙ ✓)
// ============================================================

/** Анхдагч эрэмбэ — «Шинээр нэмэгдсэн» (хуучин зан төлөв хэвээр ✓) */
export const DEFAULT_SORT = 'newest';

/**
 * Хэрэглэгчид харагдах эрэмбэлэх сонголтууд.
 * ⚠️ Дараалал нь UI дээрх дараалал (шинэ → үнэ ↑ → үнэ ↓).
 */
export const SORT_OPTIONS = [
  { value: 'newest', label: 'Шинээр нэмэгдсэн', icon: '🆕' },
  { value: 'price_asc', label: 'Үнэ: багаас их', icon: '⬆️' },
  { value: 'price_desc', label: 'Үнэ: ихээс бага', icon: '⬇️' },
];

/**
 * URL/state-ийн утгыг ХҮЧИНТЭЙ эрэмбэ болгоно.
 * @param {string} [value] `?sort=price_asc` гэх мэт
 * @returns {string} Танигдсан утга, эсвэл `DEFAULT_SORT`
 */
export function normalizeSort(value) {
  const v = String(value || '').trim();
  return SORT_OPTIONS.some((o) => o.value === v) ? v : DEFAULT_SORT;
}

/**
 * PostgREST-ийн `.order()`-т хэрэглэх дарааллын жагсаалт.
 *
 * ⚠️ ХОЁР дахь дараалал (`id desc`) нь ЗААВАЛ — `created_at` тэнцэх үед
 *    (seed/бөөн оруулсан зарууд) Postgres нь мөрийн дарааллыг ТОГТВОРТОЙ
 *    буцаахгүй → хуудаслалт дээр зар ДАВХАРДАХ/АЛГАСАН болно ✗
 *    (`lib/queries.js`-ийн анхны тайлбарыг үз)
 * ⚠️ `nullsFirst: false` — үнэ хоосон (`null`) зарууд «хамгийн хямд» гэж
 *    ЭХЭНД гарч ирэхгүйн тулд ХАМГИЙН СҮҮЛД тавина ✓
 *
 * @param {string} [sort] `SORT_OPTIONS`-ийн утга (танихгүй бол анхдагч)
 * @returns {Array<{column:string, ascending:boolean, nullsFirst?:boolean}>}
 */
export function sortOrders(sort) {
  const key = normalizeSort(sort);
  const tieBreak = { column: 'id', ascending: false };

  if (key === 'price_asc') {
    return [{ column: 'price', ascending: true, nullsFirst: false }, tieBreak];
  }
  if (key === 'price_desc') {
    return [{ column: 'price', ascending: false, nullsFirst: false }, tieBreak];
  }
  // 🆕 «Шинээр нэмэгдсэн» — үндсэн дараалал (хуучин зан төлөв ✓)
  return [{ column: 'created_at', ascending: false }, tieBreak];
}

/** Сонголтын шошгыг олно (chip/толгойд харуулахад) */
export function sortLabel(sort) {
  const key = normalizeSort(sort);
  const found = SORT_OPTIONS.find((o) => o.value === key);
  return found ? found.label : SORT_OPTIONS[0].label;
}
