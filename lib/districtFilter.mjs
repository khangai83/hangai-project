// ============================================================
// districtFilter.mjs — «ДҮҮРЭГ / СУМ» шүүлтийн ЦЭВЭР логик (олон сонголттой)
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-03): «Дэлгэрэнгүй хайлтын Дүүрэг / Сум-ийг
// Өрөөний тоо хайхтай адилхан олон сонголт хийх боломжтой болго» →
// sidebar-д «Баянгол» + «Сүхбаатар» гэх мэт хэд хэдэн дүүргийг зэрэг
// сонгоно (checkbox мэт чипүүд) ✓
//
// ЯАГААД ТУСДАА МОДУЛЬ ВЭ:
//   `lib/roomFilter.mjs`-ийн ЯГ ИЖИЛ зарчим — ямар ч импортгүй цэвэр
//   функцууд тул `scripts/test-districts.mjs` нь Node-оор ШУУД ачаалж
//   тестлэнэ ✓ (React/DB хөндөхгүй — дүрэм ба гэрээ л шалгагдана)
//   ⚠️ Утгууд нь ТОГТМОЛ ЖАГСААЛТ БИШ (хот/аймгаас хамаарна:
//      `lib/locationData.js → getDistricts(city)`) тул энэ модуль нь зөвхөн
//      «массив ↔ URL ↔ шошго ↔ query» гэсэн хөрвүүлэлтийг эзэмшинэ ✓
//
// ⚠️ НЭГ ЭХ СУРВАЛЖ: UI (`components/HomeClient.jsx`), URL (`?district=А,Б`),
//    DB (`lib/queries.js`) ба breadcrumb (`lib/breadcrumb.js`) БҮГД энэ
//    модулийг дуудна — дүрэм нэг газар бичигдвэл нэг нь мартагдахгүй ✓
//
// ⚠️ ХУУЧИН ГЭРЭЭ ХАДГАЛАГДАНА (2026-09-25-аас хойш дүүрэг нь НЭГ утгатай
//    `<select>` байсан тул): НЭГ утгатай үед `applyDistrictFilter` нь
//    `query.eq('district', …)` — өөрөөр хэлбэл `district=eq.Баянгол` ба
//    URL/DB нь ЯГ ХУУЧИН шигээ байна ✓ (хуучин линк, индекс, breadcrumb
//    бүгд эвдрэхгүй). Олон утгатай үед л `.in()` болно ✓
// ============================================================

/**
 * Нэг утгыг цэвэрлэнэ: `' Баянгол '` → `'Баянгол'`;
 * `null`/`''`/`{}` → `''`.
 * ⚠️ ТАСЛАЛ (`,`) нь URL-д утгуудыг ТУСГААРЛАГЧ тул утга дотроос ЗАЙ
 *    болгоно — эс бөгөөс гараар бичсэн/эвдэрсэн линк (`district=А,Б`) нэг
 *    утга дотор «таслалтай» дүүрэг үүсгэж, URL ба DB хоёулаа задарна ✗
 * ⚠️ Зөвхөн текст/тоо хүлээнэ — объект/массив ирвэл `'[object Object]'` гэсэн
 *    ХОГ утга үүсэж DB рүү `district=eq.[object Object]` явна ✗
 *    (`lib/roomFilter.mjs → normalizeRoomValue()` мөн л хүчингүйг хаядаг ✓)
 */
export function normalizeDistrict(value) {
  if (value == null) return '';
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).trim().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * URL/массивын олон утгыг ХҮЧИНТЭЙ, ДАВХЦАЛГҮЙ массив болгоно.
 *   'Баянгол,Сүхбаатар' · ['Баянгол','Сүхбаатар'] · 'Баянгол' → ['Баянгол', …]
 * ⚠️ ХООСОН/хүчингүй утгууд ЧИМЭЭГҮЙ хасагдана — эс бөгөөс `?district=,,`
 *    гэх мэт эвдэрсэн линк `in.()` гэсэн ХООСОН шүүлт үүсгэж, бүх зар
 *    алга болно ✗
 * ⚠️ ЭРЭМБЭ нь ИРСЭН дарааллаараа (СОРТ ХИЙХГҮЙ) — ингэснээр хуваалцсан
 *    линк (`?district=А,Б`) нь URL-д ЯГ ИЖИЛ хэвээр үлдэж, `router.replace`
 *    нь дэмий давталт үүсгэхгүй ✓ (өрөөний тоо нь цифр тул тэнд эрэмбэлдэг)
 */
export function parseDistrictList(raw) {
  const parts = Array.isArray(raw) ? raw : String(raw ?? '').split(',');
  const out = [];
  parts.forEach((p) => {
    const v = normalizeDistrict(p);
    if (v && !out.includes(v)) out.push(v);
  });
  return out;
}

/** Одоогийн сонголт «хоосон» эсэх (шүүлт тавиагүй) */
export function isDistrictsEmpty(list) {
  return parseDistrictList(list).length === 0;
}

