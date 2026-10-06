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
  GEOCODE_ENDPOINT, geocodeUrl, parseGeocodeResults,
  isValidCoord, coordOf, hasCoords, districtCenter, cityCenter,
  mapCenterFor, sameCoord,
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

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест\n`);


