// ============================================================
// roomFilter.mjs — «ӨРӨӨНИЙ ТОО» шүүлтийн ЦЭВЭР логик (олон сонголттой)
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-09-30): «үл хөдлөх дээр өрөөний тоог хайлт хэсэг
// оруул, олон сонголт хийх боломжтой байх» → 1..4 ба «+5» (5 БА ТҮҮНЭЭС
// ДЭЭШ) товчнууд нь checkbox мэт ОЛНООР сонгогдоно ✓
//
// ЯАГААД ТУСДАА МОДУЛЬ ВЭ:
//   `lib/locationData.js` шиг ЯМАР Ч импортгүй цэвэр функцууд тул
//   `scripts/test-rooms.mjs` нь Node-оор ШУУД ачаалж тестлэнэ ✓
//   (React/DB хөндөхгүй — математик ба гэрээ л шалгагдана)
//
// ⚠️ НЭГ ЭХ СУРВАЛЖ: UI (`components/HomeClient.jsx`), URL (`?rooms=1,2`),
//    DB (`lib/queries.js`) ба breadcrumb (`lib/breadcrumb.js`) БҮГД энэ
//    модулийг дуудна — дүрэм нэг газар бичигдвэл нэг нь мартагдахгүй ✓
// ============================================================

/**
 * Сонголтын утгууд — ⚠️ ДАТАБАЗЫН `listings.rooms`-той ШУУД харьцуулагдана
 * (`ROOM_OPTIONS`-ийн `value`-тай ижил байх ЁСТОЙ).
 * Хамгийн сүүлийн `'5'` нь «+5» — өөрөө 5 гэсэн утга БИШ, `>= 5` ХҮРЭЭ.
 */
export const ROOM_VALUES = ['1', '2', '3', '4', '5'];

/** «+5 өрөө» гэсэн ХҮРЭЭНИЙ утга (5 ба түүнээс дээш) */
export const ROOM_PLUS_VALUE = '5';

/** «+5» хүрээ эхлэх хамгийн бага тоо (`rooms >= 5`) */
export const ROOM_PLUS_MIN = 5;

/**
 * Утга нь «яг тоо» (хүрээ биш) байх дээд хязгаар: 1,2,3,4.
 * ⚠️ Хэрэглэгч `4` ба `5`-ыг ХАМТ сонговол `rooms >= 4` болж НЭГТГЭНЭ
 *    (`>= 4` нь 4, 5, 6 … бүгдийг багтаана) — `roomsFilterDescriptor()` үзнэ ✓
 */
export const ROOM_ACTUAL_MAX = 4;

/** Нэг утгын шошго: '3' → '3 өрөө', '5' → '+5 өрөө' (хуучин `formatRoomsLabel`-тай ижил) */
export function roomOptionLabel(value) {
  const v = String(value ?? '').trim();
  if (!ROOM_VALUES.includes(v)) return '';
  return v === ROOM_PLUS_VALUE ? `+${ROOM_PLUS_MIN} өрөө` : `${v} өрөө`;
}

/** Утга нь хүчинтэй сонголт мөн эсэх (`'1'`…`'5'`) */
export function isRoomValue(value) {
  return ROOM_VALUES.includes(String(value ?? '').trim());
}

/**
 * Нэг утгыг ЦЭВЭРЛЭНЭ — `'5+'`, `'+5'`, `5`, `' 5 '` бүгд `'5'`;
 * хүчингүй (`'0'`, `'abc'`, `''`, `null`) бол `''`.
 * ⚠️ Хэрэглэгч «5+»/«+5» гэж бичиж болзошгүй (шошго нь «+5 өрөө») тул
 *    тэдгээрийг хүлээн авна — эс бөгөөс линк дээр «5+» ирвэл шүүлт
 *    ЧИМЭЭГҮЙ алга болно ✗
 */
export function normalizeRoomValue(value) {
  const raw = String(value ?? '').trim().replace(/\+/g, '');
  if (!/^\d+$/.test(raw)) return '';
  const n = Number(raw);
  if (n < 1) return '';
  if (n >= ROOM_PLUS_MIN) return ROOM_PLUS_VALUE;
  return String(n);
}

