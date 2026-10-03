// ============================================================
// test-payments.mjs — «ТӨЛБӨРИЙН НӨХЦӨЛ» шүүлт/формын тест (2026-10-03)
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Төлбөрийн нөхцөлийг Үл хөдлөх зарна, Автомашин
// зарна гэсэн дээр ХАЙХ хэсэгт гардаг болгоё. Зар оруулах үед хэрэглэгч
// үүнийг сонгож өгөх ёстой. Олон сонголт хийж байгаа боломж…»
//   ⇒ unegui.mn-ийн «Төлбөрийн нөхцөл» (Хувь лизингээр · Бэлэн төлөлтөөр ·
//     Банкны зээлээр · Бартер сонирхоно) — ОЛНООР сонгогдоно:
//     🆕 (16) ХАЙЛТЫН sidebar нь «Өрөөний тоо» шиг ЧИП (chip-toggle),
//     ЗАР ОРУУЛАХ форм нь (6)-ийн ☑ checkbox — хоёулаа нэг модулиас ✓
//
// ХАМРАХ ХҮРЭЭ (4 давхарга — бүгд НЭГ эх сурвалж `lib/paymentFilter.mjs`):
//   ① `lib/paymentFilter.mjs` — цэвэр логик (normalize/parse/toggle/шошго/
//      `cs`-ийн jsonb мөр/`applyPaymentFilter`)
//   ② `lib/queries.js`    — PostgREST-ийн мөр яг зөв үүсэх эсэх (ХУУЧИР builder)
//   ③ `lib/locationData.js` — зарын дэлгэрэнгүй хуудасны мөр (`getAttrRows`)
//   ④ ЭХ ФАЙЛЫН ГЭРЭЭ: `HomeClient.jsx` (хайлтын чипүүд), `AddListingClient.jsx`
//      (зор оруулах форм) нь модулийг хэрэглэж, хоосон утга нь `''` БИШ `[]`
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ (2 эрсдэл):
//   ① ОЛОН утга нь PostgREST-ийн `.or()` МӨРӨНД таслалтаар явдаг тул
//      `{"payment_terms":["a","b"]}` гэж бичвэл PostgREST мөрийг ХОЁР хувааж
//      `22P02 invalid input syntax for type json` алдаа өгнө ✗ (бодит DB дээр
//      туршиж батлав) ⇒ зөвхөн НЭГ ЭЛЕМЕНТТЭЙ массив нэг нөхцөл болно ✓
//   ② `attrs` нь jsonb МАССИВ тул `->>payment_terms` (текст) харьцуулалт
//      ажиллахгүй ✗ ⇒ containment `attrs=cs.{"payment_terms":["lease"]}` л зөв ✓
//      Энэ тест хоёр дүрмийг БАРИУЛНА — эвдэрвэл хайлт нь «Бүх зар» буцаана ✗
//
// АЖИЛЛУУЛАХ:  npm run test:payments
// ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (модуль нь импортгүй цэвэр ✓)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  PAYMENT_ATTR_KEY, PAYMENT_VALUES, PAYMENT_OPTIONS, PAYMENT_SECTIONS,
  PAYMENT_LEASE, PAYMENT_CASH, PAYMENT_LOAN, PAYMENT_BARTER,
  applyPaymentFilter, countPayments, hasPaymentTerms, isPaymentValue,
  isPaymentsEmpty, normalizePaymentValue, parsePaymentList, paymentContainsJson,
  paymentOptionIcon, paymentOptionLabel, paymentsFilterDescriptor,
  paymentsFilterLabel, paymentsUrlValue, paymentTermsForAttrs, togglePaymentValue,
} from '../lib/paymentFilter.mjs';
import { getAttrRows, SECTIONS } from '../lib/locationData.js';

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
 * ⚠️ `lib/queries.js`-ийн бодит builder-той ИЖИЛ гэрээтэй: `.contains()`,
 *    `.or()` нь дахин `this`-ээ буцаана ✓
 */
function fakeQuery() {
  const calls = [];
  const q = {
    calls,
    contains(col, val) { calls.push(['contains', col, val]); return q; },
    or(str) { calls.push(['or', str]); return q; },
  };
  return q;
}
/** `applyPaymentFilter`-ийг хуурамч builder дээр ажиллуулж, дуудлагыг буцаана */
const callsFor = (list) => {
  const q = fakeQuery();
  applyPaymentFilter(q, list);
  return q.calls;
};

const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Комментгүй ЦЭВЭР КОД — ХАСАГДСАН/ТАЙЛБАР мөрүүд нь зүй ёсны тул
 *  шалгалтыг зөвхөн кодын мөрүүд дээр хийнэ (хуурамч улаан гарахгүй ✓) */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

console.log('\n🧪 Төлбөрийн нөхцөл — олон сонголттой шүүлт (lib/paymentFilter.mjs)\n');

