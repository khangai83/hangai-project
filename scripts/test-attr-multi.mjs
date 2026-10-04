// ============================================================
// test-attr-multi.mjs — 🎨 ОЛОН СОНГОЛТТОЙ ATTR ШҮҮЛТИЙН тест (2026-10-03 (19))
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Зар хайлт дээр Авто машин сонголт дээр Өнгө ийг
// Төлбөрийн нөхцөл шиг олон сонголттой болго» ⇒ 🚗 `auto` хэсгийн sidebar-д
// 🎨 «Өнгө» нь `<select>` БИШ, ОЛОН СОНГОЛТТОЙ ЧИП болов.
//
// 🆕 2026-10-03 (21): мөн дүрмээр ✅ **«Шинэ / Шинэвтэр / Хуучин»** (`condition`)
//    нь 8 хэсгийн sidebar-д ОЛОН СОНГОЛТТОЙ ЧИП болов (хэрэглэгчийн хүсэлт:
//    «хайлт дээр Шинэ / Шинэвтэр / Хуучин ийг бас 💳 Төлбөрийн нөхцөл шиг олон
//    сонголт хийх боломжтой болго») ⇒ `?attr_condition=Шинэ,Хуучин` ба DB
//    `attrs->>condition=in.(Шинэ,Хуучин)`. ⚠️ ХӨДӨЛГӨХ КОД БАЙХГҮЙ — модуль нь
//    attr-ийн түлхүүрээс ХАМААРАХГҮЙ (зөвхөн либын ТУГ нэмэгдэв ✓)
//
// 🆕 2026-10-03 (22): мөн дүрмээр 🚗 авто-ийн ⚙️ **«Хурдны хайрцаг»**
//    (`transmission`) ба ⛽ **«Түлш»** (`fuel`) нь sidebar-д ОЛОН СОНГОЛТТОЙ
//    ЧИП болов (хэрэглэгчийн хүсэлт: «мөн автомашин хайлт дээр бас ⚙️ Хурдны
//    хайрцаг -ийг 💳 Төлбөрийн нөхцөл шиг болго. бас ⛽ Түлш ийг») ⇒
//    `?attr_transmission=Автомат,Механик` · `?attr_fuel=Хайбрид,Цахилгаан`
//    ба DB `attrs->>transmission=in.(…)` / `attrs->>fuel=in.(…)`.
//    ⚠️ ХӨДӨЛГӨХ КОД БАЙХГҮЙ — модуль нь attr-ийн түлхүүрээс ХАМААРАХГҮЙ ✓
//
// ХАМРАХ ХҮРЭЭ (4 давхарга — бүгд НЭГ эх сурвалж `lib/attrMultiFilter.mjs`):
//   ① `lib/attrMultiFilter.mjs` — цэвэр логик (normalize → parse → toggle →
//      шошго → URL → `in.()` мөр)
//   ② `lib/locationData.js`   — талбарын туг (`chips`/`multi`/`multiNoun`)
//      ба `getAttrFilters('auto')`-ийн гэрээ (7 шүүлт, дараалал хэвээр ✓)
//   ③ `lib/queries.js`        — PostgREST-ийн мөр ЯГ зөв үүсэх эсэх (ХУУЧИР builder)
//   ④ ЭХ ФАЙЛЫН ГЭРЭЭ: `components/HomeClient.jsx` (чипүүд, `setAttr([], …)`),
//      ⚠️ ФОРМ (`AddListingClient.jsx`) нь ХӨНДӨГДӨӨГҮЙ — зөвхөн хайлт ✓
//
// АЖИЛЛУУЛАХ:  npm run test:attrMulti
// ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (модуль нь импортгүй цэвэр ✓)
// ℹ️ `attrs->>color=in.(…)` нь БОДИТ Supabase дээр 2026-10-03-нд 200 OK
//    буцаасан (зайтай утга «Сувдан цагаан» ч зөв ✓) — энэ тест тэр гэрээг
//    статикаар түгждэг ✓
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  normalizeAttrValue, parseAttrList, isAttrListEmpty, countAttrValues,
  toggleAttrValue, attrListUrlValue, attrListFilterLabel,
  attrMultiFilterDescriptor, applyAttrMultiFilter,
} from '../lib/attrMultiFilter.mjs';
import { getAttrField, getAttrFilters, getAttrFields, pruneGatedAttrs, SECTIONS } from '../lib/locationData.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

