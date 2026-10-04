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
// 🆕 2026-10-04 (36): 🚙 **«Загвар»** (`model`, зөвхөн `auto`) ч ОЛОН СОНГОЛТТОЙ
//    болов (хэрэглэгчийн хүсэлт: «машины загвараас олоныг сонгох боломжтой
//    болго») ⇒ `?attr_model=Prius 30,Harrier`. ⚠️ ГЭХДЭЭ DB дээр `in.(…)` БИШ
//    `or=(attrs->>model.ilike.%A%,attrs->>model.ilike.%B%)` — учир нь талбар нь
//    ХАЙЛТТАЙ ТЕКСТ (`filterable`): «pri» гэж бүрэн бус бичихэд ч олдох ёстой ✓
//    (`applyAttrMultiLikeFilter`; 1 утга нь хуучин скаляр `ilike`-тай ЯГ ижил ✓)
//    ⚠️ UI нь sidebar-ийн чип БИШ, `components/CarPicker.jsx` пикер —
//       тиймээс `chips` туг БАЙХГҮЙ ч `multi` нь хүчинтэй ✓
//
// 🆕 2026-10-05 (42): 💼 **«Ажлын цаг» (`jobType`) · «Туршлага» (`experience`) ·
//    «Мэргэжлийн түвшин» (`jobLevel`)** ч ОЛОН СОНГОЛТТОЙ ЧИП болов
//    (хэрэглэгчийн хүсэлт: «Ажлын цаг, Туршлага, Мэргэжлийн түвшиныг Өрөөний тоо
//    шиг болго, хайлтыг хэлж байгаа биз дээ») ⇒ `?attr_jobType=Бүтэн цагийн,Цагийн`
//    ба DB `attrs->>jobType=in.(…)`. ⚠️ ХӨДӨЛГӨХ КОД БАЙХГҮЙ — зөвхөн
//    `lib/locationData.js`-ийн тугууд (`chips` + `multi`) нэмэгдэв ✓
//    ⚠️ ФОРМ ХӨНДӨӨГДӨӨГҮЙ (`formChips` хэвээр — форм нэг утга хадгална ✓)
//
// ХАМРАХ ХҮРЭЭ (4 давхарга — бүгд НЭГ эх сурвалж `lib/attrMultiFilter.mjs`):
//   ① `lib/attrMultiFilter.mjs` — цэвэр логик (normalize → parse → toggle →
//      шошго → URL → `in.()` / `or(…ilike…)` мөр)
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
  likePattern, orSafeAttrValue, attrLikeExpressions, applyAttrMultiLikeFilter,
} from '../lib/attrMultiFilter.mjs';
import { getAttrField, getAttrFilters, getAttrFields, getSection, pruneGatedAttrs, SECTIONS } from '../lib/locationData.js';

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
    ilike(col, val) { calls.push(['ilike', col, val]); return q; },
    or(str) { calls.push(['or', str]); return q; },
  };
  return q;
}
/** `applyAttrMultiFilter`-ийг хуурамч builder дээр ажиллуулж, дуудлагыг буцаана */
const callsFor = (key, list) => {
  const q = fakeQuery();
  applyAttrMultiFilter(q, key, list);
  return q.calls;
};
/** 🚙 `applyAttrMultiLikeFilter`-ийн дуудлагууд (2026-10-04 (36) ✓) */
const likeCallsFor = (key, list) => {
  const q = fakeQuery();
  applyAttrMultiLikeFilter(q, key, list);
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

// ---------- ⑦б 🚙 2026-10-04 (36): ХАЙЛТТАЙ ТЕКСТ талбарын ОЛОН СОНГОЛТ ----
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «машины загвараас олоныг сонгох боломжтой болго»
t('🔎 likePattern: `%`, `_`, `\\` ESCAPE хийгдэнэ (өөр утга бүх зарыг татахгүй ✓)', () => {
  assert.equal(likePattern('Prius 30'), '%Prius 30%');
  assert.equal(likePattern('Mercedes_'), '%Mercedes\\_%');
  assert.equal(likePattern('100%'), '%100\\%%');
  assert.equal(likePattern('a\\b'), '%a\\\\b%');
  // ⚠️ Хоосон/`null` нь `'%null%'` БИШ `'%%'` (бүх зар) — `String(null)` биш ✓
  assert.equal(likePattern(''), '%%');
  assert.equal(likePattern(null), '%%');
});

t('🚙 orSafeAttrValue: `, ( ) : " \\` → ЗАЙ (PostgREST-ийн logic tree хамгаалалт ✓)', () => {
  // ⚠️ Хаалт нь `or=(…)`-ийг эвдэж 400 алдаа үүсгэдэг тул ЗАЙ болно ✓
  assert.equal(orSafeAttrValue('Prius (30)'), 'Prius 30');
  assert.equal(orSafeAttrValue('  Prius   30  '), 'Prius 30');
  assert.equal(orSafeAttrValue('A,B'), 'A B');       // таслал ч мөн адил ✓
  assert.equal(orSafeAttrValue('a:b"c'), 'a b c');
  // ⚠️ Объект/`null` нь `'[object Object]'` гэсэн ХОГ утга үүсгэхгүй ✓
  assert.equal(orSafeAttrValue({}), '');
  assert.equal(orSafeAttrValue(null), '');
});

t("🔎 attrLikeExpressions: `['Prius 30','Harrier']` → `attrs->>model.ilike.%…%` ×2", () => {
  assert.deepEqual(attrLikeExpressions('model', ['Prius 30', 'Harrier']), [
    'attrs->>model.ilike.%Prius 30%',
    'attrs->>model.ilike.%Harrier%',
  ]);
  assert.deepEqual(attrLikeExpressions('model', []), []);
  // ⚠️ Давхцал (`?attr_model=A,A`) нэг л илэрхийлэл болно ✓
  assert.equal(attrLikeExpressions('model', 'A,A').length, 1);
});

t('🚙🌂 applyAttrMultiLikeFilter: 1 утга → `ilike` (скаляртай ИЖИЛ ✓) · 2+ → `or(…)`', () => {
  // ① Нэг утга — ХУУЧИН скаляр зам ЯГ хэвээр (`attrs->>model=ilike.%Prius 30%`)
  assert.deepEqual(likeCallsFor('model', ['Prius 30']),
    [['ilike', 'attrs->>model', '%Prius 30%']]);
  // ⚠️ Хуучин линк (`?attr_model=Prius 30`) нь МАССИВ болж уншигдана ч query нь
  //    ЯГ ижил байх ЁСТОЙ (URL/DB-ийн гэрээ эвдрэхгүй ✓)
  assert.deepEqual(likeCallsFor('model', 'Prius 30'), likeCallsFor('model', ['Prius 30']));
  // ② Хоёр утга — `or(...)`: аль нэг загвартай зар (OR ✓) — `in.()` БИШ!
  assert.deepEqual(likeCallsFor('model', ['Prius 30', 'Harrier']), [[
    'or',
    'attrs->>model.ilike.%Prius 30%,attrs->>model.ilike.%Harrier%',
  ]]);
  // ③ Хоосон үед шүүлт ХИЙХГҮЙ («Бүх зар» ✓)
  [[], '', null, undefined].forEach((v) => {
    assert.deepEqual(likeCallsFor('model', v), [], `«${JSON.stringify(v)}» ✗`);
  });
  // ④ АЮУЛГҮЙ БОЛГОЛТ: хаалт/цэг/хашилт нь `or()` мөрийг эвдэхгүй (400 алдаа БАЙХГҮЙ ✓)
  const risky = likeCallsFor('model', ['Prius (30)', 'A:B']);
  assert.equal(risky.length, 1);
  assert.equal(risky[0][1], 'attrs->>model.ilike.%Prius 30%,attrs->>model.ilike.%A B%');
  assert.ok(!/[()]/.test(risky[0][1]), '`or()` дотор хаалт үлдэв ✗');
  // ⚠️ Таслал нь URL-ийн ТУСГААРЛАГЧ тул нэг утга дотор байх боломжгүй —
  //    `parseAttrList` 2 утга болгоно (URL ба DB ижил ойлголцол ✓)
  assert.equal(likeCallsFor('model', ['A,B'])[0][1],
    'attrs->>model.ilike.%A%,attrs->>model.ilike.%B%');
});


// ---------- ⑧ lib/locationData.js — талбарын ГЭРЭЭ ----------
// ⚠️ 🚙 2026-10-04 (36): «Загвар» нь `multi` болов — гэхдээ `chips` БАЙХГҮЙ
//    (UI нь sidebar-ийн чип БИШ, `components/CarPicker.jsx` пикер ✓)
t('🚙 auto → model: `multi` + `multiNoun: \'загвар\'` + чөлөөт текст ХЭВЭЭР', () => {
  const f = getAttrField('auto', 'model');
  assert.equal(f.multi, true);            // 🚙🌂 олон сонголт ✓
  assert.equal(f.multiNoun, 'загвар');    // «2 загвар» шошго ✓
  // ⚠️ Талбарын ТӨРӨЛ ХӨНДӨГДӨӨГҮЙ — DB нь `ilike %…%` хэвээр ✓
  assert.equal(f.type, 'text');
  assert.equal(f.filterable, true);
  assert.equal(f.optionsFrom, 'brand');
  // ⛔ `chips` БАЙХГҮЙ: талбар нь sidebar-д ГАРАХГҮЙ (пикерээр сонгоно ✓)
  assert.ok(!f.chips, '🚙 model нь sidebar-ийн чип болжээ ✗ (пикер л ✓)');
  // ⚠️ Форм дээр ч хөндөгдөхгүй (`formChips` туг байхгүй — форм нэг утга ✓)
  assert.ok(!f.formChips, 'форм дээр чип болжээ ✗');
  // ⚠️ Форм ба шүүлт нь ИЖИЛ Объект (нэг эх сурвалж ✓)
  assert.equal(getAttrFields('auto').find((x) => x.key === 'model'), f);
});

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

t("🔒 Олон сонголттой талбарууд нь ЯГ ТОДОРХОЙ жагсаалт (🚗 auto: model·color·transmission·fuel + ✅ 8 хэсгийн condition)", () => {
  const multiKeys = [];
  SECTIONS.forEach((s) => {
    getAttrFields(s.value).forEach((f) => {
      if (f.multi) multiKeys.push(`${s.value}.${f.key}`);
      /* ⚠️ `multi` талбар нь ЗААВАЛ НЭГ UI-тэй байх ЁСТОЙ:
         ① `chips: true` → sidebar-д ОЛОН СОНГОЛТТОЙ ЧИП (🎨 Өнгө, ⚙️⛽…)
         ② ✍️ `type: 'text'` + `filterable` (🚙 Загвар — 2026-10-04 (36)):
            sidebar-д чип БАЙХГҮЙ (талбар нь `components/CarPicker.jsx`
            пикерээр сонгогддог) — гэхдээ утга нь МАССИВ ба DB нь
            `or=(…ilike…)` ✓
         ⚠️ Аль нь ч биш бол утга нь массив болж, скаляр хүлээсэн UI эвдэрнэ ✗ */
      if (f.multi) {
        const hasMultiUi = f.chips === true || (f.type === 'text' && f.filterable === true);
        assert.ok(hasMultiUi, `${s.value}.${f.key} — multi ч чип/пикер UI-гүй ✗`);
      }
      // ⚠️ Олон сонголттой талбар нь ЗААВАЛ sidebar-ийн шүүлтэд Ч байх ЁСТОЙ
      //    (эс бөгөөс URL-ээс уншигдахгүй, «үхсэн туг» болно ✗)
      if (f.multi) assert.ok((s.attrFilters || []).includes(f.key),
        `${s.value}.${f.key} — multi ч attrFilters-д БАЙХГҮЙ ✗`);
    });
  });
  assert.deepEqual(multiKeys, [
    // 🚗 авто: 🚙 загвар (36) + 3 чип (🎨 өнгө · ⚙️ хайрцаг (22) · ⛽ түлш (22))
    'auto.model', 'auto.color', 'auto.transmission', 'auto.fuel',
    // 💼 2026-10-05 (42): 🕒 Ажлын цаг · 📊 Туршлага · 📈 Мэргэжлийн түвшин
    //    («🛏 Өрөөний тоо» шиг ОЛОН СОНГОЛТТОЙ ЧИП ✓)
    'jobs.jobType', 'jobs.experience', 'jobs.jobLevel',
    // ✅ 8 хэсгийн «Шинэ / Шинэвтэр / Хуучин» (21)
    'computers.condition', 'furniture.condition', 'home.condition', 'electric.condition',
    'construction.condition', 'equipment.condition', 'travel.condition', 'hobby.condition',
  ], `multi талбарууд: ${multiKeys.join(', ')}`);
});

t('💼 (42) jobs → 🕒/📊/📈: `chips` + `multi` (sidebar-д «Өрөөний тоо» шиг чип)', () => {
  // Хэрэглэгчийн хүсэлт: «Ажлын цаг, Туршлага, Мэргэжлийн түвшиныг Өрөөний тоо
  // шиг болго, хайлтыг хэлж байгаа биз дээ» ⇒ 3 нь ОЛОН СОНГОЛТТОЙ ЧИП болов.
  // ⚠️ `type` нь `'select'` ХЭВЭЭР (форм нэг утга хадгална — чип болгож
  //    болгох нь `formChips` туг 2026-10-03 (11) ✓)
  ['jobType', 'experience', 'jobLevel'].forEach((k) => {
    const f = getAttrField('jobs', k);
    assert.equal(f.type, 'select', `${k}.type ✗`);
    assert.equal(f.chips, true, `${k}: sidebar чип болоогүй ✗`);
    assert.equal(f.multi, true, `${k}: олон сонголт болоогүй ✗`);
    assert.equal(f.formChips, true, `${k}.formChips (форм чип) ХӨНДӨГДӨВ ✗`);
    assert.ok((getSection('jobs').attrFilters || []).includes(k), `${k} attrFilters-д БАЙХГҮЙ ✗`);
  });
  // ⛔ 🏷️ «Зарлагч» нь sidebar-ийн шүүлт БИШ (форм дээр л) — `multi` аваагүй ✓
  assert.ok(!getAttrField('jobs', 'advertiser').multi, '🏷️ advertiser multi болжээ ✗');
  // 🎯 DB мөр: `in.()` (текст биш чип талбаруудын ИЖИЛ дүрэм — `attrs->>jobType`)
  const calls = [];
  const q = { in: (c, v) => { calls.push([c, v]); return q; } };
  applyAttrMultiFilter(q, 'jobType', ['Бүтэн цагийн', 'Цагийн']);
  assert.deepEqual(calls, [['attrs->>jobType', ['Бүтэн цагийн', 'Цагийн']]]);
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
t('🗄 queries.js: массив утгыг ТЕКСТ БИШ бол `applyAttrMultiFilter` (`in`) — ТЕКСТ бол `or(…ilike…)`', () => {
  const src = codeOnly(readSrc('lib/queries.js'));
  assert.match(src,
    /import \{ applyAttrMultiFilter, applyAttrMultiLikeFilter, likePattern \} from '\.\/attrMultiFilter\.mjs'/);
  // ⚠️ Массивыг СКАЛЯР гэж үзэх зам руу оруулахгүй — `Array.isArray` шалгалт
  //    нь `String(v)`/range/searchable шалгалтуудын ӨМНӨ байх ЁСТОЙ ✓
  assert.match(src,
    /if \(Array\.isArray\(v\)\) \{[\s\S]{0,300}?applyAttrMultiLikeFilter\(query, k, v\);[\s\S]{0,80}?else applyAttrMultiFilter\(query, k, v\);[\s\S]{0,40}?return;/);
  const atArray = src.indexOf('Array.isArray(v)');
  const atRange = src.indexOf('const rangeKey');
  assert.ok(atArray > 0 && atRange > 0 && atArray < atRange,
    'массивын шалгалт range-ийн дараа байна ✗');
  // ⚠️ «Текст эсэх» дүрэм нь НЭГ газар (`isTextLikeAttr`) — скаляр (`ilike`)
  //    ба олон утгатай (`or(…ilike…)`) хоёулаа ЯГ ижил дүрмийг хэрэглэнэ ✓
  assert.match(src, /function isTextLikeAttr\(section, key\) \{/);
  assert.match(src, /if \(isTextLikeAttr\(filters\.section, k\)\) \{\n\s+query\.ilike\(`attrs->>\$\{k\}`/);
  // ⚠️ Локал `likePattern` ХАСАГДСАН — зөвхөн модулиас импортолно (нэг эх сурвалж ✓)
  assert.ok(!/const likePattern = /.test(src), 'queries.js дээр likePattern ДАХИН бичигдсэн ✗');
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