// ---------- ① hasPaymentTerms — аль хэсэгт байх вэ ----------
t('hasPaymentTerms: ЗӨВХӨН real-estate ба auto (бусад хэсэгт false)', () => {
  assert.equal(hasPaymentTerms('real-estate'), true);
  assert.equal(hasPaymentTerms('auto'), true);
  PAYMENT_SECTIONS.forEach((s) => assert.equal(hasPaymentTerms(s), true, s));
  // ⚠️ «Бүх зар» (`all`/`''`/`null`) — бүх хэсэг холилдсон тул false ✓
  ['jobs', 'computers', 'goods', 'services', 'all', '', null, undefined, 'АЖИЛ']
    .forEach((s) => assert.equal(hasPaymentTerms(s), false, `«${s}» ✗`));
  // ⚠️ `SECTIONS`-ийн 4 хэсэгт төлбөрийн нөхцөл БАЙХГҮЙ (регресс)
  SECTIONS.map((x) => x.value).forEach((v) => {
    if (v === 'real-estate' || v === 'auto') return;
    assert.equal(hasPaymentTerms(v), false, v);
  });
});

// ---------- ② isPaymentValue / normalizePaymentValue ----------
t('normalizePaymentValue: « LEASE » → lease; хүчингүй → \'\'', () => {
  ['lease', ' LEASE ', 'Lease'].forEach((v) => assert.equal(normalizePaymentValue(v), 'lease', `«${v}» ✗`));
  ['abc', '', null, undefined, 5, '5', {}].forEach((v) => {
    assert.equal(normalizePaymentValue(v), '', `«${JSON.stringify(v)}» ✗`);
  });
  PAYMENT_VALUES.forEach((v) => assert.equal(isPaymentValue(v), true, v));
  // ⚠️ `' LEASE '` нь trim + lowercase хийгдэж ХҮЧИНТЭЙ болно (гараар
  //    бичсэн линк `?payment=LEASE` ✓) — зөвхөн ТАНИГДАХГҮЙ кодууд false
  assert.equal(isPaymentValue(' LEASE '), true);
  ['lease2', 'Бэлэн', 'lease cash', '', null].forEach((v) => assert.equal(isPaymentValue(v), false, `«${v}» ✗`));
  // ⚠️ Утгууд нь КОД (ASCII) — кирилл/таслалт/зай агуулахгүй (URL/jsonb ✓)
  PAYMENT_VALUES.forEach((v) => assert.match(v, /^[a-z]+$/, `«${v}» код биш ✗`));
});

// ---------- ③ parsePaymentList ----------
t("parsePaymentList: 'cash,lease' · ['lease','cash'] → ['lease','cash'] ТОГТВОРТОЙ эрэмбэ", () => {
  assert.deepEqual(parsePaymentList('cash,lease'), ['lease', 'cash']);
  assert.deepEqual(parsePaymentList(['cash', 'lease']), ['lease', 'cash']);
  assert.deepEqual(parsePaymentList('lease'), [PAYMENT_LEASE]);
  assert.deepEqual(parsePaymentList(PAYMENT_BARTER), [PAYMENT_BARTER]);
});

t('parsePaymentList: давхцал/хүчингүй/хоосон гишүүд ЧИМЭЭГҮЙ хасагдана', () => {
  assert.deepEqual(parsePaymentList('lease,lease,loan'), ['lease', 'loan']);
  assert.deepEqual(parsePaymentList('abc,lease,,0'), ['lease']);
  assert.deepEqual(parsePaymentList(''), []);
  assert.deepEqual(parsePaymentList(',,'), []);
  assert.deepEqual(parsePaymentList(null), []);
  assert.deepEqual(parsePaymentList(undefined), []);
  assert.deepEqual(parsePaymentList({}), []);
});

t('parsePaymentList: шинэ массив буцаана (эх массивыг өөрчлөхгүй ✓)', () => {
  const src = ['cash', 'lease'];
  const out = parsePaymentList(src);
  assert.deepEqual(src, ['cash', 'lease']);
  assert.notEqual(out, src);
});

// ---------- ④ paymentsUrlValue — URL-д бичих ----------
t("paymentsUrlValue: ['cash','lease'] → 'lease,cash' · [] → '' · 'lease' → 'lease'", () => {
  assert.equal(paymentsUrlValue(['cash', 'lease']), 'lease,cash');
  assert.equal(paymentsUrlValue([]), '');
  assert.equal(paymentsUrlValue('lease'), 'lease');
});

t('🔁 ТОЙРОГ: URL → массив → URL (parsePaymentList ↔ paymentsUrlValue тогтвортой)', () => {
  ['lease', 'lease,cash', 'lease,cash,loan,barter', 'cash,barter'].forEach((raw) => {
    assert.equal(paymentsUrlValue(parsePaymentList(raw)), raw, `«${raw}» ✗`);
  });
});

