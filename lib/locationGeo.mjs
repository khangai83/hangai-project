// ============================================================
// locationGeo.mjs — 🗺 ЗАРЫН ГАЗРЫН ЗУРГИЙН КООРДИНАТЫН ЦЭВЭР ДҮРЭМ
//
// 🎯 ХЭРЭГЛЭГЧИЙН ГОМДОЛ (2026-10-06): «Газрын зураг дээр 📍 23-р хороо,
//    Хан-Уул, Улаанбаатар гэсэн байршил буюу Хан-Уул дүүргийн 23-р хороонд
//    энэ зар чинь харагдахгүй байна даа».
//    ⚠️ ЯАГААД: `components/MapView.jsx` нь ЗӨВХӨН `latitude`/`longitude`
//    (солбицол) ТАЙ зарыг зурдаг — харин зар нэмэх форм нь солбицол
//    ОГТ цуглуулдаггүй байв (`city`/`district`/`khoroo` нь зөвхөн ТЕКСТ).
//    Үр дүнд форм-оос үүссэн БҮХ зар `latitude = null` болж, газрын зураг
//    дээр ОГТ гарахгүй байв ✗ (зөвхөн demo seed-ийн санамсаргүй солбицолтой
//    зарууд л гардаг байв).
// ✅ ШИЙДЭЛ: `unegui.mn` мэт газрын зурагт пин тавих UI (`LocationMapPicker`)
//    + ДҮҮРЭГ сонгомогц газрын зураг тэр дүүргийн ТӨВ рүү АВТОМАТААР
//    төвлөрөх. Сонгосон солбицол нь `listings.latitude`/`longitude`
//    (0001_schema — аль хэдийн БАЙГАА багана) руу хадгалагдана ✓ (migration 0)
//
// ⚠️ ЭНЭ МОДУЛЬ ЧИГЛЭЛТ ОЛДСОН (fallback) КООРДИНАТЫГ л өгнө:
//    • Хотын/дүүргийн ТӨВИЙН ойролцоо утга (газар зүйн бодит төв орчим)
//    • Хэрэглэгч газрын зураг дээр пин тавивал ТҮҮНИЙ утга давамгайлна
//    • 🆕 Хорооны БОДИТ полигон ДОТОРХ цэг (`lib/ubKhorooCenters.mjs` —
//      `khoroos.json` (0BSD) эх сурвалжаас автомат үүсгэсэн 204 хороо) —
//      2026-10-06-нд нэмэгдэв; дата олдохгүй бол доорх ойролцоо (дүүргийн
//      төвөөс алтан өнцгийн спирал) рүү буцана ✓
//
// ⚠️ Утга нь ЗӨВХӨН «газрын зурагт ойролцоогоор төвлөрөх» зорилготой —
//    албан ёсны хил/зааг БИШ (estat.mn-ийн бодит geoJSON биш).
//
// ХАМРАХ ХҮРЭЭ (цэвэр — Node тест `scripts/test-location-map.mjs`):
//   ① `isValidCoord(lat, lng)` — солбицол хүчинтэй эсэх (тоо · муж)
//   ② `coordOf(x)` / `hasCoords(x)` — форм/DB-ийн мөрөөс солбицол унших
//   ③ `districtCenter(city, district)` — дүүрэг/сумын төв
//   ④ `cityCenter(city)` — хот/аймгийн төв (дүүрэг байхгүй үед)
//   ⑤ `mapCenterFor(x)` — «аль солбицол дээр газрын зургийг нээх» дүрэм
//   ⑥ `sameCoord(a, b)` — хоёр солбицол ойролцоо эсэх (≈ метр түвшин)
// ============================================================

// 🆕 🗺 ХОРООНЫ БОДИТ ПОЛИГОН доторх цэг (2026-10-06) — 204 хороо (УБ).
//    `khoroos.json` (0BSD · Tuvshin-Level/khoroo-map) эх сурвалжаас үүсгэсэн.
import { ubKhorooCenter } from './ubKhorooCenters.mjs';

/**
 * 🇲🇳 Улаанбаатарын 9 дүүргийн ОЙРОЛЦОО төв (≈ census/OSM-ийн төв орчим).
 * ⚠️ Газрын зургийг эхлэх цэг тодорхойлоход л хэрэглэнэ — бодит хил БИШ.
 */
export const UB_DISTRICT_CENTERS = {
  Баянгол: { lat: 47.9150, lng: 106.8950 },
  Баянзүрх: { lat: 47.9150, lng: 106.9600 },
  Сүхбаатар: { lat: 47.9250, lng: 106.9200 },
  'Хан-Уул': { lat: 47.8760, lng: 106.9100 },
  Чингэлтэй: { lat: 47.9300, lng: 106.8800 },
  Сонгинохайрхан: { lat: 47.9100, lng: 106.7800 },
  Налайх: { lat: 47.7700, lng: 107.2500 },
  Багануур: { lat: 47.8100, lng: 108.3000 },
  Багахангай: { lat: 47.3600, lng: 107.4700 },
};