/** PostgREST query builder-ийн ХУУЧИР — дуудсан арга бүрийг бүртгэнэ */
function fakeQuery() {
  const calls = [];
  const q = {
    calls,
    in(col, val) { calls.push(['in', col, val]); return q; },
  };
  return q;
}
/** `applyAttrMultiFilter`-ийг хуурамч builder дээр ажиллуулж, дуудлагыг буцаана */
const callsFor = (key, list) => {
  const q = fakeQuery();
  applyAttrMultiFilter(q, key, list);
  return q.calls;
};

const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/** Комментгүй ЦЭВЭР КОД — тайлбар мөрүүд нь шалгалтыг бохирдуулахгүй ✓ */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

console.log('\n🧪 Олон сонголттой ATTR шүүлт (lib/attrMultiFilter.mjs)\n');

// ---------- ① normalizeAttrValue ----------
t("normalizeAttrValue: ' Хар ' → 'Хар'; хүчингүй/объект → ''", () => {
  assert.equal(normalizeAttrValue(' Хар '), 'Хар');
  assert.equal(normalizeAttrValue('Сувдан  цагаан'), 'Сувдан цагаан');
  // ⚠️ Таслал нь URL-ийн тусгаарлагч тул утга дотроос ЗАЙ болно
  assert.equal(normalizeAttrValue('Хар,Цагаан'), 'Хар Цагаан');
  ['', null, undefined, {}, [], 5, true].forEach((v) => {
    const exp = typeof v === 'number' ? '5' : '';
    assert.equal(normalizeAttrValue(v), exp, `«${JSON.stringify(v)}» ✗`);
  });
  // ⚠️ ТОМ/ЖИЖИГ үсэг ХӨНДӨГДӨХГҮЙ (DB-д хадгалагдсан ЯГ тэр бичлэгээрээ харьцуулна)
  assert.equal(normalizeAttrValue('хар'), 'хар');
  assert.notEqual(normalizeAttrValue('хар'), normalizeAttrValue('Хар'));
});

// ---------- ② parseAttrList ----------
t("parseAttrList: 'Хар,Цагаан' · ['Хар','Цагаан'] · 'Хар' → массив", () => {
  assert.deepEqual(parseAttrList('Хар,Цагаан'), ['Хар', 'Цагаан']);
  assert.deepEqual(parseAttrList(['Хар', 'Цагаан']), ['Хар', 'Цагаан']);
  assert.deepEqual(parseAttrList('Хар'), ['Хар']);
  assert.deepEqual(parseAttrList('Сувдан цагаан,Хар'), ['Сувдан цагаан', 'Хар']);
  /**
   * ⚠️ URLSearchParams.getAll() нь `?attr_color=Хар,Цагаан`-ыг
   *    `['Хар,Цагаан']` (НЭГ элемент, дотор нь таслалттай) болгож буцаана —
   *    массив ДОТОРХ таслалт ч хуваагдах ЁСТОЙ, эс бөгөөс «Хар Цагаан»
   *    гэсэн нэг утга үүсч DB рүү `in.(Хар Цагаан)` явна ✗
   *    (CDP дээр баригдсан бодит алдаа — `scripts/cdp-notebook-specs.mjs` ✓)
   */
  assert.deepEqual(parseAttrList(['Хар,Цагаан']), ['Хар', 'Цагаан']);
  assert.deepEqual(parseAttrList(['Хар', 'Цагаан,Бусад']), ['Хар', 'Цагаан', 'Бусад']);
});