t('🔁 ДАВХЦАЛТГҮЙ: ижил утгууд ЗӨВХӨН НЭГ удаа (URL богино, тогтвортой ✓)', () => {
  assert.equal(paymentsUrlValue('lease,cash,lease'), 'lease,cash');
  assert.equal(countPayments('lease,cash,lease'), 2);
});

// ---------- ⑤ countPayments / isPaymentsEmpty ----------
t("countPayments: [] → 0 · 'lease,cash' → 2; isPaymentsEmpty зөв", () => {
  assert.equal(countPayments([]), 0);
  assert.equal(countPayments('lease,cash'), 2);
  assert.equal(countPayments(['barter', 'abc']), 1);
  [[], '', null, undefined, 'abc', ',,', {}].forEach((v) => {
    assert.equal(isPaymentsEmpty(v), true, `«${JSON.stringify(v)}» ✗`);
  });
  assert.equal(isPaymentsEmpty([PAYMENT_LOAN]), false);
});

// ---------- ⑥ Шошго / icon ----------
t("paymentOptionLabel: код → МОНГОЛ шошго (unegui.mn-ийн нэршил ЯГ ИЖИЛ)", () => {
  assert.equal(paymentOptionLabel('lease'), 'Хувь лизингээр');
  assert.equal(paymentOptionLabel('cash'), 'Бэлэн төлөлтөөр');
  assert.equal(paymentOptionLabel('loan'), 'Банкны зээлээр');
  assert.equal(paymentOptionLabel('barter'), 'Бартер сонирхоно');
  // ⚠️ Том үсэг/зай ч ажиллана (гараар бичсэн линк ✓)
  assert.equal(paymentOptionLabel(' LEASE '), 'Хувь лизингээр');
  assert.equal(paymentOptionLabel('abc'), '');
});

t('paymentOptionIcon: код → icon (💳/💵/🏦/🔄); хүчингүй бол \'\'', () => {
  assert.equal(paymentOptionIcon('lease'), '💳');
  assert.equal(paymentOptionIcon('cash'), '💵');
  assert.equal(paymentOptionIcon('loan'), '🏦');
  assert.equal(paymentOptionIcon('barter'), '🔄');
  assert.equal(paymentOptionIcon('abc'), '');
  // ⚠️ PAYMENT_OPTIONS нь UI-ийн ЦОРЫН ГАНЦ эх сурвалж (sidebar + форм)
  assert.deepEqual(PAYMENT_OPTIONS.map((o) => o.value), PAYMENT_VALUES);
  PAYMENT_OPTIONS.forEach((o) => assert.ok(o.label && o.icon, `${o.value} шошго/icon дутуу ✗`));
});

t("paymentsFilterLabel: ['lease','cash'] → 'Хувь лизингээр, Бэлэн төлөлтөөр' · [] → ''", () => {
  assert.equal(paymentsFilterLabel([]), '');
  assert.equal(paymentsFilterLabel('lease'), 'Хувь лизингээр');
  assert.equal(paymentsFilterLabel(['cash', 'lease']), 'Хувь лизингээр, Бэлэн төлөлтөөр');
  assert.equal(paymentsFilterLabel('lease,cash,loan,barter'),
    'Хувь лизингээр, Бэлэн төлөлтөөр, Банкны зээлээр, Бартер сонирхоно');
});

// ---------- ⑦ togglePaymentValue — checkbox мэт нэмэх/хасах ----------
t("togglePaymentValue: хоосон + 'lease' → ['lease']; дахин 'lease' → [] (хасагдана)", () => {
  assert.deepEqual(togglePaymentValue([], 'lease'), ['lease']);
  assert.deepEqual(togglePaymentValue(['lease'], 'lease'), []);
  assert.deepEqual(togglePaymentValue([], PAYMENT_BARTER), ['barter']);
});

t('togglePaymentValue: олон утга НЭГ МЭРГЭЖЛИЙН дарааллаар (cash + lease → lease, cash)', () => {
  assert.deepEqual(togglePaymentValue(['cash'], 'lease'), ['lease', 'cash']);
  assert.deepEqual(togglePaymentValue(['lease', 'barter'], 'cash'), ['lease', 'cash', 'barter']);
});

t('togglePaymentValue: хүчингүй утга → жагсаалт ХЭВЭЭР, гэхдээ ШИНЭ массив', () => {
  const out = togglePaymentValue(['lease'], 'abc');
  assert.deepEqual(out, ['lease']);
  assert.notEqual(out, ['lease']); // ⚠️ React state-д ЧУХАЛ (шинэ reference ✓)
});

t('togglePaymentValue: скаляр төлвөөс ч зөв (хуучин/линк утга)', () => {
  assert.deepEqual(togglePaymentValue('lease', 'cash'), ['lease', 'cash']);
  assert.deepEqual(togglePaymentValue('lease', 'lease'), []);
});