/**
 * 🏙 ХОТ/АЙМАГ тус бүрийн төв (22 хот) — дүүрэг/сум сонгоогүй үед газрын
 * зургийг төвлөрүүлэхэд хэрэглэнэ ✓
 */
export const CITY_CENTERS = {
  Улаанбаатар: { lat: 47.9188, lng: 106.9176 },
  'Дархан-Уул': { lat: 49.4869, lng: 105.9228 },
  Орхон: { lat: 49.0333, lng: 104.0500 },
  Архангай: { lat: 47.4750, lng: 101.4500 },
  'Баян-Өлгий': { lat: 48.9683, lng: 89.9686 },
  Баянхонгор: { lat: 46.1944, lng: 100.7181 },
  Булган: { lat: 48.8127, lng: 103.5344 },
  'Говь-Алтай': { lat: 46.3722, lng: 96.2583 },
  Говьсүмбэр: { lat: 46.3614, lng: 108.3614 },
  Дорноговь: { lat: 44.8917, lng: 110.1367 },
  Дорнод: { lat: 48.0731, lng: 114.5247 },
  Дундговь: { lat: 45.7617, lng: 106.2722 },
  Завхан: { lat: 47.7417, lng: 96.8444 },
  Өвөрхангай: { lat: 46.2650, lng: 102.7800 },
  Өмнөговь: { lat: 43.5700, lng: 104.4300 },
  Сүхбаатар: { lat: 46.6800, lng: 113.2800 },
  Сэлэнгэ: { lat: 50.2300, lng: 106.2000 },
  Төв: { lat: 47.7067, lng: 106.9500 },
  Увс: { lat: 49.9800, lng: 92.0700 },
  Ховд: { lat: 48.0050, lng: 91.6400 },
  Хөвсгөл: { lat: 49.6361, lng: 100.1592 },
  Хэнтий: { lat: 47.3200, lng: 110.6600 },
};

/**
 * 🏙 АЙМГУУДЫН СУМ/ДҮҮРЭГ (зөвхөн `CITY_DISTRICTS`-д байгаа нь) —
 * «Улаанбаатар» бус хотын дотор дүүрэг/сум сонгогдсон үед төвлөрүүлнэ ✓
 */
export const DISTRICT_CENTERS = {
  'Дархан-Уул': {
    Дархан: { lat: 49.4869, lng: 105.9228 },
    'Шарын гол': { lat: 49.6800, lng: 106.3300 },
    Хонгор: { lat: 49.2500, lng: 105.7500 },
    Орхон: { lat: 48.8300, lng: 106.0800 },
  },
  Орхон: {
    Эрдэнэт: { lat: 49.0333, lng: 104.0500 },
    Жаргалант: { lat: 48.5333, lng: 103.8500 },
  },
};

/** Газрын зургийн АНХДАГЧ төв (Улаанбаатар) — солбицол огт байхгүй үед */
export const DEFAULT_MAP_CENTER = { lat: 47.9188, lng: 106.9176 };

/** Газрын зургийн АНХДАГЧ зум (хот харагдах түвшин) */
export const DEFAULT_MAP_ZOOM = 12;

/** 🗺 Пин тавих/дүүрэг сонгосон үеийн зум (гудамжны түвшин) */
export const PICK_ZOOM = 15;

/** 🆕 🔍 Хайлт/«миний байршил»-ээр олдсон цэгийн зум (барилгын түвшин) */
export const PICK_ZOOM_FOUND = 17;

/** 🗺 Хорооны ойролцоо төвийг дүүргийн төвөөс хэр холдуулах (градус ≈ 1.5 км).
 *  ⚠️ 2026-10-06 (4 дэх засвар — хэрэглэгчийн хүсэлт: «хороо dropdown-той
 *     холбож, ойролцоо төвд ойртуулах») ⇒ хороо сонгомогц солбицол энэ
 *     радиустай дотор дүүргийн төвөөс ЗӨӨЛӨН шилжинэ ✓
 *  ⚠️ 2026-10-06 (8 дахь засвар): Улаанбаатарт ОДОО БОДИТ полигон доторх цэг
 *     (`lib/ubKhorooCenters.mjs`) хэрэглэгддэг тул энэ нь ЗӨВХӨН FALLBACK
 *     (дата дутуу эсвэл бусад газар) ✓ */
export const KHOROO_SPREAD = 0.014;

