// ============================================================
// test-number-choices.mjs — 🔢 ТООН УТГЫН «СОНГОЛТЫН ЖАГСААЛТ»-ЫН ТЕСТ
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-02): «…жагсаалтаас сонгоод оруулдаг байя,
//    жишээ нь барилгийн давхар 1 2 3 4 … 26-аас сонгуулах. Бас ашиглалтанд
//    орсон оныг 1980-аас 2026-аас сонгуулах … эсвэл iPhone timer-ийн тоо
//    сонгодог шиг хийж чадах уу» ⇒ энэ тест нь тэр жагсаалтууд ЗӨВ болохыг,
//    мобайл дугуй (`components/WheelPicker.jsx`) тэдгээрийг ХЭРЭГЛЭЖ байгааг
//    түгжинэ ✓
//
// ХАМРАХ ХҮРЭЭ:
//   ① `lib/numberChoices.mjs` — ЦЭВЭР логик: хүрээ, эрэмбэ, хуучин утга
//      (`includeValue`), холбогч `nearestChoiceIndex` (дугуй нээгдэхэд төвд
//      нь тавих мөр) ба ГҮЙЛГЭЭНИЙ математик (`indexFromScroll`,
//      `scrollTopForIndex` — дугуй төвд зогсох зан ✓)
//   ② ГЭРЭЭ (эх файлыг ШУУД уншина — санамсаргүй салгахаас сэргийлнэ):
//      форм (`AddListingClient.jsx`) · дугуй (`WheelPicker.jsx`) ·
//      он attr (`locationData.js`) · CSS (`globals.css`)
//
// АЖИЛЛУУЛАХ:  npm run test:choices
// ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (`numberChoices.mjs` импортгүй цэвэр).
//    📱 CDP-ээр жинхэнэ дугуйг шалгах: `npm run cdp:picker`
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  YEAR_FROM, YEAR_TO, FLOOR_MAX, BATHROOM_MAX, YEAR_CHOICES,
  countChoices, yearChoices, floorChoices, toChoiceItems, choiceText,
  nearestChoiceIndex, indexFromScroll, scrollTopForIndex,
} from '../lib/numberChoices.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

/** 📄 Эх файлыг унших (ГЭРЭЭ/регрессийн шалгалтад) */
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🔢 Тоон утгын сонголтын жагсаалт (давхар · он · тагт · угаалгын өрөө)\n');

// ────────────────────────────────────────────────────────────
// ① ТОГТМОЛ ХҮРЭЭ — хэрэглэгчийн хэлсэн тоо ЯГ таарна
// ────────────────────────────────────────────────────────────
t(`📅 ОНЫ хүрээ нь ${YEAR_FROM}–${YEAR_TO} (хэрэглэгчийн хүсэлт «1980-аас 2026» ✓)`, () => {
  assert.equal(YEAR_FROM, 1980);
  assert.equal(YEAR_TO, 2026);
});

t(`🏢 ДАВХРЫН дээд хязгаар нь 1–${FLOOR_MAX} — «150 давхар» UI-аас СОНГОГДОНО ✓`, () => {
  assert.equal(FLOOR_MAX, 150, '2026-10-03: 26 → 150 (150 давхартай барилга)');
  assert.ok(countChoices(1, FLOOR_MAX).includes('150'), '«150» нь жагсаалтад БАЙНА ✓');
  assert.ok(floorChoices().includes('150'), '«Байрны давхар» ч 150 хүртэл ✓');
});


// ────────────────────────────────────────────────────────────
// ② ОН — БУУРАХ эрэмбэ (шинэ он эхэнд → дугуйг бага гүйлгэнэ ✓)
// ────────────────────────────────────────────────────────────
t('📅 `yearChoices()` нь БУУРАХ эрэмбээр `2026 → 1980` — 47 он БҮГД орно', () => {
  const ys = yearChoices();
  assert.equal(ys.length, YEAR_TO - YEAR_FROM + 1, 'хоёр хязгаар ОРНО ✓');
  assert.equal(ys[0], String(YEAR_TO), 'эхний мөр = хамгийн ШИНЭ он');
  assert.equal(ys[ys.length - 1], String(YEAR_FROM), 'сүүлийн мөр = хамгийн ХУУЧИН он');
  ys.forEach((y, i) => {
    if (i === 0) return;
    assert.equal(Number(ys[i - 1]) - Number(y), 1, 'зөрүү нь үргэлж 1 (алгасалт байхгүй ✓)');
  });
});