t('parseAttrList: давхцал/хоосон гишүүд ЧИМЭЭГҮЙ хасагдана', () => {
  assert.deepEqual(parseAttrList('Хар,Хар,Цагаан'), ['Хар', 'Цагаан']);
  assert.deepEqual(parseAttrList(' ,Хар,,'), ['Хар']);
  [[], '', null, undefined, ',,'].forEach((v) => {
    assert.deepEqual(parseAttrList(v), [], `«${JSON.stringify(v)}» ✗`);
  });
});

t('parseAttrList: ЭРЭМБЭ нь ИРСЭН дараалал (URL тогтвортой үлдэнэ ✓)', () => {
  // ⚠️ Сорт хийвэл хуваалцсан линк (`?attr_color=Хар,Цагаан`) нь URL-д
  //    өөр дараалал болж, `router.replace` дэмий давталт үүсгэнэ ✗
  assert.deepEqual(parseAttrList('Цагаан,Хар'), ['Цагаан', 'Хар']);

// ---------- ③ toggleAttrValue / countAttrValues / isAttrListEmpty ----------
t('toggleAttrValue: нэмэх/хасах (checkbox мэт) — шинэ массив ✓', () => {
  assert.deepEqual(toggleAttrValue([], 'Хар'), ['Хар']);
  assert.deepEqual(toggleAttrValue(['Хар'], 'Цагаан'), ['Хар', 'Цагаан']);
  assert.deepEqual(toggleAttrValue(['Хар', 'Цагаан'], 'Хар'), ['Цагаан']);
  assert.deepEqual(toggleAttrValue(['Хар'], 'Хар'), []);
  // ⚠️ Хүчингүй утга → одоогийн жагсаалт ХЭВЭЭР (шинэ хуулбар)
  const cur = ['Хар'];
  assert.deepEqual(toggleAttrValue(cur, ''), ['Хар']);
  assert.deepEqual(cur, ['Хар']);
  // ⚠️ Скаляр (хуучин URL) ч дэмжигдэнэ
  assert.deepEqual(toggleAttrValue('Хар', 'Цагаан'), ['Хар', 'Цагаан']);
});

t('countAttrValues / isAttrListEmpty зөв; `[]` нь «хоосон» ✓', () => {
  assert.equal(countAttrValues([]), 0);
  assert.equal(countAttrValues('Хар,Цагаан'), 2);
  assert.equal(countAttrValues(['Хар', '']), 1);
  [[], '', null, undefined, ',,', {}].forEach((v) => {
    assert.equal(isAttrListEmpty(v), true, `«${JSON.stringify(v)}» ✗`);
  });
  assert.equal(isAttrListEmpty(['Хар']), false);
});

// ---------- ④ attrListUrlValue — URL-д бичих ----------
t("attrListUrlValue: ['Хар','Цагаан'] → 'Хар,Цагаан' · [] → ''", () => {
  assert.equal(attrListUrlValue(['Хар', 'Цагаан']), 'Хар,Цагаан');
  assert.equal(attrListUrlValue([]), '');
  assert.equal(attrListUrlValue('Хар'), 'Хар');
});

t('🔁 ТОЙРОГ: URL → массив → URL (parseAttrList ↔ attrListUrlValue тогтвортой)', () => {
  ['Хар', 'Хар,Цагаан', 'Сувдан цагаан,Хар,Бусад'].forEach((raw) => {
    assert.equal(attrListUrlValue(parseAttrList(raw)), raw, `«${raw}» ✗`);
  });
});

// ---------- ⑤ attrListFilterLabel ----------
t("attrListFilterLabel: 1 → нэрээр · 2+ → «N өнгө» · [] → ''", () => {
  assert.equal(attrListFilterLabel([]), '');
  assert.equal(attrListFilterLabel('Хар'), 'Хар');
  assert.equal(attrListFilterLabel(['Хар', 'Цагаан'], 'өнгө'), '2 өнгө');
  assert.equal(attrListFilterLabel(['Хар', 'Цагаан', 'Бусад'], 'өнгө'), '3 өнгө');
  // ⚠️ Нэгж өгөөгүй бол «сонголт» (модуль ЦЭВЭР — талбарын сонголтыг мэдэхгүй ✓)
  assert.equal(attrListFilterLabel(['А', 'Б']), '2 сонголт');
});

// ---------- ⑥ attrMultiFilterDescriptor ----------
t("attrMultiFilterDescriptor: [] → none · ['Хар'] → in", () => {
  assert.deepEqual(attrMultiFilterDescriptor([]), { mode: 'none' });
  assert.deepEqual(attrMultiFilterDescriptor(''), { mode: 'none' });
  assert.deepEqual(attrMultiFilterDescriptor(['Хар']), { mode: 'in', values: ['Хар'] });
  assert.deepEqual(attrMultiFilterDescriptor('Хар,Цагаан'),
    { mode: 'in', values: ['Хар', 'Цагаан'] });
  // ⚠️ Давхцалтай линк (`?attr_color=Хар,Хар`) нэг утга болно ✓
  assert.deepEqual(attrMultiFilterDescriptor(['Хар', 'Хар']), { mode: 'in', values: ['Хар'] });
});

// ---------- ⑦ applyAttrMultiFilter — PostgREST мөр ----------
t("🎯 applyAttrMultiFilter: `in('attrs->>color', […])` ЯГ нэг удаа дуудагдана", () => {
  assert.deepEqual(callsFor('color', ['Хар']), [['in', 'attrs->>color', ['Хар']]]);
  assert.deepEqual(callsFor('color', ['Хар', 'Цагаан']),
    [['in', 'attrs->>color', ['Хар', 'Цагаан']]]);
  // ⚠️ Хоосон үед шүүлт ХИЙХГҮЙ (mode: 'none') — «Бүх зар» ✓
  [[], '', null, undefined].forEach((v) => {
    assert.deepEqual(callsFor('color', v), [], `«${JSON.stringify(v)}» ✗`);
  });
  // ⚠️ Бусад түлхүүр (`cpu`) ч ижил дүрмээр (модуль ерөнхий ✓)
  assert.deepEqual(callsFor('cpu', ['Intel Core i5']), [['in', 'attrs->>cpu', ['Intel Core i5']]]);
  // ⚠️ `->>` (текст) — `cs` (containment) БИШ: `attrs.color` нь скаляр ✓
  assert.equal(callsFor('color', ['Хар'])[0][1].includes('->>'), true);
});

  assert.deepEqual(toggleAttrValue([], 'Цагаан').concat('Хар'), ['Цагаан', 'Хар']);
});