// ---------- ⑧ paymentsFilterDescriptor — DB дүрэм ----------
t("paymentsFilterDescriptor: [] → none · ['lease'] → one · ['lease','cash'] → any (OR)", () => {
  assert.deepEqual(paymentsFilterDescriptor([]), { mode: 'none' });
  assert.deepEqual(paymentsFilterDescriptor('abc'), { mode: 'none' });
  assert.deepEqual(paymentsFilterDescriptor(['lease']), { mode: 'one', values: ['lease'] });
  assert.deepEqual(paymentsFilterDescriptor(['cash', 'lease']),
    { mode: 'any', values: ['lease', 'cash'] });
});

// ---------- ⑨ paymentContainsJson — `cs`-ийн jsonb мөр ----------
t(`paymentContainsJson: 'lease' → {"${PAYMENT_ATTR_KEY}":["lease"]} (НЭГ элемент ✓)`, () => {
  assert.equal(paymentContainsJson('lease'), '{"payment_terms":["lease"]}');
  assert.equal(PAYMENT_ATTR_KEY, 'payment_terms');
});

t('🚨 ХАМГИЙН ЧУХАЛ: `cs`-ийн мөр дотор ТАСЛАЛ БАЙХГҮЙ (`.or()`-ийг эвдэхгүй ✓)', () => {
  PAYMENT_VALUES.forEach((v) => {
    const json = paymentContainsJson(v);
    // ⚠️ Таслал нь `.or()`-ийн НӨХЦӨЛИЙН ТУСГААРЛАГЧ: `["a","b"]` гэж бичвэл
    //    PostgREST мөрийг хоёр хувааж `22P02` алдаа өгнө ✗
    assert.equal(json.split(',').length, 1, `«${v}» дотор таслал байна ✗`);
    assert.deepEqual(JSON.parse(json), { [PAYMENT_ATTR_KEY]: [v] });
  });
});

// ---------- ⑩ applyPaymentFilter — PostgREST builder ----------
t('applyPaymentFilter([]) → builder-т ОГТ хүрэхгүй (шүүлтгүй = «Бүх зар» ✓)', () => {
  assert.deepEqual(callsFor([]), []);
  assert.deepEqual(callsFor('abc'), []);
  assert.deepEqual(callsFor(null), []);
});

t("applyPaymentFilter(['lease']) → contains('attrs', {payment_terms:['lease']}) (нэг утга)", () => {
  assert.deepEqual(callsFor(['lease']),
    [['contains', 'attrs', { payment_terms: ['lease'] }]]);
});

t("applyPaymentFilter(['lease','cash']) → or('attrs.cs.{\"payment_terms\":[\"lease\"]},attrs.cs.{\"payment_terms\":[\"cash\"]}')", () => {
  assert.deepEqual(callsFor(['cash', 'lease']), [[
    'or',
    'attrs.cs.{"payment_terms":["lease"]},attrs.cs.{"payment_terms":["cash"]}',
  ]]);
});

t('🚨 ОЛОН утга нь ЯГ N нөхцөл (таслалаар ХУВААГДАХГҮЙ ✓) — `22P02` алдаа гарахгүй', () => {
  const [[, str]] = callsFor(PAYMENT_VALUES);
  assert.equal(str, PAYMENT_VALUES.map((v) => `attrs.cs.{"payment_terms":["${v}"]}`).join(','));
  // ⚠️ Нөхцөлийн тоо = сонгосон утгын тоо (массив ДОТОР таслал байхгүй гэдгээр)
  assert.equal(str.match(/attrs\.cs\./g).length, 4);
  PAYMENT_VALUES.forEach((v) => assert.ok(str.includes(`["${v}"]`), `${v} алга ✗`));
});

t('⛓ builder нь ГИНЖИН дуудагдана (`.contains()`/`.or()` нь `this`-ээ буцаана ✓)', () => {
  const q = fakeQuery();
  assert.equal(applyPaymentFilter(q, ['lease']), q);
  assert.equal(applyPaymentFilter(q, ['lease', 'cash']), q);
});

// ---------- ⑪ paymentTermsForAttrs — хадгалах дүрэм ----------
t('paymentTermsForAttrs: дэмжигдэх хэсэг + утга байвал МАССИВ (эрэмбэтэй, давхцалгүй)', () => {
  assert.deepEqual(paymentTermsForAttrs('real-estate', ['cash', 'lease']), ['lease', 'cash']);
  assert.deepEqual(paymentTermsForAttrs('auto', 'lease'), ['lease']);
});

t('paymentTermsForAttrs: хоосон/дэмжигдэхгүй хэсэг → null (түлхүүр УСТАНА ✓)', () => {
  assert.equal(paymentTermsForAttrs('real-estate', []), null);
  assert.equal(paymentTermsForAttrs('real-estate', 'abc'), null);
  assert.equal(paymentTermsForAttrs('real-estate', null), null);
  // ⚠️ «Ажил»/«Компьютер»/«Бараа»/«Үйлчилгээ» + «Бүх зар» → null (хог үлдэхгүй ✓)
  ['jobs', 'computers', 'goods', 'services', 'all', ''].forEach((s) => {
    assert.equal(paymentTermsForAttrs(s, ['lease']), null, `«${s}» ✗`);
  });
});

