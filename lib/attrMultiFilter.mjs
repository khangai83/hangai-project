// ============================================================
// attrMultiFilter.mjs — ОЛОН СОНГОЛТТОЙ ATTR ШҮҮЛТ (2026-10-03 (19))
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Зар хайлт дээр Авто машин сонголт дээр Өнгө ийг
// Төлбөрийн нөхцөл шиг олон сонголттой болго» ⇒ 🚗 `auto` хэсгийн sidebar-д
// 🎨 «Өнгө» нь `<select>` БИШ, **ОЛОН СОНГОЛТТОЙ ЧИП** болов —
// «Хар» + «Цагаан» гэж зэрэг сонгоход аль нэг өнгөтэй зарууд гарна ✓
//
// ЯАГААД ТУСДАА МОДУЛЬ ВЭ:
//   `lib/districtFilter.mjs` / `lib/paymentFilter.mjs`-ийн ЯГ ИЖИЛ хэв маяг —
//   ямар ч импортгүй ЦЭВЭР функцууд тул `scripts/test-attr-multi.mjs` нь
//   Node-оор ШУУД ачаалж, ХУУЧИР (fake) PostgREST builder-оор яг ямар query
//   мөр үүсэхийг түгждэг ✓ (React/DB хөндөхгүй)
//
// ⚠️ НЭГ ЭХ СУРВАЛЖ: UI (`components/HomeClient.jsx`), URL (`?attr_color=Хар,Цагаан`),
//    DB (`lib/queries.js → applyAttrMultiFilter`) БҮГД энэ модулийг дуудна ✓
//
// ⚙️ ХАДГАЛАХ ФОРМАТ (DB ба URL — ХӨНДӨГДӨӨГҮЙ):
//   • DB: `attrs->>color` нь ХЭВЭЭР (нэг ТЕКСТ талбар) — олон сонголт нь
//     `attrs->>color=in.("Хар","Цагаан")` болно. ⚠️ ЯАГААД `->>` ВЭ: утга нь
//     МАССИВ БИШ скаляр (форм нь нэг өнгө хадгалдаг) тул `cs` (containment)
//     биш, энгийн ТЕКСТ харьцуулалт зөв ✓ (`payment_terms` нь массив тул
//     тэнд `cs` — энэ ялгааг санах хэрэгтэй ✓)
//   • URL: `?attr_color=Хар,Цагаан` — ⚠️ параметрийн НЭР нь хуучин НЭГ утгатай
//     линктэй ЯГ ИЖИЛ (`?attr_color=Хар`) тул хуучин линк/bookmark эвдрэхгүй ✓
//   • `filters.attrs.color` нь ОДОО массивыг ч агуулж болно (`['Хар','Цагаан']`)
//     — скаляр (хуучин утга) ч бүрэн дэмжигдэнэ (`parseAttrList` нэг
//     элементтэй массив болгоно ✓)
//
// 🔎 ХАЙЛТТАЙ ТЕКСТ ТАЛБАРЫН ОЛОН СОНГОЛТ (2026-10-04 (36)):
//   Хэрэглэгчийн хүсэлт: «машины загвараас олоныг сонгох боломжтой болго» ⇒
//   🚙 «Загвар» (`filterable` текст) нь ОЛОН утгатай болов. ⚠️ ГЭХДЭЭ түүнд
//   `in.()` ХЭРЭГЛЭХГҮЙ — гэрээ нь `ilike %…%` (бүрэн бус «pri» ч олдоно ✓):
//     ['Prius 30']           → `attrs->>model=ilike.%Prius 30%`  (скаляртай ИЖИЛ ✓)
//     ['Prius 30','Harrier'] → `or=(attrs->>model.ilike.%Prius 30%,
//                                    attrs->>model.ilike.%Harrier%)`  (OR ✓)
//   Ялгаа нь ЧУХАЛ: `in.()` нь ЗӨВХӨН бүрэн тэнцлийг олдог тул чөлөөт текст
//   («pri») 0 үр дүн өгөх байв ✗ → `applyAttrMultiLikeFilter()` ✓
//
// ⚠️ БОДИТ DB дээр 2026-10-03-нд туршиж батлав: `attrs->>color=in.(…)` нь
//    `200 OK` буцаана — зайтай утга (`"Сувдан цагаан"`) ч зөв (PostgREST
//    утгуудыг өөрөө хашилтад авна ✓)
// ============================================================

