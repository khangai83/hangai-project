// ============================================================
// test-filters.mjs — ШҮҮЛТИЙН ЛОГИКИЙН тест (lib/locationData.js)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ (2026-09-28):
//   `attrFilters` нь sidebar-ийн шүүлтийг ТОДОРХОЙЛДОГ. Талбарын төрлийг
//   буруу бичвэл (ж: `range` мартах, `filterable` мартах) шүүлт ХАРАГДАХГҮЙ
//   эсвэл `lib/queries.js` нь `attrs->>year_from` гэсэн утгагүй шүүлт хийж,
//   хэрэглэгч «шүүлт тавьсан ч 0 үр дүн» гэж гайхана ✗ — энэ тест тэр
//   эрсдэлийг барьж, ОНЫ ХҮРЭЭ ба ТЕКСТ шүүлтийн гэрээг түгждэг ✓
//
// АЖИЛЛУУЛАХ:  npm run test:filters
//
// ⚠️ `lib/locationData.js` нь ЯМАР Ч импортгүй цэвэр өгөгдлийн модуль тул
//    Node-ийн ESM-ээр ШУУД ачаалж болно (хамгийн хурдан, орчин шаардахгүй) ✓
// ⚠️ Сервер талын query (ilike/gte/lte) нь ЭНД шалгагдахгүй — түүнийг бодит
//    DB дээр шалгана (`README.md` → «🔎 Хайлттай сонголт» хэсгийн тестийн лог).
// ============================================================
import assert from 'node:assert/strict';
import {
  SECTIONS, getSubtypes, getAttrFilters, getAttrField,
  parseAttrRangeKey, getAttrRangeKeys, formatAttrsLine, getSection, hasSimpleForm,
} from '../lib/locationData.js';

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🧪 Шүүлтийн логик (lib/locationData.js)\n');

// ---- ① 🚗 Автомашин: ЗАГВАР + ХОЁР ОН ----
t("getAttrFilters('auto') — 7 шүүлт (Үйлдвэрлэгч, Загвар, 2 он, хайрцаг, түлш, хөтлөгч)", () => {
  const keys = getAttrFilters('auto').map((f) => f.key);
  assert.deepEqual(keys, ['brand', 'model', 'year', 'importYear', 'transmission', 'fuel', 'drive']);
});

t('🚙 Загвар нь ЧӨЛӨӨТ ТЕКСТ шүүлт (filterable, select БИШ)', () => {
  const f = getAttrFilters('auto').find((x) => x.key === 'model');
  assert.equal(f.type, 'text');
  assert.equal(f.filterable, true);
  assert.equal(f.range, undefined);
});

t('📅 Үйлдвэрлэсэн он ба 📥 Орж ирсэн он нь ХҮРЭЭ шүүлт (range, number)', () => {
  for (const key of ['year', 'importYear']) {
    const f = getAttrFilters('auto').find((x) => x.key === key);
    assert.equal(f.type, 'number');
    assert.equal(f.filterable, true);
    assert.equal(f.range, true);
    assert.equal(f.icon, key === 'year' ? '📅' : '📥');
  }
});

t('🏷️ Үйлдвэрлэгч нь хайлттай combobox хэвээр (регресс БАЙХГҮЙ)', () => {
  const f = getAttrFilters('auto').find((x) => x.key === 'brand');
  assert.equal(f.searchable, true);
  assert.equal(f.type, 'select');
  // ⚠️ 2026-09-28: label «Брэнд» → «Үйлдвэрлэгч» (key нь `brand` ХЭВЭЭР)
  assert.equal(f.label, 'Үйлдвэрлэгч');
  assert.ok(f.options.length >= 95); // 38 → 95 болж өргөжсөн
});

