// ============================================================
// test-location-map.mjs — 🗺 ЗАРЫН ГАЗРЫН ЗУРГИЙН БАЙРШЛЫН ГЭРЭЭ
//
// 🎯 ХЭРЭГЛЭГЧИЙН ГОМДОЛ (2026-10-06): «Газрын зураг дээр 📍 23-р хороо,
//    Хан-Уул, Улаанбаатар гэсэн байршил … энэ зар чинь харагдахгүй байна
//    даа. Unegui.mn дээр … газрын зураг дээр зааж өгөх боломжтой хэсэг
//    тухайн цонхон дээр нь гараад ирдэг юм байна» ⇒ ЭНЭ тест тэр засварын
//    гэрээг түгжинэ ✓
//
// ХАМРАХ ХҮРЭЭ:
//   ① `lib/locationGeo.mjs` — солбицлын БҮХ цэвэр дүрэм (хүчинтэй эсэх,
//      дүүрэг/хотын төв, газрын зургийн анхдагч төв)
//   ② Дүүрэг/хотын төв — БҮХ дүүрэг/хотод байгаа эсэх (газрын зурагт
//      төвлөрөх дүрэм ажиллахын тулд)
//   ③ `lib/listingLocation.mjs` — чекбокс солбицлыг ЦЭВЭРЛЭХ/БУЦААХ
//   ④ ГЭРЭЭ — `AddListingClient` (форм · пин товч · модаль · centerPatch)
//   ⑤ `LocationMapPicker` — `unegui.mn` мэт modal (пин · текст · дэгээнүүд)
//   ⑥ DB — `latitude`/`longitude` нь аль хэдийн байгаа (migration 0 ✓)
//   ⑦ 📄 README + `package.json` (тест бүртгэгдсэн эсэх)
//   ⑧ 🆕 🔍 ХОРООНЫ НАРИЙВЧЛАЛ — `geocodeUrl`/`parseGeocodeResults` (Nominatim)
//   ⑨ 🆕 🗺 ПИНГИЙН ХАЯГ — `reverseGeocodeUrl`/`parseReverseResult` (Nominatim reverse)
//   ⑩ 🆕 📐 ДҮҮРГИЙН БОДИТ ХИЛ — `districtPolygonUrl`/`extractPolygon`/`pointInGeoJson`
//
// АЖИЛЛУУЛАХ:  npm run test:location-map
// ⚠️ DB/React/CDP ХОЛБОГДОХГҮЙ — зөвхөн Node (цэвэр модуль + эх файлын гэрээ).
//    ⚠️ `LocationMapPicker.jsx`-ыг IMPORT ХИЙХГҮЙ (JSX/CSS-ийг Node уншихгүй) —
//       зөвхөн ЭХ ФАЙЛЫН ГЭРЭЭГ текстээр шалгана ✓
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  UB_DISTRICT_CENTERS, CITY_CENTERS, DISTRICT_CENTERS,
  DEFAULT_MAP_CENTER, DEFAULT_MAP_ZOOM, PICK_ZOOM, PICK_ZOOM_FOUND,
  KHOROO_SPREAD, GEOCODE_ENDPOINT, geocodeUrl, parseGeocodeResults,
  REVERSE_ENDPOINT, reverseGeocodeUrl, parseReverseResult,
  districtPolygonUrl, extractPolygon, pointInRing, pointInGeoJson,
  isValidCoord, coordOf, hasCoords, districtCenter, cityCenter,
  khorooNumber, khorooCenter, autoCenterFor, mapCenterFor, sameCoord,
} from '../lib/locationGeo.mjs';
import {
  DEFAULT_CITY, noLocationPatch, bankedLocation, restoreLocationPatch,
} from '../lib/listingLocation.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** 🧹 Мөр/блок тайлбарыг хасна (тайлбар доторх «хуучин» кодыг регресс гэж андуурахгүй) */
const codeLines = (src) => src
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join('\n');
const stripJsxComments = (src) => src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
/** 🧹 Блок (`/* … *\/`) тайлбарыг БҮТНЭЭР хасна — пикер нь урт JSDoc-той тул
 *  регресс шалгалт `marker`/`draggable` гэсэн ҮГИЙГ тайлбараас андуурч болохгүй ✓ */
const stripBlockComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '');
const codeOnly = (rel) => codeLines(stripJsxComments(readSrc(rel)));
const codeHard = (rel) => stripBlockComments(stripJsxComments(readSrc(rel)));

let passed = 0;
const t = (name, fn) => { fn(); passed += 1; console.log(`  ✓ ${name}`); };
/** Солбицол «Монголын дотор» эсэх (ойролцоо утга) — ⌨️ тоо биш, бодит муж */
const insideMN = (c) => c && c.lat > 41 && c.lat < 52.5 && c.lng > 87 && c.lng < 120;

console.log('\n🧪 🗺 Зарын газрын зургийн байршил (пин + дүүргийн төв)\n');

// ────────────────────────────────────────────────────────────
// ① СОЛБИЦЛЫН ЦЭВЭР ДҮРЭМ (`lib/locationGeo.mjs`)
// ────────────────────────────────────────────────────────────
console.log('── ① Солбицлын цэвэр дүрэм ──');

t('① `isValidCoord` — зөв солбицол хүчинтэй, буруу нь ХҮЧИНГҮЙ', () => {
  assert.equal(isValidCoord(47.9188, 106.9176), true);
  assert.equal(isValidCoord(0, 0), false, '(0,0) нь хүчингүй байх ёстой');
  assert.equal(isValidCoord(91, 106), false, 'өргөрөг давсан');
  assert.equal(isValidCoord(47, 181), false, 'уртраг давсан');
  assert.equal(isValidCoord(NaN, 106), false);
  assert.equal(isValidCoord(null, 106), false);
  assert.equal(isValidCoord(undefined, undefined), false);
});