/** 🌀 Хороонуудыг дүүрэг дотор ЯЛГАХ алтан өнцөг (радиан ≈ 137.5°) —
 *  спирал байрлал нь хорооны цэгүүдийг жигд тараана (нэг цэг дээр
 *  бөөгнөрөхгүй ✓). ⚠️ Тогтмол тул нэг хороо ҮРГЭЛЖ ижил цэг дээр ✓ */
const KHOROO_GOLDEN_ANGLE = 2.399963229728653;

/**
 * 🌐 Хаяг/хороо ХАЙХ эх сурвалж — OpenStreetMap **Nominatim**
 *    (үнэгүй · API key ХЭРЭГГҮЙ · CORS дэмждэг ⇒ браузер шууд дуудна ✓)
 */
export const GEOCODE_ENDPOINT = 'https://nominatim.openstreetmap.org/search';

/**
 * 🌐 Пингийн солбицлыг ХАЯГ болгож ХАРИУ буцаах эх сурвалж — Nominatim **reverse**
 *    (2026-10-06 — 6 дахь засвар): хэрэглэгч газрын зураг дээр пин тавьсны дараа
 *    БОДИТ хаяг (гудамж · хороолол · дүүрэг) харуулж, «зөв цэг мөн үү?»-г батална ✓
 *    ⚠️ OSM-д хороо (`khoroo`) талбар БАЙХГҮЙ тул хариу нь хороо БИШ — хаяг/дүүрэг ✓
 */
export const REVERSE_ENDPOINT = 'https://nominatim.openstreetmap.org/reverse';

/** Анхдагч reverse зум (18 ≈ барилгын түвшин — хаяг бүрэн гарна) */
export const REVERSE_ZOOM = 18;

/** Хоёр солбицол «ойролцоо» гэж үзэх epsilon (≈ 10 метр) */
const SAME_EPS = 1e-4;

