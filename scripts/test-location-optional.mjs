// ============================================================
// test-location-optional.mjs — 📍 «Байршил сонгохгүй» ЧЕКБОКСЫН ГЭРЭЭ
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-06): «Магадгүй зарим хэрэглэгч зарын
//    Байршилаа оруулахыг хүсэхгүй хүн байж магадгүй. Тэдгээр хүмүүст зориулж
//    Байршил хэрэглэхгүй гэсэн сонголтыг (Check box ч юм уу) Байршил хэсэгт
//    оруулж өгье» ⇒ ЭНЭ тест тэр засварын гэрээг түгжинэ ✓
//
// ХАМРАХ ХҮРЭЭ:
//   ① `lib/listingLocation.mjs` — БҮХ цэвэр дүрэм (флаг, форм, шалгалт, мөр)
//   ② Чекбоксын round-trip — өгөгдөл АЛДАГДАХГҮЙ (асаа → унтраа)
//   ③ ШАЛГАЛТ — «сонгоогүй» (алдаа) ба «сонахгүй гэж шийдсэн» ЯЛГААГДАНА
//   ④ ГЭРЭЭ — `AddListingClient` (форм · ✓ чекбокс · 🖥 багана · 📱 дэлгэц)
//   ⑤ DB — `noLocation` нь DB РҮҮ ЯВАХГҮЙ + migration НЭМЭГДЭЭГҮЙ (0 өөрчлөлт)
//   ⑥ ХАРУУЛАЛТ — карт/дэлгэрэнгүй/миний зарууд («Байршил заагаагүй»)
//   ⑦ 📄 README + `package.json` (тест бүртгэгдсэн эсэх)
//
// АЖИЛЛУУЛАХ:  npm run test:location
// ⚠️ DB/React/CDP ХОЛБОГДОХГҮЙ — зөвхөн Node (цэвэр модуль + эх файлын гэрээ).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  DEFAULT_CITY, NO_LOCATION_LABEL, NO_LOCATION_TITLE, NO_LOCATION_HINT,
  NO_LOCATION_SUMMARY, isNoLocation, cityOf, hasLocation, locationMissing,
  noLocationPatch, bankedLocation, restoreLocationPatch, locationPathText,
} from '../lib/listingLocation.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
/** 📄 Эх файлыг унших (ГЭРЭЭ/регрессийн шалгалтад) */
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/**
 * 🧹 ЗӨВХӨН КОДЫН МӨРҮҮД (мөр ба блок тайлбарын мөрийг хасна) — тайлбар
 *    доторх «хуучин» кодыг регресс гэж андуурахгүйн тулд (`test-prefill`-тэй ижил)
 */
const codeLines = (src) => src
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join('\n');

/**
 * 🧹 JSX-ийн БЛОК тайлбарыг (`{/* … *\/}`) хасна — `codeLines` нь тэдгээрийг
 *    «код» гэж үздэг (мөр нь `{/*`-ээр эхэлдэг тул) ✗. ⚠️ Регресс шалгалт нь
 *    тайлбар доторх ХУУЧИН текстээр хуурамчаар унахгүйн тулд хэрэгтэй ✓
 */
const stripJsxComments = (src) => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
/** 📄 Файлын ЦЭВЭР код (мөр + JSX тайлбар хоёуланг нь хассан) */
const codeOnly = (rel) => codeLines(stripJsxComments(readSrc(rel)));

/**
 * 📄 `lib/format.js → formatAddress()`-ийг ажиллуулж шалгана.
 * ⚠️ ЯАГААД ТҮР ФАЙЛ ВЭ: `lib/format.js` нь `./locationData`-г ӨРГӨТГӨЛГҮЙ
 *    (extensionless) импортолдог тул Node-ийн ESM resolver ажиллахгүй ✗ —
 *    `scripts/test-format.mjs`-ийн ЯГ ижил аргаар зөвхөн тэр импортыг хасч
 *    түр файлаас ачаална ✓ (`formatAddress` нь `locationData`-аас хамаарахгүй)
 */
const fmtSrc = readSrc('lib/format.js').replace(/^import .*from '\.\/locationData';?$/m, '');
const fmtTmp = path.join(ROOT, '.format.location.tmp.mjs');
fs.writeFileSync(fmtTmp, fmtSrc);
const { formatAddress } = await import(`${fmtTmp}?t=${Date.now()}`);
fs.unlinkSync(fmtTmp);

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🧪 📍 «Байршил сонгохгүй» чекбокс (lib/listingLocation.mjs)\n');

