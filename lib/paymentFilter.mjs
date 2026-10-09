// ============================================================
// paymentFilter.mjs — «ТӨЛБӨРИЙН НӨХЦӨЛ» (2026-10-03)
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Төлбөрийн нөхцөлийг Үл хөдлөх зарна,
// Автомашин зарна гэсэн дээр ХАЙХ хэсэгт гардаг болгоё. Зар оруулах үед
// хэрэглэгч үүнийг сонгож өгөх ёстой. Олон сонголт хийж байгаа боломж…»
//   ⇒ жишиг сайтын «Төлбөрийн нөхцөл» (Хувь лизингээр · Бэлэн төлөлтөөр ·
//     Банкны зээлээр · Бартер сонирхоно) — ☑ CHECKBOX шиг ОЛНООР сонгогдоно
//
// ЯАГААД ТУСДАА МОДУЛЬ ВЭ:
//   `lib/roomFilter.mjs`-ийн ЯГ ИЖИЛ хэв маяг — ЯМАР Ч импортгүй ЦЭВЭР
//   функцууд тул `scripts/test-payments.mjs` нь Node-оор ШУУД ачаалж,
//   ХУУЧИР (fake) PostgREST builder-оор яг ямар query мөр үүсэхийг түгждэг ✓
//
// ⚠️ НЭГ ЭХ СУРВАЛЖ: UI (`components/HomeClient.jsx`,
//    `components/AddListingClient.jsx`), URL (`?payment=lease,cash`),
//    DB (`lib/queries.js` → `applyPaymentFilter`) ба зарын дэлгэрэнгүй
//    хуудас (`lib/locationData.js → getAttrRows`) БҮГД энэ модулийг дуудна
//    — дүрэм нэг газар бичигдвэл нэг нь мартагдахгүй ✓
//
// ⚙️ ХАДГАЛАХ ФОРМАТ (DB):
//   `listings.attrs` (jsonb) доторх `payment_terms` МАССИВ:
//     { "payment_terms": ["lease", "barter"] }
//   ⚠️ ЯАГААД МАССИВ ВЭ: хэрэглэгч ОЛОН нөхцөл зэрэг сонгоно
//      (ж: «Хувь лизингээр» БА «Бартер сонирхоно») — нэг талбарт олон утга
//      хийх цорын ганц цэвэр зам ✓ (өрөөний тоо `rooms` массив болсонтой ижил)
//   ⚠️ ЯАГААД `'lease'` (ASCII код) ВЭ: утга нь URL, jsonb шүүлт ба
//      breadcrumb-д явдаг тул кирилл/таслалт/зай агуулахгүй БОТОЙ байх
//      ёстой — шошго (монгол нэр) нь зөвхөн `PAYMENT_OPTIONS`-д ✓
//      (`roomFilter.mjs`-ийн '1'…'5' кодтой ЯГ ИЖИЛ зарчим)
// ============================================================

/**
 * jsonb доторх МАССИВЫН түлхүүр. ⚠️ `lib/queries.js` (шүүлт),
 * `components/AddListingClient.jsx` (хадгалалт) хоёулаа ҮҮНИЙГ ашиглана —
 * мөрөнд `'payment_terms'` гэж ДАХИН бичихгүй (нэг эх сурвалж ✓)
 */
export const PAYMENT_ATTR_KEY = 'payment_terms';

/**
 * Хадгалагдах УТГУУД (кодууд) — ⚠️ URL-ийн `?payment=…`, jsonb-ийн
 * `attrs.payment_terms` МАССИВ ба UI-ийн чип бүгд ЭДГЭЭРИЙГ ашиглана.
 */
export const PAYMENT_VALUES = ['lease', 'cash', 'loan', 'barter'];

/** «Хувь лизингээр» — хувийн (лизинг) төлбөрийн код */
export const PAYMENT_LEASE = 'lease';
/** «Бэлэн төлөлтөөр» — бэлэн мөнгөөр */
export const PAYMENT_CASH = 'cash';
/** «Банкны зээлээр» — банкны ипотек/зээл */
export const PAYMENT_LOAN = 'loan';
/** «Бартер сонирхоно» — бараа/эд хөрөнгөөр солилцох санал (жишиг сайтын шошго) */
export const PAYMENT_BARTER = 'barter';

