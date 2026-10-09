import { PROPERTY_TYPE_ICONS, PRICE_TYPE_LABELS, getPropertyTypePathLabel, getSection } from './locationData';

// Үнийн форматлалт: 280000000 -> 280,000,000
export function formatPrice(value) {
  if (value === null || value === undefined || value === '') return '0';
  return Number(value).toLocaleString('en-US');
}

// Тоолуурын форматлалт: 1284 -> 1,284 (үзсэн/таалагдсан тоо гэх мэт)
export function formatCount(value) {
  const n = Math.round(Number(value) || 0);
  return n.toLocaleString('en-US');
}

// ============================================================
// 🔖 ЗАРЫН ДУГААР (хэрэглэгчид харагдах БОГИНО ID) — 2026-10-07
// ============================================================
// ⚠️ ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Бидний зарын id арай л урт юм аа үүнийг богино
//    болгож хэрэглэгчдэд харуулах боломж байгаа юу».
// ⚠️ `listings.id` нь **uuid** (36 тэмдэгт, ж: `a1b2c3d4-…`) — хэрэглэгчид
//    харуулахад хэт урт тул зөвхөн ЭХНИЙ 8 hex тэмдэгтийг ТОМ үсгээр
//    харуулна (`A1B2C3D4`). ⚠️ Энэ нь **зөвхөн ХАРАГДАЦ** — DB/URL/query
//    БҮГД БҮТЭН uuid-г хэвээр ашиглана ✓ (шинэ багана/migration ШААРДЛАГАГҮЙ).
// ⚠️ АДМИН ХАЙЛТТАЙ НИЙЦЭТЭЙ: `/admin/listings` нь зарыг ID-ийн эхний
//    4+ тэмдэгтээр хайдаг тул энэ богино утга нь шууд олдоно ✓.
// ⚠️ `-`/`{}` зэрэг uuid-ийн тусгаарлагчийг хасна ⇒ зөвхөн hex үлдэнэ.
export const SHORT_LISTING_ID_LENGTH = 8;

/**
 * uuid → хэрэглэгчид харагдах богино зарын дугаар (эхний 8 hex, ТОМ үсэг).
 * @param {string|null|undefined} id  зарын uuid (эсвэл дурын текст)
 * @returns {string} ж: `'a1b2c3d4-…'` → `'A1B2C3D4'`, хоосон бол `''`
 */
export function shortListingId(id) {
  const hex = String(id == null ? '' : id).replace(/[^0-9a-zA-Z]/g, '');
  return hex.slice(0, SHORT_LISTING_ID_LENGTH).toUpperCase();
}

// ============================================================
// 🤝 «ҮНЭ ТОХИРНО» — үнэ ЗААВАЛ БИШ (2026-09-29, хэрэглэгчийн хүсэлт)
// ============================================================
// ⚠️ ДҮРЭМ (хэрэглэгчийн шаардлага):
//    ① «Үнэ тохирно» нь ҮНИЙГ УСТГАХГҮЙ ✗ — үнэ бичсэн бол ХЭВЭЭР харагдана
//       (`₮1,500,000`) БА түүний ЯГ ДОР нь жижиг «Үнэ тохирно» мөр нэмэгдэнэ ✓
//    ② Тэмдэглээгүй + үнэ хоосон/0 бол зөвхөн «Үнэ тохирно» харагдана —
//       `₮0` гэж ХЭЗЭЭ Ч гарахгүй ✓
// ⚠️ ТЭМДЭГЛЭГЧ ХААНА ХАДГАЛАГДДАГ ВЭ: `listings.attrs.negotiable = 'yes'`
//    (jsonb, 0016_listing_sections.sql). Тусдаа багана НЭМЭХГҮЙ (migration 0) ✓
//    Хуучин (зөвхөн үнэ 0-тэй) зарууд ч зөв харагдана ✓
// ⚠️ ЯАГААД ТУСДАА ФУНКЦ ВЭ: үнэ нь 9 газар (карт, дэлгэрэнгүй, газрын зураг,
//    миний зарууд, админ 2, санал, любимый, статистик) харагддаг — дүрэм нэг
//    л газар байхгүй бол зарим дэлгэцэд «₮0» гарч ирнэ ✗
export const NEGOTIABLE_PRICE_LABEL = 'Үнэ тохирно';

