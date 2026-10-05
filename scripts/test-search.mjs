// ============================================================
// test-search.mjs — ХАЙЛТЫН UI-ийн ЦЭВЭР логикийн тест
//
// ХАМРАХ ХҮРЭЭ:
//   ① `lib/rangeFilter.mjs`  — доод/дээд ТООНЫ хүрээний логик: монгол
//      тооны бичлэг → тоо, ЦЭГЭЭР бүлэглэх, хил
//   ② `lib/sortOptions.mjs`  — эрэмбэлэх сонголт (eBay-ийн «Sort: …»)
//   ③ ГЭРЭЭ: `components/HomeClient.jsx` + `lib/queries.js` нь дээрх
//      модулиудыг ХЭРЭГЛЭЖ байгаа эсэх (эх файлыг шууд уншина)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Хэрэглэгч «1.500.000» гэж цэгтэй бичихэд «1.5» эсвэл «1500000000» гэж
//   уншигдвал DB руу БУРУУ query явна («₮1.5-аас дээш» гэж хайвал бүх зар
//   гарна ✗). Мөн `?sort=xxx` гэсэн танихгүй утга PostgREST руу БАЙХГҮЙ
//   багана болж явахгүй (normalizeSort) гэдгийг түгжинэ ✓
//
// АЖИЛЛУУЛАХ:  npm run test:search
// ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (модуль нь импортгүй цэвэр).
//    🎚 Чирдэг слайдер (RangeSlider) 2026-09-30-нд ХАСАГДСАН тул
//    `valueToPct`/`pctToValue`/`moveHandle`/`nearestHandle`/`keyboardValue`/
//    `activePair`/`withDynamicBounds`-ийн тестүүд ч хасагдав ✓
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  AREA_BOUNDS, BUILD_YEAR_START, FLOOR_BOUNDS, PRICE_BOUNDS, YEAR_START,
  buildYearBounds, clampNum, formatGroupedInput, groupDigits, isRangeActive,
  parseNum, priceBounds, rangeLabel, snapNum,
  toFilterPair, yearBounds,
} from '../lib/rangeFilter.mjs';
import {
  DEFAULT_SORT, SORT_OPTIONS, normalizeSort, sortLabel, sortOrders,
} from '../lib/sortOptions.mjs';
// 🔎 ХАЙЛТЫН ТЕКСТ (2026-10-05) — token/AND/OR логик ба autocomplete санал
import {
  SEARCH_DESC_MIN_CHARS, SEARCH_FIELDS, SEARCH_MAX_TOKENS, buildSearchOr, normalizeSearch,
  sanitizeSearchTerm, searchTokens, searchableFields,
} from '../lib/searchText.mjs';
import { listingHint, mergeSuggestions, sectionLabel, suggestTypes } from '../lib/searchSuggest.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

/** 📄 Эх файлыг унших (ГЭРЭЭ/регрессийн шалгалтад — санамсаргүй салгахаас) */
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Комментгүй ЦЭВЭР КОД — «хасагдсан» гэсэн ТАЙЛБАР нь зүй ёсны тул
 *  шалгалтыг зөвхөн кодын мөрүүд дээр хийнэ (хуурамч улаан гарахгүй ✓) */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

/** ₮-ийн товч форматлагч (тестэд `shortPrice`-ийг дуурайна — импортгүй) */
const short = (n) => {
  const v = Number(n) || 0;
  if (v >= 1_000_000_000) return `${Number((v / 1e9).toFixed(2))} тэрбум`;
  if (v >= 1_000_000) return `${Number((v / 1e6).toFixed(2))} сая`;
  return String(v);
};

console.log('\n🧪 Хайлтын UI — тооны хүрээ ба эрэмбэлэлт (lib/rangeFilter.mjs)\n');

// ---------- ① parseNum — монгол тооны бичлэг ----------
t("parseNum: хоосон утгууд → null ('' · null · undefined · 'abc')", () => {
  assert.equal(parseNum(''), null);
  assert.equal(parseNum('   '), null);
  assert.equal(parseNum(null), null);
  assert.equal(parseNum(undefined), null);
  assert.equal(parseNum('abc'), null);
});

t("parseNum: '250000000' → 250000000 (тоо нь шууд)", () => {
  assert.equal(parseNum('250000000'), 250000000);
  assert.equal(parseNum(250000000), 250000000);
});

t("parseNum: '250,000,000' → 250000000 (мөнгөн бичлэгийн бүлэглэлт)", () => {
  assert.equal(parseNum('250,000,000'), 250000000);
});

t("parseNum: '1 000' ба '₮ 250 000' → 1000 ба 250000 (зай/тэмдэгт)", () => {
  assert.equal(parseNum('1 000'), 1000);
  assert.equal(parseNum('₮ 250 000'), 250000);
});

t("parseNum: '75,5' ба '75.5' → 75.5 (МОНГОЛ бутархай)", () => {
  assert.equal(parseNum('75,5'), 75.5);
  assert.equal(parseNum('75.5'), 75.5);
});

t("parseNum: '1200' → 1200 (4 оронтой он/талбай)", () => {
  assert.equal(parseNum('2015'), 2015);
  assert.equal(parseNum('1200'), 1200);
});

t('parseNum: Number.NaN / Infinity → null', () => {
  assert.equal(parseNum(NaN), null);
  assert.equal(parseNum(Infinity), null);
});

// ---------- ② clampNum · snapNum ----------
t('clampNum: доогуур/дээгүүр/дунд + тоо биш → min', () => {
  assert.equal(clampNum(-5, 0, 10), 0);
  assert.equal(clampNum(50, 0, 10), 10);
  assert.equal(clampNum(5, 0, 10), 5);
  assert.equal(clampNum('x', 3, 10), 3);
});