t("Бусад хэсгийн шүүлт (jobs: 3, computers: 3, home: 1, services: 3)", () => {
  const count = (s) => getAttrFilters(s).length;
  assert.equal(count('jobs'), 3);
  assert.equal(count('computers'), 3);
  // ⚡ 2026-09-29: `home` (Гэр ахуйн бараа) мөн ХЯЛБАР ФОРМ болсон тул
  //    `📦 Хүргэлт` ХАСАГДАВ — зөвхөн `✅ Шинэ / Хуучин` үлдэнэ (2 → 1) ✓
  assert.equal(count('home'), 1);
  assert.equal(count('services'), 3);
});

t('Шүүлтэд ороогүй талбар (mileage, engine) ГООЛДОХГҮЙ', () => {
  const keys = getAttrFilters('auto').map((f) => f.key);
  assert.ok(!keys.includes('mileage'));
  assert.ok(!keys.includes('engine'));
  // ⚠️ Гэхдээ ФОРМ дээр (attrFields) байх ЁСТОЙ
  assert.ok(getAttrField('auto', 'mileage'));
  assert.ok(getAttrField('auto', 'engine'));
});

t('⚙️ ФОРМ-ын талбар дараалал: brand → model → year → importYear → mileage', () => {
  const sec = getSection('auto');
  assert.deepEqual(
    sec.attrFields.slice(0, 5).map((f) => f.key),
    ['brand', 'model', 'year', 'importYear', 'mileage'],
  );
});

// ---- ② 🚗 «Авто түрээслүүлнэ» дэд төрөл ----
t("«Авто түрээслүүлнэ» нь авто хэсгийн дэд төрөл (10 болсон)", () => {
  const subtypes = getSubtypes('auto');
  assert.ok(subtypes.includes('Авто түрээслүүлнэ'));
  assert.equal(subtypes.length, 10);
  // ⚠️ Хуучин нэрс (2026-09-27-д нэгтгэсэн) эргэж ОРОХГҮЙ
  assert.ok(!subtypes.includes('Седан'));
  assert.ok(!subtypes.includes('Хэтчбек'));
});

t('«Авто түрээслүүлнэ» нь ЗӨВХӨН авто хэсэгт (бусад хэсэгт давхардахгүй)', () => {
  const others = SECTIONS.filter((s) => s.value !== 'auto')
    .flatMap((s) => getSubtypes(s.value));
  assert.ok(!others.includes('Авто түрээслүүлнэ'));
});

// ---- ③ 📅 Хүрээний түлхүүрийн гэрээ ----
t("parseAttrRangeKey: 'year_from' → base/year, 'importYear_to' → base/importYear", () => {
  assert.deepEqual(parseAttrRangeKey('year_from'), { base: 'year', dir: 'from' });
  assert.deepEqual(parseAttrRangeKey('importYear_to'), { base: 'importYear', dir: 'to' });
});

t('parseAttrRangeKey: хүрээ БИШ түлхүүрт null (brand, model, mileage)', () => {
  assert.equal(parseAttrRangeKey('brand'), null);
  assert.equal(parseAttrRangeKey('model'), null);
  assert.equal(parseAttrRangeKey(''), null);
  assert.equal(parseAttrRangeKey(undefined), null);
});

t("getAttrRangeKeys('year') → { from:'year_from', to:'year_to' } (HomeClient/queries НЭГ гэрээтэй)", () => {
  assert.deepEqual(getAttrRangeKeys('year'), { from: 'year_from', to: 'year_to' });
  // ⚠️ URL ба `attrs` түлхүүр нь ИЖИЛ байх ёстой (`attr_` угтвар нь URL-д)
  assert.equal(`attr_${getAttrRangeKeys('importYear').from}`, 'attr_importYear_from');
});

// ---- ④ 🚗 Картын мөр дээрх шинэ үзүүлэлт ----
t("formatAttrsLine: «Toyota Harrier, 2018 · 📥 2021 онд орж ирсэн · 95,200 км…»", () => {
  const line = formatAttrsLine('auto', {
    brand: 'Toyota', model: 'Harrier', year: '2018', importYear: '2021',
    mileage: '95200', transmission: 'Автомат', engine: '2.5', fuel: 'Хайбрид',
  });
  assert.ok(line.startsWith('Toyota Harrier, 2018'));
  assert.ok(line.includes('📥 2021 онд орж ирсэн'));
  assert.ok(line.includes('95,200 км'));
  // ⚠️ «Үйлдвэрлэсэн он» ДАВХАРДАХГҮЙ (head дотор нэг л удаа)
  assert.equal(line.split('2018').length - 1, 1);
});