/** Бодит форм (товчилсон — `AddListingClient.emptyForm()`-ийн хэлбэр) */
const form = (over = {}) => ({
  section: 'real-estate', propertyType: 'Орон сууц', rooms: '3', area: '75',
  city: DEFAULT_CITY, district: 'Баянгол', khoroo: '1-р хороо', noLocation: false,
  // 🗺 Солбицол (2026-10-06) — бодит `emptyForm()` нь ч `latitude`/`longitude`-той
  //    тул гэрээний round-trip нь ЯГ формойн хэлбэрийг тусгана ✓
  latitude: null, longitude: null,
  price: '250', title: '3 өрөө байр', ...over,
});

// ────────────────────────────────────────────────────────────
// ① МОДУЛИЙН ДҮРЭМ — флаг ба форм
// ────────────────────────────────────────────────────────────
console.log('── ① Дүрэм: флаг · байршил · шалгалт ──');

t('① `isNoLocation` — ЗӨВХӨН `=== true` (бохир утга хүчингүй)', () => {
  assert.equal(isNoLocation({ noLocation: true }), true);
  assert.equal(isNoLocation({ noLocation: false }), false);
  assert.equal(isNoLocation({ noLocation: 'true' }), false); // ⚠️ JSON-оос ирсэн мөр
  assert.equal(isNoLocation({ noLocation: 1 }), false);
  assert.equal(isNoLocation({}), false);
  assert.equal(isNoLocation(null), false);
  assert.equal(isNoLocation(undefined), false);
});

t('① `hasLocation` — чекбокс асаалттай бол `city` үлдсэн ч `false`', () => {
  assert.equal(hasLocation(form()), true);
  assert.equal(hasLocation(form({ noLocation: true, city: '' })), false);
  // ⚠️ Ховор (гараар бичсэн) төлөв — чекбокс нь ДАВАМГАЙЛНА ✓
  assert.equal(hasLocation(form({ noLocation: true })), false);
  assert.equal(hasLocation(form({ city: '   ' })), false);
  assert.equal(hasLocation(null), false);
});

t('① `hasLocation` — DB-ийн мөрөнд (`noLocation` талбар БАЙХГҮЙ) зөв ажиллана', () => {
  assert.equal(hasLocation({ city: 'Улаанбаатар', district: 'Баянгол' }), true);
  assert.equal(hasLocation({ city: '', district: null, khoroo: null }), false);
});

t('① `cityOf` — trim + бус төрөл аюулгүй (`\'\'`)', () => {
  assert.equal(cityOf({ city: '  Улаанбаатар ' }), 'Улаанбаатар');
  assert.equal(cityOf({ city: '' }), '');
  assert.equal(cityOf({ city: null }), '');
  assert.equal(cityOf({}), '');
  assert.equal(cityOf(undefined), '');
});

t('① `locationMissing` — «сонгоогүй» (алдаа) ба «сонгохгүй» ЯЛГААГДАНА', () => {
  assert.equal(locationMissing(form({ city: '' })), true); // ← validateStep алдаа ✓
  assert.equal(locationMissing(form({ city: '', noLocation: true })), false); // ← чекбокс ✓
  assert.equal(locationMissing(form()), false);
  assert.equal(locationMissing(form({ city: '  ', district: '', khoroo: '' })), true);
  assert.equal(locationMissing(null), true);
});

t('① 📄 текстүүд — нэг эх сурвалж (UI ба тест ижил мөр хэрэглэнэ)', () => {
  assert.equal(DEFAULT_CITY, 'Улаанбаатар');
  assert.equal(NO_LOCATION_LABEL, 'Байршил заагаагүй');
  // ⚠️ «Хаяг тодорхойгүй» гэсэн ХУУЧИН (алдаа мэт) текст БУЦАЖ ОРОХГҮЙ байх ✓
  assert.equal(NO_LOCATION_LABEL.includes('тодорхойгүй'), false);
  [NO_LOCATION_TITLE, NO_LOCATION_HINT, NO_LOCATION_SUMMARY].forEach((s) => {
    assert.equal(typeof s === 'string' && s.length > 10, true);
  });
  assert.ok(NO_LOCATION_TITLE.includes('Байршил сонгохгүй'));
  assert.ok(NO_LOCATION_HINT.includes('ХАРАГДАХГҮЙ'));
});


