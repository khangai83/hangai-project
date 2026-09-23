// ============================================================
// test-activity.mjs — Хандалтын статистикийн ЦОНХНЫ МАТЕМАТИКИЙН тест
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   «Сүүлийн 1/3/7/30 хоног» гэдэг нь off-by-one алдаа гаргахад маш хялбар
//   (өнөөдрийг оруулах уу, 7 хоног гэдэг нь 0..6 уу 0..7 уу г.м.). Энэ тест
//   хил бүрийг (0, 1, 2, 3, 6, 7, 29, 30) ЯГ таг шалгана.
//
// АЖИЛЛУУЛАХ:  npm run test:activity
//
// ⚠️ Тест нь зөвхөн ЦЭВЭР функцуудыг (lib/activityWindows.mjs) шалгана —
//    сүлжээ, Supabase, env шаардахгүй тул Node дээр шууд ажиллана.
//    (Сервер талын `lib/listingActivity.js` нь энэ модулийг ашигладаг.)
// ============================================================
import assert from 'node:assert/strict';
import {
  SERIES_DAYS,
  todayUtc,
  shiftDay,
  daysAgo,
  emptyWindows,
  addToWindows,
  dayOf,
  seriesIndex,
  PERIODS,
  ALL_TIME_DAYS,
  isAllTime,
  pickViews,
  pickLikes,
  WEEKDAY_SHORT,
  weekdayIndex,
  weekdayShort,
} from '../lib/activityWindows.mjs';

let passed = 0;
const test = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🧪 Цонхны математикийн тест (lib/activityWindows.mjs)\n');

// ---------------- todayUtc ----------------
test("todayUtc() нь 'YYYY-MM-DD' хэлбэртэй", () => {
  assert.match(todayUtc(), /^\d{4}-\d{2}-\d{2}$/);
});

// ---------------- shiftDay ----------------
test('shiftDay: 30 хоногийн цонхны эхлэл (2026-09-23 − 29 = 2026-08-25)', () => {
  assert.equal(shiftDay('2026-09-23', -29), '2026-08-25');
});

test('shiftDay: жилийн хил (2026-01-01 − 1 = 2025-12-31)', () => {
  assert.equal(shiftDay('2026-01-01', -1), '2025-12-31');
});

test('shiftDay: өндөр жил (2024-03-01 − 1 = 2024-02-29)', () => {
  assert.equal(shiftDay('2024-03-01', -1), '2024-02-29');
});

test('shiftDay: өндөр жил БИШ (2026-03-01 − 1 = 2026-02-28)', () => {
  assert.equal(shiftDay('2026-03-01', -1), '2026-02-28');
});

test('shiftDay: 0 бол өөрчлөгдөхгүй', () => {
  assert.equal(shiftDay('2026-09-23', 0), '2026-09-23');
});

// ---------------- daysAgo ----------------
test('daysAgo: ижил өдөр = 0', () => {
  assert.equal(daysAgo('2026-09-23', '2026-09-23'), 0);
});

test('daysAgo: өчигдөр = 1', () => {
  assert.equal(daysAgo('2026-09-22', '2026-09-23'), 1);
});

test('daysAgo: 30 хоногийн цонхны хамгийн хуучин = 29', () => {
  assert.equal(daysAgo('2026-08-25', '2026-09-23'), 29);
});

test('daysAgo: shiftDay-тай эргэлтэй нийцнэ (round-trip)', () => {
  for (let n = 0; n < 40; n += 1) {
    assert.equal(daysAgo(shiftDay('2026-09-23', -n), '2026-09-23'), n);
  }
});

// ---------------- addToWindows: цонхны хил ----------------
const single = (age) => {
  const b = emptyWindows();
  addToWindows(b, age, 1);
  return b;
};

test('age 0 (өнөөдөр) → бүх цонхонд', () => {
  assert.deepEqual(single(0), { d1: 1, d3: 1, d7: 1, d30: 1 });
});

test('age 1 (өчигдөр) → d1-д ОРОХГҮЙ, d3-д орно', () => {
  assert.deepEqual(single(1), { d1: 0, d3: 1, d7: 1, d30: 1 });
});

