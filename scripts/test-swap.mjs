// ============================================================
// test-swap.mjs — «🔄 СОЛИНО» ☑/чип/шүүлтийн тест (2026-10-09)
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Үнэ тохирно Гэсэн сонголтын баруун талд, Солино гээд
// "Үнэ тохирно" гэсэнтэй адилхан checkbox хийж өгөөч. Үүнийг автомашин болон
// Спорт бараа -> Дартс хэсэгт оруулж өгөө. Ингэхдээ энэ 2-ийн зар нэмэх
// болон, зөвхөн энэ 2-ийн хайлт дээр оруулж өгөөч».
//
// ХАМРАХ ХҮРЭЭ (4 давхарга — бүгд НЭГ эх сурвалж `lib/swapFilter.mjs`):
//   ① `lib/swapFilter.mjs` — цэвэр логик (хэн хаана байх вэ · утга · URL ·
//      хадгалалт · `attrs->>swap=eq.yes` шүүлт)
//   ② `lib/queries.js`     — PostgREST-ийн мөр яг зөв үүсэх эсэх (ХУУЧИР builder)
//   ③ `components/*.jsx`   — ФОРМ (☑ «Үнэ тохирно»-гийн баруун талд),
//      ХАЙЛТ (sidebar чип), ДЭЛГЭРЭНГҮЙ/МИНИЙ ЗАРУУД (үнийн доорх мөр)
//   ④ `scripts/cdp-swap.mjs` + `package.json` — CDP ба бүртгэл
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ (3 эрсдэл — бүгд «чимээгүй» эвдэрдэг):
//   ① ХЭСГИЙН ХҮРЭЭ: 🚗 «Автомашин» (бүх дэд төрөл) ба ⚽ «Спорт бараа →
//      Дартс»-ээс өөр газарт гарвал хэрэглэгчийн шаардлага ЗӨРЧИГДӨНӨ ✗ ⇒
//      `supportsSwap()`-ийн 12+ тохиолдлыг түгждэг
//   ② ХУУЧИН УТГА: хэсэг/дэд төрөл сольсон ч `attrs.swap` үлдвэл DB-д «үхсэн»
//      тэмдэг үлдэж, хайлт хуурамч үр дүн буцаана ✗ ⇒ `swapForAttrs()` = `null`
//   ③ ҮЛ ҮЗЭГДЭХ ШҮҮЛТ: ⚽ «Дартс» → «Гольф» сольход `?swap=1` URL-д үлдвэл
//      sidebar-д харагдахгүй атлаа зарыг шүүж, «0 үр дүн» гарна ✗ ⇒
//      `setF`/URL-унших цэвэрлэгээг эх файлын гэрээгээр барина
//
// АЖИЛЛУУЛАХ:  npm run test:swap
// ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (модуль нь импортгүй цэвэр ✓)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  SWAP_ATTR_KEY, SWAP_VALUE, SWAP_LABEL, SWAP_ICON, SWAP_URL_VALUE,
  SWAP_SECTION, SWAP_SUBTYPE_SECTION, SWAP_SUBTYPES,
  applySwapFilter, isSwapListing, normalizeSwapValue, parseSwapParam,
  supportsSwap, swapForAttrs, swapLabel, swapUrlValue, toggleSwapValue,
} from '../lib/swapFilter.mjs';
import { getSubtypes, SECTIONS } from '../lib/locationData.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

/**
 * PostgREST query builder-ийн ХУУЧИР — дуудсан арга бүрийг бүртгэнэ.
 * ⚠️ `lib/queries.js`-ийн бодит builder-той ИЖИЛ гэрээтэй: `.eq()` нь
 *    дахин `this`-ээ буцаана ✓
 */
function fakeQuery() {
  const calls = [];
  const q = {
    calls,
    eq(col, val) { calls.push(['eq', col, val]); return q; },
  };
  return q;
}
/** `applySwapFilter`-ийг хуурамч builder дээр ажиллуулж, дуудлагыг буцаана */
const callsFor = (on) => {
  const q = fakeQuery();
  applySwapFilter(q, on);
  return q.calls;
};

