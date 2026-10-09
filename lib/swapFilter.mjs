// ============================================================
// swapFilter.mjs — «🔄 СОЛИНО» (2026-10-09)
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Үнэ тохирно Гэсэн сонголтын баруун талд, Солино гээд
// "Үнэ тохирно" гэсэнтэй адилхан checkbox хийж өгөөч. Үүнийг автомашин болон
// Спорт бараа -> Дартс хэсэгт оруулж өгөө. Ингэхдээ энэ 2-ийн зар нэмэх
// болон, зөвхөн энэ 2-ийн хайлт дээр оруулж өгөөч».
//
// ⚠️ ЯАГААД ТУСДАА МОДУЛЬ ВЭ (`lib/paymentFilter.mjs`-ийн ЯГ ИЖИЛ хэв маяг):
//    ЯМАР Ч импортгүй ЦЭВЭР функцууд тул `scripts/test-swap.mjs` нь Node-оор
//    ШУУД ачаалж, ХУУЧИР (fake) PostgREST builder-оор яг ямар query мөр
//    үүсэхийг түгждэг ✓
//
// 📐 4 ДАВХАРГА — бүгд ЭНЭ НЭГ модулиас (дүрэм давхар бичигдэхгүй ✓):
//   ① ФОРМ (`components/AddListingClient.jsx`) — «🤝 Үнэ тохирно»-гийн ЯГ
//      БАРУУН талд ☑ checkbox (зөвхөн 🚗 автомашин ба ⚽ «Дартс»)
//   ② ХАЙЛТ (`components/HomeClient.jsx`) — sidebar-ийн «🔄 Солино» чип
//      (`filters.swap` BOOLEAN, URL `?swap=1`)
//   ③ DB (`lib/queries.js → applySwapFilter`) — `attrs->>swap=eq.yes`
//   ④ ДЭЛГЭРЭНГҮЙ (`components/ListingDetailClient.jsx`) — үнийн доорх мөр
//
// ⚙️ ХАДГАЛАХ ФОРМАТ (DB): `listings.attrs` (jsonb, 0016) доторх
//      { "swap": "yes" }
//   ⚠️ ЯАГААД `'yes'` ВЭ: «🤝 Үнэ тохирно» нь `attrs.negotiable = 'yes'` гэж
//      ХАДГАЛДАГ (`components/AddListingClient.jsx`) — ижил хэв баривал нэг л
//      төрлийн утга үүснэ (boolean/`true`/`1` холилдохгүй ✓) ба
//      `attrs->>swap` (ТЕКСТ) шүүлт нь нэмэлт cast шаардахгүй ✓
//   ⚠️ ЯАГААД `attrs` дотор ВЭ (ШИНЭ БАГАНА БИШ): migration ХЭРЭГГҮЙ —
//      `attrs` нь 0016-д аль хэдийн `jsonb` + GIN индекстэй тул **MIGRATION 0** ✓
//
// ============================================================

/** jsonb доторх түлхүүр — ⚠️ мөрөнд `'swap'` гэж ДАХИН бичихгүй (нэг эх сурвалж) */
export const SWAP_ATTR_KEY = 'swap';

/**
 * Хадгалагдах УТГА — `'yes'`.
 * ⚠️ `attrs.negotiable`-ийн ЯГ ИЖИЛ утга (`AddListingClient` нь унтраах үед
 *    түлхүүрийг БҮРЭН УСТГАДАГ тул «`'no'`» гэсэн утга ХЭЗЭЭ Ч үүсэхгүй ✓)
 */
export const SWAP_VALUE = 'yes';

/** UI-ийн шошго — форм ☑ · хайлтын чип · зарын дэлгэрэнгүй, БҮГД энэ нэрийг ашиглана */
export const SWAP_LABEL = 'Солино';

/** 🔄 Зарын дэлгэрэнгүй хуудсанд гарах дүрс (🤝-тай ижил хэв) */
export const SWAP_ICON = '🔄';

/**
 * URL-ийн утга — `?swap=1`.
 * ⚠️ ЯАГААД `1` ВЭ: шүүлт нь BOOLEAN (нэг л чип) тул `?swap=yes`/`?swap=true`
 *    гэж олон хэлбэрээр бичих шаардлагагүй — богино, цэвэр линк ✓
 *    (`parseSwapParam` нь хуучин/гараар бичсэн `yes`/`true`-г Ч уншина ✓)
 */