/**
 * URL/массивын олон утгыг ХҮЧИНТЭЙ, ЭРЭМБЭТЭЙ, ДАВХЦАЛГҮЙ массив болгоно.
 *   '3,1' · [1,3] · '3' · 3 → ['1','3']
 * ⚠️ ХООСОН утгууд (`''`, `'abc'`) ЧИМЭЭГҮЙ хасагдана — эс бөгөөс
 *    `?rooms=,,` гэх мэт эвдэрсэн линк query-г унагаж болно ✗
 */
export function parseRoomList(raw) {
  const parts = Array.isArray(raw) ? raw : String(raw ?? '').split(',');
  const out = [];
  parts.forEach((p) => {
    const v = normalizeRoomValue(p);
    if (v && !out.includes(v)) out.push(v);
  });
  // Өсөх эрэмбэ (1 → 5) — URL/шошго тогтвортой байхын тулд
  return out.sort((a, b) => Number(a) - Number(b));
}

/** Одоогийн сонголтын массив «хоосон» эсэх (шүүлт тавиагүй) */
export function isRoomsEmpty(list) {
  return parseRoomList(list).length === 0;
}

/** Сонгосон тоо ширхэг (badge/«N сонгосон» харуулахад) */
export function countRooms(list) {
  return parseRoomList(list).length;
}

/**
 * ОЛОН СОНГОЛТ — нэг утгыг нэмэх/хасах (checkbox мэт).
 * ⚠️ Шинэ массив буцаана (React-ийн state-ийг ШУУД өөрчлөхгүй) ✓
 * ⚠️ Хүчингүй утга ирвэл одоогийн жагсаалтыг ХЭВЭЭР буцаана (эвдрэхгүй)
 */
export function toggleRoomValue(list, value) {
  const v = normalizeRoomValue(value);
  const cur = parseRoomList(list);
  if (!v) return cur;
  const next = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
  return parseRoomList(next);
}

/** URL-д бичих утга: ['3','1'] → '1,3' · [] → '' */
export function roomsUrlValue(list) {
  return parseRoomList(list).join(',');
}

/**
 * Шүүлтийн ШОШГО — sidebar-ийн толгой, чип, breadcrumb бүгд үүнийг хэрэглэнэ.
 *   []          → ''
 *   ['3']       → '3 өрөө'
 *   ['5']       → '+5 өрөө'
 *   ['1','2']   → '1, 2 өрөө'
 *   ['1','5']   → '1, 5+ өрөө'   (жагсаалт дотор «+» угтвар нь ТОВЧЛОЛДОНО)
 *
 * ⚠️ Нэг утгатай үед ХУУЧИН хэлбэр ХЭВЭЭР (`+5 өрөө`) — README/хуучин линк
 *    ба `formatRoomsLabel(5)`-ийн гэрээ хадгалагдана ✓
 * ⚠️ Хуучин НЭГ утгатай дуудлага (`rooms: 3` эсвэл `'3'`) ч эвдрэхгүй —
 *    `parseRoomList()` нь скалярыг нэг элементтэй массив болгоно ✓
 */
export function roomsFilterLabel(list) {
  const arr = parseRoomList(list);
  if (!arr.length) return '';
  if (arr.length === 1) return roomOptionLabel(arr[0]);
  return `${arr.map((v) => (v === ROOM_PLUS_VALUE ? `${ROOM_PLUS_MIN}+` : v)).join(', ')} өрөө`;
}

