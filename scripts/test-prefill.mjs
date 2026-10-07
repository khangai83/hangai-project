// ============================================================
// test-prefill.mjs — 🎯 «ЗАР НЭМЭХ» ФОРМЫН АНГИЛАЛ УРЬДЧИЛАН БӨГЛӨХ ГЭРЭЭ
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-06): «Хэрэглэгч зар нэмэх товч дархад, тэр нь
//    ямар нэг ангилалд явж байвал зар нэмэх хэсэгт нь тохируулагдсан байдлаар
//    орж ирдэг байвал зүгээр юм байна. Жишээ нь Бүх зар › Ажил, Үйлчилгээ ›
//    Барилга & Засвар үйлчилгээ › Гагнуур, Энд явж байгаад Зар
//    нэмэхээ дархад Энэ ангилал нь сонгогдсон эхэлдэг байвал сайхан юм шиг
//    санагдаж байна.» ⇒ ЭНЭ тест тэр засварын гэрээг түгжинэ ✓
//
// ХАМРАХ ХҮРЭЭ:
//   ① Хэрэглэгчийн БОДИТ жишээ (хэсэг › бүлэг › дэд төрөл) — round-trip
//   ② `listingPrefillFromSearch` — ХҮЧИНГҮЙ утга хаях дүрэм (12 хэсэг хүртэл)
//   ③ `newListingHref` — линк угсрах (цэвэр линк, `?step=` БАЙХГҮЙ)
//   ④ `applyPrefill` — форм бөглөх (форм-ийн дүрэмтэй нийцэх, эх форм хөндөгдөхгүй)
//   ⑤ `prefillMobileCatStep` — 📱 drill-down-ийн анхны дэлгэц
//   ⑥ ГЭРЭЭ — `AppProviders`/`AddListingClient` эх файлыг ШУУД уншина
//   ⑦ 📄 README бичигдсэн эсэх
//
// АЖИЛЛУУЛАХ:  npm run test:prefill
// ⚠️ DB/React/CDP ХОЛБОГДОХГҮЙ — зөвхөн Node (цэвэр модуль + эх файлын гэрээ).
//    ⚠️ `lib/locationData.js` нь импортгүй цэвэр өгөгдөл тул ESM-ээр шууд
//    ачаалагдана (`lib/listingPrefill.mjs` нь `.js` extension-той импортолдог ✓)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  listingPrefillFromSearch, newListingHref, applyPrefill, prefillMobileCatStep,
} from '../lib/listingPrefill.mjs';
import {
  SECTIONS, getSubtypes, hasCategoryChoice, findSubtypeGroup,
} from '../lib/locationData.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
/** 📄 Эх файлыг унших (ГЭРЭЭ/регрессийн шалгалтад) */
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/**
 * 🧹 ЗӨВХӨН КОДЫН МӨРҮҮД (мөр ба блок тайлбарын мөрийг хасна).
 * ⚠️ ЯАГААД блок тайлбарыг regex-ээр («`/* … *\/`» хэв) биш МӨРӨӨР ВЭ: зарим
 *    файлын тайлбар дотор `/*` тэнцэлгүй байдаг тул `[\s\S]*?` нь КОДЫГ ч
 *    иддэг ✗ (шалгаж үзэв: `AppProviders.jsx` 33 175 → 17 712 тэмдэгт ✗)
 */
const codeLines = (src) => src
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
  .join('\n');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🧪 «Зар нэмэх» форм — АНГИЛАЛ УРЬДЧИЛАН БӨГЛӨХ (lib/listingPrefill.mjs)\n');

/** Хэрэглэгчийн жишээний БОДИТ URL (`/listings/new` руу дамжих хэлбэр) */
const GANGA_URL = '/?section=services&type=' + encodeURIComponent('Гагнуур');

// ────────────────────────────────────────────────────────────
// ① ХЭРЭГЛЭГЧИЙН ЖИШЭЭ — бодит зам
// ────────────────────────────────────────────────────────────
console.log('── ① Хэрэглэгчийн жишээ: … › Ажил, Үйлчилгээ › Барилга & Засвар үйлчилгээ › Гагнуур ──');

t('① хэсэг + дэд төрөл уншигдана (`section`/`type`)', () => {
  assert.deepEqual(
    listingPrefillFromSearch(GANGA_URL.slice(1)),
    { section: 'services', type: 'Гагнуур' }
  );
});

t('① бүлэг нь `type`-аас өөрөө олдоно — URL-д бүлгийн параметр БАЙХГҮЙ ✓', () => {
  // ⚠️ Форм дээр `openGroup`-ыг `findSubtypeGroup` тогтоодог тул бүлгийг
  //    тусдаа дамжуулах шаардлагагүй (нэг эх сурвалж: дэд төрөл ✓)
  assert.equal(findSubtypeGroup('services', 'Гагнуур').label, 'Барилга & Зам');
  assert.deepEqual(listingPrefillFromSearch('?section=services&group=Барилга'), { section: 'services' });
});

