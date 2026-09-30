// ============================================================
// rangeFilter.mjs — «ДООД / ДЭЭД ТООНЫ ХҮРЭЭ»-ний ЦЭВЭР логик
//
// ЯАГААД ТУСДАА МОДУЛЬ ВЭ:
//   Үнэ (₮), талбай (м²), оны хүрээг (📅/📥) хэрэглэгч ГАРААР бичнэ —
//   оруулж байгаа тоо нь ЦЭГЭЭР тусгаарлагдана («1.000.000»).
//   ⚠️ Тооцоолол (утга ↔ шүүлт, бүлэглэлт, түргэн хүрээ) БҮГД ЭНД байна —
//      React компонент (`components/RangeInput.jsx`) нь зөвхөн оролтын
//      үйлдлийг тооцоолол руу ЗАЛГАНА.
//   ⚠️ Импортгүй (цэвэр функцууд) тул Node-ийн `scripts/test-search.mjs`
//      тест нь React/DB-гүйгээр ШУУД дуудна ✓ (`lib/roomFilter.mjs`-ийн адил).
//
// ⚠️ ТҮҮХ (яагаад «чирдэг хүрээ» БАЙХГҮЙ вэ):
//   2026-09-30-нд эхлээд ХОЁР ТОЛГОЙТ ЧИРДЭГ ХҮРЭЭ (`RangeSlider`) хийсэн ч
//   хэрэглэгчийн дараагийн хүсэлтээр («энэ дээд доод үнэ, талбай дээр
//   чирдэгээ больё, харин оруул байгаа тоог цэгээр тусгаарладаг болгоод
//   өгчих») чирэх хэсэг БҮРЭН ХАСАГДАВ ✗
//   → одоо зөвхөн ХОЁР ТЕКСТ ОРОЛТ + цэгээр тусгаарлагдсан тоо + (₮-д)
//     нэг дарахад хүрээ сонгох 4 товч ✓  ⚠️ Slider-ийн математик
//     (`valueToPct`/`pctToValue`/`moveHandle`/`nearestHandle`/`keyboardValue`/
//     `withDynamicBounds`) ХАСАГДСАН — буцаах бол git-ээс `f326ca0`-ыг үз
//
// ⚠️ ГҮЙЛТЭН АЛДААНААС СЭРГИЙЛЭХ 3 ДҮРЭМ (бүгд тестээр түгжсэн):
//   ① ХООСОН оролт = «шүүлт БАЙХГҮЙ» — `toFilterPair()` нь `''` буцаана
//      (URL/DB цэвэр, chip худал гарахгүй ✓)
//   ② ХИЛ ДЭЭР (`bounds.min` / `bounds.max`) байгаа тал ч «шүүлт БАЙХГҮЙ» —
//      эс бөгөөс «₮0-с дээш» гэсэн УТГАГҮЙ шүүлт үүснэ ✗
//   ③ Хэрэглэгч «1500000» гэж буулгасан ч, «1.500.000» гэж цэгтэй бичсэн ч
//      `parseNum()` нь ИЖИЛ тоо гаргана — DB руу хог утга явахгүй ✓
// ============================================================

/** ₮ үнийн анхдагч хил — хэсгээс хамаарна (`priceBounds()`-ыг үз) */
export const PRICE_BOUNDS = {
  /**
   * Бусад хэсэг (🚗 авто, 💻 компьютер, 🛋️ тавилга …) — 500 сая хүртэл
   * ⚠️ Эдгээр хил нь одоо ЗӨВХӨН «түргэн хүрээ» товчнуудад хэрэглэгдэнэ
   *    (чирдэг слайдер байхгүй болсон) — оролтын утга хилийн гадна ч
   *    ЯМАР Ч хязгаарлалтгүй бичигдэнэ ✓
   */
  default: { min: 0, max: 500_000_000, step: 5_000_000 },
  /**
   * 🏠 Үл хөдлөх — 5 тэрбум хүртэл.
   * ⚠️ Улаанбаатарт 1-3 тэрбумын орон сууц/оффис бодит байдаг тул
   *    `default` (500 сая) нь хэтэрхий ЖИЖИГ байх байсан ✗
   */
  realEstate: { min: 0, max: 5_000_000_000, step: 50_000_000 },
};

/** 📐 Талбайн хил (м²) — зөвхөн үл хөдлөхөд (`HomeClient` → `isRealEstate`) */
export const AREA_BOUNDS = { min: 0, max: 600, step: 5 };