t('📅 `YEAR_CHOICES` (🚗 attr талбарын `choices`) нь `yearChoices()`-тай ЯГ ижил', () => {
  assert.deepEqual(YEAR_CHOICES, yearChoices());
});

t("📅 Хүрээнээс ГАДУУР хуучин он («1965») — `includeValue`-ээр ОРУУЛНА (засах горим ✓)", () => {
  const ys = yearChoices(YEAR_FROM, YEAR_TO, '1965');
  assert.ok(ys.includes('1965'), 'хуучин утга АЛГА БОЛОХГҮЙ ✓');
  assert.equal(ys[0], String(YEAR_TO), 'эрэмбэ БУУРАХ хэвээр (шинэ он эхэнд)');
  assert.equal(ys.length, YEAR_TO - YEAR_FROM + 2);
  // ⚠️ Хүрээн ДОТОР байгаа он нь ДАВХАРЛАХГҮЙ ✓
  assert.equal(yearChoices(YEAR_FROM, YEAR_TO, '2015').length, YEAR_TO - YEAR_FROM + 1);
  // ⚠️ Тоо биш / 2 оронтой утга нэмэгдэхгүй ✓
  assert.equal(yearChoices(YEAR_FROM, YEAR_TO, 'abc').length, YEAR_TO - YEAR_FROM + 1);
  assert.equal(yearChoices(YEAR_FROM, YEAR_TO, '15').length, YEAR_TO - YEAR_FROM + 1);
});

// ────────────────────────────────────────────────────────────
// ③ ДАВХАР — нэмэгдэх эрэмбэ («1 2 3 4 … 150»)
// ────────────────────────────────────────────────────────────
t(`🏢 \`countChoices(1, ${FLOOR_MAX})\` — нэмэгдэх эрэмбээр ${FLOOR_MAX} мөр («1 2 3 4» ✓)`, () => {
  const list = countChoices(1, FLOOR_MAX);
  assert.equal(list.length, FLOOR_MAX);
  assert.equal(list[0], '1');
  assert.equal(list[list.length - 1], String(FLOOR_MAX));
  assert.deepEqual(list.slice(0, 4), ['1', '2', '3', '4'], 'хэрэглэгчийн жишээ «1 2 3 4» ✓');
});

t('🏢 `floorChoices(нийт давхар)` — нийт давхраас ХЭТРЭХГҮЙ (ж: 9 → 1…9)', () => {
  assert.deepEqual(floorChoices(9), countChoices(1, 9));
  assert.equal(floorChoices(9).length, 9);
  assert.equal(floorChoices(9).includes('10'), false, 'байхгүй давхар сонгогдохгүй ✗');
});

t(`🏢 \`floorChoices(999)\` → \`FLOOR_MAX\` (${FLOOR_MAX}) · доод хязгаар 1 · тоо биш утга`, () => {
  assert.equal(floorChoices(999).length, FLOOR_MAX, 'хэт их утга ХЯЗГААРЛАГДАНА ✓');
  assert.equal(floorChoices(0).length, 1, 'дор хаяж 1 давхар ✓');
  assert.equal(floorChoices('танихгүй').length, FLOOR_MAX, 'тоо биш бол бүтэн жагсаалт ✓');
});

t("🏢 Хуучин утга («30») нь `includeValue`-ээр ОРУУЛГДАЖ, эрэмбээрээ ЗӨВ байрлана", () => {
  const list = floorChoices(9, '30');
  assert.equal(list[list.length - 1], '30', 'хамгийн төгсгөлд (хамгийн их)');
  assert.equal(list.length, 10);
  assert.deepEqual(list.slice(0, 3), ['1', '2', '3']);
});

t('🚿 Угаалгын өрөөний жагсаалт нь 1–6 (түгээмэл утгууд ✓)', () => {
  assert.equal(BATHROOM_MAX, 6);
  assert.deepEqual(countChoices(1, BATHROOM_MAX), ['1', '2', '3', '4', '5', '6']);
});