t('formatAttrsLine: importYear хоосон бол мөрөнд ОРОХГҮЙ (хоосон таслалтгүй)', () => {
  const line = formatAttrsLine('auto', { brand: 'Nissan', model: 'X-Trail', importYear: '' });
  assert.equal(line, 'Nissan X-Trail');
});

// ---- ⑤ ⚽ Аяллын хэрэгсэл (hobby): ХЯЛБАР ФОРМ (2026-09-29) ----
// Хэрэглэгчийн хүсэлт: «зөвхөн байршил, шинэ эсвэл хуучин, үнэ, утас, тайлбар
// асуудаг байя». ⚠️ Энэ тест нь form/шүүлт/`simpleForm` гэрээг түгждэг.
t('⚽ hobby: ЗӨВХӨН «Шинэ / Хуучин» (condition) шүүлттэй', () => {
  const keys = getAttrFilters('hobby').map((f) => f.key);
  assert.deepEqual(keys, ['condition']);
  const f = getAttrFilters('hobby')[0];
  assert.equal(f.label, 'Шинэ / Хуучин');
  // ✅ 2026-09-29 (хэрэглэгчийн шаардлага): ЯГ 2 сонголт — өмнө нь 4 байв ✗
  assert.deepEqual(f.options, ['Шинэ', 'Хуучин']);
});

// ---- ⑤б ✅ «ШИНЭ / ХУУЧИН» — БҮХ хэсэгт НЭГ ижил (2026-09-29) ----
// Хэрэглэгчийн шаардлага: «Шинэ / Хуучин гэж нэрлээд энэ 2 л сонголтыг оруул».
// ⚠️ ӨМНӨ нь хэсэг тус бүрд `Төлөв` / `Шинэ эсвэл хуучин` гэж ЯЛГААТАЙ нэрээр,
//    4 сонголттой байв (Хэрэглэсэн — сайн / — хэвийн / Засвар шаардлагатай) ✗
t('✅ Форм (attrFields) ба шүүлт (attrFilters) — condition нь 2 сонголттой', () => {
  const sections = SECTIONS.filter((s) => s.attrFields.some((f) => f.key === 'condition'));
  assert.ok(sections.length >= 2, 'condition талбартай хэсэг байх ёстой');
  sections.forEach((s) => {
    const field = getAttrField(s.value, 'condition');
    assert.equal(field.label, 'Шинэ / Хуучин', `${s.value}: формоны нэр`);
    assert.deepEqual(field.options, ['Шинэ', 'Хуучин'], `${s.value}: формоны сонголт`);
    // Шүүлтэд харагдах хувилбар нь МӨН ижил байх ёстой (нэг эх сурвалж ✓)
    const filter = getAttrFilters(s.value).find((f) => f.key === 'condition');
    if (filter) {
      assert.equal(filter.label, 'Шинэ / Хуучин', `${s.value}: шүүлтийн нэр`);
      assert.deepEqual(filter.options, ['Шинэ', 'Хуучин'], `${s.value}: шүүлтийн сонголт`);
    }
  });
});

t('🚫 «Хэрэглэсэн — сайн/хэвийн», «Засвар шаардлагатай» сонголтууд БҮРЭН ХАСАГДСАН', () => {
  SECTIONS.forEach((s) => {
    const field = s.attrFields.find((f) => f.key === 'condition');
    if (!field) return;
    ['Хэрэглэсэн — сайн', 'Хэрэглэсэн — хэвийн', 'Засвар шаардлагатай', 'Хэвийн', 'Төлөв', 'Шинэ эсвэл хуучин']
      .forEach((bad) => {
        assert.ok(!field.options.includes(bad), `${s.value}: «${bad}» сонголт үлдсэн ✗`);
        assert.notEqual(field.label, bad, `${s.value}: хуучин нэр «${bad}» үлдсэн ✗`);
      });
  });
});