/** 📅 ОНЫ хүрээний эхлэл (📅 Үйлдвэрлэсэн он / 📥 Орж ирсэн он) */
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
 * ⚠️ Дээд хязгаарыг тогтмол бичихгүй — эс бөгөөс дараа жил шинэ машиныг
 *    шүүж ЧАДАХГҮЙ болно ✗
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
 *   '250.000.000'      → 250000000   🆕 ЦЭГЭЭР тусгаарласан (монгол бичлэг)
 *   '75,5'  ·  '75.5'  → 75.5        (1-2 орон = МОНГОЛ бутархай)
 *   '1.234,5'          → 1234.5      🆕 бүлэглэлт + бутархай ХОЛЬСОН
 *   '1 000'            → 1000        (зай нь мөнгөн бичлэг)
 *
 * ⚠️ Монголд ХОЁУЛАА хэрэглэгддэг: «250.000.000»/«250,000,000» (мөнгөн
 *    бичлэг) ба «75,5» (бутархай). Тиймээс тусгаарлагчийн ДАРААХ ОРНЫ
 *    ТООГООР ялгана — 3 орон бол бүлэглэлт, 1-2 орон бол аравтын бутархай ✓
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
  // 🆕 «1.234,5» — цэг нь МЯНГАТ, таслал нь БУТАРХАЙ (монгол бүрэн бичлэг)
  if (/^-?\d{1,3}(?:\.\d{3})+,\d{1,2}$/.test(cleaned)) {
    return Number(cleaned.replace(/\./g, '').replace(',', '.'));
  }
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
 * Утгыг АЛХАМД (step) тааруулж, хил дотор хайчилна (түргэн хүрээний товчид).
 * Ж: `snapNum(237_000_000, {min:0,max:5e9,step:5e7})` → `250_000_000`
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
 * 🆕 ЦИФРҮҮДИЙГ 3-ААР БҮЛЭГЛЭЖ ЦЭГЭЭР ТУСГААРЛАНА: '250000000' → '250.000.000'
 *
 * ⚠️ ЗӨВХӨН цифр хүлээнэ — зай, таслал, ₮ тэмдэгт, үсэг БҮГД алгасна.
 *    Ингэснээр хэрэглэгч «250 000 000», «250,000,000» эсвэл «250abc» гэж
 *    буулгасан ч зөв бүлэглэгдэнэ ✓ (буулгасан текст нь ЭВДЭХГҮЙ)
 * ⚠️ Эхний тэгүүд хасагдана ('007' → '7') — гэхдээ ганц «0» үлдэнэ ✓
 * ⚠️ `Number()` ХЭРЭГЛЭХГҮЙ (`toLocaleString` ч) — 15+ цифртэй утга
 *    шилжихэд (precision) цифр АЛДАГДАХ эрсдэлтэй ✗ Тиймээс regex-ээр
 *    зөвхөн текстэн дээр бүлэглэнэ ✓
 *
 * @param {string|number} digits Цифрүүд (эсвэл хогтой текст)
 * @returns {string} — цэгтэй тоо, эсвэл '' (цифргүй бол)
 */
