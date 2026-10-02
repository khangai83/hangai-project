// ============================================================
// numberChoices.mjs — ТООН УТГЫН «СОНГОЛТЫН ЖАГСААЛТ» (цэвэр логик)
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-02): «…жагсаалтаас сонгоод оруулдаг байя,
// жишээ нь барилгийн давхар 1 2 3 4 … 26-аас сонгуулах. Бас ашиглалтанд орсон
// оныг 1980-аас 2026-аас сонгуулах … эсвэл iPhone timer-ийн тоо сонгодог шиг
// хийж чадах уу» ⇒ ХЯЗГААРЛАГДСАН тоон талбар (давхар · он · тагт ·
// угаалгын өрөө) нь форм дээр ГАРААР БИЧИХ биш, ЖАГСААЛТААС сонгогдоно.
// 📱 Мобайлд сонголт нь iOS Timer маягийн ДУГУЙ
// (`components/WheelPicker.jsx`) — утгаа төвд нь гүйлгэн сонгоно ✓
//
// ⚠️ ЯАГААД ТУСДАА МОДУЛЬ ВЭ: ямар ч импортгүй ЦЭВЭР функцууд тул
//    `scripts/test-number-choices.mjs` нь Node-оор ШУУД ачаалж тестлэнэ ✓
//    (React/DB хөндөхгүй — `lib/roomFilter.mjs`-ийн зарчим ХЭВЭЭР)
// ⚠️ Утгууд нь ЯГ ТЕКСТ хэлбэрээр (`4` биш `'4'`) — форм, `attrs` (jsonb),
//    URL бүгд текстээр харьцуулдаг тул тоо/текст ХОЛИЛДОХГҮЙ ✓
// ⚠️ НЭГ ЭХ СУРВАЛЖ: форм (`components/AddListingClient.jsx`), дугуй
//    (`components/WheelPicker.jsx`) ба 🚗 оны attr талбар (`lib/locationData.js`
//    → `choices`) БҮГД энэ модулиас жагсаалтаа авна ✓
// 🔍 Хайх үг: numberChoices, YEAR_FROM, FLOOR_MAX, countChoices, floorChoices,
//    yearChoices, toChoiceItems, choiceText, nearestChoiceIndex,
//    indexFromScroll, scrollTopForIndex
// ============================================================

/**
 * 📅 ОНЫ хүрээ — хэрэглэгчийн хүсэлтээр **1980–2026** (хоёулаа ОРНО).
 * ⚠️ Хатуу тогтмол (динамик биш): тест тогтвортой байх ба хэрэглэгчийн
 *    хэлсэн хүрээтэй ЯГ таарна ✓
 */
export const YEAR_FROM = 1980;
export const YEAR_TO = 2026;

/** 🏢 ДАВХРЫН дээд хязгаар — хэрэглэгчийн хүсэлт: «1 2 3 4 … 26» */
export const FLOOR_MAX = 26;

/**
 * 🚿 Угаалгын өрөөний сонголтын дээд хязгаар.
 * ⚠️ Жагсаалт нь БҮРЭН биш — 6-аас олон бол 🖥 дээр гараар бичиж болно
 *    (сонголт нь зөвхөн ТҮГЭЭМЭЛ утгуудыг хурдан сонгох зорилготой ✓)
 */
export const BATHROOM_MAX = 6;

/**
 * 🔢 Дараалсан тоонуудын жагсаалт (`1..26`) — ТЕКСТ хэлбэрээр.
 * @param {number} from эхлэх тоо (орно)
 * @param {number} to   дуусах тоо (орно)
 * @param {string} [includeValue] жагсаалтад БАЙХГҮЙ ХУУЧИН утга (ж: `'30'`) —
 *   тэр нь ч жагсаалтад ОРУУЛНА (засах горимд хуучин утга алга болохгүй ✓)
 * @returns {string[]}
 */