t('① `(0,0)` — `Number(null)=0`-оос ХАМГААЛСАН (чухал!)', () => {
  // ⚠️ `null`/`''` нь `Number(...)` дээр 0 болдог тул тусгай хамгаалалт хэрэгтэй
  assert.equal(coordOf({ latitude: null, longitude: null }), null);
  assert.equal(coordOf({ latitude: '', longitude: '' }), null);
  assert.equal(coordOf({ latitude: 0, longitude: 0 }), null);
  assert.equal(coordOf({}), null);
  assert.equal(coordOf(null), null);
});

t('① `coordOf`/`hasCoords` — текстийн тоог ч зөв уншина', () => {
  assert.deepEqual(coordOf({ latitude: 47.876, longitude: 106.91 }), { lat: 47.876, lng: 106.91 });
  assert.deepEqual(coordOf({ latitude: '47.876', longitude: '106.91' }), { lat: 47.876, lng: 106.91 });
  assert.equal(hasCoords({ latitude: null, longitude: null }), false);
  assert.equal(hasCoords({ latitude: 47.876, longitude: 106.91 }), true);
});


// ────────────────────────────────────────────────────────────
// ② ДҮҮРЭГ / ХОТЫН ТӨВ — БҮГД байгаа эсэх
// ────────────────────────────────────────────────────────────
console.log('\n── ② Дүүрэг / хотын төв (газрын зурагт төвлөрөх) ──');

/** УБ-ын 9 дүүрэг (эх сурвалж: `lib/locationData.js → UB_DISTRICTS`) */
const UB9 = ['Баянгол', 'Баянзүрх', 'Сүхбаатар', 'Хан-Уул', 'Чингэлтэй',
  'Сонгинохайрхан', 'Налайх', 'Багануур', 'Багахангай'];
/** 22 хот/аймаг (эх сурвалж: `lib/locationData.js → CITIES`) */
const CITIES22 = ['Улаанбаатар', 'Архангай', 'Баян-Өлгий', 'Баянхонгор', 'Булган',
  'Говь-Алтай', 'Говьсүмбэр', 'Дархан-Уул', 'Дорноговь', 'Дорнод', 'Дундговь',
  'Завхан', 'Орхон', 'Өвөрхангай', 'Өмнөговь', 'Сүхбаатар', 'Сэлэнгэ', 'Төв',
  'Увс', 'Ховд', 'Хөвсгөл', 'Хэнтий'];

t('② УБ-ын 9 дүүрэг БҮГД төвтэй (Монголын дотор)', () => {
  assert.equal(Object.keys(UB_DISTRICT_CENTERS).length, 9);
  UB9.forEach((d) => {
    const c = districtCenter('Улаанбаатар', d);
    assert.ok(insideMN(c), `${d} дүүргийн төв буруу/байхгүй: ${JSON.stringify(c)}`);
  });
});

t('② 22 хот БҮГД төвтэй', () => {
  CITIES22.forEach((city) => {
    const c = cityCenter(city);
    assert.ok(insideMN(c), `${city} хотын төв буруу/байхгүй: ${JSON.stringify(c)}`);
  });
});

t('② Аймгийн сум/дүүрэг (Дархан-Уул · Орхон) төвтэй', () => {
  assert.ok(insideMN(districtCenter('Дархан-Уул', 'Дархан')));
  assert.ok(insideMN(districtCenter('Дархан-Уул', 'Шарын гол')));
  assert.ok(insideMN(districtCenter('Орхон', 'Эрдэнэт')));
  assert.equal(districtCenter('Улаанбаатар', 'Байхгүй-дүүрэг'), null);
  assert.equal(districtCenter('', 'Хан-Уул'), null);
  assert.equal(districtCenter('Улаанбаатар', ''), null);
});

t('② `mapCenterFor` — ⓵ пин → ⓶ дүүрэг → ⓷ хот → ⓸ анхдагч (дараалал)', () => {
  const pin = mapCenterFor({ city: 'Улаанбаатар', district: 'Хан-Уул', latitude: 47.9, longitude: 106.8 });
  assert.equal(pin.exact, true, 'пин давамгайлах ёстой');
  assert.equal(pin.lat, 47.9);

  const dist = mapCenterFor({ city: 'Улаанбаатар', district: 'Хан-Уул' });
  assert.equal(dist.exact, false);
  assert.deepEqual({ lat: dist.lat, lng: dist.lng }, UB_DISTRICT_CENTERS['Хан-Уул']);

  const city = mapCenterFor({ city: 'Архангай' });
  assert.deepEqual({ lat: city.lat, lng: city.lng }, CITY_CENTERS['Архангай']);

  const none = mapCenterFor({});
  assert.deepEqual({ lat: none.lat, lng: none.lng }, DEFAULT_MAP_CENTER);
});

t('② `mapCenterFor` — хороо сонгосон бол ХОРООНЫ ойролцоо төв (дүүрэг БИШ)', () => {
  const k = mapCenterFor({ city: 'Улаанбаатар', district: 'Хан-Уул', khoroo: '23-р хороо' });
  assert.equal(k.exact, false, 'пингүй тул ойролцоо');
  const base = UB_DISTRICT_CENTERS['Хан-Уул'];
  assert.ok(!sameCoord({ lat: k.lat, lng: k.lng }, base), 'хороо сонгосон ч дүүргийн төв дээрээ байна ✗');
  const dLat = Math.abs(k.lat - base.lat);
  const dLng = Math.abs(k.lng - base.lng);
  assert.ok(dLat <= KHOROO_SPREAD && dLng <= KHOROO_SPREAD * 1.6, 'ойролцоо биш (хэт хол)');
});