/**
 * Нэг утгыг ЦЭВЭРЛЭНЭ: `' Хар '` → `'Хар'`; `null`/`''`/`{}` → `''`.
 *
 * ⚠️ ТАСЛАЛ (`,`) нь URL-д утгуудыг ТУСГААРЛАГЧ тул утга дотроос ЗАЙ болгоно —
 *    эс бөгөөс гараар бичсэн/эвдэрсэн линк (`?attr_color=Хар,Цагаан`) нэг утга
 *    дотор «таслалтай» өнгө үүсгэж, URL ба DB хоёулаа задарна ✗
 *    (`lib/districtFilter.mjs → normalizeDistrict()`-тай ЯГ ИЖИЛ зарчим ✓)
 * ⚠️ Зөвхөн текст/тоо хүлээнэ — объект/массив ирвэл `'[object Object]'` гэсэн
 *    ХОГ утга үүсэж DB рүү `attrs->>color=eq.[object Object]` явна ✗
 * ⚠️ ТОМ/ЖИЖИГ үсгийг ХӨНДӨХГҮЙ: DB-д хадгалагдсан ЯГ тэр бичлэгээрээ
 *    харьцуулагдана (`in` нь case-sensitive) — эс бөгөөс «Хар» ба «хар» хоёр
 *    өөр утга болж, шүүлт «0 үр дүн» өгнө ✗
 */
export function normalizeAttrValue(value) {
  if (value == null) return '';
  if (typeof value !== 'string' && typeof value !== 'number') return '';
  return String(value).trim().replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * URL/массивын олон утгыг ХҮЧИНТЭЙ, ДАВХЦАЛГҮЙ массив болгоно.
 *   'Хар,Цагаан' · ['Хар','Цагаан'] · 'Хар' → ['Хар','Цагаан']
 *
 * ⚠️ ХООСОН/хүчингүй утгууд ЧИМЭЭГҮЙ хасагдана — эс бөгөөс `?attr_color=,,`
 *    гэх мэт эвдэрсэн линк `in.()` гэсэн ХООСОН шүүлт үүсгэж, бүх зар
 *    алга болно ✗
 * ⚠️ ЭРЭМБЭ нь ИРСЭН дарааллаараа (СОРТ ХИЙХГҮЙ) — ингэснээр хуваалцсан линк
 *    (`?attr_color=Хар,Цагаан`) нь URL-д ЯГ ИЖИЛ хэвээр үлдэж, `router.replace`
 *    нь дэмий давталт үүсгэхгүй ✓ (`lib/districtFilter.mjs`-ийн зарчим;
 *    ⚠️ payment/rooms нь КОД (ASCII) тул тэнд канон эрэмбэ хэрэглэдэг — энд
 *    утга нь чөлөөт МОНГОЛ текст тул канон жагсаалт байхгүй ✓)
 */
export function parseAttrList(raw) {
  // ⚠️ Зөвхөн массив/текст/тоо — өөр төрөл (`{}`, `true`, функц) ирвэл `[]`.
  //    Эс бөгөөс `String({})` → `'[object Object]'` гэсэн ХОГ утга массивт
  //    орж, `attrs->>color=in.("[object Object]")` гэсэн утгагүй шүүлт явна ✗
  const list = Array.isArray(raw) ? raw
    : (typeof raw === 'string' || typeof raw === 'number' ? [raw] : []);
  /**
   * ⚠️ МАССИВЫН ЭЛЕМЕНТ БҮР таслалаар ХУВААГДАНА — учир нь URL-ийн
   *    `?attr_color=Хар,Цагаан` нь `URLSearchParams.getAll()`-аас
   *    `['Хар,Цагаан']` (НЭГ элемент, дотор нь таслалттай) хэлбэрээр ирдэг.
   *    Хуваахгүй бол `normalizeAttrValue` таслалыг ЗАЙ болгож,
   *    «Хар Цагаан» гэсэн НЭГ утга → `in.(Хар Цагаан)` гэсэн утгагүй шүүлт
   *    үүснэ ✗ (CDP дээр баригдсан бодит алдаа ✓)
   *    ℹ️ Давхар таслалт (`?a=1,2,3` ба `?a=1&a=2,3`) ч ижил утга өгнө ✓
   */
  const parts = list.flatMap((p) => (typeof p === 'string' ? p.split(',') : [p]));
  const out = [];
  parts.forEach((p) => {
    const v = normalizeAttrValue(p);
    if (v && !out.includes(v)) out.push(v);
  });
  return out;
}

/** Одоогийн сонголт «хоосон» эсэх (шүүлт тавиагүй) */
export function isAttrListEmpty(list) {
  return parseAttrList(list).length === 0;
}

/** Сонгосон утгын ТОО — «N сонгосон» badge-д */
export function countAttrValues(list) {
  return parseAttrList(list).length;
}

/**
 * Нэг утгыг НЭМЭХ/ХАСАХ (checkbox мэт toggle) — ШИНЭ массив буцаана.
 * ⚠️ React-ийн state-ийг ШУУД өөрчлөхгүй ✓
 * ⚠️ Хүчингүй утга (`''`) ирвэл одоогийн жагсаалтыг ХЭВЭЭР буцаана
 */
export function toggleAttrValue(list, value) {
  const v = normalizeAttrValue(value);
  const cur = parseAttrList(list);
  if (!v) return cur;
  return cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v];
}