t('parseAttrList: ШИНЭ массив буцаана (эх массивыг өөрчлөхгүй ✓)', () => {
  const src = ['Хар', 'Цагаан'];
  const out = parseAttrList(src);
  assert.deepEqual(src, ['Хар', 'Цагаан']);
  assert.notEqual(out, src);
});

// ---------- ⑧ lib/locationData.js — талбарын ГЭРЭЭ ----------
t("🎨 auto → color: `chips` + `multi` + `multiNoun` тугтай, `type: 'select'` хэвээр", () => {
  const f = getAttrField('auto', 'color');
  assert.equal(f.type, 'select');       // ⚠️ форм нь `<select>` хэвээр ✓
  assert.equal(f.chips, true);          // sidebar нь чип ✓
  assert.equal(f.multi, true);          // олон сонголт ✓
  assert.equal(f.multiNoun, 'өнгө');    // «3 өнгө» шошго ✓
  assert.equal(f.label, 'Өнгө');
  assert.equal(f.icon, '🎨');
  assert.equal(f.options.length, 12);
  // ⛔ Форм дээр чип БОЛОХГҮЙ — `formChips` туг ЗОРИУДАА байхгүй
  assert.ok(!f.formChips, 'форм дээр чип болжээ ✗ (зөвхөн хайлт ✓)');
  // ⚠️ Талбарууд (форм) ба шүүлтүүд (sidebar) нь ИЖИЛ Объект — нэг эх сурвалж ✓
  assert.equal(getAttrFields('auto').find((x) => x.key === 'color'), f);
});