t('②′ `khorooNumber` — нэрнээс дугаар унших («23-р хороо» → 23)', () => {
  assert.equal(khorooNumber('23-р хороо'), 23);
  assert.equal(khorooNumber('1-р хороо'), 1);
  assert.equal(khorooNumber(' 7-р хороо '), 7);
  assert.equal(khorooNumber(''), null);
  assert.equal(khorooNumber('хороо'), null);
  assert.equal(khorooNumber(null), null);
  assert.equal(khorooNumber(undefined), null);
  assert.equal(khorooNumber(5), null, 'зөвхөн мөр л уншина');
});

t('②′ `khorooCenter` — дүүрэг/хороо тодорхойгүй бол `null`', () => {
  assert.equal(khorooCenter('Улаанбаатар', 'Хан-Уул', ''), null);
  assert.equal(khorooCenter('Улаанбаатар', '', '23-р хороо'), null);
  assert.equal(khorooCenter('', 'Хан-Уул', '5-р хороо'), null);
  assert.equal(khorooCenter('Улаанбаатар', 'Байхгүй-дүүрэг', '3-р хороо'), null);
});

t('②′ `khorooCenter` — хороо бүр ЯЛГААТАЙ · ойролцоо · Монгол дотор · тогтвортой', () => {
  const seen = new Set();
  ['1-р хороо', '5-р хороо', '12-р хороо', '23-р хороо', '43-р хороо'].forEach((k) => {
    const c = khorooCenter('Улаанбаатар', 'Хан-Уул', k);
    assert.ok(insideMN(c), `${k} Монголын гадна: ${JSON.stringify(c)}`);
    seen.add(`${c.lat.toFixed(6)},${c.lng.toFixed(6)}`);
  });
  assert.equal(seen.size, 5, 'хороонууд нэг цэг дээр бөөгнөрсөн ✗');
  // Тогтвортой (deterministic) — дахин дуудвал ЯГ ижил ✓
  const a = khorooCenter('Улаанбаатар', 'Хан-Уул', '23-р хороо');
  const b = khorooCenter('Улаанбаатар', 'Хан-Уул', '23-р хороо');
  assert.deepEqual(a, b, 'нэг хороо өөр өөр цэг өгч байна ✗');
});

t('②′ `autoCenterFor` — хороо → дүүрэг → хот → анхдагч (дараалал)', () => {
  assert.deepEqual(
    autoCenterFor({ city: 'Улаанбаатар', district: 'Хан-Уул', khoroo: '9-р хороо' }),
    khorooCenter('Улаанбаатар', 'Хан-Уул', '9-р хороо'),
    'хороо сонгосон бол хорооны төв байх ёстой',
  );
  assert.deepEqual(autoCenterFor({ city: 'Улаанбаатар', district: 'Хан-Уул' }), UB_DISTRICT_CENTERS['Хан-Уул']);
  assert.deepEqual(autoCenterFor({ city: 'Архангай' }), CITY_CENTERS['Архангай']);
  assert.deepEqual(autoCenterFor({}), DEFAULT_MAP_CENTER);
});

t('② `sameCoord` — ойролцоо солбицлыг илрүүлнэ', () => {
  assert.equal(sameCoord({ lat: 47.876, lng: 106.91 }, { lat: 47.876, lng: 106.91 }), true);
  assert.equal(sameCoord({ lat: 47.876, lng: 106.91 }, { lat: 47.9, lng: 106.9 }), false);
  assert.equal(sameCoord(null, { lat: 47.876, lng: 106.91 }), false);
});

// ────────────────────────────────────────────────────────────
// ③ ЧЕКБОКС — солбицлыг ЦЭВЭРЛЭХ/БУЦААХ (`lib/listingLocation.mjs`)
// ────────────────────────────────────────────────────────────
console.log('\n── ③ «Байршил сонгохгүй» чекбокс + солбицол ──');

/** Бодит форм (товчилсон — `AddListingClient.emptyForm()`-ийн хэлбэр) */
const form = (over = {}) => ({
  city: 'Улаанбаатар', district: 'Хан-Уул', khoroo: '23-р хороо',
  latitude: 47.876, longitude: 106.91, noLocation: false,
  ...over,
});

t('③ `noLocationPatch()` — солбицлыг ч `null` болгоно (зар газрын зурагт гарахгүй)', () => {
  const p = noLocationPatch();
  assert.equal(p.noLocation, true);
  assert.equal(p.city, '');
  assert.equal(p.latitude, null);
  assert.equal(p.longitude, null);
  assert.ok('latitude' in p, 'latitude талбар БАЙХ ЁСТОЙ');
  assert.ok('longitude' in p, 'longitude талбар БАЙХ ЁСТОЙ');
});

t('③ Чекбоксын ROUND-TRIP — пин АЛДАГДАХГҮЙ (асаа → унтраа)', () => {
  const before = form();
  const banked = bankedLocation(before);
  assert.equal(banked.latitude, 47.876);
  assert.equal(banked.longitude, 106.91);

  // чекбокс АСААХ
  const off = { ...before, ...noLocationPatch() };
  assert.equal(off.latitude, null);
  // чекбокс УНТРААХ → буцаж ирнэ
  const back = { ...off, ...restoreLocationPatch(banked) };
  assert.equal(back.latitude, 47.876, 'пин буцаж ирэх ёстой');
  assert.equal(back.longitude, 106.91);
  assert.equal(back.city, 'Улаанбаатар');
  assert.equal(back.district, 'Хан-Уул');
});

t('③ `bankedLocation()` — байршилгүй (чекбокс) үед `null`', () => {
  assert.equal(bankedLocation(form({ noLocation: true })), null);
  assert.equal(bankedLocation(form({ city: '' })), null);
});

t('③ `restoreLocationPatch(null)` — анхдагч хот, солбицол `null`', () => {
  const p = restoreLocationPatch(null);
  assert.equal(p.city, DEFAULT_CITY);
  assert.equal(p.latitude, null);
  assert.equal(p.longitude, null);
});

// ────────────────────────────────────────────────────────────
// ④ ГЭРЭЭ — `AddListingClient` (форм · пин товч · модаль)
// ────────────────────────────────────────────────────────────
console.log('\n── ④ AddListingClient: форм · пин товч · модаль ──');

