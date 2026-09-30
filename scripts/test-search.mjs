// ============================================================
// test-search.mjs — ХАЙЛТЫН UI-ийн ЦЭВЭР логикийн тест
//
// ХАМРАХ ХҮРЭЭ:
//   ① `lib/rangeSlider.mjs`  — чирдэг хүрээний математик (үнэ/талбай/он)
//   ② `lib/sortOptions.mjs`  — эрэмбэлэх сонголт (eBay-ийн «Sort: …»)
//   ③ ГЭРЭЭ: `components/HomeClient.jsx` + `lib/queries.js` нь дээрх
//      модулиудыг ХЭРЭГЛЭЖ байгаа эсэх (эх файлыг шууд уншина)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Слайдер буруу тооцоолбол хэрэглэгч «250 сая» гэж чирээд DB руу
//   25 мянга явна (эсвэл from > to болж query хоосон болно). Тэр эрсдэлийг
//   энэ тест бариулна. Мөн `?sort=xxx` гэсэн танихгүй утга PostgREST руу
//   БАЙХГҮЙ багана болж явахгүй (normalizeSort) гэдгийг түгжинэ ✓
//
// АЖИЛЛУУЛАХ:  npm run test:search
// ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (2 модуль нь импортгүй цэвэр).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  AREA_BOUNDS, PRICE_BOUNDS, YEAR_START,
  activePair, clampNum, isRangeActive, keyboardValue, moveHandle, nearestHandle,
  parseNum, pctToValue, priceBounds, priceQuickPicks, rangeLabel, snapNum,
  toFilterPair, valueToPct, withDynamicBounds, yearBounds,
} from '../lib/rangeSlider.mjs';
import {
  DEFAULT_SORT, SORT_OPTIONS, normalizeSort, sortLabel, sortOrders,
} from '../lib/sortOptions.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

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

console.log('\n🧪 Хайлтын UI — чирдэг хүрээ (lib/rangeSlider.mjs)\n');

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

// ---------- ③ withDynamicBounds (гараар бичсэн утга АЛДАГДАХГҮЙ) ----------
t('withDynamicBounds: утга БАЙХГҮЙ бол хил ХӨНДӨГДӨХГҮЙ (хуулбар)', () => {
  const b = withDynamicBounds(AREA_BOUNDS, '', null, undefined);
  assert.deepEqual(b, AREA_BOUNDS);
  assert.notEqual(b, AREA_BOUNDS); // ⚠️ мутацлахаас сэргийлж ХУУЛБАР
});

t('withDynamicBounds: бичсэн утга хилээс ГАРВАЛ сунана', () => {
  assert.deepEqual(withDynamicBounds(AREA_BOUNDS, '1200', '').max, 1200);
  assert.deepEqual(withDynamicBounds(AREA_BOUNDS, '', '300').max, AREA_BOUNDS.max);
  assert.deepEqual(withDynamicBounds({ min: 100, max: 200, step: 1 }, '50', '').min, 50);
});

t('withDynamicBounds: «250,000,000» мөр ч тоо болж уншигдана', () => {
  assert.equal(withDynamicBounds(AREA_BOUNDS, '250,000,000', '').max, 250_000_000);
});

// ---------- ④ pct ↔ утга (чирэх байрлал) ----------
t('valueToPct: хил дээр 0% / 100%, дунд нь 50%', () => {
  assert.equal(valueToPct(0, PRICE_BOUNDS.realEstate), 0);
  assert.equal(valueToPct(5_000_000_000, PRICE_BOUNDS.realEstate), 100);
  assert.equal(valueToPct(2_500_000_000, PRICE_BOUNDS.realEstate), 50);
});

t('pctToValue: 50% → 250 сая (0–500 сая хүрээ)', () => {
  assert.equal(pctToValue(50, PRICE_BOUNDS.default), 250_000_000);
});

t('pctToValue: 0-100-аас гарсан pct нь ХААГДАНА (гадуур чирэхэд эвдрэхгүй)', () => {
  assert.equal(pctToValue(-20, PRICE_BOUNDS.default), 0);
  assert.equal(pctToValue(180, PRICE_BOUNDS.default), 500_000_000);
});

t('round-trip: pctToValue(valueToPct(v)) === v (алхмын үржвэр утгад)', () => {
  [0, 250_000_000, 2_500_000_000, 5_000_000_000].forEach((v) => {
    assert.equal(pctToValue(valueToPct(v, PRICE_BOUNDS.realEstate), PRICE_BOUNDS.realEstate), v);
  });
});

t('valueToPct: min === max хүрээнд 0 (тэгд хуваахгүй)', () => {
  assert.equal(valueToPct(5, { min: 5, max: 5, step: 1 }), 0);
});

// ---------- ⑤ activePair (③ буруу утгыг ЗАСНА) ----------
t("activePair: '' → бүтэн хүрээ (шүүлт байхгүй)", () => {
  assert.deepEqual(activePair('', '', AREA_BOUNDS), { from: 0, to: 600 });
});

