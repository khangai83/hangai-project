// ============================================================
// test-districts.mjs — 🗺 «ДҮҮРЭГ / СУМ» ОЛОН СОНГОЛТТОЙ шүүлтийн тест
//                       (2026-10-03)
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (шууд):
//   ① «Дэлгэрэнгүй хайлтын Дүүрэг / Сум ийг Өрөөний тоо хайх тай адилхан
//      олон сонгол хийх боломжтой болго»
//   ② «🛏 Өрөөний тоо гэдгийн доор Өрөө гэсэн байгаа text ийг арилга»
//
// ХАМРАХ ХҮРЭЭ:
//   ① `lib/districtFilter.mjs` — цэвэр логик (normalize/parse/toggle/шошго/
//      URL/DB дүрэм)
//   ② `lib/locationData.js` — `getKhoroosForDistricts` (сонгосон БҮХ дүүргийн
//      хорооны НЭГДЭЛ) ба утгууд нь нэг эх сурвалжтай эсэх (регресс)
//   ③ `lib/queries.js` / `lib/breadcrumb.js` / `components/HomeClient.jsx` —
//      ЭХ ФАЙЛЫН ГЭРЭЭ (дүрмийг ДАХИН бичихгүй, модулийг хэрэглэнэ ✓)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Дүүрэг нь 3 газарт нэгэн зэрэг бичигддэг: UI (чип), URL
//   (`?district=Баянгол,Сүхбаатар`) ба DB (`district IN (…)`). Аль нэг нь
//   зөрвөл хэрэглэгч 2 дүүрэг сонгосон ч зөвхөн эхнийх нь шүүгдэж, «буруу
//   зарууд гарлаа» гэсэн гомдол үүснэ ✗ — энэ тест тэр эрсдэлийг бариулна ✓
//
// ⚠️ ХАМГИЙН ЧУХАЛ ШААРДЛАГА (ХУУЧИН ГЭРЭЭ): НЭГ утгатай сонголт нь
//    ХУУЧИН үр дүнтэй ЯГ ИЖИЛ байх ЁСТОЙ —
//    `?district=Баянгол` → `district=eq.Баянгол` (`.in()` БИШ!), URL нь
//    `district=Баянгол` ба breadcrumb-ийн шошго нь «Баянгол» — ингэснээр
//    хуучин линк/bookmark/тест/индекс бүгд эвдрэхгүй ✓
//
// АЖИЛЛУУЛАХ:  npm run test:districts
// ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (`districtFilter.mjs` нь импортгүй
//    цэвэр; `locationData.js` нь зөвхөн .mjs модулиудыг импортолдог ✓).
//    Breadcrumb-ийг `test-breadcrumb.mjs`-ийн АДИЛ аргаар (extensionless
//    импортыг `.js` болгож, `lib/` дотор түр файл үүсгэн) ачаална ✓
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  normalizeDistrict, parseDistrictList, isDistrictsEmpty, countDistricts,
  toggleDistrictValue, districtsUrlValue, districtsFilterLabel,
  districtsFilterDescriptor, applyDistrictFilter,
} from '../lib/districtFilter.mjs';
import {
  getDistricts, getKhoroos, getKhoroosForDistricts,
} from '../lib/locationData.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

/** PostgREST query builder-ийн ХУУЧИР — дуудсан арга бүрийг бүртгэнэ.
 *  ⚠️ `lib/queries.js`-ийн бодит builder-той ИЖИЛ гэрээтэй:
 *     `.eq()`, `.in()` нь дахин `this`-ээ буцаана ✓ */
function fakeQuery() {
  const calls = [];
  const q = {
    calls,
    eq(col, val) { calls.push(['eq', col, val]); return q; },
    in(col, val) { calls.push(['in', col, val]); return q; },
  };
  return q;
}
const callsFor = (list) => {
  const q = fakeQuery();
  applyDistrictFilter(q, list);
  return q.calls;
};

const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/** Комментгүй ЦЭВЭР КОД — «хасагдсан» гэсэн ТАЙЛБАР зүй ёсны тул шалгалтыг
 *  зөвхөн кодын мөрүүд дээр хийнэ (хуурамч улаан гарахгүй ✓) */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

console.log('\n🧪 Дүүрэг / Сум — олон сонголттой шүүлт (lib/districtFilter.mjs)\n');

// ---------- ① normalizeDistrict ----------
t("normalizeDistrict: ' Баянгол ' → 'Баянгол' (зай цэвэрлэнэ)", () => {
  assert.equal(normalizeDistrict(' Баянгол '), 'Баянгол');
  assert.equal(normalizeDistrict('Хан-Уул'), 'Хан-Уул');
});

t("normalizeDistrict: TACLAЛ (`,`) нь ЗАЙ болов — URL-ийн тусгаарлагч тул", () => {
  // ⚠️ Эс бөгөөс `?district=А,Б` гэх эвдэрсэн линк нэг утга дотор таслал
  //    үүсгэж URL ба DB хоёулаа задарна ✗
  assert.equal(normalizeDistrict('А,Б'), 'А Б');
});