// ────────────────────────────────────────────────────────────
// ④ МӨРҮҮД (`toChoiceItems`) — ХООСОН мөр ба нэгж
// ────────────────────────────────────────────────────────────
t("🎛 `toChoiceItems` — ХООСОН мөр («—») нь ЭХЭНД, утга нь `''` (сонгохгүй үлдээх ✓)", () => {
  const items = toChoiceItems(countChoices(1, 4), { emptyLabel: '—', unit: 'тагт' });
  assert.equal(items[0].value, '', 'хоосон мөрийн УТГА нь «» (React-д алдаа гарахгүй ✓)');
  assert.equal(items[0].label, '—');
  assert.deepEqual(items[1], { value: '1', label: '1 тагт' }, 'нэгж нь ШОШГОНД залгана');
  assert.equal(items.length, 5);
});

t('🎛 `emptyLabel` өгөхгүй бол ХООСОН мөр нэмэгдэхгүй (заавал талбаруудад ✓)', () => {
  const items = toChoiceItems(['1', '2'], { unit: 'тагт' });
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { value: '1', label: '1 тагт' });
});

t("🎛 ОНЫ мөрүүдийн шошго нь ЗӨВХӨН тоо («2015») — нэгж нь дугуйн гарчиг/товч дээр", () => {
  const items = toChoiceItems(['2015', '2016']);
  assert.deepEqual(items, [
    { value: '2015', label: '2015' },
    { value: '2016', label: '2016' },
  ]);
  // ⚠️ Утга нь ЯГ ТЕКСТ (`4` биш `'4'`) — форм/`attrs`/URL бүгд текстээр харьцуулна ✓
  assert.equal(typeof items[0].value, 'string');
});

t("🔘 `choiceText(value, unit)` — форм дээрх товч («5 давхар» · «2015 он»)", () => {
  assert.equal(choiceText('5', 'давхар'), '5 давхар');
  assert.equal(choiceText('2015', 'он'), '2015 он');
  assert.equal(choiceText('5', ''), '5');
  assert.equal(choiceText('', 'он'), '', 'хоосон бол форм «Сонгох» гэж харуулна ✓');
  assert.equal(choiceText(null, 'он'), '');
  assert.equal(choiceText(5, 'он'), '5 он', 'тоо ч ТЕКСТ болж нэгдэнэ ✓');
  assert.equal(choiceText('  7  ', 'давхар'), '7 давхар', 'илүү зай арилгана ✓');
});

// ────────────────────────────────────────────────────────────
// ⑤ ДУГУЙ НЭЭГДЭХЭД ТӨВД НЬ ТАВИХ МӨР (`nearestChoiceIndex`)
// ────────────────────────────────────────────────────────────
t("🎯 ЯГ таарсан утга — түүний индекс (ж: «9» давхар → 8; хоосон мөртэй ч ЗӨВ ✓)", () => {
  assert.equal(nearestChoiceIndex(countChoices(1, 26), '9'), 8);
  assert.equal(nearestChoiceIndex(['', '1', '2'], '2'), 2);
});

t("🎯 Хүрээнээс ГАДУУР утга — хамгийн ОЙР тоо («30» → «26» = индекс 25)", () => {
  const list = countChoices(1, 26);
  assert.equal(nearestChoiceIndex(list, '30'), 25);
  assert.equal(nearestChoiceIndex(list, '0'), 0, '0 нь 1-д хамгийн ойр ✓');
  assert.equal(nearestChoiceIndex(list, '3.4'), 2, 'бутархай утга ч тоо болж ойртоно ✓');
});

t("🎯 Тоо биш/хоосон утга — 0 дэх мөр (эхний мөр: «—» эсвэл хамгийн бага ✓)", () => {
  assert.equal(nearestChoiceIndex(['', '1', '2'], ''), 0);
  assert.equal(nearestChoiceIndex(['', '1', '2'], 'abc'), 0);
  assert.equal(nearestChoiceIndex([], '5'), 0, 'хоосон жагсаалт ч ЭВДРЭХГҮЙ ✓');
});