t('① линк нь ЦЭВЭР `/listings/new?section=…&type=…` (кирилл нь кодлогдоно)', () => {
  const href = newListingHref(listingPrefillFromSearch(GANGA_URL.slice(1)));
  assert.ok(href.startsWith('/listings/new?'), href);
  assert.equal(href.includes(' '), false); // ⚠️ зай RAW байх ёсгүй (линк эвдэрнэ ✗)
  const qs = new URLSearchParams(href.slice(href.indexOf('?')));
  assert.equal(qs.get('section'), 'services');
  assert.equal(qs.get('type'), 'Гагнуур');
  assert.equal(href.includes('step='), false); // ⚠️ `?step=` ОРУУЛАХГҮЙ
});

// ────────────────────────────────────────────────────────────
// ② `listingPrefillFromSearch` — ХҮЧИНГҮЙ утга хаях дүрэм
// ────────────────────────────────────────────────────────────
console.log('\n── ② URL-ийн шүүлт → форм (хүчингүй утга ХАЯГДАНА) ──');

t('② 🏠 `?section=real-estate&category=rent&type=Орон сууц` → 3 утга БҮГД', () => {
  assert.deepEqual(
    listingPrefillFromSearch('?section=real-estate&category=rent&type=Орон сууц'),
    { section: 'real-estate', category: 'rent', type: 'Орон сууц' }
  );
});

t('② 🚗 «сонголтгүй» хэсэгт `category` ХАЯГДАНА (формд «Зарах/Түрээслэх» БАЙХГҮЙ ✓)', () => {
  assert.equal(hasCategoryChoice('auto'), false);
  assert.deepEqual(
    listingPrefillFromSearch('?section=auto&category=rent&type=Суудлын машин'),
    { section: 'auto', type: 'Суудлын машин' }
  );
});

t('② ⚠️ Танихгүй `section` → `{}` (форм АНХДАГЧ хэвээр)', () => {
  assert.deepEqual(listingPrefillFromSearch('?section=xyz&type=Орон сууц'), {});
});

t('② ⚠️ ХҮЧИНГҮЙ дэд төрөл → зөвхөн `section` (худал сонголт үүсгэхгүй)', () => {
  assert.deepEqual(listingPrefillFromSearch('?section=auto&type=Гагнуур'), { section: 'auto' });
  // ⚠️ `type` нь ХЭСГИЙН утгатай тэнцэх ч дэд төрөл БИШ (`services` ∉ subtypes)
  assert.deepEqual(listingPrefillFromSearch('?section=services&type=services'), { section: 'services' });
});

t('② ⚠️ `category=all` (формд УТГАГҮЙ — зар нь үргэлж sell/rent) → ХАЯГДАНА', () => {
  assert.deepEqual(listingPrefillFromSearch('?section=real-estate&category=all'), { section: 'real-estate' });
});

t('② `section` байхгүй ч `?type=Орон сууц` → үл хөдлөх (нүүр хуудсны анхдагч хэсэг)', () => {
  // ⚠️ `HomeClient` нь `type`-ыг `section`-гүй ч уншдаг (`?type=Орон сууц`)
  assert.deepEqual(listingPrefillFromSearch('?type=Орон сууц'), { section: 'real-estate', type: 'Орон сууц' });
});

t('② ⚠️ `?type=Суудлын машин` ГАНЦААРАА → `{}` (аль хэсэгт харьяалагдах нь тодорхойгүй)', () => {
  assert.deepEqual(listingPrefillFromSearch('?type=Суудлын машин'), {});
});

t('② хоосон/тодорхойгүй оролт (`\'\'`, `undefined`, объект) → `{}` (крашгүй)', () => {
  assert.deepEqual(listingPrefillFromSearch(''), {});
  assert.deepEqual(listingPrefillFromSearch(undefined), {});
  assert.deepEqual(listingPrefillFromSearch(null), {});
  assert.deepEqual(listingPrefillFromSearch({ section: 'auto' }), {});
});

t('② 🌐 БҮХ 12 хэсэг: эхний дэд төрөл round-trip (жинхэнэ `SECTIONS`-ээр)', () => {
  let checked = 0;
  for (const s of SECTIONS) {
    const type = getSubtypes(s.value)[0];
    assert.ok(type, `${s.value}: дэд төрөл байх ёстой`);
    const p = listingPrefillFromSearch(`?section=${s.value}&type=${encodeURIComponent(type)}`);
    assert.equal(p.section, s.value, s.value);
    assert.equal(p.type, type, `${s.value}: ${type}`);
    checked += 1;
  }
  assert.equal(checked, 12);
});