/**
 * DB (PostgREST) шүүлтийн ТӨЛӨВЛӨЛТ — `lib/queries.js` үүнийг шууд хэрэглэнэ.
 *
 *   { mode: 'none' }                       → шүүлт ХИЙХГҮЙ
 *   { mode: 'in',   values: ['1','2'] }    → `rooms IN (1,2)`
 *   { mode: 'gte',  min: 5 }               → `rooms >= 5`   («+5 өрөө»)
 *   { mode: 'or',   values: ['1','2'], plusMin: 5 }
 *                                          → `rooms IN (1,2) OR rooms >= 5`
 *
 * ⚠️ ДҮРЭМ (нэг сонголттой үед ХУУЧИН үр дүн ЯГ ижил байх ЁСТОЙ):
 *    • `['5']`      → `gte 5`  (хуучин `rooms >= 5` ✓)
 *    • `['3']`      → `in ['3']` = `rooms = 3` ✓
 *    • `['4','5']`  → `gte 4`  (≥4 нь 4, 5, 6 … бүгдийг багтаахад ХҮРЭЭ нэгтгэнэ)
 *    • `['1','2']`  → `in ['1','2']` (OR)
 *    • `['1','5']`  → `or` — учир нь `IN (1)` ба `>= 5` нь завсартай (2,3,4 орохгүй)
 * ⚠️ AND/OR нь БУСАД шүүлттэй ХАМТ `AND` болно (PostgREST-ийн дээд түвшин) ✓
 */
export function roomsFilterDescriptor(list) {
  const arr = parseRoomList(list);
  if (!arr.length) return { mode: 'none' };

  const nums = arr.filter((v) => v !== ROOM_PLUS_VALUE);
  const hasPlus = arr.includes(ROOM_PLUS_VALUE);

  // «+5» сонгоогүй → зөвхөн яг тоонууд
  if (!hasPlus) return { mode: 'in', values: nums };

  // «+5» ба 4 БАС сонгогдсон → `>= 4` нь хоёуланг нь (болон 6,7,8 …) багтаана
  if (nums.includes(String(ROOM_ACTUAL_MAX))) {
    return { mode: 'gte', min: ROOM_ACTUAL_MAX };
  }
  // Зөвхөн «+5»
  if (!nums.length) return { mode: 'gte', min: ROOM_PLUS_MIN };

  // Завсартай хослол (ж: 1 ба +5) → OR
  return { mode: 'or', values: nums, plusMin: ROOM_PLUS_MIN };
}

/**
 * PostgREST-ийн query builder дээр шүүлтийг ШУУД ХЭРЭГЛЭНЭ (`lib/queries.js` дуудна).
 *   • `in`  → `query.in('rooms', [1,2])`      ⇒ `rooms=in.(1,2)`
 *   • `gte` → `query.gte('rooms', 5)`         ⇒ `rooms=gte.5`
 *   • `or`  → `query.or('rooms.in.(1),rooms.gte.5')`
 *             ⇒ `and=(or(rooms.in.(1),rooms.gte.5), …)` — бусад шүүлттэй AND ✓
 *
 * ⚠️ МЕХАНИК НЬ ЭНД байгаа нь ЧУХАЛ: `.or()`-ийн мөрний синтаксис
 *    (`rooms.in.(1,3)`) нь амархан эвдэрдэг тул `scripts/test-rooms.mjs` нь
 *    ХУУЧИР Builder-оор дамжуулж, яг ямар мөр үүсэхийг түгждэг ✓
 * ⚠️ Утгууд нь зөвхөн `1..5` цифр (`normalizeRoomValue` шүүсэн) тул мөрөнд
 *    таслал/хаалт/зай орох боломжгүй → PostgREST-ийн синтаксис ЭВДРЭХГҮЙ ✓
 *
 * @param {{gte: Function, in: Function, or: Function}} query — PostgREST builder
 * @param {string|number|Array<string|number>} list — сонгосон утгууд
 * @returns {*} дамжуулсан `query` (гинжин дуудлагад тохиромжтой)
 */
export function applyRoomFilter(query, list) {
  const d = roomsFilterDescriptor(list);
  if (d.mode === 'gte') {
    query.gte('rooms', d.min);
  } else if (d.mode === 'in') {
    query.in('rooms', d.values.map(Number));
  } else if (d.mode === 'or') {
    query.or([
      `rooms.in.(${d.values.join(',')})`,
      `rooms.gte.${d.plusMin}`,
    ].join(','));
  }
  return query;
}