t('snapNum: 37,400,000 ₮ → 50,000,000 (50 саяар алхам + хил дотор)', () => {
  assert.equal(snapNum(37_400_000, PRICE_BOUNDS.realEstate), 50_000_000);
  assert.equal(snapNum(24_900_000, PRICE_BOUNDS.realEstate), 0);
});

t('snapNum: хилээс гарсан утга → хил дээр тогтоно', () => {
  assert.equal(snapNum(9_000_000_000, PRICE_BOUNDS.realEstate), 5_000_000_000);
  assert.equal(snapNum(-1, PRICE_BOUNDS.realEstate), 0);
});

t('snapNum: 📅 оны хүрээ (1990–2026, алхам 1) — 0-ээс эхлээгүй хүрээ', () => {
  const b = yearBounds(2026);
  assert.equal(snapNum(2015.6, b), 2016);
  assert.equal(snapNum(1980, b), YEAR_START);
  assert.equal(snapNum(2100, b), 2026);
});

t('snapNum: алхам 0/эвдэрсэн бол 1 болгож ажиллана', () => {
  assert.equal(snapNum(7.4, { min: 0, max: 10, step: 0 }), 7);
});

// ---------- ③ formatGroupedInput · groupDigits (тоо ЦЭГЭЭР тусгаарлагдана) ----------
t('groupDigits: 3-аар бүлэглэж ЦЭГЭЭР тусгаарлана', () => {
  assert.equal(groupDigits('250000000'), '250.000.000');
  assert.equal(groupDigits('1000'), '1.000');
  assert.equal(groupDigits('100'), '100');
  assert.equal(groupDigits('0'), '0');
  assert.equal(groupDigits(2500000), '2.500.000'); // тоо (number) ч зөв
});

t('groupDigits: хогтой текст ч зөв — цифрээс өөр БҮГД алгасна', () => {
  assert.equal(groupDigits('₮ 250 000 000'), '250.000.000');
  assert.equal(groupDigits('1,500,000'), '1.500.000'); // таслалттай буулгасан
  assert.equal(groupDigits('12abc345'), '12.345');
  assert.equal(groupDigits('abc'), '');
  assert.equal(groupDigits(''), '');
});

t('groupDigits: эхний тэг хасагдана, ганц «0» үлдэнэ', () => {
  assert.equal(groupDigits('0007'), '7');
  assert.equal(groupDigits('000'), '0');
});

t('groupDigits: 15+ цифрт цифр АЛДАГДАХГҮЙ (Number-ээр яваагүй ✓)', () => {
  assert.equal(groupDigits('1234567890123456'), '1.234.567.890.123.456');
});

t("formatGroupedInput(int): бичих ЯВЦАД цэг гарч ирнэ ('3000000' → '3.000.000')", () => {
  assert.equal(formatGroupedInput('3'), '3');
  assert.equal(formatGroupedInput('30'), '30');
  assert.equal(formatGroupedInput('300'), '300');
  assert.equal(formatGroupedInput('3000'), '3.000');
  assert.equal(formatGroupedInput('3000000'), '3.000.000');
  assert.equal(formatGroupedInput('250000000'), '250.000.000');
});

t('formatGroupedInput(int): макс 12 цифр (хэт урт утга хязгаарлагдана)', () => {
  assert.equal(formatGroupedInput('1234567890123456'), '123.456.789.012');
});

t('formatGroupedInput(decimal): бутархай нь «,», бүхэл хэсэг нь цэгээр бүлэглэгдэнэ', () => {
  assert.equal(formatGroupedInput('75,5', { mode: 'decimal' }), '75,5');
  assert.equal(formatGroupedInput('75.5', { mode: 'decimal' }), '75,5'); // цэгэн бутархай → «,»
  assert.equal(formatGroupedInput('1234,5', { mode: 'decimal' }), '1.234,5');
  assert.equal(formatGroupedInput('1.234,56', { mode: 'decimal' }), '1.234,56');
  // ⚠️ «1.234» нь 3 орон тул МЯНГАТ (1234) — бутархай гэж уншигдахгүй ✓
  assert.equal(formatGroupedInput('1234', { mode: 'decimal' }), '1.234');
});

t('formatGroupedInput(decimal): бичиж байхдаа «75,» гэсэн «,» ХАДГАЛАГДАНА', () => {
  // ⚠️ «,» арилбал хэрэглэгч бутархай бичиж ЧАДАХГҮЙ болно ✗
  assert.equal(formatGroupedInput('75,', { mode: 'decimal' }), '75,');
  assert.equal(formatGroupedInput('75.0', { mode: 'decimal' }), '75,0');
  assert.equal(formatGroupedInput('1234,', { mode: 'decimal' }), '1.234,');
});

t('📌 РЕГРЕСС formatGroupedInput(year): ОНЫГ БҮЛЭГЛЭХГҮЙ («2.026» болохгүй ✓)', () => {
  assert.equal(formatGroupedInput('2026', { mode: 'year' }), '2026');
  assert.equal(formatGroupedInput('2.026', { mode: 'year' }), '2026');
  assert.equal(formatGroupedInput('20261', { mode: 'year' }), '2026'); // макс 4 орон
});

t("parseNum: '1.234,5' → 1234.5 (цэг нь МЯНГАТ, таслал нь БУТАРХАЙ ✓)", () => {
  assert.equal(parseNum('1.234,5'), 1234.5);
  assert.equal(parseNum(formatGroupedInput('1234.5', { mode: 'decimal' })), 1234.5);
});