// ────────────────────────────────────────────────────────────
// ③ `newListingHref`
// ────────────────────────────────────────────────────────────
console.log('\n── ③ Линк угсрах ──');

t('③ бөглөлтгүй → ЦЭВЭР `/listings/new` (хуучин зан төлөв ХЭВЭЭР ✓)', () => {
  assert.equal(newListingHref(), '/listings/new');
  assert.equal(newListingHref({}), '/listings/new');
  assert.equal(newListingHref(null), '/listings/new');
  // ⚠️ Хоосон утга нь параметр БОЛЖ БИЧИГДЭХГҮЙ (`?section=`) ✓
  assert.equal(newListingHref({ section: '', type: '', category: '' }), '/listings/new');
});

t('③ параметрийн ДАРААЛАЛ: `section` › `category` › `type` (тогтвортой линк ✓)', () => {
  assert.equal(
    newListingHref({ section: 'real-estate', category: 'rent', type: 'Орон сууц' }),
    '/listings/new?section=real-estate&category=rent&type=' + encodeURIComponent('Орон сууц')
  );
});

// ────────────────────────────────────────────────────────────
// ④ `applyPrefill` — формойг бөглөх
// ────────────────────────────────────────────────────────────
console.log('\n── ④ Форм бөглөх (форм-ийн дүрэмтэй нийцэх) ──');

/** `AddListingClient.emptyForm()`-ийн ЯГ тэр бүтэц (ховор талбаруудыг ч хамт) */
const emptyForm = () => ({
  category: 'sell', section: 'real-estate', attrs: {}, propertyType: '',
  rooms: '', payments: [], area: '', city: 'Улаанбаатар', district: '', khoroo: '',
  price: '', negotiable: false, priceType: 'total', phone: '', contactName: '',
  title: '', description: '', videoUrl: '',
  buildYear: '', floor: '', totalFloors: '', balconies: '', hasGarage: '', bathrooms: '',
});

t('④ Ангилал сонгогдоно (`section` + `propertyType` = дэд төрөл)', () => {
  const f = applyPrefill(emptyForm(), { section: 'services', type: 'Гагнуур' });
  assert.equal(f.section, 'services');
  assert.equal(f.propertyType, 'Гагнуур');
  // 🏠 үл хөдлөх БИШ тул «Зарах / Түрээслэх» нь форм-ийн дүрмээр `sell` ✓
  assert.equal(f.category, 'sell');
});

t('④ 🏠 «Зарах / Түрээслэх» — зөвхөн үл хөдлөхөд (тухайн утга хэвээр үлдэнэ)', () => {
  const f = applyPrefill(emptyForm(), { section: 'real-estate', category: 'rent', type: 'Орон сууц' });
  assert.equal(f.section, 'real-estate');
  assert.equal(f.category, 'rent');
  assert.equal(f.propertyType, 'Орон сууц');
});

t('④ ⚠️ Хэсэг солигдоход `category` нь `sell` болж буцна (`pickSection`-ийн дүрэм ✓)', () => {
  const f = applyPrefill(emptyForm(), { section: 'auto', category: 'rent', type: 'Суудлын машин' });
  assert.equal(f.category, 'sell');
});

t('④ ⚠️ Байхгүй талбарыг ХӨНДӨХГҮЙ (зөвхөн `section` ирвэл `propertyType` хэвээр)', () => {
  const base = emptyForm();
  base.propertyType = 'Орон сууц';
  const f = applyPrefill(base, { section: 'real-estate' });
  assert.equal(f.section, 'real-estate');
  assert.equal(f.propertyType, 'Орон сууц');
});

t('④ ⚠️ ХҮЧИНГҮЙ `type` гараар ирвэл ч ХАЯГДАНА (2 дахь хамгаалалт ✓)', () => {
  const f = applyPrefill(emptyForm(), { section: 'auto', type: 'Гагнуур' });
  assert.equal(f.section, 'auto');
  assert.equal(f.propertyType, '');
});

t('④ ⚠️ Эх форм ХӨНДӨГДӨХГҮЙ (шинэ объект буцна ✓)', () => {
  const base = emptyForm();
  const before = JSON.stringify(base);
  const f = applyPrefill(base, { section: 'services', type: 'Гагнуур' });
  assert.equal(JSON.stringify(base), before);
  assert.notEqual(f, base);
});

t('④ Бөглөлтгүй (`{}` / `undefined`) → форм ХЭВЭЭР (нөлөөгүй ✓)', () => {
  const base = emptyForm();
  assert.equal(applyPrefill(base, {}), base);
  assert.equal(applyPrefill(base, undefined), base);
  assert.equal(applyPrefill(null, { section: 'auto' }).section, 'auto'); // крашгүй
});