t("🔒 Олон сонголттой талбарууд нь ЯГ ТОДОРХОЙ жагсаалт (🚗 auto: color·transmission·fuel + ✅ 8 хэсгийн condition)", () => {
  const multiKeys = [];
  SECTIONS.forEach((s) => {
    getAttrFields(s.value).forEach((f) => {
      if (f.multi) multiKeys.push(`${s.value}.${f.key}`);
      // ⚠️ `multi` нь ЗААВАЛ `chips`-тай хамт (UI болон утгын төрөл зөрөхгүй ✓)
      if (f.multi) assert.equal(f.chips, true, `${s.value}.${f.key} — multi ч chips БИЙ ✗`);
      // ⚠️ Олон сонголттой талбар нь ЗААВАЛ sidebar-ийн шүүлтэд Ч байх ЁСТОЙ
      //    (эс бөгөөс чипийн UI нь ХЭЗЭЭ Ч харагдахгүй «үхсэн туг» болно ✗)
      if (f.multi) assert.ok((s.attrFilters || []).includes(f.key),
        `${s.value}.${f.key} — multi ч attrFilters-д БАЙХГҮЙ ✗`);
    });
  });
  assert.deepEqual(multiKeys, [
    // 🚗 авто: 3 чип (🎨 өнгө · ⚙️ хайрцаг (22) · ⛽ түлш (22))
    'auto.color', 'auto.transmission', 'auto.fuel',
    // ✅ 8 хэсгийн «Шинэ / Шинэвтэр / Хуучин» (21)
    'computers.condition', 'furniture.condition', 'home.condition', 'electric.condition',
    'construction.condition', 'equipment.condition', 'travel.condition', 'hobby.condition',
  ], `multi талбарууд: ${multiKeys.join(', ')}`);
});

// ---------- ⑧в 🆕 2026-10-03 (22): 🔀 ⛽ «Хурдны хайрцаг» + «Түлш» ----------
t("🔀⛽ (22) transmission & fuel: `chips` + `multi` + `multiNoun`, форм `<select>` хэвээр", () => {
  const cases = [
    ['transmission', 'Хурдны хайрцаг', '⚙️', ['Автомат', 'Механик'], 'хайрцаг'],
    ['fuel', 'Түлш', '⛽', ['Бензин', 'Дизель', 'Хайбрид', 'Цахилгаан', 'Хий', 'Бусад'], 'түлш'],
  ];
  cases.forEach(([key, label, icon, options, noun]) => {
    const f = getAttrField('auto', key);
    assert.equal(f.type, 'select');     // ⚠️ форм нь `<select>` хэвээр ✓
    assert.equal(f.chips, true, `${key}: sidebar чип болоогүй ✗`);
    assert.equal(f.multi, true, `${key}: олон сонголт болоогүй ✗`);
    assert.equal(f.multiNoun, noun, `${key}: «N ${noun}» шошго ✗`);
    assert.equal(f.label, label, `${key}: шошго`);
    assert.equal(f.icon, icon, `${key}: icon`);
    assert.deepEqual(f.options, options, `${key}: сонголт`);
    // ⛔ Форм дээр чип БОЛОХГҮЙ — `formChips` туг ЗОРИУДАА БАЙХГҮЙ ✓
    assert.ok(!f.formChips, `${key}: форм дээр чип болжээ ✗ (зөвхөн хайлт ✓)`);
    // ⚠️ Шүүлт (sidebar) нь ЯГ ТЭР объект (нэг эх сурвалж ✓)
    assert.equal(getAttrFilters('auto').find((x) => x.key === key), f);
  });
});