/** URL-д бичих утга: ['Хар','Цагаан'] → 'Хар,Цагаан' · [] → '' */
export function attrListUrlValue(list) {
  return parseAttrList(list).join(',');
}

/**
 * Шошго (идэвхтэй шүүлтийн чип). `noun` нь нэгжийн нэр (ж: `'өнгө'`):
 *   1 сонголт  → «Хар»
 *   2+ сонголт → «3 өнгө»      ← ⚠️ утгуудыг бүтнээр нь жагсаавал
 *                 (ж: «Цагаан, Сувдан цагаан, Хар») чип хэт урт болно ✗
 *   [] / ''    → ''
 * ⚠️ Утга нь зөвхөн сонголтын тооноос хамаарна — талбарын сонголтын жагсаалтыг
 *    (`AUTO_COLOR_OPTIONS`) дуудахгүй, модуль ЦЭВЭР хэвээр ✓
 */
export function attrListFilterLabel(list, noun = 'сонголт') {
  const arr = parseAttrList(list);
  if (!arr.length) return '';
  if (arr.length === 1) return arr[0];
  return `${arr.length} ${noun}`;
}

/**
 * DB (PostgREST) шүүлтийн ТӨЛӨВЛӨЛТ — тестээр түгжинэ.
 *   { mode: 'none' }                 → шүүлт ХИЙХГҮЙ
 *   { mode: 'in', values: ['Хар'] }  → `attrs->>color=in.("Хар")`
 *
 * ⚠️ НЭГ утгатай үед ч `in` (биш `eq`) байна: үр дүн ЯГ ижил (нэг утгын `IN`
 *    = `=`), гэхдээ код нэг л замтай болно ✓ (тест нь ЯГ энэ мөрийг хүлээж
 *    байгаа тул шийдвэр түгжигдсэн — өөрчлөх бол тестийг хамт шинэчилнэ ✓)
 * ⚠️ `in()` нь `eq`-ээс удаан БИШ: PostgREST хоёуланг нь ижил
 *    `jsonb_path_ops` GIN индексээр (0016_sections.sql) гүйцэтгэнэ ✓
 */
export function attrMultiFilterDescriptor(list) {
  const values = parseAttrList(list);
  if (!values.length) return { mode: 'none' };
  return { mode: 'in', values };
}

/**
 * PostgREST-ийн query builder дээр шүүлтийг ШУУД ХЭРЭГЛЭНЭ
 * (`lib/queries.js → applyListingFilters` дуудна):
 *   `query.in('attrs->>color', ['Хар','Цагаан'])`
 *     ⇒ `attrs->>color=in.("Хар","Цагаан")`
 *
 * ⚠️ `.in()` нь дээд түвшний бусад шүүлттэй `AND` болж холбогдоно
 *    (`section`, `category`, `price`, `payment` … хэвээрээ ✓)
 * ⚠️ Хоосон (`[]`) үед шүүлт ХИЙХГҮЙ (mode: 'none') — «Бүх зар» ✓
 * ⚠️ `key` нь ЗӨВХӨН `lib/locationData.js`-ийн тодорхойлолтоос ирнэ
 *    (хэрэглэгчийн чөлөөт текст БИШ) — PostgREST-ийн баганы нэр рүү
 *    injection орох боломжгүй ✓
 *
 * @param {{in: Function}} query — PostgREST builder
 * @param {string} key — attr-ийн түлхүүр (ж: `'color'`)
 * @param {string|Array<string>} list — сонгосон утгууд
 * @returns {*} дамжуулсан `query` (гинжин дуудлагад тохиромжтой)
 */
export function applyAttrMultiFilter(query, key, list) {
  const d = attrMultiFilterDescriptor(list);
  if (d.mode === 'in') query.in(`attrs->>${key}`, d.values);
  return query;
}