/** Тоо болгож аюулгүй хөрвүүлэх — `null`/`''`/`undefined` нь `NaN` ✓ */
function toNum(value) {
  if (value === null || value === undefined || value === '') return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Солбицол ХҮЧИНТЭЙ эсэх.
 * ⚠️ `(0, 0)` нь «Атлантын далай» (Guinea gulf) — утга байхгүйг илэрхийлэх
 *    нийтлэг буруу утга тул ХҮЧИНГҮЙ гэж үзнэ ✓
 */
export function isValidCoord(lat, lng) {
  return Number.isFinite(lat) && Number.isFinite(lng)
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180
    && !(lat === 0 && lng === 0);
}

/**
 * Форм/DB-ийн мөрөөс солбицол унших.
 * ⚠️ Талбарын нэр нь DB ба форм ХОЁУЛАНД ИЖИЛ: `latitude`/`longitude`
 *    (`lib/queries.js → listingPayloadToRow` нь ЯГ эдгээрийг уншдаг ✓)
 * @returns {{lat: number, lng: number}|null}
 */
export function coordOf(x) {
  if (!x) return null;
  const lat = toNum(x.latitude);
  const lng = toNum(x.longitude);
  return isValidCoord(lat, lng) ? { lat, lng } : null;
}

/** Форм/зар дээр хүчинтэй солбицол байгаа эсэх */
export function hasCoords(x) {
  return coordOf(x) !== null;
}

/**
 * Дүүрэг/сумын төв. ⚠️ Улаанбаатарт `UB_DISTRICT_CENTERS`, бусад хотод
 * `DISTRICT_CENTERS`-ээс хайна (хоёулаа цэвэр газрын зураг).
 * @returns {{lat: number, lng: number}|null}
 */
export function districtCenter(city, district) {
  const c = typeof city === 'string' ? city.trim() : '';
  const d = typeof district === 'string' ? district.trim() : '';
  if (!c || !d) return null;
  if (c === 'Улаанбаатар') return UB_DISTRICT_CENTERS[d] || null;
  const byCity = DISTRICT_CENTERS[c];
  return (byCity && byCity[d]) || null;
}

/**
 * Хот/аймгийн төв.
 * @returns {{lat: number, lng: number}|null}
 */
export function cityCenter(city) {
  const c = typeof city === 'string' ? city.trim() : '';
  if (!c) return null;
  return CITY_CENTERS[c] || null;
}

/**
 * 🔢 Хорооны дугаарыг нэрнээс унших («23-р хороо» → `23`).
 *    ⚠️ Дугаар байхгүй/тоо биш бол `null` ✓ (орон зай, «-р хороо» хасагдана)
 * @param {string} [khoroo]
 * @returns {number|null}
 */
export function khorooNumber(khoroo) {
  const s = typeof khoroo === 'string' ? khoroo.trim() : '';
  const m = s.match(/^(\d{1,3})/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

/**
 * 🗺 Хорооны координат (2026-10-06 — 4 дэх засвар + 8 дахь засвар).
 *
 * ✅ ⓵ УЛААНБААТАР → **БОДИТ полигон ДОТОРХ цэг** (`lib/ubKhorooCenters.mjs`,
 *      `khoroos.json` (0BSD) эх сурвалжаас автомат үүсгэсэн 204 хороо).
 *      ⇒ Хэрэглэгч хороо сонгоод пин ТАВИХГҮЙ ч зар нь газрын зурагны
 *        хайлтад ТУХАЙН хороондоо багтана ✓ (өмнө нь зөвхөн ойролцоо байв ✗)
 * ⚠️ ⓶ Дата дутуу (ж: `khoroos.json`-д байхгүй дугаар) эсвэл бусад газар →
 *      хуучин ОЙРОЛЦОО (дүүргийн төвөөс алтан өнцгийн спирал, `KHOROO_SPREAD`)
 *      руу буцаана ✓
 * ⚠️ Хэрэглэгч газрын зураг дээр пин тавибал ТҮҮНИЙ утга давамгайлна ✓
 *
 * @param {string} [city] @param {string} [district] @param {string} [khoroo]
 * @returns {{lat: number, lng: number}|null} дүүрэг/хороо тодорхойгүй бол `null`
 */
export function khorooCenter(city, district, khoroo) {
  const n = khorooNumber(khoroo);
  if (n === null) return null;
  // ⓵ 🆕 БОДИТ полигон доторх цэг — ⚠️ ЗӨВХӨН Улаанбаатар (бусад хотод
  //    хороо байхгүй — сум л байна ⇒ шууд fallback руу)
  const c = typeof city === 'string' ? city.trim() : '';
  if (c === 'Улаанбаатар') {
    const real = ubKhorooCenter(district, n);
    if (real) return real;
  }
  // ⓶ Ойролцоо (fallback) — дата дутуу үед хуучин зан хэвээр ✓
  const base = districtCenter(city, district);
  if (!base) return null;
  const idx = Math.abs(Math.trunc(n));
  const angle = idx * KHOROO_GOLDEN_ANGLE;
  // радиус 0.35..1.0 × spread (дугаар өсөхөд бага зэрэг захад)
  const r = KHOROO_SPREAD * (0.35 + 0.65 * ((idx % 43) / 43));
  // ⚠️ Бодит зайг ойролцоолох — уртраг өргөрөгт `cos(lat)`-аар шахагдана
  const cosLat = Math.cos((base.lat * Math.PI) / 180) || 1;
  return {
    lat: base.lat + r * Math.cos(angle),
    lng: base.lng + (r * Math.sin(angle)) / cosLat,
  };
}

/**
 * 🧭 Пингүй үеийн АВТОМАТ (ойролцоо) төв — хороо → дүүрэг → хот → анхдагч.
 *    ⚠️ `mapCenterFor`-ийн ②③④⑤ нь ЯГ ЭНЭ дүрэм; мөн «солбицол нь авто
 *    төвдөө байгаа эсэх»-ийг шалгахад хэрэглэнэ
 *    (`AddListingClient → mapPickIsApprox`) ✓
 * @param {{city?: string, district?: string, khoroo?: string}} [x]
 * @returns {{lat: number, lng: number}}
 */
export function autoCenterFor(x) {
  const k = khorooCenter(x && x.city, x && x.district, x && x.khoroo);
  if (k) return k;
  const d = districtCenter(x && x.city, x && x.district);
  if (d) return d;
  const c = cityCenter(x && x.city);
  if (c) return c;
  return { ...DEFAULT_MAP_CENTER };
}

/**
 * 🧭 «Аль солбицол дээр газрын зургийг нээх» дүрэм:
 *   ① Хэрэглэгчийн аль хэдийн тавьсан пин (`x.latitude`/`longitude`)
 *   ② 🆕 Хорооны ойролцоо төв (`khorooCenter` — 2026-10-06, 4 дэх засвар)
 *   ③ Сонгосон дүүргийн төв (`districtCenter`)
 *   ④ Хотын төв (`cityCenter`)
 *   ⑤ Анхдагч (Улаанбаатар)
 * @param {{city?: string, district?: string, khoroo?: string, latitude?: number|null, longitude?: number|null}} [x]
 * @returns {{lat: number, lng: number, exact: boolean}}
 *   `exact` — жинхэнэ пин (①) эсэх; `false` бол ойролцоо (төв) ✓
 */
export function mapCenterFor(x) {
  const pin = coordOf(x);
  if (pin) return { ...pin, exact: true };
  return { ...autoCenterFor(x), exact: false };
}

/** Хоёр солбицол ойролцоо (≈ ижил) эсэх — «пин тавьсан эсэх» шалгахад ✓ */
export function sameCoord(a, b) {
  if (!a || !b) return false;
  return Math.abs(a.lat - b.lat) <= SAME_EPS && Math.abs(a.lng - b.lng) <= SAME_EPS;
}

// ════════════════════════════════════════════════════════════
// 🆕 🔍 ХОРООНЫ НАРИЙВЧЛАЛ (2026-10-06 — 3 дахь засвар)
//    🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Хорооны нарийвчлалыг сайжруулах боломж
//       чамд үнэхээр алга уу»
//    ⚠️ Монголын ~202 хорооны БОДИТ төвийг ЭНД гараар бичихгүй ✗ —
//       зохиосон/таамгийн солбицол нь «БУРУУ байршил» болно (худлаа
//       өгөгдөл). Оронд нь хэрэглэгч БОДИТ эх сурвалжаас (OpenStreetMap
//       Nominatim) хайж олно ⇒ жинхэнэ хороо/гудамж/барилгын түвшин ✓
//    ⚠️ Энэ хоёр функц нь ЦЭВЭР (сүлжээ ХЭРЭГГҮЙ) тул Node тестэд
//       ШУУД шалгагдана ✓ (`scripts/test-location-map.mjs`)
// ════════════════════════════════════════════════════════════

/**
 * 🌐 Хаяг/хороо хайх URL байгуулах (Nominatim · OpenStreetMap).
 *    ⚠️ Зөвхөн Монгол (`countrycodes=mn`) + монгол хариу (`accept-language=mn`)
 *    ⚠️ `limit` нь 1..10 болж хязгаарлагдана (Nominatim-ийг хэт ачаалахгүй ✓)
 * @param {string} query хайх үг (ж: «23-р хороо, Хан-Уул, Улаанбаатар»)
 * @param {{limit?: number}} [opts]
 * @returns {string|null} хоосон/тоо биш үед `null` ✓ (fetch хийхгүй)
 */
export function geocodeUrl(query, opts) {
  const q = typeof query === 'string' ? query.trim() : '';
  if (!q) return null;
  const req = opts && Number.isFinite(opts.limit) ? opts.limit : 5;
  const limit = Math.min(Math.max(Math.trunc(req), 1), 10);
  const params = new URLSearchParams({
    q,
    format: 'jsonv2',
    limit: String(limit),
    countrycodes: 'mn',
    'accept-language': 'mn',
  });
  return `${GEOCODE_ENDPOINT}?${params.toString()}`;
}

/**
 * Nominatim-ийн JSON-ыг `{lat, lng, label}` жагсаалт болгож ЦЭВЭР болгох.
 *    ⚠️ `lat`/`lon` нь Nominatim дээр МӨР (`"47.9188"`) тул `Number()`-ээр
 *       хөрвүүлж, `isValidCoord`-ээр ШҮҮНЭ ⇒ хог/далай дээрх (0,0) хариу
 *       АВТОМАТААР алга болно ✓
 *    ⚠️ Оролт массив биш бол `[]` (protects рендэр) ✓
 * @param {unknown} json
 * @returns {{lat: number, lng: number, label: string}[]}
 */
export function parseGeocodeResults(json) {
  if (!Array.isArray(json)) return [];
  const out = [];
  for (const row of json) {
    if (!row || typeof row !== 'object') continue;
    const lat = toNum(row.lat);
    const lng = toNum(row.lon);
    if (!isValidCoord(lat, lng)) continue;
    out.push({ lat, lng, label: typeof row.display_name === 'string' ? row.display_name : '' });
  }
  return out;
}

/**
 * 🌐 Nominatim **reverse** хайлтын URL байгуулах — пингийн солбицлыг хаяг болгоно.
 *    ⚠️ `isValidCoord`-оор шүүнэ — хүчингүй (ж: `0,0`) үед `null` буцаана ⇒
 *       `fetch` ХИЙХГҮЙ ✓ (Nominatim-ийг дэмий ачаалахгүй)
 *    ⚠️ `zoom` нь 3..18-д хязгаарлагдана; `addressdetails=1` нь хаягийн
 *       бүрэлдэхүүн хэсгүүдийг (road/suburb/city_district) буцаана ✓
 * @param {number} lat @param {number} lng
 * @param {{zoom?: number}} [opts]
 * @returns {string|null} хүчингүй солбицол үед `null` (fetch хийхгүй)
 */
export function reverseGeocodeUrl(lat, lng, opts) {
  if (!isValidCoord(lat, lng)) return null;
  const req = opts && Number.isFinite(opts.zoom) ? opts.zoom : REVERSE_ZOOM;
  const zoom = Math.min(Math.max(Math.trunc(req), 3), 18);
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'jsonv2',
    zoom: String(zoom),
    addressdetails: '1',
    'accept-language': 'mn',
  });
  return `${REVERSE_ENDPOINT}?${params.toString()}`;
}

/**
 * Nominatim reverse-ийн JSON-ыг хүн уншихад эвтэйхэн
 * `{label, road, suburb, district, city}` болгож ЦЭВЭР болгох.
 *    ⚠️ Хороо (`khoroo`) талбар OSM-д БАЙХГҮЙ тул `suburb`/`neighbourhood`/`quarter`
 *       (ж: «Бага Тойрог») нь хамгийн ойрын «хороолол»-ын түвшин ✓
 *    ⚠️ Хоосон/байхгүй хэсгүүд ХАСАГДАЖ, давхардсан утга НЭГ Л удаа орж `label`
 *       болно (ж: «Их сургуулийн гудамж, Бага Тойрог, Сүхбаатар дүүрэг») ✓
 *    ⚠️ Хаяг огт гаргаж чадахгүй бол `null` (UI-д аюулгүй ✓)
 * @param {unknown} json
 * @returns {{label: string, road: string, suburb: string, district: string, city: string}|null}
 */
export function parseReverseResult(json) {
  if (!json || typeof json !== 'object' || Array.isArray(json)) return null;
  const a = json.address && typeof json.address === 'object' ? json.address : {};
  const pick = (...keys) => {
    for (const k of keys) {
      const v = textOf(a[k]);
      if (v) return v;
    }
    return '';
  };
  const road = pick('road', 'pedestrian', 'footway', 'path');
  const suburb = pick('suburb', 'neighbourhood', 'quarter', 'hamlet');
  const district = pick('city_district', 'district', 'county');
  const city = pick('city', 'town', 'state');
  const parts = [];
  [road, suburb, district, city].forEach((p) => {
    if (p && !parts.includes(p)) parts.push(p);
  });
  const label = parts.join(', ');
  if (!label) return null;
  return { label, road, suburb, district, city };
}

/**
 * 🌐 Дүүрэг/сумын БОДИТ хил (`polygon`) хайх URL — Nominatim `polygon_geojson=1`
 *    (2026-10-06 — 7 дахь засвар). ⚠️ УБ-ын дүүргүүд OSM-д БОДИТ полигонтой
 *    (ж: Хан-Уул = relation 14669148) ⇒ пин дүүргийн хил дотор эсэхийг БОДИТООР
 *    шалгаж, «зөв дүүрэг мөн үү?»-г батална ✓
 * @param {string} city @param {string} district
 * @returns {string|null} дүүрэг хоосон үед `null` (fetch хийхгүй)
 */
export function districtPolygonUrl(city, district) {
  const c = typeof city === 'string' ? city.trim() : '';
  const d = typeof district === 'string' ? district.trim() : '';
  if (!d) return null;
  const params = new URLSearchParams({
    q: [d, c, 'Монгол'].filter(Boolean).join(', '),
    format: 'jsonv2',
    polygon_geojson: '1',
    limit: '1',
    countrycodes: 'mn',
    'accept-language': 'mn',
  });
  return `${GEOCODE_ENDPOINT}?${params.toString()}`;
}

/**
 * Nominatim-ийн `polygon_geojson` хариунаас эхний `Polygon`/`MultiPolygon`-ыг гаргана.
 *    ⚠️ `Point`/`LineString` эсвэл огт байхгүй бол `null` (хил зурахгүй ✓)
 * @param {unknown} json
 * @returns {{type:'Polygon'|'MultiPolygon', coordinates:any[]}|null}
 */
export function extractPolygon(json) {
  const arr = Array.isArray(json) ? json : json && typeof json === 'object' ? [json] : [];
  for (const item of arr) {
    const g = item && item.geojson;
    if (!g || typeof g !== 'object') continue;
    if ((g.type === 'Polygon' || g.type === 'MultiPolygon') && Array.isArray(g.coordinates)) {
      return { type: g.type, coordinates: g.coordinates };
    }
  }
  return null;
}

/**
 * Нэг цагираг (`ring`) дотор цэг байгаа эсэх — «ray casting» алгоритм.
 *    ⚠️ GeoJSON координат нь `[lon, lat]` (ө.х. `[lng, lat]`) дараалалтай ✓
 * @param {number} lat @param {number} lng
 * @param {Array<[number, number]>} ring
 * @returns {boolean}
 */
export function pointInRing(lat, lng, ring) {
  if (!isValidCoord(lat, lng) || !Array.isArray(ring) || ring.length < 3) return false;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const xi = ring[i] && ring[i][0];
    const yi = ring[i] && ring[i][1];
    const xj = ring[j] && ring[j][0];
    const yj = ring[j] && ring[j][1];
    if (!Number.isFinite(xi) || !Number.isFinite(yi) || !Number.isFinite(xj) || !Number.isFinite(yj)) continue;
    if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * GeoJSON `Polygon`/`MultiPolygon` дотор цэг байгаа эсэх — нүх (`holes`)-ийг харгалзана.
 *    ⚠️ `MultiPolygon`-ийн АЛЬ НЭГ полигон дотор байвал `true` ✓
 * @param {number} lat @param {number} lng
 * @param {{type:string, coordinates:any[]}|null} geometry
 * @returns {boolean}
 */
export function pointInGeoJson(lat, lng, geometry) {
  if (!isValidCoord(lat, lng) || !geometry || typeof geometry !== 'object') return false;
  const polys = geometry.type === 'Polygon'
    ? [geometry.coordinates]
    : geometry.type === 'MultiPolygon'
      ? geometry.coordinates
      : null;
  if (!Array.isArray(polys)) return false;
  for (const poly of polys) {
    if (!Array.isArray(poly) || !poly.length) continue;
    if (!pointInRing(lat, lng, poly[0])) continue;
    let inHole = false;
    for (let i = 1; i < poly.length; i += 1) {
      if (pointInRing(lat, lng, poly[i])) {
        inHole = true;
        break;
      }
    }
    if (!inHole) return true;
  }
  return false;
}

/** Мөр устгаж цэвэрлэх (объект/тоо → `''`) */
function textOf(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/**
 * 🧭 Nominatim-д ЗОРИУЛСАН хайлтын мөрийг байгуулах — ⚠️ ДАРААЛАЛ нь ЧУХАЛ.
 *    🔬 LIVE БАТЛАГАА (2026-10-06, бодит Nominatim, `countrycodes=mn`):
 *      ✅ 1 үр дүн: «Хан-Уул, Улаанбаатар»
 *      ✅ 1 үр дүн: «Хан-Уул дүүрэг, Улаанбаатар»
 *      ❌ 0 үр дүн: «23-р хороо, Хан-Уул, Улаанбаатар»
 *      ❌ 0 үр дүн: «Улаанбаатар, Хан-Уул, 23-р хороо»
 *    ⇒ Тиймээс дараалал нь **«дүүрэг, хот»** (хот эхэнд БИШ ✓).
 *    ⚠️ **ХОРООГ ОРУУЛАХГҮЙ** — OpenStreetMap-д УБ-ын хорооны зааг бараг
 *       байхгүй тул хороо нэмэх нь хайлтыг ХООСОН болгоно ✗. Хорооны
 *       нарийвчлалыг хэрэглэгч ① 🔍 газрын нэр/гудамж хайж ② 📍 Миний
 *       байршил ③ газрын зургийг гараар тааруулж олно ✓
 * @param {{city?: string, district?: string, khoroo?: string}} [x]
 * @returns {string} хайлтын мөр (`''` — хоосон үед fetch хийхгүй ✓)
 */
export function geocodeQuery(x) {
  const src = x && typeof x === 'object' ? x : {};
  return [textOf(src.district), textOf(src.city)].filter(Boolean).join(', ');
}

/* ============================================================
   📋 GOOGLE MAPS «Copy link» → СОЛБИЦОЛ (2026-10-07)
   ------------------------------------------------------------
   🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Хэрэглэгч зар оруулж байхдаа … газрын зураг
   дээр заах хэсэг дээр оруулах сонголтоос гадна, нэмэлтээр google maps
   аас авсан Copy link ээ оруулдаг хэсэгтэй байвал болох уу».

   ⇒ Пин тавих ХОЁР дахь гарц: хэрэглэгч Google Maps дээр газраа олоод
     «Copy link»-ээр хуулсан линкээ тавихад тэр линкээс СОЛБИЦОЛ
     (`lat`/`lng`) нь задран, `form.latitude`/`longitude` руу бичигдэнэ ✓

   ⚠️ DB ӨӨРЧЛӨЛТ 0 (migration ХЭРЭГГҮЙ): солбицол нь АЛЬ ХЭДИЙН байгаа
      `listings.latitude`/`longitude` (0001_schema) баганад хадгалагдана —
      линк өөрөө ХАДГАЛАГДАХГҮЙ (зөвхөн солбицол задлана ✓)

   Google Maps-ийн хуваалцсан линк нь ОЛОН хэлбэртэй (дараалал ЧУХАЛ):
     ④ `/data=…!3d47.9188!4d106.9176…`  — PLACE-ийн БОДИТ пин (хамгийн нарийн)
     ① `/…/@47.9188,106.9176,17z/…`     — газрын зургийн ТӨВ (зумтай)
     ② `?q=47.9188,106.9176`            — хайлтын цэг
     ③ `?ll=47.9188,106.9176`           — бусад параметр (center/query/…)
     ⑤ `47.9188, 106.9176`              — зүгээр «lat,lng» текст
   ⇒ ④ (`!3d`/`!4d`) нь PLACE пин тул ① (`@`) -оос ТҮРҮҮЛНЭ ✓

   ⚠️ БОГИНО линк (`maps.app.goo.gl/…`, `goo.gl/maps/…`) нь солбицол
      ОГТ АГУУЛАХГҮЙ (redirect дотор; CORS-оос болоод уншиж чадахгүй ✗)
      ⇒ `isShortMapsLink()`-ээр илрүүлж, UI нь БҮРЭН линк оруулахыг заана
        (`MAP_LINK_SHORT_HINT`) ✓
   ============================================================ */

/** Линк оруулах хэсгийн гарчиг (2-р алхам — 🗺 пикер блок) */
export const MAP_LINK_LABEL = 'Эсвэл Google Maps линкээр оруулах';

/** Линк оруулах талбарын placeholder */
export const MAP_LINK_PLACEHOLDER = 'Google Maps линк (Copy link)…';

/** Линк оруулах товч */
export const MAP_LINK_BTN = 'Оруулах';

/** Линкээс солбицол АМЖИЛТТАЙ задрав */
export const MAP_LINK_OK = '📍 Солбицолыг линкээс авлаа';

/** Солбицол олдсонгүй (ерөнхий) */
export const MAP_LINK_ERR =
  'Солбицол олдсонгүй — Google Maps дээр газраа нээж, хаягийн мөрний БҮРЭН линкийг хуулж тавина уу.';

/** Solбицол агуулаагүй БОГИНО линк (`maps.app.goo.gl/…`) */
export const MAP_LINK_SHORT_HINT =
  'Энэ богино линк солбицол агуулаагүй — Google Maps дээр газраа нээж, хаягийн мөрний БҮРЭН линкийг хуулж тавина уу.';

/**
 * 📋 Google Maps-ийн БОГИНО хуваалцалт линк эсэх (`maps.app.goo.gl/…`).
 *    ⚠️ Ийм линк солбицол агуулахгүй тул задлах БОЛОМЖГҮЙ — UI нь
 *       БҮРЭН линк оруулахыг заана ✓
 * @param {string} text
 * @returns {boolean}
 */
export function isShortMapsLink(text) {
  if (typeof text !== 'string') return false;
  const s = text.trim();
  return /^https?:\/\/(?:maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs)\//i.test(s);
}

/**
 * 📋 Google Maps линк (эсвэл «lat,lng» текст)-ээс СОЛБИЦОЛ задлана.
 *    Дараалал: ④ `!3d`/`!4d` (PLACE) → ① `@` → ②③ `q=`/`ll=`/… → ⑤ энгийн хос
 *    ⚠️ `decodeURIComponent` нь муу утгад (`'%'`) шидэж болзошгүй тул
 *       try/catch-аар хамгаална ✓
 *    ⚠️ Задарсан утга нь `isValidCoord`-оор шалгагдана (муж + `(0,0)` хүчингүй)
 * @param {string} text
 * @returns {{lat: number, lng: number}|null} солбицол олдоогүй бол `null`
 */
export function parseGoogleMapsLink(text) {
  if (typeof text !== 'string' || !text.trim()) return null;
  let s = text.trim();
  try { s = decodeURIComponent(s); } catch (e) { /* муу encode — түүхий мөрөөр үргэлжилнэ */ }
  const pick = (m) => {
    if (!m) return null;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    return isValidCoord(lat, lng) ? { lat, lng } : null;
  };
  // ④ PLACE-ийн БОДИТ пин (хамгийн нарийн) — `/data=…!3dLAT!4dLNG…`
  const place = pick(s.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/));
  if (place) return place;
  // ① Газрын зургийн ТӨВ — `/@LAT,LNG[,ZOOM]`
  const at = pick(s.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/));
  if (at) return at;
  // ②③ Хайлтын/бусад параметр — `?q=LAT,LNG` · `?ll=` · `?center=` · `?query=` …
  const q = pick(s.match(/[?&](?:q|ll|center|destination|query|daddr)=(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/i));
  if (q) return q;
  // ⑤ Зүгээр «lat,lng» (хэрэглэгч зөвхөн солбицлоо хуулсан байж болно)
  const plain = pick(s.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/));
  if (plain) return plain;
  return null;
}
