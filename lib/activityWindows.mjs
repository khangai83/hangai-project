// ============================================================
// activityWindows.mjs — Хандалтын ЦОНХНЫ ЦЭВЭР математик
//
// ЯАГААД ТУСДАА ФАЙЛ ВЭ:
//   Энэ модуль нь ЗӨВХӨН цэвэр функцууд (import, env, сүлжээ ГҮЙ) тул
//   Node дээр шууд тестлэх боломжтой → `npm run test:activity`.
//   `lib/listingActivity.js` (сервер, service_role) үүнийг ашигладаг.
//
// ⚠️ ӨДРИЙН ХИЛ НЬ UTC:
//   Postgres-ийн `current_date` (Supabase дээр UTC) -тай нийцүүлэх ёстой —
//   эс бөгөөд шөнө дундын орчим тоо зөрнө.
//
// ЦОНХНЫ УТГА (age = хэд хоногийн өмнө):
//   age 0..0  → d1        «сүүлийн 1 хоног»  (өнөөдөр)
//   age 0..2  → d3        «сүүлийн 3 хоног»  (өнөөдөр + өчигдөр + 2 хоног)
//   age 0..6  → d7        «сүүлийн 7 хоног»
//   age 0..29 → d30       «сүүлийн 30 хоног»
//   age ≥ 30  → хаана ч орохгүй
// ============================================================

/** Өдөр тутмын цувааны урт (график) — 30 хоног */
export const SERIES_DAYS = 30;

/** '2026-09-23' — өнөөдрийн UTC өдөр */
export function todayUtc() {
  return new Date().toISOString().slice(0, 10);
}

/** '2026-09-23' → Date (UTC шөнө дунд) */
export function parseDay(day) {
  return new Date(`${day}T00:00:00.000Z`);
}

/** '2026-09-23' + n хоног → '2026-08-25' (сөрөг ч болно) */
export function shiftDay(day, delta) {
  const d = parseDay(day);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

/** `day` нь `today`-аас хэд хоногийн өмнө вэ (0 = өнөөдөр, сөрөг = ирээдүй) */
export function daysAgo(day, today) {
  return Math.round((parseDay(today) - parseDay(day)) / 86400000);
}

/** Цонхны хоосон сагс */
export function emptyWindows() {
  return { d1: 0, d3: 0, d7: 0, d30: 0 };
}

/**
 * Нэг өдрийн утгыг 1/3/7/30 хоногийн сагсанд нэмнэ.
 * @param {{d1:number,d3:number,d7:number,d30:number}} buckets
 * @param {number} age — хэд хоногийн өмнө (0 = өнөөдөр)
 * @param {number} value — нэмэх утга (0 бол алгасна)
 */
export function addToWindows(buckets, age, value) {
  if (!value) return;
  if (!Number.isFinite(age) || age < 0) return; // ирээдүй/тоо биш → алгасна
  if (age < 1) buckets.d1 += value;
  if (age < 3) buckets.d3 += value;
  if (age < 7) buckets.d7 += value;
  if (age < 30) buckets.d30 += value;
}

/** `created_at` / '2026-09-23' → UTC өдрийн мөр ('2026-09-23') */
export function dayOf(value) {
  if (!value) return null;
  const iso = String(value);
  return iso.length >= 10 && iso[4] === '-' ? iso.slice(0, 10) : new Date(iso).toISOString().slice(0, 10);
}

/** 30 хоногийн цувааны индекс (0 = хамгийн хуучин, 29 = өнөөдөр) */
export function seriesIndex(age) {
  return SERIES_DAYS - 1 - age;
}

// ============================================================
// СОНГОСОН ХУГАЦАА — UI-ийн сонголт ба утга авах логик
//
// ⚠️ Эдгээр нь ЦЭВЭР функцууд (React/JSX-гүй) тул `scripts/test-activity.mjs`
//    -ээр тестлэгддэг. UI компонент (`MyListingsStatsPanel.jsx`) үүнийг ашиглана.
// ============================================================

/**
 * Сонгох хугацааны сонголтууд.
 *   days: 1/3/7/30 → серверийн d1/d3/d7/d30 цонх
 *   days: 0       → «Нийт» (ALL_TIME_DAYS) — бүх хугацааны давхардалгүй тоо
 */
export const ALL_TIME_DAYS = 0;

export const PERIODS = [
  { days: 1, label: '1 хоног' },
  { days: 3, label: '3 хоног' },
  { days: 7, label: '7 хоног' },
  { days: 30, label: '30 хоног' },
  { days: ALL_TIME_DAYS, label: 'Нийт' },
];

/** «Нийт» (бүх хугацаа) сонгосон эсэх */
export function isAllTime(days) {
  return days === ALL_TIME_DAYS;
}

/**
 * Үзсэн тоог сонгосон хугацаагаар авах.
 *   days=7          → item.views.d7        (7 хоногийн хандалт)
 *   days=0 («Нийт») → item.uniqueViews     (бүх хугацаанд давхардалгүй үзсэн хүн)
 *
 * ⚠️ Серверийн payload-д `views.d0` гэсэн түлхүүр БАЙХГҮЙ — тиймээс
 *    «Нийт»-ийг тусад нь `uniqueViews`-ээс авна (эс бөгөөд 0 болно).
 *
 * @param {{views?:object, uniqueViews?:number}|null} item — зар эсвэл totals
 * @param {number} days
 */
export function pickViews(item, days) {
  if (!item) return 0;
  if (isAllTime(days)) return Number(item.uniqueViews) || 0;
  return Number(item.views && item.views[`d${days}`]) || 0;
}

/** ❤️-г сонгосон хугацаагаар авах (Нийт → бүх хугацааны давхардалгүй ❤️) */
export function pickLikes(item, days) {
  if (!item) return 0;
  if (isAllTime(days)) return Number(item.uniqueLikes) || 0;
  return Number(item.likes && item.likes[`d${days}`]) || 0;
}

// ============================================================
// ГРАФИКИЙН ТУСЛАХ
// ============================================================

/** Гарагийн товчлол — `weekdayIndex()`-ийн дараалал (0 = Ням) */
export const WEEKDAY_SHORT = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];

/**
 * 'YYYY-MM-DD' → гарагийн дугаар (0 = Ням … 6 = Бямба), UTC-ээр.
 * ⚠️ UTC шөнө дунд гэж уншина — локаль цаг руу шилжвэл өдөр зөрнө.
 */
export function weekdayIndex(day) {
  const s = String(day || '');
  if (s.length < 10) return null;
  const d = new Date(`${s.slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? null : d.getUTCDay();
}

/** 'YYYY-MM-DD' → 'Да' (гарагийн товчлол; тохирохгүй бол '') */
export function weekdayShort(day) {
  const i = weekdayIndex(day);
  return i === null ? '' : WEEKDAY_SHORT[i];
}