t("normalizeDistrict: хоосон/хүчингүй утгууд → '' (null, undefined, '', '   ', {})", () => {
  [null, undefined, '', '   ', {}].forEach((v) => {
    assert.equal(normalizeDistrict(v), '', `«${JSON.stringify(v)}» ✗`);
  });
});

// ---------- ② parseDistrictList ----------
t("parseDistrictList: 'Баянгол,Сүхбаатар' → ['Баянгол','Сүхбаатар'] (ИРСЭН дараалал)", () => {
  assert.deepEqual(parseDistrictList('Баянгол,Сүхбаатар'), ['Баянгол', 'Сүхбаатар']);
  // ⚠️ СОРТ ХИЙХГҮЙ — хуваалцсан линк URL-д ЯГ ижил хэвээр үлдэх ёстой
  assert.deepEqual(parseDistrictList('Сүхбаатар,Баянгол'), ['Сүхбаатар', 'Баянгол']);
});

t('parseDistrictList: массив болон скалярыг ч хүлээнэ', () => {
  assert.deepEqual(parseDistrictList(['Баянгол', 'Сүхбаатар']), ['Баянгол', 'Сүхбаатар']);
  assert.deepEqual(parseDistrictList('Баянгол'), ['Баянгол']);
});

t("parseDistrictList: давхцал ХАСАГДАНА ('А,А,Б' → ['А','Б'])", () => {
  assert.deepEqual(parseDistrictList('А,А,Б'), ['А', 'Б']);
  assert.deepEqual(parseDistrictList(['А', 'А']), ['А']);
});

t("parseDistrictList: хоосон/эвдэрсэн гишүүд ЧИМЭЭГҮЙ хасагдана (',,', '', null)", () => {
  assert.deepEqual(parseDistrictList(',,'), []);
  assert.deepEqual(parseDistrictList(''), []);
  assert.deepEqual(parseDistrictList(null), []);
  assert.deepEqual(parseDistrictList(undefined), []);
});

t('parseDistrictList: шинэ массив буцаана (эх массивыг өөрчлөхгүй)', () => {
  const src = ['Баянгол'];
  const out = parseDistrictList(src);
  assert.deepEqual(src, ['Баянгол']);
  assert.notEqual(out, src);
});

// ---------- ③ isDistrictsEmpty / countDistricts ----------
t("isDistrictsEmpty: [] · '' · null · ',,' → true; ['Баянгол'] → false", () => {
  [[], '', null, undefined, ',,'].forEach((v) => assert.equal(isDistrictsEmpty(v), true, `${v} ✗`));
  assert.equal(isDistrictsEmpty(['Баянгол']), false);
});

t('countDistricts: сонгосон тоо ширхэг («N сонгосон» badge)', () => {
  assert.equal(countDistricts([]), 0);
  assert.equal(countDistricts('Баянгол,Сүхбаатар'), 2);
  assert.equal(countDistricts(['А', 'Б', 'А']), 2);
});

// ---------- ④ toggleDistrictValue — checkbox мэт нэмэх/хасах ----------
t("toggleDistrictValue: хоосон + 'Баянгол' → ['Баянгол']; дахин → []", () => {
  assert.deepEqual(toggleDistrictValue([], 'Баянгол'), ['Баянгол']);
  assert.deepEqual(toggleDistrictValue(['Баянгол'], 'Баянгол'), []);
});

t('toggleDistrictValue: олон утга НЭМЭГДЭНЭ (эхний сонголт үлдэнэ)', () => {
  assert.deepEqual(toggleDistrictValue(['Баянгол'], 'Сүхбаатар'), ['Баянгол', 'Сүхбаатар']);
  assert.deepEqual(toggleDistrictValue(['Баянгол', 'Сүхбаатар'], 'Баянгол'), ['Сүхбаатар']);
});

t('toggleDistrictValue: хүчингүй утга → жагсаалт ХЭВЭЭР, гэхдээ ШИНЭ массив', () => {
  const out = toggleDistrictValue(['Баянгол'], '   ');
  assert.deepEqual(out, ['Баянгол']);
  assert.notEqual(out, ['Баянгол']); // шинэ массив (React state-д чухал ✓)
});

t("toggleDistrictValue: скаляр төлвөөс ч зөв (хуучин `district: 'Баянгол'`)", () => {
  assert.deepEqual(toggleDistrictValue('Баянгол', 'Сүхбаатар'), ['Баянгол', 'Сүхбаатар']);
});

// ---------- ⑤ districtsUrlValue — URL-д бичих ----------
t("districtsUrlValue: ['А','Б'] → 'А,Б' · [] → '' · скаляр 'А' → 'А'", () => {
  assert.equal(districtsUrlValue(['Баянгол', 'Сүхбаатар']), 'Баянгол,Сүхбаатар');
  assert.equal(districtsUrlValue([]), '');
  assert.equal(districtsUrlValue('Баянгол'), 'Баянгол');
});

t('districtsUrlValue: нормчлогдоогүй утгууд цэвэрлэгдэнэ (зай/давхцал)', () => {
  assert.equal(districtsUrlValue([' Баянгол ', 'Баянгол']), 'Баянгол');
});