t("🎯 applyAttrMultiFilter: transmission/fuel ч ижил дүрэм (`in.()` · скаляр ХЭВЭЭР ✓)", () => {
  // ⚠️ `->>` (текст) — `attrs.transmission`/`attrs.fuel` нь СКАЛЯР ТЕКСТ ✓
  assert.deepEqual(callsFor('fuel', ['Хайбрид', 'Бензин']),
    [['in', 'attrs->>fuel', ['Хайбрид', 'Бензин']]]);
  // ⚠️ ХУУЧИН нэг утгатай линк (`?attr_fuel=Хайбрид`) ч ижил зам (нэг элемент ✓)
  assert.deepEqual(callsFor('fuel', 'Хайбрид'), [['in', 'attrs->>fuel', ['Хайбрид']]]);
  assert.deepEqual(callsFor('transmission', ['Автомат', 'Механик']),
    [['in', 'attrs->>transmission', ['Автомат', 'Механик']]]);
  assert.deepEqual(callsFor('transmission', []), []);
});

// ---------- ⑧б 🆕 2026-10-03 (21): ✅ «Шинэ / Шинэвтэр / Хуучин» ----------
t("✅ condition (8 хэсэг): `chips` + `multi` + `multiNoun: 'төлөв'`, форм `<select>` хэвээр", () => {
  const sections = SECTIONS.filter((s) => s.attrFields.some((f) => f.key === 'condition'));
  assert.deepEqual(sections.map((s) => s.value), [
    'computers', 'furniture', 'home', 'electric', 'construction', 'equipment', 'travel', 'hobby',
  ], `condition талбартай хэсгүүд: ${sections.map((s) => s.value).join(', ')}`);
  sections.forEach((s) => {
    const f = getAttrField(s.value, 'condition');
    assert.equal(f.type, 'select');           // ⚠️ форм нь `<select>` хэвээр ✓
    assert.equal(f.chips, true, `${s.value}: sidebar чип болоогүй ✗`);
    assert.equal(f.multi, true, `${s.value}: олон сонголт болоогүй ✗`);
    assert.equal(f.multiNoun, 'төлөв', `${s.value}: «N төлөв» шошго ✗`);
    assert.equal(f.label, 'Шинэ / Шинэвтэр / Хуучин');
    assert.equal(f.icon, '✅');
    assert.deepEqual(f.options, ['Шинэ', 'Шинэвтэр', 'Хуучин']);
    // ⛔ Форм дээр чип БОЛОХГҮЙ — `formChips` туг ЗОРИУДАА БАЙХГҮЙ ✓
    assert.ok(!f.formChips, `${s.value}: форм дээр чип болжээ ✗ (зөвхөн хайлт ✓)`);
    // ⚠️ Шүүлт (sidebar) нь ЯГ ТЭР объект (нэг эх сурвалж ✓)
    assert.equal(getAttrFilters(s.value).find((x) => x.key === 'condition'), f);
    // ⚠️ Дэд төрөл дамжуулахад ч ХАСАГДАХГҮЙ (`onlySubtypes`/`filterSubtypes` БАЙХГҮЙ ✓)
    assert.ok(getAttrFilters(s.value, 'ямар ч дэд төрөл').some((x) => x.key === 'condition'),
      `${s.value}: дэд төрөл дээр condition хасагдсан ✗`);
  });
});

t("🎯 applyAttrMultiFilter: condition ч ижил дүрэм (`attrs->>condition=in.(…)`)", () => {
  // ⚠️ `->>` (текст) — `attrs.condition` нь СКАЛЯР (`payment_terms` шиг массив БИШ ✓)
  assert.deepEqual(callsFor('condition', ['Шинэ', 'Хуучин']),
    [['in', 'attrs->>condition', ['Шинэ', 'Хуучин']]]);
  // ⚠️ ХУУЧИН нэг утгатай линк (`?attr_condition=Шинэ`) ч ижил зам (нэг элемент ✓)
  assert.deepEqual(callsFor('condition', 'Шинэ'), [['in', 'attrs->>condition', ['Шинэ']]]);
  assert.deepEqual(callsFor('condition', []), []);
  assert.deepEqual(callsFor('condition', ['Шинэ', 'Шинэ']), [['in', 'attrs->>condition', ['Шинэ']]]);
});