const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Комментгүй ЦЭВЭР КОД — ХАСАГДСАН/ТАЙЛБАР мөрүүд нь зүй ёсны тул
 *  шалгалтыг зөвхөн кодын мөрүүд дээр хийнэ (хуурамч улаан гарахгүй ✓) */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

console.log('\n🧪 «Солино» — ☑ checkbox + хайлтын чип + DB шүүлт (lib/swapFilter.mjs)\n');

// ---------- ① supportsSwap — ХАМГИЙН ЧУХАЛ дүрэм (хэн хаана) ----------
t('supportsSwap: 🚗 auto — БҮХ дэд төрөлд (дэд төрөл сонгоогүй ч) true', () => {
  assert.equal(supportsSwap('auto'), true, 'дэд төрөлгүй ✗');
  assert.equal(supportsSwap('auto', ''), true);
  assert.equal(supportsSwap(SWAP_SECTION), true);
  // ⚠️ 🚗-ийн БҮХ дэд төрөл (10) — `getSubtypes` нь DB-д хадгалагдах ЯГ тэр нэрс
  const auto = getSubtypes('auto');
  assert.ok(auto.length >= 9, `авто дэд төрөл цөөн ✗ (${auto.length})`);
  auto.forEach((s) => assert.equal(supportsSwap('auto', s), true, `«${s}» ✗`));
});

t('supportsSwap: ⚽ hobby — ЗӨВХӨН «Дартс» true, бусад дэд төрөл false', () => {
  assert.equal(supportsSwap(SWAP_SUBTYPE_SECTION, 'Дартс'), true);
  assert.deepEqual(SWAP_SUBTYPES, ['Дартс']);
  // ⚠️ «Дартс» нь hobby-гийн БОДИТ дэд төрөл мөн эсэх (`property_type` = DB утга)
  assert.ok(getSubtypes('hobby').includes('Дартс'),
    '«Дартс» нь hobby-гийн дэд төрөл БИШ — нэр зөрсөн ✗');
  // ⚠️ Бусад 18 дэд төрөл + хоосон/«Бусад» → false (хэрэглэгчийн шаардлага ✓)
  const others = getSubtypes('hobby').filter((s) => s !== 'Дартс');
  assert.equal(others.length, 18, `hobby-гийн бусад дэд төрөл 18 байх ёстой ✗ (${others.length})`);
  others.forEach((s) => assert.equal(supportsSwap('hobby', s), false, `«${s}» ✗`));
  ['', '   ', null, undefined, 'дартс', 'Дартс '].forEach((s) => {
    // ⚠️ trim хийгдэнэ («Дартс » = «Дартс») ч жижиг үсэг ОГТ таарахгүй ✓
    const expected = s === 'Дартс ';
    assert.equal(supportsSwap('hobby', s), expected, `«${String(s)}» ✗`);
  });
});

t('supportsSwap: бусад БҮХ хэсэг ба «Бүх зар» → false (хэрэглэгчийн шаардлага)', () => {
  ['real-estate', 'jobs', 'computers', 'home', 'goods', 'services',
    'construction', 'equipment', 'furniture', 'travel', 'electric', 'all',
    '', null, undefined, 'AUTO', 'Auto', 'hobby2'].forEach((s) => {
    assert.equal(supportsSwap(s), false, `«${String(s)}» ✗`);
  });
  // ⚠️ `SECTIONS`-ийн зөвхөн 2 хэсэг дэмжинэ (регресс: 3 дахь хэсэг нэмэгдэхэд барина)
  const supported = SECTIONS.map((x) => x.value).filter((v) => supportsSwap(v, 'Дартс'));
  assert.deepEqual(supported, ['auto', 'hobby']);
});