t('🎯 ХООСОН мөр нь ТОО БИШ — «30» түүн дээр НААЛДАХГҮЙ ✗', () => {
  // ⚠️ `Number('')` нь 0 тул хамгаалалтгүй бол «30» гэсэн утга «—» мөрөнд наалдана
  const list = ['', '1', '2'];
  assert.equal(nearestChoiceIndex(list, '30'), 2, 'хамгийн их тоо руу ойртоно ✓');
});

t('🎯 ОН — БУУРАХ жагсаалтад ч индекс ЗӨВ (2026 нь 0, 1980 нь сүүлийн)', () => {
  const ys = yearChoices();
  assert.equal(nearestChoiceIndex(ys, '2015'), YEAR_TO - 2015);
  assert.equal(nearestChoiceIndex(ys, '2026'), 0, 'шинэ он эхэнд ✓');
  assert.equal(nearestChoiceIndex(ys, '1980'), ys.length - 1);
  assert.equal(nearestChoiceIndex(ys, '1965'), ys.length - 1, 'хүрээнээс доош → хамгийн хуучин');
});

// ────────────────────────────────────────────────────────────
// ⑤′ ДУГУЙН ГҮЙЛГЭЭНИЙ МАТЕМАТИК (`indexFromScroll` · `scrollTopForIndex`)
//      ⚠️ `WheelPicker` нь гүйлгээ ЗОГССОНЫ дараа ЯГ `indexFromScroll`-ээр
//      төвийг тодорхойлно ⇒ iOS Timer-ийн «төвд зогсох» зан нь тестээр
//      түгжигдэнэ (браузер шаардахгүй ✓)
// ────────────────────────────────────────────────────────────
t('🎡 `indexFromScroll()` — мөрийн өндөр 40px, төвд байгаа мөр = `round(top / 40)`', () => {
  assert.equal(indexFromScroll(0, 40), 0);
  assert.equal(indexFromScroll(40, 40), 1);
  assert.equal(indexFromScroll(80, 40), 2);
  assert.equal(indexFromScroll(160, 40), 4, '«5 давхар» = индекс 4 ✓');
  assert.equal(indexFromScroll(19, 40), 0, 'хагасаас бага → доод мөр ✓');
  assert.equal(indexFromScroll(20, 40), 1, 'хагасаас их/тэнцүү → дээд мөр (round ✓)');
  assert.equal(indexFromScroll(59, 40), 1);
  assert.equal(indexFromScroll(70, 40), 2);
});

t('🎡 `indexFromScroll()` — СӨРӨГ/ХЭТ ТОМ гүйлгээ нь хүрээнд ХЯЗГААРЛАГДАНА', () => {
  assert.equal(indexFromScroll(-120, 40), 0, 'дээш хэт гүйлгэсэн ч 0-ээс доош ГАРАХГҮЙ ✓');
  assert.equal(indexFromScroll(4000, 40, 46), 46, 'доош хэт гүйлгэсэн ч сүүлийн мөрөнд зогсоно ✓');
  assert.equal(indexFromScroll(4000, 40, 0), 0, 'нэг мөртэй жагсаалт (maxIndex 0) ✓');
});

t('🎡 `indexFromScroll()` — ЭВДЭРСЭН оролтод Ч тоо буцаана (`NaN` БИШ ✓)', () => {
  assert.equal(indexFromScroll(NaN, 40), 0);
  assert.equal(indexFromScroll(undefined, 40), 0);
  assert.equal(indexFromScroll(100, 0), 0, 'өндөр 0 бол хуваахгүй ✓');
  assert.equal(indexFromScroll(100, NaN), 0);
  assert.equal(Number.isFinite(indexFromScroll(100, 40)), true);
});

t('🎡 `scrollTopForIndex()` — индекс → гүйлгээний байрлал (мөрийг ТӨВД нь тавина)', () => {
  assert.equal(scrollTopForIndex(0, 40), 0);
  assert.equal(scrollTopForIndex(4, 40), 160);
  assert.equal(scrollTopForIndex(25, 40), 1000, 'индекс 25 = 26 дахь мөр = 1000px ✓');
  assert.equal(scrollTopForIndex(FLOOR_MAX, 40), FLOOR_MAX * 40, `сүүлийн мөр («${FLOOR_MAX}») хүртэл ✓`);
  assert.equal(scrollTopForIndex(-5, 40), 0, 'сөрөг индекс → 0 ✓');
  assert.equal(scrollTopForIndex(2.7, 40), 80, 'бутархай индекс бүхэлчилнэ ✓');
});