t('activePair: нэг талын утга л байвал нөгөө нь ХИЛ хэвээр', () => {
  assert.deepEqual(activePair('45', '', AREA_BOUNDS), { from: 45, to: 600 });
  assert.deepEqual(activePair('', '120', AREA_BOUNDS), { from: 0, to: 120 });
});

t('activePair: from > to (буруу бичсэн) → from нь to руу ЗАСАГДАНА', () => {
  assert.deepEqual(activePair('300', '100', AREA_BOUNDS), { from: 100, to: 100 });
});

t('activePair: хилээс гарсан утга ХИЛ дээр хайчилна', () => {
  assert.deepEqual(activePair('9999', '', AREA_BOUNDS), { from: 600, to: 600 });
});

t('activePair: «75,5» м² бутархай зөв уншигдана', () => {
  assert.deepEqual(activePair('75,5', '', AREA_BOUNDS), { from: 75.5, to: 600 });
});

// ---------- ⑥ nearestHandle · moveHandle (① ГАРАЛЦАХГҮЙ) ----------
t('nearestHandle: ойрхон талыг сонгоно, тэнцүү бол from', () => {
  assert.equal(nearestHandle(10, 0, 100), 'from');
  assert.equal(nearestHandle(90, 0, 100), 'to');
  assert.equal(nearestHandle(50, 0, 100), 'from');
});

t('moveHandle: «to»-г from-оос доош чирвэл ГАРАЛЦАХГҮЙ (from дээр тухлав)', () => {
  assert.deepEqual(moveHandle('to', 10, 100, 300, AREA_BOUNDS), { from: 10, to: 10 });
});

t('moveHandle: «from»-ыг to-оос дээш чирвэл to нь ХАМТ зөөгдөнө (гаралцахгүй)', () => {
  assert.deepEqual(moveHandle('from', 500, 100, 300, AREA_BOUNDS), { from: 500, to: 500 });
});

t('moveHandle: хилээс гадна чирсэн ч хил дотор тогтоно', () => {
  assert.deepEqual(moveHandle('from', -50, 0, 600, AREA_BOUNDS), { from: 0, to: 600 });
  assert.deepEqual(moveHandle('to', 9000, 0, 600, AREA_BOUNDS), { from: 0, to: 600 });
});

// ---------- ⑦ keyboardValue (a11y — зөвхөн хулганаар биш) ----------
t('keyboardValue: ←↓ нэг алхам, →↑ нэг алхам (хил дотор)', () => {
  const b = PRICE_BOUNDS.default;
  assert.equal(keyboardValue('ArrowLeft', 100_000_000, b), 95_000_000);
  assert.equal(keyboardValue('ArrowDown', 100_000_000, b), 95_000_000);
  assert.equal(keyboardValue('ArrowRight', 100_000_000, b), 105_000_000);
  assert.equal(keyboardValue('ArrowUp', 100_000_000, b), 105_000_000);
});

t('keyboardValue: PageUp/PageDown 10 алхам', () => {
  const b = PRICE_BOUNDS.default;
  assert.equal(keyboardValue('PageUp', 100_000_000, b), 150_000_000);
  assert.equal(keyboardValue('PageDown', 100_000_000, b), 50_000_000);
});

t('keyboardValue: Home → min, End → max', () => {
  const b = PRICE_BOUNDS.realEstate;
  assert.equal(keyboardValue('Home', 1_000_000_000, b), 0);
  assert.equal(keyboardValue('End', 1_000_000_000, b), 5_000_000_000);
});

t('keyboardValue: танихгүй товч → null (өөрчлөлт БАЙХГҮЙ)', () => {
  assert.equal(keyboardValue('a', 100, AREA_BOUNDS), null);
  assert.equal(keyboardValue('Escape', 100, AREA_BOUNDS), null);
});

t('keyboardValue: хил дээр тогтоно (0-ээс доош / max-аас дээш гарахгүй)', () => {
  assert.equal(keyboardValue('ArrowLeft', 0, AREA_BOUNDS), 0);
  assert.equal(keyboardValue('ArrowRight', 600, AREA_BOUNDS), 600);
});

// ---------- ⑧ toFilterPair · isRangeActive (② ХИЛ = ШҮҮЛТГҮЙ) ----------
t("toFilterPair: хил дээр байгаа тал → '' (шүүлт БАЙХГҮЙ)", () => {
  assert.deepEqual(toFilterPair(0, 600, AREA_BOUNDS), { from: '', to: '' });
  assert.deepEqual(toFilterPair(0, 120, AREA_BOUNDS), { from: '', to: '120' });
  assert.deepEqual(toFilterPair(45, 600, AREA_BOUNDS), { from: '45', to: '' });
});

t('toFilterPair: дунд утгууд → МӨР (URL/DB-д тэгж бичигдэнэ)', () => {
  assert.deepEqual(toFilterPair(45, 120, AREA_BOUNDS), { from: '45', to: '120' });
});