t('④ Импорт — `LocationMapPicker` + `lib/locationGeo.mjs`', () => {
  const src = codeOnly('components/AddListingClient.jsx');
  assert.ok(src.includes("import LocationMapPicker from './LocationMapPicker'"), 'пин-пикерийн импорт алга');
  assert.ok(src.includes("from '../lib/locationGeo.mjs'"), 'locationGeo импорт алга');
  assert.ok(src.includes('centerPatch'), 'centerPatch туслах алга');
});

t('④ `emptyForm()` — `latitude`/`longitude` талбартай (`null` анхдагч)', () => {
  const src = codeOnly('components/AddListingClient.jsx');
  assert.ok(src.includes('latitude: null'), 'emptyForm-д latitude алга');
  assert.ok(src.includes('longitude: null'), 'emptyForm-д longitude алга');
});

t('④ `listingToForm()` — DB-ийн `latitude`/`longitude`-ыг форм руу уншина (засах горим)', () => {
  const src = codeOnly('components/AddListingClient.jsx');
  assert.ok(src.includes('latitude: typeof l.latitude ==='), 'засах горимд latitude уншигдахгүй');
  assert.ok(src.includes('longitude: typeof l.longitude ==='), 'засах горимд longitude уншигдахгүй');
});

t('④ `changeDistrict` — `centerPatch`-аар дүүргийн ТӨВ рүү солбицлыг шилжүүлнэ', () => {
  const src = codeOnly('components/AddListingClient.jsx');
  assert.ok(src.includes('function centerPatch(city, district)'), 'centerPatch тодорхойлолт алга');
  assert.ok(src.includes('districtCenter(city, district)'), 'centerPatch нь districtCenter дуудах ёстой');
  assert.ok(src.includes('...centerPatch(f.city, district)'), 'changeDistrict centerPatch-гүй');
});

t('④ `changeKhoroo` — хорооны ойролцоо төв рүү шилжүүлнэ (пин ХӨНДӨӨГДӨХГҮЙ)', () => {
  const src = codeOnly('components/AddListingClient.jsx');
  assert.ok(src.includes('function khorooPatch(city, district, khoroo)'), 'khorooPatch тодорхойлолт алга');
  assert.ok(src.includes('khorooCenter(city, district, khoroo)'), 'khorooPatch нь khorooCenter дуудах ёстой');
  assert.ok(src.includes('autoCenterFor(f)'), 'changeKhoroo авто-төвөөр хэрэглэгчийн пингийг ялгахгүй');
  assert.ok(src.includes('...khorooPatch(f.city, f.district, khoroo)'), 'changeKhoroo khorooPatch-гүй');
  // `mapPickIsApprox` нь хороог харгалзана (дүүрэг БИШ) — autoCenterFor ашиглана
  assert.ok(src.includes('sameCoord(c, autoCenterFor(form))'), 'mapPickIsApprox нь авто төвөөр шалгахгүй');
});

t('④ 2-р алхам — «🗺 байршлаа заах» товч ба пингийн утга (дэгээнүүдтэй)', () => {
  const src = codeOnly('components/AddListingClient.jsx');
  ['data-map-picker-block', 'data-map-picker-open', 'data-map-picker-value', 'data-map-picker-clear']
    .forEach((hook) => assert.ok(src.includes(hook), `${hook} дэгээ алга`));
  assert.ok(src.includes('Газрын зураг дээр байршлаа заах'), 'товчны текст алга');
});

t('④ Модаль — `{mapPickerOpen && ( <LocationMapPicker … /> )}` form дотор', () => {
  const src = codeOnly('components/AddListingClient.jsx');
  assert.ok(src.includes('{mapPickerOpen && ('), 'модаль render нөхцөл алга');
  assert.ok(src.includes('<LocationMapPicker'), 'пин-пикер ашиглагдаагүй');
  assert.ok(src.includes('onConfirm={applyMapPick}'), 'onConfirm холболт алга');
});

// ────────────────────────────────────────────────────────────
// ⑤ `LocationMapPicker` — unegui.mn мэт modal
// ────────────────────────────────────────────────────────────
console.log('\n── ⑤ LocationMapPicker: unegui.mn мэт modal ──');

const pick = readSrc('components/LocationMapPicker.jsx');

const pickCode = codeHard('components/LocationMapPicker.jsx');

t('⑤ Модальын ТЕКСТ — unegui.mn-ийн мөрүүд (нэг эх сурвалж)', () => {
  assert.ok(pick.includes("MAP_PICKER_TITLE = 'Газрын зураг дээрх байршил'"), 'гарчиг');
  assert.ok(pick.includes("MAP_PICKER_HINT = 'Газрын зургийг чирж, пинь төвд байгаа цэг дээр таарна уу'"), 'заавар');
  assert.ok(pick.includes("MAP_PICKER_BACK = 'Байршлын жагсаалт руу буцах'"), 'буцах');
  assert.ok(pick.includes("MAP_PICKER_CONFIRM = 'Үргэлжлүүлэх'"), 'үргэлжлүүлэх');
  assert.ok(pick.includes("MAP_PICKER_SEARCH_BTN = 'Хайх'"), '🔍 Хайх товчны текст');
  assert.ok(pick.includes("MAP_PICKER_MY_LOCATION = 'Миний байршил'"), '📍 Миний байршил');
});