t('round-trip: бүлэглэсэн утга → parseNum ИЖИЛ тоо (DB руу хог явахгүй ✓)', () => {
  ['3000', '250000000', '999', '0'].forEach((d) => {
    assert.equal(parseNum(formatGroupedInput(d)), Number(d), d);
  });
});


// ---------- ④ toFilterPair · isRangeActive (② ХИЛ = ШҮҮЛТГҮЙ) ----------
t("toFilterPair: хил дээр байгаа тал → '' (шүүлт БАЙХГҮЙ)", () => {
  assert.deepEqual(toFilterPair(0, 600, AREA_BOUNDS), { from: '', to: '' });
  assert.deepEqual(toFilterPair(0, 120, AREA_BOUNDS), { from: '', to: '120' });
  assert.deepEqual(toFilterPair(45, 600, AREA_BOUNDS), { from: '45', to: '' });
});

t('toFilterPair: дунд утгууд → МӨР (URL/DB-д тэгж бичигдэнэ)', () => {
  assert.deepEqual(toFilterPair(45, 120, AREA_BOUNDS), { from: '45', to: '120' });
});

t('toFilterPair: ХИЛЭЭС ГАРСАН утга ХЯЗГААРЛАГДАХГҮЙ (чирдэг слайдер хасагдсан ✓)', () => {
  // Хэрэглэгч 1200 м² (хил 600) бичвэл утга нь БҮРЭН хэвээр DB руу явна —
  // өмнөх слайдер нь хилийг динамикаар өргөтгөх шаардлагатай байв
  assert.deepEqual(toFilterPair(1200, 1200, AREA_BOUNDS), { from: '1200', to: '1200' });
  // ₮6 тэрбум (хил 5 тэрбум) — мөн адил хязгаарлагдахгүй ✓
  assert.deepEqual(
    toFilterPair(6_000_000_000, 6_000_000_000, PRICE_BOUNDS.realEstate),
    { from: '6000000000', to: '6000000000' }
  );
});

t('isRangeActive: хоёр тал хоосон бол идэвхгүй', () => {
  assert.equal(isRangeActive('', ''), false);
  assert.equal(isRangeActive('0', ''), true);
  assert.equal(isRangeActive('', '0'), true);
});

// ---------- ⑤ rangeLabel (одоогийн утгын шошго) ----------
t('rangeLabel: ₮ нь товч форматтай («₮150 сая – ₮1 тэрбум»)', () => {
  assert.equal(rangeLabel(150_000_000, 1_000_000_000, { unit: '₮', short }), '₮150 сая – ₮1 тэрбум');
});

t('rangeLabel: м² ба он', () => {
  assert.equal(rangeLabel(45, 120, { unit: 'м²' }), '45 – 120 м²');
  assert.equal(rangeLabel(2015, 2020, { unit: 'он' }), '2015 – 2020 он');
});

t('📌 РЕГРЕСС rangeLabel: хил дээрх 0 нь «₮ – ₮5 тэрбум» БИШ, «₮0 – ₮5 тэрбум»', () => {
  // `short(0)` === '' тул өмнө нь зүүн тал ХООСОН харагддаг байв (CDP барьсан ✓)
  assert.equal(rangeLabel(0, 5_000_000_000, { unit: '₮', short }), '₮0 – ₮5 тэрбум');
  // Талбайн 0 нь өөрчлөгдөхгүй (short дамжуулаагүй үед)
  assert.equal(rangeLabel(0, 600, { unit: 'м²' }), '0 – 600 м²');
  // Шүүлт идэвхтэй үед гарах жижиг шошго (`RangeInput → data-range-label`) ✓
  assert.equal(rangeLabel(0, 0, { unit: '₮', short }), '₮0 – ₮0');
});