export function countChoices(from = 1, to = 1, includeValue = '') {
  const out = [];
  const start = Number.isFinite(Number(from)) ? Math.floor(Number(from)) : 1;
  const end = Number.isFinite(Number(to)) ? Math.floor(Number(to)) : start;
  for (let n = start; n <= end; n += 1) out.push(String(n));
  const extra = String(includeValue ?? '').trim();
  if (/^\d+$/.test(extra) && !out.includes(extra)) {
    out.push(extra);
    out.sort((a, b) => Number(a) - Number(b));
  }
  return out;
}

/**
 * 📅 ОНууд — **БУУРАХ** эрэмбээр (`2026 → 1980`).
 * ⚠️ Шинэ он нь орон сууцны зах зээлд илүү түгээмэл тул дугуй нээгдэхэд
 *    ойрхон байх ёстой (гараар 40 мөр гүйлгэх шаардлагагүй ✓)
 * @param {number} [from] эхлэх (хуучин) он
 * @param {number} [to]   дуусах (шинэ) он
 * @param {string} [includeValue] хүрээнээс ГАДУУР он (ж: `'1965'`) — ОРУУЛНА
 */
export function yearChoices(from = YEAR_FROM, to = YEAR_TO, includeValue = '') {
  const out = [];
  const start = Number.isFinite(Number(from)) ? Math.floor(Number(from)) : YEAR_FROM;
  const end = Number.isFinite(Number(to)) ? Math.floor(Number(to)) : YEAR_TO;
  for (let y = end; y >= start; y -= 1) out.push(String(y));
  const extra = String(includeValue ?? '').trim();
  if (/^\d{4}$/.test(extra) && !out.includes(extra)) {
    out.push(extra);
    out.sort((a, b) => Number(b) - Number(a));
  }
  return out;
}

/**
 * 📅 БҮХ оны сонголт (`1980…2026`, буурах) — 🚗 attr талбарын `choices`
 * (`lib/locationData.js`: «Үйлдвэрлэсэн он» · «Орж ирсэн он») ✓
 */
export const YEAR_CHOICES = yearChoices();

/**
 * 🏢 ДАВХРЫН жагсаалт — барилгын НИЙТ ДАВХРААС хэтрэхгүй.
 * @param {number} [max] барилгын нийт давхар (хэрэглэгч оруулсан бол) —
 *   `FLOOR_MAX`-аас хэтрэхгүй, дор хаяж 1
 * @param {string} [includeValue] хуучин утга (ж: `'30'`) — ОРУУЛНА ✓
 */
export function floorChoices(max = FLOOR_MAX, includeValue = '') {
  const n = Number(max);
  const top = Number.isFinite(n) ? Math.min(Math.max(1, Math.floor(n)), FLOOR_MAX) : FLOOR_MAX;
  return countChoices(1, top, includeValue);
}

/**
 * 🎛 Дугуй/жагсаалтын мөрүүд: `[{ value, label }]`.
 * @param {Array<string|number>} values утгууд (`1`, `'2015'` …)
 * @param {{ emptyLabel?: string, unit?: string }} [opts]
 *   • `emptyLabel` — эхэнд нэмэх ХООСОН мөр (ж: `'—'`); `''` бол нэмэхгүй
 *   • `unit` — шошгонд залгах нэгж (ж: `'тагт'` → `'2 тагт'`)
 * ⚠️ Давхар/оны шошго нь ЗӨВХӨН тоо (iOS Timer-тэй ижил, цэвэрхэн ✓) — нэгжийг
 *    дугуйн ГАРЧИГ болон форм дээрх товч харуулна ✓
 */
export function toChoiceItems(values = [], { emptyLabel = '', unit = '' } = {}) {
  const items = emptyLabel ? [{ value: '', label: emptyLabel }] : [];
  values.forEach((v) => {
    const value = String(v);
    items.push({ value, label: unit ? `${value} ${unit}` : value });
  });
  return items;
}

/**
 * 🔘 Форм дээрх «сонгосон утга» товчны бичиг: `'5 давхар'` · `'2015 он'`.
 * Хоосон утга → `''` (форм нь «Сонгох» гэж өөрөө харуулна ✓)
 */