t('⑤ 🗺 ПИН НЬ ТӨВД ТОГТМОЛ — газрыг чирнэ, пин хөдлөхгүй (3 дахь засвар)', () => {
  assert.ok(pick.includes("await import('leaflet')"), 'leaflet динамик импорт алга');
  assert.ok(pick.includes('data-map-picker-pin'), 'пингийн SVG дэгээ (`data-map-picker-pin`) алга');
  assert.ok(pick.includes('function PinIcon()'), '`PinIcon` бүрэлдэхүүн алга');
  assert.ok(pick.includes('data-map-picker-overlay'), 'пингийн overlay дэгээ алга');
  // ⚠️ `-translate-y-full` ⇒ пингийн ЗҮҮН үзүүр нь ЯГ төвд (газрын зураг-тай таарна)
  assert.ok(
    pick.includes('className="map-pin absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full"'),
    'пин нь газрын зургийн ЯГ төвд байрлахгүй (`-translate-y-full`)',
  );
  assert.ok(pick.includes("map.on('move'"), 'газрыг чирэхэд (`move`) солбицол шинэчлэгдэхгүй');
  assert.ok(pick.includes("map.on('moveend'"), '`moveend` sync алга');
  assert.ok(pick.includes('map.getCenter()'), 'ТӨВИЙН солбицлыг уншихгүй (`getCenter`)');
  assert.ok(pick.includes('requestAnimationFrame'), 'rAF throttle алга (pan-д jank үүснэ ✗)');
  assert.ok(pick.includes('map.panTo(e.latlng)'), 'зураг дээр дарахад пин тэр цэг рүү очихгүй');
  assert.ok(pick.includes('map.invalidateSize()'), 'modal дотор хэмжээ тохируулахгүй');
});

t('⑤ ⏳ ЧИРЭГДДЭГ маркер (2 дахь засвар) БУЦАЖ ОРОХГҮЙ — регресс барь', () => {
  assert.equal(pickCode.includes('L.marker('), false, '`L.marker(` буцаж орлоо ✗');
  assert.equal(pickCode.includes('L.divIcon('), false, '`L.divIcon(` буцаж орлоо ✗');
  assert.equal(pickCode.includes('draggable: true'), false, '`draggable: true` буцаж орлоо ✗');
  assert.equal(pickCode.includes('autoPan: true'), false, '`autoPan: true` буцаж орлоо ✗');
  assert.equal(pickCode.includes("marker.on('dragend'"), false, 'маркер чирэх буцаж орлоо ✗');
  assert.equal(pickCode.includes('markerRef'), false, '`markerRef` буцаж орлоо ✗');
});

t('⑤ 🆕 🔍 ХАЙЛТ + 📍 МИНИЙ БАЙРШИЛ — ХОРООНЫ НАРИЙВЧЛАЛ', () => {
  assert.ok(pick.includes('data-map-picker-search'), 'хайлтын талбарын дэгээ алга');
  assert.ok(pick.includes('data-map-picker-result'), 'хайлтын үр дүнгийн дэгээ алга');
  assert.ok(pick.includes('data-map-picker-my-location'), '📍 миний байршлын дэгээ алга');
  assert.ok(pick.includes('geocodeUrl(q)'), 'хайлт нь `geocodeUrl` ашиглахгүй');
  assert.ok(pick.includes('parseGeocodeResults('), 'хариуг цэвэрлэхгүй (`parseGeocodeResults`)');
  assert.ok(pick.includes('navigator.geolocation.getCurrentPosition'), 'геолокаци алга');
  assert.ok(pick.includes('mapRef.current.setView'), 'олдсон цэг рүү гулсуулахгүй');
  assert.ok(pick.includes('PICK_ZOOM_FOUND'), 'олдсон цэгийн зум (`PICK_ZOOM_FOUND`) алга');
});

t('⑤ `app/globals.css` — `.map-pin` (overlay пин: click-through + сүүдэр)', () => {
  const css = readSrc('app/globals.css');
  assert.ok(css.includes('.map-pin'), '`.map-pin` класс алга');
  assert.ok(/\.map-pin\s*\{[^}]*pointer-events:\s*none/.test(css), '`pointer-events: none` алга (зургийг чирэхэд саад болно ✗)');
});

t('⑤ Тогтвортой дэгээнүүд (CDP/тестэд)', () => {
  ['data-map-picker', 'data-map-picker-confirm', 'data-map-picker-back', 'data-map-picker-close']
    .forEach((hook) => assert.ok(pick.includes(hook), `${hook} алга`));
});

t('⑤ `value`/`center` — хүчингүй утгыг хамгаална (`isValidCoord`)', () => {
  assert.ok(pick.includes("from '../lib/locationGeo.mjs'"));
  assert.ok(pick.includes('isValidCoord'));
  assert.ok(pick.includes('DEFAULT_MAP_CENTER'));
});

// ────────────────────────────────────────────────────────────
// ⑥ ГАЗРЫН ЗУРАГ · DB — migration 0
// ────────────────────────────────────────────────────────────
console.log('\n── ⑥ MapView · queries · DB (migration 0) ──');

t('⑥ `MapView` — солбицолтой зарыг л зурна (ХӨНДӨӨГҮЙ)', () => {
  const mv = codeOnly('components/MapView.jsx');
  assert.ok(mv.includes('filter((l) => l.latitude && l.longitude)'), 'MapView-ийн шүүлт өөрчлөгдсөн');
});

t('⑥ `lib/queries.js` — `payload.latitude`/`longitude`-ыг DB рүү дамжуулна', () => {
  const q = readSrc('lib/queries.js');
  assert.ok(q.includes('latitude: payload.latitude ?? null'));
  assert.ok(q.includes('longitude: payload.longitude ?? null'));
});

t('⑥ DB багана аль хэдийн БАЙНА (0001) — migration ХЭРЭГГҮЙ', () => {
  const sql = readSrc('supabase/migrations/0001_schema.sql');
  assert.ok(sql.includes('latitude double precision'), 'latitude багана алга');
  assert.ok(sql.includes('longitude double precision'), 'longitude багана алга');
  const files = fs.readdirSync(path.join(ROOT, 'supabase/migrations'));
  const coordMigrations = files.filter((f) => /latitude|longitude|coord/i.test(f));
  assert.deepEqual(coordMigrations, [], `солбицлын шинэ migration нэмэгдсэн: ${coordMigrations.join(', ')}`);
});