// ---------- ② Утга/шошго/дүрс — нэг эх сурвалж ----------
t("SWAP_VALUE='yes' (🤝 negotiable-тэй ижил) · SWAP_LABEL='Солино' · SWAP_URL_VALUE='1'", () => {
  assert.equal(SWAP_ATTR_KEY, 'swap');
  assert.equal(SWAP_VALUE, 'yes');
  assert.equal(SWAP_LABEL, 'Солино');
  assert.equal(SWAP_URL_VALUE, '1');
  assert.equal(SWAP_ICON, '🔄');
  // ⚠️ Утга нь ASCII (URL/jsonb-д аюулгүй); шошго нь кирилл (UI-д л) ✓
  assert.match(SWAP_VALUE, /^[a-z]+$/);
  assert.match(SWAP_URL_VALUE, /^[0-9]$/);
});

t("normalizeSwapValue: 'yes'/true/'1'/'YES' → 'yes'; ''/null/'no'/'abc' → ''", () => {
  ['yes', 'YES', ' Yes ', true, 1, '1', 'true', 'TRUE'].forEach((v) => {
    assert.equal(normalizeSwapValue(v), 'yes', `«${String(v)}» ✗`);
  });
  ['', '   ', null, undefined, 'no', false, 0, '0', 'abc', {}, []].forEach((v) => {
    assert.equal(normalizeSwapValue(v), '', `«${JSON.stringify(v)}» ✗`);
  });
  // ⚠️ 'no' нь ЗОРИУДААР хүчингүй (унтраасан чекбокс түлхүүрийг УСТГАДАГ ✓)
  assert.equal(normalizeSwapValue('no'), '');
});

t('parseSwapParam: «?swap=1» → true; «?swap=abc» → false (чимээгүй, алдаагүй)', () => {
  ['1', 'yes', 'true'].forEach((v) => assert.equal(parseSwapParam(v), true, `«${v}» ✗`));
  ['0', 'abc', '', null, undefined].forEach((v) => assert.equal(parseSwapParam(v), false, `«${String(v)}» ✗`));
});

t("swapUrlValue/toggleSwapValue: true → '1' · false → '' (бичихгүй) · ☑ мэт эргэлт", () => {
  assert.equal(swapUrlValue(true), '1');
  assert.equal(swapUrlValue(false), '');
  assert.equal(swapUrlValue(undefined), '');
  assert.equal(toggleSwapValue(false), true);
  assert.equal(toggleSwapValue(true), false);
  // ⚠️ Хоосон (`''`/`undefined`) утга ч «унтраалттай» мэт эргэлдэнэ (React state ✓)
  assert.equal(toggleSwapValue(''), true);
  assert.equal(toggleSwapValue(undefined), true);
});

// ---------- ③ isSwapListing / swapLabel — ЗАР дээрх уншилт ----------
t('isSwapListing: attrs.swap = yes/true/1 → true; бусад/хоосон → false', () => {
  assert.equal(isSwapListing({ attrs: { swap: 'yes' } }), true);
  assert.equal(isSwapListing({ attrs: { swap: true } }), true);
  assert.equal(isSwapListing({ attrs: { swap: '1' } }), true);
  assert.equal(isSwapListing({ attrs: { swap: 'no' } }), false);
  assert.equal(isSwapListing({ attrs: {} }), false);
  assert.equal(isSwapListing({ attrs: null }), false);
  assert.equal(isSwapListing({}), false);
  // ⚠️ Эвдэрсэн/хоосон өгөгдөл дээр АЛДАА ШИДЭХГҮЙ (дэлгэрэнгүй хуудас унахгүй ✓)
  [null, undefined, 'yes', 5, []].forEach((l) => {
    assert.equal(isSwapListing(l), false, `«${JSON.stringify(l)}» ✗`);
  });
});

t("swapLabel: тэмдэглэсэн → 'Солино'; тэмдэглээгүй → '' (хоосон МӨР үүсэхгүй ✓)", () => {
  assert.equal(swapLabel({ attrs: { swap: 'yes' } }), 'Солино');
  assert.equal(swapLabel({ attrs: { swap: 'yes' } }), SWAP_LABEL);
  assert.equal(swapLabel({ attrs: {} }), '');
  assert.equal(swapLabel({}), '');
  assert.equal(swapLabel(null), '');
  // ⚠️ «Үнэ тохирно»-гийн утга нь 🔄-д НӨЛӨӨЛӨХГҮЙ (тусдаа түлхүүр ✓)
  assert.equal(swapLabel({ attrs: { negotiable: 'yes' } }), '');
});