// ────────────────────────────────────────────────────────────
// ② ЧЕКБОКСЫН ROUND-TRIP — өгөгдөл алдагдахгүй
// ────────────────────────────────────────────────────────────
console.log('\n── ② Чекбокс: асаах → унтраах (round-trip) ──');

/** 🖱 Чекбокс АСААХ (компонентийн `toggleNoLocation(true)`-тэй ЯГ ИЖИЛ дараалал) */
const toggleOn = (f, bank) => {
  bank.ref = bankedLocation(f);
  return { ...f, ...noLocationPatch() };
};
/** 🖱 Чекбокс УНТРААХ (компонентийн `toggleNoLocation(false)`-тэй ЯГ ИЖИЛ) */
const toggleOff = (f, bank) => {
  const next = { ...f, ...restoreLocationPatch(bank.ref) };
  bank.ref = null;
  return next;
};

t('② АСААХАД: 3 талбар ЦЭВЭРЛЭГДЭж, бусад талбар ХӨНДӨГДӨХГҮЙ', () => {
  const bank = { ref: null };
  const on = toggleOn(form(), bank);
  assert.deepEqual(
    { city: on.city, district: on.district, khoroo: on.khoroo, noLocation: on.noLocation },
    { city: '', district: '', khoroo: '', noLocation: true });
  // ⚠️ Үлдсэн форм (хэсэг/төрөл/үнэ/гарчиг …) ЯГ хэвээр ✓
  assert.equal(on.price, '250');
  assert.equal(on.title, '3 өрөө байр');
  assert.equal(on.propertyType, 'Орон сууц');
  assert.deepEqual(bank.ref, {
    city: 'Улаанбаатар', district: 'Баянгол', khoroo: '1-р хороо',
    latitude: null, longitude: null,
  });
});

t('② УНТРААХАД: өмнөх сонголт БУЦАЖ ирнэ (алдагдахгүй)', () => {
  const bank = { ref: null };
  const back = toggleOff(toggleOn(form(), bank), bank);
  assert.deepEqual(
    { city: back.city, district: back.district, khoroo: back.khoroo, noLocation: back.noLocation },
    { city: 'Улаанбаатар', district: 'Баянгол', khoroo: '1-р хороо', noLocation: false });
  assert.equal(bank.ref, null);
});

t('② АСАА → УНТРАА → АСАА → УНТРАА — форм ЯГ анхныхтайгаа тэнцэнэ', () => {
  const bank = { ref: null };
  const start = form();
  let f = toggleOn(start, bank);
  f = toggleOff(f, bank);
  f = toggleOn(f, bank);
  f = toggleOff(f, bank);
  assert.deepEqual(f, start); // ⚠️ ЯГ тэнцүү (дэс дараалал давтагдана ✓)
});

t('② Хот СОНГООГҮЙ үед унтраавал — анхдагч хот (`DEFAULT_CITY`)', () => {
  const bank = { ref: null };
  // ⚠️ «сонгоогүй» (city '') формоос чекбокс асааж, дараа нь унтраалаа
  const back = toggleOff(toggleOn(form({ city: '', district: '', khoroo: '' }), bank), bank);
  assert.equal(back.city, DEFAULT_CITY);
  assert.equal(locationMissing(back), false); // → «Үргэлжлүүлэх» боломжтой ✓
});

t('② 🧹 бохир утга (зай/`null`) — round-trip дээр ч цэвэр болно', () => {
  const bank = { ref: null };
  const back = toggleOff(
    toggleOn(form({ city: '  Дархан-Уул ', district: null, khoroo: 5 }), bank), bank);
  assert.deepEqual(
    { city: back.city, district: back.district, khoroo: back.khoroo },
    { city: 'Дархан-Уул', district: '', khoroo: '' });
});

t('② 📝 НООРОГ (localStorage JSON) — `noLocation` round-trip-д үлдэнэ', () => {
  const on = toggleOn(form(), { ref: null });
  const fromDraft = JSON.parse(JSON.stringify({ form: on })).form;
  assert.equal(isNoLocation(fromDraft), true);
  assert.equal(hasLocation(fromDraft), false);
  // ⚠️ Хуучин ноорог (`noLocation` БАЙХГҮЙ) — `false` мэт уншигдана ✓
  const old = JSON.parse(JSON.stringify({ form: form({ city: '' }) })).form;
  delete old.noLocation;
  assert.equal(isNoLocation(old), false);
  assert.equal(hasLocation(old), false);
});