// ---------- ⑥ districtsFilterLabel — шошго ----------
t('districtsFilterLabel: 1 сонголт → НЭРЭЭР («Баянгол»)', () => {
  assert.equal(districtsFilterLabel(['Баянгол']), 'Баянгол');
  assert.equal(districtsFilterLabel('Баянгол'), 'Баянгол');
});

t('districtsFilterLabel: 2+ сонголт → «N дүүрэг» (чип хэт урт болохгүй)', () => {
  // 🏷️ 2026-10-03 (14): хэрэглэгчийн хүсэлт — «дүүрэг/сум» БИШ, «дүүрэг» ✓
  assert.equal(districtsFilterLabel(['Баянгол', 'Сүхбаатар']), '2 дүүрэг');
  assert.equal(districtsFilterLabel('А,Б,В'), '3 дүүрэг');
});

t("districtsFilterLabel: хоосон → '' (шошго ГАРАХГҮЙ)", () => {
  [[], '', null, ',,'].forEach((v) => assert.equal(districtsFilterLabel(v), '', `${v} ✗`));
});

// ---------- ⑦ districtsFilterDescriptor — DB дүрэм ----------
t('districtsFilterDescriptor: 1 утга → `eq` (ХУУЧИН нэг утгатайтай ЯГ ижил ✓)', () => {
  assert.deepEqual(districtsFilterDescriptor(['Баянгол']), { mode: 'eq', value: 'Баянгол' });
  assert.deepEqual(districtsFilterDescriptor('Баянгол'), { mode: 'eq', value: 'Баянгол' });
});

t('districtsFilterDescriptor: 2+ утга → `in` (массив хэвээр, дараалал хадгална)', () => {
  assert.deepEqual(districtsFilterDescriptor(['Баянгол', 'Сүхбаатар']),
    { mode: 'in', values: ['Баянгол', 'Сүхбаатар'] });
});

t("districtsFilterDescriptor: хоосон → { mode: 'none' } (шүүлт ХИЙХГҮЙ)", () => {
  assert.deepEqual(districtsFilterDescriptor([]), { mode: 'none' });
  assert.deepEqual(districtsFilterDescriptor(null), { mode: 'none' });
});

// ---------- ⑧ applyDistrictFilter — PostgREST ----------
t('applyDistrictFilter: [] → builder-т ОГТ хүрэхгүй (бүх дүүрэг гарна)', () => {
  assert.deepEqual(callsFor([]), []);
  assert.deepEqual(callsFor(null), []);
  assert.deepEqual(callsFor(',,'), []);
});

t("applyDistrictFilter: ['Баянгол'] → `.eq('district','Баянгол')` (`.in()` БИШ!)", () => {
  assert.deepEqual(callsFor(['Баянгол']), [['eq', 'district', 'Баянгол']]);
});

t("applyDistrictFilter: 2 утга → `.in('district',['Баянгол','Сүхбаатар'])`", () => {
  assert.deepEqual(callsFor(['Баянгол', 'Сүхбаатар']),
    [['in', 'district', ['Баянгол', 'Сүхбаатар']]]);
});

t('applyDistrictFilter: query-г буцаана (гинжин дуудлагад) ба 3 утга ч зөв', () => {
  const q = fakeQuery();
  assert.equal(applyDistrictFilter(q, ['А', 'Б', 'В']), q);
  assert.deepEqual(q.calls, [['in', 'district', ['А', 'Б', 'В']]]);
});

// ---------- ⑨ locationData — хорооны НЭГДЭЛ (getKhoroosForDistricts) ----------
t('getKhoroosForDistricts: 1 дүүрэг = getKhoroos-той ЯГ ижил (регресс)', () => {
  const one = getKhoroos('Улаанбаатар', 'Баянгол');
  assert.deepEqual(getKhoroosForDistricts('Улаанбаатар', ['Баянгол']), one);
  // ⚠️ Скаляр (хуучин) ч мөн адил ✓
  assert.deepEqual(getKhoroosForDistricts('Улаанбаатар', 'Баянгол'), one);
  assert.ok(one.length > 0, 'Баянгол хороотой байх ёстой ✗');
});

t('getKhoroosForDistricts: 2 дүүрэг → НЭГДЭЛ, хорооны НЭРЭЭР давхцалгүй', () => {
  const b = getKhoroos('Улаанбаатар', 'Баянгол');    // 33 хороо
  const s = getKhoroos('Улаанбаатар', 'Сүхбаатар');  // 20 хороо
  const union = getKhoroosForDistricts('Улаанбаатар', ['Баянгол', 'Сүхбаатар']);
  // ⚠️ Хорооны нэр («3-р хороо») дүүрэг хооронд ДАВХЦДАГ тул нэгдэл нь
  //    нэрээрээ цэвэр байх ЁСТОЙ — эс бөгөөс чип 2 удаа харагдана ✗
  assert.deepEqual(union, [...new Set([...b, ...s])]);
  assert.equal(new Set(union).size, union.length, 'нэрээр давхцал байх ёсгүй ✗');
  assert.ok(union.length <= b.length + s.length, 'нэгдэл нийлбэрээс их байх ёсгүй ✗');
  // Баянгол 33, Сүхбаатар 20 → «33-р хороо» нь зөвхөн Баянголаас ирнэ ✓
  assert.ok(union.includes('33-р хороо'), '«33-р хороо» нэгдэлд байх ёстой ✗');
  assert.ok(union.includes('20-р хороо'));
  assert.ok(b.length > s.length, 'Баянгол (33) Сүхбаатараас (20) олон ✗');
});