// 💼 АЖЛЫН ЗАРТ «ҮНЭ» БИШ — ЦАЛИН (2026-10-03 (9), хэрэглэгчийн хүсэлт)
// ⚠️ Хэрэглэгч: «Жич Энд Үнэ биш Цалин байх юм шүү хавсралтыг хараарай» ⇒
//    ажлын зарын үнэ нь ЦАЛИН тул «Үнэ тохирно» → «Цалин тохиролцоно» болно ✓
export const NEGOTIABLE_SALARY_LABEL = 'Цалин тохиролцоно';

/**
 * Зарын хэлбэрээс хамаарсан «тохиролцоно» шошго — 💼 ажил → `Цалин тохиролцоно`,
 * бусад (үл хөдлөх/авто/компьютер…) → `Үнэ тохирно`.
 * ⚠️ `listing.section` байхгүй бол ХУУЧИН зан төлөв (`Үнэ тохирно`) ✓
 * ⚠️ `section === 'jobs'` нь DB-ийн тогтмол утга (нэмэлт импортгүй — ингэснээр
 *    `scripts/test-format.mjs` нь `./locationData` импортыг хасаж чадна ✓)
 */
export function negotiableLabel(listing) {
  return listing && listing.section === 'jobs'
    ? NEGOTIABLE_SALARY_LABEL
    : NEGOTIABLE_PRICE_LABEL;
}

/** Үнэ нь БОДИТ тоо (0-ээс их) эсэх — `price` нь DB-д `not null default 0` */
export function hasRealPrice(listing) {
  const raw = listing && listing.price;
  const digits = String(raw == null ? '' : raw).replace(/\D/g, '');
  return Boolean(digits) && Number(digits) > 0;
}

/**
 * Зарын үнэ «тохиролцоно» эсэх.
 *  ① `attrs.negotiable` (форм дээрх чекбокс) ② үнэ байхгүй бол ч тохиролцоно.
 * ⚠️ Загвар хоосон (`null`) бол `true` — `'₮0'` гэж ХАРУУЛАХГҮЙ ✓
 * @param {{price?: number|string, attrs?: object}} listing
 * @returns {boolean}
 */
export function isNegotiablePrice(listing) {
  if (!listing) return true;
  const attrs = listing.attrs;
  if (attrs && typeof attrs === 'object') {
    const v = attrs.negotiable;
    if (v === true || v === 'yes' || v === 'true' || v === '1') return true;
  }
  return !hasRealPrice(listing);
}

/**
 * Нэгэн жигд үнийн шошго: `₮1,500,000`, эсвэл үнэ байхгүй бол `Үнэ тохирно`.
 * ⚠️ Үнэ БИЧСЭН зарыг «Үнэ тохирно» гэж ДАРАХГҮЙ (`hasRealPrice` ✓) —
 *    тэмдэглэгчийг `negotiableNote()` нь тусад нь мөр болгож харуулна.
 */
export function priceLabel(listing) {
  return hasRealPrice(listing)
    ? `₮${formatPrice(listing.price)}`
    : negotiableLabel(listing);
}

/**
 * 📉 ТОВЧ ҮНИЙН ШОШГО — зарын КАРТ ба ДЭЛГЭРЭНГҮЙ хуудсанд
 * (🆕 2026-10-06, хэрэглэгчийн хүсэлт: «Үнийг ListingDetailClient.jsx болон
 * ListingCard дээр 760,000,000 → 760 сая ₮, 44.8 сая ₮ гэх мэтээр харуулдаг
 * болгож чадах уу»).
 *
 *   `760000000`  → `760 сая ₮`
 *   `44800000`   → `44.8 сая ₮`
 *   `2000000000` → `2 тэрбум ₮`
 *
 * ⚠️ ЯАГААД ТУСДАА ФУНКЦ ВЭ (`priceLabel`-ыг ШУУД СОЛИХГҮЙ): `priceLabel` нь
 *    мөн Excel/PDF ЭКСПОРТ (`FavoritesClient` → `lib/exporters.js`) ба админ,
 *    газрын зураг, статистик зэрэг 6+ дэлгэцэд харагддаг — тэнд ЯГ ТОО
 *    (`₮760,000,000`) байх ЁСТОЙ (экспорт дээр «760 сая» нь тооцоо/шүүлтэд
 *    тохиромжгүй ✗). Тиймээс зөвхөн КАРТ + ДЭЛГЭРЭНГҮЙ дээр энэ товч шошгыг
 *    хэрэглэнэ ✓
 * ⚠️ НЭГЖ («сая»/«тэрбум»/«мянга») нь `shortPrice()`-тэй ЯГ ИЖИЛ — ингэснээр
 *    хайлтын шүүлтийн шошго («₮150 сая – ₮1 тэрбум») хоорондоо зөрөхгүй ✓
 * ⚠️ `₮` нь ТӨГСГӨЛД (`760 сая ₮`) — хэрэглэгчийн жишээгээр ✓
 * ⚠️ `shortPrice` нь ДООР зарлагдсан ч function declaration тул hoist болно ✓
 * @param {{price?: number|string, section?: string}} listing
 * @returns {string} `760 сая ₮`, эсвэл «Үнэ тохирно»/«Цалин тохиролцоно»
 */