t('toFilterPair: өргөссөн хил дээр ч АНХДАГЧ хилээр харьцуулна (шүүлт АРИЛАХГҮЙ)', () => {
  // Хэрэглэгч 1200 м² бичсэн → слайдер сунасан ч утга нь ХЭВЭЭР байх ёстой
  const dyn = withDynamicBounds(AREA_BOUNDS, '1200', '');
  assert.deepEqual(toFilterPair(dyn.max, dyn.max, AREA_BOUNDS), { from: '1200', to: '1200' });
  // ⚠️ Хэрэв ӨРГӨССӨН хилээр харьцуулбал `to` нь '' болж, хэрэглэгчийн бичсэн
  //    1200 гэсэн хязгаар ЧИМЭЭГҮЙ АРИЛНА ✗ — тест нь ЯГ тэр алдааг бариулна
  assert.equal(toFilterPair(dyn.max, dyn.max, dyn).to, '');
});

t('isRangeActive: хоёр тал хоосон бол идэвхгүй', () => {
  assert.equal(isRangeActive('', ''), false);
  assert.equal(isRangeActive('0', ''), true);
  assert.equal(isRangeActive('', '0'), true);
});

// ---------- ⑨ rangeLabel · priceQuickPicks ----------
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
  // Толгойн aria-valuetext нэг утгатай дуудагдана → «₮0»
  assert.equal(rangeLabel(0, 0, { unit: '₮', short }), '₮0 – ₮0');
});

t('priceQuickPicks: 4 утга, эхлэл/төгсгөл нь ЯГ хил, давхцалгүй өсөх', () => {
  const p = priceQuickPicks(PRICE_BOUNDS.default, short);
  assert.equal(p.length, 4);
  assert.equal(p[0].from, PRICE_BOUNDS.default.min);
  assert.equal(p[3].to, PRICE_BOUNDS.default.max);
  for (let i = 1; i < p.length; i += 1) assert.equal(p[i].from, p[i - 1].to, `давхцал ${i}`);
  p.forEach((x) => assert.ok(x.to > x.from, 'хүрээ хоосон байх ёсгүй'));
});

t('priceQuickPicks: шошго нь ₮-тэй ба «хүртэл / -с дээш» гэж уншигдана', () => {
  const p = priceQuickPicks(PRICE_BOUNDS.default, short);
  assert.match(p[0].label, /^₮.+ хүртэл$/);
  assert.match(p[3].label, /^₮.+-с дээш$/);
  assert.match(p[1].label, /^₮.+ – ₮/);
});

t('priceQuickPicks: утгууд нь алхмын үржвэр (слайдер дээр яг таарна)', () => {
  const b = PRICE_BOUNDS.realEstate;
  priceQuickPicks(b, short).forEach((x) => {
    assert.equal(x.from % b.step, 0, `from=${x.from}`);
    assert.equal(x.to % b.step, 0, `to=${x.to}`);
  });
});

// ---------- ⑩ Хилийн тогтмолууд ----------
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

console.log('\n🧪 Эрэмбэлэх сонголт (lib/sortOptions.mjs)\n');

// ---------- ⑪ SORT_OPTIONS · normalizeSort ----------
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

// ---------- ⑫ ГЭРЭЭ (эх файлыг уншиж түгжинэ — санамсаргүй салгахаас) ----------
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

t('ГЭРЭЭ: HomeClient нь RangeSlider-ийг импортолж, хил 3-ыг бүгдийг хэрэглэнэ', () => {
  const src = readSrc('components/HomeClient.jsx');
  assert.match(src, /import RangeSlider from '\.\/RangeSlider'/);
  assert.match(src, /priceBounds\(/, 'үнийн хил (хэсгээс хамаарна)');
  assert.match(src, /yearBounds\(/, ' оны хил (одоогийн он)');
  assert.match(src, /AREA_BOUNDS/, 'талбайн хил');
});

t('ГЭРЭЭ: RangeSlider нь data-slider/data-handle-тай (CDP шалгалт ба a11y)', () => {
  const src = readSrc('components/RangeSlider.jsx');
  assert.match(src, /data-slider=\{label\}/);
  assert.match(src, /data-handle="from"/);
  assert.match(src, /data-handle="to"/);
  assert.match(src, /role="slider"/);
  assert.match(src, /touch-none/, '⚠️ мобайлд чирэхэд хуудас гүйлгэхгүй байх ёстой');
});

t('ГЭРЭЭ: queries.js нь sortOrders-оор эрэмбэлнэ (хатуу бичсэн created_at БАЙХГҮЙ)', () => {
  const src = readSrc('lib/queries.js');
  assert.match(src, /from '\.\/sortOptions\.mjs'/);
  assert.match(src, /sortOrders\(/);
  assert.doesNotMatch(src, /\.order\('created_at', \{ ascending: false \}\)\s*\n\s*\/\/ ⚠️ 2 ДАХЬ/);
});

t('ГЭРЭЭ: layout/SSR эвдрэхгүй — RangeSlider нь client компонент', () => {
  assert.match(readSrc('components/RangeSlider.jsx'), /^'use client';/);
});

console.log(`\n✅ Нийт ${passed} тест амжилттай — чирдэг хүрээ + эрэмбэлэлт\n`);
