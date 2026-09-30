// ============================================================
// rangeSlider.mjs — «ЧИРЖ ТОХИРУУЛДАГ ХҮРЭЭ»-ний ЦЭВЭР математик
//
// ЯАГААД ТУСДАА МОДУЛЬ ВЭ:
//   Үнэ / талбай / оны хүрээг зөвхөн гараар БИЧЭЭД биш, ХУЛГАНААР (mouse)
//   эсвэл ХУРУУГААР (touch/touchpad) ЧИРЖ тохируулдаг болгов
//   (хэрэглэгчийн хүсэлт: «дээд доод үнэ, талбай гэх мэтийн тоог mouse
//   юмуу, touchpad аас чирээд тохируулдаг байвал их гоё харагдах байна»).
//   ⚠️ Слайдерийн БҮХ тооцоолол (pct ↔ утга, алхам, хил, гарын товч) нь
//      ЭНД байна — React компонент (`components/RangeSlider.jsx`) нь зөвхөн
//      pointer/keyboard үйлдлийг тооцоолол руу ЗАЛГАНА.
//   ⚠️ Импортгүй (цэвэр функцууд) тул Node-ийн `scripts/test-search.mjs`
//      тест нь React/DB-гүйгээр ШУУД дуудна ✓ (`lib/messages.mjs`-ийн адил).
//
// ⚠️ ГҮЙЛТЭН АЛДААНААС СЭРГИЙЛЭХ 4 ДҮРЭМ (бүгд тестээр түгжсэн):
//   ① Хоёр handle ХЭЗЭЭ Ч ГАРАЛЦАХГҮЙ (`from <= to`) — `moveHandle()` засна
//   ② ХИЛ ДЭЭР (`bounds.min` / `bounds.max`) байгаа тал нь «шүүлт БАЙХГҮЙ»
//      → `toFilterPair()` нь `''` буцаана (URL/DB цэвэр, chip гарч ирэхгүй)
//   ③ `from > to` гэж бичиж/чирвэл `activePair()` нь ЗАСНА (слайдер эвдрэхгүй)
//   ④ `bounds` нь хэрэглэгчийн бичсэн ТОМ утгаас БАГА бол динамикаар
//      ӨРГӨСНӨ (`withDynamicBounds`) — гараар бичсэн үнэ алдагдахгүй ✓
//      ⚠️ Гэхдээ «хил»-ийн харьцуулалт (`toFilterPair`) нь ҮРГЭЛЖ
//         АНХДАГЧ (base) хилээр хийгдэнэ — эс бөгөөс өргөссөн хил дээр
//         хэрэглэгчийн шүүлт ЧИМЭЭГҮЙ АРИЛНА ✗
// ============================================================

/** ₮ үнийн анхдагч хил — хэсгээс хамаарна (`priceBounds()`-ыг үз) */
export const PRICE_BOUNDS = {
  /**
   * Бусад хэсэг (🚗 авто, 💻 компьютер, 🛋️ тавилга …) — 500 сая хүртэл
   * (5 саяар алхам: 100 алхам → чирэхэд жигд, хэт мэдрэмтгий биш ✓)
   */
  default: { min: 0, max: 500_000_000, step: 5_000_000 },
  /**
   * 🏠 Үл хөдлөх — 5 тэрбум хүртэл (50 саяар алхам).
   * ⚠️ Улаанбаатарт 1-3 тэрбумын орон сууц/оффис бодит байдаг тул
   *    `default` (500 сая) нь хэтэрхий ЖИЖИГ байх байсан ✗
   */
  realEstate: { min: 0, max: 5_000_000_000, step: 50_000_000 },
};

/** 📐 Талбайн хил (м²) — зөвхөн үл хөдлөхөд (`HomeClient` → `isRealEstate`) */
export const AREA_BOUNDS = { min: 0, max: 600, step: 5 };

/**
 * 📅 ОНЫ хүрээний эхлэл. `2015 — 2020` гэх мэтчилэн ЗӨВХӨН оныг чирнэ
 * (📅 Үйлдвэрлэсэн он / 📥 Орж ирсэн он — `lib/locationData.js → yearFilter`).
 * ⚠️ Дээд хязгаар нь ОДООГИЙН он (`yearBounds()`) — тогтмол бичихгүй, эс
 *    бөгөөс дараа жил шинэ машиныг шүүж ЧАДАХГҮЙ болно ✗
 */