export function shortPriceLabel(listing) {
  return hasRealPrice(listing)
    ? `${shortPrice(listing.price)} ₮`
    : negotiableLabel(listing);
}

/**
 * ҮНИЙН ЯГ ДОР гарах нэмэлт мөр: `Үнэ тохирно`.
 * ⚠️ ЗӨВХӨН үнэ БИЧСЭН (`hasRealPrice`) БА тэмдэглэсэн үед буцаана — үнэгүй
 *    үед `priceLabel` нь өөрөө «Үнэ тохирно» гэж хэлчихсэн тул давхардахгүй ✓
 * @returns {string} `'Үнэ тохирно'` эсвэл `''` (хоосон бол мөр харагдахгүй)
 */
export function negotiableNote(listing) {
  return hasRealPrice(listing) && isNegotiablePrice(listing) ? negotiableLabel(listing) : '';
}

/**
 * ҮНИЙГ мянгатаар хувааж харуулах: '250000000' | 250000000 → '250,000,000'
 *
 * ЯАГААД ХЭРЭГТЭЙ ВЭ: урт тоог бичих үед «25000000» ба «250000000» хоёрыг
 * нүдээр ялгахад хэцүү — тэгийг буруу тоолбол үнэ 10 дахин зөрнө.
 * Мянгатын таслалт нь орны тоог шууд харагдуулна.
 *
 * ⚠️ ЗӨВХӨН ЦИФР хүлээнэ — зай, таслал, ₮ тэмдэгтийг алгасна. Ингэснээр
 *    хэрэглэгч «250 000 000» эсвэл «250,000,000» гэж буулгасан ч зөв болно.
 *    Эхний тэгүүдийг хасна ('007' → '7'). Хоосон / цифргүй бол '' буцаана.
 *
 * @param {string|number} value
 * @returns {string} — таслалтай тоо, эсвэл ''
 */
export function formatThousands(value) {
  const digits = String(value == null ? '' : value)
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('en-US');
}

/** Оронгийн тоо (тэг тоолох алдаанаас сэргийлнэ): '250000000' → 9 */
export function digitCount(value) {
  return String(value == null ? '' : value).replace(/\D/g, '').length;
}

/**
 * Товч уншигдах үнэ: 250000000 → '250 сая' · 1500000 → '1.5 сая' · 900 → '900'
 * (0 эсвэл цифргүй бол '' буцаана)
 */
export function shortPrice(value) {
  const n = Number(String(value == null ? '' : value).replace(/\D/g, '')) || 0;
  if (n <= 0) return '';
  const trim = (v) => String(Number(v.toFixed(2)));
  if (n >= 1_000_000_000) return `${trim(n / 1_000_000_000)} тэрбум`;
  if (n >= 1_000_000) return `${trim(n / 1_000_000)} сая`;
  if (n >= 1_000) return `${trim(n / 1_000)} мянга`;
  return String(n);
}

/** Огноо → '09-23' (графикийн шошго, UTC) */
export function formatDayShort(dayStr) {
  const s = String(dayStr || '');
  return s.length >= 10 ? `${s.slice(5, 7)}-${s.slice(8, 10)}` : '';
}

export function getPriceTypeLabel(type) {
  return PRICE_TYPE_LABELS[type] || '';
}