// ---------- ④ swapForAttrs — ХАДГАЛАХ дүрэм (үхсэн утга үлдээхгүй) ----------
t("swapForAttrs: ON + дэмжигдэх хэсэг → 'yes' (🚗 бүх дэд төрөл, ⚽ «Дартс»)", () => {
  assert.equal(swapForAttrs('auto', '', true), SWAP_VALUE);
  getSubtypes('auto').forEach((s) => assert.equal(swapForAttrs('auto', s, true), 'yes', `«${s}» ✗`));
  assert.equal(swapForAttrs('hobby', 'Дартс', true), 'yes');
});

t('swapForAttrs: OFF → null (чекбокс унтраасан = түлхүүр УСТАНА ✓)', () => {
  [false, '', null, undefined, 0].forEach((on) => {
    assert.equal(swapForAttrs('auto', 'Суудлын машин', on), null, `«${String(on)}» ✗`);
    assert.equal(swapForAttrs('hobby', 'Дартс', on), null, `«${String(on)}» ✗`);
  });
});

t('🚨 swapForAttrs: дэмжигдэхгүй хэсэг/дэд төрөл → null (ХУЧИН утга үлдэхгүй ✗)', () => {
  // ⚠️ Дэд төрөл сонгоогүй ⚽ «Спорт бараа» — «Дартс» биш тул null ✓
  assert.equal(swapForAttrs('hobby', '', true), null);
  assert.equal(swapForAttrs('hobby', 'Гольф', true), null);
  // ⚠️ Форм дээр 🚗-ээс 🏠 руу шилжсэн — «үхсэн» утга үлдэхгүй
  ['real-estate', 'jobs', 'computers', 'all', '', null, undefined].forEach((s) => {
    assert.equal(swapForAttrs(s, '', true), null, `«${String(s)}» ✗`);
    assert.equal(swapForAttrs(s, 'Дартс', true), null, `«${String(s)}» (+Дартс) ✗`);
  });
  // ⚠️ Хэрэглэгч 🔄 тэмдэглээд ДАРАА нь дэд төрлөө сольсон тохиолдол
  assert.equal(swapForAttrs('hobby', 'Дартс', true), 'yes');
  assert.equal(swapForAttrs('hobby', 'Харваа', true), null);
});

// ---------- ⑤ applySwapFilter — PostgREST builder ----------
t('applySwapFilter(false/undefined) → builder-т ОГТ хүрэхгүй («Бүх зар» ✓)', () => {
  assert.deepEqual(callsFor(false), []);
  assert.deepEqual(callsFor(undefined), []);
  assert.deepEqual(callsFor(''), []);
  assert.deepEqual(callsFor(0), []);
});

t("applySwapFilter(true) → eq('attrs->>swap', 'yes') — ГАНЦ нөхцөл (скаляр ✓)", () => {
  assert.deepEqual(callsFor(true), [['eq', 'attrs->>swap', 'yes']]);
  // ⚠️ `cs`/`or` БАЙХГҮЙ (утга нь МАССИВ БИШ скаляр ТЕКСТ — `payment_terms`-ээс
  //    ялгаатай ✓) ба утга нь зөвхөн ASCII ('yes') ⇒ injection аюулгүй
  const [[, col, val]] = callsFor(true);
  assert.equal(col, `attrs->>${SWAP_ATTR_KEY}`);
  assert.equal(val, SWAP_VALUE);
});

t('⛓ builder нь ГИНЖИН дуудагдана (`.eq()` нь `this`-ээ буцаана ✓)', () => {
  const q = fakeQuery();
  assert.equal(applySwapFilter(q, true), q);
  assert.equal(applySwapFilter(q, false), q);
});