t('getKhoroosForDistricts: 3 дүүрэг ч зөв (эхний дүүрэг ТҮРҮҮЛНЭ, давхцалгүй ✓)', () => {
  const list = ['Хан-Уул', 'Сонгинохайрхан', 'Налайх'];
  const a = getKhoroos('Улаанбаатар', 'Хан-Уул');
  const out = getKhoroosForDistricts('Улаанбаатар', list);
  // ⚠️ Эхний дүүрэг бүтнээрээ түрүүлж, дараа нь ШИНЭ нэрс л нэмэгдэнэ ✓
  assert.deepEqual(out.slice(0, a.length), a);
  assert.deepEqual(out,
    [...new Set(list.flatMap((d) => getKhoroos('Улаанбаатар', d)))]);
  assert.equal(new Set(out).size, out.length);
});

t("getKhoroosForDistricts: хоосон/танихгүй хот → [] (хорооны блок НУУГДАНА)", () => {
  assert.deepEqual(getKhoroosForDistricts('Улаанбаатар', []), []);
  assert.deepEqual(getKhoroosForDistricts('Улаанбаатар', null), []);
  assert.deepEqual(getKhoroosForDistricts('Дархан-Уул', ['Дархан']), []); // аймагт хороо байхгүй ✓
});

t('getDistricts: УБ-ын 9 дүүрэг ба аймгийн сумд нь нэг эх сурвалж (регресс)', () => {
  assert.equal(getDistricts('Улаанбаатар').length, 9);
  assert.ok(getDistricts('Улаанбаатар').includes('Баянгол'));
  assert.ok(getDistricts('Дархан-Уул').length > 0);
  assert.deepEqual(getDistricts(''), []);
});

// ---------- ⑩ ЭХ ФАЙЛЫН ГЭРЭЭ (UI/URL/DB/breadcrumb нэг эх сурвалж) ----------
t('lib/queries.js: `applyDistrictFilter`-ийг хэрэглэнэ (дүрмийг ДАХИН бичихгүй)', () => {
  const src = readSrc('lib/queries.js');
  assert.match(src, /import \{ applyDistrictFilter \} from '\.\/districtFilter\.mjs'/, 'импорт алга ✗');
  assert.match(src, /applyDistrictFilter\(query, filters\.districts \?\? filters\.district\)/, 'шүүлт холбогдоогүй ✗');
  // ⚠️ Хуучин `if (filters.district) query.eq(...)` гэсэн ДАВХАР дүрэм үлдэх ЁСТОЙ
  assert.ok(!/if \(filters\.district\)/.test(src), 'хуучин давхар дүрэм үлдсэн ✗');
});

t('🗺 HomeClient.jsx: дүүргийн шүүлт нь URL/DB/цэвэрлэгээг модулиас авна — хүсэлт ①', () => {
  const ui = codeOnly(readSrc('components/HomeClient.jsx'));
  // ① НЭГ ЭХ СУРВАЛЖ — модулийн импорт/функцууд (дүрмийг давхар бичихгүй ✓)
  assert.match(ui, /parseDistrictList/, 'parseDistrictList (URL унших) алга ✗');
  assert.match(ui, /districtsUrlValue/, 'districtsUrlValue (URL бичих) алга ✗');
  assert.match(ui, /districtsFilterLabel/, 'districtsFilterLabel (шошго) алга ✗');
  // ② Хот солиход дүүрэг/хороо цэвэрлэгдэнэ; дүүрэг солиход хороо цэвэрлэгдэнэ
  assert.match(ui, /k === 'city'\) \{ next\.districts = \[\]; next\.khoroos = \[\]; \}/,
    'хот солиход цэвэрлэх логик алга ✗');
  assert.match(ui, /k === 'districts' \|\| k === 'district'\)/, 'дүүрэг солиход хороо цэвэрлэх логик алга ✗');
  // ③ 🆕 2026-10-04 (28) — ХҮСЭЛТ: «Дэлгэрэнгүй хайлт-ийн Байршил сонголтыг
  //    толгойн «📍 Бүх байршил» шиг сонгодог болго» ⇒ сайдбарын 3 шатлалт
  //    (Хот/Аймаг `<select>` → дүүргийн чип → хорооны чип) блок БҮХЭРЛЭЭ
  //    ХАСАГДАЖ, оронд нь НЭГ товч → `LocationPicker` (modal) ✓
  //    ⚠️ Тиймээс дүүрэг/хорооны DOM дэгээнүүд ЭНД БАЙХ ЁСТОЙ БИШ
  //       (доорх LocationPicker тест дээр шалгана) — эс бөгөөс 2 өөр UI ✗
  assert.ok(!/data-district-filter/.test(ui), 'сайдбарт хуучин дүүргийн блок үлдсэн ✗');
  assert.ok(!/data-district-value/.test(ui), 'сайдбарт хуучин дүүргийн чип үлдсэн ✗');
  assert.ok(!/Дүүрэг \/ Сум — Бүгд/.test(ui), 'хуучин «Дүүрэг / Сум — Бүгд» option үлдсэн ✗');
  assert.ok(!/value=\{filters\.district\}/.test(ui), 'хуучин скаляр `filters.district` үлдсэн ✗');
  assert.ok(!/clearDistricts/.test(ui), 'хуучин `clearDistricts()` үлдсэн ✗');
  // ④ Нэг товч + pill + «✕ Цэвэрлэх» нь `applyLocation`-той холбогдсон ✓
  assert.match(ui, /data-sidebar-location/, 'сайдбарын «Байршил» товчны дэгээ алга ✗');
  assert.match(ui, /data-location-clear/, '«✕ Цэвэрлэх» товчны дэгээ алга ✗');
  assert.match(ui, /data-location-pill="district"/, 'дүүргийн pill-ийн дэгээ алга ✗');
  assert.match(ui, /data-location-pill="khoroo"/, 'хорооны pill-ийн дэгээ алга ✗');
  assert.match(ui, /const applyLocation = \(\{ city, districts, khoroos \}\) => \{/,
    'applyLocation (пикерээс ирсэн утга) алга ✗');
  assert.match(ui, /<LocationPicker/, 'LocationPicker-ийн хэрэглээ алга ✗');
});

