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
  getSubtypeGroups, findSubtypeGroup,   // 🛠/💻/⚡/🛋️ 3 дахь түвшин (2026-09-27, -29, -30)
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

t("Бусад хэсгийн шүүлт (jobs: 3, computers: 3, home: 1, electric: 1, 🧱 1, 🏭 1, services: 3)", () => {
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

t('⚡ hasSimpleForm: ⚽ hobby, 🛋️ home ба ⚡ electric (бусад 5 хэсэгт false)', () => {
  assert.equal(hasSimpleForm('hobby'), true);
  // ⚡ 2026-09-29 (хэрэглэгчийн хүсэлт): «Гэр ахуйн барааг мөн адил ийм форматтай
  //    болго» → 🛋️ `home` мөн хялбар форм болов ✓
  assert.equal(hasSimpleForm('home'), true);
  // ⚡ 2026-09-30 (хэрэглэгчийн хүсэлт): ⚡ «Цахилгаан бараа» — шинэ хэсэг,
  //    🛋️ home-той ижил хялбар форм (форм зөвхөн «Шинэ / Хуучин» асууна) ✓
  assert.equal(hasSimpleForm('electric'), true);
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

t('🛠 services: бүлгүүдэд `collapsed` туг БАЙХГҮЙ (бүгд ШУУД нээлттэй хэвээр)', () => {
  // ⚠️ Regress-ийн хамгаалалт: 2026-09-29-ний хүсэлтээр services дээр бүх бүлэг
  //    шууд нээлттэй байх ёстой — компьютерийн accordion тэнд ХҮРЭХГҮЙ ✓
  const groups = getSubtypeGroups('services');
  assert.equal(groups.length, 7);
  assert.equal(groups.filter((g) => g.collapsed).length, 0);
});

t('🛠/💻/⚡/🛋️ Ерөнхий гэрээ: бүх бүлгийн leaf нь `getSubtypes`-д ЗААВАЛ байна', () => {
  const withGroups = SECTIONS.filter((s) => getSubtypeGroups(s.value).length > 0);
  // ⚠️ Одоо 4 хэсэг: 💻 computers (2026-09-29), 🛋️ home (2026-09-30),
  //    ⚡ electric (2026-09-30) ба 🛠️ services (2026-09-27)
  //    — `SECTIONS`-ийн дарааллаар ✓
  assert.deepEqual(withGroups.map((s) => s.value), ['computers', 'home', 'electric', 'services']);
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
  //    дэд төрөл болов («Тавилга» 13 + «Гэр ахуйн бараа» 9) — доорх ⑧-д
  //    дэлгэрэнгүй ✓
  assert.equal(getSubtypes('home').length, 22);
  // ⚠️ ХЭСГИЙН НЭР нь «Цахилгаан бараа» — дэд төрөл нь хэзээ ч хэсгийн нэртэй
  //    ижил байх ёсгүй (төөрөгдөл ✗)
  assert.ok(!getSubtypes('electric').includes('Цахилгаан бараа'));
  assert.equal(getSection('electric').label, 'Цахилгаан бараа');
  assert.equal(getSection('electric').icon, '⚡');
  // ⚠️ Байрлал: 🛋️ home ба ⚽ hobby-гийн ХООРОНД (SECTIONS-ийн дараалал) ✓
  //    ℹ️ 2026-09-30 (2 дахь хүсэлт): 🧱 construction + 🏭 equipment нэмэгдэж
  //    8 → 10 хэсэг болов — тэдгээр нь ⚡-ийн ДАРАА, ⚽-гийн ӨМНӨ (доорх ⑨) ✓
  assert.deepEqual(
    SECTIONS.map((s) => s.value),
    [
      'real-estate', 'auto', 'jobs', 'computers', 'home', 'electric',
      'construction', 'equipment', 'hobby', 'services',
    ],
  );
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

// ---- ⑧ 🛋️ ГЭР АХУЙН БАРАА — 3 ТҮВШНИЙ МОД (2026-09-30) ----
// Хэрэглэгчийн хүсэлт: «Гэсэн 2 category оруулж өгнө үү, Гэр ахуйн барааны
// категорийг шинэчлэх, Тавилга-ыг гэр ахуйн барааны өмнө оруулаарай».
// Бүтэц нь 💻 computers/⚡ electric/🛠️ services-ийн ЯГ ИЖИЛ мод.
t('🛋️ home: 2 бүлэг — «Тавилга» (13) ЭХЭНД, «Гэр ахуйн бараа» (9) ДАРАА нь', () => {
  const groups = getSubtypeGroups('home');
  assert.equal(groups.length, 2);
  // ⚠️ ДАРААЛАЛ нь хэрэглэгчийн шаардлага («Тавилга-ыг гэр ахуйн барааны
  //    өмнө оруулаарай») — UI ба форм (`<optgroup>`) үүнийг шууд дагана ✓
  assert.deepEqual(groups.map((g) => g.label), ['Тавилга', 'Гэр ахуйн бараа']);
  assert.equal(groups[0].items.length, 13);
  assert.equal(groups[1].items.length, 9);
  // 🗂 Хоёр бүлэг хоёулаа доод түвшинтэй → панель дээр АНХДАГЧААР ХААЛТТАЙ
  //    (дарж нээхэд 4 БАГАНААР, 🎯 FOCUS — 💻/⚡-тэй ижил зан төлөв)
  assert.deepEqual(groups.filter((g) => g.collapsed).map((g) => g.label), [
    'Тавилга', 'Гэр ахуйн бараа',
  ]);
  // ⚠️ `items: []` (өөрөө сонгогдох) бүлэг БАЙХГҮЙ — 2 бүлэг хоёулаа ГАРЧИГ
  assert.equal(groups.filter((g) => g.items.length === 0).length, 0);
});

t('🛋️ home: модны item-үүд нь хэрэглэгчийн жагсаалттай ЯГ таарах', () => {
  const groups = getSubtypeGroups('home');
  assert.deepEqual(groups[0].items, [
    'Зочны өрөөний', 'Унтлагын өрөөний', 'Гал тогооны', 'Үүдний өрөөний',
    'Оффисын тавилга', 'Буйдан, кресло', 'Ор, матрас', 'Шкаф, комод, авдар',
    'Ширээ, сандал', 'Тавиур, полк', 'Толь', 'Сейф', 'Бусад',
  ]);
  assert.deepEqual(groups[1].items, [
    'Абажур, гэрэл, чийдэн', 'Угаалгын өрөө, цэвэрлэгээний хэрэгсэл',
    'Гал тогооны хэрэгсэл, сав суулга', 'Гэрийн чимэглэл, тохижилт',
    'Хивс, дорож, дэвсгэр', 'Цагаан хэрэглэл, хөнжил, дэр',
    'Хөшиг, тюль, бүтээлэг', 'Зуух, пийшин', 'Өлгүүр',
  ]);
});

t('🛋️ home: 22 дэд төрөл ДАВХАРДАЛГҮЙ + хуучин 10 хавтгай нэр БҮРЭН ХАСАГДСАН', () => {
  const subtypes = getSubtypes('home');
  assert.equal(subtypes.length, 22); // 13 + 9 (давхардсан item байхгүй)
  assert.equal(new Set(subtypes).size, 22); // ⚠️ давхардал 0
  // ⚠️ Хуучин 10 хавтгай дэд төрөл — «Тавилга, буйдан» … «Хадгалах шүүгээ,
  //    тавиур». Үлдвэл хуучин зарууд дэд төрлийн тооноос гадуур орхигдоно ✗
  [
    'Тавилга, буйдан', 'Гал тогооны хэрэгсэл', 'Гэр ахуйн техник',
    'Гэрэлтүүлэг', 'Хивс, дэвсгэр', 'Ор, унтлагын хэрэгсэл',
    'Цэвэрлэгээ, угаалга', 'Чимэглэл, зураг', 'Хадгалах шүүгээ, тавиур',
  ].forEach((t) => assert.ok(!subtypes.includes(t), `хуучин «${t}» үлдсэн ✗`));
  // ⚠️ Группын ГАРЧИГ нь дэд төрөл БИШ (DB-д тийм зар хэзээ ч үүсэхгүй)
  assert.ok(!subtypes.includes('Тавилга'));
  // ⚠️ «Бусад» нь ЗӨВХӨН «Тавилга» бүлэгт (хэрэглэгчийн жагсаалт) — 1 л утга
  assert.equal(subtypes.filter((s) => s === 'Бусад').length, 1);
  assert.equal(getSubtypeGroups('home')[1].items.includes('Бусад'), false);
});

t('🛋️ home: бүлэг → дэд төрлийн зам (breadcrumb) ба «Бусад»', () => {
  assert.equal(findSubtypeGroup('home', 'Буйдан, кресло').label, 'Тавилга');
  assert.equal(findSubtypeGroup('home', 'Зочны өрөөний').label, 'Тавилга');
  assert.equal(findSubtypeGroup('home', 'Хивс, дорож, дэвсгэр').label, 'Гэр ахуйн бараа');
  assert.equal(findSubtypeGroup('home', 'Зуух, пийшин').label, 'Гэр ахуйн бараа');
  // ⚠️ «Бусад» нь 1 бүлэгт л байгаа тул ЭХНИЙ бүлгийн дүрэм хэрэггүй — тодорхой
  assert.equal(findSubtypeGroup('home', 'Бусад').label, 'Тавилга');
  // ⚠️ Группын гарчиг нь item БИШ → breadcrumb-д нэмэгдэхгүй ✓
  assert.equal(findSubtypeGroup('home', 'Тавилга'), null);
  // ⚠️ Хуучин нэрээр хадгалагдсан зар (migration хийгээгүй бол) → `null`
  assert.equal(findSubtypeGroup('home', 'Гэрэлтүүлэг'), null);
});

t('🛋️ home: картын мөр (CARD_ATTR_ORDER) ХЭВЭЭР — брэнд, материал, хэмжээ, өнгө, төлөв', () => {
  assert.equal(
    formatAttrsLine('home', { brand: 'IKEA', material: 'Мод', size: '120×60 см', color: 'Хар', condition: 'Хуучин' }),
    'IKEA · Мод · 120×60 см · Хар · ✅ Хуучин',
  );
  // ⚠️ ХЯЛБАР ФОРМ-той ШИНЭ зар (зөвхөн condition) → мөр богиносно, эвдрэхгүй ✓
  assert.equal(formatAttrsLine('home', { condition: 'Шинэ' }), '✅ Шинэ');
  assert.equal(formatAttrsLine('home', {}), '');
  // ⚠️ Шүүлт/форм нь ХЭВЭЭР (зөвхөн `condition`) — мод нэмэгдсэнээс үл хамаарна ✓
  assert.equal(getAttrFilters('home').map((f) => f.key).join(','), 'condition');
  assert.equal(hasSimpleForm('home'), true);
  assert.equal(getSection('home').label, 'Гэр ахуйн бараа');
  assert.equal(getSection('home').icon, '🛋️');
});


// ---- ⑨ 🧱 БАРИЛГЫН МАТЕРИАЛ + 🏭 ТОНОГ ТӨХӨӨРӨМЖ — ШИНЭ 2 ХЭСЭГ (2026-09-30) ----
// Хэрэглэгчийн хүсэлт: «Барилгын материал … Тоног төхөөрөмж … ийм 2 category
// орууж өгөөрэй». ⚠️ Жагсаалтын ЭХНИЙ мөр (гарчиг) нь КАТЕГОРИЙН НЭР — дэд
// төрөл БИШ ✓ Дэд төрөл нь ХАВТГАЙ (2 түвшин) — бүлэг (3 дахь түвшин) БАЙХГҮЙ ✓
t('🧱/🏭 Шинэ 2 хэсэг: SECTIONS-д 10 хэсэг болов, ⚡-ийн ДАРАА · ⚽-ийн ӨМНӨ', () => {
  assert.deepEqual(SECTIONS.map((s) => s.value), [
    'real-estate', 'auto', 'jobs', 'computers', 'home', 'electric',
    'construction', 'equipment', 'hobby', 'services',
  ]);
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
  for (const s of ['construction', 'equipment']) {
    assert.deepEqual(getSubtypeGroups(s), []);
    assert.equal(getSubtypeGroups(s).length, 0);
    // ⚠️ `findSubtypeGroup` нь `null` буцаана → breadcrumb 3 түвшинтэй ХЭВЭЭР:
    //    «Бүх зар › 🧱 Барилгын материал › Тоосго, бетон, блок» ✓
    assert.equal(findSubtypeGroup(s, getSubtypes(s)[0]), null);
    // ⚠️ Regress-ийн хамгаалалт: бүлэгтэй 4 хэсэг ХӨНДӨГДӨӨГҮЙ ✓
  }
  const withGroups = SECTIONS.filter((s) => getSubtypeGroups(s.value).length > 0);
  assert.deepEqual(withGroups.map((s) => s.value), ['computers', 'home', 'electric', 'services']);
  assert.equal(withGroups.length, 4);
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


console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);