/**
 * UI-ийн сонголтууд — ЭРЭМБЭЛЭЛ нь жишиг сайтын «Төлбөрийн нөхцөл» ☑
 * блоктой ЯГ ИЖИЛ (2 баганат grid нь МӨРӨӨР дүүрдэг тул зүүн багана:
 * Хувь лизингээр → Банкны зээлээр, баруун багана: Бэлэн төлөлтөөр →
 * Бартер сонирхоно болно ⇒ мөр дагасан дараалал):
 *   ① Хувь лизингээр  ② Бэлэн төлөлтөөр
 *   ③ Банкны зээлээр  ④ Бартер сонирхоно
 * ⚠️ `value` нь DB/URL-ийн КОД, `label` нь хэрэглэгчид харагдах МОНГОЛ нэр —
 *    хоёрыг ХОЛИХГҮЙ (шошгыг сольсон ч хуучин зар эвдрэхгүй ✓)
 * ⚠️ `icon` нь UI-д ОДОО ХАРАГДАХГҮЙ (2026-10-03 (6) — хэрэглэгчийн заавар:
 *    жишиг сайтын ☑ хэв нь ЗӨВХӨН шошготой ✓). Гэхдээ утга нь хэвээр
 *    (`paymentOptionIcon`) — зарын дэлгэрэнгүй мөр (`locationData.js`
 *    «💳 Төлбөрийн нөхцөл») ба ирээдүйн UI-д хэрэгтэй ✓
 */
export const PAYMENT_OPTIONS = [
  { value: PAYMENT_LEASE, label: 'Хувь лизингээр', icon: '💳' },
  { value: PAYMENT_CASH, label: 'Бэлэн төлөлтөөр', icon: '💵' },
  { value: PAYMENT_LOAN, label: 'Банкны зээлээр', icon: '🏦' },
  { value: PAYMENT_BARTER, label: 'Бартер сонирхоно', icon: '🔄' },
];

/**
 * Энэ хэсэгт «Төлбөрийн нөхцөл» БАЙХ ЭСЭХ.
 * ⚠️ ЗӨВХӨН 2 хэсэгт (хэрэглэгчийн хүсэлт):
 *   • `real-estate` — «Үл хөдлөх зарна» (түрээслүүлнэ дээр ч харагдана —
 *      лизинг/зээл гэсэн ойлголт түрээсийн зарт ч хэрэгтэй ✓)
 *   • `auto`        — «Автомашин зарна»
 *   Бусад (`jobs`, `computers`, `goods`, `services`) → `false`
 *   ⚠️ `'all'` (хэсэг сонгоогүй) → `false`: «Бүх зар» дэлгэцэнд аль ч
 *      хэсгийн зар холилдсон тул шүүлт утгагүй ✗
 */
export const PAYMENT_SECTIONS = ['real-estate', 'auto'];

/** Хэсэгт төлбөрийн нөхцөл байх эсэх (`'real-estate'` | `'auto'`) */
export function hasPaymentTerms(section) {
  return PAYMENT_SECTIONS.includes(String(section ?? '').trim());
}

/** Утга нь хүчинтэй код мөн эсэх (`'lease'`…`'barter'`) */
export function isPaymentValue(value) {
  return PAYMENT_VALUES.includes(String(value ?? '').trim().toLowerCase());
}

/**
 * Нэг утгыг ЦЭВЭРЛЭНЭ — `'lease'`, `' LEASE '` → `'lease'`;
 * хүчингүй (`'abc'`, `''`, `null`, `'5'`) бол `''`.
 * ⚠️ Зөвхөн БАГА үсэг рүү хөрвүүлнэ (`toLowerCase`) — гараар бичсэн
 *    линк (`?payment=LEASE`) ч ажиллана ✓
 */
export function normalizePaymentValue(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return PAYMENT_VALUES.includes(v) ? v : '';
}

/**
 * URL/массивын олон утгыг ХҮЧИНТЭЙ, ЭРЭМБЭТЭЙ, ДАВХЦАЛГҮЙ массив болгоно.
 *   'cash,lease' · ['lease','cash'] · 'lease' → ['lease','cash']
 * ⚠️ ХООСОН/хүчингүй утгууд (`''`, `'abc'`) ЧИМЭЭГҮЙ хасагдана — эс бөгөөс
 *    `?payment=,,` гэх мэт эвдэрсэн линк query-г унагаж болно ✗
 * ⚠️ Эрэмбэ нь ЗААВАЛ `PAYMENT_VALUES` — ингэснээр `?payment=cash,lease`
 *    ба `?payment=lease,cash` НЭГ л шүүлт болж, URL тогтвортой байна ✓
 */
