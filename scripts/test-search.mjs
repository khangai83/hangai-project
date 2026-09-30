// ============================================================
// test-search.mjs — ХАЙЛТЫН UI-ийн ЦЭВЭР логикийн тест
//
// ХАМРАХ ХҮРЭЭ:
//   ① `lib/rangeFilter.mjs`  — доод/дээд ТООНЫ хүрээний логик: монгол
//      тооны бичлэг → тоо, ЦЭГЭЭР бүлэглэх, хил, түргэн хүрээ
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
  AREA_BOUNDS, PRICE_BOUNDS, YEAR_START,
  clampNum, formatGroupedInput, groupDigits, isRangeActive,
  parseNum, priceBounds, priceQuickPicks, rangeLabel, snapNum,
  toFilterPair, yearBounds,
} from '../lib/rangeFilter.mjs';
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

// ---------- ⑤ rangeLabel · priceQuickPicks ----------
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

t('priceQuickPicks: утгууд нь алхмын үржвэр (товчнууд нь дугуй тоо гаргана ✓)', () => {
  const b = PRICE_BOUNDS.realEstate;
  priceQuickPicks(b, short).forEach((x) => {
    assert.equal(x.from % b.step, 0, `from=${x.from}`);
    assert.equal(x.to % b.step, 0, `to=${x.to}`);
  });
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
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

t('ГЭРЭЭ: HomeClient нь RangeInput-ийг импортолж, хил 3-ыг бүгдийг хэрэглэнэ', () => {
  const src = readSrc('components/HomeClient.jsx');
  assert.match(src, /import RangeInput from '\.\/RangeInput'/);
  assert.match(src, /from '\.\.\/lib\/rangeFilter\.mjs'/);
  assert.match(src, /priceBounds\(/, 'үнийн хил (хэсгээс хамаарна)');
  assert.match(src, /yearBounds\(/, ' оны хил (одоогийн он)');
  assert.match(src, /AREA_BOUNDS/, 'талбайн хил');
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

t('ГЭРЭЭ: RangeInput нь data-range-input/quick-pick-тай бөгөөд ЦЭГЭЭР бүлэглэнэ', () => {
  const src = readSrc('components/RangeInput.jsx');
  assert.match(src, /data-range-input="from"/);
  assert.match(src, /data-range-input="to"/);
  assert.match(src, /data-quick-pick=\{p\.key\}/);
  assert.match(src, /formatGroupedInput\(/, 'бичих ЯВЦАД цэгээр тусгаарлана');
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

console.log(`\n✅ Нийт ${passed} тест амжилттай — тооны хүрээ (цэгээр бүлэглэлт) + эрэмбэлэлт\n`);