/**
 * Дэд төрлийн icon.
 * ⚠️ `section` нь `real-estate` БИШ бол тухайн ХЭСГИЙН icon-ыг буцаана —
 *    эс бөгөөс «Суудлын машин» (автомашин) гэсэн зар 🏠 (байшин) iconтой
 *    харагдана.
 */
export function getPropertyIcon(type, section = 'real-estate') {
  if (section && section !== 'real-estate') return getSection(section).icon;
  return PROPERTY_TYPE_ICONS[type] || '🏠';
}

/**
 * Төрөл + категори → дэлгэцийн нэр.
 * Жишээ: getPropertyTypeLabel('Орон сууц', 'sell') → 'Орон сууц зарна'
 *        getPropertyTypeLabel('Орон сууц', 'rent') → 'Орон сууц түрээслүүлнэ'
 */
export function getPropertyTypeLabel(type, category) {
  return getPropertyTypePathLabel(type, category);
}

/** Давхрын шошго. Жишээ: (5, 9) → '5 / 9 давхар', (5) → '5 давхарт' */
export function getFloorLabel(floor, totalFloors) {
  const f = Number(floor) || 0;
  const t = Number(totalFloors) || 0;
  if (!f && !t) return '';
  if (f && t) return `${f} / ${t} давхар`;
  if (f) return `${f} давхарт`;
  return `${t} давхар барилга`;
}

/** Гараж. true → 'Байгаа', false → 'Байхгүй', null/undefined → '' */
export function getGarageLabel(value) {
  if (value === true) return 'Байгаа';
  if (value === false) return 'Байхгүй';
  return '';
}

/**
 * Зарын БҮТЭН хаяг — байгаа хэсгүүдийг л ', '-ээр холбоно.
 * Жишээ: '5-р хороо, Баянгол, Улаанбаатар'
 * ⚠️ Дэлгэрэнгүй хуудас болон зарын карт ХОЁУЛАА үүнийг ашиглана
 *    (хаяг хоёр газарт өөр өөрөөр харагдахаас сэргийлнэ).
 * ⚠️ 2026-10-01: `address_detail` («Дэлгэрэнгүй хаяг») ХАСАГДАВ — талбар бүрэн
 *    устсан тул хаяг нь хороо → дүүрэг → хот дарааллаар л бүтнэ ✓
 */
export function formatAddress(listing) {
  if (!listing) return '';
  return [listing.khoroo, listing.district, listing.city]
    .filter(Boolean)
    .join(', ');
}

/**
 * 🏷️ ЗАРЫН ГАРЧГИЙН хамгийн их урт — UI (`AddListingClient` maxLength),
 * `lib/queries.js` (хадгалахаас өмнө таслана) ба DB-ийн CHECK
 * (0027_listing_title.sql) ГУРВУУЛАА нэг утгатай байх ёстой ✓
 */
export const MAX_LISTING_TITLE_LENGTH = 120;

/**
 * 🏷️ Зарын гарчиг (2026-10-02) — хэрэглэгчийн өөрөө бичсэн товч нэр
 * (ж: «3 өрөө байр, Баянгол, 16-р байр»).
 *
 * ⚠️ ЯАГААД ТУСДАА ФУНКЦ ВЭ: гарчиг нь карт дээр үнийн доор харагддаг ч
 *    ЗААВАЛ БИШ талбар (0027 орохоос өмнөх 782 зар дээр `null`) — дүрэм нь
 *    нэг л газар байхгүй бол зарим дэлгэцэд ХООСОН МӨР (`<div>` хоосон)
 *    эсвэл `undefined` гэсэн текст гарч ирнэ ✗
 *
 * 📍 ХААНА ХАРАГДАХ ВЭ: зарын карт — үнэ ба «Үнэ тохирно» мөрийн ЯГ ДОР,
 *    `font-bold` + үнээс 1 алхам жижиг (`text-base` vs `text-lg`) ✓
 *
 * ⚠️ Олон зай/мөр таслалтыг НЭГ зай болгоно: гарчиг нь карт дээр
 *    `truncate` (1 мөр) тул шинэ мөр байвал товчлолт буруу харагдана ✗
 * @param {{title?: string|null}} listing
 * @returns {string} гарчиг, эсвэл `''` (мөр нь ХАРАГДАХГҮЙ ✓)
 */