export function parsePaymentList(raw) {
  const parts = Array.isArray(raw) ? raw : String(raw ?? '').split(',');
  const picked = new Set();
  parts.forEach((p) => {
    const v = normalizePaymentValue(p);
    if (v) picked.add(v);
  });
  return PAYMENT_VALUES.filter((v) => picked.has(v));
}

/** URL-ийн утга — `['lease','cash']` → `'lease,cash'`; хоосон бол `''` */
export function paymentsUrlValue(list) {
  return parsePaymentList(list).join(',');
}

/** Хоосон эсэх (`[]`, `''`, `null` → `true`) */
export function isPaymentsEmpty(list) {
  return parsePaymentList(list).length === 0;
}

/** Сонгосон тоо (чип ба блокийн толгой дээрх «N сонгосон») */
export function countPayments(list) {
  return parsePaymentList(list).length;
}

/** Нэг кодын шошго: `'lease'` → `'Хувь лизингээр'`; хүчингүй бол `''` */
export function paymentOptionLabel(value) {
  const v = normalizePaymentValue(value);
  const o = PAYMENT_OPTIONS.find((x) => x.value === v);
  return o ? o.label : '';
}

/** Нэг кодын icon: `'lease'` → `'💳'`; хүчингүй бол `''` */
export function paymentOptionIcon(value) {
  const v = normalizePaymentValue(value);
  const o = PAYMENT_OPTIONS.find((x) => x.value === v);
  return o ? o.icon : '';
}

/**
 * ОЛОН утгын шошго — актив чип ба зарын дэлгэрэнгүй хуудсанд:
 *   ['lease']        → 'Хувь лизингээр'
 *   ['lease','cash'] → 'Хувь лизингээр, Бэлэн төлөлтөөр'
 * ⚠️ Дөрөв бүгд сонгогдвол урт мөр гарна — гэхдээ «бүгд» гэж товчлох нь
 *    ХУДАЛ мэдээлэл өгнө (шошго нь үргэлж бодит утгыг хэлнэ ✓)
 */
export function paymentsFilterLabel(list) {
  const arr = parsePaymentList(list);
  if (!arr.length) return '';
  return arr.map(paymentOptionLabel).join(', ');
}

/**
 * Нэг утгыг сонгох/арилгах (☑ checkbox — `togglePaymentValue` нь `checked`-ийг
 * эсрэгээр эргүүлж, массивт нэмэх/хасахыг ШИЙДНЭ ✓).
 * ⚠️ ХООСОН массив руу буцахыг ЗӨВШӨӨРНӨ — «бүгдийг арилгасан» нь
 *    «шүүлт байхгүй» гэсэн үг ✓
 */
export function togglePaymentValue(list, value) {
  const v = normalizePaymentValue(value);
  const arr = parsePaymentList(list);
  if (!v) return arr;
  return arr.includes(v) ? arr.filter((x) => x !== v) : parsePaymentList([...arr, v]);
}

/**
 * «Төлбөрийн нөхцөл» шүүлтийн ТОДОРХОЙЛОЛТ (тусдаа цэвэр функц —
 * `scripts/test-payments.mjs` нь ЯГ үүнийг шалгана):
 *   []               → { mode: 'none' }         ← шүүлт хийхгүй
 *   ['lease']        → { mode: 'one', values: ['lease'] }
 *   ['lease','cash'] → { mode: 'any', values: ['lease','cash'] }  ← OR
 *
 * ⚠️ ОЛОН сонголт нь **OR** (жишиг сайтын checkbox-той ЯГ ИЖИЛ):
 *    «Хувь лизингээр ЭСВЭЛ Бэлэн төлөлтөөр» сонгосон зарууд гарна.
 *    AND (бүгд бий) болгож болох байсан ч хэрэглэгч «аль нэг нь тохирох
 *    зарыг» хайдаг тул OR нь зөв ✓ (өрөөний шүүлтийн нэгтгэлтэй ижил
 *    зарчим: `lib/roomFilter.mjs → roomsFilterDescriptor`)
 */
export function paymentsFilterDescriptor(list) {
  const values = parsePaymentList(list);
  if (!values.length) return { mode: 'none' };
  return { mode: values.length === 1 ? 'one' : 'any', values };
}