export function groupDigits(digits) {
  const d = String(digits == null ? '' : digits)
    .replace(/\D/g, '')
    .replace(/^0+(?=\d)/, '');
  if (!d) return '';
  return d.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/**
 * 🆕 ОРУУЛТЫН утгыг БИЧИХ ЯВЦАД нь цэгээр тусгаарлана (input-ийн value).
 *
 *   int     : '250000000'  → '250.000.000'      (макс 12 цифр)
 *             '₮ 1 500 000' → '1.500.000'
 *   decimal : '1234,5'     → '1.234,5'          (макс 8 бүхэл + 2 бутархай)
 *             '75.5'        → '75,5'   (цэгэн бутархайг «,» болгож ЗАСНА ✓)
 *   year    : '2026'       → '2026'             (макс 4 цифр, БҮЛЭГЛЭХГҮЙ!)
 *
 * ⚠️ ОН-ыг БҮЛЭГЛЭХГҮЙ — «2.026» гэж харагдвал он мэт биш, бутархай мэт
 *    уншигдана ✗
 * ⚠️ Бутархайн тусгаарлагч нь «,» (монгол дүрэм) — цэг нь мянгатын
 *    тусгаарлагч тул ХОЁР өөр утгатай. Хэрэглэгч «75.5» бичвэл 1-2 орон
 *    байгаа тул бутархай гэж ойлгож «,» болгоно ✓; «1.234» (3 орон) бол
 *    мянгат гэж ойлгож 1234 болно ✓
 * ⚠️ Бичиж байхдаа төгсгөлийн тусгаарлагчийг ХАДГАЛНА — «75,» гэж бичихэд
 *    «,» нь арилбал хэрэглэгч бутархай бичиж ЧАДАХГҮЙ болно ✗
 *
 * @param {string|number} raw Хэрэглэгчийн бичсэн (эсвэл URL-аас ирсэн) утга
 * @param {{mode?: 'int'|'decimal'|'year'}} [opts]
 * @returns {string} — бүлэглэсэн текст (`input.value`-д ШУУД тавина)
 */
export function formatGroupedInput(raw, { mode = 'int' } = {}) {
  const s = String(raw == null ? '' : raw).replace(/[\s\u00a0₮]/g, '');
  if (mode === 'year') return s.replace(/\D/g, '').slice(0, 4);

  if (mode === 'decimal') {
    // Сүүлийн 1-2 оронтой тусгаарлагч = аравтын бутархай (үлдсэн нь мянгат)
    const m = s.match(/^(.*?)([.,])(\d{0,2})$/);
    const intDigits = (m ? m[1] : s.replace(/[.,]/g, '')).replace(/\D/g, '').slice(0, 8);
    const dec = m ? m[3] : '';
    const sep = m || /[.,]$/.test(s) ? ',' : '';
    return `${groupDigits(intDigits)}${sep}${dec}`;
  }

  return groupDigits(s.replace(/\D/g, '').slice(0, 12));
}

/**
 * ② Шүүлтийн утгууд → ШҮҮЛТИЙН мөрүүд (ХИЛ ДЭЭР байгаа тал нь `''`).
 * ⚠️ ХИЛ ДЭЭР байгаа тал нь `''` болно («хязгааргүй» гэсэн үг) — ингэснээр
 *    «₮0-с дээш» гэсэн утгагүй шүүлт URL/DB-д ОРОХГҮЙ, chip худал
 *    гарч ирэхгүй ✓ (`isRangeActive`-тай НЭГ дүрэмтэй)
 * @param {number} from Утга (аль хэдийн тоо болгосон)
 * @param {number} to Утга
 * @param {{min:number,max:number}} bounds АНХДАГЧ хил
 * @returns {{from:string,to:string}} — `''` = хязгааргүй
 */
export function toFilterPair(from, to, bounds) {
  return {
    from: from === bounds.min ? '' : String(from),
    to: to === bounds.max ? '' : String(to),
  };
}

/** Тухайн хүрээнд ШҮҮЛТ идэвхтэй эсэх ('' = идэвхгүй) */
export function isRangeActive(from, to) {
  return Boolean(from || to);
}

/**
 * ХҮРЭЭНИЙ УНШИГДАХ ШОШГО — оролтын доорх жижиг мөр ба aria.
 *   ₮  → «₮150 сая – ₮1 тэрбум»   (`short` = `lib/format.js → shortPrice`)
 *   м² → «45 – 120 м²»            он → «2015 – 2020 он»
 *
 * ⚠️ `short(0)` нь `''` буцаадаг (format.js: «0 → хоосон») тул ХИЛ ДЭЭРХ тал
 *    «₮ – ₮5 тэрбум» гэж ХООСОН/эвдэрхий харагдана → тоо руу буцна ✓
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
 * ₮-ийн ТҮРГЭН СОНГОХ ХҮРЭЭ — чирэхгүй, зөвхөн НЭГ ДАРЖ сонгоно.
 *
 * ⚠️ Хувь нь АНХДАГЧ хилээс (`bounds`) бодогдоно — хил бүрд 4 утга:
 *    0-5% · 5-15% · 15-40% · 40-100%. 500 сая → 25 сая / 75 сая / 200 сая /
 *    200 сая+ ; 5 тэрбум → 250 сая / 750 сая / 2 тэрбум / 2 тэрбум+ ✓
 *    (Хоёуланд нь хүн ойлгох ДУГУЙ тоо гарна.)
 * ⚠️ Хил нь ЗӨВХӨН эдгээр товчийг бодоход хэрэглэгдэнэ — хэрэглэгч гараар
 *    хилийн ГАДНА утга бичихэд ЯМАР Ч саад болохгүй ✓
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