// ────────────────────────────────────────────────────────────
// ③ ШАЛГАЛТ (`validateStep('location')`) — алдаа vs зөвшөөрөгдөх
// ────────────────────────────────────────────────────────────
console.log('\n── ③ Шалгалт: 2-р алхмаас ЦААШ гарах нөхцөл ──');

/** `AddListingClient.validateStep('location')`-ийн дүрэм (нэг эх сурвалж) */
const locationStepMsg = (f) => (locationMissing(f) ? 'Хот/Аймгаа сонгоно уу' : '');

t('③ Чекбокс УНТРААЛТТАЙ + хот хоосон ⇒ АЛДАА (хуучин зан ХЭВЭЭР)', () => {
  assert.equal(locationStepMsg(form({ city: '', district: '', khoroo: '' })), 'Хот/Аймгаа сонгоно уу');
});

t('③ Чекбокс АСААЛТТАЙ + хот хоосон ⇒ АЛДААГҮЙ (цааш явах боломжтой ✓)', () => {
  assert.equal(locationStepMsg(form({ city: '', district: '', khoroo: '', noLocation: true })), '');
});

t('③ Чекбокс УНТРААЛТТАЙ + хот сонгосон ⇒ АЛДААГҮЙ (хуучин зан ХЭВЭЭР)', () => {
  assert.equal(locationStepMsg(form()), '');
});

t('③ Дүүрэг/хороо сонгоогүй ч — ЗӨВХӨН хот хангалттай (хуучин зан ХЭВЭЭР)', () => {
  assert.equal(locationStepMsg(form({ district: '', khoroo: '' })), '');
});
// ────────────────────────────────────────────────────────────
// ④ ГЭРЭЭ — `components/AddListingClient.jsx` (эх код)
// ────────────────────────────────────────────────────────────
console.log('\n── ④ ГЭРЭЭ: форм · ✓ чекбокс · 🖥 багана · 📱 дэлгэц ──');

const FORM = codeLines(readSrc('components/AddListingClient.jsx'));

t('④ Модуль импортлогдсон (цэвэр дүрэм — форм дотор давхардуулаагүй)', () => {
  assert.ok(FORM.includes("from '../lib/listingLocation.mjs'"), 'import алга');
  assert.ok(FORM.includes('locationMissing(form)'), 'шалгалт модулиар дамжаагүй');
  assert.ok(FORM.includes('locationPathText(form)'), 'хураангуй модулиар дамжаагүй');
  // ⚠️ РЕГРЕСС барь: `!form.city` нь чекбоксыг ҮЛ ХАРДАГ ⇒ 2-р алхам дээр ГАЦНА ✗
  assert.equal(FORM.includes("if (!form.city) return 'Хот/Аймгаа сонгоно уу'"), false);
});

t('④ `emptyForm()` — `noLocation: false` + `city: DEFAULT_CITY`', () => {
  assert.ok(FORM.includes('noLocation: false'), 'шинэ талбар алга');
  assert.ok(FORM.includes('city: DEFAULT_CITY'), 'анхдагч хот нэг эх сурвалж биш');
  assert.equal(FORM.includes("city: 'Улаанбаатар'"), false, 'хатуу бичсэн хот үлдсэн');
});

t('④ Засах горим: `city === \'\'` ХАДГАЛАГДАна (хуурамч «Улаанбаатар» болохгүй)', () => {
  assert.ok(FORM.includes("city: typeof l.city === 'string' ? l.city : DEFAULT_CITY"));
  assert.ok(FORM.includes('noLocation: !l.city'));
  assert.equal(FORM.includes("city: l.city || 'Улаанбаатар'"), false, 'хуучин мөр үлдсэн ✗');
});

t('④ ✓ ЧЕКБОКС — `data-no-location` + controlled `checked={noLoc}`', () => {
  assert.ok(FORM.includes('data-no-location'), 'selector алга (CDP)');
  assert.ok(FORM.includes('data-no-location-input'));
  assert.ok(FORM.includes('checked={noLoc}'));
  assert.ok(FORM.includes('onChange={(e) => toggleNoLocation(e.target.checked)}'));
  assert.ok(FORM.includes('const noLoc = isNoLocation(form)'));
  assert.ok(FORM.includes("setMobileLocStep('city')"), '📱 дэлгэц сэргээхгүй байна');
});