/**
 * PostgREST-ийн `cs` (contains) хэлбэрийн JSON мөр:
 *   `{"payment_terms":["lease"]}`
 *
 * ⚠️ ЯАГААД `cs` ВЭ (2026-10-03, БОДИТ DB дээр туршиж батлав):
 *    `attrs.payment_terms` нь МАССИВ тул `attrs->>payment_terms` (текст)
 *    харьцуулалт ажиллахгүй ✗. PostgREST-ийн jsonb containment
 *    (`attrs=cs.{"payment_terms":["lease"]}`) нь «энэ утга массивт БАЙНА»
 *    гэсэн утгаар мөр бүрээр шүүнэ ✓ — `attrs->>brand=eq.…`-той ижил хурд
 *    (GIN индекс `jsonb_path_ops`, 0016_sections.sql) ба аюулгүй
 *    (утга нь зөвхөн `PAYMENT_VALUES`-ийн ASCII код → таслал/хаалт/
 *    хашилт орох ЯМАР Ч боломжгүй ✓)
 *
 * ⚠️ ЯАГААД НЭГ ЭЛЕМЕНТТЭЙ МАССИВ ВЭ: `.or()`-ийн мөрөнд таслал (**`,`**)
 *    нь НӨХЦӨЛИЙН ТУСГААРЛАГЧ тул `{"payment_terms":["a","b"]}` гэж
 *    бичихэд PostgREST мөрийг ХОЁР хувааж `22P02 invalid input syntax
 *    for type json` алдаа өгнө ✗ (бодит DB дээр туршиж батлав). Нэг
 *    элементтэй массив дотор таслал БАЙХГҮЙ тул ямар ч алдаа гарахгүй ✓
 */
export function paymentContainsJson(value) {
  return JSON.stringify({ [PAYMENT_ATTR_KEY]: [normalizePaymentValue(value)] });
}

/**
 * PostgREST-ийн query builder дээр шүүлтийг ШУУД ХЭРЭГЛЭНЭ
 * (`lib/queries.js → applyListingFilters` дуудна).
 *   • нэг утга  → `query.contains('attrs', { payment_terms: ['lease'] })`
 *                 ⇒ `attrs=cs.{"payment_terms":["lease"]}`
 *   • олон утга → `query.or('attrs.cs.{"payment_terms":["lease"]},attrs.cs.{"payment_terms":["cash"]}')`
 *                 ⇒ `and=(or(attrs @> …, attrs @> …), …бусад шүүлт)`
 *
 * ⚠️ `.or()` нь дээд түвшний бусад шүүлттэй `AND` болж холбогдоно
 *    (`section`, `category`, `price`, `rooms` … хэвээрээ ✓)
 * ⚠️ Хоосон (`[]`) үед шүүлт ХИЙХГҮЙ (mode: 'none') — «Бүх зар» ✓
 * ⚠️ МЕХАНИК НЬ ЭНД байгаа нь ЧУХАЛ: шүүлтийн мөр амархан эвдэрдэг тул
 *    `scripts/test-payments.mjs` нь ХУУЧИР Builder-оор дамжуулж, яг ямар
 *    мөр үүсэхийг түгждэг ✓ (`scripts/cdp-payments.mjs` нь бодит UI-г шалгана)
 *
 * @param {{contains: Function, or: Function}} query — PostgREST builder
 * @param {string|Array<string>} list — сонгосон кодууд
 * @returns {*} дамжуулсан `query` (гинжин дуудлагад тохиромжтой)
 */
export function applyPaymentFilter(query, list) {
  const d = paymentsFilterDescriptor(list);
  if (d.mode === 'one') {
    query.contains('attrs', { [PAYMENT_ATTR_KEY]: [d.values[0]] });
  } else if (d.mode === 'any') {
    query.or(d.values.map((v) => `attrs.cs.${paymentContainsJson(v)}`).join(','));
  }
  return query;
}

/**
 * `attrs` (jsonb) объектод хадгалах МАССИВ — хоосон/дэмжигдэхгүй бол `null`
 * (түлхүүрийг УСТГАНА, «хоосон массив» гэж хадгалахгүй ✓).
 *
 * ⚠️ `null` нь payload-д `delete` болдог (`lib/queries.js →
 *    listingPayloadToRow`) тул хуучин зарын `attrs` хоггүй үлдэнэ ✓
 * ⚠️ Хэсэг нь дэмжихгүй (`hasPaymentTerms === false`) бол БАС `null` —
 *    ингэснээр хэрэглэгч үл хөдлөх → ажил руу сольсон ч хуучин утга
 *    «үхсэн» үлдэхгүй ✓
 */
export function paymentTermsForAttrs(section, list) {
  if (!hasPaymentTerms(section)) return null;
  const arr = parsePaymentList(list);
  return arr.length ? arr : null;
}