test('age 2 (2 хоног) → d3-д орно (сүүлийн 3 хоног = 0,1,2)', () => {
  assert.deepEqual(single(2), { d1: 0, d3: 1, d7: 1, d30: 1 });
});

test('age 3 → d3-д ОРОХГҮЙ, d7-д орно', () => {
  assert.deepEqual(single(3), { d1: 0, d3: 0, d7: 1, d30: 1 });
});

test('age 6 → d7-д орно (сүүлийн 7 хоног = 0..6)', () => {
  assert.deepEqual(single(6), { d1: 0, d3: 0, d7: 1, d30: 1 });
});

test('age 7 → d7-д ОРОХГҮЙ, d30-д орно', () => {
  assert.deepEqual(single(7), { d1: 0, d3: 0, d7: 0, d30: 1 });
});

test('age 29 → d30-д орно (сүүлийн 30 хоног = 0..29)', () => {
  assert.deepEqual(single(29), { d1: 0, d3: 0, d7: 0, d30: 1 });
});

test('age 30 → ХААНА Ч орохгүй', () => {
  assert.deepEqual(single(30), { d1: 0, d3: 0, d7: 0, d30: 0 });
});

test('age -1 (ирээдүйн огноо) → алгасагдана', () => {
  assert.deepEqual(single(-1), { d1: 0, d3: 0, d7: 0, d30: 0 });
});

test('value 0 → юу ч нэмэгдэхгүй', () => {
  const b = emptyWindows();
  addToWindows(b, 0, 0);
  assert.deepEqual(b, { d1: 0, d3: 0, d7: 0, d30: 0 });
});

test('утга хуримтлагдана (age 0 ×2, age 9 ×1)', () => {
  const b = emptyWindows();
  addToWindows(b, 0, 5);
  addToWindows(b, 0, 3);
  addToWindows(b, 9, 7); // 9 хоног → зөвхөн d30
  assert.deepEqual(b, { d1: 8, d3: 8, d7: 8, d30: 15 });
});

// ---------------- seriesIndex (графикийн байрлал) ----------------
test('seriesIndex: өнөөдөр (age 0) → хамгийн СҮҮЛИЙН элемент', () => {
  assert.equal(seriesIndex(0), SERIES_DAYS - 1);
});

test('seriesIndex: цонхны хамгийн хуучин (age 29) → ЭХНИЙ элемент', () => {
  assert.equal(seriesIndex(29), 0);
});

test('seriesIndex: буурах дараалалтай (spark[0] = хамгийн хуучин)', () => {
  for (let age = 0; age < SERIES_DAYS; age += 1) {
    assert.equal(seriesIndex(age), SERIES_DAYS - 1 - age);
  }
});

// ---------------- dayOf ----------------
test("dayOf: ISO огноо → 'YYYY-MM-DD'", () => {
  assert.equal(dayOf('2026-09-23T10:30:00.000Z'), '2026-09-23');
});

test("dayOf: 'YYYY-MM-DD' хэвээр үлдэнэ", () => {
  assert.equal(dayOf('2026-09-23'), '2026-09-23');
});

test('dayOf: хоосон утга → null', () => {
  assert.equal(dayOf(null), null);
  assert.equal(dayOf(''), null);
});

// ---------------- PERIODS / isAllTime / pickViews / pickLikes ----------------
console.log('\n--- Хугацааны сонголт ба утга авах ---');

test('PERIODS: 1, 3, 7, 30, Нийт — нийт 5 сонголт, сүүлийнх нь Нийт', () => {
  assert.equal(PERIODS.length, 5);
  assert.deepEqual(PERIODS.map((p) => p.days), [1, 3, 7, 30, ALL_TIME_DAYS]);
  assert.equal(PERIODS[PERIODS.length - 1].label, 'Нийт');
});

test('isAllTime: зөвхөн 0 нь «Нийт»', () => {
  assert.equal(isAllTime(0), true);
  assert.equal(isAllTime(1), false);
  assert.equal(isAllTime(30), false);
});