t('📍 LocationPicker.jsx: дүүрэг/хороо нь ОЛОН СОНГОЛТТОЙ МӨР (`<select>` БИШ) — хүсэлт ①', () => {
  const ui = codeOnly(readSrc('components/LocationPicker.jsx'));
  // ① Блок ба мөрүүд DOM-д байгаа (CDP тестийн дэгээнүүд ✓)
  assert.match(ui, /data-district-filter/, 'дүүргийн блокийн дэгээ алга ✗');
  assert.match(ui, /data-district-value/, 'дүүргийн мөрийн дэгээ алга ✗');
  assert.match(ui, /data-khoroo-value/, 'хорооны мөрийн дэгээ алга ✗');
  assert.match(ui, /aria-pressed=\{checked\}/, 'мөр сонгогдсон төлөв (`aria-pressed`) алга ✗');
  assert.match(ui, /aria-label="Дүүрэг"/, '`aria-label="Дүүрэг"` бүлэг алга ✗');
  // ② НЭГ ЭХ СУРВАЛЖ — `toggleDistrictValue()` (HomeClient-ийн хуучин дүрэмтэй
  //    ЯГ ижил; дүрмийг энд ДАХИН бичихгүй ✓)
  assert.match(ui, /import \{ toggleDistrictValue \} from '\.\.\/lib\/districtFilter\.mjs'/,
    'toggleDistrictValue импорт алга ✗');
  assert.match(ui, /const toggleDistrict = /, 'toggleDistrict функц алга ✗');
  // ③ ⚠️ НЭГ СОНГОЛТТОЙ `<select>` БАЙХ ЁСТОЙ БИШ — дүүргийн баганыг л
  //    хайчилж авч шалгана (хотын багана ч одоо ЖАГСААЛТ — `<select>` БИШ ✓)
  const from = ui.indexOf('data-district-filter');
  assert.ok(from > 0, 'дүүргийн багана олдсонгүй ✗');
  const block = ui.slice(from, ui.indexOf('data-location-col="khoroo"', from));
  assert.ok(!/<select/.test(block), 'дүүргийн баганад хуучин `<select>` үлдсэн ✗');
  assert.ok(!/Дүүрэг \/ Сум — Бүгд/.test(block), 'хуучин «— Бүгд» option үлдсэн ✗');
  assert.ok(!/filters\.district\b/.test(block), 'хуучин скаляр `filters.district` үлдсэн ✗');
  // ④ ноорог → «Байршлыг хэрэглэх» дарахад л `onApply` дуудагдаж, пикер хаагдана ✓
  assert.match(ui, /onApply\(\{ city: draftCity, districts: draftDistricts, khoroos: draftKhoroos \}\)/,
    'onApply (ноорог → хэрэглэх) алга ✗');
  assert.match(ui, /data-apply-location/, '«Байршлыг хэрэглэх» товчны дэгээ алга ✗');
  assert.match(ui, /aria-label="Хаах"/, '✕ хаах товч алга ✗');
  // ⑤ Хорооны багана ЗӨВХӨН дүүрэг сонгосон үед гарна + 💡 зөвлөгөө
  //    (`scripts/cdp-districts.mjs` нь hint-ийг шалгана ✓)
  assert.match(ui, /draftDistricts\.length > 0/, 'хорооны баганын нөхцөл алга ✗');
  assert.match(ui, /Дүүрэг сонгоход хорооны жагсаалт нээгдэнэ/,
    '💡 «…хорооны жагсаалт нээгдэнэ» зөвлөгөө алга ✗');
});