/**
 * 🔎 LIKE-ийн ХЭВ МАЯГ — `'Prius 30'` → `'%Prius 30%'`.
 *
 * ⚠️ `%`, `_`, `\` нь ESCAPE хийгдэнэ — эс бөгөөс «Mercedes_» гэх мэт утга
 *    бүх зарыг татаж болно ✗ (хайлтын хайрцгийн ИЖИЛ дүрэм ✓)
 * ⚠️ НЭГ ЭХ СУРВАЛЖ (2026-10-04 (36)): `lib/queries.js` нь СКАЛЯР (нэг утга)
 *    ба ОЛОН УТГАТАЙ (`OR`) хоёуланд нь ЯГ энэ функцийг дуудна — өмнө нь
 *    `queries.js` дотор локал байсан (`likePattern`) ба хуулбар үүсэхээс
 *    сэргийлж энд шилжүүлэв ✓
 */
export function likePattern(term) {
  return `%${String(term ?? '').replace(/[\\%_]/g, (ch) => `\\${ch}`)}%`;
}

/**
 * 🚙 `or()`-д орох аюулгүй утга — PostgREST-ийн шүүлтэн мод (`logic tree`)-ыг
 * эвдэх тэмдэгтүүдийг ЗАЙ болгоно: `,` `(` `)` `:` `"` `\`
 *
 * ⚠️ ЯАГААД: `or=(attrs->>model.ilike.%Prius (30)%,…)` гэх мэт утга нь
 *    хаалтыг тэнцвэргүй болгож, PostgREST `400 Bad Request` буцаана ✗
 *    (хайлтын хайрцгийн ИЖИЛ хамгаалалт — `lib/queries.js` ✓)
 * ⚠️ Хайлт нь `ilike %…%` (бүрэн бус хайлт) тул тэмдэгтийг зай болгох нь
 *    утга алдагдана гэсэн үг БИШ — «Prius (30)» нь «Prius  30 » болж
 *    `%Prius 30 %`-ээр хайгдана (ойролцоо үр дүн ✓)
 */
export function orSafeAttrValue(value) {
  return normalizeAttrValue(value).replace(/[,():"\\]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * 🔎 ОЛОН УТГАТАЙ, ХАЙЛТТАЙ (текст) талбарын `or()` илэрхийллүүд —
 * тестээр түгжихэд зориулсан ЦЭВЭР жагсаалт:
 *   ['Prius 30','Harrier'] → ['attrs->>model.ilike.%Prius 30%',
 *                             'attrs->>model.ilike.%Harrier%']
 */
export function attrLikeExpressions(key, list) {
  return parseAttrList(list).map(
    (v) => `attrs->>${key}.ilike.${likePattern(orSafeAttrValue(v))}`,
  );
}

/**
 * 🔎🚙 ХАЙЛТТАЙ ТЕКСТ талбарын ОЛОН СОНГОЛТ (2026-10-04 (36)).
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «машины загвараас олоныг сонгох боломжтой болго».
 *
 * ⚠️ ЯАГААД `in.()` БИШ ВЭ: 🚙 «Загвар» нь `filterable` текст тул гэрээ нь
 *    `ilike %…%` — хэрэглэгч «pri» гэж БҮРЭН БУС бичихэд ч «Prius 30/40»
 *    олдоно ✓. `attrs->>model=in.("pri")` болбол бүрэн тэнцэл шаардаж,
 *    0 үр дүн гарах байв ✗ (өнгө/хайрцаг нь ЖАГСААЛТААС сонгодог тул
 *    тэнд `in.()` зөв — ялгааг санах хэрэгтэй ✓)
 *
 *   ['Prius 30']            → `attrs->>model=ilike.%Prius 30%`
 *                             ⚠️ СКАЛЯР замтай ЯГ ИЖИЛ — хуучин линк
 *                             (`?attr_model=Prius 30`) ижил query үүсгэнэ ✓
 *   ['Prius 30','Harrier']  → `or=(attrs->>model.ilike.%Prius 30%,
 *                                  attrs->>model.ilike.%Harrier%)`  (OR ✓)
 *   []                      → шүүлт ХИЙХГҮЙ (хуучин зан ✓)
 *
 * ⚠️ `.or()` нь дээд түвшний бусад шүүлттэй `AND` болж холбогдоно
 *    (`section`, `price`, `brand` … хэвээрээ ✓)
 */
export function applyAttrMultiLikeFilter(query, key, list) {
  const values = parseAttrList(list);
  if (!values.length) return query;
  //  ① НЭГ утга — бүрэн скаляр зам (код нэг л замтай байхын тулд `or()`
  //     ашиглахгүй; үр дүн нь `attrs->>key=ilike.%v%` ЯГ ижил ✓)
  if (values.length === 1) {
    query.ilike(`attrs->>${key}`, likePattern(values[0]));
    return query;
  }
  //  ② ОЛОН утга — `or=(…)` (аюулгүй болгосон утгууд ✓)
  query.or(attrLikeExpressions(key, values).join(','));
  return query;
}