// ---------- ⑤ 🗑 «ТҮРГЭН ХҮРЭЭ» ХАСАГДСАН ЭСЭХ (регресс) ----------
// ⚠️ Хэрэглэгчийн хүсэлт (2026-09-30 (3)): «Орон сууц хайлтын Үнэ дээр
//    эхлэх дуусах биш Дээд Доод гэе. Бас тэр доор нь санал болгоод байгаа
//    тоог байхгүй болго» → ① шошго нь «Доод / Дээд» ② оролтын доорх 4 тоон
//    товч (`₮25 сая хүртэл` …) БҮРЭН ХАСАГДАВ ✓
t('📌 РЕГРЕСС: `priceQuickPicks()` БҮРЭН ХАСАГДСАН (эскпорт БАЙХГҮЙ ✓)', () => {
  const lib = codeOnly(readSrc('lib/rangeFilter.mjs'));
  assert.doesNotMatch(lib, /priceQuickPicks/, 'товчны логик үлдэгдэл');
  // ⚠️ Үлдсэн ЦЭВЭР туслах функц `snapNum` нь тестээр хамгаалагдсан хэвээр ✓
  assert.match(lib, /export function snapNum\(/);
});

t('📌 РЕГРЕСС: DOM-д «түргэн хүрээ» товч БАЙХГҮЙ (`data-quick-pick` · `quickPicks`)', () => {
  // ⚠️ Гурван газар БҮГД цэвэр байх ЁСТОЙ: UI компонент, проп дамжуулалт, CDP шалгалт
  const ui = codeOnly(readSrc('components/RangeInput.jsx'));
  assert.doesNotMatch(ui, /data-quick-pick/);
  assert.doesNotMatch(ui, /quickPicks/);
  assert.doesNotMatch(ui, /aria-pressed/, 'товч идэвхтэй эсэхийн төлөв ч хасагдав');
  assert.doesNotMatch(codeOnly(readSrc('components/HomeClient.jsx')), /quickPicks/);
  // CDP скрипт нь одоо «0 товч» гэж ШАЛГАДАГ болсон ✓ (зовхисон товч байхгүй)
  const cdp = readSrc('scripts/cdp-range.mjs');
  assert.match(cdp, /data-quick-pick/, 'DOM-д байхгүйг CDP-ээр шалгана');
  assert.match(cdp, /=== 0/, 'товшны тоо ЯГ 0 байх ёстой');
  assert.doesNotMatch(cdp, /\[data-quick-pick\]\[0\]/, 'товч дарах код үлдэх ёсгүй');
});

t('🏷 ШОШГО: оролт нь «Доод / Дээд» («Эхлэх / Дуусах» ХААНА Ч БАЙХГҮЙ ✓)', () => {
  const ui = readSrc('components/RangeInput.jsx');
  assert.match(ui, /placeholder="Доод"/);
  assert.match(ui, /placeholder="Дээд"/);
  assert.match(ui, /\(доод хязгаар\)/, 'aria-label — дэлгэц уншигчид');
  assert.match(ui, /\(дээд хязгаар\)/, 'aria-label — дэлгэц уншигчид');
  // ⚠️ Зөвхөн комментод биш, КОД дээр ч хуучин үг үлдэхгүй (ж: title/aria)
  assert.doesNotMatch(codeOnly(ui), /Эхлэх|Дуусах/);
  assert.doesNotMatch(codeOnly(readSrc('components/HomeClient.jsx')), /Эхлэх|Дуусах/);
});

// ---------- ⑥ Хилийн тогтмолууд ----------
t('priceBounds: үл хөдлөх нь ИЛҮҮ ӨРГӨН (5 тэрбум) ба хуулбар буцаана', () => {
  assert.ok(PRICE_BOUNDS.realEstate.max > PRICE_BOUNDS.default.max);
  const a = priceBounds(true);
  assert.deepEqual(a, PRICE_BOUNDS.realEstate);
  a.max = 1; // ⚠️ мутацлахад эх сурвалж ХӨНДӨӨГДӨХГҮЙ
  assert.equal(PRICE_BOUNDS.realEstate.max, 5_000_000_000);
});

t('priceBounds: бусад хэсэгт анхдагч хил', () => {
  assert.deepEqual(priceBounds(false), PRICE_BOUNDS.default);
});

t('yearBounds(2026): 1990–2026, алхам 1 · эвдэрсэн онд ч эвдрэхгүй', () => {
  assert.deepEqual(yearBounds(2026), { min: 1990, max: 2026, step: 1 });
  assert.equal(yearBounds(1980).max, YEAR_START);
  assert.ok(yearBounds('x').max > 1990);
});

// ---------- ⑥′ 🏢📅 ОРОН СУУЦНЫ НЭМЭЛТ ХҮРЭЭ (2026-10-04) ----------
t('FLOOR_BOUNDS: 1–150 (`FLOOR_MAX`), алхам 1 — «Барилгын давхар»/«Хэдэн давхарт»', () => {
  assert.deepEqual(FLOOR_BOUNDS, { min: 1, max: 150, step: 1 });
});

t('buildYearBounds(2026): 1980–2026, алхам 1 · эвдэрсэн онд ч эвдрэхгүй', () => {
  assert.deepEqual(buildYearBounds(2026), { min: 1980, max: 2026, step: 1 });
  assert.equal(buildYearBounds(1970).max, BUILD_YEAR_START);
  assert.ok(buildYearBounds('x').max > 1980);
  // ⚠️ Машины `yearBounds` (1990) ба барилгын `buildYearBounds` (1980) — ЭХЛЭЛ нь
  //    ЯЛГААТАЙ (форм нь 1980-аас сонгодог ✓)
  assert.notEqual(BUILD_YEAR_START, YEAR_START);
});

t('FLOOR/ОН хүрээ: ХИЛИЙН тал нь «шүүлт БАЙХГҮЙ» (URL/DB цэвэр)', () => {
  // ⚠️ `minArea`-гийн ЯГ ижил дүрэм — давхар 1/150 ба он 1980/2026 дээр `''`
  assert.deepEqual(toFilterPair(1, 150, FLOOR_BOUNDS), { from: '', to: '' });
  assert.deepEqual(toFilterPair(3, 20, FLOOR_BOUNDS), { from: '3', to: '20' });
  assert.deepEqual(toFilterPair(3, 150, FLOOR_BOUNDS), { from: '3', to: '' });
  const yb = buildYearBounds(2026);
  assert.deepEqual(toFilterPair(1980, 2026, yb), { from: '', to: '' });
  assert.deepEqual(toFilterPair(2010, 2020, yb), { from: '2010', to: '2020' });
});

console.log('\n🧪 Эрэмбэлэх сонголт (lib/sortOptions.mjs)\n');

// ---------- ⑦ SORT_OPTIONS · normalizeSort ----------
t('SORT_OPTIONS: 3 сонголт, утга нь ДАВХАЛДАХГҮЙ, анхдагч нь жагсаалтад байна', () => {
  assert.equal(SORT_OPTIONS.length, 3);
  const values = SORT_OPTIONS.map((o) => o.value);
  assert.equal(new Set(values).size, values.length);
  assert.ok(values.includes(DEFAULT_SORT));
  SORT_OPTIONS.forEach((o) => assert.ok(o.label && o.label.length > 2, `${o.value}: шошго`));
});

t('normalizeSort: хүчинтэй утга хэвээр, танихгүй/хоосон → анхдагч', () => {
  assert.equal(normalizeSort('price_asc'), 'price_asc');
  assert.equal(normalizeSort('price_desc'), 'price_desc');
  assert.equal(normalizeSort('newest'), 'newest');
  assert.equal(normalizeSort('hack; drop table'), DEFAULT_SORT);
  assert.equal(normalizeSort(''), DEFAULT_SORT);
  assert.equal(normalizeSort(undefined), DEFAULT_SORT);
  assert.equal(normalizeSort(null), DEFAULT_SORT);
});

t('sortOrders(«newest»): created_at desc + id (тогтвортой дараалал)', () => {
  assert.deepEqual(sortOrders('newest'), [
    { column: 'created_at', ascending: false },
    { column: 'id', ascending: false },
  ]);
  // ⚠️ Танихгүй утга ч аюулгүй — анхдагч руу буцна (`?sort=xxx` → query эвдрэхгүй)
  assert.deepEqual(sortOrders('garbage'), sortOrders('newest'));
});

t('sortOrders(«price_asc»): үнэ ↑ + үнэ хоосон нь ХАМГИЙН СҮҮЛД', () => {
  assert.deepEqual(sortOrders('price_asc'), [
    { column: 'price', ascending: true, nullsFirst: false },
    { column: 'id', ascending: false },
  ]);
});

t('sortOrders(«price_desc»): үнэ ↓ + үнэ хоосон нь ХАМГИЙН СҮҮЛД', () => {
  assert.deepEqual(sortOrders('price_desc'), [
    { column: 'price', ascending: false, nullsFirst: false },
    { column: 'id', ascending: false },
  ]);
});

t('sortOrders: ХОЁР дахь дараалал нь үргэлж id (хуудаслалт давхцахгүй)', () => {
  SORT_OPTIONS.forEach((o) => {
    const orders = sortOrders(o.value);
    assert.equal(orders.length, 2, `${o.value}: 2 дараалал`);
    assert.equal(orders[1].column, 'id');
  });
});

t('sortLabel: уншигдах шошго буцаана (танихгүй утганд анхдагч)', () => {
  assert.equal(sortLabel('price_asc'), 'Үнэ: багаас их');
  assert.equal(sortLabel('zzz'), sortLabel(DEFAULT_SORT));
});

// ---------- ⑧ ГЭРЭЭ (эх файлыг уншиж түгжинэ — санамсаргүй салгахаас) ----------
t('ГЭРЭЭ: HomeClient нь RangeInput-ийг импортолж, хил 3-ыг бүгдийг хэрэглэнэ', () => {
  const src = readSrc('components/HomeClient.jsx');
  assert.match(src, /import RangeInput from '\.\/RangeInput'/);
  assert.match(src, /from '\.\.\/lib\/rangeFilter\.mjs'/);
  assert.match(src, /priceBounds\(/, 'үнийн хил (хэсгээс хамаарна)');
  assert.match(src, /yearBounds\(/, ' оны хил (одоогийн он)');
  assert.match(src, /AREA_BOUNDS/, 'талбайн хил');
  // 🏢📅 2026-10-04: орон сууцны давхар/оны хүрээ
  assert.match(src, /FLOOR_BOUNDS/, 'давхрын хил (1–150)');
  assert.match(src, /buildYearBounds\(/, 'ашиглалтанд орсон оны хил (1980…)');
});

t('🏢📅 ГЭРЭЭ: орон сууцны давхар/он шүүлт — URL↔state↔DB бүрэн холбогдсон', () => {
  const home = readSrc('components/HomeClient.jsx');
  const q = readSrc('lib/queries.js');
  // ① Төлөв/URL түлхүүрүүд (6 — 3 хүрээ × доод/дээд)
  ['minTotalFloors', 'maxTotalFloors', 'minFloor', 'maxFloor', 'minBuildYear', 'maxBuildYear']
    .forEach((k) => assert.ok(home.includes(k), `HomeClient: «${k}» алга ✗`));
  // ② URL-аас уншина (хуваалцсан линк ажиллана)
  assert.match(home, /sp\.get\('minTotalFloors'\)/);
  assert.match(home, /sp\.get\('maxBuildYear'\)/);
  // ③ DB — `attrs` (jsonb) БИШ, ЖИНХЭНЭ багана (0003): `.gte()/.lte()`
  assert.match(q, /\.gte\('total_floors'/, 'total_floors ≥');
  assert.match(q, /\.lte\('total_floors'/, 'total_floors ≤');
  assert.match(q, /\.gte\('floor'/, 'floor ≥');
  assert.match(q, /\.lte\('floor'/, 'floor ≤');
  assert.match(q, /\.gte\('build_year'/, 'build_year ≥');
  assert.match(q, /\.lte\('build_year'/, 'build_year ≤');
  // ④ Зөвхөн «Орон сууц»-д харагдана — `hasApartmentFields` (нэг эх сурвалж,
  //    `showRooms`-той ижил дүрэм)
  assert.match(home, /const showApartmentRanges = isRealEstate[\s\S]{0,80}hasApartmentFields\(filters\.propertyType\)/);
  // ⑤ Төрөл/хэсэг солиход ХҮЧИНГҮЙ утга ЦЭВЭРЛЭГДЭНЭ («үл үзэгдэх шүүлт» үлдэхгүй)
  assert.match(home, /!hasApartmentFields\(v\)/, 'propertyType солиход цэвэрлэх дүрэм');
});

t('📌 РЕГРЕСС: ЧИРДЭГ слайдер БҮРЭН хасагдсан (хэрэглэгчийн хүсэлт ✓)', () => {
  // ⚠️ Хэрэглэгч «дээд доод үнэ, талбай дээр чирдэгээ больё» гэсэн тул
  //    зам/толгой/handle/pointerCapture БАЙХ ЁСГҮЙ ✗
  const ui = readSrc('components/RangeInput.jsx');
  assert.doesNotMatch(ui, /role="slider"/);
  assert.doesNotMatch(ui, /data-slider/);
  assert.doesNotMatch(ui, /data-handle/);
  assert.doesNotMatch(ui, /onPointerDown/);
  assert.doesNotMatch(ui, /touch-none/);
  // Хуучин файлууд БҮРЭН устасан (слайдерийн математик ч хамт ✓)
  assert.equal(fs.existsSync(path.join(ROOT, 'components/RangeSlider.jsx')), false);
  assert.equal(fs.existsSync(path.join(ROOT, 'lib/rangeSlider.mjs')), false);
});

t('ГЭРЭЭ: RangeInput нь data-range-input-тай бөгөөд ЦЭГЭЭР бүлэглэнэ', () => {
  const src = readSrc('components/RangeInput.jsx');
  assert.match(src, /data-range-input="from"/);
  assert.match(src, /data-range-input="to"/);
  assert.match(src, /formatGroupedInput\(/, 'бичих ЯВЦАД цэгээр тусгаарлана');
  // ⚠️ 2026-09-30 (3): «түргэн хүрээ» товч БАЙХГҮЙ — зөвхөн 2 блок (оролт + шошго)
  assert.doesNotMatch(src, /data-quick-pick/);
});

t('ГЭРЭЭ: queries.js нь sortOrders-оор эрэмбэлнэ (хатуу бичсэн created_at БАЙХГҮЙ)', () => {
  const src = readSrc('lib/queries.js');
  assert.match(src, /from '\.\/sortOptions\.mjs'/);
  assert.match(src, /sortOrders\(/);
  assert.doesNotMatch(src, /\.order\('created_at', \{ ascending: false \}\)\s*\n\s*\/\/ ⚠️ 2 ДАХЬ/);
});

t('ГЭРЭЭ: layout/SSR эвдрэхгүй — RangeInput нь client компонент', () => {
  assert.match(readSrc('components/RangeInput.jsx'), /^'use client';/);
});

t('ГЭРЭЭ: устгасан `rangeSlider.mjs`-ийг ХААНА Ч импортлохгүй (үлдэгдэл БАЙХГҮЙ ✓)', () => {
  // ⚠️ Хуучин модулийг дурдсан мөр үлдвэл дараагийн хүн ТӨӨРЧ байгаа файл
  //    хайж цаг алдана ✗ — гурван гол хэрэглэгчийг шалгана
  ['components/HomeClient.jsx', 'lib/queries.js', 'scripts/cdp-range.mjs'].forEach((f) => {
    assert.doesNotMatch(readSrc(f), /rangeSlider/, f);
  });
});

// ============================================================
// 🔎 ⑨ ХАЙЛТЫН ТЕКСТ (lib/searchText.mjs) — 2026-10-05 (46)
// ============================================================
console.log('\n🔎 Хайлтын текст (lib/searchText.mjs)\n');

t("normalizeSearch: зайг нэгтгэж, хоёр талыг таслана; null → ''", () => {
  assert.equal(normalizeSearch('  a   b '), 'a b');
  assert.equal(normalizeSearch('орон\nсууц'), 'орон сууц');
  assert.equal(normalizeSearch(null), '');
  assert.equal(normalizeSearch(undefined), '');
});

t('sanitizeSearchTerm: PostgREST-ийн логик мод эвдэх тэмдэгт → ЗАЙ (хамгаалалт ХЭВЭЭР ✓)', () => {
  assert.equal(sanitizeSearchTerm('Баянгол, 5-р хороо'), 'Баянгол 5-р хороо');
  assert.equal(sanitizeSearchTerm('a(b):"c"\\d'), 'a b c d');
  assert.equal(sanitizeSearchTerm('   '), '');
});

t('searchTokens: үгээр задалж, том/жижиг үсгийн давхардлыг хасна', () => {
  assert.deepEqual(searchTokens('орон сууц байр'), ['орон', 'сууц', 'байр']);
  assert.deepEqual(searchTokens('Байр байр'), ['Байр']); // давхардал (case-insensitive)
  assert.deepEqual(searchTokens(''), []);
  assert.deepEqual(searchTokens('a,b'), ['a', 'b']);      // цэг таслал → зай
});

t(`searchTokens: хамгийн ихдээ ${SEARCH_MAX_TOKENS} үг (query мөр хэт урт болохгүй)`, () => {
  assert.equal(searchTokens('а б в г д е').length, SEARCH_MAX_TOKENS);
  assert.equal(SEARCH_MAX_TOKENS, 4);
});

t('buildSearchOr: хоосон → null (шүүлт ХИЙХГҮЙ ✓)', () => {
  assert.equal(buildSearchOr(''), null);
  assert.equal(buildSearchOr('   '), null);
  assert.equal(buildSearchOr(null), null);
});

t('buildSearchOr: НЭГ үг → бүх талбар OR (title/description багтсан ✓)', () => {
  const or = buildSearchOr('зарна');
  assert.ok(or.startsWith('title.ilike.%зарна%'), 'title тэргүүнд');
  assert.ok(or.includes('description.ilike.%зарна%'), 'description ХАЙЛТАД ОРОВ');
  assert.ok(or.includes('property_type.ilike.%зарна%'));
  assert.ok(or.includes('attrs->>model.ilike.%зарна%'));
  assert.ok(!or.includes('and('), 'нэг үгэнд AND БАЙХГҮЙ');
});

t('buildSearchOr: ОЛОН үг → and(or(…),or(…)) — БҮХ үг тохирно', () => {
  const or = buildSearchOr('гоё буйдан');
  assert.ok(or.startsWith('and('), 'олон үг AND болно');
  assert.equal((or.match(/or\(/g) || []).length, 2, 'үг тус бүр нэг OR бүлэг');
  assert.ok(or.includes('title.ilike.%гоё%') && or.includes('title.ilike.%буйдан%'));
});

t('buildSearchOr: 📞 extra (утас) нь OR-оор ЗАЛГАГДАНА (AND БИШ ✓)', () => {
  const or = buildSearchOr('зарна', { extra: ['phone.ilike.%9911%'] });
  assert.ok(or.includes(',phone.ilike.%9911%'), 'текстийн дараа утас');
  assert.ok(or.includes('title.ilike.%зарна%'));
  assert.equal(buildSearchOr('', { extra: ['phone.ilike.%9911%'] }), 'phone.ilike.%9911%');
  assert.equal(buildSearchOr('', { extra: [] }), null);
});

t('buildSearchOr: `fields` дарах боломжтой (autocomplete нь ЗӨВХӨН title ✓)', () => {
  assert.equal(buildSearchOr('toyota', { fields: ['title'] }), 'title.ilike.%toyota%');
  assert.ok(buildSearchOr('toyota', { fields: ['title', 'model'] }).includes('model.ilike.%toyota%'));
});

t('SEARCH_FIELDS: title + description БАГТСАН, phone БАЙХГҮЙ (тусдаа ✓)', () => {
  assert.ok(SEARCH_FIELDS.includes('title'));
  assert.ok(SEARCH_FIELDS.includes('description'));
  assert.ok(SEARCH_FIELDS.includes('attrs->>brand') && SEARCH_FIELDS.includes('attrs->>model'));
  assert.ok(!SEARCH_FIELDS.includes('phone'), 'phone нь `extra`-ээр л орно');
});

t('buildSearchOr: таслал/хаалттай хайлт PostgREST-ийг ЭВДЭХГҮЙ (400 ГАРАХГҮЙ ✓)', () => {
  const or = buildSearchOr('Баянгол, 5-р хороо');
  assert.ok(!or.includes('Баянгол,') && !or.includes(', 5'), 'хэрэглэгчийн таслал арилав');
  assert.ok(or.startsWith('and('));
});

// ============================================================
// 🩹 (2026-10-05 (48)) ЧӨЛӨӨТ ТЕКСТИЙН «БОХИРДОЛ» — «сай» ≠ «сайхан»
// ============================================================
console.log('\n🔇 Чөлөөт текст (description) — богино үгэнд ХАЙХГҮЙ\n');

t('🔇 `searchableFields`: description-ыг ЗӨВХӨН 4+ тэмдэгттэй үгэнд үлдээнэ', () => {
  // ⚠️ 3 тэмдэгт: «сай» → «сайхан»/«сайн»-ыг ТАТАХГҮЙ ✓
  const short = searchableFields('сай');
  assert.ok(!short.includes('description'), '3 тэмдэгт → description ХАСАГДАНА');
  assert.ok(short.includes('title'), 'title ХЭВЭЭР (зарын нэр — хүчтэй дохио ✓)');
  assert.ok(short.includes('property_type') && short.includes('attrs->>brand'));

  // 4 тэмдэгт: «байр» → «байраа», «байрны»-г ОЛНО ✓ (монгол үг нэмэгдэлтэй)
  assert.ok(searchableFields('байр').includes('description'));
  assert.ok(searchableFields('сайн').includes('description'));
  assert.equal(SEARCH_DESC_MIN_CHARS, 4, 'хил нь 4 (тестээр түгжив)');

  // ⚠️ Кирилл үсэг нь UTF-8-д 2 байт ч, ЭНД КОД-ЦЭГЭЭР тоолно ✓
  assert.equal([...'өрөө'].length, 4, 'кирилл 1 тэмдэгт = 1 код-цэг');
  assert.ok(searchableFields('өрөө').includes('description'));
  assert.equal([...'сай'].length, 3);

  // ⚠️ Эх жагсаалт ХӨНДӨӨГДӨХГҮЙ (шинэ массив буцаана) — autocomplete нь
  //    `fields:['title']` гэж дамжуулах ёстой хэвээр ✓
  assert.ok(SEARCH_FIELDS.includes('description'), 'SEARCH_FIELDS ХЭВЭЭР');
  assert.notEqual(short, SEARCH_FIELDS);
});

t('🔇 buildSearchOr: «сай» (3) → description ХАЙХГҮЙ, харин «сайн» (4) → ХАЙНА', () => {
  const short = buildSearchOr('сай');
  assert.ok(short.includes('title.ilike.%сай%'), 'title тэргүүнд ХЭВЭЭР');
  assert.ok(short.includes('property_type.ilike.%сай%'), 'бүтэцтэй талбар ХЭВЭЭР');
  assert.ok(!short.includes('description'), '«сай» → «сайхан» татахгүй ✓');

  const long = buildSearchOr('сайн'); // 4 тэмдэгт — зөв үг
  assert.ok(long.includes('description.ilike.%сайн%'), '4+ тэмдэгт → description ОРОВ');
});

t('🔇 buildSearchOr: ОЛОН үг — үг ТУС БҮРЭЭР талбар нь нарийсна', () => {
  const or = buildSearchOr('сай байр');
  assert.equal((or.match(/description\.ilike/g) || []).length, 1, 'зөвхөн нэг үгэнд');
  assert.ok(or.includes('description.ilike.%байр%'), '«байр» (4) → description орно');
  assert.ok(!or.includes('description.ilike.%сай%'), '«сай» (3) → ОРОХГҮЙ');
  assert.ok(or.startsWith('and(') && (or.match(/or\(/g) || []).length === 2, '2 OR бүлэг');
});

t('🔇 ГЭРЭЭ: queries.js нь SEARCH_FIELDS-ээр л дуудна (талбарыг гараар хасахгүй ✓)', () => {
  const code = codeOnly(readSrc('lib/queries.js'));
  assert.match(code, /buildSearchOr\(search, \{ fields: SEARCH_FIELDS/);
  assert.doesNotMatch(code, /'title', 'property_type'/, 'гараар угсарсан жагсаалт БАЙХГҮЙ');
});

// ============================================================
// 🔎 ⑩ AUTOCOMPLETE САНАЛ (lib/searchSuggest.mjs)
// ============================================================
console.log('\n🔎 Хайлтын санал (lib/searchSuggest.mjs)\n');

t("suggestTypes('цемент'): дэд төрөл + хэсгийн hint (🧱 Барилгын материал)", () => {
  const out = suggestTypes('цемент');
  const hit = out.find((s) => s.value.toLowerCase().includes('цемент'));
  assert.ok(hit, '«цемент» агуулсан дэд төрөл олдсон');
  assert.equal(hit.kind, 'type');
  assert.ok(hit.hint.includes('Барилгын материал'), 'аль хэсгийнх вэ гэдэг hint');
});

t('suggestTypes: 1 тэмдэгтээс БОГИНО үгт санал ХИЙХГҮЙ (санал дүүрэхээс сэргийлнэ)', () => {
  assert.deepEqual(suggestTypes('a'), []);
  assert.deepEqual(suggestTypes(''), []);
  assert.deepEqual(suggestTypes(null), []);
});

t("suggestTypes('орон сууц'): үл хөдлөхийн дэд төрөл олдоно", () => {
  assert.ok(suggestTypes('орон сууц').some((s) => s.value === 'Орон сууц'));
});

t('mergeSuggestions: давхардлыг хасч, `limit`-ийг баримтална (type тэргүүнд ✓)', () => {
  const types = [{ kind: 'type', value: 'Цемент', label: 'Цемент', hint: 'h' }];
  const listings = [
    { title: 'Цемент', property_type: 'X' },          // давхардал → хасагдана
    { title: 'Цементэн хавтан', property_type: 'X', district: 'Баянгол' },
  ];
  const out = mergeSuggestions(types, listings, 8);
  assert.equal(out.length, 2);
  assert.equal(out[0].kind, 'type');
  assert.equal(out[1].kind, 'listing');
  assert.equal(out[1].hint, 'X · Баянгол');
  assert.equal(mergeSuggestions(types, listings, 1).length, 1);
});

t('listingHint / sectionLabel: уншигдах hint (байгаа хэсгийг л залгана)', () => {
  assert.equal(listingHint({ property_type: 'Орон сууц', district: 'Баянгол' }), 'Орон сууц · Баянгол');
  assert.equal(listingHint({ property_type: 'X', city: 'Улаанбаатар' }), 'X · Улаанбаатар');
  assert.equal(listingHint({}), '');
  assert.equal(listingHint(null), '');
  assert.ok(sectionLabel('real-estate').includes('Үл хөдлөх'));
  assert.equal(sectionLabel('nonexistent'), '');
});

// ============================================================
// ⑪ ГЭРЭЭ: searchText ↔ queries ↔ HomeClient ↔ API ↔ migration
// ============================================================
console.log('\n🔗 ГЭРЭЭ: хайлтын текст бүх давхаргад холбогдсон\n');

t('ГЭРЭЭ: lib/queries.js нь searchText.mjs-ийг ашиглана (локал normalizeSearch БАЙХГҮЙ ✓)', () => {
  const code = codeOnly(readSrc('lib/queries.js'));
  assert.match(code, /from '\.\/searchText\.mjs'/, 'импорт');
  assert.match(code, /buildSearchOr\(/, 'шүүлт угсарна');
  assert.match(code, /SEARCH_FIELDS/, 'талбарын жагсаалт');
  assert.doesNotMatch(code, /function normalizeSearch/, 'хуучин локал функц арилав');
  assert.doesNotMatch(code, /kwBase/, 'хуучин inline угсралт арилав');
});

t('ГЭРЭЭ: migration 0028 нь pg_trgm GIN индекс нэмнэ (хурд; шинэ багана БАЙХГҮЙ ✓)', () => {
  const sql = readSrc('supabase/migrations/0028_listing_search.sql');
  assert.match(sql, /create extension if not exists pg_trgm/i);
  assert.match(sql, /gin_trgm_ops/i);
  assert.match(sql, /listings_title_trgm_idx/);
  assert.match(sql, /listings_description_trgm_idx/);
  assert.doesNotMatch(sql, /add column/i, 'зөвхөн индекс — search эвдрэхгүй ✓');
});

t('ГЭРЭЭ: /api/search/suggest нь searchSuggest + searchText-ийг ашиглана', () => {
  const route = readSrc('app/api/search/suggest/route.js');
  assert.match(route, /suggestTypes\(/);
  assert.match(route, /mergeSuggestions\(/);
  assert.match(route, /buildSearchOr\(/);
  assert.match(route, /export async function GET\(/);
});

t('ГЭРЭЭ: HomeClient нь саналын dropdown-той (data-search-suggest + onPickSuggestion)', () => {
  const home = readSrc('components/HomeClient.jsx');
  assert.match(home, /data-search-suggest/, 'CDP дэгээ');
  assert.match(home, /data-suggest-item/);
  assert.match(home, /\/api\/search\/suggest\?q=/);
  assert.match(home, /onPickSuggestion/, 'санал дарахад шууд хайна');
  assert.match(home, /role="combobox"/, 'a11y');
});

console.log(`\n✅ Нийт ${passed} тест амжилттай — тооны хүрээ (цэгээр бүлэглэлт) + эрэмбэлэлт + 🔎 хайлтын текст ба санал\n`);