t('📱 LocationPicker.jsx: мобайл (<640px) DRILL-DOWN — НЭГ ДЭЛГЭЦЭД НЭГ ШАТЛАЛ (2026-10-04 (29))', () => {
  const ui = codeOnly(readSrc('components/LocationPicker.jsx'));
  // ① Мобайл блок байгаа ба каскад багана нь мобайлд НУУГДАНА (`hidden … sm:flex`)
  //    ⚠️ DOM-д ХЭВЭЭР (зөвхөн CSS) — CDP-ийн `[data-district-value]` (=9)
  //       тоо мобайл дээр ч хадгалагдана ✓
  assert.match(ui, /data-mobile-location/, 'мобайл drill-down блок алга ✗');
  assert.match(ui, /className="mt-3 hidden gap-3[^"]*sm:flex/,
    'каскад багана мобайлд нуугдах ёстой (`hidden … sm:flex`) ✗');
  // ② Шатлал нь 3: Хот/Аймаг → Дүүрэг → Хороо (`mStep` state)
  assert.match(ui, /useState\('city'\)/, "мобайл шатлалын `mStep` state алга ✗");
  assert.match(ui, /mStep === 'district'/, 'дүүргийн дэлгэц алга ✗');
  assert.match(ui, /mStep === 'khoroo'/, 'хорооны дэлгэц алга ✗');
  // ③ Мобайл мөрүүд нь `data-mobile-*` дэгээтэй — CDP-ийн `[data-district-value]`
  //    тоог (9) ХОЁР ДАХИН тоолохгүйн тулд (`AddListingClient.jsx`-ийн ИЖИЛ арга ✓)
  assert.match(ui, /data-mobile-city/, 'мобайл хотын мөр алга ✗');
  assert.match(ui, /data-mobile-district-value/, 'мобайл дүүргийн мөр алга ✗');
  assert.match(ui, /data-mobile-khoroo-value/, 'мобайл хорооны мөр алга ✗');
  // ④ Мобайл блок дотор ХУУЧИН дэгээ (`data-district-value` / `data-khoroo-value`)
  //    ДАВХАР БАЙХГҮЙ — эс бөгөөс CDP 9-ийн оронд 18 мөр тоолж ХУУРАМЧ улаан ✗
  const from = ui.indexOf('data-mobile-location');
  const to = ui.indexOf('data-apply-location', from);
  assert.ok(from > 0 && to > from, 'мобайл блок / доод товч олдсонгүй ✗');
  const mob = ui.slice(from, to);
  assert.ok(!/data-district-value/.test(mob), 'мобайлд хуучин `data-district-value` давхардсан ✗');
  assert.ok(!/data-khoroo-value/.test(mob), 'мобайлд хуучин `data-khoroo-value` давхардсан ✗');
  // ⑤ Мобайл ба desktop НЭГ эх сурвалж — ижил дүрэм (`toggleDistrictValue`) ✓
  assert.match(ui, /onDrill=\{getKhoroos\(draftCity, d\)\.length > 0/,
    'дүүргийн «нэр → хороо руу орох» нөхцөл алга ✗');
  // ⑥ 2026-10-04 (30) — хэрэглэгчийн гомдол («гар утсаас хороо нь гарч
  //    ирэхгүй байх юм»): ХОЁР хүрэх цэг ТУС ТУСДАА байх ЁСТОЙ —
  //    НЭР = дотор орох (хороо), CHECKBOX = зөвхөн сонгох
  assert.ok(ui.includes('— хороо руу орох'), '«нэр → хороо руу орох» товч алга ✗');
  assert.ok(ui.includes('— сонгох'), 'checkbox-ийн «сонгох» aria-label алга ✗');
  assert.match(ui, /if \(!onDrill\)/,
    'хороо БАЙХГҮЙ үед бүтэн мөр нэг товч байх салбар алга ✗');
});

t('🛏 HomeClient.jsx: «Өрөөний тоо»-гийн доорх «Өрөө» ТЕКСТ арилав — хүсэлт ②', () => {
  const src = readSrc('components/HomeClient.jsx');
  const ui = codeOnly(src);
  // ⚠️ Зөвхөн «Өрөө» гэсэн ГАНЦ мөр (шошго) байхгүй байх ёстой —
  //    «Өрөөний тоо» гэсэн ЖИНХЭНЭ гарчиг хэвээр үлдэнэ ✓
  assert.ok(!/\n\s*Өрөө\s*\n/.test(ui), '«Өрөө» гэсэн илүүц шошго үлдсэн ✗');
  assert.ok(!/>\s*Өрөө\s*</.test(ui), '«Өрөө» гэсэн ганц текст зангилаа үлдсэн ✗');
  // Гарчиг ба «N сонгосон» badge ХЭВЭЭР (өөрчлөгдөөгүй ✓)
  assert.match(src, /Өрөөний тоо/, '«Өрөөний тоо» гарчиг алга болсон ✗');
  assert.match(ui, /data-room-filter/, 'өрөөний блок алга болсон ✗');
  assert.match(ui, /data-room-value/, 'өрөөний чип алга болсон ✗');
  /**
   * ⚠️ badge нь «N сонгосон» хэвээр (`cdp-rooms.mjs` бодит текстээр шалгана ✓)
   * 🆕 2026-10-06: «Өрөөний тоо» нь сайдбарт (`SideBlock label="Өрөөний тоо"`,
   *    📍 Байршил-ийн доор) буцав ⇒ badge-ийн тоо нь `{filters.rooms.length}` —
   *    СОНГОЛТТОЙ үед л render болно ✓ (`FilterPill` нь зөвхөн `filterBar: true`
   *    тугтай attr pill-үүдэд үлдсэн — өрөө/төлбөрт БИШ ✓)
   */
  assert.match(ui, /SideBlock label="Өрөөний тоо"/,
    'өрөөний блок нь сайдбарын `SideBlock` БИШ ✗');
  assert.match(ui, /\{filters\.rooms\.length\} сонгосон/,
    'өрөөний «N сонгосон» тоо холбоо алга ✗');
  assert.match(ui, /data-filter-pill=\{testKey\}/, '`FilterPill`-ийн `data-filter-pill` дэгээ алга ✗');
});