// ---------- ⑫ getAttrRows — зарын дэлгэрэнгүй хуудас ----------
t('📋 getAttrRows(real-estate): 💳 мөр нэмэгдэнэ (шошго монгол, icon, БАЙРЛАЛ хамгийн дор)', () => {
  const rows = getAttrRows('real-estate', { payment_terms: ['lease'] });
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], {
    key: PAYMENT_ATTR_KEY, label: 'Төлбөрийн нөхцөл', icon: '💳', value: 'Хувь лизингээр',
  });
  // ⚠️ Утга нь КОД БИШ — хэрэглэгч «lease» гэж унших ёсгүй ✓
  assert.ok(!/lease/.test(rows[0].value), 'код харагдаж байна ✗');
});

t('📋 getAttrRows(auto): attr мөрүүдийн ДАРАА, олон нэгцэл нь «, »-ээр', () => {
  const rows = getAttrRows('auto', { brand: 'Toyota', payment_terms: ['cash', 'lease'] });
  assert.deepEqual(rows.map((r) => r.key), ['brand', PAYMENT_ATTR_KEY]);
  assert.equal(rows[rows.length - 1].value, 'Хувь лизингээр, Бэлэн төлөлтөөр');
});

t('⛔ getAttrRows: payment мөр ГАРАХГҮЙ 3 тохиолдол (хоосон мөр үүсэхгүй ✓)', () => {
  // ① хэсэг дэмжихгүй (💼 Ажил) — `attrs`-д утга байсан ч ХАРАГДАХГҮЙ
  assert.deepEqual(getAttrRows('jobs', { payment_terms: ['lease'] }), []);
  assert.deepEqual(getAttrRows('computers', { payment_terms: ['lease'] }), []);
  // ② утга хоосон/хүчингүй
  assert.deepEqual(getAttrRows('real-estate', { payment_terms: [] }), []);
  assert.deepEqual(getAttrRows('real-estate', { payment_terms: 'abc' }), []);
  assert.deepEqual(getAttrRows('real-estate', {}), []);
  // ③ `attrs` объект биш (хуучин/эвдэрсэн өгөгдөл)
  assert.deepEqual(getAttrRows('real-estate', null), []);
  assert.deepEqual(getAttrRows('real-estate', 'lease'), []);
});

t('📋 getAttrRows: хуучин ТЕКСТ утга (`payment_terms: "lease,cash"`) ч уншигдана ✓', () => {
  const rows = getAttrRows('auto', { payment_terms: 'lease,cash' });
  assert.equal(rows.length, 1);
  assert.equal(rows[0].value, 'Хувь лизингээр, Бэлэн төлөлтөөр');
});

// ---------- ⑬ lib/queries.js — бодит шүүлтийн гинжин ----------
t('🔗 lib/queries.js: `applyPaymentFilter` нь `applyRoomFilter`-ийн ДАРАА дуудагдана', () => {
  const src = readSrc('lib/queries.js');
  assert.match(src, /import \{ applyPaymentFilter \} from '\.\/paymentFilter\.mjs'/,
    'paymentFilter.mjs-ийн импорт алга ✗');
  assert.match(src, /applyPaymentFilter\(query, filters\.payments\)/,
    'шүүлтийн гинжинд дуудагдахгүй байна ✗');
  const roomsAt = src.indexOf('applyRoomFilter(query');
  const payAt = src.indexOf('applyPaymentFilter(query');
  assert.ok(roomsAt > 0 && payAt > roomsAt, 'өрөөний дараа байх ёстой ✗');
  // ⚠️ `.or()` нь дээд түвшний шүүлттэй AND болж холбогдоно (таслал биш `,`) ✓
  assert.ok(!/filters\.payments\.join/.test(src),
    'олон утгыг ШУУД `.or()`-т холбох нь `22P02` алдаа өгнө ✗');
});