// ────────────────────────────────────────────────────────────
// ⑦ 📄 DOC ГЭРЭЭ
// ────────────────────────────────────────────────────────────
console.log('\n── ⑦ README · package.json ──');

t('⑦ README: «🗺 Газрын зураг дээрх байршил» хэсэг бичигдсэн', () => {
  const README = readSrc('README.md');
  const at = README.indexOf('#### 🗺 Газрын зураг дээрх байршил');
  assert.ok(at > 0, 'README-д хэсэг БАЙХГҮЙ');
  const block = README.slice(at, at + 4000);
  assert.ok(block.includes('lib/locationGeo.mjs'), 'модулийн нэр алга');
  assert.ok(block.includes('LocationMapPicker'), 'компонентийн нэр алга');
  assert.ok(block.includes('migration'), 'DB-ийн тайлбар алга');
});

t('⑦ README + `package.json`: `test:location-map` бүртгэгдсэн', () => {
  const README = readSrc('README.md');
  assert.ok(README.includes('test:location-map'), 'README-д тест алга');
  assert.ok(README.includes('scripts/test-location-map.mjs'), 'файлын нэр алга');
  const pkg = JSON.parse(readSrc('package.json'));
  assert.equal(pkg.scripts['test:location-map'], 'node scripts/test-location-map.mjs');
});

// ────────────────────────────────────────────────────────────
// ⑧ 🆕 🔍 ХОРООНЫ НАРИЙВЧЛАЛ — geocoder (Nominatim/OSM)
// ────────────────────────────────────────────────────────────
console.log('\n── ⑧ 🔍 Хорооны нарийвчлал: geocoder (Nominatim) ──');

t('⑧ `geocodeUrl` — хоосон/тоо биш үед `null` (fetch хийхгүй)', () => {
  assert.equal(geocodeUrl(''), null, 'хоосон мөр → null');
  assert.equal(geocodeUrl('   '), null, 'зөвхөн зай → null');
  assert.equal(geocodeUrl(null), null, '`null` → null');
  assert.equal(geocodeUrl(undefined), null, '`undefined` → null');
  assert.equal(geocodeUrl(123), null, 'тоо → null');
  assert.equal(geocodeUrl({ q: 'x' }), null, 'объект → null');
});

t('⑧ `geocodeUrl` — Монгол + монгол хэлний хариу (Nominatim гэрээ)', () => {
  const url = geocodeUrl('23-р хороо, Хан-Уул, Улаанбаатар');
  assert.ok(url.startsWith(`${GEOCODE_ENDPOINT}?`), 'Nominatim endpoint биш');
  const u = new URL(url);
  assert.equal(u.searchParams.get('q'), '23-р хороо, Хан-Уул, Улаанбаатар', 'хайлтын үг');
  assert.equal(u.searchParams.get('countrycodes'), 'mn', 'зөвхөн Монгол биш');
  assert.equal(u.searchParams.get('accept-language'), 'mn', 'монгол хариу биш');
  assert.equal(u.searchParams.get('format'), 'jsonv2', 'jsonv2 биш');
  assert.equal(geocodeUrl('  Улаанбаатар  '), geocodeUrl('Улаанбаатар'), 'trim хийгдэхгүй байна');
});

t('⑧ `geocodeUrl` — `limit` нь 1..10 дотор (Nominatim-ийг ачаалахгүй)', () => {
  const lim = (v) => new URL(geocodeUrl('x', v === undefined ? undefined : { limit: v })).searchParams.get('limit');
  assert.equal(lim(), '5', 'анхдагч нь 5');
  assert.equal(lim(0), '1', 'доод хязгаар 1');
  assert.equal(lim(-9), '1', 'сөрөг → 1');
  assert.equal(lim(999), '10', 'дээд хязгаар 10');
  assert.equal(lim(3.7), '3', 'бутархай → бүхэл');
});

t('⑧ `parseGeocodeResults` — зөвхөн ХҮЧИНТЭЙ солбицол үлдэнэ', () => {
  const out = parseGeocodeResults([
    { lat: '47.9188', lon: '106.9176', display_name: 'Улаанбаатар' }, // ✓ мөр → тоо
    { lat: '0', lon: '0', display_name: 'Атлантын далай' },           // ✗ (0,0) ХҮЧИНГҮЙ
    { lat: 'abc', lon: '106.9' },                                     // ✗ NaN
    { lat: '', lon: '106.9' },                                        // ✗ хоосон
    { lat: '47.9', lon: '-200', display_name: 'муж алдаа' },          // ✗ lng муж
    { lat: '99', lon: '106.9' },                                      // ✗ lat муж
    null, 'хог', 42,                                                  // ✗ төрөл буруу
    { lat: 47.876, lon: 106.91, display_name: 'Хан-Уул' },            // ✓ бодит тоо
  ]);
  assert.equal(out.length, 2, `2 л хүчинтэй байх ёстой (олдсон: ${out.length})`);
  assert.deepEqual(out[0], { lat: 47.9188, lng: 106.9176, label: 'Улаанбаатар' }, 'мөр → тоо хөрвүүлэлт');
  assert.deepEqual(out[1], { lat: 47.876, lng: 106.91, label: 'Хан-Уул' }, 'тоо хэвээр');
});

t('⑧ `parseGeocodeResults` — массив биш/`display_name`-гүй үед аюулгүй', () => {
  assert.deepEqual(parseGeocodeResults(null), [], '`null` → []');
  assert.deepEqual(parseGeocodeResults(undefined), [], '`undefined` → []');
  assert.deepEqual(parseGeocodeResults({ error: 'x' }), [], 'объект → []');
  assert.deepEqual(parseGeocodeResults('[]'), [], 'мөр → [] (JSON.parse БИШ)');
  assert.deepEqual(
    parseGeocodeResults([{ lat: '47.9', lon: '106.9' }]),
    [{ lat: 47.9, lng: 106.9, label: '' }],
    '`display_name` байхгүй → `label: \'\'` (render fallback ✓)',
  );
});