t('lib/breadcrumb.js: `districts` (массив) → URL ба шошго модулиар', () => {
  const src = readSrc('lib/breadcrumb.js');
  assert.match(src, /districtsUrlValue, isDistrictsEmpty, districtsFilterLabel,/, 'импорт алга ✗');
  assert.match(src, /from '\.\/districtFilter\.mjs'/, 'модулийн зам алга ✗');
  assert.match(src, /districtsUrlValue\(districts \?\? district\)/, 'URL угсрах ✗');
  assert.match(src, /districtsFilterLabel\(districtList\)/, 'crumb-ийн шошго ✗');
  assert.match(src, /filters: \{ districts: \[\], khoroos: \[\] \}/, 'crumb дээр цэвэрлэх ✗');
  assert.ok(!/district: ''/.test(src), "`district: ''` (текст) үлдсэн ✗");
});

t('🐍 CDP скрипт нь пикер БАЙГААГ ба дарах замыг шалгана — `scripts/cdp-districts.mjs`', () => {
  const cdp = readSrc('scripts/cdp-districts.mjs');
  // ⓪ Сайдбарт НЭГ товч (`[data-sidebar-location]`) + пикер (modal) нээх зам
  assert.match(cdp, /data-sidebar-location/, 'сайдбарын товчийг олдоггүй ✗');
  assert.match(cdp, /data-location-picker/, 'пикерийг DOM-оос олдоггүй ✗');
  assert.match(cdp, /data-apply-location/, '«Байршлыг хэрэглэх» товчийг олдоггүй ✗');
  assert.match(cdp, /data-location-clear/, 'сайдбарын «✕ Цэвэрлэх» товчийг олдоггүй ✗');
  assert.match(cdp, /data-location-pill/, 'pill-үүдийг тоолдоггүй ✗');
  // ① Мөрүүд (дүүрэг/хороо) — НЭГ `[data-district-filter]` блок дотор ✓
  assert.match(cdp, /data-district-value/, 'дүүргийн мөрийг DOM-оос олдоггүй ✗');
  assert.match(cdp, /data-district-filter/, 'блокийг олдоггүй ✗');
  assert.match(cdp, /data-khoroo-value/, 'хорооны мөрийг DOM-оос олдоггүй ✗');
  // ② Дарах зам: нээх → ноорог сонгох → хэрэглэх (`openPicker`/`applyPicker`)
  assert.match(cdp, /const openPicker = \(\) => evalJs\(/, '`openPicker()` алга ✗');
  assert.match(cdp, /const applyPicker = \(\) => evalJs\(/, '`applyPicker()` алга ✗');
  assert.match(cdp, /const closePicker = \(\) => evalJs\(/, '`closePicker()` алга ✗');
  assert.match(cdp, /clickDistrict\(/, 'дүүрэг дарах код алга ✗');
  assert.match(cdp, /clickKhoroo\(/, 'хороо дарах код алга ✗');
  // ③ DB дээрх шалгалт — олон утга `in.(…)`, нэг утга `eq.`
  assert.match(cdp, /district=in\./, 'DB дээрх `in.(…)` шалгалт алга ✗');
  assert.match(cdp, /district=eq\./, 'хуучин `eq.` (нэг утга) шалгалт алга ✗');
  // ⚠️ «Өрөө» текст арилсныг ч шалгана (хүсэлт ② ✓)
  assert.match(cdp, /Өрөө гэсэн/, '«Өрөө» текст байхгүйг шалгах хэсэг алга ✗');
  // ⚠️ «Хэрэглэх»-ээс ӨМНӨ URL/DB ХӨНДӨГДӨХГҮЙ (ноорог/draft) гэсэн шалгалт
  //    ЗААВАЛ байх ёстой — эс бөгөөс пикерийн гол утга алдагдана ✗
  assert.match(cdp, /«Хэрэглэх»-ээс ӨМНӨ URL ХӨНДӨГДӨХГҮЙ/,
    'ноорог (draft) үед URL хөндөгдөхгүй гэсэн шалгалт алга ✗');
  // 🐛 REGRESSION HARNESS: `evalJs(\`(() => { … })()\`)` — PROBE-ийн ДОТОР
  //    (коммент дотор ч) BACKTICK бичвэл template literal ЭРТ хаагдаж, Node
  //    талд «ReferenceError: select is not defined» гэж ГАРАГДАГ ✗
  //    (`node --check` нь ХОЁР backtick-ийг хос гэж үзээд ӨНГӨРӨӨДӨГ ✗)
  // ⚠️ Мөн BACKSLASH+SLASH (`\/`) бичих ХЯЗГААРТАЙ: template literal түүнийг
  //    зүгээр slash болгож задлаад regex нь эвдэрч «Invalid regular expression
  //    flags» алдаа өгнө ✗ (ж: /Хот\/Аймаг/ → /Хот/Аймаг/)
  const probes = [...cdp.matchAll(/evalJs\(`([\s\S]*?)`\)/g)].map((m) => m[1]);
  // ⚠️ probe дотор backtick гарвал тухайн дуудлага нь ХОСГҮЙ болж, тоо нь
  //    evalJs(темплейт) дуудлагын тооноос ЦӨӨН гарна ⇒ алдааг барьж авна ✓
  const calls = (cdp.match(/evalJs\(`/g) || []).length;
  assert.ok(probes.length >= 5, `evalJs probe хэт цөөн (${probes.length}) ✗`);
  assert.equal(probes.length, calls,
    `evalJs(\`…\`) ${calls} дуудлагын ${probes.length} нь л зөв хаагдсан (нэг probe дотор BACKTICK байна ✗)`);
  probes.forEach((p, i) => {
    assert.ok(!/`/.test(p), `evalJs probe #${i + 1} дотор BACKTICK байна ✗`);
    assert.ok(!/\\\//.test(p), `evalJs probe #${i + 1} дотор BACKSLASH+SLASH байна ✗`);
  });
});

// ---------- ⑪ БОДИТ breadcrumb (модулийг ачаалж шалгана) ----------
// ⚠️ `lib/breadcrumb.js` нь `./locationData`-г ӨРГӨТГӨЛГҮЙ импортолдог тул
//    зөвхөн тэр мөрийг `.js` болгож, `lib/` дотор түр `.mjs` үүсгэнэ
//    (`test-breadcrumb.mjs`-ийн АДИЛ арга ✓)
const bcSrc = readSrc('lib/breadcrumb.js');
const bcPatched = bcSrc.replace(/from '\.\/locationData';/g, "from './locationData.js';");
assert(!/from '\.\/locationData';/.test(bcPatched), 'extensionless импорт засагдах ёстой');
const bcTmp = path.join(ROOT, 'lib', '.districts.test.tmp.mjs');
fs.writeFileSync(bcTmp, bcPatched);
const { buildHomeBreadcrumb, homeFilterHref } = await import(`${bcTmp}?t=${Date.now()}`);
fs.unlinkSync(bcTmp);

const crumbs = (state) => buildHomeBreadcrumb(state).map((i) => i.label);

t('homeFilterHref: `districts` массив → `?district=А,Б`; [] → параметр БАЙХГҮЙ', () => {
  const href = homeFilterHref({ section: 'real-estate', districts: ['Баянгол', 'Сүхбаатар'] });
  assert.match(decodeURIComponent(href), /district=Баянгол,Сүхбаатар/, href);
  assert.ok(!/district=/.test(homeFilterHref({ districts: [] })), 'хоосон үед бичигдэх ёсгүй ✗');
  // ⚠️ Хуучин скаляр ч ажиллана (бусад дуудагч/тест эвдрэхгүй ✓)
  assert.match(decodeURIComponent(homeFilterHref({ district: 'Баянгол' })), /district=Баянгол/);
});

t('buildHomeBreadcrumb: 1 дүүрэг → НЭРЭЭР (хуучин зан ХЭВЭЭР ✓)', () => {
  const list = crumbs({ section: 'real-estate', propertyType: 'Орон сууц', districts: ['Баянгол'] });
  assert.equal(list[list.length - 1], 'Баянгол');
  // ⚠️ Хуучин скаляр дуудлага ч ижил үр дүн өгнө ✓
  const legacy = crumbs({ section: 'real-estate', propertyType: 'Орон сууц', district: 'Баянгол' });
  assert.deepEqual(legacy, list);
});

t('buildHomeBreadcrumb: 2 дүүрэг → «2 дүүрэг» + линк `district=…,Сүхбаатар`', () => {
  const items = buildHomeBreadcrumb({
    section: 'real-estate', category: 'sell', propertyType: 'Орон сууц',
    districts: ['Баянгол', 'Сүхбаатар'],
  });
  const last = items[items.length - 1];
  // 🏷️ 2026-10-03 (14): «2 дүүрэг/сум» → «2 дүүрэг» (`districtsFilterLabel`)
  assert.equal(last.label, '2 дүүрэг');
  assert.match(decodeURIComponent(last.href), /district=Баянгол,Сүхбаатар/);
  // 🛣 Crumb дээр дарахад дүүрэг/хороо БҮГД арилна (бусад шүүлт хэвээр)
  assert.deepEqual(last.nav.filters, { districts: [], khoroos: [] });
  assert.equal(last.nav.category, 'sell');
});

t('buildHomeBreadcrumb: дүүрэг сонгоогүй бол crumb НЭМЭГДЭХГҮЙ (регресс)', () => {
  const list = crumbs({ section: 'real-estate', propertyType: 'Орон сууц', districts: [] });
  assert.ok(!list.includes('Баянгол'), 'дүүргийн crumb байх ёсгүй ✗');
  assert.deepEqual(crumbs({ section: 'real-estate', propertyType: 'Орон сууц', district: '' }), list);
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);