t('⚽ hobby: форм дээр зөвхөн condition талбар (brand/model/size/delivery ХАСАГДСАН)', () => {
  const keys = getSection('hobby').attrFields.map((f) => f.key);
  assert.deepEqual(keys, ['condition']);
  // ⚠️ Хуучин талбарууд getAttrField-ээр ч ОЛДОХГҮЙ (форм автоматаар үүсдэг)
  for (const k of ['brand', 'model', 'size', 'delivery']) {
    assert.equal(getAttrField('hobby', k), null);
  }
  // ⚠️ Гэхдээ `formatAttrsLine` нь `field.icon` байхгүй үед ч эвдрэхгүй
  //    (`hobby` нь CARD_ATTR_ORDER-д байхгүй тул үр дүн нь '' хэвээр ✓)
  assert.equal(formatAttrsLine('hobby', { brand: 'Giant', condition: 'Шинэ' }), '');
});

// ---- ⑤в 🛋️ Гэр ахуйн бараа (home): МӨН ХЯЛБАР ФОРМ (2026-09-29) ----
// Хэрэглэгчийн хүсэлт: «Гэр ахуйн барааг мөн адил ийм форматтай болго, хурдан хий».
t('🛋️ home: ЗӨВХӨН «Шинэ / Хуучин» шүүлттэй — 🚚 Хүргэлт ХАСАГДСАН', () => {
  const keys = getAttrFilters('home').map((f) => f.key);
  assert.deepEqual(keys, ['condition']);
  const f = getAttrFilters('home')[0];
  assert.equal(f.label, 'Шинэ / Хуучин');
  assert.deepEqual(f.options, ['Шинэ', 'Хуучин']);
});

t('🛋️ home: форм дээр зөвхөн condition (brand/material/size/color/delivery ХАСАГДСАН)', () => {
  const keys = getSection('home').attrFields.map((f) => f.key);
  assert.deepEqual(keys, ['condition']);
  // ⚠️ Хуучин талбарууд getAttrField-ээр ч ОЛДОХГҮЙ (форм автоматаар үүсдэг)
  for (const k of ['brand', 'material', 'size', 'color', 'delivery']) {
    assert.equal(getAttrField('home', k), null, `${k} формоос хасагдсан байх ёстой ✗`);
  }
  // ⚠️ ХУУЧИН заруудын карт мөр ХЭВЭЭР харагдана (CARD_ATTR_ORDER.home-д
  //    түлхүүрүүд байсаар байна + DB-д attrs нь устдаггүй ✓)
  assert.equal(
    formatAttrsLine('home', { brand: 'IKEA', size: '200×90 см', condition: 'Хуучин' }),
    'IKEA · 200×90 см · ✅ Хуучин',
  );
  // ⚠️ ШИНЭ зар (зөвхөн condition) → мөр богиносно, эвдрэхгүй ✓
  assert.equal(formatAttrsLine('home', { condition: 'Хуучин' }), '✅ Хуучин');
  assert.equal(formatAttrsLine('home', {}), '');
});

t('⚡ hasSimpleForm: ⚽ hobby БА 🛋️ home (бусад 5 хэсэгт false)', () => {
  assert.equal(hasSimpleForm('hobby'), true);
  // ⚡ 2026-09-29 (хэрэглэгчийн хүсэлт): «Гэр ахуйн барааг мөн адил ийм форматтай
  //    болго» → 🛋️ `home` мөн хялбар форм болов ✓
  assert.equal(hasSimpleForm('home'), true);
  for (const s of ['real-estate', 'auto', 'jobs', 'computers', 'services']) {
    assert.equal(hasSimpleForm(s), false, `${s} нь хялбар форм БИШ`);
  }
  // ⚠️ Танихгүй утга → `getSection` нь `real-estate` руу буулгана (crash БАЙХГҮЙ)
  assert.equal(hasSimpleForm('unknown-section'), false);
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);