export const SWAP_URL_VALUE = '1';

/** 🚗 ЭНЭ хэсгийн БҮХ дэд төрөлд солилцоо боломжтой (хязгаарлалтгүй) */
export const SWAP_SECTION = 'auto';

/** ⚽ Энэ хэсэгт ЗӨВХӨН доорх дэд төрлүүдэд (`SWAP_SUBTYPES`) боломжтой */
export const SWAP_SUBTYPE_SECTION = 'hobby';

/**
 * ⚽ «Спорт бараа» доторх солилцоо боломжтой дэд төрлүүд.
 * ⚠️ Утга нь `lib/locationData.js → HOBBY_SUBTYPES` ба
 *    `listings.property_type` (DB) хоёулаа ашигладаг ЯГ ТЭР текст —
 *    зөвхөн ХАРАГДАХ нэр биш, шүүлт/формд ч ижил мөрөөр таарна ✓
 *    (🛏 «Ор болдог эсэх» → `SOFA_BED_SUBTYPES`-ийн ЯГ ИЖИЛ зарчим)
 */
export const SWAP_SUBTYPES = ['Дартс'];


/**
 * 🎯 ХАМГИЙН ЧУХАЛ ДҮРЭМ — «энэ хэсэг/дэд төрөлд 🔄 Солино БАЙХ ЭСЭХ».
 *
 *   🚗 `auto`      → БҮХ дэд төрөлд (мөн дэд төрөл сонгоогүй үед ч) ✓
 *   ⚽ `hobby`     → ЗӨВХӨН `subtype === 'Дартс'` (дэд төрөл сонгоогүй бол ✗)
 *   бусад хэсэг    → ХЭЗЭЭ Ч ✗
 *
 * ⚠️ ЯАГААД `hobby` дээр дэд төрөл ШААРДАХ ВЭ: солилцооны санал нь
 *    «Дартс»-д л утгатай (бусад дэд төрөлд утга нь БАЙХГҮЙ) — дэд төрөл
 *    сонгоогүй үед шүүлт гаргавал 19 дэд төрлийн дээгүүр хэрэглэгч
 *    «0 үр дүн» харах байсан ✗ (`getAttrFilters(section, subtype)` нь
 *    `onlySubtypes` талбарыг ЯГ ингэж шалгадаг ✓ — нэг хэв).
 *    ⚠️ Форм дээр ч ижил: дэд төрөл нь ЗААВАЛ сонгогддог («Зарын төрлөө
 *    сонгоно уу») тул үнийн алхамд хүрэхэд дүрэм аль хэдийн хангагдсан ✓
 *
 * @param {string} section — `listings.section` (`auto`/`hobby`/…)
 * @param {string} [subtype] — сонгосон дэд төрөл (`listings.property_type`)
 * @returns {boolean}
 */
export function supportsSwap(section, subtype = '') {
  if (section === SWAP_SECTION) return true;
  if (section === SWAP_SUBTYPE_SECTION) {
    const s = String(subtype ?? '').trim();
    return s !== '' && SWAP_SUBTYPES.includes(s);
  }
  return false;
}

/**
 * Утгыг КАНОН хэлбэрт оруулна: `'yes'` (эсвэл `true`/`1`/`'YES'`) → `'yes'`,
 * бусад (`''`/`null`/`'no'`/`'abc'`) → `''` (шүүлт ХИЙХГҮЙ ✓).
 * ⚠️ `'no'` нь ЗОРИУДААР хүчингүй — унтраасан чекбокс нь түлхүүрийг
 *    БҮРЭН УСТГАДАГ тул `'no'` гэсэн утга DB-д ХЭЗЭЭ Ч орохгүй ✓
 */
export function normalizeSwapValue(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (v === SWAP_VALUE || v === 'true' || v === '1') return SWAP_VALUE;
  return '';
}

/**
 * 🔍 ЗАР дээр тэмдэглэгдсэн эсэх (`listings.attrs.swap`).
 * ⚠️ `negotiable` (`lib/format.js → isNegotiablePrice`) шиг утгыг ТОЛЕРАНТ
 *    уншина — хуучин/гараар хийсэн `true`/`'1'` утга ч баригдана ✓
 * ⚠️ `listing` хоосон (`null`) бол `false` (алдаа шидэхгүй ✓)
 * @param {{attrs?: object}} listing
 * @returns {boolean}
 */