export const YEAR_START = 1990;

/**
 * ₮ үнийн хил — хэсэг тус бүрд.
 * @param {boolean} isRealEstate Үл хөдлөх эсэх
 * @returns {{min:number, max:number, step:number}} (хуулбар — мутацлахаас сэргийлэв)
 */
export function priceBounds(isRealEstate) {
  return { ...(isRealEstate ? PRICE_BOUNDS.realEstate : PRICE_BOUNDS.default) };
}

/**
 * 📅 Оны хүрээний хил — дээд нь ОДООГИЙН он.
 * @param {number} [nowYear] Одоогийн он (тестэд тогтмол дамжуулна)
 */
export function yearBounds(nowYear = new Date().getFullYear()) {
  const y = Number.isFinite(Number(nowYear)) ? Math.floor(Number(nowYear)) : 2026;
  return { min: YEAR_START, max: Math.max(YEAR_START, y), step: 1 };
}

/**
 * Шүүлтийн утгыг (URL/state нь `string`) ТОО болгох.
 *   ''  ·  null  ·  undefined  ·  'abc'  → null  (шүүлт БАЙХГҮЙ)
 *   '250000000'        → 250000000
 *   '250,000,000'      → 250000000   (3 оронтой бүлэг = МӨНГӨН БИЧЛЭГ)
 *   '75,5'  ·  '75.5'  → 75.5        (1-2 орон = МОНГОЛ бутархай)
 *   '1 000'            → 1000        (зай нь мөнгөн бичлэг)
 *
 * ⚠️ Монголд ХОЁУЛАА хэрэглэгддэг: «250,000,000» (мөнгөн бичлэг) ба «75,5»
 *    (бутархай). Тиймээс тусгаарлагчийн ДАРААХ ОРНЫ ТООГООР ялгана —
 *    3 орон бол бүлэглэлт, 1-2 орон бол аравтын бутархай ✓
 */
export function parseNum(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;

  const raw = String(value).trim();
  if (!raw) return null;

  // Зай / «₮» / NBSP — мөнгөн бичлэгийн тусгаарлагч
  const cleaned = raw.replace(/[\s\u00a0₮]/g, '');
  if (/^-?\d+$/.test(cleaned)) return Number(cleaned);
  if (/^-?\d+[.,]\d{1,2}$/.test(cleaned)) return Number(cleaned.replace(',', '.'));
  if (/^-?\d{1,3}(?:[.,]\d{3})+$/.test(cleaned)) return Number(cleaned.replace(/[.,]/g, ''));
  // ⚠️ Хольсон («1,500.25») эсвэл эвдэрсэн утга — тоон утга БАЙХГҮЙ
  return null;
}

