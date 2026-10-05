// ============================================================
// 🔎 ХАЙЛТЫН ТЕКСТИЙН ЛОГИК (цэвэр модуль — Node/React аль алинд)
//
// ЯАГААД ТУСДАА МОДУЛЬ ВЭ:
//   Хайлтын хайрцаг нь `lib/queries.js`-д PostgREST-ийн `or()`/`and()`
//   логик мөрийг угсардаг. Тэр мөр нь ХАМГИЙН амархан эвдэрдэг зүйл
//   (таслал = тусгаарлагч, хашилт/хаалт = логик мод) тул түүнийг ЭНД
//   тусгаарлаж, ЦЭВЭР функцээр бичиж, тестээр түгждэг ✓ (жишээ нь
//   `lib/roomFilter.mjs`, `lib/paymentFilter.mjs`-ийн ЯГ ижил зарчим).
//
// 🎯 ХИЙЦ (2026-10-05):
//   ① `title` ба `description` баганыг ХАЙЛТАД ОРУУЛАВ — өмнө нь ҮНДСЭН
//      хайлт нь зөвхөн property_type/district/city/khoroo/contact_name/
//      brand/model-ыг л хайдаг байв ⇒ хэрэглэгч зарын ӨӨРИЙН бичсэн нэр
//      («Цемент», «3 өрөө байр») -ээр хайхад 0 үр дүн гардаг ✗ (хэрэглэгчийн
//      гомдол + жишиг зургийн гол шаардлага).
//   ② ОЛОН ҮГТЭЙ хайлт — «3 өрөө байр» гэж бичихэд БҮХ үг тохирсон зарууд
//      гарна (үг бүр аль нэг талбарт олдох нь хангалттай): `and(or(…),or(…))`.
//      ⏳ Өмнө нь бүхэл мөр нэг тасралтгүй дэд мөр (`%3 өрөө байр%`) байхыг
//      шаарддаг байв ⇒ үг ХООРОНДОО өөр эрэмбээр байвал олдохгүй ✗
//   ③ `pg_trgm` GIN индекс (`0028_listing_search.sql`) тул `ilike %…%` нь
//      500+ зар дээр ч секундээс бага хугацаанд ажиллана ✓
//   ④ 🔇 (2026-10-05 (48)) `description` (чөлөөт текст) нь ЗӨВХӨН
//      ≥ `SEARCH_DESC_MIN_CHARS` тэмдэгттэй үгэнд хайгдана — `ilike %сай%`
//      нь «сайхан»/«сайн»-ыг татаж, хайлтын үр дүнг «бохирдуулж» байв ✗
//      (хэрэглэгчийн гомдол; дэлгэрэнгыг `SEARCH_DESC_MIN_CHARS`-ээс уншина ✓)
//
// ⚠️ СИНТАКСИС ХАМГААЛАЛТ (2026-09-29-ээс ХЭВЭЭР): PostgREST-ийн `or()`-д
//    `,` `(` `)` `:` `"` `\` орвол логик мод задалж хайлт БҮТЭН унана ✗
//    (ж: «Баянгол, 5-р хороо» → HTTP 400) ⇒ тэдгээрийг ЗАЙ болгоно.
// ============================================================

/** Олон үгтэй хайлтад ЗӨВХӨН эхний хэдэн үгийг авна (query мөр хэт урт
 *  болж PostgREST-ийн хязгаарт хүрэхээс сэргийлнэ). */
export const SEARCH_MAX_TOKENS = 4;