t('④ 🖥 3 багана — ИДЭВХГҮЙ болно (мөрүүд DOM-д ХЭВЭЭР — CDP хөндөгдөхгүй)', () => {
  assert.ok(FORM.includes("data-location-disabled={noLoc ? 'true' : 'false'}"));
  assert.ok(FORM.includes("noLoc ? 'pointer-events-none opacity-40' : ''"));
  // ⚠️ Баганын тоо/жагсаалт ХӨНДӨГДӨӨГҮЙ (3 багана хэвээр) ✓
  assert.equal((FORM.match(/pickRole="loc-/g) || []).length, 3);
});

t('④ 📱 Дэлгэцүүд чекбокс асаалттай үед ГАРАХГҮЙ (алгасах боломж)', () => {
  assert.ok(FORM.includes('{!noLoc && ('), '📱 дэлгэц нуух нөхцөл алга');
  // ⚠️ `MobileQuestion` нь ХЭВЭЭР (зөвхөн нөхцөлөөр хүрээлэгдсэн) ✓
  assert.ok(FORM.includes('key={`loc-${mobileLocScreen.key}`}'));
});

t('④ 📝 НООРОГ — түлхүүрүүд `emptyForm()`-оос ⇒ `noLocation` автоматаар орно', () => {
  assert.equal((FORM.match(/keys: Object\.keys\(emptyForm\(\)\)/g) || []).length, 2);
  // ⚠️ Нооргийн ХУВИЛБАР хөндөгдөөгүй (хуучин ноорог хүчингүй болохгүй ✓)
  assert.ok(readSrc('lib/listingDraft.mjs').includes('export const DRAFT_VERSION = 1;'));
});

t('④ 2/3-р алхам — чекбокс асаалттай үед ХООСОН мөр/📌 гацалт гарахгүй', () => {
  assert.ok(FORM.includes('const pickedLocationPath = locationPathText(form)'));
  // ⚠️ Шууд текст (`{noLoc ? (NO_LOCATION_SUMMARY) : …}`) — JSX-ийг хасна ✓
  assert.ok(FORM.includes('NO_LOCATION_SUMMARY'));
  assert.ok(FORM.includes('{NO_LOCATION_TITLE}'));
  assert.ok(FORM.includes('{NO_LOCATION_HINT}'));
});

t('④ БАЙРЛАЛ (2 дахь засвар): 🚫 чекбокс нь байршлын хэсгийн ХАМГИЙН ДООД талд', () => {
  // ⚠️ Хэрэглэгчийн хүсэлт: «Байршил сонгохгүй гэсэн чекбоксыг байршил
  //    оруулах хэсгийнхээ ДООД талд нь оруулаад байрыг нь солиод өгөөч»
  // ⚠️ `codeOnly` (JSX тайлбарыг ХАССАН) — тайлбар доторх `data-no-location`
  //    гэсэн үг байрлалыг хуурамчаар «дээш» татахгүйн тулд ✓
  const CLEAN = codeOnly('components/AddListingClient.jsx');
  const box = CLEAN.indexOf('data-no-location');
  const mob = CLEAN.indexOf('{!noLoc && (');
  const grid = CLEAN.indexOf('data-location-disabled');
  const summary = CLEAN.indexOf('data-location-summary');
  assert.ok(box > 0 && mob > 0 && grid > 0 && summary > 0, 'элемент олдсонгүй');
  // ⚠️ ХУУЧИН (дээд) байрлал БУЦАЖ ОРОХГҮЙ: чекбокс нь 3-ЫН ДАРАА байх ёстой
  assert.ok(box > mob, '📱 сонголтын дэлгэцүүдээс ӨМНӨ байна ✗');
  assert.ok(box > grid, '🖥 3 баганат сонголтоос ӨМНӨ байна ✗');
  assert.ok(box > summary, '⚠️ «Сонгосон: …» мөрөөс ДООр байх ёстой ✗');
  // ⚠️ `mt-3` (дээд зай) — `mb-3` (доод зай) нь хуучин ДЭЭД байрлалын ул мөр ✗
  assert.ok(CLEAN.includes('mt-3 flex cursor-pointer items-start gap-2.5'), '`mt-3` биш');
  assert.equal(CLEAN.includes('mb-3 flex cursor-pointer'), false, 'хуучин `mb-3` үлдсэн ✗');
  // ⚠️ Хураангуйн заавар нь ШИНЭ байрлалтай нийцэв (чекбокс нь ТҮҮНИЙ ДООР ✓)
  assert.ok(NO_LOCATION_SUMMARY.includes('доорх чекбоксыг'), 'заавар «доорх» биш ✗');
  assert.equal(NO_LOCATION_SUMMARY.includes('дээрх'), false, 'хуучин «дээрх» үлдсэн ✗');
});


// ────────────────────────────────────────────────────────────
// ⑤ DB — 0 ӨӨРЧЛӨЛТ (`noLocation` нь DB рүү ЯВАХГҮЙ)
// ────────────────────────────────────────────────────────────
console.log('\n── ⑤ DB: танихгүй түлхүүр хаягдана · migration 0 ──');

const QUERIES = codeLines(readSrc('lib/queries.js'));

t('⑤ `listingPayloadToRow()` — талбар БҮРЭЭР зөвхөн мэдэгдэж буйг л авна', () => {
  const at = QUERIES.indexOf('function listingPayloadToRow(');
  assert.ok(at > 0, 'функц олдсонгүй');
  const body = QUERIES.slice(at, at + 2600);
  assert.ok(body.includes('city: payload.city'), 'хот DB рүү явахгүй байна');
  // ⚠️ Тархах (`...payload`) бичвэл `noLocation` нь БАГАНА БИШ алдаа өгнө ✗
  assert.equal(/\.\.\.\s*payload/.test(body), false, 'payload тархсан ✗');
  assert.equal(body.includes('noLocation'), false, 'DB руу `noLocation` явж байна ✗');
});

t('⑤ Шинэ багана нэмэх migration БАЙХГҮЙ (бүх SQL-ийг шалгав)', () => {
  const dir = path.join(ROOT, 'supabase', 'migrations');
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.sql'));
  assert.ok(files.length > 20, 'migration-ууд олдсонгүй');
  const hits = files.filter((f) => /no_location|noLocation|location_hidden|hide_location/
    .test(readSrc(`supabase/migrations/${f}`)));
  assert.deepEqual(hits, [], `санамсаргүй migration: ${hits.join(', ')}`);
});

t('⑤ `createListing`/`updateListing` — хуучин зам ХЭВЭЭР (нэг эх сурвалж)', () => {
  assert.ok(QUERIES.includes('const insertRow = { user_id: userId, ...listingPayloadToRow(payload) }'));
  assert.ok(QUERIES.includes('const row = listingPayloadToRow(payload);'));
});

// ────────────────────────────────────────────────────────────
// ⑥ ХАРУУЛАЛТ — байршилгүй зар «алдаа» мэт харагдахгүй
// ────────────────────────────────────────────────────────────
console.log('\n── ⑥ ХАРУУЛАЛТ: карт · дэлгэрэнгүй · миний зарууд ──');

t('⑥ `formatAddress()` — байршилгүй үед `\'\'` (карт дээр мөр ГАРАХГҮЙ)', () => {
  assert.equal(formatAddress({ city: '', district: null, khoroo: null }), '');
  assert.equal(formatAddress({ city: '' }), '');
  assert.equal(formatAddress(null), '');
  assert.equal(formatAddress({ city: 'Улаанбаатар', district: 'Баянгол', khoroo: null }), 'Баянгол, Улаанбаатар');
});

t('⑥ `ListingCard` — 📍 мөр нь ХЯНАЛТТАЙ (`{address && (…)`) ⇒ хоосон үед мөр байхгүй', () => {
  const card = codeLines(readSrc('components/ListingCard.jsx'));
  assert.ok(card.includes('{address && ('), 'хаяг хяналтгүй боллоо ✗');
  assert.ok(card.includes('formatAddress(listing)'));
});

t('⑥ `ListingDetailClient` — «Хаяг тодорхойгүй» БИШ «Байршил заагаагүй»', () => {
  const src = codeOnly('components/ListingDetailClient.jsx');
  assert.ok(src.includes("from '../lib/listingLocation.mjs'"), 'import алга');
  assert.ok(src.includes('{address || NO_LOCATION_LABEL}'), 'текст солигдоогүй');
  assert.equal(src.includes('Хаяг тодорхойгүй'), false, 'хуучин текст үлдсэн ✗');
});

/**
 * 🆕 2026-10-07 (2 дахь засвар) — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «unegui шиг 1 мөрөнд
 *    хийчих боломж алга уу». ⚠️ УРЬД НЬ 📍 нь 1-р мөр, 🕒·🔖 нь 2-р мөр
 *    (тус тусдаа `<div>`) байв ⇒ ОДОО гурвуулаа НЭГ `flex flex-wrap` мөрөнд
 *    `·` тусгаарлагчтай. Энэ тест тэр нэгдлийг түгжинэ (буцаж 2 мөр болвол ✗).
 */
t('⑥ 🆕`ListingDetailClient` — 📍 · 🕒 · 🔖 НЭГ МӨРӨНД (unegui хэв, 2026-10-07)', () => {
  const src = codeOnly('components/ListingDetailClient.jsx');
  // ⚠️ ХУУЧИН 2-МӨРИЙН хэв (📍 нь өөрийн гэсэн `<div>`-тэй) БУЦАЖ БОЛОХГҮЙ
  assert.equal(src.includes('<div className="min-w-0">📍'), false, '📍 тусдаа мөрөнд үлдсэн ✗');
  const row = src.slice(src.indexOf('flex flex-wrap items-center gap-x-2 gap-y-0.5'));
  const at = row.indexOf('📍 {address || NO_LOCATION_LABEL}');
  const time = row.indexOf('🕒 {timeAgo(listing.created_at)}');
  const id = row.indexOf('🔖 Зарын дугаар:');
  assert.ok(at >= 0, '📍 нэг мөрөнд БАЙХГҮЙ');
  assert.ok(time > at, '🕒 нь 📍-ийн ДАРАА байх ёстой ✗');
  assert.ok(id > time, '🔖 нь 🕒-ийн ДАРАА байх ёстой ✗');
  assert.ok(row.includes('{shortId}'), 'богино зарын дугаар (`shortId`) алга ✗');
});

t('⑥ `MyListingsClient` — «📍 » хоосон үлдэхгүй (fallback текст)', () => {
  const src = codeOnly('components/MyListingsClient.jsx');
  assert.ok(src.includes("from '../lib/listingLocation.mjs'"));
  assert.ok(src.includes('|| NO_LOCATION_LABEL'));
});


// ────────────────────────────────────────────────────────────
// ⑦ 📄 DOC ГЭРЭЭ
// ────────────────────────────────────────────────────────────
console.log('\n── ⑦ README · package.json ──');

const README = readSrc('README.md');

t('⑦ README: «Байршил сонгохгүй» хэсэг бичигдсэн', () => {
  /**
   * ⚠️ ГАРЧГААР (heading-ээр) хайна — `README.indexOf('Байршил сонгохгүй')` нь
   *    ЗӨВХӨН эхний тохирлыг олдог ба тэр нь **2-р алхмын хадмал хүснэгтийн
   *    мөр** (хэсгийн гарчгаас ~4000 тэмдэгт ӨМНӨ) ⇒ тэр цонхонд
   *    `lib/listingLocation.mjs` БАЙХГҮЙ тул тест хуурамчаар унадаг байв ✗
   *    (2026-10-06: хэсгийн гарчиг «#### 📍 Байршил сонгохгүй — чекбокс»
   *     болсны дараа илэрсэн; гарчгийн `#### ` угтвараар хайвал зөв цонх ✓)
   */
  const at = README.indexOf('#### 📍 Байршил сонгохгүй');
  assert.ok(at > 0, 'README-д хэсэг БАЙХГҮЙ');
  const block = README.slice(at, at + 4000);
  assert.ok(block.includes('lib/listingLocation.mjs'), 'модулийн нэр алга');
  assert.ok(block.includes('noLocation'), 'форм-ын талбарын нэр алга');
  assert.ok(block.includes('migration'), 'DB-ийн тайлбар алга');
});

t('⑦ README: тестийн жагсаалтад `test:location` бичигдсэн', () => {
  assert.ok(README.includes('test:location'), 'README-д тест алга');
  assert.ok(README.includes('scripts/test-location-optional.mjs'), 'файлын нэр алга');
});

t('⑦ `package.json` — `test:location` скрипт бүртгэгдсэн', () => {
  const pkg = JSON.parse(readSrc('package.json'));
  assert.equal(pkg.scripts['test:location'], 'node scripts/test-location-optional.mjs');
});

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест\n`);