t('⑧ Олдсон цэг нь ГАЗРЫН ЗУРАГТ ашиглаж болохуйц (`isValidCoord`)', () => {
  const hit = parseGeocodeResults([
    { lat: '47.9188', lon: '106.9176', display_name: 'Улаанбаатар' },
  ])[0];
  assert.ok(isValidCoord(hit.lat, hit.lng), 'олдсон цэг хүчингүй');
  assert.ok(insideMN(hit), 'Монголын дотор биш');
  assert.equal(PICK_ZOOM_FOUND, 17, 'олдсон цэгийн зум нь 17 (барилгын түвшин)');
});

// ────────────────────────────────────────────────────────────
// ⑨ 🆕 🗺 ПИНГИЙН ХАЯГ — reverse-geocode (Nominatim reverse)
// ────────────────────────────────────────────────────────────
console.log('\n── ⑨ 🗺 Пингийн хаяг: reverse-geocode (Nominatim) ──');

t('⑨ `reverseGeocodeUrl` — хүчингүй солбицол үед `null` (fetch хийхгүй)', () => {
  assert.equal(reverseGeocodeUrl(0, 0), null, '(0,0) → null');
  assert.equal(reverseGeocodeUrl(NaN, 106.9), null, 'NaN → null');
  assert.equal(reverseGeocodeUrl(99, 106.9), null, 'lat муж → null');
  assert.equal(reverseGeocodeUrl(47.9, null), null, 'null → null');
});

t('⑨ `reverseGeocodeUrl` — Nominatim гэрээ (lat/lon/zoom/addressdetails)', () => {
  const url = reverseGeocodeUrl(47.9189, 106.9179);
  assert.ok(url.startsWith(`${REVERSE_ENDPOINT}?`), 'reverse endpoint биш');
  const u = new URL(url);
  assert.equal(u.searchParams.get('lat'), '47.9189', 'lat');
  assert.equal(u.searchParams.get('lon'), '106.9179', 'lon');
  assert.equal(u.searchParams.get('format'), 'jsonv2', 'jsonv2 биш');
  assert.equal(u.searchParams.get('addressdetails'), '1', 'addressdetails биш');
  assert.equal(u.searchParams.get('accept-language'), 'mn', 'монгол хариу биш');
  assert.equal(u.searchParams.get('zoom'), '18', 'анхдагч зум 18 биш');
});

t('⑨ `reverseGeocodeUrl` — `zoom` нь 3..18 дотор (хаягийн түвшин)', () => {
  const z = (v) => new URL(reverseGeocodeUrl(47.9, 106.9, { zoom: v })).searchParams.get('zoom');
  assert.equal(z(0), '3', 'доод хязгаар 3');
  assert.equal(z(99), '18', 'дээд хязгаар 18');
  assert.equal(z(16.7), '16', 'бутархай → бүхэл');
});

t('⑨ `parseReverseResult` — хаягийн хэсгүүдээс `label` угсарна', () => {
  const r = parseReverseResult({
    address: {
      road: 'Их сургуулийн гудамж',
      suburb: 'Бага Тойрог',
      city_district: 'Сүхбаатар дүүрэг',
      city: 'Улаанбаатар',
      country: 'Монгол улс',
    },
  });
  assert.deepEqual(r, {
    label: 'Их сургуулийн гудамж, Бага Тойрог, Сүхбаатар дүүрэг, Улаанбаатар',
    road: 'Их сургуулийн гудамж',
    suburb: 'Бага Тойрог',
    district: 'Сүхбаатар дүүрэг',
    city: 'Улаанбаатар',
  }, 'label угсралт буруу');
});

t('⑨ `parseReverseResult` — давхардсан утгыг НЭГ удаа оруулна', () => {
  const r = parseReverseResult({
    address: { suburb: 'Хан-Уул', city_district: 'Хан-Уул', city: 'Улаанбаатар' },
  });
  assert.equal(r.label, 'Хан-Уул, Улаанбаатар', 'давхардсан утга 1 удаа орох ёстой');
});

t('⑨ `parseReverseResult` — хог/хоосон үед аюулгүй (`null`)', () => {
  assert.equal(parseReverseResult(null), null, 'null → null');
  assert.equal(parseReverseResult(undefined), null, 'undefined → null');
  assert.equal(parseReverseResult('x'), null, 'мөр → null');
  assert.equal(parseReverseResult([]), null, 'массив → null');
  assert.equal(parseReverseResult({}), null, 'хаяггүй → null');
  assert.equal(parseReverseResult({ address: {} }), null, 'хоосон хаяг → null');
});

t('⑨ ГЭРЭЭ `LocationMapPicker` — reverse-geocode ашиглана (хаягийн дэгээ)', () => {
  const pick = codeHard('components/LocationMapPicker.jsx');
  assert.ok(pick.includes('reverseGeocodeUrl'), 'reverseGeocodeUrl импорт/дуудлага алга');
  assert.ok(pick.includes('parseReverseResult'), 'parseReverseResult ашиглаагүй');
  assert.ok(pick.includes('data-map-picker-place'), 'хаягийн дэгээ (`data-map-picker-place`) алга');
});

// ────────────────────────────────────────────────────────────
// ⑩ 🆕 📐 ДҮҮРГИЙН БОДИТ ХИЛ — полигон + пин дотор эсэх
// ────────────────────────────────────────────────────────────
console.log('\n── ⑩ 📐 Дүүргийн бодит хил: polygon (Nominatim) ──');