// ────────────────────────────────────────────────────────────
// ⑤ `prefillMobileCatStep` — 📱 drill-down-ийн АНХНЫ дэлгэц
// ────────────────────────────────────────────────────────────
console.log('\n── ⑤ 📱 390px — анхны дэлгэц ──');

t('⑤ 📱 Дэд төрөлтэй → шууд «Төрөл» дэлгэцээс эхэлнэ', () => {
  assert.equal(prefillMobileCatStep({ section: 'services', type: 'Гагнуур' }), 'subtype');
});

t('⑤ 📱 Дэд төрөлгүй → «Хэсэг» дэлгэцээс эхэлнэ (сонголтоо харна ✓)', () => {
  assert.equal(prefillMobileCatStep({}), 'section');
  assert.equal(prefillMobileCatStep({ section: 'auto' }), 'section');
  assert.equal(prefillMobileCatStep(undefined), 'section');
});

// ────────────────────────────────────────────────────────────
// ⑥ ГЭРЭЭ — эх файлыг ШУУД унших (санамсаргүй салгахаас сэргийлнэ)
// ────────────────────────────────────────────────────────────
console.log('\n── ⑥ ГЭРЭЭ (эх код) ──');

t('⑥ `AppProviders` — «Зар нэмэх» товч нь URL-ийн ангилалыг форм руу дамжуулна', () => {
  const src = codeLines(readSrc('components/AppProviders.jsx'));
  assert.ok(src.includes("from '../lib/listingPrefill.mjs'"), 'import алга');
  assert.ok(src.includes('newListingHref(listingPrefillFromSearch('), 'openAdd дээр угсрах алга');
  assert.ok(src.includes('window.location.search'), 'одоогийн URL уншихгүй байна');
  // ⚠️ ХАТУУ линк үлдвэл ангилал ДАМЖИХГҮЙ ✗ (регресс барь)
  assert.equal(src.includes("router.push('/listings/new')"), false);
});

t('⑥ `AddListingClient` — форм дээр УРЬДЧИЛАН бөглөнө (effect-ээр ⇒ hydration зөрүүгүй)', () => {
  const src = codeLines(readSrc('components/AddListingClient.jsx'));
  assert.ok(src.includes('const prefill = listingPrefillFromSearch(searchParams.toString())'));
  assert.ok(src.includes('applyPrefill(emptyForm(), prefill)'));
  assert.ok(src.includes('setMobileCatStep(prefillMobileCatStep(prefill))'));
  // ⚠️ Алхам солиход ч ангилал URL-д ҮЛДЭХ ЁСТОЙ (эс бөгөөс 2-р алхам дээр
  //    refresh хийвэл ангилал алга болно ✗)
  assert.ok(src.includes("if (prefill.type) qs.set('type', prefill.type)"));
  // ⚠️ `useState(emptyForm)` ХЭВЭЭР байх ЁСТОЙ — урьдчилсан утга нь АНХНЫ
  //    төлөвт орвол SSR (сервер) ба клиент зөрүүтэй рендэрлэнэ ✗
  assert.ok(src.includes('useState(emptyForm)'));
});

t('⑥ `lib/listingPrefill.mjs` — `./locationData.js` (extension-той ⇒ Node ESM шууд ачаална)', () => {
  const src = readSrc('lib/listingPrefill.mjs');
  assert.ok(src.includes("from './locationData.js'"));
  // ⚠️ `window`/`document` ХЭРЭГЛЭХГҮЙ (цэвэр модуль — Node тестэд ажиллана ✓)
  const code = codeLines(src);
  assert.equal(code.includes('window.'), false);
  assert.equal(code.includes('document.'), false);
  assert.equal(code.includes("'use client'"), false);
});

// ────────────────────────────────────────────────────────────
// ⑦ 📄 DOC ГЭРЭЭ
// ────────────────────────────────────────────────────────────
console.log('\n── ⑦ README — баримт ──');

const README = readSrc('README.md');

t('⑦ README: «Зар нэмэх» хэсэгт урьдчилсан ангилал тайлбарлагдсан', () => {
  const at = README.indexOf('УРЬДЧИЛАН БӨГЛӨХ');
  assert.ok(at > 0, 'README-д «УРЬДЧИЛАН БӨГЛӨХ» хэсэг БАЙХГҮЙ');
  const block = README.slice(at - 200, at + 4000);
  assert.ok(block.includes('Гагнуур'), 'хэрэглэгчийн жишээ алга');
  assert.ok(block.includes('listingPrefill.mjs'), 'модулийн нэр алга');
  assert.ok(block.includes('Ноорог'), 'ноорог давамгайлах дүрэм алга');
});

t('⑦ README: тестийн жагсаалтад `test:prefill` бичигдсэн', () => {
  assert.ok(README.includes('test:prefill'));
  assert.ok(README.includes('scripts/test-prefill.mjs'));
});

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест\n`);