// Серверийн payload-ийн бодит хэлбэр (views.d0 гэсэн түлхүүр БАЙХГҮЙ!)
const ITEM = {
  views: { d1: 3, d3: 7, d7: 20, d30: 55 },
  likes: { d1: 0, d3: 1, d7: 4, d30: 9 },
  uniqueViews: 128,
  uniqueLikes: 21,
};

test('pickViews: цонх тус бүр зөв талбарыг уншина', () => {
  assert.equal(pickViews(ITEM, 1), 3);
  assert.equal(pickViews(ITEM, 3), 7);
  assert.equal(pickViews(ITEM, 7), 20);
  assert.equal(pickViews(ITEM, 30), 55);
});

test('pickViews: «Нийт» (0) → uniqueViews (views.d0 БИШ)', () => {
  assert.equal(ITEM.views.d0, undefined); // payload-д d0 байхгүй
  assert.equal(pickViews(ITEM, 0), 128);
});

test('pickLikes: цонх тус бүр + «Нийт» → uniqueLikes', () => {
  assert.equal(pickLikes(ITEM, 1), 0);
  assert.equal(pickLikes(ITEM, 7), 4);
  assert.equal(pickLikes(ITEM, 30), 9);
  assert.equal(pickLikes(ITEM, 0), 21);
});

test('pickViews/pickLikes: хоосон эсвэл дутуу утга → 0 (унахгүй)', () => {
  assert.equal(pickViews(null, 7), 0);
  assert.equal(pickViews(undefined, 7), 0);
  assert.equal(pickViews({}, 7), 0);
  assert.equal(pickViews({ views: null }, 7), 0);
  assert.equal(pickViews({ views: {} }, 7), 0);
  assert.equal(pickLikes({ likes: {} }, 0), 0);
  assert.equal(pickViews({ uniqueViews: null }, 0), 0);
});

test('pickViews: undefined цонхны түлхүүр → 0 (NaN биш)', () => {
  assert.equal(pickViews({ views: { d7: undefined } }, 7), 0);
  assert.equal(Number.isNaN(pickViews({ views: {} }, 99)), false);
});

// ---------------- Гараг (weekday) — графикийн X тэнхлэг ----------------
console.log('\n--- Гарагийн товчлол (график) ---');

test('WEEKDAY_SHORT: 7 утга, 0 = Ням … 6 = Бямба', () => {
  assert.equal(WEEKDAY_SHORT.length, 7);
  assert.equal(WEEKDAY_SHORT[0], 'Ня');
  assert.equal(WEEKDAY_SHORT[6], 'Бя');
});

test('weekdayIndex: бодит өдрүүд зөв (UTC)', () => {
  assert.equal(weekdayIndex('2026-09-20'), 0); // Ням
  assert.equal(weekdayIndex('2026-09-21'), 1); // Даваа
  assert.equal(weekdayIndex('2026-09-23'), 3); // Лхагва
  assert.equal(weekdayIndex('2026-09-26'), 6); // Бямба
});

test('weekdayShort: товчлол зөв', () => {
  assert.equal(weekdayShort('2026-09-23'), 'Лх');
  assert.equal(weekdayShort('2026-09-20'), 'Ня');
  assert.equal(weekdayShort('2024-02-29'), 'Пү'); // өндөр жил
});

test('weekdayIndex: долоо хоногийн эргэлт буцахгүй (7 хоног = ижил гараг)', () => {
  for (let i = 0; i < 14; i += 1) {
    assert.equal(weekdayIndex(shiftDay('2026-09-23', i)), weekdayIndex(shiftDay('2026-09-23', i + 7)));
  }
});

test('weekdayIndex/weekdayShort: буруу утга → null / \'\'', () => {
  assert.equal(weekdayIndex(null), null);
  assert.equal(weekdayIndex(''), null);
  assert.equal(weekdayIndex('abc'), null);
  assert.equal(weekdayShort(null), '');
  assert.equal(weekdayShort('2026-09'), '');
});

test('weekdayIndex: бүтэн ISO timestamp ч зөв (эхний 10 тэмдэгт)', () => {
  assert.equal(weekdayIndex('2026-09-23T10:30:00.000Z'), 3);
});

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест\n`);