t('⑩ `districtPolygonUrl` — дүүрэг хоосон үед `null` (fetch хийхгүй)', () => {
  assert.equal(districtPolygonUrl('Улаанбаатар', ''), null, 'хоосон дүүрэг → null');
  assert.equal(districtPolygonUrl('Улаанбаатар', '   '), null, 'зөвхөн зай → null');
  assert.equal(districtPolygonUrl('Улаанбаатар', null), null, 'null → null');
  assert.equal(districtPolygonUrl('Улаанбаатар', undefined), null, 'undefined → null');
});

t('⑩ `districtPolygonUrl` — Nominatim `polygon_geojson` гэрээ', () => {
  const url = districtPolygonUrl('Улаанбаатар', 'Хан-Уул');
  assert.ok(url.startsWith(`${GEOCODE_ENDPOINT}?`), 'Nominatim search endpoint биш');
  const u = new URL(url);
  assert.equal(u.searchParams.get('polygon_geojson'), '1', 'polygon_geojson биш');
  assert.equal(u.searchParams.get('format'), 'jsonv2', 'jsonv2 биш');
  assert.equal(u.searchParams.get('limit'), '1', 'limit 1 биш');
  assert.equal(u.searchParams.get('countrycodes'), 'mn', 'зөвхөн Монгол биш');
  assert.equal(u.searchParams.get('accept-language'), 'mn', 'монгол хариу биш');
  assert.ok(u.searchParams.get('q').includes('Хан-Уул'), 'дүүрэг байхгүй');
  assert.ok(u.searchParams.get('q').includes('Улаанбаатар'), 'хот байхгүй');
  assert.equal(districtPolygonUrl(undefined, '  Хан-Уул '), districtPolygonUrl('', 'Хан-Уул'), 'trim буруу');
});

t('⑩ `extractPolygon` — зөвхөн `Polygon`/`MultiPolygon`', () => {
  const poly = { type: 'Polygon', coordinates: [[[106.8, 47.8], [107, 47.8], [107, 47.9], [106.8, 47.9]]] };
  assert.deepEqual(extractPolygon([{ geojson: poly }]), poly, 'массив дотроос Polygon');
  assert.deepEqual(extractPolygon({ geojson: poly }), poly, 'объект ч хүлээнэ');
  const mp = { type: 'MultiPolygon', coordinates: [] };
  assert.deepEqual(extractPolygon([{ geojson: mp }]), mp, 'MultiPolygon');
  assert.equal(extractPolygon([{ geojson: { type: 'Point', coordinates: [1, 2] } }]), null, 'Point → null');
  assert.equal(extractPolygon([{ geojson: { type: 'Polygon' } }]), null, 'coordinates байхгүй → null');
  assert.equal(extractPolygon([]), null, '[] → null');
  assert.equal(extractPolygon(null), null, 'null → null');
  assert.equal(extractPolygon('x'), null, 'мөр → null');
});

t('⑩ `pointInRing` — квадрат дотор/гадна (ray casting)', () => {
  const ring = [[106.8, 47.8], [107.0, 47.8], [107.0, 47.9], [106.8, 47.9], [106.8, 47.8]];
  assert.equal(pointInRing(47.85, 106.9, ring), true, 'төв дотор');
  assert.equal(pointInRing(47.7, 106.9, ring), false, 'өмнө (гадна)');
  assert.equal(pointInRing(47.85, 106.7, ring), false, 'баруун (гадна)');
  assert.equal(pointInRing(47.85, 106.9, [[1, 1], [2, 2]]), false, 'богино цагираг → false');
  assert.equal(pointInRing(47.85, 106.9, null), false, 'null → false');
});

t('⑩ `pointInGeoJson` — Polygon · нүх (hole) · MultiPolygon', () => {
  const outer = [[106.8, 47.8], [107.0, 47.8], [107.0, 47.9], [106.8, 47.9], [106.8, 47.8]];
  const hole = [[106.87, 47.84], [106.93, 47.84], [106.93, 47.88], [106.87, 47.88], [106.87, 47.84]];
  const withHole = { type: 'Polygon', coordinates: [outer, hole] };
  assert.equal(pointInGeoJson(47.85, 106.9, { type: 'Polygon', coordinates: [outer] }), true, 'полигон дотор');
  assert.equal(pointInGeoJson(47.85, 106.82, withHole), true, 'нүхний ГАДНА, полигон дотор');
  assert.equal(pointInGeoJson(47.86, 106.9, withHole), false, 'нүхэн ДОТОР → гадна');
  const mp = {
    type: 'MultiPolygon',
    coordinates: [
      [[[106.8, 47.8], [106.82, 47.8], [106.82, 47.82], [106.8, 47.82], [106.8, 47.8]]],
      [outer],
    ],
  };
  assert.equal(pointInGeoJson(47.85, 106.9, mp), true, 'MultiPolygon 2 дахь полигон дотор');
  assert.equal(pointInGeoJson(47.85, 106.9, null), false, 'null → false');
  assert.equal(pointInGeoJson(0, 0, withHole), false, '(0,0) хүчингүй → false');
});

t('⑩ ГЭРЭЭ `LocationMapPicker` — дүүргийн хил шалгаж, сануулга гаргана', () => {
  const pick = codeHard('components/LocationMapPicker.jsx');
  assert.ok(pick.includes('districtPolygonUrl'), 'districtPolygonUrl алга');
  assert.ok(pick.includes('extractPolygon'), 'extractPolygon алга');
  assert.ok(pick.includes('pointInGeoJson'), 'pointInGeoJson алга');
  assert.ok(pick.includes('geoJSON('), 'L.geoJSON-оор хил зурахгүй');
  assert.ok(pick.includes('data-map-picker-outside'), 'сануулгын дэгээ алга');
});

t('⑩ ГЭРЭЭ `AddListingClient` — picker руу `city`/`district` дамжуулна', () => {
  const src = codeOnly('components/AddListingClient.jsx');
  assert.ok(src.includes('city={form.city}'), '`city` prop алга');
  assert.ok(src.includes('district={form.district}'), '`district` prop алга');
});

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест\n`);