t('🧹 pruneGatedAttrs: condition (бүх дэд төрөлд харагдана) ХЭЗЭЭ Ч хасагдахгүй', () => {
  const attrs = { condition: ['Шинэ', 'Хуучин'], cpu: ['Intel Core i5'] };
  // Mouse-д 📺/⚙️/🧠/💾 хасагдана — ✅ condition МАССИВ ч ХЭВЭЭР ✓
  const out = pruneGatedAttrs('computers', 'Mouse', attrs);
  assert.deepEqual(Object.keys(out), ['condition']);
  assert.deepEqual(out.condition, ['Шинэ', 'Хуучин']);
  // ⚠️ Хасах зүйл БАЙХГҮЙ бол ИЖИЛ объектаа буцаана (шинэ объект үүсгэхгүй ✓)
  assert.equal(pruneGatedAttrs('home', 'Буйдан, кресло', attrs), attrs);
  // ⚠️ Дэд төрөл СОНГООГҮЙ үед ч (ж: `?section=computers`) condition ҮЛДЭНЭ ✓
  assert.deepEqual(pruneGatedAttrs('computers', '', attrs), { condition: ['Шинэ', 'Хуучин'] });
});

t("🚗 `getAttrFilters('auto')` — 7 шүүлт, дараалал ХЭВЭЭР (color нь 3 дахь ✓)", () => {
  const fs2 = getAttrFilters('auto');
  assert.deepEqual(fs2.map((f) => f.key),
    ['brand', 'model', 'color', 'year', 'importYear', 'transmission', 'fuel']);
  // ⚠️ color нь чип болов ч `attrFilters`-д ХЭВЭЭР байх ёстой (хасагдахгүй ✓)
  const color = fs2.find((f) => f.key === 'color');
  assert.equal(color.multi, true);
  assert.equal(color.chips, true);
  // ⚠️ Чип талбарууд нь `<select>`-ийн `options`-той хэвээр (чипүүд түүнээс зурагдана ✓)
  assert.equal(Array.isArray(color.options) && color.options.length, 12);
});

// ---------- ⑨ lib/queries.js — DB шүүлт ----------
t('🗄 queries.js: массив утгыг `applyAttrMultiFilter`-ээр шүүнэ (import + дуудлага ✓)', () => {
  const src = codeOnly(readSrc('lib/queries.js'));
  assert.match(src, /import \{ applyAttrMultiFilter \} from '\.\/attrMultiFilter\.mjs'/);
  // ⚠️ Массивыг СКАЛЯР гэж үзэх зам руу оруулахгүй — `Array.isArray` шалгалт
  //    нь `String(v)`/range/searchable шалгалтуудын ӨМНӨ байх ЁСТОЙ ✓
  assert.match(src, /if \(Array\.isArray\(v\)\) \{ applyAttrMultiFilter\(query, k, v\); return; \}/);
  const atArray = src.indexOf('Array.isArray(v)');
  const atRange = src.indexOf('const rangeKey');
  assert.ok(atArray > 0 && atRange > 0 && atArray < atRange,
    'массивын шалгалт range-ийн дараа байна ✗');
});