t('🎡 Хоёр функц ХАРИЛЦАН УРВУУ — `indexFromScroll(scrollTopForIndex(i, h), h) === i`', () => {
  const h = 40;
  const list = countChoices(1, FLOOR_MAX);
  list.forEach((v, i) => {
    assert.equal(indexFromScroll(scrollTopForIndex(i, h), h, list.length - 1), i, `«${v}» индекс=${i}`);
  });
});

t('🧩 ГЭРЭЭ: `WheelPicker` нь гүйлгээний математикаа ЦЭВЭР модулиас авна (давхардуулахгүй ✓)', () => {
  const src = readSrc('components/WheelPicker.jsx');
  assert.match(src, /import \{ nearestChoiceIndex, indexFromScroll, scrollTopForIndex \}/);
  assert.match(src, /commit\(indexFromScroll\(sc\.scrollTop, ITEM_H, items\.length - 1\)\)/);
  assert.match(src, /sc\.scrollTop = scrollTopForIndex\(idx, ITEM_H\)/);
  // ⚠️ Хуучин `Math.round(sc.scrollTop / ITEM_H)` шууд бичилт БАЙХГҮЙ болсон ✓
  assert.doesNotMatch(src, /Math\.round\(sc\.scrollTop/, 'алгоритм нэг дор л байх ёстой ✓');
});

// ────────────────────────────────────────────────────────────
// ⑥ ГЭРЭЭ — ФОРМ · ДУГУЙ · `locationData.js` · CSS
// ────────────────────────────────────────────────────────────
t('🧩 ГЭРЭЭ: `AddListingClient` нь жагсаалтаа `numberChoices.mjs`-ээс авна', () => {
  const src = readSrc('components/AddListingClient.jsx');
  assert.match(src, /from '\.\.\/lib\/numberChoices\.mjs'/, 'нэг эх сурвалж ✓');
  assert.match(src, /countChoices\(1, FLOOR_MAX\)/, 'нийт давхар = 1…FLOOR_MAX');
  assert.match(src, /floorChoices\(/, '«Тухайн байрны давхар» нийт давхраас хамаарна ✓');
  assert.match(src, /yearChoices\(\)/, 'оны жагсаалт 1980…2026 ✓');
  assert.match(src, /BALCONY_OPTIONS/, 'тагт нь `locationData`-ийн жагсаалттай ижил ✓');
  assert.match(src, /BATHROOM_MAX/, 'угаалгын өрөөний дээд хязгаар ✓');
});

t('🧩 ГЭРЭЭ: форм нь 📱 мобайл дугуйг (`WheelPicker`) ХЭРЭГЛЭНЭ', () => {
  const src = readSrc('components/AddListingClient.jsx');
  assert.match(src, /import WheelPicker from '\.\/WheelPicker'/);
  assert.match(src, /<WheelPicker/, 'жагсаалт дээр рендэрлэгдэнэ');
  assert.match(src, /data-choice-trigger=/, 'товч нь CDP-ийн тогтвортой selector-той ✓');
  assert.match(src, /className="choice-trigger sm:hidden"/, 'товч ЗӨВХӨН мобайлд ✓');
  assert.match(src, /hide-below-sm/, '🖥 дээр гар бичилт/`<select>` хэвээр ✓');
  assert.match(src, /openWheel=\{setWheel\}/, 'дугуйг нээх state холбоотой ✓');
});

t('🧩 ГЭРЭЭ: он/давхар/тагт/угаалгын өрөө нь `ChoiceField`-ээр солигдсон', () => {
  const src = readSrc('components/AddListingClient.jsx');
  ['testId="buildYear"', 'testId="totalFloors"', 'testId="floor"',
    'testId="balconies"', 'testId="bathrooms"'].forEach((id) => {
    assert.match(src, new RegExp(id), `${id} — дугуйн сонголттой ✓`);
  });
  assert.match(src, /testId=\{`attr-\$\{f\.key\}`\}/, '⚠️ он attr талбарууд ч (`attrs` jsonb) ✓');
  // ⚠️ Хуучин `<input type="number">`-үүд БАЙХГҮЙ (сонголт руу шилжсэн ✓)
  assert.doesNotMatch(src, /value=\{form\.totalFloors\}\s*\n\s*onChange=\{\(e\) => set\('totalFloors'/);
  assert.doesNotMatch(src, /value=\{form\.floor\}\s*\n\s*onChange=\{\(e\) => set\('floor'/);
});

t('🧩 ГЭРЭЭ: алхам солигдоход дугуй ХААГДАНА (`gotoStep`)', () => {
  const src = readSrc('components/AddListingClient.jsx');
  assert.match(src, /const gotoStep = \(n\) => \{[\s\S]{0,400}setWheel\(null\);/);
  assert.match(src, /onClose=\{\(\) => setWheel\(null\)\}/);
});

t('🧩 ГЭРЭЭ: `WheelPicker` нь iOS Timer маягийн `snap-y` + Escape/ард тал хаалт', () => {
  const src = readSrc('components/WheelPicker.jsx');
  assert.match(src, /^'use client';/, 'Next.js-д client компонент ✓');
  assert.match(src, /snap-y snap-mandatory/, 'мөр бүр төвд ЗОГСОНО (iOS Timer-ийн мэдрэмж ✓)');
  assert.match(src, /snap-center/, 'мөрүүд төв рүү тэмүүлнэ ✓');
  assert.match(src, /'Escape'/, 'Escape дарахад хаагдана ✓');
  assert.match(src, /data-wheel-backdrop/, 'ард талыг дарахад хаагдана ✓');
  assert.match(src, /data-wheel-marker/, 'төвийн «сонгосон мөр»-ийн заагч ✓');
  assert.match(src, /data-wheel-value=\{it\.value\}/, 'мөр бүр утгаараа олдоно (CDP ✓)');
  assert.match(src, /if \(!open\) return null;/, 'хаалттай үед DOM-д ОГТ гарахгүй ✓');
  // ⚠️ `<form>` дотор ч, гадна ч бүх товч `type="button"` — submit болохгүй ✗
  assert.doesNotMatch(src, /<button(?![^>]*type="button")/, 'бүх товч `type="button"` ✓');
});

t('🧩 ГЭРЭЭ: `locationData.js` — оны attr талбар нь `choices: YEAR_CHOICES`', () => {
  const src = readSrc('lib/locationData.js');
  assert.match(src, /import \{ YEAR_CHOICES \} from '\.\/numberChoices\.mjs'/);
  assert.match(src, /yearFilter\('year', 'Үйлдвэрлэсэн он'[\s\S]{0,60}choices: YEAR_CHOICES/);
  assert.match(src, /yearFilter\('importYear', 'Орж ирсэн он'[\s\S]{0,60}choices: YEAR_CHOICES/);
  // ⚠️ `range`/`filterable` ХӨНДӨӨГДӨӨГҮЙ — sidebar-ийн хүрээний шүүлт хэвээр ✓
  assert.match(src, /\.\.\.number\(key, label, placeholder, icon\), filterable: true, range: true,/);
});

t('🧩 ГЭРЭЭ: CSS — `.choice-trigger` (мобайл товч) + дугуйн scrollbar НУУГДСАН', () => {
  const src = readSrc('app/globals.css');
  assert.match(src, /\.choice-trigger \{/, 'товчны класс ✓');
  assert.match(src, /\.choice-trigger\[data-empty="true"\]/, 'хоосон үед цайвар (placeholder шиг) ✓');
  assert.match(src, /\[data-wheel-scroll\] \{/, 'дугуйн гүйлгэх хэсэг ✓');
  assert.match(src, /scrollbar-width: none/, 'Firefox-д scrollbar нуух ✓');
  assert.match(src, /::-webkit-scrollbar \{/, 'Chrome/Safari-д scrollbar нуух ✓');
});

console.log(`\n✅ Нийт ${passed} тест амжилттай — тоон сонголтын жагсаалт + мобайл дугуй\n`);