// ---------- ⑭ HomeClient.jsx — хайлтын UI ----------
t('💳 HomeClient.jsx: ЧИП (өрөөний тоотой ижил) + URL + DB (2026-10-03; (16))', () => {
  const src = readSrc('components/HomeClient.jsx');
  const ui = codeOnly(src);
  // ① Блок ба ЧИПҮҮД DOM-д байгаа (CDP тестийн дэгээнүүд ✓)
  assert.match(ui, /data-payment-filter/, 'төлбөрийн блокийн дэгээ алга ✗');
  assert.match(ui, /data-payment-value/, 'төлбөрийн чипийн дэгээ алга ✗');
  // ② НЭГ ЭХ СУРВАЛЖ — модулийн функцууд (дүрмийг давхар бичихгүй ✓)
  assert.match(ui, /PAYMENT_OPTIONS/, 'PAYMENT_OPTIONS импорт/хэрэглээ алга ✗');
  assert.match(ui, /togglePaymentValue/, 'togglePaymentValue импорт алга ✗');
  assert.match(ui, /togglePayments/, 'togglePayments функц алга ✗');
  assert.match(ui, /clearPayments/, 'clearPayments функц алга ✗');
  assert.match(ui, /showPayments/, 'showPayments нөхцөл алга ✗');
  assert.match(ui, /hasPaymentTerms\(section\)/, 'зөвхөн багц хэсэгт гарах нөхцөл алга ✗');
  assert.match(src, /Төлбөрийн нөхцөл/, '«Төлбөрийн нөхцөл» блокын шошго алга ✗');
  // ③ URL: унших/бичих/цэвэрлэх нь модулиар (хоосон нь `[]` БИШ `''` биш ✓)
  assert.match(ui, /payments: \[\]/, 'хоосон утга нь массив байх ёстой ✗');
  assert.match(ui, /parsePaymentList\(sp\.get\('payment'\)\)/, 'URL-аас унших ✗');
  assert.match(ui, /paymentsUrlValue\(filters\.payments\)/, 'URL-д бичих ✗');
  assert.match(ui, /paymentsFilterLabel\(filters\.payments\)/, '«идэвхтэй шүүлт» чипийн шошго ✗');
  assert.match(ui, /payments: filters\.payments\.length \? filters\.payments : undefined/,
    'DB шүүлт рүү дамжуулах ✗');
  // ④ Хэсэг солиход ЦЭВЭРЛЭНЭ (ж: «Ажил» руу шилжихэд лизинг үлдэхгүй ✓)
  assert.match(ui, /payments: \[\]/, 'хэсэг солих үед цэвэрлэхгүй ✗');
  assert.match(ui, /next\.payments = \[\]/, 'хуучин линкээс ирсэн утгыг хасах дүрэм алга ✗');
  assert.match(ui, /key === 'payments' \? \[\]/, 'идэвхтэй чипийн ✕ дээр массив цэвэрлэхгүй ✗');
  // ⑤ 🆕 ЧИП ХЭВ (2026-10-03 (16) — хэрэглэгчийн хүсэлт: «Зар хайх
  //    хэсэгийн 💳 Төлбөрийн нөхцөлийг ӨРӨӨНИЙ ТОО шиг сонгодог болго»):
  //    ☑ checkbox БИШ — «🛏 Өрөөний тоо»-той ЯГ ИЖИЛ `chip-toggle` чипүүд ✓
  // ⚠️ Зөвхөн ТӨЛБӨРИЙН блокийн мөрийг шалгана (хороо/өрөө Ч БАС чип ✓)
  const payAt = ui.indexOf('data-payment-filter');
  const payRegion = ui.slice(payAt - 300, payAt + 1200);
  assert.match(payRegion, /className=\{`chip-toggle \$\{on \? 'chip-toggle-active' : ''\}`\}/,
    'чипийн класс (`.chip-toggle`) алга ✗');
  assert.match(payRegion, /aria-pressed=\{on\}/, 'чипийн төлөв (`aria-pressed`) алга ✗');
  assert.match(payRegion, /<button/, 'чип нь ЖИНХЭНЭ `<button>` байх ёстой ✗');
  assert.match(payRegion, /data-payment-value=\{o\.value\}/, 'чипийн дэгээ холбогдоогүй ✗');
  assert.match(payRegion, /\{on && <span aria-hidden="true">✓<\/span>\}/,
    'идэвхтэй чип дээр `✓` тэмдэг алга ✗');
  assert.match(payRegion, /onClick=\{\(\) => togglePayments\(o\.value\)\}/,
    'нэг эх сурвалж (`togglePayments`) холбогдоогүй ✗');
  // ⏳ (6)-ийн ☑ хэв ХАСАГДАВ: хайлт дээр checkbox/pay-grid ОГТ байхгүй ✓
  assert.ok(!/type="checkbox"/.test(payRegion), 'хайлт дээр ☑ checkbox хэвээр байна ✗');
  assert.ok(!/pay-grid/.test(payRegion), 'хайлт дээр форм-ын `.pay-grid` хэвээр байна ✗');
  // ⚠️ icon (💳/💵/🏦/🔄) нь Ч БАС харагдахгүй (өрөөний тоотой ижил — зөвхөн шошго ✓)
  assert.ok(!/o\.icon/.test(payRegion), 'чип дээр icon харагдаж байна ✗');
});