// ---------- ⑩ components/HomeClient.jsx — UI-ийн гэрээ ----------
t('🖥 HomeClient: чипүүд `toggleAttrMulti`-ээр (олон) + `setAttr(key, [])` цэвэрлэгээ', () => {
  const src = codeOnly(readSrc('components/HomeClient.jsx'));
  assert.match(src, /import \{\s*parseAttrList, attrListUrlValue, attrListFilterLabel, toggleAttrValue, countAttrValues,\s*\} from '\.\.\/lib\/attrMultiFilter\.mjs'/);
  assert.match(src, /const toggleAttrMulti = \(key, value\) =>/);
  assert.match(src, /onClick=\{\(\) => toggleAttrMulti\(f\.key, o\)\}/);
  // ⚠️ Хоослох утга нь `[]` — `''` биш (эс бөгөөс `Array.isArray` шалгалт унана ✗)
  assert.match(src, /onClick=\{\(\) => clearAttrMulti\(f\.key\)\}/);
  assert.match(src, /const clearAttrMulti = \(key\) => setAttr\(key, \[\]\)/);
  // ⚠️ `attrValue` (скаляр getter) нь массивыг `''` болгож буцаана — range/
  //    searchable/text талбарууд руу массив урсахгүй ✓
  assert.match(src, /return Array\.isArray\(v\) \? '' : \(v \|\| ''\)/);
  // ⚠️ URL-д массив нь `attrListUrlValue`-ээр бичигдэнэ (таслалаар ✓)
  assert.match(src, /params\.set\(`attr_\$\{k\}`, attrListUrlValue\(v\)\)/);
  // ⚠️ Идэвхтэй шүүлтийн чип нь товчилсон шошго (`multiNoun` — «3 өнгө» ✓)
  assert.match(src, /attrListFilterLabel\(v, \(field && field\.multiNoun\) \|\| 'сонголт'\)/);
  // ⚠️ CDP-ийн дэгээ хэвээр (1 талбар = 1 `data-attr-filter`) + шинэ `data-attr-multi`
  assert.match(src, /data-attr-filter=\{f\.key\}/);
  assert.match(src, /data-attr-multi="true"/);
});

t('⛔ ФОРМ (`AddListingClient.jsx`) ХӨНДӨГДӨӨГҮЙ — өнгө нэг утгатай хэвээр', () => {
  const src = codeOnly(readSrc('components/AddListingClient.jsx'));
  // ⛔ Олон сонголттой шүүлтийн код формо дээр ОРООГҮЙ
  assert.ok(!/attrMultiFilter/.test(src), 'форм дээр олон сонголттой шүүлт оржээ ✗');
  assert.ok(!/attrListUrlValue/.test(src), 'форм дээр URL-ийн туслах оржээ ✗');
  /**
   * 🆕 2026-10-03 (19): ЧИП салбарын нөхцөл нь ЗӨВХӨН `formChips` —
   * ⚠️ Урьд нь `f.formChips || f.chips` байсан тул sidebar-ийн `chips` туг
   *    (ж: 🎨 «Өнгө») нь ФОРМЫН чипийг ч асааж, «Өнгө» нь 3-р алхамд `<select>`
   *    биш чип болж хувирах байв ✗ (формд олон утга хадгалах боломжгүй тул
   *    зөвхөн ХАЙЛТ нь олон сонголттой байх ЁСТОЙ ✓)
   */
  assert.match(src, /f\.formChips \? \(/);
  assert.ok(!/f\.formChips \|\| f\.chips/.test(src), '`|| f.chips` хэвээр ✗');
  // Мобайлд «2 БАГАНАТ ШУУД ЖАГСААЛТ»-ын шалгалт ч зөвхөн `formChips`-ыг харна
  assert.match(src,
    /const isAttrPick = \(f\) => f\.type === 'select' && !f\.searchable && !f\.optionsFrom\s+&& !f\.formChips;/);
});

// ---------- ⑪ package.json — скриптүүд ----------
t('📦 package.json: `test:attrMulti` бүртгэгдсэн', () => {
  const pkg = JSON.parse(readSrc('package.json'));
  assert.equal(pkg.scripts['test:attrMulti'], 'node scripts/test-attr-multi.mjs');
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);