// ---------- ⑥ lib/queries.js — бодит шүүлтийн гинжин ----------
t('🔗 lib/queries.js: `applySwapFilter` нь `applyPaymentFilter`-ийн ДАРАА дуудагдана', () => {
  const src = readSrc('lib/queries.js');
  assert.match(src, /import \{ applySwapFilter \} from '\.\/swapFilter\.mjs'/,
    'swapFilter.mjs-ийн импорт алга ✗');
  assert.match(src, /applySwapFilter\(query, filters\.swap\)/,
    'шүүлтийн гинжинд дуудагдахгүй байна ✗');
  const payAt = src.indexOf('applyPaymentFilter(query');
  const swapAt = src.indexOf('applySwapFilter(query');
  assert.ok(payAt > 0 && swapAt > payAt, 'төлбөрийн нөхцөлийн дараа байх ёстой ✗');
  // ⚠️ МЕХАНИК нь модульд — энд `.eq(`/`swap` гэж ШУУД бичихгүй (нэг эх сурвалж ✓)
  assert.ok(!/eq\('attrs->>swap'/.test(src), 'шүүлтийн мөр query-д ДАВХАР бичигдсэн ✗');
});

t('🧾 MIGRATION 0: шинэ багана/`alter table` НЭМЭГДЭЭГҮЙ (attrs jsonb ✓)', () => {
  const src = readSrc('lib/queries.js');
  assert.ok(!/alter table/i.test(src), 'queries.js-д `alter table` байна ✗');
  const migrations = fs.readdirSync(path.join(ROOT, 'supabase/migrations'));
  assert.ok(!migrations.some((f) => /swap/i.test(f)),
    '🔄-д зориулсан migration файл үүссэн байна ✗ (шаардлагагүй)');
});

t('🧩 lib/swapFilter.mjs нь ИМПОРТГҮЙ цэвэр модуль (Node-оор шууд ачаалагдана ✓)', () => {
  const src = readSrc('lib/swapFilter.mjs');
  assert.ok(!/^\s*import\s/m.test(src), 'модуль импорттой болсон ✗ (цэвэр байх ёстой)');
  assert.ok(!/require\(/.test(src), '`require` байна ✗');
});

// ---------- ⑦ components/*.jsx — 4 давхаргын гэрээ ----------
t('☑ AddListingClient.jsx: чекбокс нь «Үнэ тохирно»-гийн ЯГ БАРУУН талд (ДАРАА нь)', () => {
  const src = readSrc('components/AddListingClient.jsx');
  const ui = codeOnly(src);
  // ① НЭГ ЭХ СУРВАЛЖ
  assert.match(ui, /from '\.\.\/lib\/swapFilter\.mjs'/, 'swapFilter.mjs-ийн импорт алга ✗');
  assert.match(ui, /supportsSwap/, 'supportsSwap алга ✗');
  assert.match(ui, /swapForAttrs/, 'swapForAttrs алга ✗');
  assert.match(ui, /isSwapListing/, 'isSwapListing алга ✗');
  assert.match(ui, /SWAP_LABEL/, 'шошго (SWAP_LABEL) алга ✗');
  // ② Төлөв: шинэ зард УНТРААЛТТАЙ, засах горимд `attrs.swap`-аас
  assert.match(ui, /swap: false,/, '`emptyForm()`-д `swap: false` алга ✗');
  assert.match(ui, /swap: isSwapListing\(l\),/, '`listingToForm()`-д `swap: isSwapListing(l)` алга ✗');
  // ③ Харагдах нөхцөл: форм-ийн хэсэг + ДЭД ТӨРӨЛ (нэг функцээр ✓)
  assert.match(ui,
    /const showSwap = supportsSwap\(form\.section \|\| 'real-estate', form\.propertyType\)/,
    '`showSwap` нөхцөл алга/зөрсөн ✗');
  // ④ ☑ checkbox — CDP дэгээ + form-ын төлөв
  assert.match(ui, /data-swap-check/, 'CDP-ийн дэгээ (`data-swap-check`) алга ✗');
  assert.match(ui, /checked=\{form\.swap\}/, 'чекбокс нь `form.swap`-аас уншигдахгүй ✗');
  assert.match(ui, /setForm\(\(f\) => \(\{ \.\.\.f, swap: e\.target\.checked \}\)\)/,
    'чекбоксын onChange холбогдоогүй ✗');
  // ⑤ ДАРААЛАЛ: эхний чекбокс «Үнэ тохирно» (CDP `boxes[0]`) — 🔄 ДАРАА нь
  const negAt = ui.indexOf('checked={form.negotiable}');
  const swapAt = ui.indexOf('data-swap-check');
  assert.ok(negAt > 0 && swapAt > negAt, '🔄 нь «Үнэ тохирно»-гээс ӨМНӨ байна ✗');
  // ⑥ ХАДГАЛАЛТ: `attrs.swap = 'yes'` ба дэмжигдэхгүй бол УСТГАНА
  assert.match(ui, /const swap = swapForAttrs\(form\.section, form\.propertyType, form\.swap\);/,
    'payload-д `swapForAttrs(...)` алга ✗');
  assert.match(ui, /if \(swap\) a\.swap = swap;/, '`attrs.swap` хадгалагдахгүй ✗');
  assert.match(ui, /else delete a\.swap;/, 'түлхүүрийг устгах дүрэм алга ✗ (үхсэн утга үлдэнэ)');
});

t('🔍 HomeClient.jsx: sidebar-ийн ГАНЦ чип + URL `?swap=1` + DB (нэг эх сурвалж)', () => {
  const src = readSrc('components/HomeClient.jsx');
  const ui = codeOnly(src);
  // ① Блок ба чипийн DOM дэгээ (CDP ✓)
  assert.match(ui, /data-swap-filter/, 'блокийн дэгээ алга ✗');
  assert.match(ui, /data-swap-value="1"/, 'чипийн дэгээ алга ✗');
  assert.match(ui, /aria-pressed=\{filters\.swap\}/, 'чипийн төлөв (`aria-pressed`) алга ✗');
  // ② НЭГ ЭХ СУРВАЛЖ (шошго/дүрэм/эргэлт нь модульд ✓)
  assert.match(ui, /SWAP_LABEL/, 'шошго (SWAP_LABEL) алга ✗');
  assert.match(ui, /supportsSwap\(section, filters\.propertyType\)/, '`showSwap` нөхцөл алга ✗');
  assert.match(ui, /toggleSwapValue/, '`toggleSwapValue` импорт алга ✗');
  assert.match(ui, /const toggleSwap = /, '`toggleSwap` функц алга ✗');
  assert.match(ui, /const clearSwap = \(\) => setF\('swap', false\)/, '`clearSwap` алга ✗');
  // ③ URL: унших · цэвэрлэх · бичих
  assert.match(ui, /parseSwapParam\(sp\.get\('swap'\)\)/, 'URL-аас унших ✗');
  assert.match(ui, /next\.swap = false;/, 'хэсэг/дэд төрөлд тохирохгүй бол орхих дүрэм алга ✗');
  assert.match(ui, /swapUrlValue\(filters\.swap\)/, 'URL-д бичих ✗');
  assert.match(ui, /swap: filters\.swap \|\| undefined/, 'DB шүүлт рүү дамжуулах ✗');
});

t('🔍 HomeClient.jsx (үргэлжлэл): BOOLEAN-ийн хоосон утга ба ЧИП ХЭВ', () => {
  const ui = codeOnly(readSrc('components/HomeClient.jsx'));
  // ④ BOOLEAN-ийн хоосон утга (`''`/`[]` БИШ — `false` ✓)
  assert.match(ui, /swap: false,/, '`EMPTY_FILTERS`-д `swap: false` алга ✗');
  assert.match(ui, /if \(k === 'propertyType' && !supportsSwap\(section, v\)\) next\.swap = false;/,
    'дэд төрөл солиход цэвэрлэх дүрэм алга ✗');
  assert.match(ui, /key === 'swap' \? false/, 'идэвхтэй чипийн ✕ дээр BOOLEAN цэвэрлэхгүй ✗');
  assert.match(ui, /chips\.push\(\{ key: 'swap', label: SWAP_LABEL \}\)/, 'идэвхтэй шүүлтийн чип алга ✗');
  // ⑤ ЧИП ХЭВ: «🛏 Өрөөний тоо»/«💳 Төлбөрийн нөхцөл»-тэй ЯГ ИЖИЛ (☑ input БИШ ✓)
  const at = ui.indexOf('data-swap-filter');
  const region = ui.slice(Math.max(0, at - 400), at + 900);
  assert.match(region, /className=\{`chip-toggle \$\{filters\.swap \? 'chip-toggle-active' : ''\}`\}/,
    'чипийн класс (`.chip-toggle`) алга ✗');
  assert.match(region, /<button/, 'чип нь ЖИНХЭНЭ `<button>` байх ёстой ✗');
  assert.match(region, /\{filters\.swap && <span aria-hidden="true">✓<\/span>\}/,
    'идэвхтэй чип дээр `✓` тэмдэг алга ✗');
  assert.ok(!/type="checkbox"/.test(region), 'хайлтын блок дээр ☑ checkbox байна ✗');
});

t('📄 ListingDetailClient/MyListingsClient: үнийн доорх мөр (🤝-гийн ЯГ ДООР)', () => {
  const detail = codeOnly(readSrc('components/ListingDetailClient.jsx'));
  assert.match(detail, /from '\.\.\/lib\/swapFilter\.mjs'/, 'дэлгэрэнгүйд импорт алга ✗');
  assert.match(detail, /\{swapLabel\(listing\) && \(/, 'дэлгэрэнгүйд мөр гарахгүй ✗');
  assert.match(detail, /SWAP_ICON/, '🔄 дүрс алга ✗');
  // ⚠️ Дараалал: 🤝-гийн ДАРАА (үнийн ЯГ ДООР, нэг баганад ✓)
  const neg = detail.indexOf('negotiableNote(listing)');
  const sw = detail.indexOf('swapLabel(listing)');
  assert.ok(neg > 0 && sw > neg, '🔄 нь 🤝-гийн өмнө байна ✗');
  const mine = codeOnly(readSrc('components/MyListingsClient.jsx'));
  assert.match(mine, /\{swapLabel\(l\) && \(/, 'миний зарууд дээр мөр гарахгүй ✗');
  // ⛔ КАРТ дээр ГАРАХГҮЙ (2026-10-02-ын «🤝 карт дээр гарахгүй» дүрэм ХЭВЭЭР ✓)
  const card = codeOnly(readSrc('components/ListingCard.jsx'));
  assert.ok(!/swapLabel|SWAP_LABEL/.test(card), 'зарын КАРТ дээр 🔄 гарч байна ✗');
});

// ---------- ⑧ CDP + бүртгэл ----------
t('🐍 CDP скрипт нь БОДИТ DOM дээр чип/чекбоксыг шалгана (`scripts/cdp-swap.mjs`)', () => {
  const cdp = readSrc('scripts/cdp-swap.mjs');
  assert.match(cdp, /data-swap-value/, 'чипийг DOM-оос олдоггүй ✗');
  assert.match(cdp, /data-swap-filter/, 'блокийг олдогүй ✗');
  assert.match(cdp, /data-swap-check/, 'форм дээрх ☑-г олдоггүй ✗');
  assert.match(cdp, /swap=1/, 'URL-ийн `?swap=1`-ийг шалгахгүй ✗');
  assert.match(cdp, /aria-pressed/, 'чипийн төлвийг шалгахгүй ✗');
  assert.match(cdp, /chip-toggle/, 'чипийн классыг шалгахгүй ✗');
  assert.match(cdp, /attrs->>swap/, 'DB шүүлтийн мөрийг шалгахгүй ✗');
  assert.match(cdp, /chip-toggle-active/, 'идэвхтэй чипийн хэвийг шалгахгүй ✗');
});

t('📦 package.json: `test:swap` ба `cdp:swap` бүртгэгдсэн', () => {
  const pkg = JSON.parse(readSrc('package.json'));
  assert.equal(pkg.scripts['test:swap'], 'node scripts/test-swap.mjs');
  assert.equal(pkg.scripts['cdp:swap'], 'node scripts/cdp-swap.mjs');
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);