/** 🔎 ЧӨЛӨӨТ ТЕКСТ (`description`) хайхад шаардагдах ХАМГИЙН БОГИНО үг
 *  (код-цэгээр).
 *
 *  ⚠️ ЯАГААД ХЭРЭГТЭЙ ВЭ (2026-10-05 (48), хэрэглэгчийн гомдол):
 *     `ilike %…%` нь ДЭД МӨР хайлт тул 2–3 тэмдэгтэй хэсэг нь урт үгийн
 *     ДОТОР санамсаргүй тохирдог:
 *       «сай»  → «сайхан», «сайн», «сайтар…»  ✗ (хэрэглэгч: «сай гэж хайхад
 *                                                 сайхан гэсэн тайлбартай зар
 *                                                 гарч байгаа нь тохиромжгүй»)
 *       «бай»  → «байгаа», «байр», «байхгүй…» ✗
 *     Монгол хэлний УТГА УЧИРТАЙ үг бараг бүгд 4+ тэмдэгт (байр · цемент ·
 *     сайхан · орон сууц) тул 4 нь «хэрэглэгч бодит үг бичсэн үү» гэдгийн
 *     найдвартай хил ✓. ⚠️ Богино үгэнд `title` (зарын НЭР) ба бүтэцтэй
 *     талбарууд ХЭВЭЭР хайгдана — тэдгээр нь БОГИНО, цэвэр утгатай
 *     (ж: «3 өрөө», «Говь», `attrs->>brand` = «Kia») ✓ */
export const SEARCH_DESC_MIN_CHARS = 4;

/**
 * Үндсэн хайлтын ТАЛБАРУУД — ⚠️ НЭГ ЭХ СУРВАЛЖ.
 *
 * · `title` / `description` — зарын чөлөөт текст (2026-10-05-нд НЭМЭГДЭВ)
 * · `property_type` / `district` / `city` / `khoroo` / `contact_name` —
 *   бүтэцтэй талбарууд (хэрэглэгч «Баянгол», «орон сууц» гэж хайна)
 * · `attrs->>brand` / `attrs->>model` — 🚗 авто/🏷️ брэнд (jsonb, `->>`)
 *
 * ⚠️ `phone` нь ЭНД БАЙХГҮЙ — утас нь тусдаа (зөвхөн цифрээр, `lib/phoneEmail.js`
 *    → `phoneSearchPatterns`) ба `extra`-аар OR-д нэмэгдэнэ ✓
 */
export const SEARCH_FIELDS = [
  'title',
  'description',
  'property_type',
  'district',
  'city',
  'khoroo',
  'contact_name',
  'attrs->>brand',
  'attrs->>model',
];

/** Хайлтын утгыг цэвэрлэ: string, илүүдэл зай нэгтгэж, хоёр талыг таслана. */
export function normalizeSearch(q) {
  return String(q == null ? '' : q).replace(/\s+/g, ' ').trim();
}

/**
 * PostgREST-ийн логик мод эвдэх тэмдэгтүүдийг (`or()`-ийн синтаксис) ЗАЙ
 * болгоно. ⚠️ Энэ нь `lib/queries.js`-ийн 2026-09-29-ээс хойшхи дүрэмтэй
 * ЯГ ИЖИЛ (хамгаалалт ХЭВЭЭР ✓).
 */
