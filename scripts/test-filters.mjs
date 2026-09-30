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
import { readFileSync } from 'node:fs';   // 💼 0024 migration-ийг шалгах (2026-09-30)
import {
  SECTIONS, getSubtypes, getAttrFilters, getAttrField,
  parseAttrRangeKey, getAttrRangeKeys, formatAttrsLine, getSection, hasSimpleForm,
  getSubtypeGroups, findSubtypeGroup,   // 🛠/💻/⚡/🛋️ 3 дахь түвшин (2026-09-27, -29, -30)
  // 💻 2026-09-30 (6): Notebook-ийн нэмэлт талбар (`onlySubtypes` + сонголтууд)
  getAttrFields, NOTEBOOK_BRANDS, PC_SPEC_SUBTYPES,
  NOTEBOOK_SCREEN_OPTIONS, NOTEBOOK_CPU_OPTIONS, NOTEBOOK_RAM_OPTIONS, NOTEBOOK_STORAGE_OPTIONS,
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

t("Бусад хэсгийн шүүлт (jobs: 3, computers: 3, furniture/home/travel: 1, electric: 1, 🧱 1, 🏭 1, services: 3)", () => {
  const count = (s) => getAttrFilters(s).length;
  assert.equal(count('jobs'), 3);
  assert.equal(count('computers'), 3);
  // ⚡ 2026-09-29: `home` (Гэр ахуйн бараа) мөн ХЯЛБАР ФОРМ болсон тул
  //    `📦 Хүргэлт` ХАСАГДАВ — зөвхөн `✅ Шинэ / Хуучин` үлдэнэ (2 → 1) ✓
  assert.equal(count('home'), 1);
  // ⚡ 2026-09-30: `electric` (Цахилгаан бараа) — ШИНЭ хэсэг, мөн 1 шүүлт
  //    (хэсэг + бүлэг + дэд төрөл нь самбар дээрээ, sidebar-д «Шинэ / Хуучин») ✓
  assert.equal(count('electric'), 1);
  // 🧱/🏭 2026-09-30 (2): 2 ШИНЭ хэсэг — мөн 1 шүүлт (🛋️/⚡-той ижил ХЯЛБАР ФОРМ)
  //    ⚠️ Дэд төрөл нь ХАВТГАЙ (23 ба 20) — самбар дээр бүгд шууд харагдана ✓
  assert.equal(count('construction'), 1);
  assert.equal(count('equipment'), 1);
  // 🛋️/🧳 2026-09-30 (5): 2 ШИНЭ 1-Р ТҮВШНИЙ хэсэг — мөн 1 л шүүлт
  //    (дэд төрөл нь ХАВТГАЙ: 13 ба 12 — 🧱/🏭-ийн ЯГ ИЖИЛ хялбар форм ✓)
  assert.equal(count('furniture'), 1);
  assert.equal(count('travel'), 1);
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

// ---- ⑤г ⚽ Аялал, Спорт, Хобби: 6 ХАВТГАЙ дэд төрөл (2026-09-30 (5)) ----
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Тавилга болон Аяллын хэрэгсэл -ийг 1-р Category
// болго. Аяллын хэрэгсэл -ийг Аяны бараа нэртэй болго» → «Аяллын хэрэгсэл»
// (12 дэд төрөл) нь 🧳 `travel` («Аяны бараа») ТУСДАА ХЭСЭГ болов.
// ⇒ ЭНД үлдсэн 6 нь ШУУД (2 дахь түвшин) — 3 дахь түвшин (бүлэг) БАЙХГҮЙ ✓
t('⚽ Хэсгийн нэр «Аялал, Спорт, Хобби» (value нь `hobby` ХЭВЭЭР)', () => {
  const sec = getSection('hobby');
  assert.equal(sec.label, 'Аялал, Спорт, Хобби');
  assert.equal(sec.value, 'hobby');   // ⚠️ DB/URL/CHECK хөндөгдөөгүй ✓
  assert.equal(sec.icon, '⚽');
  // ⚠️ ХУУЧИН нэр хаана ч үлдэхгүй (2026-09-30 (4)-д солигдсон)
  assert.notEqual(sec.label, 'Амралт, спорт, хобби');
});

t('⚽ hobby: 6 дэд төрөл — 3 дахь түвшин (бүлэг) БҮРЭН ХАСАГДСАН', () => {
  // ⚠️ 2026-09-30 (5): өмнө нь 7 бүлэг (1 нь 12 item-тай) байв — «Аяллын
  //    хэрэгсэл» бүлэг нь 🧳 `travel` тусдаа хэсэг болж ГАРСНЫ дараа бүлэг
  //    үлдэхгүй (subtypeGroups ХАСАГДАВ) → панельд 6 мөр ШУУД харагдана ✓
  assert.deepEqual(getSubtypeGroups('hobby'), []);
  const subtypes = getSubtypes('hobby');
  assert.deepEqual(subtypes, [
    'Загас ан агнуур', 'Ном, сонин, сэтгүүл', 'Спортын хэрэгсэл',
    'Хөгжмийн зэмсэг', 'Цуглуулга', 'Унадаг дугуй, сэлбэг',
  ]);
  assert.equal(new Set(subtypes).size, 6);   // ⚠️ давхардал 0
  // ⚠️ Бүлгийн ГАРЧИГ ба «хэрэглэгчийн 12 дэд төрөл» ЭНД БАЙХГҮЙ (🧳 рүү шилжив)
  assert.ok(!subtypes.includes('Аяллын хэрэгсэл'));
  assert.ok(!subtypes.includes('Майхан, сүүдрэвч'));
  // ⚠️ «Бусад» ⚽ hobby-д БАЙХГҮЙ — 🧳 `travel`-д (2026-09-30 (5)) ✓
  assert.ok(!subtypes.includes('Бусад'));
});

t('⚽ hobby: бүлэггүй тул breadcrumb 2 түвшинтэй (findSubtypeGroup → null)', () => {
  for (const s of getSubtypes('hobby')) {
    assert.equal(findSubtypeGroup('hobby', s), null, `«${s}» → null байх ёстой`);
  }
  // ⚠️ Хуучин бүлгийн гарчиг ч item БИШ (DB-д тийм `property_type` үүсэхгүй ✓)
  assert.equal(findSubtypeGroup('hobby', 'Аяллын хэрэгсэл'), null);
});

// ---- ⑤д 🧳 «АЯНЫ БАРАА» — ШИНЭ 1-Р ТҮВШНИЙ ХЭСЭГ (2026-09-30 (5)) ----
// 🎯 Хэрэглэгчийн хүсэлт: «Аяллын хэрэгсэл -ийг Аяны бараа нэртэй болго» +
// «1-р Category болго» → ⚽ hobby-гийн 3 дахь түвшний «Аяллын хэрэгсэл» бүлэг
// (12 item, `collapsed: true`) нь ТУСДАА хэсэг болж, 12 нэр нь ШУУД дэд төрөл
// (2 дахь түвшин) болов ✓ — 🧱 construction/🏭 equipment-ийн ЯГ ИЖИЛ хавтгай мод.
t('🧳 travel: нэр «Аяны бараа», icon 🧳, value `travel` (DB-д ШИНЭ утга)', () => {
  const sec = getSection('travel');
  assert.equal(sec.label, 'Аяны бараа');
  assert.equal(sec.value, 'travel');
  assert.equal(sec.icon, '🧳');
  // ✏️ ХУУЧИН нэр «Аяллын хэрэгсэл» нь ОДОО хэсгийн нэр БИШ ✓
  assert.notEqual(sec.label, 'Аяллын хэрэгсэл');
  // ⚠️ DB-д хадгалахын тулд `listings_section_valid` CHECK-д 'travel' нэмэх
  //    ЁСТОЙ → `0026_furniture_travel_sections.sql` (доор шалгана ✓)
  assert.equal(hasSimpleForm('travel'), true);
  assert.deepEqual(getAttrFilters('travel').map((f) => f.key), ['condition']);
  assert.deepEqual(getSection('travel').attrFields.map((f) => f.key), ['condition']);
});

t('🧳 travel: 12 дэд төрөл — хэрэглэгчийн жагсаалтын ЯГ дарааллаар', () => {
  const subtypes = getSubtypes('travel');
  assert.equal(subtypes.length, 12);
  assert.equal(new Set(subtypes).size, 12);   // ⚠️ давхардал 0
  assert.deepEqual(subtypes, [
    'Аяны гэрэл, power bank', 'Аяны хоолны хэрэгсэл', 'Аяны ор гудас',
    'Аяны ширээ сандал', 'Аяны цүнх, чемодан', 'Аяны цахилгаан хэрэгсэл',
    'Бассейн, зөөврийн душ', 'Завь ба дагалдах хэрэгсэл',
    'Майхан, сүүдрэвч', 'Нүдний дуран, телескоп', 'Уулын хэрэгсэл', 'Бусад',
  ]);
  // ⚠️ Бүлгийн гарчиг нь дэд төрөл БИШ (панельд «Аяллын хэрэгсэл»-ээр
  //    шүүх боломжгүй — тэр нь зөвхөн хуучин навигацийн гарчиг байв) ✓
  assert.ok(!subtypes.includes('Аяллын хэрэгсэл'));
  // ⚠️ «Бусад» нь ЗӨВХӨН 1 удаа (12 дахь мөр) ✓
  assert.equal(subtypes.filter((s) => s === 'Бусад').length, 1);
  // ⚠️ 3 дахь түвшин (бүлэг) БАЙХГҮЙ → `getSubtypeGroups` → [] ✓
  assert.deepEqual(getSubtypeGroups('travel'), []);
  assert.equal(findSubtypeGroup('travel', 'Майхан, сүүдрэвч'), null);
  assert.equal(findSubtypeGroup('travel', 'Бусад'), null);
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

t('⚡ hasSimpleForm: ⚽ hobby, 🧺 home, 🛋️ furniture, 🧳 travel ба ⚡ electric (бусад 5 хэсэгт false)', () => {
  assert.equal(hasSimpleForm('hobby'), true);
  // ⚡ 2026-09-29 (хэрэглэгчийн хүсэлт): «Гэр ахуйн барааг мөн адил ийм форматтай
  //    болго» → 🧺 `home` мөн хялбар форм болов ✓
  assert.equal(hasSimpleForm('home'), true);
  // ⚡ 2026-09-30 (хэрэглэгчийн хүсэлт): ⚡ «Цахилгаан бараа» — шинэ хэсэг,
  //    🧺 home-той ижил хялбар форм (форм зөвхөн «Шинэ / Хуучин» асууна) ✓
  assert.equal(hasSimpleForm('electric'), true);
  // 🛋️/🧳 2026-09-30 (5): 2 ШИНЭ хэсэг мөн хялбар форм (🧺 home-той ЯГ ИЖИЛ) —
  //    дэд төрөл нь хавтгай (13 ба 12) тул форм урт болохгүй ✓
  assert.equal(hasSimpleForm('furniture'), true);
  assert.equal(hasSimpleForm('travel'), true);
  for (const s of ['real-estate', 'auto', 'jobs', 'computers', 'services']) {
    assert.equal(hasSimpleForm(s), false, `${s} нь хялбар форм БИШ`);
  }
  // ⚠️ Танихгүй утга → `getSection` нь `real-estate` руу буулгана (crash БАЙХГҮЙ)
  assert.equal(hasSimpleForm('unknown-section'), false);
});

// ---- ⑥ 💻 «Компьютер, Дагалдах хэрэгсэл»: 3 ТҮВШНИЙ МОД (2026-09-29) ----
// Хэрэглэгчийн хүсэлт: «Компьютер гэдэг хэсгийг Компьютер, Дагалдах хэрэгсэл
// гэж нэрлээд доорх модоор … Үйлчилгээ категори шиг болго».
// ⚠️ Энэ тест нь хэрэглэгчийн ӨГСӨН МОДЫГ ЯГ түгждэг — санамсаргүй өөрчлөлт,
//    мөн «групп нь өөрөө сонгогдох» алдааг барьж өгнө ✓
t("💻 Хэсгийн нэр «Компьютер, Дагалдах хэрэгсэл» (value нь `computers` ХЭВЭЭР)", () => {
  const sec = getSection('computers');
  assert.equal(sec.label, 'Компьютер, Дагалдах хэрэгсэл');
  assert.equal(sec.value, 'computers');   // ⚠️ DB/URL/CHECK хөндөгдөөгүй ✓
  assert.equal(sec.icon, '💻');
});

t('💻 9 бүлэг — 4 нь доод түвшинтэй, 5 нь ӨӨРӨӨ сонгогдоно', () => {
  const groups = getSubtypeGroups('computers');
  assert.equal(groups.length, 9);
  assert.deepEqual(groups.map((g) => g.label), [
    'Суурин компьютер', 'Notebook', 'PS, XBox, Nintendo', 'Дагалдах хэрэгсэл',
    'Чихэвч', 'Принтер, Хувилагч, Сканнер, Ламинатор', 'iPad, Tablet, Kindle',
    'Принтер, Хувилагчийн хор', 'Бусад сэлбэг',
  ]);
  assert.equal(groups.filter((g) => g.items.length > 0).length, 4);
  assert.equal(groups.filter((g) => g.items.length === 0).length, 5);
});

t('💻 Бүлгүүдийн дэд төрлүүд хэрэглэгчийн жагсаалттай ЯГ ТААРНА', () => {
  const byLabel = (l) => getSubtypeGroups('computers').find((g) => g.label === l).items;
  assert.deepEqual(byLabel('Суурин компьютер'),
    ['Иж бүрэн компьютер', 'Дэлгэц', 'Процессор, сервер', 'Mouse', 'Keyboard']);
  assert.deepEqual(byLabel('Notebook'),
    ['Apple', 'Acer', 'Asus', 'Toshiba', 'Compaq', 'Dell', 'Dere', 'Evoo', 'Fujitsu',
      'Gateway', 'Haier', 'HP', 'Lenovo', 'LG', 'Microsoft Surface', 'MSI', 'Samsung',
      'Sony', 'Redmi', 'Razer Blade', 'Huawei', 'Бусад']);
  assert.deepEqual(byLabel('PS, XBox, Nintendo'),
    ['Xbox', 'Xbox-ын тоглоомууд', 'Playstation', 'Playstation-ийн тоглоомууд',
      'Nintendo, Тоглоомууд', 'PS, XBox, Nintendo тоглоом суулгана', 'Бусад']);
  assert.deepEqual(byLabel('Дагалдах хэрэгсэл'),
    ['Зөөврийн хард, флаш', 'Модем', 'Свич', 'Проектор', 'Тог баригч',
      'Audio Video', 'Notebook цүнх', 'Бусад']);
});

t('💻 getSubtypes: 45 дэд төрөл, ДАВХАРДАЛГҮЙ (3 «Бусад» нэг утга болов)', () => {
  const subtypes = getSubtypes('computers');
  assert.equal(subtypes.length, 45);
  assert.equal(new Set(subtypes).size, subtypes.length);
  assert.equal(subtypes.filter((t) => t === 'Бусад').length, 1);
  // Доод түвшингүй бүлгүүд нь ӨӨРӨӨ дэд төрөл (сонгогдоно) ✓
  ['Чихэвч', 'Принтер, Хувилагч, Сканнер, Ламинатор', 'iPad, Tablet, Kindle',
    'Принтер, Хувилагчийн хор', 'Бусад сэлбэг'].forEach((l) => assert.ok(subtypes.includes(l), l));
});

t('💻 Доод түвшинтэй бүлэг (Notebook, Суурин компьютер) ЗАР болж ХАДГАЛАГДАХГҮЙ', () => {
  const subtypes = getSubtypes('computers');
  ['Notebook', 'Суурин компьютер', 'PS, XBox, Nintendo', 'Дагалдах хэрэгсэл']
    .forEach((g) => assert.ok(!subtypes.includes(g), `«${g}» групп нь шүүлт БИШ ✗`));
});

t('💻 Хуучин 11 хавтгай дэд төрөл БҮРЭН ХАСАГДСАН', () => {
  const subtypes = getSubtypes('computers');
  ['Зөөврийн компьютер', 'Монитор', 'Принтер, сканнер', 'Сүлжээ, роутер',
    'Хадгалах сан, SSD', 'Эд анги, сэлбэг', 'Гар, хулгана, хэрэгсэл', 'Тоглоом, консол',
    'Програм хангамж'].forEach((t) => assert.ok(!subtypes.includes(t), `хуучин «${t}» үлдсэн ✗`));
});

t('💻 findSubtypeGroup: «Apple» → Notebook; leaf групп («Чихэвч») → null', () => {
  assert.equal(findSubtypeGroup('computers', 'Apple').label, 'Notebook');
  assert.equal(findSubtypeGroup('computers', 'Тог баригч').label, 'Дагалдах хэрэгсэл');
  // ⚠️ Доод түвшингүй групп нь item БИШ (өөрөө дэд төрөл) → breadcrumb-д нэмэгдэхгүй
  assert.equal(findSubtypeGroup('computers', 'Чихэвч'), null);
  // ⚠️ 3 бүлэгт давхардсан «Бусад» → ЭХНИЙ бүлэг (Notebook) буцаана (баримтжуулсан ✓)
  assert.equal(findSubtypeGroup('computers', 'Бусад').label, 'Notebook');
});

t('💻 Доод түвшинтэй БҮХ 4 бүлэг `collapsed: true` — 3 дахь түвшин 2 дахь дээр ХАРАГДАХГҮЙ', () => {
  const groups = getSubtypeGroups('computers');
  // Хэрэглэгчийн хүсэлт (2026-09-29): «Notebook ний дотрох хэсгийг
  // харагдуулахгүй болгоё, Notebook рүүгээ дараад орход харагддаг байя,
  // ингэхдээ 4н баганад хуваан харуулаарай» + «Компьютер, Дагалдах
  // хэрэгсэл-ийн 3-р түвшний subcategory-г ч бас 2-р түвшин дээр
  // харуулахгүй болгоё»
  assert.deepEqual(groups.filter((g) => g.collapsed).map((g) => g.label), [
    'Суурин компьютер', 'Notebook', 'PS, XBox, Nintendo', 'Дагалдах хэрэгсэл',
  ]);
  // ⚠️ Доод түвшингүй бүлэг (`items: []`) нь ӨӨРӨӨ дэд төрөл тул панель дээр
  //    ШУУД СОНГОГДОХ мөрөөр ҮЛДЭНЭ — туг нь `false` ✓
  assert.equal(groups.filter((g) => g.collapsed).length, 4);
  assert.ok(groups.filter((g) => g.items.length === 0).every((g) => !g.collapsed));
  assert.equal(groups.find((g) => g.label === 'Notebook').items.length, 22);
});

// ---- ⑥-b 💻 NOTEBOOK-ИЙН НЭМЭЛТ ТАЛБАР (2026-09-30 (6), хэрэглэгчийн хүсэлт) ----
// «Компьютер, Дагалдах хэрэгсэл → Notebook … сонгосон үед Дэлгэцийн хэмжээ,
//  CPU, RAM, HDD/SSD … сонгодог байх» — ⚠️ бүгд ЗААВАЛ БИШ (аль нэгийг,
//  эсвэл хэд хэдийг л сонгож болно).
//  🔴 ШАЛТГААН: 4 талбар нь ЧӨЛӨӨТ ТЕКСТ байсан тул «i7 8-р үе»/«i7-8550U»/
//  «core i7» гэж олон хэлбэрээр хадгалагдаж, карт/шүүлт дээр зөрүүтэй
//  харагдана ✗ ба МӨН Mouse/тонер/тоглоом дээр ч харагдаж байв ✗

t('💻 Notebook: 4 үзүүлэлт нь СОНГОЛТТОЙ болов (📺 Дэлгэц · ⚙️ CPU · 🧠 RAM · 💾 Хард)', () => {
  // ⚠️ Формд гарах дараалал: брэнд → загвар → Дэлгэц → CPU → RAM → Хард → төлөв
  assert.deepEqual(getAttrFields('computers', 'Apple').map((f) => f.key),
    ['brand', 'model', 'screen', 'cpu', 'ram', 'storage', 'condition', 'warranty']);
  const expected = [
    ['screen', NOTEBOOK_SCREEN_OPTIONS, 7, '11.6" болон доош', '18.0" ба түүнээс дээш'],
    ['cpu', NOTEBOOK_CPU_OPTIONS, 19, 'Intel Celeron / Pentium / Atom', 'Бусад'],
    ['ram', NOTEBOOK_RAM_OPTIONS, 13, '4 GB', '512 GB'],
    ['storage', NOTEBOOK_STORAGE_OPTIONS, 6, '128 GB', '4 TB'],
  ];
  for (const [key, options, len, first, last] of expected) {
    const f = getAttrField('computers', key);
    assert.equal(f.type, 'select', `${key}: ТЕКСТ байсаар байна ✗`);
    assert.equal(f.options, options, `${key}: options нь lib-ийн экспорттой ижил объект биш`);
    assert.equal(f.options.length, len, `${key}: сонголтын тоо`);
    assert.equal(f.options[0], first, `${key}: эхний утга`);
    assert.equal(f.options.at(-1), last, `${key}: сүүлийн утга`);
    // ⚠️ Давхардсан утга байх ЁСТОЙ (жагсаалтад 2 ижил мөр харагдана ✗)
    assert.equal(new Set(f.options).size, len, `${key}: давхардсан утга байна`);
    // ⚠️ Бүгд ЗААВАЛ БИШ — талбарт `required` гэсэн ойлголт ороогүй ✓
    assert.equal(f.required, undefined, `${key}: заавал болгож БОЛОХГҮЙ ✗`);
  }
  // ⚠️ Шүүлт (`attrFilters`) ХӨНДӨГДӨӨГҮЙ — CPU/RAM нь хүрээ/шүүлт БИШ ✓
  //    (хэрэглэгчийн хүсэлт зөвхөн ФОРМЫН талбарт хамаарна)
  assert.deepEqual(getAttrFilters('computers').map((f) => f.key), ['brand', 'condition', 'warranty']);
});

t('💻 Notebook-ийн талбар нь ЗӨВХӨН `PC_SPEC_SUBTYPES`-д харагдана (21 + 2)', () => {
  // 21 Notebook брэнд (⚠️ «Бусад» ХАСАГДСАН — 3 бүлэгт давхарддаг тул)
  assert.equal(NOTEBOOK_BRANDS.length, 21);
  assert.ok(!NOTEBOOK_BRANDS.includes('Бусад'));
  // + «Иж бүрэн компьютер» ба «Процессор, сервер» (CPU/RAM/хард ХЭМЖИГДЭНЭ ✓)
  assert.equal(PC_SPEC_SUBTYPES.length, 23);
  assert.deepEqual(PC_SPEC_SUBTYPES.slice(-2), ['Иж бүрэн компьютер', 'Процессор, сервер']);
  const spec = ['screen', 'cpu', 'ram', 'storage'];
  for (const sub of ['Apple', 'Dell', 'Lenovo', 'Huawei', 'Иж бүрэн компьютер', 'Процессор, сервер']) {
    const keys = getAttrFields('computers', sub).map((f) => f.key).filter((k) => spec.includes(k));
    assert.deepEqual(keys, spec, `${sub}: Notebook-ийн 4 талбар бүрэн гарах ёстой`);
  }
});

t('⚠️ «Бусад»/дэд төрөл СОНГООГҮЙ үед Notebook-ийн талбар ХАРАГДАХГҮЙ', () => {
  // ⚠️ «Бусад» нь Notebook · PS,XBox,Nintendo · Дагалдах хэрэгсэл 3 бүлэгт
  //    давхарддаг ба DB-д зөвхөн НЭРЭЭР хадгалагддаг → форм нь алийг нь ч
  //    төлөөлж чадахгүй тул Notebook-ийн талбарыг ХАРУУЛАХГҮЙ ✓
  const base = ['brand', 'model', 'condition', 'warranty'];
  for (const sub of [
    '', 'Бусад', 'Mouse', 'Keyboard', 'Xbox', 'Playstation',
    'Чихэвч', 'Принтер, Хувилагч, Сканнер, Ламинатор', 'Принтер, Хувилагчийн хор',
    'iPad, Tablet, Kindle', 'Зөөврийн хард, флаш', 'Модем', 'Дэлгэц', 'Проектор', 'Бусад сэлбэг',
  ]) {
    assert.deepEqual(getAttrFields('computers', sub).map((f) => f.key), base, `«${sub || '(хоосон)'}»`);
  }
});

t('⚠️ `getAttrField` (картын мөр/шүүлт) нь `onlySubtypes`-аас ХАМААРАХГҮЙ + бусад 11 хэсэг хөндөгдөөгүй', () => {
  // ⚠️ Хуучин заруудын `attrs` нь DB-д хэвээр → карт/шүүлт нь ТАЛБАРЫГ
  //    үргэлжлүүлэн харна (картын мөр/шүүлт алга болохгүй ✓)
  assert.equal(getAttrField('computers', 'cpu').label, 'Процессор (CPU)');
  // ⚠️ Зөвхөн 💻 хэсгийн 4 талбарт `onlySubtypes` байна — бусад 11 хэсэгт
  //    ямар ч талбар ХАСАГДАХГҮЙ (форм нь хэвээр бүгдийг харуулна ✓)
  let flagged = 0;
  for (const s of SECTIONS) {
    const fields = s.attrFields || [];
    const shown = getAttrFields(s.value, getSubtypes(s.value)[0] || '');
    if (s.value === 'computers') {
      flagged = fields.filter((f) => Array.isArray(f.onlySubtypes)).length;
      assert.equal(flagged, 4);
      continue;
    }
    assert.equal(shown.length, fields.length, `${s.value}: талбар хасагдаж байна ✗`);
    fields.forEach((f) => assert.equal(f.onlySubtypes, undefined, `${s.value}.${f.key}`));
  }
  assert.equal(flagged, 4);
});

t('💻 Картын мөр: шинэ СОНГОЛТЫН утгууд хэвээр гарна (📺 Дэлгэц мөрөнд ОРООГҮЙ)', () => {
  assert.equal(
    formatAttrsLine('computers', {
      brand: 'Lenovo', model: 'ThinkPad T14', screen: '14.0"',
      cpu: 'Intel Core i5', ram: '16 GB', storage: '512 GB', condition: 'Шинэ',
    }),
    'Lenovo ThinkPad T14 · ⚙️ Intel Core i5 · 16 GB · 512 GB · ✅ Шинэ',
  );
  // ⚠️ Хэрэглэгч зөвхөн 1 талбар бөглөсөн ч мөр ХООСОН таслалтгүй гарна ✓
  assert.equal(formatAttrsLine('computers', { ram: '24 GB' }), '24 GB');
});

t('⚠️ Хуучин/demo утга нь ШИНЭ сонголтод багтсан (форм дээр алга болохгүй ✓)', () => {
  // 2026-09-30-ны өмнөх demo утгууд — эдгээр нь DB-д байж болзошгүй тул
  // ⚠️ сонголтын жагсаалтад ЗААВАЛ байх ЁСТОЙ (эс бөгөөс `<select>` дээр
  //    утга нь «Сонгох» болж, хадгалахад АЛГА БОЛНО ✗)
  const cpu = getAttrField('computers', 'cpu').options;
  ['Intel Core i5', 'Intel Core i7', 'Intel Core i9', 'AMD Ryzen 5', 'AMD Ryzen 7', 'Apple M1', 'Apple M2']
    .forEach((v) => assert.ok(cpu.includes(v), `cpu: «${v}» алга ✗`));
  const ram = getAttrField('computers', 'ram').options;
  ['8 GB', '16 GB', '32 GB'].forEach((v) => assert.ok(ram.includes(v), `ram: «${v}» алга ✗`));
  const storage = getAttrField('computers', 'storage').options;
  ['128 GB', '256 GB', '512 GB', '1 TB'].forEach((v) => assert.ok(storage.includes(v), `storage: «${v}» алга ✗`));
  // ⚠️ Хуучин «512 GB SSD + 1 TB HDD» нь ЗОРИУДААР багтаагүй (багтаамж л
  //    хадгална) → форм нь `legacy` option-оор харуулж, утгыг АЛДАХГҮЙ ✓
  assert.ok(!storage.includes('512 GB SSD + 1 TB HDD'));
});

t('💻 ГЭРЭЭ: форм (`AddListingModal`) + seed нь нэг эх сурвалжийг барина', () => {
  const modal = readFileSync(new URL('../components/AddListingModal.jsx', import.meta.url), 'utf8');
  // ① Форм нь ЗӨВХӨН `getAttrFields(section, subtype)`-ээр талбараа сонгоно
  assert.ok(/getAttrFields\(form\.section \|\| 'real-estate', form\.propertyType\)/.test(modal),
    'форм `getAttrFields`-ийг дэд төрөлтэй дуудах ёстой ✗');
  // ② ⚠️ Жагсаалтад БАЙХГҮЙ хуучин утга нь `<select>`-д алга болохгүй
  assert.ok(/const legacy = f\.type === 'select'/.test(modal));
  assert.ok(/\{legacy && <option value=\{legacy\}>/.test(modal));

  const seed = readFileSync(new URL('./seed-sections.mjs', import.meta.url), 'utf8');
  // ③ Seed нь формтой ЯГ ИЖИЛ дэд төрлийн жагсаалт + option-уудыг ашиглана
  assert.ok(/const PC_SPEC = new Set\(PC_SPEC_SUBTYPES\)/.test(seed));
  assert.ok(/const PC_NOTEBOOK_BRANDS = new Set\(NOTEBOOK_BRANDS\)/.test(seed));
  // ④ Demo pool нь форм дээрх сонголтод байхгүй бол seed ЗОГСОНО (fail-fast ✓)
  assert.ok(/форм дээрх сонголтод БАЙХГҮЙ демо утга/.test(seed));
  assert.ok(/NOTEBOOK_SCREEN_OPTIONS, NOTEBOOK_CPU_OPTIONS, NOTEBOOK_RAM_OPTIONS, NOTEBOOK_STORAGE_OPTIONS/.test(seed));
});

t('🛠 services: бүлгүүдэд `collapsed` туг БАЙХГҮЙ (бүгд ШУУД нээлттэй хэвээр)', () => {
  // ⚠️ Regress-ийн хамгаалалт: 2026-09-29-ний хүсэлтээр services дээр бүх бүлэг
  //    шууд нээлттэй байх ёстой — компьютерийн accordion тэнд ХҮРЭХГҮЙ ✓
  const groups = getSubtypeGroups('services');
  assert.equal(groups.length, 7);
  assert.equal(groups.filter((g) => g.collapsed).length, 0);
});

t('🛠/💻/⚡ Ерөнхий гэрээ: бүх бүлгийн leaf нь `getSubtypes`-д ЗААВАЛ байна', () => {
  const withGroups = SECTIONS.filter((s) => getSubtypeGroups(s.value).length > 0);
  // ⚠️ Одоо 3 хэсэг: 💻 computers (2026-09-29), ⚡ electric (2026-09-30) ба
  //    🛠️ services (2026-09-27) — `SECTIONS`-ийн дарааллаар ✓
  //    ℹ️ 2026-09-30 (5): 🧺 home, ⚽ hobby (бүлэг нь тусдаа хэсэг болов) ба
  //    🛋️ furniture/🧳 travel (ШИНЭ, хавтгай) — `subtypeGroups`-гүй ✓
  assert.deepEqual(withGroups.map((s) => s.value),
    ['computers', 'electric', 'services']);
  assert.equal(withGroups.length, 3);
  withGroups.forEach((s) => {
    const subtypes = getSubtypes(s.value);
    getSubtypeGroups(s.value).forEach((g) => {
      const leaves = g.items.length ? g.items : [g.label];
      leaves.forEach((l) => assert.ok(subtypes.includes(l), `${s.value}: «${l}» дэд төрөлд алга ✗`));
    });
  });
});

// ---- ⑦ ⚡ ЦАХИЛГААН БАРАА — ШИНЭ ХЭСЭГ (2026-09-30) ----
// Хэрэглэгчийн хүсэлт: «Цахилгаан бараа гэсэн категори нэм, бас тэр категори
// болон subcategory-тай шүү». Бүтэц нь 💻 computers/🛠️ services-ийн ЯГ ИЖИЛ мод.
t('⚡ electric: 8 бүлэг — 3 нь доод түвшинтэй (accordion), 5 нь өөрөө дэд төрөл', () => {
  const groups = getSubtypeGroups('electric');
  assert.equal(groups.length, 8);
  assert.deepEqual(groups.map((g) => g.label), [
    'ТВ, Аудио + Видео', 'Хөргөгч, хөлдөөгч', 'Гал тогооны цахилгаан бараа',
    'Дижитал аппарат, Видео камер', 'Угаалгын машин', 'Тоос сорогч, Хивс угаагч',
    'Агаар шүүгч', 'ТЭН, Халаагуур',
  ]);
  // 🗂 Доод түвшинтэй 3 бүлэг нь панель дээр анхдагчаар ХААЛТТАЙ (accordion)
  assert.deepEqual(groups.filter((g) => g.collapsed).map((g) => g.label), [
    'ТВ, Аудио + Видео', 'Гал тогооны цахилгаан бараа', 'Дижитал аппарат, Видео камер',
  ]);
  // ⚠️ Доод түвшингүй бүлэг нь ӨӨРӨӨ сонгогдох дэд төрөл — `collapsed` туг
  //    нь УТГАГҮЙ (тиймээс `false` байх ЁСТОЙ, эс бөгөөс дарж нээх мөр үүснэ ✗)
  const leaves = groups.filter((g) => g.items.length === 0);
  assert.equal(leaves.length, 5);
  assert.equal(leaves.filter((g) => g.collapsed).length, 0);
  // 🤝 `services` (7 бүлэг, бүгд нээлттэй) ХӨНДӨГДӨӨГҮЙ — regress-ийн хамгаалалт
  assert.equal(getSubtypeGroups('services').filter((g) => g.collapsed).length, 0);
});

t('⚡ electric: телевизорын 3 хэмжээ нь дэд төрөл (4 дэх түвшин БАЙХГҮЙ)', () => {
  const tv = getSubtypeGroups('electric').find((g) => g.label === 'ТВ, Аудио + Видео');
  assert.deepEqual(tv.items, [
    'Телевизор (55 ба доош инч)', 'Телевизор (65 инч)', 'Телевизор (75 ба дээш инч)',
    'Аудио төхөөрөмж, Өсгөгч', 'Пянз, кассет тоглуулагч',
    'Хөгжим, Home theater, Караоке', 'Бусад',
  ]);
  // ⚠️ Телевизорын хэмжээ нь ЗААВАЛ `property_type` болж хадгалагдана (DB-д
  //    4 дэх түвшин байхгүй) → `getSubtypes`-д БАЙХ ЁСТОЙ ✓
  const subtypes = getSubtypes('electric');
  ['Телевизор (55 ба доош инч)', 'Телевизор (65 инч)', 'Телевизор (75 ба дээш инч)']
    .forEach((t) => assert.ok(subtypes.includes(t), `«${t}» дэд төрөлд алга ✗`));
  // ⚠️ «Телевизор» гэсэн ТУСДАА дэд төрөл БАЙХГҮЙ (хэмжээгүйгээр хадгалбал
  //    хэмжээний шүүлт хоосон үр дүн буцаана ✗)
  assert.ok(!subtypes.includes('Телевизор'));
});

t('⚡ electric: «Бусад» 2 бүлэгт давхардсан ч `getSubtypes`-д 1 л удаа (26)', () => {
  const groups = getSubtypeGroups('electric');
  assert.equal(groups.filter((g) => g.items.includes('Бусад')).length, 2);
  const subtypes = getSubtypes('electric');
  assert.equal(subtypes.filter((t) => t === 'Бусад').length, 1);
  // 3 бүлгийн item (7 + 8 + 7 = 22) + 5 leaf = 27 → давхардсан «Бусад» хасгдаж 26
  assert.equal(subtypes.length, 26);
});

t('⚡ electric: бүлэг → дэд төрлийн зам (breadcrumb) ба бүлэггүй leaf', () => {
  assert.equal(findSubtypeGroup('electric', 'Телевизор (65 инч)').label, 'ТВ, Аудио + Видео');
  assert.equal(findSubtypeGroup('electric', 'Кофе чанагч').label, 'Гал тогооны цахилгаан бараа');
  assert.equal(findSubtypeGroup('electric', 'Дрон, дроны хэрэгсэл').label, 'Дижитал аппарат, Видео камер');
  // ⚠️ Доод түвшингүй бүлэг (өөрөө дэд төрөл) → `null` (breadcrumb 2 түвшин) ✓
  assert.equal(findSubtypeGroup('electric', 'Угаалгын машин'), null);
  assert.equal(findSubtypeGroup('electric', 'Бусад').label, 'ТВ, Аудио + Видео');
  assert.equal(findSubtypeGroup('computers', 'Угаалгын машин'), null);
});

t('⚡ electric: Гэр ахуйн бараанаас «Цахилгаан бараа» ГАРСАН (давхардал БАЙХГҮЙ)', () => {
  // ⚠️ ЯАГААД: ⚡ нь одоо ТУСДАА хэсэг → `home` дотор үлдвэл хэрэглэгч 2 газар
  //    харж, `property_type='Цахилгаан бараа'` гэсэн зар аль ч хэсгийн дэд
  //    төрлийн жагсаалтад орохгүй болно ✗ (`0021_section_electric.sql` нь
  //    хуучин заруудыг `electric`/«Бусад» руу шилжүүлнэ ✓)
  assert.ok(!getSubtypes('home').includes('Цахилгаан бараа'));
  // ⚠️ 2026-09-30 (2 дахь хүсэлт): `home` нь 3 ТҮВШНИЙ МОД болж 10 → **22**
  //    дэд төрөл болсон БОЛОВЧ ⚠️ 2026-09-30 (5)-д «Тавилга» (13) нь 🛋️
  //    `furniture` ТУСДАА хэсэг болж ГАРСАН тул энд 9 ХАВТГАЙ дэд төрөл ҮЛДЭВ
  //    (доорх ⑧ ба ⑪-д дэлгэрэнгүй ✓)
  assert.equal(getSubtypes('home').length, 9);
  // ⚠️ ХЭСГИЙН НЭР нь «Цахилгаан бараа» — дэд төрөл нь хэзээ ч хэсгийн нэртэй
  //    ижил байх ёсгүй (төөрөгдөл ✗)
  assert.ok(!getSubtypes('electric').includes('Цахилгаан бараа'));
  assert.equal(getSection('electric').label, 'Цахилгаан бараа');
  assert.equal(getSection('electric').icon, '⚡');
  // ⚠️ Байрлал: 🛋️ furniture → 🧺 home → ⚡ electric (SECTIONS-ийн дараалал) ✓
  //    ℹ️ 2026-09-30 (2): 🧱 construction + 🏭 equipment нэмэгдэж 8 → 10 хэсэг
  //    ℹ️ 2026-09-30 (5): 🛋️ furniture + 🧳 travel нэмэгдэж 10 → **12** хэсэг
  //    болов — 🛋️ нь 💻 компьютерийн ДАРАА, 🧳 нь 🏭-ийн ДАРАА · ⚽-гийн ӨМНӨ ✓
  assert.deepEqual(
    SECTIONS.map((s) => s.value),
    [
      'real-estate', 'auto', 'jobs', 'computers', 'furniture', 'home',
      'electric', 'construction', 'equipment', 'travel', 'hobby', 'services',
    ],
  );
  assert.equal(SECTIONS.length, 12);
});

t('⚡ electric: картын мөр (CARD_ATTR_ORDER) — брэнд, загвар, хэмжээ, төлөв', () => {
  assert.equal(
    formatAttrsLine('electric', { brand: 'Samsung', model: 'QE65Q60B', size: '65 инч', condition: 'Хуучин' }),
    'Samsung QE65Q60B · 65 инч · ✅ Хуучин',
  );
  // ⚠️ ХЯЛБАР ФОРМ-той ШИНЭ зар (зөвхөн condition) → мөр богиносно, эвдрэхгүй ✓
  assert.equal(formatAttrsLine('electric', { condition: 'Шинэ' }), '✅ Шинэ');
  assert.equal(formatAttrsLine('electric', {}), '');
});

// ---- ⑧ 🛋️ «ТАВИЛГА» — ШИНЭ 1-Р ТҮВШНИЙ ХЭСЭГ (2026-09-30 (5)) ----
// 🎯 Хэрэглэгчийн хүсэлт: «Тавилга болон Аяллын хэрэгсэл -ийг 1-р Category болго».
// ⚠️ «Тавилга» нь 2026-09-30 (2)-д 🧺 `home` хэсгийн 3 дахь түвшний БҮЛЭГ
//    (13 item, `collapsed: true`) байв → ОДОО тусдаа 1-р түвшний хэсэг бөгөөд
//    13 нэр нь ШУУД дэд төрөл (2 дахь түвшин) болов ✓
t('🛋️ furniture: нэр «Тавилга», icon 🛋️, value `furniture` (DB-д ШИНЭ утга)', () => {
  const sec = getSection('furniture');
  assert.equal(sec.label, 'Тавилга');
  assert.equal(sec.value, 'furniture');
  assert.equal(sec.icon, '🛋️');   // ⚠️ icon нь 🧺 home-оос ШИЛЖЭВ (тэр нь 🧺 болов)
  // ⚠️ DB-д хадгалахын тулд `listings_section_valid` CHECK-д 'furniture' нэмэх
  //    ЁСТОЙ → `0026_furniture_travel_sections.sql` (доор шалгана ✓)
  assert.equal(hasSimpleForm('furniture'), true);
  assert.deepEqual(getAttrFilters('furniture').map((f) => f.key), ['condition']);
  assert.deepEqual(getSection('furniture').attrFields.map((f) => f.key), ['condition']);
  // ⚠️ ХЭСГИЙН НЭР «Тавилга» нь дэд төрөл БИШ (DB-д тийм `property_type`
  //    хэзээ ч үүсэхгүй — 2026-09-30 (2)-ын дүрэм ХЭВЭЭР ✓)
  assert.ok(!getSubtypes('furniture').includes('Тавилга'));
});

t('🛋️ furniture: 13 дэд төрөл — хэрэглэгчийн жагсаалтын ЯГ дарааллаар', () => {
  const subtypes = getSubtypes('furniture');
  assert.equal(subtypes.length, 13);
  assert.equal(new Set(subtypes).size, 13);   // ⚠️ давхардал 0
  assert.deepEqual(subtypes, [
    'Зочны өрөөний', 'Унтлагын өрөөний', 'Гал тогооны', 'Үүдний өрөөний',
    'Оффисын тавилга', 'Буйдан, кресло', 'Ор, матрас', 'Шкаф, комод, авдар',
    'Ширээ, сандал', 'Тавиур, полк', 'Толь', 'Сейф', 'Бусад',
  ]);
  // ⚠️ «Бусад» нь ЗӨВХӨН 1 удаа (13 дахь мөр) ✓
  assert.equal(subtypes.filter((s) => s === 'Бусад').length, 1);
  // ⚠️ 3 дахь түвшин (бүлэг) БАЙХГҮЙ → `getSubtypeGroups` → [] ✓
  assert.deepEqual(getSubtypeGroups('furniture'), []);
  assert.equal(findSubtypeGroup('furniture', 'Буйдан, кресло'), null);
  assert.equal(findSubtypeGroup('furniture', 'Гэр ахуйн бараа'), null);
});

t('🧺 home: 9 дэд төрөл (ХАВТГАЙ) — «Тавилга» 13 нь ⚠️ ГАРСАН', () => {
  const subtypes = getSubtypes('home');
  assert.equal(subtypes.length, 9);
  assert.equal(new Set(subtypes).size, 9);   // ⚠️ давхардал 0
  assert.deepEqual(subtypes, [
    'Абажур, гэрэл, чийдэн', 'Угаалгын өрөө, цэвэрлэгээний хэрэгсэл',
    'Гал тогооны хэрэгсэл, сав суулга', 'Гэрийн чимэглэл, тохижилт',
    'Хивс, дорож, дэвсгэр', 'Цагаан хэрэглэл, хөнжил, дэр',
    'Хөшиг, тюль, бүтээлэг', 'Зуух, пийшин', 'Өлгүүр',
  ]);
  // ⚠️ ОДОО 3 дахь түвшин (бүлэг) БАЙХГҮЙ — өмнөх 2 бүлгийн нэг («Тавилга») нь
  //    🛋️ `furniture` хэсэг болов; үлдсэн ганц бүлгийн нэр нь хэсгийн нэртэй
  //    ЯГ ИЖИЛ тул бүлэг нь зөвхөн илүүц алхам + breadcrumb давхардал болно ✗
  assert.deepEqual(getSubtypeGroups('home'), []);
  assert.equal(findSubtypeGroup('home', 'Хивс, дорож, дэвсгэр'), null);
  // ⚠️ Бүлгийн гарчиг («Тавилга», «Гэр ахуйн бараа») нь дэд төрөл БИШ ✓
  assert.ok(!subtypes.includes('Тавилга'));
  assert.ok(!subtypes.includes('Гэр ахуйн бараа'));
  // ⚠️ «Тавилга»-гийн 13 дэд төрөл ЭНД БАЙХГҮЙ (🛋️ furniture-т ✓)
  ['Буйдан, кресло', 'Ор, матрас', 'Шкаф, комод, авдар', 'Толь', 'Сейф']
    .forEach((s) => assert.ok(!subtypes.includes(s), `«${s}» home-д үлдсэн ✗`));
  // ⚠️ «Бусад» нь home-д БАЙХГҮЙ (🧺 home-ийн жагсаалтад ч байгаагүй) ✓
  assert.ok(!subtypes.includes('Бусад'));
});

t('🧺 home: хуучин 10 хавтгай нэр БҮРЭН ХАСАГДСАН (regress-ийн хамгаалалт)', () => {
  const subtypes = getSubtypes('home');
  // ⚠️ Хуучин 10 хавтгай дэд төрөл — «Тавилга, буйдан» … «Хадгалах шүүгээ,
  //    тавиур». Үлдвэл хуучин зарууд дэд төрлийн тооноос гадуур орхигдоно ✗
  [
    'Тавилга, буйдан', 'Гал тогооны хэрэгсэл', 'Гэр ахуйн техник',
    'Гэрэлтүүлэг', 'Хивс, дэвсгэр', 'Ор, унтлагын хэрэгсэл',
    'Цэвэрлэгээ, угаалга', 'Чимэглэл, зураг', 'Хадгалах шүүгээ, тавиур',
  ].forEach((t) => assert.ok(!subtypes.includes(t), `хуучин «${t}» үлдсэн ✗`));
  // ⚠️ «Цахилгаан бараа» нь ⚡ electric хэсэг рүү 2026-09-30-нд шилжсэн ✓
  assert.ok(!subtypes.includes('Цахилгаан бараа'));
});

t('🧺 home: картын мөр (CARD_ATTR_ORDER) ХЭВЭЭР — брэнд, материал, хэмжээ, өнгө, төлөв', () => {
  assert.equal(
    formatAttrsLine('home', { brand: 'IKEA', material: 'Мод', size: '120×60 см', color: 'Хар', condition: 'Хуучин' }),
    'IKEA · Мод · 120×60 см · Хар · ✅ Хуучин',
  );
  // ⚠️ ХЯЛБАР ФОРМ-той ШИНЭ зар (зөвхөн condition) → мөр богиносно, эвдрэхгүй ✓
  assert.equal(formatAttrsLine('home', { condition: 'Шинэ' }), '✅ Шинэ');
  assert.equal(formatAttrsLine('home', {}), '');
  // ⚠️ Шүүлт/форм нь ХЭВЭЭР (зөвхөн `condition`) — хэсэг хуваагдаад ч өөрчлөгдөхгүй ✓
  assert.equal(getAttrFilters('home').map((f) => f.key).join(','), 'condition');
  assert.equal(hasSimpleForm('home'), true);
  assert.equal(getSection('home').label, 'Гэр ахуйн бараа');
  // ✏️ 2026-09-30 (5): 🛋️ → 🧺 (🛋️ нь «Тавилга» хэсэгт шилжсэн) ✓
  assert.equal(getSection('home').icon, '🧺');
});


// ---- ⑨ 🧱 БАРИЛГЫН МАТЕРИАЛ + 🏭 ТОНОГ ТӨХӨӨРӨМЖ — ШИНЭ 2 ХЭСЭГ (2026-09-30) ----
// Хэрэглэгчийн хүсэлт: «Барилгын материал … Тоног төхөөрөмж … ийм 2 category
// орууж өгөөрэй». ⚠️ Жагсаалтын ЭХНИЙ мөр (гарчиг) нь КАТЕГОРИЙН НЭР — дэд
// төрөл БИШ ✓ Дэд төрөл нь ХАВТГАЙ (2 түвшин) — бүлэг (3 дахь түвшин) БАЙХГҮЙ ✓
t('🧱/🏭 Шинэ 2 хэсэг: SECTIONS-д 12 хэсэг болов, ⚡-ийн ДАРАА · ⚽-гийн ӨМНӨ', () => {
  assert.deepEqual(SECTIONS.map((s) => s.value), [
    'real-estate', 'auto', 'jobs', 'computers', 'furniture', 'home',
    'electric', 'construction', 'equipment', 'travel', 'hobby', 'services',
  ]);
  assert.equal(SECTIONS.length, 12);   // ⚠️ 2026-09-30 (5): 10 → 12 хэсэг боллоо
  // ⚠️ `labels` нь хэрэглэгчийн жагсаалтын ГАРЧИГТАЙ ЯГ таарах ёстой
  assert.equal(getSection('construction').label, 'Барилгын материал');
  assert.equal(getSection('construction').icon, '🧱');
  assert.equal(getSection('equipment').label, 'Тоног төхөөрөмж');
  assert.equal(getSection('equipment').icon, '🏭');
});

t('🧱 construction: 23 дэд төрөл — хэрэглэгчийн жагсаалтын ЯГ дарааллаар', () => {
  const subtypes = getSubtypes('construction');
  assert.equal(subtypes.length, 23);
  assert.equal(new Set(subtypes).size, 23); // ⚠️ давхардал 0
  assert.deepEqual(subtypes, [
    'Агааржуулалт', 'Барилгын багаж', 'Арматур, металл хийц, хэв хашмал',
    'Дулаалга, тусгаарлах материал', 'Зам, талбайн тохижуулалт',
    'Засал чимэглэлийн материал', 'Модон материал', 'Сантехник',
    'Тоосго, бетон, блок', 'Фасадны материал', 'Цонх, шил, толь', 'Халаалт',
    'Хашаа', 'Цахилгаан, холбоо', 'Элс, хайрга, цемент', 'Бусад',
    'Ухаалаг цоож', 'Дээвэр, нуруу, бэхэлгээ', 'Хавтан, өнгөлгөөний материал',
    'Бетон зуурмаг, хийц эдлэл', 'Хайрцаг', 'Лифт, урсдаг шат', 'Хаалга',
  ]);
  // ⚠️ Гарчиг нь дэд төрөл БИШ (DB-д тийм `property_type` хэзээ ч үүсэхгүй ✓)
  assert.ok(!subtypes.includes('Барилгын материал'));
});

t('🏭 equipment: 20 дэд төрөл — «Тоног төхөөрөмж» нь ЗӨВХӨН хэсгийн нэр', () => {
  const subtypes = getSubtypes('equipment');
  assert.equal(subtypes.length, 20);
  assert.equal(new Set(subtypes).size, 20);
  assert.deepEqual(subtypes, [
    'Авто засвар, авто угаалгын тоног төхөөрөмж', 'Аж үйлдвэрийн тоног төхөөрөмж',
    'Барилгын тоног төхөөрөмж', 'Бочки / Цистерн / Ёмкость',
    'Гоо сайхны тоног төхөөрөмж', 'Дэлгүүр, лангуунд зориулсан',
    'Кафе, ресторан, хоолны газарт', 'Касс, терминал, цаас',
    'Хөдөө аж ахуйн тоног төхөөрөмж', 'Хэвлэх тоног төхөөрөмж',
    'Хүнсний тоног төхөөрөмж', 'Хяналтын камер, цаг бүртгэл',
    'Цахилгаан тоног төхөөрөмж', 'Уул уурхайн, өрөмдлөгийн тоног төхөөрөмж',
    'Эрүүл мэндийн тоног төхөөрөмж', 'Бусад тоног төхөөрөмж',
    'Цэвэрлэгээний тоног төхөөрөмж', 'Тавилгын үйлдвэрийн тоног төхөөрөмж',
    'Оёдлын тоног төхөөрөмж', 'Фото студийн тоног төхөөрөмж',
  ]);
  assert.ok(!subtypes.includes('Тоног төхөөрөмж'));
  // ⚠️ «Бусад» (🧱) ба «Бусад тоног төхөөрөмж» (🏭) нь 2 ӨӨР утга — төөрөгдөхгүй ✓
  assert.equal(subtypes.filter((s) => s.startsWith('Бусад')).length, 1);
});

t('🧱/🏭 Хавтгай хэсэг: `getSubtypeGroups` → [], бүлэг дээр дарах мөр БАЙХГҮЙ', () => {
  // ⚠️ 2026-09-30 (5): 🛋️ `furniture`, 🧺 `home`, 🧳 `travel` ба ⚽ `hobby`
  //    мөн ХАВТГАЙ болов (дэд төрөл нь ШУУД) → тэдгээрийг ч хамт шалгана ✓
  for (const s of ['construction', 'equipment', 'furniture', 'home', 'travel', 'hobby']) {
    assert.deepEqual(getSubtypeGroups(s), []);
    assert.equal(getSubtypeGroups(s).length, 0);
    // ⚠️ `findSubtypeGroup` нь `null` буцаана → breadcrumb 2 түвшинтэй:
    //    «Бүх зар › 🧱 Барилгын материал › Тоосго, бетон, блок» ✓
    assert.equal(findSubtypeGroup(s, getSubtypes(s)[0]), null);
  }
  // ⚠️ Regress-ийн хамгаалалт: бүлэгтэй 3 хэсэг ХӨНДӨГДӨӨГҮЙ ✓
  const withGroups = SECTIONS.filter((s) => getSubtypeGroups(s.value).length > 0);
  assert.deepEqual(withGroups.map((s) => s.value),
    ['computers', 'electric', 'services']);
  assert.equal(withGroups.length, 3);
});

t('🧱/🏭 Хялбар форм (🛋️/⚡/⚽-той ижил): зөвхөн «Шинэ / Хуучин» шүүлт', () => {
  for (const s of ['construction', 'equipment']) {
    assert.equal(hasSimpleForm(s), true);
    assert.deepEqual(getAttrFilters(s).map((f) => f.key), ['condition']);
    assert.deepEqual(getSection(s).attrFields.map((f) => f.key), ['condition']);
    const f = getAttrFilters(s)[0];
    assert.equal(f.label, 'Шинэ / Хуучин');
    assert.deepEqual(f.options, ['Шинэ', 'Хуучин']);
  }
});

t('🧱/🏭 Картын мөр: «Knauf Gyproc GK · 1.2×2.4 м · ✅ Шинэ» (брэнд+загвар+хэмжээ)', () => {
  assert.equal(
    formatAttrsLine('construction', { brand: 'Knauf', model: 'Gyproc GK', size: '1.2×2.4 м', condition: 'Шинэ' }),
    'Knauf Gyproc GK · 1.2×2.4 м · ✅ Шинэ',
  );
  assert.equal(
    formatAttrsLine('equipment', { brand: 'JCB', model: '3CX', size: '5 т', condition: 'Хуучин' }),
    'JCB 3CX · 5 т · ✅ Хуучин',
  );
  // ⚠️ ХЯЛБАР ФОРМ-той ШИНЭ зар (зөвхөн condition) → мөр богиносно, эвдрэхгүй ✓
  assert.equal(formatAttrsLine('construction', { condition: 'Шинэ' }), '✅ Шинэ');
  assert.equal(formatAttrsLine('equipment', {}), '');
});


// ---- ⑩ 💼 АЖЛЫН ЗАР — ДЭД ТӨРӨЛ 15 → 26 БОЛОВ (2026-09-30) ----
// Хэрэглэгчийн хүсэлт: «Ажлын зар -ын subcategory дараах байдлаар өөрчил».
// ⚠️ Жагсаалтын ДАРААЛАЛ нь хэрэглэгчийн илгээсэн ЯГ дараалал — цагаан толгойн
//    дараалал БИШ (ж: «Туслах ажилчин» нь «Уул уурхай»-н ӨМНӨ, «Үйлдвэрлэл» нь
//    «Цагийн ажил»-ын өмнө) — тиймээс `deepEqual`-ээр бүтэн жагсаалтыг түгжив ✓
const OLD_JOB_SUBTYPES = [
  'IT, программист', 'Борлуулалт, маркетинг', 'Нягтлан бодох, санхүү',
  'Инженер, техник', 'Барилга, засвар', 'Үйлчилгээ, үйлдвэрлэл',
  'Хүний нөөц, захиргаа', 'Жолооч', 'Хамгаалалт', 'Худалдаа, касс',
  'Боловсрол, сургалт', 'Эрүүл мэнд', 'Ресторан, зочид буудал',
  'Хөдөө аж ахуй', 'Бусад',
];

t('💼 jobs: 26 дэд төрөл — хэрэглэгчийн жагсаалтын ЯГ дарааллаар', () => {
  const subtypes = getSubtypes('jobs');
  assert.equal(subtypes.length, 26);
  assert.equal(new Set(subtypes).size, 26); // ⚠️ давхардал 0
  assert.deepEqual(subtypes, [
    'Авто үйлчилгээ, засвар', 'Аялал жуулчлал, зочид буудал',
    'Банк, санхүү, нябо, нярав', 'Барилга, дэд бүтэц',
    'Боловсрол, шинжлэх ухаан', 'Борлуулалт, худалдаа',
    'Гоо сайхан, фитнес, спорт', 'Гүйцэтгэх удирдлага',
    'Дизайн, урлаг, уран сайхан', 'Захиргаа, Хүний нөөц',
    'Маркетинг, PR менежмент', 'МТ, харилцаа холбоо',
    'Менежер, төлөөлөгч', 'Ресторан, кафе, паб',
    'Сэтгүүлч, редактор', 'Тээвэр, гааль, агуулах',
    'Туслах ажилчин', 'Уул уурхай', 'Харуул хамгаалалт',
    'ХАА, Байгаль экологи', 'Хууль, эрх зүй', 'Эрүүл мэнд, эм зүй',
    'Үйлдвэрлэл', 'Үйлчилгээ', 'Цагийн ажил',
    'Хөгжлийн бэрхшээлтэй иргэн ажиллах боломжтой',
  ]);
  // ⚠️ Гарчиг/хэсгийн нэр нь дэд төрөл БИШ (DB-д тийм `property_type` үүсэхгүй)
  assert.ok(!subtypes.includes('Ажлын зар'));
});

t('💼 jobs: хуучин 15 нэр БҮГД хасагдав (зөвхөн нэр нь Солигдсон)', () => {
  const subtypes = getSubtypes('jobs');
  assert.deepEqual(OLD_JOB_SUBTYPES.filter((o) => subtypes.includes(o)), []);
  assert.ok(!subtypes.includes('Бусад'));
  // ⚠️ «Банк, санхүү, нябо, нярав» — «нябо» нь хэрэглэгчийн бичсэнээр
  //    (нягтлан бодогчийн товчлол, unegui.mn-ийн хэв маяг) ХЭВЭЭР ✓
  assert.ok(subtypes.includes('Банк, санхүү, нябо, нярав'));
  // ⚠️ Монгол «Ресторан» — ЛАТИН «P» БИШ (хэрэглэгчийн бичлэгийн typo зассан ✓)
  assert.ok(!subtypes.includes('Pесторан, кафе, паб'));
});

t('💼 jobs: «Бусад» нь БУСАД хэсэгт ХЭВЭЭР (regress-ийн хамгаалалт)', () => {
  // ⚠️ Зөвхөн jobs-оос хассан — 🛋️ furniture / ⚡ electric / 🧱 construction
  //    дээр «Бусад» хэвээр байх ЁСТОЙ ✓ (🧳 travel ч 2026-09-30 (5)-д нэмэгдэв)
  assert.ok(getSubtypes('furniture').includes('Бусад'));
  assert.ok(getSubtypes('travel').includes('Бусад'));
  assert.ok(getSubtypes('electric').includes('Бусад'));
  assert.ok(getSubtypes('construction').includes('Бусад'));
  // ⚠️ Харин 🧺 home ба ⚽ hobby-д «Бусад» БАЙХГҮЙ ✓
  assert.ok(!getSubtypes('home').includes('Бусад'));
  assert.ok(!getSubtypes('hobby').includes('Бусад'));
});

t('💼 jobs: зөвхөн 2 нэр 🛠️ services-тэй ДАВХАРДАЖ байна (section нь ялгана ✓)', () => {
  const others = new Set(
    SECTIONS.filter((s) => s.value !== 'jobs').flatMap((s) => getSubtypes(s.value)),
  );
  // ⚠️ «Уул уурхай» ба «Харуул хамгаалалт» нь 🛠️ services-ийн («Технологи &
  //    Авто засвар», «Бизнес, Санхүү & Хууль» бүлэг) дэд төрөлд ч байдаг —
  //    ⚠️ ЭНЭ нь АСУУДАЛ БИШ: DB-д `section` ба `property_type` ХОЁУЛАА
  //    хадгалагддаг, icon нь `getPropertyIcon(type, section)`-ээр хэсгээс
  //    тодорхойлогддог (💼 vs 🛠️), шүүлт нь `?section=jobs&type=…` гэж явдаг
  //    тул хөндлөн холилдохгүй ✓ (ℹ️ «Бусад» нь 3+ хэсэгт давхарддаг нь
  //    ижил зарчим — `lib/locationData.js`)
  assert.deepEqual(
    getSubtypes('jobs').filter((s) => others.has(s)),
    ['Уул уурхай', 'Харуул хамгаалалт'],
  );
  // ⚠️ Үлдсэн 24 нь ЦОРЫН ГАНЦ (өөр хэсэгт давхардахгүй) ✓
  assert.equal(getSubtypes('jobs').length - 2, 24);
});

t('💼 jobs: форм/шүүлт/бүтэц ХӨНДӨӨГДӨӨГҮЙ (2 түвшин, 3 шүүлт, хялбар форм БИШ)', () => {
  assert.equal(getSection('jobs').label, 'Ажлын зар');
  assert.equal(getSection('jobs').icon, '💼');
  assert.deepEqual(getAttrFilters('jobs').map((f) => f.key), ['jobType', 'experience', 'workMode']);
  assert.equal(hasSimpleForm('jobs'), false);
  assert.deepEqual(getSubtypeGroups('jobs'), []); // ⚠️ бүлэг (3 дахь түвшин) БАЙХГҮЙ
  assert.equal(findSubtypeGroup('jobs', getSubtypes('jobs')[0]), null);
});

t('💼 jobs: картын мөр — компани · албан тушаал · цалин · ажлын төрөл', () => {
  assert.equal(
    formatAttrsLine('jobs', {
      company: 'Мобиком', position: 'Программист', salary: '2500000',
      jobType: 'Бүтэн цаг', experience: '3+ жил', workMode: 'Хибрид',
    }),
    'Мобиком · Программист · ₮2,500,000 · 🕒 Бүтэн цаг · 📊 3+ жил · 🏠 Хибрид',
  );
  // ⚠️ Компани хоосон бол «Ажилд авна» тэргүүлнэ (хуучин зан ХЭВЭЭР ✓)
  assert.equal(formatAttrsLine('jobs', { salary: '2000000' }), 'Ажилд авна · ₮2,000,000');
});

t('💼 0024 migration: 15 хуучин нэр солигдож, 26 шинэ нэр бүрэн хамрагдсан', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0024_jobs_subtype_rename.sql', import.meta.url), 'utf8',
  );
  // ⚠️ §1-ийн VALUES-д 15 хуучин нэр БҮГД байх ЁСТОЙ (`('IT, программист',`)
  OLD_JOB_SUBTYPES.forEach((o) => assert.ok(sql.includes(`('${o}'`), `§1-д «${o}» алга ✗`));
  // ⚠️ §2-ын сүлжээний жагсаалтад 26 шинэ нэр БҮГД байх ЁСТОЙ (гадуур утга
  //    үлдэхгүй — эс бөгөөс тэр зар шүүлт/тооллоос хасагдана ✗)
  getSubtypes('jobs').forEach((s) => assert.ok(sql.includes(`'${s}'`), `§2-д «${s}» алга ✗`));
  assert.ok(/section = 'jobs'/.test(sql), 'зөвхөн jobs хэсэгт хүрэх ёстой');
  assert.ok(!/\bdelete\s+from\b/i.test(sql), '⚠️ зар УСТГАХГҮЙ (зөвхөн нэр солино)');
});


t('🛋️/🧳 0026 migration: CHECK 12 утга + home→furniture / hobby→travel шилжүүлэлт', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0026_furniture_travel_sections.sql', import.meta.url), 'utf8',
  );
  // ① CHECK constraint: 12 утга — `SECTIONS`-ийн БҮХ `value` байх ЁСТОЙ
  //    (эс бөгөөс seed/form дээр `23514 check constraint` алдаа гарна ✗)
  assert.ok(/drop constraint if exists listings_section_valid/.test(sql));
  assert.ok(/add constraint listings_section_valid/.test(sql));
  SECTIONS.forEach((s) => assert.ok(sql.includes(`'${s.value}'`), `CHECK-д «${s.value}» алга ✗`));
  // ⚠️ ШИНЭ 2 утга (`furniture`, `travel`) нь ЗААВАЛ нэмэгдсэн байх ЁСТОЙ ✓
  assert.ok(sql.includes("'furniture'"));
  assert.ok(sql.includes("'travel'"));

  // ② 🛋️ `home` → `furniture`: 13 дэд төрөл БҮГД шилжинэ (зар УСТГАХГҮЙ)
  const furnitureBlock = sql.match(/set section = 'furniture'[\s\S]*?\n\s*\);/)[0];
  assert.ok(/where section = 'home'/.test(furnitureBlock));
  getSubtypes('furniture')
    .forEach((s) => assert.ok(furnitureBlock.includes(`'${s}'`), `②-т «${s}» алга ✗`));
  // ⚠️ 🧺 `home`-ийн 9 дэд төрөл ШИЛЖИХГҮЙ (тэдгээр нь `home`-д ҮЛДЭНЭ ✓)
  getSubtypes('home')
    .forEach((s) => assert.ok(!furnitureBlock.includes(`'${s}'`), `«${s}» шилжих ёсгүй ✗`));

  // ③ 🧳 `hobby` → `travel`: 12 дэд төрөл БҮГД шилжинэ
  const travelBlock = sql.match(/set section = 'travel'\n[\s\S]*?\n\s*\);/)[0];
  assert.ok(/where section = 'hobby'/.test(travelBlock));
  getSubtypes('travel')
    .forEach((s) => assert.ok(travelBlock.includes(`'${s}'`), `③-т «${s}» алга ✗`));
  // ⚠️ ⚽ `hobby`-д ҮЛДСЭН 6 дэд төрөл ШИЛЖИХГҮЙ (тэдгээр нь hobby хэвээр ✓)
  getSubtypes('hobby')
    .forEach((s) => assert.ok(!travelBlock.includes(`'${s}'`), `«${s}» шилжих ёсгүй ✗`));

  // ④ Хуучин ХАВТГАЙ «Аяллын хэрэгсэл» (0025-ыг орлоно) → «Бусад»/`travel`
  assert.ok(/set section = 'travel', property_type = 'Бусад'/.test(sql));
  assert.ok(/property_type = 'Аяллын хэрэгсэл'/.test(sql));

  // ⚠️ ЗАР УСТГАХГҮЙ (зөвхөн `section`/`property_type` шилжинэ) — 0016/0019/
  //    0021/0023-ын ЯГ ИЖИЛ зарчим ✓
  assert.ok(!/\bdelete\s+from\b/i.test(sql));
  assert.ok(!/\btruncate\b/i.test(sql));
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);