export function listingTitle(listing) {
  const raw = listing && listing.title;
  if (raw === null || raw === undefined) return '';
  return String(raw).replace(/\s+/g, ' ').trim().slice(0, MAX_LISTING_TITLE_LENGTH);
}

/**
 * 🚗 АВТОМАШИНЫ АВТО-ГАРЧИГ — «Toyota Vellfire, 2017/2026» (2026-10-09 (85))
 *
 * 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Автомашины картыг … мэдээлэлтэй болго» + жишиг
 *    сайтын машин карт: гарчиг нь **брэнд + загвар, үйлдвэрлэсэн/орж ирсэн он**
 *    (`Toyota Vellfire, 2017/2026` · `Toyota Aqua, 2013/2020`), доор нь гүйлт ·
 *    хурдны хайрцаг · хөдөлгүүр · түлш (`formatAttrsLine`-ийн ажил) ✓
 *
 * ⚠️ ЗӨВХӨН НӨӨЦ ГАРЧИГ (`ListingCard`: `listingTitle(listing) || carTitle(...)`):
 *    зар оруулагч өөрөө бичсэн гарчиг (`0027_listing_title.sql`) байвал ТҮРҮҮЛНЭ ✓
 *    (хэрэглэгчийн үгийг дарж бичихгүй); хоосон үед л `attrs`-аас бүтээнэ ✓
 * ⚠️ `attrs` байхгүй бол, эсвэл БРЭНД ба ЗАГВАР ХОЁУЛАА хоосон бол `''`
 *    буцаана ⇒ гарчгийн мөр ГАРАХГҮЙ ✓ (зөвхөн нэг нь байвал тэр л гарна ✓)
 * ⚠️ Он ХОЁУЛАА байвал «2017/2026» (`year`/`importYear`) — жишиг сайтын хэв;
 *    зөвхөн нэг нь байвал тэр л он гарна ✓ (`''` он → зөвхөн «Toyota Vellfire»)
 *
 * @param {object|null|undefined} attrs `listings.attrs` (jsonb, 🚗 `auto` хэсэг)
 * @returns {string} ж: `{brand:'Toyota', model:'Vellfire', year:'2017',
 *   importYear:'2026'}` → `'Toyota Vellfire, 2017/2026'`; хоосон бол `''`
 */
export function carTitle(attrs) {
  if (!attrs || typeof attrs !== 'object' || Array.isArray(attrs)) return '';
  const clean = (v) => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const name = [clean(attrs.brand), clean(attrs.model)].filter(Boolean).join(' ');
  if (!name) return '';
  const year = clean(attrs.year);
  const importYear = clean(attrs.importYear);
  const years = year && importYear && year !== importYear
    ? `${year}/${importYear}`
    : (year || importYear);
  return years ? `${name}, ${years}` : name;
}

/** Тоон утга > 0 бол буцаана, эс бөгөөс null (DB-д null оруулах) */
export function positiveNumberOrNull(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.trunc(n);
}

export function getCategoryLabel(cat) {
  return cat === 'sell' ? 'Зарах' : cat === 'rent' ? 'Түрээслэх' : 'Бүгд';
}

// Хугацааны форматлалт: "сая өмнө", "цагын өмнө" гэх мэт
export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'дөнгөж сая';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} минутын өмнө`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} цагийн өмнө`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} өдрийн өмнө`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} сарын өмнө`;
  const years = Math.floor(days / 365);
  return `${years} жилийн өмнө`;
}

// Утасны дугаарыг сунгах: 99112233 -> +97699112233
export function normalizePhone(phone) {
  let p = String(phone || '').replace(/[^\d]/g, '');
  if (p.startsWith('976')) return `+${p}`;
  if (p.startsWith('0')) p = p.slice(1);
  if (!p.startsWith('976')) p = `976${p}`;
  return `+${p}`;
}

// images нь хоёр төрлийн утга агуулна: localStorage оруулсан svg path
// ЭСВЭЛ Supabase Storage-ийн public URL
export function imageSrc(src) {
  return src || null;
}

export function firstImage(listing) {
  const images = Array.isArray(listing.images) ? listing.images : [];
  return images.length ? images[0] : null;
}