export function isSwapListing(listing) {
  const attrs = listing && listing.attrs;
  if (!attrs || typeof attrs !== 'object') return false;
  return normalizeSwapValue(attrs[SWAP_ATTR_KEY]) === SWAP_VALUE;
}

/**
 * 🔄 Зарын дэлгэрэнгүй/миний зарууд дээрх мөр: `'Солино'` эсвэл `''`.
 * ⚠️ Хоосон мөр ҮҮСГЭХГҮЙ (тэмдэглээгүй зарууд дээр ямар ч мөр гарахгүй ✓)
 */
export function swapLabel(listing) {
  return isSwapListing(listing) ? SWAP_LABEL : '';
}

/**
 * URL-ийн утгыг BOOLEAN болгоно (`'1'`/`'yes'`/`'true'` → `true`).
 * ⚠️ Танихгүй утга (`?swap=abc`) ЧИМЭЭГҮЙ `false` — «үл үзэгдэх шүүлт»
 *    үүсгэхгүй ✓ (`parsePaymentList`-ийн хүчингүй утга хасах дүрэмтэй ижил)
 */
export function parseSwapParam(raw) {
  return normalizeSwapValue(raw) === SWAP_VALUE;
}

/** BOOLEAN-ыг URL-ийн утга болгоно — `true` → `'1'`, `false` → `''` (бичихгүй ✓) */
export function swapUrlValue(on) {
  return on ? SWAP_URL_VALUE : '';
}

/** ☑ checkbox мэт — нэг дарж асаах/унтраах (`true` → `false`, `false` → `true`) */
export function toggleSwapValue(current) {
  return !current;
}

/**
 * `attrs` (jsonb) объектод хадгалах утга — `'yes'` эсвэл `null`.
 *   `null` нь payload-д `delete` болдог (түлхүүр БҮРЭН УСТАНА ✓).
 *
 * ⚠️ ЭНЭ ФУНКЦ ЗААВАЛ: хэрэглэгч 🔄 тэмдэглээд ДАРАА нь хэсэг/дэд төрлөө
 *    сольсон бол (ж: 🚗 → 🏠, эсвэл ⚽ «Дартс» → «Гольф») хуучин утга
 *    `attrs`-д «үхсэн» үлдэх ёсгүй ✗ — `paymentTermsForAttrs()`-ийн ЯГ
 *    ИЖИЛ зарчим (`rooms: ''`, `area: ''`-тэй ч ижил) ✓
 *
 * @param {string} section
 * @param {string} subtype
 * @param {boolean} on — форм дээрх чекбоксын төлөв
 * @returns {'yes'|null}
 */
export function swapForAttrs(section, subtype, on) {
  if (!on) return null;
  return supportsSwap(section, subtype) ? SWAP_VALUE : null;
}

/**
 * PostgREST-ийн query builder дээр шүүлтийг ШУУД ХЭРЭГЛЭНЭ
 * (`lib/queries.js → applyListingFilters` дуудна).
 *   `true`  → `query.eq('attrs->>swap', 'yes')` ⇒ `attrs->>swap=eq.yes`
 *   `false` → builder-т ОГТ хүрэхгүй (шүүлт байхгүй = «Бүх зар» ✓)
 *
 * ⚠️ Утга нь зөвхөн `SWAP_VALUE` (ASCII) — PostgREST-ийн мөрөнд таслал/
 *    хашилт орох боломжгүй тул injection аюулгүй ✓ (`negotiable`-тэй ижил)
 * ⚠️ МЕХАНИК ЭНД байгаа нь ЧУХАЛ: шүүлтийн мөр амархан эвдэрдэг тул
 *    `scripts/test-swap.mjs` нь ХУУЧИР Builder-оор дамжуулж, яг ямар мөр
 *    үүсэхийг түгждэг ✓ (`scripts/cdp-swap.mjs` нь бодит UI-г шалгана)
 *
 * @param {{eq: Function}} query — PostgREST builder
 * @param {boolean} on — шүүлт идэвхтэй эсэх
 * @returns {*} дамжуулсан `query` (гинжин дуудлагад тохиромжтой)
 */
export function applySwapFilter(query, on) {
  if (!on) return query;
  query.eq(`attrs->>${SWAP_ATTR_KEY}`, SWAP_VALUE);
  return query;
}