export function sanitizeSearchTerm(q) {
  return String(q == null ? '' : q)
    .replace(/[,():"\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Хайлтын мөрийг ҮГ болгон задалж, давхардлыг хасна (`SEARCH_MAX_TOKENS`
 * хүртэл). Том/жижиг үсэг ялгахгүй давхардал нь нэг л удаа орно.
 * @returns {string[]} — хоосон бол `[]`
 */
export function searchTokens(q) {
  const safe = sanitizeSearchTerm(normalizeSearch(q));
  if (!safe) return [];
  const seen = new Set();
  const out = [];
  for (const raw of safe.split(' ')) {
    const tok = raw.trim();
    if (!tok) continue;
    const key = tok.toLowerCase();
    if (seen.has(key)) continue; // «Байр байр» → нэг л удаа
    seen.add(key);
    out.push(tok);
    if (out.length >= SEARCH_MAX_TOKENS) break;
  }
  return out;
}

/**
 * 🔎 Тухайн ҮГЭЭР хайх ТАЛБАРУУД.
 *
 * ⚠️ `description` (чөлөөт текст) нь ЗӨВХӨН «бодит үг» (≥
 *    `SEARCH_DESC_MIN_CHARS`) дээр хайгдана — эс бөгөөс 3 тэмдэгтэй хэсэг
 *    урт үгийн дотор санамсаргүй тохирч, хайлтын үр дүн «бохирдоно» ✗
 *    (дэлгэрэнгыг `SEARCH_DESC_MIN_CHARS`-ийн тайлбараас уншина).
 *
 * @param {string} token
 * @param {string[]} [fields]
 * @returns {string[]} — шинэ массив (эх `SEARCH_FIELDS` ХӨНДӨӨГДӨХГҮЙ ✓)
 */
export function searchableFields(token, fields = SEARCH_FIELDS) {
  const len = [...String(token == null ? '' : token)].length; // код-цэгээр ✓
  if (len >= SEARCH_DESC_MIN_CHARS) return fields;
  return fields.filter((f) => f !== 'description');
}

/** Нэг үгийг талбар бүр дээр `ilike %…%` болгоно (OR-ийн гишүүд). */
function ilikeList(fields, token) {
  return searchableFields(token, fields).map((f) => `${f}.ilike.%${token}%`);
}

/**
 * 🔎 PostgREST-ийн `.or()`-т ШУУД өгөх логик мөрийг угсарна.
 *
 * ДҮРЭМ:
 *   • 0 үг, `extra` хоосон      → `null` (шүүлт ХИЙХГҮЙ ✓)
 *   • 1 үг                      → `or(f1.ilike.%x%,f2.ilike.%x%,…)` — бүх
 *                                  талбар ХАМТ (энгийн OR жагсаалт)
 *   • 2+ үг                     → `and(or(…үг1…),or(…үг2…))` — БҮХ үг
 *                                  тохирсон зарууд (талбар нь OR)
 *   • `extra` (утасны хэв маяг) → жагсаалтад OR-оор ЗАЛГАНА:
 *                                  `and(…),phone.ilike.%p%`
 *
 * ⚠️ `extra` нь AND БИШ, OR — «эсвэл утасны дугаараар таарсан» зар ч гарна ✓
 * ⚠️ Үр дүн нь `query.or(buildSearchOr(…))` гэж дуудагдана — `.or()` нь
 *    таслалаар тусгаарлагдсан гишүүдийг OR болгож холбоно ✓
 * ⚠️ Үг тус бүрийн ТАЛБАРУУД нь `searchableFields()`-ээр нарийсна: богино
 *    (3-аас доош) үгэнд `description` ОРОХГҮЙ (2026-10-05 (48)) ⇒
 *    «сай байр» гэвэл «сай» нь зөвхөн title/бүтэцтэй талбарт, «байр» нь
 *    description-д ч хайгдана ✓
 *
 * @param {string} q                  хэрэглэгчийн бичсэн хайлт
 * @param {{fields?:string[], extra?:string[]}} [opts]
 * @returns {string|null}
 */
export function buildSearchOr(q, { fields = SEARCH_FIELDS, extra = [] } = {}) {
  const tokens = searchTokens(q);
  const extraList = (extra || []).filter((e) => e != null && String(e).trim());

  // Үггүй, утас ч таарахгүй → шүүлт хийхгүй
  if (!tokens.length && !extraList.length) return null;

  // Нэг үг (эсвэл зөвхөн утас) → энгийн OR жагсаалт
  if (tokens.length <= 1) {
    const items = tokens.length ? ilikeList(fields, tokens[0]) : [];
    items.push(...extraList);
    return items.join(',');
  }

  // Олон үг → БҮХ үг тохирно (үг бүр аль нэг талбарт — OR)
  const groups = tokens.map((t) => `or(${ilikeList(fields, t).join(',')})`);
  const andExpr = `and(${groups.join(',')})`;
  return [andExpr, ...extraList].join(',');
}