// ---------- ⑮ AddListingClient.jsx — зар оруулах форм ----------
t('📝 AddListingClient.jsx: ОЛОН сонголт + ЗААВАЛ шалгалт + хадгалалт (2026-10-03)', () => {
  const src = readSrc('components/AddListingClient.jsx');
  const ui = codeOnly(src);
  // ① Чипүүд (sidebar-тай ЯГ ИЖИЛ модулиас) + дэгээ
  assert.match(ui, /PAYMENT_OPTIONS/, 'PAYMENT_OPTIONS импорт/хэрэглээ алга ✗');
  assert.match(ui, /data-payment-value/, 'чипийн дэгээ алга ✗');
  assert.match(ui, /data-detail-field="payments"/, '📱 3-р алхмын дэлгэцийн дэгээ алга ✗');
  assert.match(ui, /togglePayment\b/, 'togglePayment функц алга ✗');
  assert.match(ui, /togglePaymentValue/, 'нэг эх сурвалж (модуль) ашиглахгүй байна ✗');
  assert.match(ui, /showPayments/, 'showPayments нөхцөл алга ✗');
  assert.match(ui, /hasPaymentTerms\(form\.section\)/, 'хэсгээс хамаарах нөхцөл алга ✗');
  // ② ХАДГАЛАЛТ: `attrs.payment_terms` (массив) — хэсэг дэмжихгүй бол УСТАНА ✓
  assert.match(ui, /paymentTermsForAttrs\(form\.section, form\.payments\)/,
    'хадгалах дүрэм (нэг эх сурвалж) алга ✗');
  assert.match(ui, /a\.payment_terms = terms/, 'attrs-д хадгалахгүй байна ✗');
  assert.match(ui, /delete a\.payment_terms/, 'хоосон утгыг устгахгүй байна ✗');
  // ③ ЗААВАЛ (зөвхөн ШИНЭ зард) — мессеж нь НЭГ ГАЗАР (`requiredDetailMsg`) ✓
  assert.match(src, /PAYMENT_REQUIRED_MSG/, 'заавал сонгох мессеж алга ✗');
  assert.match(ui, /requiredDetailMsg\('payments'\)/, 'validateStep-д шалгалт алга ✗');
  assert.match(ui, /requiredDetailMsg\(cur\.key\)/, '📱 дэлгэц солих шалгалт (нэг эх сурвалж) алга ✗');
  assert.ok(!/set\('payments'/.test(ui), "`set('payments', …)` шууд дуудаж болохгүй — togglePayment (нэг эх сурвалж) ✓");
  // ④ Хэсэг солиход форм цэвэрлэнэ (attrs-тай хамт ✓)
  assert.match(ui, /payments: \[\]/, 'pickSection/emptyForm-д массив алга ✗');
  // ⑤ Засах горимд хуучин утга формоо бөглөнө (`attrs.payment_terms` → код ✓)
  assert.match(ui, /payments: parsePaymentList\(/, 'засах горимд уншихгүй ✗');
  // ⑥ 🆕 ЧИП ХЭВ (2026-10-03 (18)) — ХАЙЛТ БА ФОРМ ХОЁУЛАА ОДОО «🛏 Өрөөний
  //    тоо»-той ЯГ ИЖИЛ чип (хэрэглэгчийн хүсэлт: «…зар оруулах болох
  //    дэлгэрэнгүй … дээр Өрөөний тоо дэлгэрэнгүй хайлт шиг оруулдаг болгоод
  //    өгчих») — ⏳ (6)-ийн ☑ checkbox БҮРЭН ХАСАГДАВ ✓
  //    ⚠️ класс нь дэгээнээс (data-payment-picker) ӨМНӨ ✓
  const payAt = ui.indexOf('data-payment-picker');
  const payRegion = ui.slice(payAt - 300, payAt + 1200);
  assert.match(payRegion, /className=\{`chip-toggle \$\{on \? 'chip-toggle-active' : ''\}`\}/,
    'формд чипийн класс (`.chip-toggle`) алга ✗');
  assert.match(payRegion, /aria-pressed=\{on\}/, 'чипийн төлөв (`aria-pressed`) алга ✗');
  assert.match(payRegion, /<button/, 'чип нь ЖИНХЭНЭ `<button>` байх ёстой ✗');
  assert.match(payRegion, /data-payment-value=\{o\.value\}/, 'чипийн дэгээ холбогдоогүй ✗');
  assert.match(payRegion, /onClick=\{\(\) => togglePayment\(o\.value\)\}/,
    'нэг эх сурвалж (`togglePayment`) холбогдоогүй ✗');
  assert.match(payRegion, /\{on && <span aria-hidden="true">✓<\/span>\}/,
    'идэвхтэй чип дээр `✓` тэмдэг алга ✗');
  assert.ok(!/type="checkbox"/.test(payRegion), 'форм дээр ☑ checkbox хэвээр байна ✗');
  assert.ok(!/pay-grid/.test(payRegion), 'форм дээр `.pay-grid` хэвээр байна ✗');
  assert.ok(!/pay-check/.test(payRegion), 'форм дээр `.pay-check` хэвээр байна ✗');
  // ⚠️ icon (💳/💵/🏦/🔄) нь чип дээр Ч харагдахгүй (sidebar-тай ижил ✓)
  assert.ok(!/o\.icon/.test(payRegion), 'чип дээр icon харагдаж байна ✗');
});

// ---------- ⑯ CDP тест + бүртгэл ----------
// ---------- ⑯ CDP тест + бүртгэл ----------
t('🐍 CDP скрипт нь ЧИП БАЙГААГ, өрөөний тооны хэвтэй ижил эсэхийг шалгана', () => {
  const cdp = readSrc('scripts/cdp-payments.mjs');
  assert.match(cdp, /data-payment-value/, 'чипийг DOM-оос олдоггүй ✗');
  assert.match(cdp, /data-payment-filter/, 'блокийг олдоггүй ✗');
  assert.match(cdp, /clickPayment\(/, 'чип дарах код алга ✗');
  assert.match(cdp, /payment=/, 'URL-ийн `?payment=`-ийг шалгахгүй ✗');
  // 🆕 2026-10-03 (16): БОДИТ хэмжилт — `aria-pressed` төлөв, жинхэнэ
  //    `<button>`, `flex-wrap` мөр, ХАРАГДАХ хэмжээ ✓ (☑/2 багана БИШ ✗)
  assert.match(cdp, /aria-pressed/, 'чипийн төлвийг (`aria-pressed`) шалгахгүй ✗');
  assert.match(cdp, /tagName === 'BUTTON'/, 'жинхэнэ `<button>` эсэхийг шалгахгүй ✗');
  assert.match(cdp, /flexWrap/, 'өрөөний тооны хэв (`flex-wrap`) шалгахгүй ✗');
  assert.match(cdp, /chip-toggle/, 'чипийн классыг (`chip-toggle`) шалгахгүй ✗');
  assert.match(cdp, /getBoundingClientRect/, 'чипийн харагдах хэмжээг хэмждэггүй ✗');
  // ⏳ (6) ☑ checkbox-ийн шалгалтууд ХАСАГДАВ — хайлт дээр ☑ байхгүй ✓
  assert.ok(!/type === 'checkbox'/.test(cdp), 'CDP нь ☑ checkbox хайж байна ✗ (чип байх ёстой)');
  assert.ok(!/gridTemplateColumns/.test(cdp), 'CDP нь 2 баганат grid хэмжиж байна ✗ (чип байх ёстой)');
});

// ---------- ⑰ app/globals.css — ХАЙЛТ ба ФОРМ НЭГ ЭХ СУРВАЛЖ (чип) ----------
// ⚠️ 2026-10-03 (18): `.pay-grid`/`.pay-check` (☑, `appearance:none`, SVG ✓)
//    ХАСАГДАВ — хайлт (16) ба форм (18) ХОЁУЛАА «🛏 Өрөөний тоо»-той ижил
//    `.chip-toggle` чиптэй болов ⇒ өөр хэрэглэгч байхгүй (устгах нь зөв ✓)
t('🎨 globals.css: ☑ хэв УСТГАГДАВ + ХАЙЛТ=ФОРМ нэг хэв (`.chip-toggle` ✓)', () => {
  const css = readSrc('app/globals.css');
  // ⛔ ☑ checkbox-ийн дүрмүүд БАЙХГҮЙ байх ёстой (форм ч чип болов ✓)
  assert.ok(!/\n\s*\.pay-grid \{/.test(css), '`.pay-grid` дүрэм хэвээр байна ✗');
  assert.ok(!/\n\s*\.pay-check \{/.test(css), '`.pay-check` дүрэм хэвээр байна ✗');
  assert.ok(!/\.pay-check > input/.test(css), '☑-ийн `input` дүрэм хэвээр байна ✗');
  assert.ok(!/appearance: none/.test(css) || !/pay-check/.test(css),
    '☑-ийн `appearance:none` хэвээр байна ✗');
  // ✅ НЭГ ХЭВ: `.chip-toggle` (чип) + идэвхтэй нь брэнд өнгөөр дүүрнэ ✓
  assert.match(css, /\.chip-toggle \{/, 'чипийн класс (`.chip-toggle`) алга ✗');
  assert.match(css, /\.chip-toggle-active \{/, 'идэвхтэй чипийн класс алга ✗');
  assert.match(css, /\.chip-toggle-active \{[^}]*bg-primary/, 'идэвхтэй чип брэнд өнгөгүй ✗');
});

t('📦 package.json: `test:payments` ба `cdp:payments` бүртгэгдсэн', () => {
  const pkg = JSON.parse(readSrc('package.json'));
  assert.equal(pkg.scripts['test:payments'], 'node scripts/test-payments.mjs');
  assert.equal(pkg.scripts['cdp:payments'], 'node scripts/cdp-payments.mjs');
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);