/** Тоог [min, max] дотор ХААХ. Тоо биш бол `min` */
export function clampNum(value, min, max) {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

/**
 * Утгыг АЛХАМД (step) тааруулж, хил дотор хайчилна.
 * Ж: `snapNum(37_400_000, {min:0,max:5e9,step:5e6})` → `35_000_000`
 * ⚠️ Алхам нь `min`-ээс эхэлж тоологдоно (0 биш) — ингэснээр «1990–2026»
 *    мэт 0-ээс эхлээгүй хүрээ ч зөв тэгшлэгдэнэ ✓
 */
export function snapNum(value, bounds) {
  const { min, max, step } = bounds;
  const s = Number(step) > 0 ? Number(step) : 1;
  const clamped = clampNum(value, min, max);
  const snapped = Math.round((clamped - min) / s) * s + min;
  return clampNum(Number(snapped.toFixed(6)), min, max);
}

/**
 * ④ Хэрэглэгчийн бичсэн утга хилээс ГАРВАЛ хүрээг ӨРГӨТГӨНӨ.
 * Ж: талбайн хил 600 м², хэрэглэгч 1200 м² бичвэл слайдер 1200 хүртэл сунах
 *    (гараар бичсэн утга нь слайдер дээр «хязгаарын гадна» үлдэхгүй ✓)
 * @param {{min:number,max:number,step:number}} bounds
 * @param {...(number|null|string)} values Харгалзах утгууд (хоосныг алгасна)
 */
export function withDynamicBounds(bounds, ...values) {
  const nums = values
    .map((v) => (typeof v === 'number' ? v : parseNum(v)))
    .filter((v) => v !== null && Number.isFinite(v));
  if (!nums.length) return { ...bounds };
  return {
    ...bounds,
    min: Math.min(bounds.min, ...nums),
    max: Math.max(bounds.max, ...nums),
  };
}

/** Утга → 0-100% (слайдерийн байрлал). `max === min` үед 0 */
export function valueToPct(value, bounds) {
  const span = bounds.max - bounds.min;
  if (!(span > 0)) return 0;
  return clampNum(((clampNum(value, bounds.min, bounds.max) - bounds.min) / span) * 100, 0, 100);
}

/** 0-100% → АЛХАМД тааруулсан утга (чирэх үед энэ нь дуудагдана) */
export function pctToValue(pct, bounds) {
  const span = bounds.max - bounds.min;
  return snapNum(bounds.min + (span * clampNum(pct, 0, 100)) / 100, bounds);
}

/**
 * ③ Шүүлтийн мөрүүдээс слайдерт ХАРАГДАХ тоон утгуудыг гаргана.
 *   '' → тухайн талын ХИЛ (шүүлт байхгүй = бүтэн хүрээ ✓)
 *   `from > to` (хэрэглэгч буруу бичсэн) → `from`-ыг `to` руу буулгаж ЗАСНА
 * @returns {{from:number, to:number}} — үргэлж `bounds` дотор, `from <= to`
 */
export function activePair(from, to, bounds) {
  const f = parseNum(from);
  const t = parseNum(to);
  let fromN = clampNum(f === null ? bounds.min : f, bounds.min, bounds.max);
  const toN = clampNum(t === null ? bounds.max : t, bounds.min, bounds.max);
  if (fromN > toN) fromN = toN;
  return { from: fromN, to: toN };
}

/**
 * Чирсэн газарт ХАМГИЙН ОЙР handle-ыг сонгоно.
 * ⚠️ Тэнцүү зайд (`from` ба `to` нэг цэгт) → `'from'` (доод хязгаар).
 */
export function nearestHandle(value, from, to) {
  return Math.abs(value - from) <= Math.abs(value - to) ? 'from' : 'to';
}

/**
 * ① Нэг handle-ыг ШИНЭ утга руу зөөнө — нөгөө нь ГАРАЛЦАХГҮЙ (`from <= to`).
 * ⚠️ Чирж буй толгой нь ХУРУУНЫ ДООР ҮРГЭЛЖ үлдэнэ (хэрэглэгч «намайг
 *    дагаагүй» гэж гайхахгүй ✓); хэрэгтэй үед НӨГӨӨ толгойг ХАМТ түлхэнэ.
 *    Ж: `{from:100,to:300}` дээр `from`-ыг 500 рүү чирвэл → `{from:500,to:500}`
 * @param {'from'|'to'} handle
 * @param {number} value Шинэ утга (чирсэн байрлал)
 * @returns {{from:number, to:number}}
 */
export function moveHandle(handle, value, from, to, bounds) {
  const v = clampNum(value, bounds.min, bounds.max);
  if (handle === 'to') return { from: Math.min(from, v), to: v };
  return { from: v, to: Math.max(to, v) };
}

/**
 * ГАРЫН ТОВЧНЫ үйлдэл (a11y — слайдер нь зөвхөн хулганаар биш ✓).
 *   ← ↓ / → ↑ : нэг алхам      PageDown / PageUp : 10 алхам
 *   Home : хамгийн бага         End : хамгийн их
 * @returns {number|null} — `null` бол танигдаагүй товч (өөрчлөлт БАЙХГҮЙ)
 */
export function keyboardValue(key, current, bounds) {
  const step = Number(bounds.step) > 0 ? Number(bounds.step) : 1;
  const c = clampNum(current, bounds.min, bounds.max);
  switch (key) {
    case 'ArrowLeft':
    case 'ArrowDown':
      return clampNum(c - step, bounds.min, bounds.max);
    case 'ArrowRight':
    case 'ArrowUp':
      return clampNum(c + step, bounds.min, bounds.max);
    case 'PageDown':
      return clampNum(c - step * 10, bounds.min, bounds.max);
    case 'PageUp':
      return clampNum(c + step * 10, bounds.min, bounds.max);
    case 'Home':
      return bounds.min;
    case 'End':
      return bounds.max;
    default:
      return null;
  }
}

/**
 * ② Слайдерийн утгууд → ШҮҮЛТИЙН мөрүүд.
 * ⚠️ ХИЛ ДЭЭР байгаа тал нь `''` болно («хязгааргүй» гэсэн үг) — ингэснээр
 *    URL («?maxPrice=…») ба DB query-д шаардлагагүй нөхцөл ОРЖ, chip нь
 *    ХУДАЛ гарч ирэхгүй ✓ (`isRangeActive`-тай НЭГ дүрэмтэй)
 * ⚠️ Харьцуулалт нь АНХДАГЧ (base) хилээр — `withDynamicBounds()`-ийн
 *    өргөссөн хилээр хийвэл хэрэглэгчийн бичсэн утга АРИЛНА ✗
 */
export function toFilterPair(from, to, bounds) {
  return {
    from: from === bounds.min ? '' : String(from),
    to: to === bounds.max ? '' : String(to),
  };
}

/** Тухайн хүрээнд ШҮҮЛТ идэвхтэй эсэх (шүүлтийн мөрүүдээр — `''` = идэвхгүй) */
export function isRangeActive(from, to) {
  return Boolean(from || to);
}

/**
 * Слайдерийн толгойн уншигдах шошго.
 *   ₮  → «₮150 сая – ₮1 тэрбум»   (`short` = `lib/format.js → shortPrice`)
 *   м² → «45 – 120 м²»            он → «2015 – 2020 он»
 *
 * ⚠️ `short(0)` нь `''` буцаадаг (format.js: «0 → хоосон») тул ХИЛ ДЭЭРХ тал
 *    «₮ – ₮5 тэрбум» гэж ХООСОН/эвдэрхий харагдана → тоо руу буцаана ✓
 * @param {number} fromN @param {number} toN
 * @param {{unit?:string, short?:(n:number)=>string}} [opts]
 */
export function rangeLabel(fromN, toN, { unit = '', short } = {}) {
  const fmt = (n) => (short ? short(n) || String(n) : String(n));
  const f = fmt(fromN);
  const t = fmt(toN);
  if (unit === '₮') return `₮${f} – ₮${t}`;
  return unit ? `${f} – ${t} ${unit}` : `${f} – ${t}`;
}

/**
 * ТҮРГЭН СОНГОХ ХҮРЭЭ (eBay-ийн «Under ₮…» / «₮5–20 сая» мөр шиг) —
 * хэрэглэгч слайдер ЧИРЭХГҮЙ, зөвхөн нэг дарж түгээмэл хүрээг сонгоно ✓
 *
 * ⚠️ Хувь нь АНХДАГЧ хилээс (`bounds`) бодогдоно — хил бүрд 4 утга:
 *    0-5% · 5-15% · 15-40% · 40-100%. 500 сая → 25 сая / 75 сая / 200 сая /
 *    200 сая+ ; 5 тэрбум → 250 сая / 750 сая / 2 тэрбум / 2 тэрбум+ ✓
 *    (Хоёуланд нь хүн ойлгох ДУГУЙ тоо гарна.)
 * @param {{min:number,max:number,step:number}} bounds
 * @param {(n:number)=>string} short Товч форматлагч (`shortPrice`)
 * @returns {Array<{key:string,label:string,from:number,to:number}>}
 */
export function priceQuickPicks(bounds, short) {
  const at = (ratio) => snapNum(bounds.min + (bounds.max - bounds.min) * ratio, bounds);
  const cuts = [at(0.05), at(0.15), at(0.4)];
  return [
    { from: bounds.min, to: cuts[0] },
    { from: cuts[0], to: cuts[1] },
    { from: cuts[1], to: cuts[2] },
    { from: cuts[2], to: bounds.max },
  ].map((p, i) => ({
    ...p,
    key: `${p.from}-${p.to}`,
    // ① «₮25 сая хүртэл» · ②③ «₮25 – ₮75 сая» · ④ «₮2 тэрбумаас дээш»
    label: i === 0
      ? `₮${short(p.to)} хүртэл`
      : i === 3
        ? `₮${short(p.from)}-с дээш`
        : `₮${short(p.from)} – ₮${short(p.to)}`,
  }));
}