/** Сонгосон дүүргийн ШИРХЭГ (badge/«N сонгосон» харуулахад) */
export function countDistricts(list) {
  return parseDistrictList(list).length;
}

/**
 * Нэг утгыг НЭМЭХ/ХАСАХ (checkbox мэт toggle) — ШИНЭ массив буцаана.
 * ⚠️ React-ийн state-ийг ШУУД өөрчлөхгүй ✓
 * ⚠️ Хүчингүй утга (`''`) ирвэл одоогийн жагсаалтыг ХЭВЭЭР буцаана
 */
export function toggleDistrictValue(list, value) {
  const v = normalizeDistrict(value);
  const cur = parseDistrictList(list);
  if (!v) return cur;
  return cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
}

/** URL-д бичих утга: ['Баянгол','Сүхбаатар'] → 'Баянгол,Сүхбаатар' · [] → '' */
export function districtsUrlValue(list) {
  return parseDistrictList(list).join(',');
}

/**
 * Шошго (идэвхтэй шүүлтийн чип, breadcrumb).
 *   1 сонголт  → «Баянгол»
 *   2+ сонголт → «2 дүүрэг»      ← ⚠️ нэрсийг бүтнээр нь жагсаавал
 *                 (ж: «Баянгол, Сүхбаатар, Хан-Уул») чип хэт урт болно ✗
 *   [] / ''    → ''
 * ⚠️ Утга нь зөвхөн сонголтын тооноос хамаарна — `districtOptions`-ийг
 *    дуудахгүй (модуль нь хот/аймгийн өгөгдлийг мэдэхгүй, цэвэр хэвээр ✓)
 * 🏷️ 2026-10-03 (14) — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ («Дүүрэг / Сум» ийг «Дүүрэг»
 *    болго): өмнө нь аймаг (ж: Дархан-Уул → «Дархан» сум) дээр ч зөв
 *    уншигдахын тулд «дүүрэг/сум» гэж ХОСООР бичдэг байв ✗ → одоо UI-ийн
 *    бүх шошго (sidebar-ийн гарчиг, breadcrumb, идэвхтэй шүүлтийн чип) нь
 *    зөвхөн «дүүрэг» гэнэ ✓ (⚠️ DB-д хадгалагдах УТГА (`district` багана)
 *    болон URL (`?district=…`) ХӨНДӨГДӨӨГҮЙ — зөвхөн харагдах ШОШГО ✓)
 */
export function districtsFilterLabel(list) {
  const arr = parseDistrictList(list);
  if (!arr.length) return '';
  if (arr.length === 1) return arr[0];
  return `${arr.length} дүүрэг`;
}

/**
 * DB (PostgREST) шүүлтийн ТӨЛӨВЛӨЛТ — тестээр түгжинэ (`scripts/test-districts.mjs`).
 *   { mode: 'none' }                    → шүүлт ХИЙХГҮЙ
 *   { mode: 'eq', value: 'Баянгол' }    → `district=eq.Баянгол`   ← ХУУЧИН
 *   { mode: 'in', values: ['А','Б'] }   → `district=in.("А","Б")`
 *
 * ⚠️ ДҮРЭМ (нэг сонголттой үед ХУУЧИН үр дүн ЯГ ижил байх ЁСТОЙ):
 *    `['Баянгол']`            → `eq` (`.select()`-ийн `district=eq.…`)
 *    `['Баянгол','Сүхбаатар']` → `in` (= SQL `district IN (…)`) ✓
 */
export function districtsFilterDescriptor(list) {
  const arr = parseDistrictList(list);
  if (!arr.length) return { mode: 'none' };
  if (arr.length === 1) return { mode: 'eq', value: arr[0] };
  return { mode: 'in', values: arr };
}

/**
 * PostgREST-ийн query builder дээр шүүлтийг ШУУД ХЭРЭГЛЭНЭ (`lib/queries.js` дуудна).
 *   • `eq` → `query.eq('district', 'Баянгол')`         ⇒ `district=eq.Баянгол`
 *   • `in` → `query.in('district', ['А','Б'])`         ⇒ `district=in.("А","Б")`
 *   • `[]` → юу ч хийхгүй (бүх зар) ✓
 *
 * ⚠️ ХУУЧИН дуудлага (`district: 'Баянгол'` — скаляр) ч дэмжигдэнэ:
 *    `parseDistrictList()` нь скалярыг нэг элементтэй массив болгоно ✓
 *
 * @param {{eq: Function, in: Function}} query — PostgREST builder
 * @param {string|Array<string>} raw — сонгосон утгууд (эсвэл хуучин скаляр)
 * @returns {*} дамжуулсан `query` (гинжин дуудлагад тохиромжтой)
 */
export function applyDistrictFilter(query, raw) {
  const d = districtsFilterDescriptor(raw);
  if (d.mode === 'eq') {
    query.eq('district', d.value);
  } else if (d.mode === 'in') {
    query.in('district', d.values);
  }
  return query;
}