export function choiceText(value, unit = '') {
  const v = String(value ?? '').trim();
  if (!v) return '';
  return unit ? `${v} ${unit}` : v;
}

/**
 * 🎯 Дугуйг НЭЭХЭД төвд нь тавих мөрийн индекс.
 *  ① ЯГ таарсан утга байвал — түүний индекс
 *  ② эс бөгөөс — хамгийн ОЙР тоо (ж: `'30'` → `'26'`)
 *  ③ тоо биш/хоосон бол — 0 (эхний мөр: «—» эсвэл хамгийн бага утга ✓)
 */
export function nearestChoiceIndex(values = [], value = '') {
  const list = values.map((v) => String(v));
  const target = String(value ?? '').trim();
  const exact = list.indexOf(target);
  if (exact >= 0) return exact;
  const n = Number(target);
  if (!target || !Number.isFinite(n)) return 0;
  let best = 0;
  let bestDiff = Infinity;
  list.forEach((v, i) => {
    const d = Math.abs(Number(v) - n);
    /**
     * ⚠️ Хоосон мөр (`''` → `Number('')` = 0) нь тоо БИШ тул алгасна —
     *    эс бөгөөс «30» гэсэн утга «—» мөрөнд наалдана ✗
     */
    if (String(v).trim() === '' || !Number.isFinite(d)) return;
    if (d < bestDiff) { bestDiff = d; best = i; }
  });
  return best;
}

/**
 * 🎡 ГҮЙЛГЭЭНИЙ БАЙРЛАЛ → МӨРИЙН ИНДЕКС (дугуйн «төвд байгаа мөр»).
 * iOS Timer-ийн математик: төвд байгаа мөр = `round(scrollTop / itemHeight)`.
 * @param {number} scrollTop гүйлгээний байрлал (px) — сөрөг/хэт том ч болно
 * @param {number} itemHeight нэг мөрийн өндөр (px, ж: `40`)
 * @param {number} [maxIndex] мөрийн ДЭЭД индекс (`items.length - 1`) — хязгаарлана ✓
 * @returns {number} `0 … maxIndex` (ямар ч оролтод тоо буцаана — `NaN` БИШ ✓)
 * ⚠️ `WheelPicker` нь гүйлгээ ЗОГССОНЫ дараа ЯГ энэ функцээр төвийг тодорхойлно
 *    ⇒ «гүйлгээний математик» нь Node тестээр түгжигдэнэ ✓
 */
export function indexFromScroll(scrollTop, itemHeight = 40, maxIndex = Infinity) {
  const h = Number(itemHeight);
  const top = Number(scrollTop);
  /**
   * ⚠️ Дээд хязгаар:
   *   • `maxIndex` өгөөгүй (`undefined`) эсвэл `Infinity` → ХЯЗГААРГҮЙ
   *     (өгөгдмөл зан — жагсаалтын уртыг мэдэхгүй үед ч дуудна ✓)
   *   • `-1` (хоосон жагсаалт: `items.length - 1`) → `0` (сөрөг индекс рүү
   *     ХАТГАХГҮЙ ✓)
   */
  const max = Number(maxIndex);
  const top0 = Number.isFinite(max) ? Math.max(0, Math.floor(max)) : Infinity;
  if (!Number.isFinite(h) || h <= 0 || !Number.isFinite(top)) return 0;
  const idx = Math.round(top / h);
  return Math.min(Math.max(0, idx), top0);
}

/**
 * 🎡 МӨРИЙН ИНДЕКС → ГҮЙЛГЭЭНИЙ БАЙРЛАЛ (мөрийг ТӨВД нь тавина).
 * `indexFromScroll(scrollTopForIndex(i, h), h, …) === i` — харилцан урвуу ✓
 * @param {number} index мөрийн индекс
 * @param {number} itemHeight нэг мөрийн өндөр (px)
 */
export function scrollTopForIndex(index, itemHeight = 40) {
  const h = Number(itemHeight);
  const i = Number(index);
  const idx = Number.isFinite(i) ? Math.max(0, Math.floor(i)) : 0;
  return Number.isFinite(h) && h > 0 ? idx * h : 0;
}

