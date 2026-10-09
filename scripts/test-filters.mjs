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
// 🆕 2026-10-05 (43): ✅ «Шинэ / Шинэвтэр / Хуучин» → **«Төлөв»** нэртэй болов
//    (хэрэглэгчийн хүсэлт: «Шинэ, Шинэвтэр, Хуучин ийг Төлөв гэж нэрлэ») ба мөн
//    💻 📺 Дэлгэц · ⚙️ CPU · 🧠 RAM · 💾 Хард-той хамт `filterBar: true` болов ⇒
//    үр дүнгийн дээрх ХЭВТЭЭ `#filter-bar`-т ОЛОН СОНГОЛТТОЙ PILL (⌄ панель).
//    ⚠️ `getAttrFilters` нь эдгээрийг ХЭВЭЭР буцаана (утга/URL/DB хөндөгдөхгүй ✓)
//    — зөвхөн `components/HomeClient.jsx` нь `.filter((f) => !f.filterBar)`-ээр
//    САЙДБАРААС хасна (2 өөр UI БАЙХГҮЙ ✓); шалгалтыг доорх «🎛» тест хийнэ ✓
// 🆕 2026-10-06 (17): 🚗 🎨 Өнгө · ⛽ Түлш · ⚙️ Хурдны хайрцаг (`afterPayment: 1|2|3`
//    ⇒ «💳 Төлбөрийн нөхцөл»-ийн ЯГ АРАА), 💼 🕒/📊/📈 ба ✅ «Төлөв» (8 хэсэг) нь
//    `#filter-bar` pill-ээс ГАРЧ сайдбарт («Дэлгэрэнгүй хайлт») БУЦАВ ⇒ туг
//    ЗӨВХӨН 💻 📺/⚙️/🧠/💾 дээр ҮЛДЭВ (доорх «🔀 (17)» тестүүд ✓)
//
// АЖИЛЛУУЛАХ:  npm run test:filters
//
// ⚠️ `lib/locationData.js` нь ЯМАР Ч импортгүй цэвэр өгөгдлийн модуль тул
//    Node-ийн ESM-ээр ШУУД ачаалж болно (хамгийн хурдан, орчин шаардахгүй) ✓
// ⚠️ Сервер талын query (ilike/gte/lte) нь ЭНД шалгагдахгүй — түүнийг бодит
//    DB дээр шалгана (`README.md` → «🔎 Хайлттай сонголт» хэсгийн тестийн лог).
// ============================================================
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';   // 💼 0024 migration-ийг шалгах (2026-09-30)
// 🎨 2026-10-09: нүүр хуудсны tile-ийн ЗУРГИЙН файлуудыг шалгах (`public/categories/*.svg`)
import {
  SECTIONS, getSubtypes, getAttrFilters, getAttrField,
  parseAttrRangeKey, getAttrRangeKeys, formatAttrsLine, getSection, hasSimpleForm,
  getSubtypeGroups, findSubtypeGroup,   // 🛠/💻/⚡/🛋️ 3 дахь түвшин (2026-09-27, -29, -30)
  // 💻 2026-09-30 (6): Notebook-ийн нэмэлт талбар (`onlySubtypes` + сонголтууд)
  getAttrFields, PC_SPEC_SUBTYPES,
  pruneGatedAttrs,   // 🖥 2026-10-03 (7): хүчингүй болсон attr шүүлтийг цэвэрлэх
  NOTEBOOK_SCREEN_OPTIONS, NOTEBOOK_CPU_OPTIONS, NOTEBOOK_RAM_OPTIONS, NOTEBOOK_STORAGE_OPTIONS,
  CAR_BRANDS,   // 🚗🌈 2026-10-01: CAR_MODELS-ийн түлхүүрүүд энд байгаа эсэхийг шалгана
  getAttrRows,  // 📋 2026-10-01 (16): зарын дэлгэрэнгүй хуудсанд `attrs` 2 баганаар
  // 💼 2026-10-03 (9): ажлын зарын шинэ талбарууд + «Цалин/Үнэ» үг
  JOB_TIME_OPTIONS, JOB_EXPERIENCE_OPTIONS, JOB_ADVERTISER_OPTIONS,
  JOB_LEVEL_OPTIONS, JOB_SALARY_TYPE_OPTIONS, priceWord, isJobsSection,
  // 🖥📱 2026-10-04: нүүр хуудсны хэсгийн панелийн «Зарах / Түрээслэх» сонголт
  getSectionCategoryChoices, getSectionCategories,
  // 🏠 2026-10-04: хэсгийн панельд дэд төрөл харагдах эсэх (2 алхамт drill)
  showsSectionSubtypes,
  // 🎨 2026-10-06 (17): «afterPayment» тест нь Өнгө-ний либын экспорттой харьцуулна
  AUTO_COLOR_OPTIONS,
  // 🆕 2026-10-06 (18): сайдбарын чип блок хураагдах босго + өрөөний сонголтууд
  SIDEBAR_CHIP_COLLAPSE_MIN, ROOM_OPTIONS,
} from '../lib/locationData.js';
// 🆕 2026-10-06 (18): 💳 «Төлбөрийн нөхцөл»-ийн сонголтын тоо (босготой харьцуулна)
import { PAYMENT_OPTIONS } from '../lib/paymentFilter.mjs';
// 🚗🌈 2026-10-01: 🏷️ «Үйлдвэрлэгч» → 🚙 «Загвар» (cascading) — зөвхөн ЦЭВЭР
//    функцууд + өгөгдөл (сүлжээ/DB-д хүрэхгүй тул шууд ачаалж болно ✓)
import {
  CAR_MODELS, getCarModels, keepDependentValue, cascadeAttrs,
} from '../lib/carModels.mjs';

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🧪 Шүүлтийн логик (lib/locationData.js)\n');

// ---- ① 🚗 Автомашин: ЗАГВАР + ХОЁР ОН ----
t("getAttrFilters('auto') — 7 шүүлт (Үйлдвэрлэгч, Загвар, Өнгө, 2 он, хайрцаг, түлш)", () => {
  const keys = getAttrFilters('auto').map((f) => f.key);
  // 🎨 2026-10-01 (хэрэглэгчийн хүсэлт): 🔀 «Хөтлөгч» (`drive`) ХАСАГДАЖ,
  //    «Өнгө» (`color`) нэмэгдэв — ⚠️ `drive` буцаж ОРОХГҮЙ ✓
  //    ⚠️ 2026-10-01 (2) (хэрэглэгчийн хүсэлт): «Өнгө» нь «Загвар»-ын ЯГ
  //       дараа — формтой ИЖИЛ дараалал (sidebar нь `attrFilters`-ийн
  //       дарааллаар, форм нь `attrFields`-ийн дарааллаар зурагдана ✓)
  assert.deepEqual(keys, ['brand', 'model', 'color', 'year', 'importYear', 'transmission', 'fuel']);
  assert.ok(!keys.includes('drive'));
});

// ---- ①′ 🔧 ХӨДӨЛГҮҮР: ЧӨЛӨӨТ ТЕКСТ → СОНГОЛТ (2026-10-01) ----
// Хэрэглэгчийн хүсэлт: «Хөдөлгүүр гэсэн хэсэгт дараах сонголттой болго …».
// ⚠️ Урьд нь `txt('engine', 'Хөдөлгүүр (л)')` байв — хэрэглэгч өөрөө бичдэг
//    тул «2.5» / «2.4L» / «2.5 литр» гэж холилдож, карт дээр зөрүүтэй харагдана ✗
t('🔧 Хөдөлгүүр нь СОНГОЛТ болов — ЯГ 7 утга (1.5л хүртэл … Цахилгаан (EV))', () => {
  const f = getAttrField('auto', 'engine');
  assert.equal(f.type, 'select');
  assert.equal(f.label, 'Хөдөлгүүр');
  // ⚠️ Нэгж («л») нь сонголт БҮРДӨӨ байгаа тул label-д «(л)» БАЙХГҮЙ
  assert.ok(!f.label.includes('(л)'));
  assert.deepEqual(f.options, [
    '1.5л хүртэл', '1.5л - 2.0л', '2.1л - 2.7л', '2.8л - 3.5л',
    '3.6л - 4.5л', '4.6л ба түүнээс дээш', 'Цахилгаан (EV)',
  ]);
  // ⚠️ ШҮҮЛТЭД ОРООГҮЙ (хуучин/demo заруудын тоон «2.5» нь хүрээний
  //    сонголттой таарахгүй тул «0 үр дүн» гарах байв ✗)
  assert.ok(!getAttrFilters('auto').some((x) => x.key === 'engine'));
});

// ---- ①″ 🎨 ӨНГӨ НЭМЭГДЭЖ, 🔀 ХӨТЛӨГЧ БҮРЭН ХАСАГДАВ (2026-10-01) ----
// Хэрэглэгчийн хүсэлт: «Хөтлөгч хэсгийг байхгүй болгож Өнгө гэсэн сонголтыг
// оруулж ир» — ⚠️ форм (`attrFields`) ба шүүлт (`attrFilters`) НЭГ эх сурвалж
// ⚠️ 2026-10-01 (13): өнгийн палитр 10 → 12 — «Бор»/«Беж» нь «Хүрэн»/
//    «Сувдан цагаан»-аар нарийвчлагдаж, «Хөх» ба «Ягаан» НЭМЭГДЭВ
//    (`AUTO_COLOR_OPTIONS` — форм ба sidebar-ийн ЦОР ГАНЦ эх сурвалж ✓)
t('🎨 Өнгө — форм ба sidebar ХОЁУЛАА (12 сонголт, «Бусад»-тай)', () => {
  const f = getAttrField('auto', 'color');
  assert.equal(f.type, 'select');
  assert.equal(f.label, 'Өнгө');
  assert.equal(f.icon, '🎨');
  assert.equal(f.options.length, 12);
  // ⚠️ Дараалал нь ЖАГСААЛТЫН дараалал — форм БА sidebar хоёулаа
  //    `attrFields`/`attrFilters`-ийн дарааллаар зурагдана ✓
  assert.deepEqual(f.options, [
    'Цагаан', 'Сувдан цагаан', 'Хар', 'Саарал', 'Мөнгөлөг', 'Хөх', 'Хүрэн',
    'Цэнхэр', 'Улаан', 'Ягаан', 'Ногоон', 'Бусад',
  ]);
  // ⚠️ Утга бүр ЯЛГААТАЙ (давхардал ✗) ба СҮҮЛИЙНХ нь «Бусад»
  //    (жагсаалтад байхгүй өнгийг сонгох боломж үлдээнэ ✓)
  assert.equal(new Set(f.options).size, 12);
  assert.equal(f.options[11], 'Бусад');
  assert.ok(getAttrFilters('auto').some((x) => x.key === 'color'));
  /*
   * 🎨 2026-10-03 (19) — ХАЙЛТЫН SIDEBAR ДЭЭР ОЛОН СОНГОЛТТОЙ ЧИП
   * (хэрэглэгчийн хүсэлт: «Зар хайлт дээр Авто машин сонголт дээр Өнгө ийг
   * Төлбөрийн нөхцөл шиг олон сонголттой болго»):
   *   • `chips: true` → sidebar-д `<select>` биш, `chip-toggle` чипүүд
   *   • `multi: true` → `filters.attrs.color` нь МАССИВ → URL
   *     `?attr_color=Хар,Цагаан` ба DB `attrs->>color=in.(…)`
   *     (`lib/attrMultiFilter.mjs`; дэлгэрэнгыг `scripts/test-attr-multi.mjs` ✓)
   *   • `multiNoun: 'өнгө'` → идэвхтэй чип «🎨 3 өнгө» гэж товчлогдоно
   *   ⚠️ ФОРМ ХӨНДӨГДӨӨГҮЙ (`formChips` туг БАЙХГҮЙ) — 3-р алхамд «Өнгө» нь
   *      хэвээр `<select>` (нэг өнгө хадгална ✓)
   */
  assert.equal(f.chips, true, 'голтонд чип туг алга ✗');
  assert.equal(f.multi, true, 'олон сонголтын туг алга ✗');
  assert.equal(f.multiNoun, 'өнгө');
  assert.ok(!f.formChips, 'форм дээр чип болжээ ✗ (зөвхөн хайлт ✓)');
});

t('🔀 Хөтлөгч форм, шүүлт, картын мөр ГУРВААС ХАСАГДАВ', () => {
  const sec = getSection('auto');
  assert.equal(getAttrField('auto', 'drive'), null);
  assert.ok(!sec.attrFields.some((x) => x.key === 'drive'));
  assert.ok(!sec.attrFilters.includes('drive'));
  // ⚠️ Хуучин заруудын `attrs.drive` нь DB-д ХЭВЭЭР байгаа ч карт дээр ГАРАХГҮЙ ✓
  const line = formatAttrsLine('auto', {
    brand: 'Nissan', model: 'Leaf', engine: 'Цахилгаан (EV)',
    fuel: 'Цахилгаан', color: 'Цагаан', drive: 'Урд',
  });
  assert.ok(!line.includes('Урд'), line);
  assert.ok(line.includes('Цахилгаан (EV)') && line.includes('🎨 Цагаан'), line);
});

t('🚗 Жолооны хүрд (steering) — форм БА карт (Зөв / Буруу), шүүлтэд ОРООГҮЙ', () => {
  const sec = getSection('auto');
  const f = getAttrField('auto', 'steering');
  // ① Талбар нь формоос (`attrFields`) олдоно: жишиг сайтын ЯГ ИЖИЛ 2 сонголт
  assert.ok(f, 'steering талбар формоос олдохгүй байна ✗');
  assert.equal(f.label, 'Жолооны хүрд');
  assert.equal(f.icon, '🚗');
  assert.deepEqual(f.options, ['Зөв', 'Буруу']);
  // ② Дараалал нь ⚙️ «Хурдны хайрцаг»-ийн ЯГ дараа (форм ба карт хоёулаа ✓)
  const keys = sec.attrFields.map((x) => x.key);
  assert.equal(keys.indexOf('steering'), keys.indexOf('transmission') + 1);
  // ③ Шүүлтэд ОРООГҮЙ (mileage/engine-ийн зарчим ✓)
  assert.ok(!sec.attrFilters.includes('steering'));
  assert.ok(!getAttrFilters('auto').some((x) => x.key === 'steering'));
  // ④ Картын мөр: «🚗 Зөв хүрд» (зөвхөн «Зөв» гэвэл утга нь ойлгомжгүй ✗)
  const line = formatAttrsLine('auto', {
    brand: 'Toyota', model: 'Sai', transmission: 'Автомат', steering: 'Зөв',
  });
  assert.ok(line.includes('🚗 Зөв хүрд'), line);
  assert.ok(line.includes('⚙️ Автомат'), line);
  // ⑤ 🔀 ХУУЧИН `drive` (Урд/Хойд/Бүх — хөтлөгчийн төрөл) нь ХӨНДӨГДӨӨГҮЙ
  assert.notEqual(f.options[0], 'Урд');
  assert.equal(getAttrField('auto', 'drive'), null);
});

t('🔧 Картын мөр: хүрээний утга нэгжээ өөрөө агуулна, ХУУЧИН тоон утга «л»-тэй', () => {
  const line = formatAttrsLine('auto', {
    brand: 'Toyota', model: 'Prius', year: '2021', transmission: 'Автомат',
    engine: '1.5л - 2.0л', fuel: 'Хайбрид',
  });
  assert.ok(line.includes('1.5л - 2.0л'), line);
  assert.ok(!line.includes('1.5л - 2.0л л'), `«л» ДАВХАРДАВ ✗: ${line}`);
  // ⚠️ ХУУЧИН/demo («2.5») — нэгж нь ХЭВЭЭР залгагдана ✓
  assert.ok(formatAttrsLine('auto', { engine: '2.5' }).includes('2.5 л'));
  assert.ok(formatAttrsLine('auto', { engine: '4.6' }).includes('4.6 л'));
  // ⚠️ «Цахилгаан (EV)» нь тоон БИШ тул «л» ЗАЛГАГДАХГҮЙ ✓
  assert.equal(formatAttrsLine('auto', { engine: 'Цахилгаан (EV)' }), 'Цахилгаан (EV)');
});

t('🚗 Картын мөр: «Өнгө» нь толгойн (Загвар/он) ДАРАА, ГҮЙЛТИЙН ӨМНӨ (2026-10-01 (2))', () => {
  const line = formatAttrsLine('auto', {
    brand: 'Toyota', model: 'Prius', year: '2021', importYear: '2022', color: 'Цагаан',
    mileage: '95200', transmission: 'Автомат', engine: '1.5л - 2.0л', fuel: 'Хайбрид',
  });
  // ⚠️ Толгой нь «брэнд + загвар + он» НЭГ хэсэг тул «Өнгө» нь толгойн
  //    ДАРААХ эхний үзүүлэлт болно (`CARD_ATTR_ORDER.auto` — color нь model-ийн
  //    дараа, year нь `skip`-д байдаг тул мөрөнд ДАХИН гарахгүй ✓)
  assert.equal(line,
    'Toyota Prius, 2021 · 🎨 Цагаан · 📥 2022 онд орж ирсэн · 95,200 км · ⚙️ Автомат · 1.5л - 2.0л · ⛽ Хайбрид');
});

t('🚙 Загвар нь ЧӨЛӨӨТ ТЕКСТ шүүлт (filterable, select БИШ) + ОЛОН СОНГОЛТТОЙ', () => {
  const f = getAttrFilters('auto').find((x) => x.key === 'model');
  assert.equal(f.type, 'text');
  assert.equal(f.filterable, true);
  assert.equal(f.range, undefined);
  // 🆕 2026-10-04 (36) — хэрэглэгчийн хүсэлт «машины загвараас олоныг сонгох
  //    боломжтой болго»: `?attr_model=Prius 30,Harrier` (массив) ✓
  // ⚠️ DB нь `in.()` БИШ `or=(…ilike…)` (`lib/attrMultiFilter.mjs`) — талбар
  //    нь хайлттай текст тул бүрэн бус «pri» ч олдох ёстой ✓
  assert.equal(f.multi, true);
  assert.equal(f.multiNoun, 'загвар');
  // ⛔ `chips` БАЙХГҮЙ — UI нь `components/CarPicker.jsx` пикер (sidebar-ийн
  //    2 дахь UI ҮҮСЭХГҮЙ ✓)
  assert.ok(!f.chips);
});

// ---- 🌈 БРЭНД → ЗАГВАР (cascading, 2026-10-01) ----
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «автошин дээр Үйлдвэрлэгчийг сонгоход түүний
//    үйлдвэрлэсэн машинуудыг Загвар дээр нь гаргаад ирж чадах уу»
t('🌈 🚙 Загвар нь 🏷️ Үйлдвэрлэгчээс ХАМААРАХ сонголттой (`optionsFrom` = brand)', () => {
  const f = getAttrField('auto', 'model');
  assert.equal(f.optionsFrom, 'brand');
  assert.ok(f.optionsMap && Array.isArray(f.optionsMap.Toyota), '`optionsMap` = CAR_MODELS ✗');
  // ⚠️ Төрөл нь `text` + `filterable` ХЭВЭЭР — sidebar-ийн шүүлт (③) ба
  //    `lib/queries.js`-ийн `ilike %…%` ХӨНДӨГДӨХГҮЙ ✓ (зөвхөн UI сольдог)
  assert.equal(f.type, 'text');
  assert.equal(f.filterable, true);
  assert.equal(f.label, 'Загвар');
  assert.equal(f.icon, '🚙');
});

t('🚗 CAR_MODELS: түлхүүр бүр CAR_BRANDS-д, загвар нь хоосон/давхардалгүй', () => {
  const keys = Object.keys(CAR_MODELS);
  assert.ok(keys.length >= 40, `брэнд хэт цөөн: ${keys.length}`);
  for (const k of keys) {
    assert.ok(CAR_BRANDS.includes(k), `«${k}» нь CAR_BRANDS-д БАЙХГҮЙ ✗`);
    const list = CAR_MODELS[k];
    assert.ok(Array.isArray(list) && list.length > 0, `«${k}» хоосон ✗`);
    assert.equal(new Set(list).size, list.length, `«${k}» дотор давхардал ✗`);
    assert.ok(list.every((v) => typeof v === 'string' && v.trim()), `«${k}» хоосон мөр ✗`);
  }
  // ⚠️ Сэлбэг, хэрэгслийн брэнд нь ЗОРИУДАА жагсаалтгүй — тэдний «загвар» нь
  //    БАРААНЫ НЭР («Тосны шүүр», «Дугуй 205/55 R16») тул чөлөөт текст ХЭВЭЭР ✓
  for (const k of ['Bosch', 'Michelin', 'Bridgestone', 'Denso', 'NGK', 'Osram', 'Icom', 'Castrol', 'Бусад']) {
    assert.ok(!CAR_MODELS[k], `«${k}» нь загварын жагсаалттай БАЙХ ЁСГҮЙ ✗`);
  }
});

t('🚗 getCarModels: жижиг/том үсэг, зай ЯЛГАХГҮЙ · танигдахгүй брэнд → []', () => {
  assert.deepEqual(getCarModels('toyota'), CAR_MODELS.Toyota);
  assert.deepEqual(getCarModels('  TOYOTA  '), CAR_MODELS.Toyota);
  assert.deepEqual(getCarModels('Беларус'), CAR_MODELS['Беларус']);
  assert.ok(getCarModels('Toyota').includes('Prius 30'));
  assert.ok(getCarModels('Toyota').includes('Harrier'));
  // ⚠️ Танигдахгүй/хоосон → `[]` (форм/sidebar нь ЧӨЛӨӨТ ТЕКСТ болж буцна ✓)
  for (const v of ['Bosch', '', undefined, null, 'Toyota X', 'Бусад', 'Zeekr 2']) {
    assert.deepEqual(getCarModels(v), [], `«${String(v)}» → [] байх ёстой ✗`);
  }
});

t('🌈 keepDependentValue: гараар бичсэн утга ХӨНДӨӨГДӨХГҮЙ, өөр брэндийн загвар ЦЭВЭРЛЭГДЭНЭ', () => {
  const toy = getCarModels('Toyota');
  const nis = getCarModels('Nissan');
  assert.equal(keepDependentValue(toy, nis, 'Prius 30'), '');           // ② өөр брэнд → цэвэрлэнэ
  assert.equal(keepDependentValue(toy, toy, 'Prius 30'), 'Prius 30');   // хэвээр ✓
  assert.equal(keepDependentValue(toy, nis, 'Тосны шүүр'), 'Тосны шүүр'); // ① гараар бичсэн ✓
  assert.equal(keepDependentValue([], toy, 'Миний загвар'), 'Миний загвар'); // ① жагсаалт байгаагүй ✓
  assert.equal(keepDependentValue(toy, [], 'Prius 30'), 'Prius 30');    // ③ шинэ брэнд жагсаалтгүй ✓
  assert.equal(keepDependentValue(toy, nis, ''), '');                   // хоосон → хоосон ✓
  assert.equal(getCarModels('Nissan').includes('Prius 30'), false);
});

t('🌈 cascadeAttrs: брэнд солигдоход Загвар цэвэрлэгдэж, бусад attr ХӨНДӨӨГДӨХГҮЙ', () => {
  const fields = getAttrFields('auto', 'Суудлын машин');
  const prev = { brand: 'Toyota', model: 'Prius 30', color: 'Цагаан', fuel: 'Хайбрид' };
  const next = cascadeAttrs({ ...prev, brand: 'Nissan' }, prev, 'brand', fields);
  assert.equal(next.brand, 'Nissan');
  assert.ok(!('model' in next), '«Prius 30» (Toyota) нь Nissan-д ҮЛДЭХ ЁСГҮЙ ✗');
  assert.equal(next.color, 'Цагаан');   // хамааралгүй талбар ХЭВЭЭР ✓
  assert.equal(next.fuel, 'Хайбрид');
  // ⚠️ `attrs`-ыг MUTATE ХИЙХГҮЙ (React-ийн төлөв ✓)
  assert.equal(prev.brand, 'Toyota');
  assert.equal(prev.model, 'Prius 30');
  // ⚠️ Ижил брэнд (эсвэл шинэ жагсаалтад БАЙГАА загвар) → ХАДГАЛАГДАНА ✓
  assert.equal(cascadeAttrs(prev, prev, 'brand', fields).model, 'Prius 30');
  // ⚠️ Загвар тавихад (`model` нь «эцэг» БИШ) хэнд ч хүрэхгүй ✓
  const m2 = cascadeAttrs({ ...prev, model: 'Harrier' }, prev, 'model', fields);
  assert.equal(m2.model, 'Harrier');
  assert.equal(m2.color, 'Цагаан');
});

t('🌈 Форм ба sidebar ХОЁУЛАА нэг туслахыг ашиглана (хосууд нэг эх сурвалжтай)', () => {
  const form = readFileSync(new URL('../components/AddListingClient.jsx', import.meta.url), 'utf8');
  const home = readFileSync(new URL('../components/HomeClient.jsx', import.meta.url), 'utf8');
  // ① Хоёулаа `optionsFrom` (хамааралтай сонголт) ба `cascadeAttrs`-ыг хэрэглэнэ
  assert.ok(/optionsFrom/.test(form), 'формд `optionsFrom` алга ✗');
  assert.ok(/optionsFrom/.test(home), 'sidebar-д `optionsFrom` алга ✗');
  assert.ok(/cascadeAttrs\(attrs, prev, field\.key, attrFields\)/.test(form),
    'форм `cascadeAttrs`-ыг attrFields-тай дуудах ёстой ✗');
  assert.ok(/cascadeAttrs\(attrs, prev, key, attrFilters\)/.test(home),
    'sidebar `cascadeAttrs`-ыг attrFilters-тай дуудах ёстой ✗');
  // ② ⚠️ Сервер/query ХӨНДӨӨГДӨӨГҮЙ: текст шүүлт `ilike %…%` хэвээр (2026-09-28)
  const q = readFileSync(new URL('../lib/queries.js', import.meta.url), 'utf8');
  assert.ok(/field\.searchable \|\| \(field\.filterable && field\.type === 'text'\)/.test(q),
    '`lib/queries.js`-ийн ilike дүрэм өөрчлөгдөх ЁСГҮЙ ✗');
});

t('🚗 seed-ийн авто демо (брэнд, загвар) хосууд CAR_MODELS-д БАГТСАН', () => {
  const seed = readFileSync(new URL('../scripts/seed-sections.mjs', import.meta.url), 'utf8');
  const block = (name, open, close) => {
    const i = seed.indexOf(`const ${name} = ${open}`);
    return seed.slice(i, seed.indexOf(close, i));
  };
  const PAIR = /\[\s*'([^']+)'\s*,\s*'([^']+)'\s*\]/g;
  const bad = [];
  const srcs = [
    ['CAR_PAIRS', block('CAR_PAIRS', '[', '\n];')],
    ['AUTO_SUBTYPE_PAIRS', block('AUTO_SUBTYPE_PAIRS', '{', '\n};')],
  ];
  for (const [label, src] of srcs) {
    for (const line of src.split('\n')) {
      // ⚠️ «Авто сэлбэг, хэрэгсэл» — «загвар» нь БАРААНЫ НЭР тул ХАСААНА ✓
      if (line.includes('Авто сэлбэг')) continue;
      for (const m of line.matchAll(PAIR)) {
        const list = CAR_MODELS[m[1]];
        if (list && !list.includes(m[2])) bad.push(`${label}: ${m[1]} → ${m[2]}`);
      }
    }
  }
  assert.deepEqual(bad, [], `форм дээр сонгогдохгүй демо загвар ✗: ${bad.join(' | ')}`);
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

t("Бусад хэсгийн шүүлт (jobs: 3, computers: 1, furniture/home/travel: 1, electric: 1, 🧱 1, 🏭 1, 🛠 services: 1)", () => {
  const count = (s) => getAttrFilters(s).length;
  assert.equal(count('jobs'), 3);
  // 🛡️ 2026-10-01 (18): 💻 computers — 🛡️ «Баталгаа» (`warranty`) ХАСАГДСАН (3 → 2) ✓
  //    🖥 2026-10-03 (7): `attrFilters` нь 6 болов (📺/⚙️/🧠/💾 нэмэгдэв) — гэхдээ
  //       тэдгээр нь `onlySubtypes`-тай тул ДЭД ТӨРӨЛГҮЙ дуудлагад ОРОХГҮЙ ⇒ 2 ✓
  //       (Notebook брэнд дээр 6 — доорх «🖥» тестүүд ✓)
  //    🏷️ 2026-10-03 (20): 🏷️ «Брэнд» Ч `filterSubtypes`-тай ⇒ дэд төрөлгүй
  //       дуудлагад 1 л үлдэв (✅ Шинэ / Шинэвтэр / Хуучин) ✓
  assert.equal(count('computers'), 1);
  assert.equal(getAttrFilters('computers', 'Notebook').length, 6);
  // ⚡ 2026-09-29: `home` (Гэр ахуйн бараа) мөн ХЯЛБАР ФОРМ болсон тул
  //    `📦 Хүргэлт` ХАСАГДАВ — зөвхөн `✅ Шинэ / Шинэвтэр / Хуучин` үлдэнэ (2 → 1) ✓
  assert.equal(count('home'), 1);
  // ⚡ 2026-09-30: `electric` (Цахилгаан бараа) — ШИНЭ хэсэг, мөн 1 шүүлт
  //    (хэсэг + бүлэг + дэд төрөл нь самбар дээрээ, sidebar-д «Шинэ / Шинэвтэр / Хуучин») ✓
  assert.equal(count('electric'), 1);
  // 🧱/🏭 2026-09-30 (2): 2 ШИНЭ хэсэг — мөн 1 шүүлт (🛋️/⚡-той ижил ХЯЛБАР ФОРМ)
  //    ⚠️ Дэд төрөл нь ХАВТГАЙ (23 ба 20) — самбар дээр бүгд шууд харагдана ✓
  assert.equal(count('construction'), 1);
  assert.equal(count('equipment'), 1);
  // 🛋️/🧳 2026-09-30 (5): 2 ШИНЭ 1-Р ТҮВШНИЙ хэсэг — мөн 1 л шүүлт
  //    (дэд төрөл нь ХАВТГАЙ: 13 ба 12 — 🧱/🏭-ийн ЯГ ИЖИЛ хялбар форм ✓)
  // 🆕 2026-10-08 (71) · ✏️ шошго (73): 🛏 «Ор болдог эсэх» (`sofaBed`) нэмэгдсэн ч энэ дуудлага
  //    нь ДЭД ТӨРӨЛГҮЙ ⇒ `onlySubtypes` («Буйдан, кресло»)-аар шүүгдэж
  //    ХАРАГДАХГҮЙ тул тоо ХӨНДӨӨГДӨХГҮЙ (1 ✓); «Буйдан, кресло» дээр 2 (§⑧г ✓)
  assert.equal(count('furniture'), 1);
  assert.equal(count('travel'), 1);
  // 🛠 2026-10-05 (45): `services` — 🧭 `workMode` («Үйлчилгээний хэлбэр») ба
  //    💵 `priceUnit` («Үнийн хэлбэр») ХАСАГДСАН (хэрэглэгчийн хүсэлт:
  //    «…талбаруудыг Үйлчилгээ хэсгээс хасна уу, Дахин ашиглахгүй») ⇒ шүүлт 3 → **1** ✓
  // 🆕 2026-10-06 (5): үлдсэн 🕒 «Ажиллах цаг» ч ХАСАГДАВ (хэрэглэгчийн хүсэлт:
  //    «Нэр / компани, Хамрах хүрээ, Туршлага, Ажиллах цаг -ийг Ажил,
  //    Үйлчилгээ цэснээс байхгүй болго. Цаашид хэрэглэхгүй») ⇒ шүүлт 1 → **0**
  //    (sidebar-д attr шүүлт ОГТ БАЙХГҮЙ — зөвхөн Үнэ,₮ блок үлдэнэ ✓)
  assert.equal(count('services'), 0);
});

t('Шүүлтэд ороогүй талбар (mileage, engine) ГООЛДОХГҮЙ', () => {
  const keys = getAttrFilters('auto').map((f) => f.key);
  assert.ok(!keys.includes('mileage'));
  assert.ok(!keys.includes('engine'));
  // ⚠️ Гэхдээ ФОРМ дээр (attrFields) байх ЁСТОЙ
  assert.ok(getAttrField('auto', 'mileage'));
  assert.ok(getAttrField('auto', 'engine'));
});

t('⚙️ ФОРМ-ын талбар дараалал: brand → model → color → year → importYear', () => {
  const sec = getSection('auto');
  assert.deepEqual(
    sec.attrFields.slice(0, 5).map((f) => f.key),
    ['brand', 'model', 'color', 'year', 'importYear'],
  );
  // ⚠️ 2026-10-01 (2) (хэрэглэгчийн хүсэлт): 🎨 «Өнгө» нь 🚙 «Загвар»-ын ЯГ
  //    дараа — форм нь `attrFields.map()`-ээр массивын дарааллаар ЗУРДАГ тул
  //    массивыг өөрчлөхөд форм дээрх байршил автоматаар солигдоно ✓
  const keys = sec.attrFields.map((f) => f.key);
  assert.equal(keys.indexOf('color'), keys.indexOf('model') + 1);
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
t('⚽ hobby: ЗӨВХӨН «Төлөв» (condition) шүүлттэй', () => {
  const keys = getAttrFilters('hobby').map((f) => f.key);
  assert.deepEqual(keys, ['condition']);
  const f = getAttrFilters('hobby')[0];
  // 🆕 2026-10-05 (43): нэр нь «Шинэ / Шинэвтэр / Хуучин» → «Төлөв» болов
  //    (`CONDITION_LABEL` — форм БА шүүлт НЭГ эх сурвалж ✓)
  assert.equal(f.label, 'Төлөв');
  assert.equal(f.icon, '✅');
  // ✅ 2026-10-02 (хэрэглэгчийн шаардлага): ЯГ 3 сонголт — 2026-09-29-д 2 байв
  assert.deepEqual(f.options, ['Шинэ', 'Шинэвтэр', 'Хуучин']);
  // 🆕 2026-10-06 (17): ⏳ (43)-ийн `#filter-bar` pill ХАСАГДАВ — ✅ нь
  //    «Дэлгэрэнгүй хайлт»-ийн САЙДБАРТ буцсан (хэрэглэгчийн хүсэлт:
  //    «Компьютер, Дагалдах хэрэгсэл болон бусад хэсгийн Төлөв сонголтыг ч
  //    Дэлгэрэнгүй хайлт хэсэгт оруул») ⇒ `filterBar` туг БАЙХГҮЙ ✓
  assert.equal(f.filterBar, undefined, '✅ pill хэвээр байна ✗ (сайдбарт байх ёстой)');
  assert.equal(f.afterPayment, undefined, '✅ нь «Төлбөрийн нөхцөл»-ийн дараах ✗');
  assert.equal(f.chips, true);
  assert.equal(f.multi, true);
  assert.equal(f.multiNoun, 'төлөв');
});

// ---- ⑤б ✅ «ШИНЭ / ШИНЭВТЭР / ХУУЧИН» — БҮХ хэсэгт НЭГ ижил (2026-10-02) ----
// Хэрэглэгчийн шаардлага: «Барааны шинэ хуучин -ыг Шинэ, Шинэвтэр, Хуучин болго».
// ⚠️ 2026-09-29-д 2 сонголттой байв (`Шинэ` / `Хуучин`) → 2026-10-02-д дунд нь
//    `Шинэвтэр` НЭМЭГДЭВ ✓ (дараалал нь ЗААВАЛ `Шинэ` → `Шинэвтэр` → `Хуучин`)
// ⚠️ ӨМНӨ (2026-09-29-аас өмнө) хэсэг тус бүрд `Төлөв` / `Шинэ эсвэл хуучин`
//    гэж ЯЛГААТАЙ нэрээр 4 сонголттой байв (Хэрэглэсэн — сайн / — хэвийн /
//    Засвар шаардлагатай) ✗
t('✅ Форм (attrFields) ба шүүлт (attrFilters) — condition нь 3 сонголттой', () => {
  const sections = SECTIONS.filter((s) => s.attrFields.some((f) => f.key === 'condition'));
  assert.ok(sections.length >= 2, 'condition талбартай хэсэг байх ёстой');
  sections.forEach((s) => {
    const field = getAttrField(s.value, 'condition');
    assert.equal(field.label, 'Төлөв', `${s.value}: формоны нэр`);   // 🆕 (43)
    assert.deepEqual(field.options, ['Шинэ', 'Шинэвтэр', 'Хуучин'], `${s.value}: формоны сонголт`);
    /**
     * 🆕 2026-10-03 (21): хайлтын шүүлт нь ОЛОН СОНГОЛТТОЙ ЧИП (`chips`+`multi`,
     * «✅ 2 төлөв» шошго) — ⚠️ ФОРМ ХӨНДӨӨГДӨӨГҮЙ (`formChips` туг БАЙХГҮЙ тул
     * 3-р алхамд хэвээр `<select>` — `components/AddListingClient.jsx` ✓).
     * 🆕 2026-10-06 (17): ⏳ (43)-ийн `filterBar` pill ХАСАГДАВ — хайлтын талд
     * САЙДБАРТ («Дэлгэрэнгүй хайлт») буцсан ✓ (`filterBar` туг БАЙХГҮЙ)
     * Дэлгэрэнгыг `scripts/test-attr-multi.mjs` түгждэг
     */
    assert.equal(field.chips, true, `${s.value}: чип болоогүй ✗`);
    assert.equal(field.multi, true, `${s.value}: олон сонголт болоогүй ✗`);
    assert.equal(field.multiNoun, 'төлөв', `${s.value}: «N төлөв» шошго ✗`);
    assert.equal(field.filterBar, undefined, `${s.value}: pill хэвээр байна ✗`);
    assert.ok(!field.formChips, `${s.value}: форм дээр чип болжээ ✗`);
    // Шүүлтэд харагдах хувилбар нь МӨН ижил байх ёстой (нэг эх сурвалж ✓)
    const filter = getAttrFilters(s.value).find((f) => f.key === 'condition');
    if (filter) {
      assert.equal(filter.label, 'Төлөв', `${s.value}: шүүлтийн нэр`);
      assert.deepEqual(filter.options, ['Шинэ', 'Шинэвтэр', 'Хуучин'], `${s.value}: шүүлтийн сонголт`);
      // 🆕 2026-10-03 (21): чип тугууд нь sidebar-ийн шүүлтэд ч ИЖИЛ ✓
      assert.equal(filter.chips, true, `${s.value}: шүүлт чип биш ✗`);
      assert.equal(filter.multi, true, `${s.value}: шүүлт нэг утгатай ✗`);
      assert.equal(filter.multiNoun, 'төлөв');
      // 🆕 2026-10-06 (17): pill туг ХАСАГДАВ (нэг эх сурвалж — форм ба шүүлт ✓)
      assert.equal(filter.filterBar, undefined, `${s.value}: шүүлт pill хэвээр ✗`);
      assert.equal(filter, field, `${s.value}: форм ба шүүлт ӨӨР объект ✗`);
    }
  });
});

// 🆕 2026-10-02: «Шинэвтэр» нь ЗӨВХӨН нэг удаа байх ба ЯГ дунд (2 дахь) байрлалд
t('✅ condition: ЯГ 3 УНИКАЛ сонголт, «Шинэвтэр» ДУНД (давхардал 0)', () => {
  const field = getAttrField('hobby', 'condition');
  assert.equal(field.options.length, 3);
  assert.equal(new Set(field.options).size, 3, 'давхардсан сонголт байх ёсгүй ✗');
  assert.equal(field.options[0], 'Шинэ');
  assert.equal(field.options[1], 'Шинэвтэр', '«Шинэвтэр» нь ЯГ дунд байх ёстой');
  assert.equal(field.options[2], 'Хуучин');
});

t('🆕 2026-10-02: картын мөр «✅ Шинэвтэр» утгыг ДАВХАРДУУЛАХГҮЙ харуулна', () => {
  assert.equal(
    formatAttrsLine('home', { condition: 'Шинэвтэр' }),
    '✅ Шинэвтэр',
  );
});

t('🚫 «Хэрэглэсэн — сайн/хэвийн», «Засвар шаардлагатай» сонголтууд БҮРЭН ХАСАГДСАН', () => {
  SECTIONS.forEach((s) => {
    const field = s.attrFields.find((f) => f.key === 'condition');
    if (!field) return;
    // ⚠️ ⚠️ «Төлөв» нь 2026-10-05 (43)-аас ХҮЧИНТЭЙ ШОШГО (`label`) болов —
    //    энэ жагсаалт нь ЗӨВХӨН СОНГОЛТ (value) ✓ (`Шинэ / Шинэвтэр / Хуучин`
    //    нь мөн л сонголт байж БОЛОХГҮЙ)
    ['Хэрэглэсэн — сайн', 'Хэрэглэсэн — хэвийн', 'Засвар шаардлагатай', 'Хэвийн',
      'Төлөв', 'Шинэ эсвэл хуучин', 'Шинэ / Шинэвтэр / Хуучин']
      .forEach((bad) => {
        assert.ok(!field.options.includes(bad), `${s.value}: «${bad}» сонголт үлдсэн ✗`);
      });
    // ⚠️ ХУУЧИН ШОШГО (2026-10-05 (43)-д «Төлөв» болов) буцаж ирэхгүй ✓
    ['Шинэ / Шинэвтэр / Хуучин', 'Шинэ эсвэл хуучин', 'Төлөв байдал']
      .forEach((bad) => {
        assert.notEqual(field.label, bad, `${s.value}: хуучин нэр «${bad}» үлдсэн ✗`);
      });
    assert.equal(field.label, 'Төлөв', `${s.value}: нэр нь «Төлөв» биш ✗`);
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

// ---- ⑤г ⚽ «СПОРТ БАРАА»: 19 ХАВТГАЙ дэд төрөл (2026-10-05 (50) + 2026-10-07) ----
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2026-10-07): «Спорт ийг Спорт бараа гэж нэрлэх.
// Эндээс Кемпинг -ийг хасах, мөн Усанд сэлэх -ийг хасах. Дартс ийг хамгийн
// эхэнд оруулах» → нэр «Спорт бараа», дэд төрөл 21 → **19** (Кемпинг/Усанд
// сэлэх ХАСАГДАВ, 🆕 «Дартс» ЭХЭНД).
// ⇒ БҮГД ШУУД (2 дахь түвшин) — 3 дахь түвшин (бүлэг) БАЙХГҮЙ ✓
t('⚽ Хэсгийн нэр «Спорт бараа» (value нь `hobby` ХЭВЭЭР)', () => {
  const sec = getSection('hobby');
  assert.equal(sec.label, 'Спорт бараа');
  assert.equal(sec.value, 'hobby');   // ⚠️ DB/URL/CHECK хөндөгдөөгүй ✓
  assert.equal(sec.icon, '⚽');
  // ⚠️ ХУУЧИН нэрс хаана ч үлдэхгүй (2026-09-30 (4), 2026-10-05 (50), 2026-10-07)
  assert.notEqual(sec.label, 'Амралт, спорт, хобби');
  assert.notEqual(sec.label, 'Аялал, Спорт, Хобби');
  assert.notEqual(sec.label, 'Спорт');
});

t('⚽ hobby: 19 дэд төрөл — 3 дахь түвшин (бүлэг) БҮРЭН ХАСАГДСАН', () => {
  // ⚠️ 2026-09-30 (5): «Аяллын хэрэгсэл» бүлэг нь 🧳 `travel` тусдаа хэсэг
  //    болж ГАРСНЫ дараа бүлэг үлдэхгүй (subtypeGroups ХАСАГДАВ) → панельд
  //    19 мөр ШУУД харагдана ✓ (форм ч нэг хавтгай `<select>`)
  assert.deepEqual(getSubtypeGroups('hobby'), []);
  const subtypes = getSubtypes('hobby');
  assert.deepEqual(subtypes, [
    // ---------- 🆕 «Дартс» ХАМГИЙН ЭХЭНД (2026-10-07) ----------
    'Дартс',
    // ---------- Most popular categories ----------
    'Унадаг дугуй, сэлбэг', 'Загас ан агнуур',
    'Фитнес, гүйлт, йога', 'Гольф', 'Харваа', 'Багийн спорт',
    'Гадаа спорт', 'Теннис',
    // ---------- More categories ----------
    'Теннис, ракеткийн спорт', 'Цахилгаан скүүтэр', 'Цахилгаан дугуй',
    'Усны спорт', 'GPS, гүйлтийн цаг', 'Хөлбөмбөг', 'Бокс, MMA',
    'Сагсан бөмбөг', 'Америк хөлбөмбөг',
    'Бусад',
  ]);
  assert.equal(subtypes.length, 19);
  assert.equal(new Set(subtypes).size, 19);   // ⚠️ давхардал 0
  // 🆕 2026-10-07 (хэрэглэгчийн хүсэлт): «Дартс» ХАМГИЙН ЭХНИЙ мөр ✓
  assert.equal(subtypes[0], 'Дартс');
  // ⚠️ 2026-10-07: «Кемпинг» ба «Усанд сэлэх» ХАСАГДАВ (0033-аар «Бусад»)
  assert.ok(!subtypes.includes('Кемпинг'), '«Кемпинг» үлдсэн ✗');
  assert.ok(!subtypes.includes('Усанд сэлэх'), '«Усанд сэлэх» үлдсэн ✗');
  // ⚠️ Бүлгийн ГАРЧИГ ба «хэрэглэгчийн 12 дэд төрөл» ЭНД БАЙХГҮЙ (🧳 рүү шилжсэн)
  assert.ok(!subtypes.includes('Аяллын хэрэгсэл'));
  assert.ok(!subtypes.includes('Майхан, сүүдрэвч'));
  // ⚠️ ШИНЭ жагсаалтад БАЙХГҮЙ хуучин 4 нэр (0029-оор «Бусад» болно ✓)
  for (const old of ['Ном, сонин, сэтгүүл', 'Спортын хэрэгсэл', 'Хөгжмийн зэмсэг', 'Цуглуулга']) {
    assert.ok(!subtypes.includes(old), `хуучин «${old}» үлдсэн ✗`);
  }
  // ⚠️ «Бусад» нь ЗӨВХӨН 1 удаа (19 дэх, ХАМГИЙН СҮҮЛИЙН мөр) — 0029/0033-ийн
  //    сүлжээний БУУХ ГАЗАР ✓ (🧱/🧳-ийн ЯГ ИЖИЛ загвар)
  assert.equal(subtypes.filter((s) => s === 'Бусад').length, 1);
  assert.equal(subtypes[subtypes.length - 1], 'Бусад');
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
t('🛋️ home: ЗӨВХӨН «Төлөв» шүүлттэй — 🚚 Хүргэлт ХАСАГДСАН', () => {
  const keys = getAttrFilters('home').map((f) => f.key);
  assert.deepEqual(keys, ['condition']);
  const f = getAttrFilters('home')[0];
  assert.equal(f.label, 'Төлөв');   // 🆕 2026-10-05 (43)
  assert.deepEqual(f.options, ['Шинэ', 'Шинэвтэр', 'Хуучин']);
  // 🆕 2026-10-06 (17): ⏳ (43)-ийн pill ХАСАГДАВ — сайдбарт чип блок ✓
  assert.equal(f.filterBar, undefined, 'pill хэвээр байна ✗');
  assert.equal(f.chips, true);
  assert.equal(f.multi, true);
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
  //    🧺 home-той ижил хялбар форм (форм зөвхөн «Шинэ / Шинэвтэр / Хуучин» асууна) ✓
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

t('💻 9 бүлэг — 3 нь доод түвшинтэй, 6 нь ӨӨРӨӨ сонгогдоно', () => {
  const groups = getSubtypeGroups('computers');
  assert.equal(groups.length, 9);
  assert.deepEqual(groups.map((g) => g.label), [
    'Суурин компьютер', 'Notebook', 'PS, XBox, Nintendo', 'Дагалдах хэрэгсэл',
    'Чихэвч', 'Принтер, Хувилагч, Сканнер, Ламинатор', 'iPad, Tablet, Kindle',
    'Принтер, Хувилагчийн хор', 'Бусад сэлбэг',
  ]);
  // 🗑 2026-10-07 (57): Notebook нь 21 брэндийн доод түвшингүй болов (leaf) ⇒
  //    доод түвшинтэй 4 → **3**, leaf 5 → **6** ✓
  assert.equal(groups.filter((g) => g.items.length > 0).length, 3);
  assert.equal(groups.filter((g) => g.items.length === 0).length, 6);
});

t('💻 Бүлгүүдийн дэд төрлүүд хэрэглэгчийн жагсаалттай ЯГ ТААРНА', () => {
  const byLabel = (l) => getSubtypeGroups('computers').find((g) => g.label === l).items;
  assert.deepEqual(byLabel('Суурин компьютер'),
    ['Иж бүрэн компьютер', 'Дэлгэц', 'Процессор, сервер', 'Mouse', 'Keyboard']);
  // 🗑 2026-10-07 (57): «Notebook» нь ОДОО өөрөө leaf (items: []) — 21 брэнд
  //    (Apple, Dell…) нь дэд төрөл БИШ, харин форм дээрх `attrs.brand` болов ✓
  assert.deepEqual(byLabel('Notebook'), []);
  assert.deepEqual(byLabel('PS, XBox, Nintendo'),
    ['Xbox', 'Xbox-ын тоглоомууд', 'Playstation', 'Playstation-ийн тоглоомууд',
      'Nintendo, Тоглоомууд', 'PS, XBox, Nintendo тоглоом суулгана', 'Бусад']);
  assert.deepEqual(byLabel('Дагалдах хэрэгсэл'),
    ['Зөөврийн хард, флаш', 'Модем', 'Свич', 'Проектор', 'Тог баригч',
      'Audio Video', 'Notebook цүнх', 'Бусад']);
});

t('💻 getSubtypes: 25 дэд төрөл, ДАВХАРДАЛГҮЙ (3 «Бусад» нэг утга болов)', () => {
  const subtypes = getSubtypes('computers');
  // 🗑 2026-10-07 (57): Notebook нь 21 брэндээ алдаж, ГАНЦ 'Notebook' болов ⇒
  //    45 → **25** (22 → 1: 21 утга хасагдав) ✓
  assert.equal(subtypes.length, 25);
  assert.equal(new Set(subtypes).size, subtypes.length);
  assert.equal(subtypes.filter((t) => t === 'Бусад').length, 1);
  // Доод түвшингүй бүлгүүд нь ӨӨРӨӨ дэд төрөл (сонгогдоно) ✓
  ['Notebook', 'Чихэвч', 'Принтер, Хувилагч, Сканнер, Ламинатор', 'iPad, Tablet, Kindle',
    'Принтер, Хувилагчийн хор', 'Бусад сэлбэг'].forEach((l) => assert.ok(subtypes.includes(l), l));
});

t('💻 Доод түвшинтэй бүлэг (Суурин компьютер, PS…) ЗАР болж ХАДГАЛАГДАХГҮЙ', () => {
  const subtypes = getSubtypes('computers');
  ['Суурин компьютер', 'PS, XBox, Nintendo', 'Дагалдах хэрэгсэл']
    .forEach((g) => assert.ok(!subtypes.includes(g), `«${g}» групп нь шүүлт БИШ ✗`));
  // 🗑 2026-10-07 (57): «Notebook» нь ХАРИН дэд төрөл (доод түвшингүй бүлэг) ✓
  assert.ok(subtypes.includes('Notebook'));
});

t('💻 Хуучин 11 хавтгай дэд төрөл БҮРЭН ХАСАГДСАН', () => {
  const subtypes = getSubtypes('computers');
  ['Зөөврийн компьютер', 'Монитор', 'Принтер, сканнер', 'Сүлжээ, роутер',
    'Хадгалах сан, SSD', 'Эд анги, сэлбэг', 'Гар, хулгана, хэрэгсэл', 'Тоглоом, консол',
    'Програм хангамж'].forEach((t) => assert.ok(!subtypes.includes(t), `хуучин «${t}» үлдсэн ✗`));
});

t('💻 findSubtypeGroup: «Тог баригч» → Дагалдах хэрэгсэл; leaf групп → null', () => {
  // 🗑 2026-10-07 (57): «Notebook» нь leaf групп болов ⇒ `findSubtypeGroup`
  //    NULL (брэнд нь дэд төрөл БИШ) — breadcrumb-д групп crumb НЭМЭГДЭХГҮЙ ✓
  assert.equal(findSubtypeGroup('computers', 'Notebook'), null);
  assert.equal(findSubtypeGroup('computers', 'Apple'), null);
  assert.equal(findSubtypeGroup('computers', 'Тог баригч').label, 'Дагалдах хэрэгсэл');
  // ⚠️ Доод түвшингүй групп нь item БИШ (өөрөө дэд төрөл) → breadcrumb-д нэмэгдэхгүй
  assert.equal(findSubtypeGroup('computers', 'Чихэвч'), null);
  // ⚠️ «Бусад» нь 2 бүлэгт (PS, XBox, Nintendo · Дагалдах хэрэгсэл) давхарддаг
  //    тул ЭХНИЙ бүлгийг (PS, XBox, Nintendo) буцаана (баримтжуулсан ✓)
  assert.equal(findSubtypeGroup('computers', 'Бусад').label, 'PS, XBox, Nintendo');
});

t('💻 Доод түвшинтэй БҮХ 3 бүлэг `collapsed: true` — 3 дахь түвшин 2 дахь дээр ХАРАГДАХГҮЙ', () => {
  const groups = getSubtypeGroups('computers');
  // Хэрэглэгчийн хүсэлт (2026-09-29): «Компьютер, Дагалдах хэрэгсэл-ийн
  // 3-р түвшний subcategory-г 2-р түвшин дээр харуулахгүй болгоё»
  // 🗑 2026-10-07 (57): «Notebook» нь leaf (items: []) болов ⇒ accordion
  //    туггүй болсон тул `collapsed` бүлэг 4 → **3** ✓
  assert.deepEqual(groups.filter((g) => g.collapsed).map((g) => g.label), [
    'Суурин компьютер', 'PS, XBox, Nintendo', 'Дагалдах хэрэгсэл',
  ]);
  // ⚠️ Доод түвшингүй бүлэг (`items: []`) нь ӨӨРӨӨ дэд төрөл тул панель дээр
  //    ШУУД СОНГОГДОХ мөрөөр ҮЛДЭНЭ — туг нь `false` ✓
  assert.equal(groups.filter((g) => g.collapsed).length, 3);
  assert.ok(groups.filter((g) => g.items.length === 0).every((g) => !g.collapsed));
  assert.equal(groups.find((g) => g.label === 'Notebook').items.length, 0);
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
  // 🛡️ 2026-10-01 (18): `warranty` ХАСАГДСАН → сүүлийн талбар нь `condition` ✓
  assert.deepEqual(getAttrFields('computers', 'Notebook').map((f) => f.key),
    ['brand', 'model', 'screen', 'cpu', 'ram', 'storage', 'condition']);
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
  // ⚠️ Шүүлт (`attrFilters`) нь 📺/⚙️/🧠/💾-д ХӨНДӨГДӨӨГҮЙ — CPU/RAM нь
  //    хүрээ/шүүлт БИШ ✓ (хэрэглэгчийн хүсэлт зөвхөн ФОРМЫН талбарт хамаарна)
  //    🛡️ 2026-10-01 (18): `warranty` («Баталгаа») мөн ХАСАГДСАН (3 → 2) ✓
  //    🖥 2026-10-03 (7): 📺/⚙️/🧠/💾 нь `attrFilters`-д НЭМЭГДЭВ — гэхдээ
  //       `onlySubtypes`-тай тул ДЭД ТӨРӨЛ дамжуулахгүй үед ХАРАГДАХГҮЙ
  //       (доорх «🖥» тестүүдийг үзнэ үү) ⇒ энэ дуудлага ХЭВЭЭР 2 ✓
  //    🏷️ 2026-10-03 (20): 🏷️ «Брэнд» Ч `filterSubtypes`-тай болов ⇒ дэд
  //       төрөл дамжуулахгүй үед шүүлтэд ГАРАХГҮЙ (1 л үлдэв — ✅ төлөв) ✓
  assert.deepEqual(getAttrFilters('computers').map((f) => f.key), ['condition']);
  assert.deepEqual(getAttrFilters('computers', 'Notebook').map((f) => f.key),
    ['brand', 'screen', 'cpu', 'ram', 'storage', 'condition']);
});

t('💻 Notebook-ийн талбар нь ЗӨВХӨН `PC_SPEC_SUBTYPES`-д харагдана (ганц)', () => {
  // 🗑 2026-10-07 (57): Notebook нь ганц дэд төрөл болов (`NOTEBOOK_BRANDS`
  //    ХАСАГДАВ) ⇒ `PC_SPEC_SUBTYPES` нь ЗӨВХӨН `['Notebook']` ✓
  assert.deepEqual(PC_SPEC_SUBTYPES, ['Notebook']);
  assert.ok(!PC_SPEC_SUBTYPES.includes('Иж бүрэн компьютер'),
    '«Иж бүрэн компьютер» PC_SPEC_SUBTYPES-д БАЙСААР байна ✗');
  assert.ok(!PC_SPEC_SUBTYPES.includes('Процессор, сервер'),
    '«Процессор, сервер» PC_SPEC_SUBTYPES-д БАЙСААР байна ✗');
  const spec = ['screen', 'cpu', 'ram', 'storage'];
  const keys = getAttrFields('computers', 'Notebook').map((f) => f.key).filter((k) => spec.includes(k));
  assert.deepEqual(keys, spec, 'Notebook-ийн 4 талбар бүрэн гарах ёстой');
});

t('⚠️ 💻 «Брэнд»/«Загвар» ба 📺/⚙️/🧠/💾 нь ХОЛДУУ дэд төрөлд ХАРАГДАХГҮЙ (2026-10-05 (56))', () => {
  // ⚠️ «Бусад» нь Notebook · PS,XBox,Nintendo · Дагалдах хэрэгсэл 3 бүлэгт
  //    давхарддаг ба DB-д зөвхөн НЭРЭЭР хадгалагддаг → форм нь алийг нь ч
  //    төлөөлж чадахгүй тул Notebook-ийн талбарыг ХАРУУЛАХГҮЙ ✓
  // 🛡️ 2026-10-01 (18): `warranty` ХАСАГДСАН ✓
  // 🆕 2026-10-05 (56) (хэрэглэгчийн хүсэлт: «notebook ээс бусад хэсэгт Брэнд
  //    Загвар гэсэн утга оруулахгүй»): 🏷️ «Брэнд» ба 🖥️ «Загвар» Ч
  //    `onlySubtypes`-тай болов ⇒ үлдэх талбар нь ЗӨВХӨН ✅ «Төлөв» ✓
  //    (⏳ (18)-аас хойш `brand · model · condition` — 3 байв ✗)
  const base = ['condition'];
  for (const sub of [
    '', 'Бусад', 'Mouse', 'Keyboard', 'Xbox', 'Playstation',
    'Чихэвч', 'Принтер, Хувилагч, Сканнер, Ламинатор', 'Принтер, Хувилагчийн хор',
    'iPad, Tablet, Kindle', 'Зөөврийн хард, флаш', 'Модем', 'Дэлгэц', 'Проектор', 'Бусад сэлбэг',
    // 🆕 2026-10-07 (52) (хэрэглэгчийн хүсэлт): «Иж бүрэн компьютер» нь
    //    «Дэлгэц»-тэй ЯГ ИЖИЛ — зөвхөн «✅ Төлөв» (⏳ өмнө нь 7 талбартай байв ✗)
    'Иж бүрэн компьютер',
    // 🆕 2026-10-07 (55) (хэрэглэгчийн хүсэлт): «Процессор, сервер» нь
    //    Mouse-той ЯГ ИЖИЛ — зөвхөн «✅ Төлөв» (⏳ өмнө нь 7 талбартай байв ✗)
    'Процессор, сервер',
  ]) {
    assert.deepEqual(getAttrFields('computers', sub).map((f) => f.key), base, `«${sub || '(хоосон)'}»`);
  }
  // ⚠️ ЭСРЭГЭЭР: «Notebook» (ганц дэд төрөл) дээр 7 талбар БҮРЭН харагдана ✓
  assert.deepEqual(PC_SPEC_SUBTYPES, ['Notebook']);
  for (const sub of PC_SPEC_SUBTYPES) {
    assert.deepEqual(getAttrFields('computers', sub).map((f) => f.key),
      ['brand', 'model', 'screen', 'cpu', 'ram', 'storage', 'condition'], `«${sub}»`);
  }
});

t('⚠️ `getAttrField` (картын мөр/шүүлт) нь `onlySubtypes`-аас ХАМААРАХГҮЙ + бусад 11 хэсэг хөндөгдөөгүй', () => {
  // ⚠️ Хуучин заруудын `attrs` нь DB-д хэвээр → карт/шүүлт нь ТАЛБАРЫГ
  //    үргэлжлүүлэн харна (картын мөр/шүүлт алга болохгүй ✓)
  assert.equal(getAttrField('computers', 'cpu').label, 'Процессор (CPU)');
  // ⚠️ Зөвхөн 💻 хэсгийн 6 талбарт `onlySubtypes` байна — 🆕 (56): `brand`
  //    ба `model` ч нэмэгдэв (brand · model · screen · cpu · ram · storage) —
  //    🆕 2026-10-08 (71) · ✏️ шошго (73): 🛋️ `furniture` дээр 🛏 «Ор болдог эсэх» (`sofaBed`)
  //    нэмэгдэв (ЗӨВХӨН «Буйдан, кресло») — бусад 10 хэсэгт ямар ч талбар
  //    ХАСАГДАХГҮЙ (форм нь хэвээр бүгдийг харуулна ✓).
  //    ⚠️ `condition` нь `onlySubtypes`-ГҮЙ тул 💻/🛋️-ийн БҮХ дэд төрөлд ✓
  let flagged = 0;
  let sofaGated = 0;
  for (const s of SECTIONS) {
    const fields = s.attrFields || [];
    const gated = fields.filter((f) => Array.isArray(f.onlySubtypes));
    if (s.value === 'computers') {
      flagged = gated.length;
      assert.equal(flagged, 6);
      continue;
    }
    if (s.value === 'furniture') {
      // 🆕 2026-10-08 (71): 🛏 `sofaBed` — ① зөвхөн «Буйдан, кресло»-д,
      //    ② дэд төрөл сонгоогүй/холдуу дэд төрөлд ГАРАХГҮЙ (форм + шүүлт)
      sofaGated = gated.length;
      assert.equal(sofaGated, 1, `🛋️ furniture: \`onlySubtypes\`-тай талбар 1 байх ёстой ✗`);
      assert.deepEqual(gated.map((f) => f.key), ['sofaBed']);
      assert.deepEqual(gated[0].onlySubtypes, ['Буйдан, кресло']);
      const only = (sub) => getAttrFields('furniture', sub).map((f) => f.key);
      assert.deepEqual(only(''), ['condition'], 'дэд төрөлгүй үед 🛏 ГАРАХГҮЙ ✗');
      assert.deepEqual(only('Зочны өрөөний'), ['condition'], 'холдуу дэд төрөлд 🛏 ГАРАХГҮЙ ✗');
      assert.deepEqual(only('Ор, матрас'), ['condition'], 'холдуу дэд төрөлд 🛏 ГАРАХГҮЙ ✗');
      assert.deepEqual(only('Бойдан, кресло'), ['condition'], 'бичлэгийн зөрүүгээр ГАРАХ ЁСГҮЙ ✗');
      assert.deepEqual(only('Буйдан, кресло'), ['condition', 'sofaBed'], '«Буйдан, кресло» дээр 🛏 ГАРАХ ЁСТОЙ ✗');
      // ⚠️ Sidebar (шүүлт) нь формтой ЯГ ИЖИЛ дүрмээр шүүгдэнэ ✓
      assert.deepEqual(getAttrFilters('furniture').map((f) => f.key), ['condition']);
      assert.deepEqual(getAttrFilters('furniture', 'Буйдан, кресло').map((f) => f.key), ['condition', 'sofaBed']);
      continue;
    }
    assert.equal(getAttrFields(s.value, getSubtypes(s.value)[0] || '').length, fields.length, `${s.value}: талбар хасагдаж байна ✗`);
    fields.forEach((f) => assert.equal(f.onlySubtypes, undefined, `${s.value}.${f.key}`));
  }
  assert.equal(flagged, 6);
  assert.equal(sofaGated, 1);
});

// ---------- 🖥 2026-10-03 (7): 💻 NOTEBOOK-ИЙН ШҮҮЛТ SIDEBAR-д ----------
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (жишиг сайтын Notebook хайлтын зураг): «notebook хайх
// дээр Дэлгэцийн хэмжээ · CPU · RAM · SSD Hard шүүлтүүд гардаг байх».
// ⚠️ Шүүлт нь ФОРМТОЙ нэг эх сурвалж (`attrFields`/`attrFilters` + `onlySubtypes`)
//    тул дараах тестүүд 2 үүрэг хамгаална: ① Notebook дээр шүүлт ХАРАГДАХ
//    ② холдуу дэд төрөл (Mouse, тонер, чихэвч) ба дэд төрөл СОНГООГҮЙ үед ГАРАХГҮЙ
t("🖥 getAttrFilters('computers', 'Notebook') — 📺/⚙️/🧠/💾 шүүлт НЭМЭГДЭВ (формтой ижил дараалал)", () => {
  const keys = getAttrFilters('computers', 'Notebook').map((f) => f.key);
  assert.deepEqual(keys, ['brand', 'screen', 'cpu', 'ram', 'storage', 'condition']);
  // ⚠️ `model` нь зөвхөн формойн талбар (шүүлтэд ОРОХГҮЙ ✓); `warranty` хасагдсан ✓
  assert.ok(!keys.includes('model') && !keys.includes('warranty'));
});

t('🖥 Шүүлтийн сонголт нь формойн сонголттой ЯГ ИЖИЛ (7 / 19 / 13 / 6 — нэг эх сурвалж)', () => {
  const expected = [
    ['screen', NOTEBOOK_SCREEN_OPTIONS],
    ['cpu', NOTEBOOK_CPU_OPTIONS],
    ['ram', NOTEBOOK_RAM_OPTIONS],
    ['storage', NOTEBOOK_STORAGE_OPTIONS],
  ];
  for (const [key, options] of expected) {
    const f = getAttrFilters('computers', 'Notebook').find((x) => x.key === key);
    assert.ok(f, `«${key}» шүүлт ОЛДСОНГҮЙ ✗`);
    assert.equal(f.options, options, `«${key}»: сонголт нь либын экспорт БИШ (давхар хуулбар) ✗`);
    assert.equal(f.type, 'select', `«${key}»: энгийн сонголт (select) биш ✗`);
    // ⚠️ `searchable` БИШ — утга нь ЯГ тэнцүү (`attrs->>cpu=eq.…`); 6–19 сонголт
    //    богино тул combobox шаардлагагүй ✓ (форм ч `<select>` хэвээр)
    assert.equal(f.searchable, undefined, `«${key}»: combobox болсон ✗`);
    /**
     * 🆕 2026-10-05 (43): 4 талбар нь ОЛОН СОНГОЛТТОЙ PILL болов
     * (хэрэглэгчийн хүсэлт: «Дэлгэцийн хэмжээ, CPU, RAM, SSD Hard, Төлөв
     * эдгээрийг мөн хайдаг болгоод өг») — `PC_SPEC_FILTER_EXTRA` ✓
     */
    assert.equal(f.chips, true, `«${key}»: чип болоогүй ✗`);
    assert.equal(f.multi, true, `«${key}»: олон сонголт болоогүй ✗`);
    assert.equal(f.filterBar, true, `«${key}»: pill болоогүй ✗`);
    assert.ok(f.multiNoun, `«${key}»: «N …» шошго БАЙХГҮЙ ✗`);
    // ⛔ ФОРМ ХӨНДӨӨГДӨӨГҮЙ — `formChips` туг БАЙХГҮЙ тул 3-р алхамд `<select>` ✓
    assert.ok(!f.formChips, `«${key}»: форм дээр чип болжээ ✗`);
    assert.deepEqual(f.onlySubtypes, PC_SPEC_SUBTYPES, `«${key}»: Notebook-д л харагдах ёстой ✗`);
  }
  // ⚠️ «N …» нэгж нь талбар тус бүрд ЯЛГААТАЙ (`PC_SPEC_FILTER_EXTRA(noun)` ✓)
  assert.deepEqual(
    ['screen', 'cpu', 'ram', 'storage']
      .map((k) => getAttrField('computers', k).multiNoun),
    ['хэмжээ', 'процессор', 'санах ой', 'хард'],
  );
});

t('🖥 Notebook-д 4 шүүлт; ХОЛДУУ дэд төрөл ба СОНГООГҮЙ үед 0', () => {
  const spec = ['screen', 'cpu', 'ram', 'storage'];
  for (const sub of PC_SPEC_SUBTYPES) {
    assert.deepEqual(getAttrFilters('computers', sub).map((f) => f.key),
      ['brand', ...spec, 'condition'], `«${sub}»`);
  }
  // 🏷️ 2026-10-03 (20): холдуу дэд төрөл дээр 🏷️ «Брэнд» Ч ХАРАГДАХГҮЙ
  //    (`filterSubtypes` — Notebook-ийн гэр бүлд л шүүлт болно ✓)
  // 🆕 2026-10-07 (52): «Иж бүрэн компьютер» ч холдуу болов (зөвхөн ✅)
  // 🆕 2026-10-07 (55): «Процессор, сервер» ч холдуу болов (зөвхөн ✅)
  for (const sub of ['', 'Бусад', 'Mouse', 'Keyboard', 'Xbox', 'Чихэвч', 'Дэлгэц',
    'Иж бүрэн компьютер', 'Процессор, сервер',
    'Принтер, Хувилагч, Сканнер, Ламинатор', 'iPad, Tablet, Kindle']) {
    assert.deepEqual(getAttrFilters('computers', sub).map((f) => f.key),
      ['condition'], `«${sub || '(хоосон)'}»: холдуу шүүлт гарч байна ✗`);
  }
});

// ---------- 🎛 2026-10-05 (43) · 🆕 2026-10-06 (17): `filterBar` — PILL-ийн ГЭРЭЭ ----------
/**
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (43): «Шинэ, Шинэвтэр, Хуучин ийг Төлөв гэж нэрлэ» +
 * «Дэлгэцийн хэмжээ, CPU, RAM, SSD Hard, Төлөв эдгээрийг мөн хайдаг болгоод өг».
 * 🆕 (17): «Өнгө, Түлш, Хурдны хайрцаг Дэлгэрэнгүй хайлтын хэсэгт Төлбөрийн
 * нөхцөлийн ардаас оруул» + «Ажлын зарын Ажлын цаг, Туршлага, Мэргэжлийн
 * түвшиныг бас Дэлгэрэнгүй хайлт д оруул» + «Компьютер, Дагалдах хэрэгсэл
 * болон бусад хэсгийн Төлөв сонголтыг ч Дэлгэрэнгүй хайлт хэсэгт оруул».
 *
 * ⚠️ `filterBar: true` гэдэг нь «энэ шүүлт нь САЙДБАРТ (SideBlock) БИШ, үр
 *    дүнгийн дээрх ХЭВТЭЭ `#filter-bar`-т ОЛОН СОНГОЛТТОЙ PILL (⌄ панель)»
 *    гэсэн НЭГ утгатай гэрээ:
 *    ① `chips` + `multi` ЗААВАЛ (эс бөгөөс pill нь олон утга авч чадахгүй ✗)
 *    ② утга/URL/DB ХӨНДӨӨГДӨХГҮЙ — `getAttrFilters` нь талбарыг ХЭВЭЭР
 *       буцаана (URL-аас уншигдах ёстой ✓); ЗӨВХӨН `HomeClient` нь
 *       `.filter((f) => !f.filterBar)`-ээр сайдбараас хасна (2 ӨӨР UI БАЙХГҮЙ ✓)
 *    ⚠️ (17)-ийн дараа туг нь ЗӨВХӨН 💻 📺/⚙️/🧠/💾 дээр ҮЛДЭВ (🚗 🎨/⛽/⚙️ ·
 *       💼 🕒/📊/📈 · ✅ «Төлөв» нь сайдбарт буцсан — доорх 🆕 (17) тестүүд ✓)
 */
t('🎛 `filterBar` туг: ЗААВАЛ `chips`+`multi` ба ЯГ 4 талбар (💻 Notebook)', () => {
  const bar = [];
  SECTIONS.forEach((s) => (s.attrFields || []).forEach((f) => {
    if (!f.filterBar) return;
    bar.push(`${s.value}.${f.key}`);
    assert.equal(f.chips, true, `${s.value}.${f.key}: filterBar ч chips БАЙХГҮЙ ✗`);
    assert.equal(f.multi, true, `${s.value}.${f.key}: filterBar ч multi БАЙХГҮЙ ✗`);
    // ⚠️ `attrFilters`-д БАЙХААР (утга нь URL-аас уншигдана ✓)
    assert.ok((s.attrFilters || []).includes(f.key),
      `${s.value}.${f.key}: attrFilters-д БАЙХГҮЙ ⇒ URL-аас уншигдахгүй ✗`);
    // ⚠️ `getAttrFilters` ч ХЭВЭЭР буцаана (хасалт нь ЗӨВХӨН HomeClient ✓)
    const sub = s.value === 'computers' ? 'Notebook' : '';
    assert.ok(getAttrFilters(s.value, sub).some((x) => x.key === f.key),
      `${s.value}.${f.key}: getAttrFilters-д БАЙХГҮЙ ✗`);
    // ⚠️ pill ба afterPayment нь ХАМТ БАЙХ ЁСТОЙГҮЙ (2 өөр UI ✗)
    assert.equal(f.afterPayment, undefined,
      `${s.value}.${f.key}: filterBar ба afterPayment ХАМТ байна ✗`);
  }));
  assert.deepEqual(bar, [
    // 🖥 (43) · 🆕 (17): ЗӨВХӨН 💻-ийн 4 үзүүлэлт pill хэвээр —
    //    🚗 🎨/⛽/⚙️ · 💼 🕒/📊/📈 ба ✅ «Төлөв» (8 хэсэг) нь сайдбарт ✓
    'computers.screen', 'computers.cpu', 'computers.ram', 'computers.storage',
  ], `pill талбарууд: ${bar.join(', ')}`);
});

t('🎛 HomeClient: pill нь ЗӨВХӨН `chips && multi && filterBar`; сайдбараас `!f.filterBar`', () => {
  const src = readFileSync(new URL('../components/HomeClient.jsx', import.meta.url), 'utf8');
  // ⚠️ Нэг эх сурвалж: pill-ийн жагсаалт нь ЛИБ-ийн тугуудаас (хатуу массив БАЙХГҮЙ ✓)
  assert.match(src, /attrFilters\.filter\(\(f\) => f\.chips && f\.multi && f\.filterBar\)/);
  // ⚠️ 2 ӨӨР UI БАЙХГҮЙ — сайдбар нь filterBar талбарыг ХАСНА ✓
  assert.match(src, /\.filter\(\(f\) => !f\.filterBar\)/);
  // ⚠️ Pill нь CDP-ийн дэгээтэй (DOM ↔ либ харьцуулалт — `cdp:specs` ✓)
  assert.match(src, /data-filter-pill=\{testKey\}/);
  assert.match(src, /data-filter-bar/);
  // ⚠️ Идэвхтэй тоо нь `countAttrValues` (хоосон = 0 ✓), цэвэрлэгээ `[]`
  assert.match(src, /count=\{countAttrValues\(attrArray\(f\.key\)\)\}/);
  assert.match(src, /onClick=\{\(\) => toggleAttrMulti\(f\.key, o\)\}/);
});

// ---------- 🔀 🆕 2026-10-06 (17): PILL → САЙДБАР («Дэлгэрэнгүй хайлт») ----------
/**
 * 🆕 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Автомашины Дэлгэрэнгүй хайлт дээр Төлбөрийн нөхцөл
 * ийн хайлтыг Өнгө сонгож байгаа шиг болгож өөрчил, Өнгө, Түлш, Хурдны хайрцаг
 * Дэлгэрэнгүй хайлтын хэсэгт Төлбөрийн нөхцөлийн ардаас оруул. Ажлын зарын
 * Ажлын цаг, Туршлага, Мэргэжлийн түвшин -ийг бас Дэлгэрэнгүй хайлт д оруул.
 * Мөн Компьютер, Дагалдах хэрэгсэл болон бусад хэсгийн Төлөв сонголтыг ч
 * Дэлгэрэнгүй хайлт хэсэгт оруул»
 *
 * ⚠️ ДҮРЭМ: ① утга/URL/DB ХӨНДӨӨГДӨХГҮЙ (зөвхөн ГАЗАР нь солигдоно ✓)
 *    ② 🚗 3 нь `afterPayment` (1 өнгө → 2 түлш → 3 хайрцаг) ⇒ 💳-ийн АРАА
 *    ③ 💼 3 ба ✅ (8 хэсэг) нь үндсэн attr жагсаалтад (сайдбарт) ✓
 *    ④ 💻 📺/⚙️/🧠/💾 нь pill ХЭВЭЭР (хүсэлтэд зөвхөн «Төлөв» нэрлэгдсэн ✓)
 */
t('🔀 (17) 🚗 🎨/⛽/⚙️ — `afterPayment` эрэмбэ 1/2/3 (pill туг БАЙХГҮЙ)', () => {
  const auto = getAttrFilters('auto');
  const ap = auto
    .filter((f) => f.afterPayment)
    .sort((a, b) => a.afterPayment - b.afterPayment);
  assert.deepEqual(ap.map((f) => f.key), ['color', 'fuel', 'transmission'],
    'авто: «💳 Төлбөрийн нөхцөл»-ийн дараах дараалал ✗ (Өнгө → Түлш → Хайрцаг)');
  assert.deepEqual(ap.map((f) => f.afterPayment), [1, 2, 3]);
  ap.forEach((f) => {
    assert.equal(f.chips, true, `auto.${f.key}: чип биш ✗`);
    assert.equal(f.multi, true, `auto.${f.key}: олон сонголт биш ✗`);
    assert.equal(f.filterBar, undefined, `auto.${f.key}: pill туг хэвээр ✗`);
    assert.ok(f.multiNoun, `auto.${f.key}: multiNoun БАЙХГҮЙ ✗`);
  });
  // ⚠️ Утга/URL/DB ХӨНДӨӨГДӨӨГҮЙ — зөвхөн ГАЗАР нь солигдов ✓
  assert.deepEqual(getAttrField('auto', 'color').options, AUTO_COLOR_OPTIONS);
  assert.deepEqual(getAttrField('auto', 'fuel').options,
    ['Бензин', 'Дизель', 'Хайбрид', 'Цахилгаан', 'Хий', 'Бусад']);
  assert.deepEqual(getAttrField('auto', 'transmission').options, ['Автомат', 'Механик']);
  // ⚠️ Сарын үндсэн attr жагсаалтад ХЭВЭЭР (URL-аас уншигдана ✓)
  ['color', 'transmission', 'fuel'].forEach((k) => {
    assert.ok((getSection('auto').attrFilters || []).includes(k),
      `auto.${k}: attrFilters-д БАЙХГҮЙ ⇒ URL-аас уншигдахгүй ✗`);
  });
});

t('🔀 (17) 💼 🕒/📊/📈 ба ✅ «Төлөв» (8 хэсэг) — pill туг БАЙХГҮЙ, чип блок ХЭВЭЭР', () => {
  // 💼 — 3 шүүлт (🆕 2026-10-07: ФОРМ нь `<select>` болов ⇒ `formChips` ХАСАГДАВ ✓)
  const jobs = getAttrFilters('jobs');
  assert.deepEqual(jobs.map((f) => f.key), ['jobType', 'experience', 'jobLevel']);
  jobs.forEach((f) => {
    assert.equal(f.filterBar, undefined, `jobs.${f.key}: pill туг хэвээр ✗`);
    assert.equal(f.afterPayment, undefined, `jobs.${f.key}: afterPayment ✗`);
    assert.equal(f.chips, true, `jobs.${f.key}: чип биш ✗`);
    assert.equal(f.multi, true, `jobs.${f.key}: олон сонголт биш ✗`);
    assert.equal(f.formChips, undefined, `jobs.${f.key}: форм чип хэвээр ✗`);
  });
  // ✅ — 8 хэсэгт нэг туг (`CONDITION_FILTER_EXTRA`)
  const cond = SECTIONS.filter((s) => s.attrFields.some((f) => f.key === 'condition'));
  assert.equal(cond.length, 8, `condition талбартай хэсэг: ${cond.map((s) => s.value).join(', ')}`);
  cond.forEach((s) => {
    const f = getAttrField(s.value, 'condition');
    assert.equal(f.filterBar, undefined, `${s.value}.condition: pill туг хэвээр ✗`);
    assert.equal(f.chips, true, `${s.value}.condition: чип биш ✗`);
    assert.equal(f.multi, true, `${s.value}.condition: олон сонголт биш ✗`);
  });
  // 💻 📺/⚙️/🧠/💾 — хүсэлтэд «Төлөв» л нэрлэгдсэн тул pill ХЭВЭЭР ✓
  ['screen', 'cpu', 'ram', 'storage'].forEach((k) => {
    assert.equal(getAttrField('computers', k).filterBar, true,
      `computers.${k}: pill хасагдсан ✗ (хүсэлтэд ороогүй)`);
  });
});

t('🔀 (17) HomeClient: `afterPaymentAttrs` нь 💳-ийн ЯГ ДАРАА, үндсэн жагсаалтаас ХАСАГДАНА', () => {
  const src = readFileSync(new URL('../components/HomeClient.jsx', import.meta.url), 'utf8');
  // ① Жагсаалт нь ЛИБ-ийн тугуудаас (`chips && multi && afterPayment`) — хатуу массив БАЙХГҮЙ ✓
  assert.match(src, /attrFilters\s*\.filter\(\(f\) => f\.chips && f\.multi && f\.afterPayment\)/);
  assert.match(src, /\.sort\(\(a, b\) => a\.afterPayment - b\.afterPayment\)/);
  // ② Үндсэн attr жагсаалтаас ХАСНА (2 ӨӨР UI БАЙХГҮЙ ✓)
  assert.match(src, /\.filter\(\(f\) => !f\.afterPayment\)/);
  // ③ БАЙРЛАЛ: 💳 (`showPayments`) → afterPaymentAttrs → «📐 Талбай, м²»
  const payAt = src.indexOf('{showPayments && (');
  const afterAt = src.indexOf('{afterPaymentAttrs.map((f) => (');
  const areaAt = src.indexOf('SideBlock label="Талбай, м²"');
  assert.ok(payAt > 0 && afterAt > 0 && areaAt > 0, '💳/дараах/талбай блок олдсонгүй ✗');
  assert.ok(payAt < afterAt, 'afterPayment блок 💳-ийн ӨМНӨ байна ✗');
  assert.ok(afterAt < areaAt, 'afterPayment блок «Талбай, м²»-ийн дараа байна ✗');
  // ④ Хайрцаг нь НЭГ газар (`attrChipBox`) — pill ⇢ ⌄ панель ч мөн адил ✓
  assert.match(src, /const attrChipBox = \(f\) => \(/);
  assert.match(src, /const attrChipsBlock = \(f\) => \(/);
  assert.match(src, /\{attrChipBox\(f\)\}/);
  assert.match(src, /\{attrChipsBlock\(f\)\}/);
});

// ---------- 🗂 🆕 2026-10-06 (18): САЙДБАРЫН ЧИП БЛОК — ХУРААХ/ДЭЛГЭХ ГЭРЭЭ ----------
/**
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Энэ дэлгэрэнгүй дотор байгаа Ажлын цаг [гэх мэт]
 *   сонголт чинь хураагдаж болдоггүй юм уу, их зай эзлээд лалрын байна».
 *
 * ⚠️ ДҮРЭМ (НЭГ ЭХ СУРВАЛЖ `SIDEBAR_CHIP_COLLAPSE_MIN`): 5 ба түүнээс олон
 *    сонголттой чип блок нь анхдагчаар ХУРААСАН (`aria-expanded="false"`),
 *    цөөн сонголттой нь НЭЭЛТТЭЙ; идэвхтэй утгатай блок АВТОМАТААР НЭЭЛТТЭЙ
 *    (шүүлт нь ДАЛД үлдэхгүй ✓); хэрэглэгчийн товшилт нь анхдагчаас ДЭЭГҮҮР ✓
 * ⚠️ Утга/URL/DB ХӨНДӨӨГДӨХГҮЙ — зөвхөн ХАРАГДАЦ; хаалттай ч чипүүд DOM-д
 *    БАЙНА (зөвхөн `hidden` класс) ⇒ CDP-ийн дэгээнүүд (`data-attr-value`,
 *    `aria-pressed`, `data-room-value`, `data-payment-value`) ХЭВЭЭР ✓
 */
t('🗂 (18) `SIDEBAR_CHIP_COLLAPSE_MIN` = 5 (нэг эх сурвалж — HomeClient уншина)', () => {
  assert.equal(typeof SIDEBAR_CHIP_COLLAPSE_MIN, 'number');
  assert.equal(SIDEBAR_CHIP_COLLAPSE_MIN, 5, 'босго 5 биш ✗');
  assert.ok(SIDEBAR_CHIP_COLLAPSE_MIN >= 2 && SIDEBAR_CHIP_COLLAPSE_MIN <= 8,
    'босго нь «хэт бага/их» — 2..8 хооронд байх ёстой ✗');
});

t('🗂 (18) Анхдагч төлөв: 5+ сонголттой нь ХУРААСАН, цөөн нь НЭЭЛТТЭЙ (либээс тоолно)', () => {
  /** [шошго, сонголтын тоо] — хатуу тоо БИШ, либээс (`ROOM_OPTIONS`/`PAYMENT_OPTIONS`) ✓ */
  const rows = [
    ['Өрөөний тоо', ROOM_OPTIONS.length],
    ['Төлбөрийн нөхцөл', PAYMENT_OPTIONS.length],
    ...getAttrFilters('jobs').map((f) => [f.label, (f.options || []).length]),
    ...getAttrFilters('auto').filter((f) => f.afterPayment).map((f) => [f.label, (f.options || []).length]),
  ];
  const collapsed = rows.filter(([, n]) => n >= SIDEBAR_CHIP_COLLAPSE_MIN).map(([l]) => l);
  const open = rows.filter(([, n]) => n < SIDEBAR_CHIP_COLLAPSE_MIN).map(([l]) => l);
  assert.deepEqual(collapsed, ['Өрөөний тоо', 'Ажлын цаг', 'Мэргэжлийн түвшин', 'Өнгө', 'Түлш'],
    `хураасан блок: ${collapsed.join(', ')}`);
  assert.deepEqual(open, ['Төлбөрийн нөхцөл', 'Туршлага', 'Хурдны хайрцаг'],
    `нээлттэй блок: ${open.join(', ')}`);
});

t('🗂 (18) HomeClient: `SideBlock` ЭВХЭГДДЭГ (`data-side-collapse` + `aria-expanded`) · контент DOM-д', () => {
  const src = readFileSync(new URL('../components/HomeClient.jsx', import.meta.url), 'utf8');
  const at = src.indexOf('function SideBlock(');
  assert.ok(at > 0, '`SideBlock` функц олдсонгүй ✗');
  const rest = src.slice(at);
  const end = rest.indexOf('\nfunction ');
  const block = end > 0 ? rest.slice(0, end) : rest;
  // ① Гарчиг нь ДАРАГДДАГ товч — ARIA + CDP дэгээ
  assert.match(block, /data-side-collapse=\{collapseKey\}/, '`data-side-collapse` дэгээ БАЙХГҮЙ ✗');
  assert.match(block, /aria-expanded=\{open\}/, '`aria-expanded` БАЙХГҮЙ ✗');
  assert.match(block, /onClick=\{onToggle\}/, 'товчны `onClick` БАЙХГҮЙ ✗');
  // ② ХУРААСАН ч контент DOM-д — зөвхөн `hidden` класс солигдоно ✓
  assert.match(block, /className=\{open \? 'flex flex-col gap-2' : 'hidden'\}/,
    'контент нь `hidden` классоор нуугдахгүй (CDP дэгээнүүд унана ✗)');
  assert.ok(!/\{open && /.test(block),
    'контентыг НӨХЦӨЛТЭЙ рендэр болгосон — DOM-д байх ЁСТОЙ (CDP ✗)');
  assert.match(block, /\{children\}/, '`children` рендэрлэгдэхгүй ✗');
  // ③ Анхдагч дүрэм + 3 давхарга төлөв (панелийн «Бүгдийг нээх» товчтой)
  assert.match(src, /return activeCount > 0 \|\| optionCount < SIDEBAR_CHIP_COLLAPSE_MIN;/,
    'идэвхтэй утгатай блок автоматаар нээгдэхгүй ✗');
  assert.match(src, /data-side-toggle-all/, '«Бүгдийг нээх/Хураах» товч БАЙХГҮЙ ✗');
  assert.match(src, /const toggleAllSideBlocks = \(\) => \{/, '`toggleAllSideBlocks` БАЙХГҮЙ ✗');
  assert.match(src, /const \[allBlocksOpen, setAllBlocksOpen\] = useState\(null\)/,
    '«Бүгдийг» төлөв (`allBlocksOpen`) БАЙХГҮЙ ✗');
});

t('🗂 (18) HomeClient: 🛏/💳 · 🔀 afterPayment · 💼 чип блокууд `collapsible` тугтай (тоо нь либээс)', () => {
  const src = readFileSync(new URL('../components/HomeClient.jsx', import.meta.url), 'utf8');
  // 🛏 «Өрөөний тоо» ба 💳 «Төлбөрийн нөхцөл» — тусдаа блок (хатуу тоо БАЙХГҮЙ ✓)
  assert.match(src, /label="Өрөөний тоо"\s*\n\s*collapseKey="rooms"\s*\n\s*collapsible/,
    '🛏 блок `collapsible` биш ✗');
  assert.match(src, /blockOpen\('rooms', ROOM_OPTIONS\.length, filters\.rooms\.length\)/,
    '🛏 блокын босго нь либээс уншигдахгүй ✗');
  assert.match(src, /label="Төлбөрийн нөхцөл"\s*\n\s*collapseKey="payments"\s*\n\s*collapsible/,
    '💳 блок `collapsible` биш ✗');
  assert.match(src, /blockOpen\('payments', PAYMENT_OPTIONS\.length, countPayments\(filters\.payments\)\)/,
    '💳 блокын босго нь либээс уншигдахгүй ✗');
  // 🔀 afterPayment (🚗 🎨/⛽/⚙️) — `attrChipsBlock` нь хураагддаг SideBlock дотор ✓
  assert.match(src, /collapseKey=\{f\.key\}[\s\S]{0,120}?collapsible[\s\S]{0,400}?attrChipsBlock\(f\)/,
    '🔀 afterPayment блок `collapsible` биш ✗');
  // 💼 үндсэн attr жагсаалт — ЗӨВХӨН чип талбар (`<select>`/текст нь хэвээр ✓)
  assert.match(src, /collapsible=\{!!f\.chips\}/, 'чип бус талбар ч хураагддаг болов ✗');
  assert.match(src, /open=\{!f\.chips \|\| blockOpen\(f\.key, chipOptions, chipActive\)\}/,
    'чип бус талбар нээлттэй байх дүрэм алга ✗');
});

/**
 * 🆕 2026-10-06 (16): PILL-ИЙН HOVER — «ОДООГИЙХООСОО ИЛҮҮ БАРААН» болов
 *
 * ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Ажлын зарын болон бусад хэсэг байгаа Ажлын цаг,
 *   Туршлага, Мэргэжлийн түвшин гэх Мэт button дээр mouse дээр cursor
 *   аваачхад одоогийхоосоо илүү бараан өнгөтэй болдог болго».
 *
 *  ① Сонгоогүй pill (`bg-white`): ⏳ `hover:bg-gray-50` (#FAF8F5) нь цагаан/
 *     крем дэвсгэр дээр БАРАГ мэдэгддэггүй байв ✗ ⇒ 🆕 `hover:bg-gray-200`
 *     (#E9E4D9) + `hover:border-gray-400` + `hover:text-gray-900` ✓
 *  ② Идэвхтэй pill (`bg-primary-light`): ⏳ hover-д ОГТ өөрчлөгддөггүй байв ✗
 *     ⇒ 🆕 `hover:bg-primary/25` + `hover:border-primary-dark` +
 *     `hover:text-primary-dark` (⚠️ текст нь AA-д хүрэхийн тулд `primary-dark`)
 *  ⚠️ `FilterPill` нь НЭГ компонент ⇒ 🚗/💼/💻/✅ БҮХ pill (18 талбар) ХАМТ
 *     өөрчлөгдөнө — 2 өөр UI үүсэхгүй ✓
 *  ⚠️ ЗӨВХӨН ХАРАГДАЦ: утга/URL/DB/`data-filter-pill`/`data-filter-panel`,
 *     `.chip-toggle` (панель доторх чип) БҮГД ХӨНДӨГДӨӨГҮЙ ✓
 *  ℹ️ БОДИТ Chrome дээрх хэмжилт: `scripts/cdp-job-chips.mjs` (§⑥c — 💼:
 *     📈 `jobLevel` сонгоогүй ба 📊 `experience` идэвхтэй pill) ба
 *     `scripts/cdp-notebook-specs.mjs` (§⑧b — 💻, «бусад хэсэг») ✓
 */
t('🎛 FilterPill hover: сонгоогүй → `bg-gray-200`, идэвхтэй → `bg-primary/25` (бараан ✓)', () => {
  const src = readFileSync(new URL('../components/HomeClient.jsx', import.meta.url), 'utf8');
  const at = src.indexOf('function FilterPill(');
  assert.ok(at > 0, '`FilterPill` функц олдсонгүй ✗');
  /** ⚠️ Зөвхөн `FilterPill`-ийн БИЕ (дараагийн top-level функц хүртэл) */
  const rest = src.slice(at);
  const end = rest.indexOf('\nfunction ');
  const pill = end > 0 ? rest.slice(0, end) : rest;
  // ① Сонгоогүй pill — БАРААН фон + хүрээ + текст
  assert.match(pill, /hover:border-gray-400 hover:bg-gray-200 hover:text-gray-900/,
    'сонгоогүй pill-ийн hover нь бараан биш ✗');
  // ② Идэвхтэй pill — бараан цэнхэр дэвсгэр (⏳ огт өөрчлөгддөггүй байв)
  assert.match(pill, /hover:border-primary-dark hover:bg-primary\/25 hover:text-primary-dark/,
    'идэвхтэй pill-ийн hover нь бараан биш ✗');
  // ⏳ ХУУЧИН бүдэг hover (цагаан дээр бараг үл харагдах) БУЦАЖ ОРОХГҮЙ
  assert.ok(!/hover:bg-gray-50/.test(pill), 'pill-ийн hover буцаж БҮДЭГ болов ✗');
  assert.ok(!/hover:border-gray-300/.test(pill), 'pill-ийн hover хүрээ буцаж БҮДЭГ болов ✗');
  // ③ Дэгээ/панель ХЭВЭЭР — утга/URL/DB/CDP хөндөгдөхгүй ✓
  assert.match(pill, /data-filter-pill=\{testKey\}/);
  assert.match(pill, /data-filter-panel=\{testKey\}/);
  // ④ ⌄ панель нь `children`-ээ рендэрлэнэ (дотор нь `.chip-toggle` чипүүд —
  //    тэдгээрийн HOVER (primary текст) энэ өөрчлөлтөд ХӨНДӨГДӨӨГҮЙ ✓)
  assert.match(pill, /\{children\}/);
  assert.match(src, /chip-toggle \$\{on \? 'chip-toggle-active' : ''\}/,
    'панель доторх чипүүдийн класс өөрчлөгдсөн (хөндөгдөх ЁСТОЙ БАЙГАА ✗)');
});


// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Notebook ээс бусад хайлтын хэсэгт Брэнд гэж
// баймааргүй байна даа» ⇒ 🏷️ «Брэнд» нь `filterSubtypes: PC_SPEC_SUBTYPES` тугтай
// болж, SIDEBAR (хайлт)-д ЗӨВХӨН Notebook-ийн гэр бүлд гарна ✓
// 🆕 2026-10-05 (56) — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «notebook ээс бусад хэсэгт Брэнд
// Загвар гэсэн утга оруулахгүй» ⇒ ФОРМ Ч МӨН хязгаарлагдав (`onlySubtypes`
// нэмэгдэв — iPad/принтер/Mouse/чихэвч дээр 🏷️ Брэнд + 🖥️ Загвар бичих
// боломж ОДОО БАЙХГҮЙ ✓). ⚠️ Картын мөр ХӨНДӨГДӨӨГҮЙ (доорх ④ ✓)
t('🏷️ 💻 «Брэнд» — ХАЙЛТ + ФОРМ ХОЁУЛАНД Notebook-ийн гэр бүлд л (2026-10-05 (56))', () => {
  const brand = getAttrField('computers', 'brand');
  // ① Талбар нь ХОЁР тугтай (форм + sidebar — ИЖИЛ жагсаалт ✓)
  assert.deepEqual(brand.filterSubtypes, PC_SPEC_SUBTYPES);
  assert.deepEqual(brand.onlySubtypes, PC_SPEC_SUBTYPES);
  assert.equal(brand.searchable, true, 'хайлттай combobox хэвээр байх ёстой ✗');
  // ⚠️ «Загвар» нь шүүлт БИШ (текст) — зөвхөн `onlySubtypes` тугтай ✓
  const model = getAttrField('computers', 'model');
  assert.deepEqual(model.onlySubtypes, PC_SPEC_SUBTYPES);
  assert.equal(model.type, 'text');
  // ② Хайлт (sidebar): зөвхөн Notebook-ийн гэр бүлд
  for (const sub of PC_SPEC_SUBTYPES) {
    assert.ok(getAttrFilters('computers', sub).some((f) => f.key === 'brand'), `«${sub}»: Брэнд алга ✗`);
  }
  for (const sub of ['', 'Mouse', 'Keyboard', 'Дэлгэц', 'Иж бүрэн компьютер', 'Процессор, сервер',
    'iPad, Tablet, Kindle',
    'Принтер, Хувилагч, Сканнер, Ламинатор', 'Принтер, Хувилагчийн хор',
    'PS, XBox, Nintendo тоглоом суулгана', 'Чихэвч', 'Бусад сэлбэг']) {
    assert.ok(!getAttrFilters('computers', sub).some((f) => f.key === 'brand'),
      `«${sub || '(хоосон)'}»: ХАЙЛТАД Брэнд гарч байна ✗`);
  }
  // ③ Форм: МӨН зөвхөн Notebook-ийн гэр бүлд (🆕 (56) — ⏳ өмнө БҮХ дэд төрөлд)
  //    🆕 2026-10-07 (52): «Иж бүрэн компьютер» ч холдуу болов (зөвхөн ✅)
  for (const sub of ['', 'Mouse', 'iPad, Tablet, Kindle', 'Дэлгэц', 'Иж бүрэн компьютер', 'Процессор, сервер', 'Принтер, Хувилагчийн хор']) {
    assert.ok(!getAttrFields('computers', sub).some((f) => f.key === 'brand'),
      `«${sub || '(хоосон)'}»: формоос Брэнд ХАСАГДААГҮЙ ✗`);
    assert.ok(!getAttrFields('computers', sub).some((f) => f.key === 'model'),
      `«${sub || '(хоосон)'}»: формоос Загвар ХАСАГДААГҮЙ ✗`);
  }
  for (const sub of ['Notebook']) {
    const keys = getAttrFields('computers', sub).map((f) => f.key);
    assert.ok(keys.includes('brand') && keys.includes('model'),
      `«${sub}»: формоос Брэнд/Загвар алга болсон ✗`);
  }
  // ④ `getAttrField` (картын мөр) ХӨНДӨГДӨӨГҮЙ — `onlySubtypes`-ыг ХАРДАГГҮЙ
  //    тул хуучин заруудын «Apple MacBook Pro 14» картын мөр хэвээр ✓
  assert.equal(getAttrField('computers', 'brand').label, 'Брэнд');
  assert.equal(
    formatAttrsLine('computers', { brand: 'Apple', model: 'MacBook Pro 14', condition: 'Шинэ' }),
    'Apple MacBook Pro 14 · ✅ Шинэ');
  // ⑤ Зөвхөн 💻-ийн `brand` нь `filterSubtypes`-тай — бусад 12 хэсэгт БАЙХГҮЙ
  const flagged = SECTIONS.flatMap((s) => (s.attrFields || [])
    .filter((f) => f.filterSubtypes).map((f) => `${s.value}.${f.key}`));
  assert.deepEqual(flagged, ['computers.brand']);
  // ⑥ Бусад 12 хэсгийн шүүлт ХӨНДӨГДӨӨГҮЙ (ж: 🚗 авто «Үйлдвэрлэгч» шүүлт хэвээр ✓)
  for (const s of SECTIONS) {
    if (s.value === 'computers') continue;
    assert.deepEqual(getAttrFilters(s.value).map((f) => f.key),
      getAttrFilters(s.value, getSubtypes(s.value)[0] || '').map((f) => f.key), s.value);
  }
  assert.equal(getAttrFilters('auto').length, 7);
});

t('🖥 Бусад 10 хэсгийн шүүлт ХӨНДӨГДӨӨГҮЙ (subtype дамжуулсан ч ЯГ ижил)', () => {
  for (const s of SECTIONS) {
    // ⚠️ 💻 (`onlySubtypes`/`filterSubtypes`) ба 🆕 2026-10-08 (71) 🛋️ (`sofaBed`
    //    нь ЗӨВХӨН «Буйдан, кресло»-д) — эдгээр нь ДЭД ТӨРЛӨӨС хамаардаг тул
    //    тусдаа шалгалттай (дээрх 💻 тестүүд ба §⑧г ✓)
    if (s.value === 'computers' || s.value === 'furniture') continue;
    const sub = getSubtypes(s.value)[0] || '';
    assert.deepEqual(getAttrFilters(s.value, sub).map((f) => f.key),
      getAttrFilters(s.value).map((f) => f.key),
      `${s.value}: дэд төрөл дамжуулахад шүүлт өөрчлөгдөж байна ✗`);
    assert.ok(!(s.attrFields || []).some((f) => Array.isArray(f.onlySubtypes)), `${s.value}`);
  }
  // 🆕 2026-10-08 (71): 🛋️ — шүүлт нь ДЭД ТӨРЛӨӨС хамаарна (зөвхөн «Буйдан, кресло»)
  assert.deepEqual(getAttrFilters('furniture', 'Буйдан, кресло').map((f) => f.key), ['condition', 'sofaBed']);
  assert.deepEqual(getAttrFilters('furniture', 'Зочны өрөөний').map((f) => f.key), ['condition']);
});

t('🖥 ГЭРЭЭ: HomeClient нь дэд төрлийг дамжуулна + хүчингүй attr цэвэрлэнэ + `data-attr-filter` дэгээтэй', () => {
  const home = readFileSync(new URL('../components/HomeClient.jsx', import.meta.url), 'utf8');
  // ① Sidebar нь СОНГОСОН дэд төрлийг дамжуулна (эс бөгөөс шүүлт огт гарахгүй ✗)
  assert.ok(/getAttrFilters\(section, filters\.propertyType\)/.test(home),
    'sidebar нь дэд төрлийг `getAttrFilters`-д ДАМЖУУЛАХГҮЙ ✗');
  // ② Хоёр замд цэвэрлэнэ: ① линкээр орох (`secParam`) ② дэд төрөл солих (`v`)
  assert.ok(/pruneGatedAttrs\(secParam, next\.propertyType, attrs\)/.test(home),
    'линкээр орох үед хүчингүй attr цэвэрлэгдэхгүй байна ✗');
  assert.ok(/pruneGatedAttrs\(section, v, f\.attrs \|\| \{\}\)/.test(home),
    'дэд төрөл солих үед хуучин attr цэвэрлэгдэхгүй байна ✗');
  // ③ CDP-ийн тогтвортой дэгээ (`data-room-filter`/`data-payment-value`-тэй ижил)
  assert.ok(/data-attr-filter=\{f\.key\}/.test(home), 'CDP дэгээ (`data-attr-filter`) алга ✗');
});

t('🖥 pruneGatedAttrs: Notebook-ийн ⚙️ CPU нь Mouse сонгоход ЦЭВЭРЛЭГДЭНЭ (үл үзэгдэх шүүлт үлдэхгүй)', () => {
  const attrs = { brand: 'Apple', cpu: 'Intel Core i5', ram: '16 GB' };
  // ⚠️ Mouse дээр 5 шүүлт ХАРАГДАХГҮЙ (4 үзүүлэлт + 🏷️ Брэнд) ⇒ утга нь
  //    URL/DB-д ҮЛДЭХ ЁСГҮЙ ✗ (🏷️ 2026-10-03 (20): `filterSubtypes` — brand ч мөн)
  assert.deepEqual(pruneGatedAttrs('computers', 'Mouse', attrs), {});
  // ⚠️ Notebook брэнд дээр шүүлт ХАРАГДАНА ⇒ хөндөгдөхгүй (ИЖИЛ объект ✓)
  assert.equal(pruneGatedAttrs('computers', 'Notebook', attrs), attrs);
  // ⚠️ Дэд төрөл СОНГООГҮЙ (`''`) үед ч 5 шүүлт харагдахгүй ⇒ хасагдана
  //    (🏷️ 2026-10-03 (20): `filterSubtypes` — brand ч мөн ✓)
  assert.deepEqual(pruneGatedAttrs('computers', '', attrs), {});
});

t('🖥 pruneGatedAttrs: хүрээний түлхүүр, формойн `model`, бусад 11 хэсэг ХӨНДӨГДӨХГҮЙ + КРАШГҮЙ', () => {
  const auto = { brand: 'Toyota', model: 'Prius 30', year_from: '2015', year_to: '2020' };
  assert.equal(pruneGatedAttrs('auto', 'Суудлын машин', auto), auto);
  // ⚠️ 11 хэсэгт `onlySubtypes`/`filterSubtypes` БАЙХГҮЙ ⇒ ямар ч түлхүүр
  //    хасагдахгүй ✓; 💻 `computers` дээр гэр бүлийн дэд төрлөөр (ж: Apple)
  //    шалгана — 🆕 2026-10-07 (52): эхний «Иж бүрэн компьютер» ч холдуу болов
  //    («Дэлгэц»-тэй ЯГ ИЖИЛ) тул тэнд brand ХАСАГДАНА ✓
  SECTIONS.forEach((s) => {
    const a = { brand: 'x', model: 'y', year_from: '2015' };
    const sub = s.value === 'computers' ? 'Notebook' : (getSubtypes(s.value)[0] || '');
    assert.equal(pruneGatedAttrs(s.value, sub, a), a, s.value);
  });
  // ⚠️ Хоосон/эвдэрсэн утга дээр КРАШГҮЙ (null/массив → хэвээр)
  assert.equal(pruneGatedAttrs('computers', 'Mouse', null), null);
  assert.deepEqual(pruneGatedAttrs('computers', 'Mouse', {}), {});
  assert.deepEqual(pruneGatedAttrs('computers', 'Mouse', ['x']), ['x']);
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

t('💻 ГЭРЭЭ: форм (`AddListingClient` — `/listings/new`) + seed нь нэг эх сурвалжийг барина', () => {
  // ⚠️ 2026-10-01: модал (`AddListingModal.jsx`) БҮРЭН ХАСАГДАЖ, тусдаа хуудас
  //    (`app/listings/new` → `components/AddListingClient.jsx`) болов — тест нь
  //    ШИНЭ файлыг уншина ✓ (гэрээ/assert-ууд нь ХӨНДӨГДӨӨГҮЙ ✓)
  const modal = readFileSync(new URL('../components/AddListingClient.jsx', import.meta.url), 'utf8');
  // ① Форм нь ЗӨВХӨН `getAttrFields(section, subtype)`-ээр талбараа сонгоно
  assert.ok(/getAttrFields\(form\.section \|\| 'real-estate', form\.propertyType\)/.test(modal),
    'форм `getAttrFields`-ийг дэд төрөлтэй дуудах ёстой ✗');
  // ② ⚠️ Жагсаалтад БАЙХГҮЙ хуучин утга нь `<select>`-д алга болохгүй
  assert.ok(/const legacy = f\.type === 'select'/.test(modal));
  assert.ok(/\{legacy && <option value=\{legacy\}>/.test(modal));

  const seed = readFileSync(new URL('./seed-sections.mjs', import.meta.url), 'utf8');
  // ③ Seed нь формтой ЯГ ИЖИЛ дэд төрлийн жагсаалт + option-уудыг ашиглана
  assert.ok(/const PC_SPEC = new Set\(PC_SPEC_SUBTYPES\)/.test(seed));
  // 🗑 2026-10-07 (57): `NOTEBOOK_BRANDS` ХАСАГДАВ ⇒ seed-ийн КОД ч ашиглахгүй ✓
  assert.ok(!/new Set\(NOTEBOOK_BRANDS\)/.test(seed), 'seed `NOTEBOOK_BRANDS`-ыг ашигласаар байна ✗');
  assert.ok(/'Notebook':\s*\[/.test(seed), 'seed-д `PC_SUBTYPE_PAIRS[Notebook]` БАЙХГҮЙ ✗');
  // ④ Demo pool нь форм дээрх сонголтод байхгүй бол seed ЗОГСОНО (fail-fast ✓)
  assert.ok(/форм дээрх сонголтод БАЙХГҮЙ демо утга/.test(seed));
  assert.ok(/NOTEBOOK_SCREEN_OPTIONS, NOTEBOOK_CPU_OPTIONS, NOTEBOOK_RAM_OPTIONS, NOTEBOOK_STORAGE_OPTIONS/.test(seed));
});

t('🛠 services: 10 бүлэг, бүгд ШУУД нээлттэй (`collapsed` туг БАЙХГҮЙ)', () => {
  // ⚠️ Regress-ийн хамгаалалт: 2026-09-29-ний хүсэлтээр services дээр бүх бүлэг
  //    шууд нээлттэй байх ёстой — компьютерийн accordion тэнд ХҮРЭХГҮЙ ✓
  const groups = getSubtypeGroups('services');
  // ✏️ 2026-10-05 (44): 7 → **8** бүлэг («Эмнэлэг» нэмэгдэв); 28 → **32** дэд
  //    төрөл («Гагнуурын үйлчилгээ» + «Эмнэлэг»-ийн 3 нь) — доорх гэрээнүүд
  //    (`getSubtypes`-д leaf бүр байх, бүлэг нь өөрөө хадгалагдахгүй) ХЭВЭЭР ✓
  // ✏️ 2026-10-06 (11): 1 дэх групп «Боловсрол & Сургалт» → **«Сургалт, курс»**
  //    бөгөөд 21 мэргэжлийн курс + хуучин 2 нэр ⇒ **23** item (32 → **52** дэд
  //    төрөл). ⚠️ Бүлгийн ТОО 8 ХЭВЭЭР (шинэ бүлэг НЭМЭГДЭЭГҮЙ) ✓
  assert.equal(groups.length, 10);
  assert.equal(groups.filter((g) => g.collapsed).length, 0);
  // 🆕 2026-10-06 (11) — 1 дэх групп: нэр + item-үүд ЯГ (хэрэглэгчийн дараалал)
  assert.equal(groups[0].label, 'Сургалт, курс');
  assert.deepEqual(groups[0].items, [
    'Гадаад хэл', 'IT Программ хангамж', 'Ерөнхий боловсрол',
    'Хүнд машин механизм', 'Сантехник, цахилгаанчин',
    'Гар утас, электроник засвар', 'Мужаан', 'Гагнуурчин', 'Авто засвар',
    'Нягтлан бодох', 'Оффисын ажилчдын сургалт', 'Тайлан ба төсөл',
    'ХАБЭА', 'Тогооч', 'Зөөгч, бармен', 'Худалдагч, касс, нярав',
    'Үсчин, гоо сайхан', 'Жолоо', 'Оёдол', 'Спорт', 'Хөгжмийн зэмсэг',
    // ⚠️ «Бусад» нь ХАМГИЙН СҮҮЛД (бусад БҮХ жагсаалтын адил ✓)
    'Бусад',
  ]);
  assert.equal(groups[0].items.length, 22);
  assert.equal(groups[0].items[groups[0].items.length - 1], 'Бусад');
  // 🆕 2026-10-06 (12) · ✏️ 2026-10-07 (63) — ХУРААНГУЙ (хэрэглэгчийн хүсэлт:
  //    «…хураангуй харуулдаг болгоё, эхний 5-ыг харуулаад цааш харахыг хүсвэл
  //    Илүү гэж дар» + «Барилга & Зам засварыг Сургалт, курс шиг хураагуй
  //    харагдуул»): `showFirst: 5` туг нь ЯГ 2 бүлэгт — «Сургалт, курс» (22)
  //    ба «Барилга & Зам» (14); бусад бүлэг (цөөнтэй) урьдны адил БҮТНЭЭРЭЭ
  //    харагдана ✓
  assert.equal(groups[0].showFirst, 5,
    '«Сургалт, курс»-д `showFirst: 5` туг алга (эсвэл өөр утгатай) ✗');
  assert.ok(groups[0].items.length > groups[0].showFirst,
    '`showFirst` нь items-ээс бага байх ЁСТОЙ (эс бөгөөс хураах шаардлагагүй) ✗');
  // 🆕 2026-10-07 (63) — 2 дахь «Барилга & Зам» (14) бүлэгт мөн `showFirst: 5`
  assert.equal(groups[1].showFirst, 5,
    '«Барилга & Зам»-д `showFirst: 5` туг алга (эсвэл өөр утгатай) ✗');
  assert.ok(groups[1].items.length > groups[1].showFirst,
    '`showFirst` нь items-ээс бага байх ЁСТОЙ (эс бөгөөс хураах шаардлагагүй) ✗');
  assert.deepEqual(
    groups.filter((g) => g.showFirst > 0).map((g) => g.label),
    ['Сургалт, курс', 'Барилга & Зам'],
    '`showFirst` тугтай бүлэг ЯГ 2 байх ЁСТОЙ (бусад нь бүтэн харагдана) ✗');
  // ⚠️ Туггүй бүлэгт `0` (хязгааргүй) — `getSubtypeGroups` үүнийг ЗААВАЛ
  //    дамжуулах ЁСТОЙ (эс бөгөөс UI нь `undefined > 0` → false, туг алга болно)
  groups.slice(2).forEach((g) => assert.equal(g.showFirst, 0,
    `${g.label}: туггүй бүлэгт \`showFirst\` 0 байх ЁСТОЙ ✗`));
  // ⚠️ Байрлал: шинэ «Эмнэлэг» бүлэг нь ХАМГИЙН СҮҮЛД — хуучин 7 бүлгийн
  //    дараалал ХӨНДӨГДӨӨГҮЙ (индексээр ажилладаг код эвдрэхээс сэргийлэв ✓)
  // бүтэц ДАХИН зохион байгуулагдав (2026-10-07 (61)): 10 бүлэг, 81 дэд төрөл
  assert.deepEqual(groups.map((g) => g.label), [
    'Сургалт, курс', 'Барилга & Зам', 'Өрх гэр & Ахуйн үйлчилгээ', 'Тавилга',
    'Аялал жуулчлал & Ресторан', 'Эмнэлэг & Эрүүл мэнд', 'IT, Технологи & Медиа',
    'Цахилгаан бараа засвар', 'Бизнес, Санхүү & Хууль', 'Бусад үйлчилгээ',
  ]);
  assert.deepEqual(groups.map((g) => g.items.length), [22, 14, 7, 3, 6, 6, 3, 7, 7, 8]);
  ['Барилга & Засвар үйлчилгээ', 'Аялал, Амралт & Гоо сайхан',
    'Технологи & Авто засвар', 'Хэвлэл, реклам, медиа', 'Эмнэлэг',
  ].forEach((l) => assert.ok(!groups.some((g) => g.label === l), `хуучин бүлэг «${l}» үлдсэн ✗`));
  assert.equal(groups[groups.length - 1].label, 'Бусад үйлчилгээ');
  // Групп 2 — «Барилга & Зам» (14; хуучин «Барилга & Засвар үйлчилгээ» 6)
  assert.deepEqual(groups[1].items, [
    'Зураг төсөл', 'Барилгын хяналт & Төсөв', 'Барилгын дотоод засал',
    'Гагнуур', 'Сантехник', 'Мужаан', 'Суурь, карказ, өрлөг',
    'Дээвэр, пасад, дулаалга', 'Сантехник, халаалт, цэвэр/бохир ус',
    'Цахилгаан, холбоо дохиолол, камер', 'Вакуум цонх', 'Хаалга',
    'Зам барилгын ажил гүйцэтгэх', 'Хүнд машин механизм, уул уурхай',
  ]);
  assert.deepEqual(groups[groups.length - 1].items, [
    'Үсчин, гоо сайхан', 'Авто угаалга', 'Авто засвар', 'Фитнесс',
    'Массаж', 'Нотариат', 'Карго', 'Орчуулга',
  ]);
  // ⚠️ «Гагнуурын үйлчилгээ» нь «Барилга & Засвар үйлчилгээ» бүлгийн LEAF
  //    (шинэ бүлэг БИШ) — 5 → 6 item, хуучин 5 нь ХӨНДӨӨГДӨӨГҮЙ ✓
  const build = groups.find((g) => g.label === 'Барилга & Зам');
  assert.equal(build.items.length, 14);
  assert.ok(build.items.includes('Гагнуур'));
  // ✏️ 2026-10-07 (58) — «Бизнес, Санхүү & Хууль» бүлэг **5 → 7** дэд төрөл
  //    (хэрэглэгчийн хүсэлт: «…дараах байдлаар оруул»). ⚠️ Бүлгийн БАЙРЛАЛ
  //    ХӨНДӨӨГДӨӨГҮЙ (индекс 6) — зөвхөн item солигдов ✓
  assert.equal(groups[8].label, 'Бизнес, Санхүү & Хууль');
  assert.deepEqual(groups[8].items, [
    'Компани ба бэлэн бизнес зарна', 'Хөрөнгө зуучлал', 'Үнэлгээ',
    'Зээл, Санхүү', 'Өмгөөлөл', 'Тайлан', 'Харуул хамгаалалт',
  ]);
  // ✏️ 2026-10-07 (60) — «Өрх гэр & Ахуйн үйлчилгээ» бүлэг **6 → 7** дэд
  //    төрөл (хэрэглэгчийн хүсэлт: «Нүүлгэлт ба тээвэр ийг Нүүлгэлт , Хүргэлт
  //    гэж 2 үйлчилгээ болго») ⇒ «Нүүлгэлт ба тээвэр» нь 2 болж САЛСАВ.
  //    ⚠️ Бүлгийн БАЙРЛАЛ ХӨНДӨӨГДӨӨГҮЙ (индекс 2) — зөвхөн item солигдов ✓
  const household = groups.find((g) => g.label === 'Өрх гэр & Ахуйн үйлчилгээ');
  assert.equal(household.items.length, 7);
  assert.ok(household.items.includes('Нүүлгэлт'), '«Нүүлгэлт» алга ✗');
  assert.ok(household.items.includes('Хүргэлт'), '«Хүргэлт» алга ✗');
  assert.ok(!household.items.includes('Нүүлгэлт ба тээвэр'),
    'хуучин «Нүүлгэлт ба тээвэр» бүлэгт БАЙХ ЁСТОЙГҮЙ ✗');
  // ⚠️ Шинэ 4 leaf нь `getSubtypes`-д ЗААВАЛ байх ёстой (форм/шүүлт/тоо/
  //    breadcrumb бүгд `getSubtypes`-ээр ажиллана) ✓
  const subtypes = getSubtypes('services');
  [
    'Гагнуур', 'Зураг төсөл', 'Зам барилгын ажил гүйцэтгэх', 'Тавилга үйлдвэрлэл',
    'Ресторан', 'Катеринг', 'Хоол хүргэлт', 'Гоо сайхны эмнэлэг',
    'Арьс харшилын эмнэлэг', 'Бусад эмнэлэг', 'Хэвлэл', 'Реклам, Медиа',
    'ТВ засвар', 'Хөргөгч засвар', 'Зээл, Санхүү', 'Өмгөөлөл', 'Тайлан',
    'Авто угаалга', 'Фитнесс', 'Массаж', 'Карго',
  ].forEach((s) => assert.ok(subtypes.includes(s), `${s} дэд төрөлд алга ✗`));
  assert.equal(subtypes.length, 79);
  assert.equal(new Set(subtypes).size, 79, 'services дэд төрөлд ДАВХАРДАЛ байна ✗');
  // ✏️ 2026-10-07 (62): «Сургалт, курс» бүлгийн ШИНЭ 22 дэд төрөл БҮГД
  //    `getSubtypes`-д байх ЁСТОЙ (форм/шүүлт/тоо/breadcrumb бүгд ажиллана ✓)
  [
    'Гадаад хэл', 'IT Программ хангамж', 'Ерөнхий боловсрол',
    'Хүнд машин механизм', 'Сантехник, цахилгаанчин',
    'Гар утас, электроник засвар', 'Мужаан', 'Гагнуурчин', 'Авто засвар',
    'Нягтлан бодох', 'Оффисын ажилчдын сургалт', 'Тайлан ба төсөл',
    'ХАБЭА', 'Тогооч', 'Зөөгч, бармен', 'Худалдагч, касс, нярав',
    'Үсчин, гоо сайхан', 'Жолоо', 'Оёдол', 'Спорт', 'Хөгжмийн зэмсэг',
    'Бусад',
  ].forEach((s) => assert.ok(subtypes.includes(s), `🆕 «${s}» дэд төрөлд алга ✗`));
  // ✏️ 2026-10-07 (62): модноос ГАРСАН 4 хуучин нэр `getSubtypes`-д БАЙХГҮЙ
  //    байх ЁСТОЙ (тэднийг `0037` migration шинэ утга руу шилжүүлнэ ✓)
  ['Компьютер ба интернэт', 'Мужаан, гагнуурчин', 'Тоо, ерөнхий боловсрол',
    'Барилга, засал чимэглэл']
    .forEach((s) => assert.ok(!subtypes.includes(s), `хуучин «${s}» үлдсэн ✗`));
  // ✏️ 2026-10-07 (58): «Бизнес, Санхүү & Хууль»-ийн ШИНЭ нэрс `getSubtypes`-д
  //    байх ЁСТОЙ, ХУУЧИН 2 нь ГАДУУР байх ЁСТОЙ (мөр UPDATE-ыг `0034` хийнэ ✓)
  ['Хөрөнгө зуучлал', 'Үнэлгээ', 'Нотариат', 'Өмгөөлөл', 'Зээл, Санхүү', 'Тайлан']
    .forEach((s) => assert.ok(subtypes.includes(s), `🆕 «${s}» дэд төрөлд алга ✗`));
  ['Хөрөнгө зуучлал ба үнэлгээ', 'Хууль ба эрх зүй', 'Мөнгө санхүү ба зээл',
    'Өмгөөлөгч', 'Гагнуурын үйлчилгээ', 'Хоол захиалга', 'Хэвлэл, реклам, медиа',
    'Барилгын бүх ажил', 'Тавилга ба мужаан', 'Үсчин гоо сайхан',
    'Авто засвар үйлчилгээ', 'Уул уурхай']
    .forEach((s) => assert.ok(!subtypes.includes(s), `хуучин «${s}» үлдсэн ✗`));
  // ⚠️ ХУУЧИН «Сургалт ба курс» нь дэд төрөл БАЙХАА БОЛОВ (модноос ГАДУУР) —
  //    тэр нэрээр хадгалагдсан заруудыг `0030` migration «Бусад» болгоно ✓
  assert.ok(!subtypes.includes('Сургалт ба курс'), '«Сургалт ба курс» үлдсэн ✗');
  // ⚠️ Бүлгийн НЭР нь `property_type` БИШ ⇒ `getSubtypes`-д ОРОХГҮЙ ✓
  //    (тиймээс «Эмнэлэг»/«Сургалт, курс» гэсэн зар DB-д ХЭЗЭЭ Ч хадгалагдахгүй)
  assert.ok(!subtypes.includes('Эмнэлэг'));
  assert.ok(!subtypes.includes('Сургалт, курс'));
  assert.ok(!subtypes.includes('Боловсрол & Сургалт'));
});

t('🛠 services: 🧭 workMode/💵 priceUnit + 🆕 2026-10-06 (5)-ийн 4 талбар (Нэр/компани · Хамрах хүрээ · Туршлага · Ажиллах цаг) БҮГД ХАСАГДАВ', () => {
  // 🗑 ① 2026-10-05 (45) (хэрэглэгчийн хүсэлт: «Үйлчилгээний хэлбэр, Үнийн
  //    хэлбэр гэдэг талбаруудыг Үйлчилгээ хэсгээс хасна уу, Дахин ашиглахгүй»)
  // 🗑 ② 2026-10-06 (5) (хэрэглэгчийн хүсэлт: «Нэр / компани, Хамрах хүрээ,
  //    Туршлага, Ажиллах цаг -ийг Ажил, Үйлчилгээ цэснээс байхгүй болго.
  //    Цаашид хэрэглэхгүй»)
  const GONE = ['workMode', 'priceUnit', 'company', 'coverage', 'experience', 'availability'];
  // ① ФОРМ · SIDEBAR: 6 талбар БҮГД `attrFields`/`attrFilters`-д БАЙХГҮЙ
  GONE.forEach((k) => {
    assert.equal(getAttrField('services', k), null, `${k} форм дээр БАЙСААР байна ✗`);
    assert.equal(getAttrFilters('services').some((f) => f.key === k), false, `${k} шүүлтэд БАЙСААР ✗`);
  });
  // ② ФОРМ: 6 → 4 (45) → **0** (2026-10-06 (5), 4 → 0) талбар
  assert.deepEqual(getAttrFields('services').map((f) => f.key), []);
  assert.equal(getAttrFields('services').length, 0, 'Ажил, Үйлчилгээний формд талбар БАЙСААР ✗');
  // ③ SIDEBAR: 3 → 1 (45) → **0** (2026-10-06 (5)) шүүлт — `real-estate`-ийн ЯГ ИЖИЛ
  assert.deepEqual(getAttrFilters('services'), []);
  assert.equal(getAttrFilters('services').length, 0, 'Ажил, Үйлчилгээний шүүлт БАЙСААР ✗');
  // ④ КАРТЫН МӨР: ХУУЧИН/demo зарын `attrs`-д бүх утга байсан ч мөр **ХООСОН** ✓
  //    (⚠️ `company` нь картын мөрийн ТОЛГОЙ байсан — ⚽ `hobby`-той ижил
  //     «тодорхойлолтгүй хэсэг» болсон тул `formatAttrsLine` `''` буцаана ✓)
  assert.equal(
    formatAttrsLine('services', {
      company: 'Гэр засвар', workMode: 'Онлайн', priceUnit: 'Цагийн',
      coverage: 'Улаанбаатар, бүх дүүрэг', experience: '5 жил', availability: 'Ажлын өдөр',
    }),
    '',
  );
  assert.equal(formatAttrsLine('services', { company: 'Гэр засвар' }), '');
  // ⑤ «Зарын дэлгэрэнгүй» ХҮСНЭГТ (`getAttrRows`): мөр БҮРЭН ХООСОН ✓
  assert.deepEqual(
    getAttrRows('services', { company: 'Гэр засвар', workMode: 'Онлайн', priceUnit: 'Сард' }),
    [],
  );
  // ⑥ 💼 Ажлын зарын ТУСДАА талбарууд ХӨНДӨГДӨӨГҮЙ (нэр нь ижил ч ТУСДАА хэсэг ✓)
  ['jobType', 'experience', 'advertiser', 'jobLevel', 'salaryType'].forEach((k) => {
    assert.ok(getAttrField('jobs', k), `jobs.${k} ХАСАГДСАН ✗ (зөвхөн services-ийг хөндөх ёстой)`);
  });
  assert.deepEqual(getAttrFilters('jobs').map((f) => f.key), ['jobType', 'experience', 'jobLevel']);
  // ⑦ DEMO SEED ч үүсгэхгүй (дахин ашиглахгүй ✓)
  const seed = readFileSync(new URL('./seed-sections.mjs', import.meta.url), 'utf8');
  assert.ok(!/workMode: pick\(/.test(seed), 'seed нь `workMode` үүсгэсээр байна ✗');
  assert.ok(!/priceUnit: pick\(/.test(seed), 'seed нь `priceUnit` үүсгэсээр байна ✗');
  ['company', 'coverage', 'experience', 'availability'].forEach((k) => {
    assert.ok(!new RegExp(`^\\s+${k}: pick\\(`, 'm').test(seed), `seed нь \`${k}\` үүсгэсээр байна ✗`);
  });
  assert.ok(!seed.includes('const SERVICE_NAMES'), 'seed-д `SERVICE_NAMES` хүснэгт үлдсэн ✗');
  assert.ok(!seed.includes('pick(SERVICE_NAMES)'), 'seed нь `SERVICE_NAMES` ашиглаж байна ✗');
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
  // 🤝 `services` (8 бүлэг, бүгд нээлттэй) ХӨНДӨГДӨӨГҮЙ — regress-ийн хамгаалалт
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
  //    ✏️ 2026-10-07 (64): 🛠️ services нь ХАМГИЙН СҮҮЛЭЭС ⚡-ийн ДАРАА, 🧱-ийн
  //    ӨМНӨ шилжив (хэрэглэгчийн хүсэлт: «Үйлдвэр & Үйлчилгээ, Бизнес ийг
  //    Барилгын материал ийн өмнө оруул») — `value`/DB/URL ХӨНДӨӨГДӨӨГҮЙ ✓
  assert.deepEqual(
    SECTIONS.map((s) => s.value),
    [
      'real-estate', 'auto', 'jobs', 'computers', 'furniture', 'home',
      'electric', 'services', 'construction', 'equipment', 'travel', 'hobby',
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
  // 🆕 2026-10-08 (71) · ✏️ шошго (73): 🛏 «Ор болдог эсэх» (`sofaBed`) нэмэгдэв — ⚠️ `attrFields`
  //    нь БҮТЭН жагсаалт (`onlySubtypes` шүүлт `getAttrFields(section, subtype)`
  //    дээр л ажиллана; энд `getSection().attrFields` нь ТҮҮХИЙ массив ✓)
  assert.deepEqual(getSection('furniture').attrFields.map((f) => f.key), ['condition', 'sofaBed']);
  assert.deepEqual(getAttrFilters('furniture', 'Буйдан, кресло').map((f) => f.key), ['condition', 'sofaBed']);
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
t('🧱/🏭 Шинэ 2 хэсэг: SECTIONS-д 12 хэсэг болов, ⚡/🛠-ийн ДАРАА · ⚽-гийн ӨМНӨ', () => {
  assert.deepEqual(SECTIONS.map((s) => s.value), [
    'real-estate', 'auto', 'jobs', 'computers', 'furniture', 'home',
    'electric', 'services', 'construction', 'equipment', 'travel', 'hobby',
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

t('🧱/🏭 Хялбар форм (🛋️/⚡/⚽-той ижил): зөвхөн «Төлөв» шүүлт', () => {
  for (const s of ['construction', 'equipment']) {
    assert.equal(hasSimpleForm(s), true);
    assert.deepEqual(getAttrFilters(s).map((f) => f.key), ['condition']);
    assert.deepEqual(getSection(s).attrFields.map((f) => f.key), ['condition']);
    const f = getAttrFilters(s)[0];
    assert.equal(f.label, 'Төлөв');   // 🆕 2026-10-05 (43)
    assert.deepEqual(f.options, ['Шинэ', 'Шинэвтэр', 'Хуучин']);
    assert.equal(f.filterBar, undefined, 'pill хэвээр байна ✗');  // 🆕 (17)
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
  //    (нягтлан бодогчийн товчлол, жишиг сайтын хэв маяг) ХЭВЭЭР ✓
  assert.ok(subtypes.includes('Банк, санхүү, нябо, нярав'));
  // ⚠️ Монгол «Ресторан» — ЛАТИН «P» БИШ (хэрэглэгчийн бичлэгийн typo зассан ✓)
  assert.ok(!subtypes.includes('Pесторан, кафе, паб'));
});

t('💼 jobs: «Бусад» нь БУСАД хэсэгт ХЭВЭЭР (regress-ийн хамгаалалт)', () => {
  // ⚠️ Зөвхөн jobs-оос хассан — 🛋️ furniture / ⚡ electric / 🧱 construction
  //    дээр «Бусад» хэвээр байх ЁСТОЙ ✓ (🧳 travel 2026-09-30 (5)-д, ⚽ hobby
  //    🆕 2026-10-05 (50)-д нэмэгдэв — тэр нь 0029-ийн сүлжээний буух газар ✓)
  assert.ok(getSubtypes('furniture').includes('Бусад'));
  assert.ok(getSubtypes('travel').includes('Бусад'));
  assert.ok(getSubtypes('electric').includes('Бусад'));
  assert.ok(getSubtypes('construction').includes('Бусад'));
  assert.ok(getSubtypes('hobby').includes('Бусад'));
  // ⚠️ Харин 🧺 home-д «Бусад» БАЙХГҮЙ ✓
  assert.ok(!getSubtypes('home').includes('Бусад'));
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
    ['Харуул хамгаалалт'],
  );
  // ⚠️ Үлдсэн 25 нь ЦОРЫН ГАНЦ (өөр хэсэгт давхардахгүй) ✓
  assert.equal(getSubtypes('jobs').length - 1, 25);
});

t('💼 jobs: 2 түвшин, 3 шүүлт (🕒 · 📊 · 📈 — гурвуулаа ОЛОН СОНГОЛТТОЙ ЧИП), хялбар форм БИШ', () => {
  assert.equal(getSection('jobs').label, 'Ажлын зар');
  assert.equal(getSection('jobs').icon, '💼');
  assert.deepEqual(getAttrFilters('jobs').map((f) => f.key), ['jobType', 'experience', 'jobLevel']);
  // 🆕 2026-10-05 (42): «🛏 Өрөөний тоо»-той ЯГ ИЖИЛ — ГУРВУУЛАА `chips`+`multi`
  //    (хэрэглэгчийн хүсэлт: «Ажлын цаг, Туршлага, Мэргэжлийн түвшиныг Өрөөний
  //    тоо шиг болго»); ⏳ (9)-д зөвхөн 🕒 нь чип байв
  ['jobType', 'experience', 'jobLevel'].forEach((k) => {
    assert.equal(getAttrField('jobs', k).chips, true, `${k}.chips ✗`);
    assert.equal(getAttrField('jobs', k).multi, true, `${k}.multi ✗`);
  });
  // 🎛 🆕 2026-10-07: ФОРМ дээр 4 талбар нь 💰 «Цалингийн төрөл»-тэй ЯГ ИЖИЛ
  //    `<select>` — ⏳ 2026-10-03 (11)-ийн `formChips` ХАСАГДАВ ✓
  //    (⚠️ ХАЙЛТЫН sidebar-ийн `chips` дээрх — ХӨНДӨӨГДӨӨГҮЙ ✓)
  ['jobType', 'experience', 'advertiser', 'jobLevel', 'salaryType'].forEach((k) => {
    assert.equal(getAttrField('jobs', k).formChips, undefined, `${k}.formChips хэвээр ✗`);
  });
  assert.equal(hasSimpleForm('jobs'), false);
  assert.deepEqual(getSubtypeGroups('jobs'), []); // ⚠️ бүлэг (3 дахь түвшин) БАЙХГҮЙ
  assert.equal(findSubtypeGroup('jobs', getSubtypes('jobs')[0]), null);
});

t('💼 jobs: форм талбарууд — ЯГ 5 ШИНЭ талбар (🏢/💼/💰 цалин ХАСАГДАВ)', () => {
  // ⚠️ Дараалал нь форм дээрх дараалал (хэрэглэгчийн өгсөн жагсаалт) ✓
  // ⚠️ 2026-10-03 (10): 🏢 `company` ба 💼 `position` ХАСАГДАВ (хэрэглэгчийн хүсэлт)
  assert.deepEqual(
    getAttrFields('jobs').map((f) => f.key),
    ['jobType', 'experience', 'advertiser', 'jobLevel', 'salaryType'],
  );
  // 💰 «Цалин (₮)» нь форм/attrs-аас БҮРЭН ХАСАГДАВ (цалин = зарын ҮНЭ) ✓
  assert.equal(getAttrField('jobs', 'salary'), null);
  // ⚠️ Хуучин талбарууд (company/position/education/workMode/expiry) ч хасагдсан ✓
  ['company', 'position', 'education', 'workMode', 'expiry'].forEach((k) => assert.equal(getAttrField('jobs', k), null));
  // 🏷️ Шошго ба утгууд нь хэрэглэгчийн жагсаалттай ЯГ ИЖИЛ
  assert.equal(getAttrField('jobs', 'jobType').label, 'Ажлын цаг');
  assert.equal(getAttrField('jobs', 'advertiser').label, 'Зарлагч');
  assert.equal(getAttrField('jobs', 'jobLevel').label, 'Мэргэжлийн түвшин');
  assert.equal(getAttrField('jobs', 'salaryType').label, 'Цалингийн төрөл');
  assert.deepEqual(JOB_TIME_OPTIONS, ['Бүтэн цагийн', 'Хагас цагийн', 'Цагийн', 'Гэрээт', 'Түр хугацааны']);
  assert.deepEqual(JOB_EXPERIENCE_OPTIONS, ['Шаардлагатай', 'Шаардлагагүй']);
  assert.deepEqual(JOB_ADVERTISER_OPTIONS, ['Байгууллага', 'Хувь хүн', 'Зуучлагч']);
  assert.deepEqual(JOB_LEVEL_OPTIONS, ['Дадлагын', 'Анхан шатны', 'Мэргэжилтэн', 'Дунд шатны удирдлага', 'Дээд шатны удирдлага']);
  assert.deepEqual(JOB_SALARY_TYPE_OPTIONS, ['Тогтмол', 'Хэлбэлзэх']);
  // ⚠️ Сонголтын массив нь `attrFields`-д ШУУД (давхар хуулбар БАЙХГҮЙ ✓)
  assert.equal(getAttrField('jobs', 'jobType').options, JOB_TIME_OPTIONS);
});

t('💼 jobs: «Үнэ» БИШ — ЦАЛИН (priceWord/isJobsSection, 2026-10-03 (9))', () => {
  assert.equal(priceWord('jobs'), 'Цалин');
  assert.equal(priceWord('real-estate'), 'Үнэ');
  assert.equal(priceWord('auto'), 'Үнэ');
  assert.equal(priceWord('all'), 'Үнэ');
  assert.equal(isJobsSection('jobs'), true);
  assert.equal(isJobsSection('computers'), false);
});

t('📋 getAttrRows(jobs): 5 талбар + salary/company/position МӨР БАЙХГҮЙ', () => {
  const rows = getAttrRows('jobs', {
    company: 'Мобиком', position: 'Программист', salary: '2500000',
    jobType: 'Бүтэн цагийн', experience: 'Шаардлагатай', advertiser: 'Байгууллага',
    jobLevel: 'Мэргэжилтэн', salaryType: 'Тогтмол',
  });
  assert.deepEqual(rows.map((r) => r.key), ['jobType', 'experience', 'advertiser', 'jobLevel', 'salaryType']);
  // ⚠️ `salary` нь `attrFields`-д БАЙХГҮЙ тул мөр болохгүй (үнэ тусдаа) ✓
  // ⚠️ 2026-10-03 (10): 🏢 `company` / 💼 `position` ч ХАСАГДСАН (форм/карт/
  //    дэлгэрэнгүй ГУРВУУЛАА нэг эх сурвалж — `getAttrRows` нь `attrFields`-ээр ✓)
  ['salary', 'company', 'position'].forEach((k) => assert.ok(!rows.some((r) => r.key === k), `${k} мөр гарсан ✗`));
  assert.equal(rows.find((r) => r.key === 'jobType').value, 'Бүтэн цагийн');
});

t('💼 jobs: картын мөр — «Ажилд авна» · ажлын цаг · туршлага · зарлагч · түвшин · цалингийн төрөл', () => {
  assert.equal(
    formatAttrsLine('jobs', {
      company: 'Мобиком', position: 'Программист',
      jobType: 'Бүтэн цагийн', experience: 'Шаардлагатай',
      advertiser: 'Байгууллага', jobLevel: 'Мэргэжилтэн', salaryType: 'Тогтмол',
    }),
    'Ажилд авна · 🕒 Бүтэн цагийн · 📊 Шаардлагатай · 🏷️ Байгууллага · 📈 Мэргэжилтэн · 💰 Тогтмол',
  );
  // ⚠️ `salary` нь картын мөрөнд ГАРАХГҮЙ (цалин нь тусдаа үнийн мөр) ✓
  assert.equal(formatAttrsLine('jobs', { salary: '2000000' }), 'Ажилд авна');
  // ⚠️ 2026-10-03 (10): ХУУЧИН заруудын `company`/`position` ч ГАРАХГҮЙ ✓
  assert.equal(formatAttrsLine('jobs', { company: 'Мобиком', salary: '2000000' }), 'Ажилд авна');
  assert.equal(formatAttrsLine('jobs', { position: 'Программист' }), 'Ажилд авна');
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
  // ⚠️ ⚽ `hobby`-д ҮЛДСЭН дэд төрлүүд ШИЛЖИХГҮЙ (тэдгээр нь hobby хэвээр ✓)
  //    ℹ️ 2026-10-05 (50): «Бусад» нь 🧳 `travel`-ийн 12 дахь мөр ч мөн ⚽ `hobby`-д
  //    байгаа тул түүнийг ХАСАЖ шалгана (хоёр хэсгийн `section` нь ялгана ✓ —
  //    `update … where section = 'hobby'`)
  getSubtypes('hobby')
    .filter((s) => s !== 'Бусад')
    .forEach((s) => assert.ok(!travelBlock.includes(`'${s}'`), `«${s}» шилжих ёсгүй ✗`));

  // ④ Хуучин ХАВТГАЙ «Аяллын хэрэгсэл» (0025-ыг орлоно) → «Бусад»/`travel`
  assert.ok(/set section = 'travel', property_type = 'Бусад'/.test(sql));
  assert.ok(/property_type = 'Аяллын хэрэгсэл'/.test(sql));

  // ⚠️ ЗАР УСТГАХГҮЙ (зөвхөн `section`/`property_type` шилжинэ) — 0016/0019/
  //    0021/0023-ын ЯГ ИЖИЛ зарчим ✓
  assert.ok(!/\bdelete\s+from\b/i.test(sql));
  assert.ok(!/\btruncate\b/i.test(sql));
});


t('⚽ 0029 migration: хуучин 4 нэр → «Бусад» + модноос гадуур утга үлдээхгүй СҮЛЖЭЭ', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0029_sport_subtypes.sql', import.meta.url), 'utf8',
  );
  // ① ЗӨВХӨН ⚽ `hobby` хэсгийн мөрүүдэд хүрнэ (бусад хэсгийн зар ХӨНДӨГДӨХГҮЙ ✓)
  assert.ok(/section = 'hobby'/.test(sql), '`section = \'hobby\'` алга ✗');
  assert.ok(!/section = '(travel|home|furniture|jobs|auto)'/.test(sql), 'өөр хэсэгт хүрсэн ✗');
  // ② Хуучин 4 нэр БҮГД файлд байх ЁСТОЙ (тэднийг «Бусад» болгоно ✓)
  for (const old of ['Ном, сонин, сэтгүүл', 'Спортын хэрэгсэл', 'Хөгжмийн зэмсэг', 'Цуглуулга']) {
    assert.ok(sql.includes(`'${old}'`), `хуучин «${old}» алга ✗`);
  }
  assert.ok(/set property_type = 'Бусад'/.test(sql), '«Бусад» руу шилжүүлэлт алга ✗');
  // ③ 🕸 СҮЛЖЭЭ: `getSubtypes('hobby')`-гийн 21 нэр БҮГД `not in (…)`-д байх ЁСТОЙ
  //    (эс бөгөөс танил бус утга гарвал тэр зар баригдахгүй өнгөрнө ✗)
  getSubtypes('hobby')
    .forEach((s) => assert.ok(sql.includes(`'${s}'`), `сүлжээнд «${s}» алга ✗`));
  // ④ ХАМГААЛАЛТ: зар УСТГАХГҮЙ ба `section` (DB утга) солигдохгүй ✓
  assert.ok(!/\bdelete\s+from\b/i.test(sql), '⚠️ зар УСТГАХГҮЙ (зөвхөн нэр солино)');
  assert.ok(!/\btruncate\b/i.test(sql), 'truncate хориглоно ✗');
  assert.ok(!/set section = /.test(sql), '`section` солигдох ЁСТОЙГҮЙ (нэр нь UI-д) ✗');
});

t('⚽ 0033 migration: «Кемпинг»/«Усанд сэлэх» → «Бусад» + модноос гадуур утга үлдээхгүй СҮЛЖЭЭ', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0033_sport_subtypes_v2.sql', import.meta.url), 'utf8',
  );
  // ① ЗӨВХӨН ⚽ `hobby` хэсгийн мөрүүдэд хүрнэ (бусад хэсгийн зар ХӨНДӨГДӨХГҮЙ ✓)
  assert.ok(/section = 'hobby'/.test(sql), '`section = \'hobby\'` алга ✗');
  assert.ok(
    !/section = '(travel|home|furniture|jobs|auto|services|computers|electric|construction|equipment)'/.test(sql),
    'өөр хэсэгт хүрсэн ✗',
  );
  // ② ХАСАГДСАН 2 нэр БҮГД файлд байх ЁСТОЙ (тэднийг «Бусад» болгоно ✓)
  for (const gone of ['Кемпинг', 'Усанд сэлэх']) {
    assert.ok(sql.includes(`'${gone}'`), `хасагдсан «${gone}» алга ✗`);
  }
  assert.ok(/set property_type = 'Бусад'/.test(sql), '«Бусад» руу шилжүүлэлт алга ✗');
  // ③ 🕸 СҮЛЖЭЭ: `getSubtypes('hobby')`-гийн 19 нэр БҮГД `not in (…)`-д байх ЁСТОЙ
  //    (эс бөгөөс танил бус утга гарвал тэр зар баригдахгүй өнгөрнө ✗)
  getSubtypes('hobby')
    .forEach((s) => assert.ok(sql.includes(`'${s}'`), `сүлжээнд «${s}» алга ✗`));
  // ④ ХАМГААЛАЛТ: зар УСТГАХГҮЙ ба `section` (DB утга) солигдохгүй ✓
  assert.ok(!/\bdelete\s+from\b/i.test(sql), '⚠️ зар УСТГАХГҮЙ (зөвхөн нэр солино)');
  assert.ok(!/\btruncate\b/i.test(sql), 'truncate хориглоно ✗');
  assert.ok(!/set section = /.test(sql), '`section` солигдох ЁСТОЙГҮЙ (нэр нь UI-д) ✗');
});

// 🛠 0030-ын үеийн `services` дэд төрлийн БҮРЭН ЖАГСААЛТ (52) — 0030-ын
//    сүлжээг ТҮҮХИЙ snapshot-оор түгжинэ.
// ⚠️ 2026-10-07 (58)-д «Бизнес, Санхүү & Хууль» бүлэг 5 → 7 болов (52 → 54)
//    ⇒ ЭНД `getSubtypes('services')`-ийг ШУУД ашиглах БОЛОМЖГҮЙ (0030-ын SQL
//    нь зөвхөн тухайн үеийн 52-ыг МЭДНЭ — шинэ 4 нэр (Хөрөнгө зуучлал/Үнэлгээ/
//    Нотариат/Өмгөөлөгч) түүнд БАЙХГҮЙ ✗) — түүхэн snapshot нь ЗӨВ ✓
const SERVICES_AT_0030 = [
  // 🗂 Групп 1 — «Сургалт, курс» (23)
  'Гадаад хэл', 'Үсчин, гоо сайхан', 'Хүнд машин механизм',
  'Сантехник, цахилгаанчин', 'Гар утас, электроник засвар', 'Жолоо',
  'Зөөгч, бармен', 'Компьютер ба интернэт', 'Мужаан, гагнуурчин',
  'Нягтлан бодох', 'Оёдол', 'Спорт', 'Тоо, ерөнхий боловсрол',
  'ХАБЭА', 'Тогооч', 'Хөгжмийн зэмсэг', 'Авто засвар',
  'Барилга, засал чимэглэл', 'Худалдагч, касс, нярав',
  'Оффисын ажилчдын сургалт', 'Тайлан ба төсөл', 'Орчуулга', 'Бусад',
  // 🗂 Групп 2 — «Барилга & Засвар үйлчилгээ» (6)
  'Барилгын бүх ажил', 'Цахилгаан бараа засвар', 'Тавилга ба мужаан',
  'Түлхүүр/цоож засвар', 'Сантехник', 'Гагнуурын үйлчилгээ',
  // 🗂 Групп 3 — «Өрх гэр & Ахуйн үйлчилгээ» (6)
  'Бүх цэвэрлэгээ', 'Нүүлгэлт ба тээвэр', 'Хүүхэд асрах',
  'Өндөр настан асрах', 'Тэжээвэр амьтны үйлчилгээ', 'Жолоочийн үйлчилгээ',
  // 🗂 Групп 4 — «Хэвлэл, реклам, медиа» (1)
  'Хэвлэл, реклам, медиа',
  // 🗂 Групп 5 — «Аялал, Амралт & Гоо сайхан» (5)
  'Аялал жуулчлал', 'Амралт, сувилал', 'Үсчин гоо сайхан',
  'Хоол захиалга', 'Баярын худалдаа, Үйлчилгээ',
  // 🗂 Групп 6 — «Технологи & Авто засвар» (3)
  'IT Программ хангамж', 'Уул уурхай', 'Авто засвар үйлчилгээ',
  // 🗂 Групп 7 — «Бизнес, Санхүү & Хууль» (5 — ХУУЧИН)
  'Компани ба бэлэн бизнес зарна', 'Хөрөнгө зуучлал ба үнэлгээ',
  'Мөнгө санхүү ба зээл', 'Хууль ба эрх зүй', 'Харуул хамгаалалт',
  // 🗂 Групп 8 — «Эмнэлэг» (3)
  'Шүдний эмнэлэг', 'Эрэгтэйчүүдийн эмнэлэг', 'Эмэгтэйчүүдийн эмнэлэг',
];

// 🛠 0035-ын үеийн `services` дэд төрлийн БҮРЭН ЖАГСААЛТ (55) — түүхэн snapshot.
// ⚠️ 2026-10-07 (61)-д бүтэц БҮРЭН шинэчлэгдэж 55 → 81 (10 бүлэг) болсон тул
//    0035-ын SQL нь зөвхөн тухайн үеийн 55-ыг МЭДНЭ — түүхэн snapshot ЗӨВ ✓
const SERVICES_AT_0035 = [
  ...SERVICES_AT_0030.slice(0, 23),          // Групп 1 — «Сургалт, курс» (23)
  'Барилгын бүх ажил', 'Цахилгаан бараа засвар', 'Тавилга ба мужаан',
  'Түлхүүр/цоож засвар', 'Сантехник', 'Гагнуурын үйлчилгээ',   // Групп 2 (6)
  'Бүх цэвэрлэгээ', 'Нүүлгэлт', 'Хүргэлт', 'Хүүхэд асрах',
  'Өндөр настан асрах', 'Тэжээвэр амьтны үйлчилгээ', 'Жолоочийн үйлчилгээ', // Групп 3 (7)
  'Хэвлэл, реклам, медиа',                   // Групп 4 (1)
  'Аялал жуулчлал', 'Амралт, сувилал', 'Үсчин гоо сайхан',
  'Хоол захиалга', 'Баярын худалдаа, Үйлчилгээ',  // Групп 5 (5)
  'IT Программ хангамж', 'Уул уурхай', 'Авто засвар үйлчилгээ', // Групп 6 (3)
  'Компани ба бэлэн бизнес зарна', 'Хөрөнгө зуучлал', 'Үнэлгээ',
  'Мөнгө санхүү ба зээл', 'Нотариат', 'Өмгөөлөгч', 'Харуул хамгаалалт', // Групп 7 (7)
  'Шүдний эмнэлэг', 'Эрэгтэйчүүдийн эмнэлэг', 'Эмэгтэйчүүдийн эмнэлэг', // Групп 8 (3)
];

// 🛠 0034-ын үеийн `services` дэд төрлийн БҮРЭН ЖАГСААЛТ (54) — түүхэн snapshot.
// ⚠️ 2026-10-07 (60)-д «Өрх гэр & Ахуйн үйлчилгээ» бүлгийн «Нүүлгэлт ба тээвэр»
//    нь «Нүүлгэлт» + «Хүргэлт» болж САЛСАВ (54 → 55) ⇒ 0034-ийн SQL нь шинэ 2
//    нэрийг МЭДЭХГҮЙ — түүхэн snapshot нь ЗӨВ ✓ (SERVICES_AT_0030-тай ЯГ ИЖИЛ зарчим)
const SERVICES_AT_0034 = [
  // 🗂 Групп 1–6 (23 + 6 + 6 + 1 + 5 + 3 = 44) — SERVICES_AT_0030-аас ХӨНДӨӨГДӨӨГҮЙ
  ...SERVICES_AT_0030.slice(0, 44),
  // 🗂 Групп 7 — «Бизнес, Санхүү & Хууль» (7 — ✏️ 2026-10-07 (58))
  'Компани ба бэлэн бизнес зарна', 'Хөрөнгө зуучлал', 'Үнэлгээ',
  'Мөнгө санхүү ба зээл', 'Нотариат', 'Өмгөөлөгч', 'Харуул хамгаалалт',
  // 🗂 Групп 8 — «Эмнэлэг» (3)
  'Шүдний эмнэлэг', 'Эрэгтэйчүүдийн эмнэлэг', 'Эмэгтэйчүүдийн эмнэлэг',
];
// 🛠 0036-ын үеийн `services` дэд төрлийн БҮРЭН ЖАГСААЛТ (84 мөр = 81 УНИКАЛЬ) —
//    0036-ын SQL-ийн сүлжээтэй ЯГ ИЖИЛ (⚠️ 3 нь 2 бүлэгт давхардсан).
// ⚠️ 2026-10-07 (62)-т «Сургалт, курс» бүлэг 23 → 22 болж (81 → 79) тул 0036-ын
//    SQL нь 81-ийг л МЭДНЭ — түүхэн snapshot нь ЗӨВ ✓ (SERVICES_AT_0030-тай ЯГ ИЖИЛ)
const SERVICES_AT_0036 = [
  // 🗂 Групп 1 — «Сургалт, курс» (23)
  'Гадаад хэл', 'Үсчин, гоо сайхан', 'Хүнд машин механизм',
  'Сантехник, цахилгаанчин', 'Гар утас, электроник засвар', 'Жолоо',
  'Зөөгч, бармен', 'Компьютер ба интернэт', 'Мужаан, гагнуурчин',
  'Нягтлан бодох', 'Оёдол', 'Спорт', 'Тоо, ерөнхий боловсрол',
  'ХАБЭА', 'Тогооч', 'Хөгжмийн зэмсэг', 'Авто засвар',
  'Барилга, засал чимэглэл', 'Худалдагч, касс, нярав',
  'Оффисын ажилчдын сургалт', 'Тайлан ба төсөл', 'Орчуулга', 'Бусад',
  // 🗂 Групп 2 — «Барилга & Зам» (14)
  'Зураг төсөл', 'Барилгын хяналт & Төсөв', 'Барилгын дотоод засал',
  'Гагнуур', 'Сантехник', 'Мужаан', 'Суурь, карказ, өрлөг',
  'Дээвэр, пасад, дулаалга', 'Сантехник, халаалт, цэвэр/бохир ус',
  'Цахилгаан, холбоо дохиолол, камер', 'Вакуум цонх', 'Хаалга',
  'Зам барилгын ажил гүйцэтгэх', 'Хүнд машин механизм, уул уурхай',
  // 🗂 Групп 3 — «Өрх гэр & Ахуйн үйлчилгээ» (7)
  'Бүх цэвэрлэгээ', 'Нүүлгэлт', 'Хүргэлт', 'Хүүхэд асрах',
  'Өндөр настан асрах', 'Тэжээвэр амьтны үйлчилгээ', 'Жолоочийн үйлчилгээ',
  // 🗂 Групп 4 — «Тавилга» (3)
  'Тавилга үйлдвэрлэл', 'Импорт', 'Дэлгүүрийн тавилга',
  // 🗂 Групп 5 — «Аялал жуулчлал & Ресторан» (6)
  'Аялал жуулчлал', 'Амралт, сувилал', 'Ресторан', 'Катеринг',
  'Хоол хүргэлт', 'Баярын худалдаа, Үйлчилгээ',
  // 🗂 Групп 6 — «Эмнэлэг & Эрүүл мэнд» (6)
  'Шүдний эмнэлэг', 'Гоо сайхны эмнэлэг', 'Эрэгтэйчүүдийн эмнэлэг',
  'Эмэгтэйчүүдийн эмнэлэг', 'Арьс харшилын эмнэлэг', 'Бусад эмнэлэг',
  // 🗂 Групп 7 — «IT, Технологи & Медиа» (3)
  'IT Программ хангамж', 'Хэвлэл', 'Реклам, Медиа',
  // 🗂 Групп 8 — «Цахилгаан бараа засвар» (7)
  'Цахилгаан бараа засвар', 'ТВ засвар', 'Авто хөгжим', 'Хөргөгч засвар',
  'Угаалгын машин засвар', 'Түлхүүр/цоож засвар', 'Гар утас засвар',
  // 🗂 Групп 9 — «Бизнес, Санхүү & Хууль» (7)
  'Компани ба бэлэн бизнес зарна', 'Хөрөнгө зуучлал', 'Үнэлгээ',
  'Зээл, Санхүү', 'Өмгөөлөл', 'Тайлан', 'Харуул хамгаалалт',
  // 🗂 Групп 10 — «Бусад үйлчилгээ» (8)
  'Үсчин, гоо сайхан', 'Авто угаалга', 'Авто засвар', 'Фитнесс',
  'Массаж', 'Нотариат', 'Карго', 'Орчуулга',
];



t('🛠 0030 migration: «Сургалт ба курс» → «Бусад» + модноос гадуур утга үлдээхгүй СҮЛЖЭЭ', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0030_services_surgalt_kurs.sql', import.meta.url), 'utf8',
  );
  // ① ЗӨВХӨН 🛠️ `services` хэсгийн мөрүүдэд хүрнэ (бусад хэсгийн зар ХӨНДӨГДӨХГҮЙ ✓)
  assert.ok(/section = 'services'/.test(sql), '`section = \'services\'` алга ✗');
  assert.ok(
    !/section = '(hobby|travel|home|furniture|jobs|auto|computers|electric|construction|equipment)'/.test(sql),
    'өөр хэсэгт хүрсэн ✗',
  );
  // ② Хуучин 1 нэр файлд байх ЁСТОЙ (түүнийг «Бусад» болгоно ✓)
  assert.ok(sql.includes("'Сургалт ба курс'"), 'хуучин «Сургалт ба курс» алга ✗');
  assert.ok(/set property_type = 'Бусад'/.test(sql), '«Бусад» руу шилжүүлэлт алга ✗');
  // ③ 🕸 СҮЛЖЭЭ: 0030-ын үеийн `services`-ийн 52 нэр (`SERVICES_AT_0030`) БҮГД
  //    `not in (…)`-д байх ЁСТОЙ (эс бөгөөс танил бус утга гарвал тэр зар
  //    баригдахгүй өнгөрнө ✗). ⚠️ 2026-10-07 (58)-д `services` 52 → 54 болсон
  //    (шинэ 4 нэр 0030-ын SQL-д БАЙХГҮЙ) тул `getSubtypes` БИШ — түүхэн
  //    snapshot ашиглана ✓
  const subtypes = SERVICES_AT_0030;
  assert.equal(subtypes.length, 52);
  subtypes.forEach((s) => assert.ok(sql.includes(`'${s}'`), `сүлжээнд «${s}» алга ✗`));
  // ④ ХАМГААЛАЛТ: зар УСТГАХГҮЙ ба `section` (DB утга) солигдохгүй ✓
  assert.ok(!/\bdelete\s+from\b/i.test(sql), '⚠️ зар УСТГАХГҮЙ (зөвхөн нэр солино)');
  assert.ok(!/\btruncate\b/i.test(sql), 'truncate хориглоно ✗');
  assert.ok(!/set section = /.test(sql), '`section` солигдох ЁСТОЙГҮЙ (нэр нь UI-д) ✗');
});

t('🛠 0034 migration: «Бизнес, Санхүү & Хууль» 5 → 7 + модноос гадуур утга үлдээхгүй СҮЛЖЭЭ', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0034_services_business_subtypes.sql', import.meta.url), 'utf8',
  );
  // ① ЗӨВХӨН 🛠️ `services` хэсгийн мөрүүдэд хүрнэ (бусад хэсгийн зар ХӨНДӨГДӨХГҮЙ ✓)
  assert.ok(/section = 'services'/.test(sql), "`section = 'services'` алга ✗");
  assert.ok(
    !/section = '(hobby|travel|home|furniture|jobs|auto|computers|electric|construction|equipment)'/.test(sql),
    'өөр хэсэгт хүрсэн ✗',
  );
  // ② ХУУЧИН 2 нэр файлд байх ЁСТОЙ + тус тусдаа ШИНЭ утга руу шилжинэ ✓
  assert.ok(sql.includes("'Хөрөнгө зуучлал ба үнэлгээ'"), 'хуучин «Хөрөнгө зуучлал ба үнэлгээ» алга ✗');
  assert.ok(sql.includes("'Хууль ба эрх зүй'"), 'хуучин «Хууль ба эрх зүй» алга ✗');
  assert.ok(/set property_type = 'Хөрөнгө зуучлал'/.test(sql), '«Хөрөнгө зуучлал» руу шилжүүлэлт алга ✗');
  assert.ok(/set property_type = 'Өмгөөлөгч'/.test(sql), '«Өмгөөлөгч» руу шилжүүлэлт алга ✗');
  // ③ 🕸 СҮЛЖЭЭ: 0034-ын үеийн `services`-ийн 54 нэр (`SERVICES_AT_0034`) БҮГД
  //    `not in (…)`-д байх ЁСТОЙ (эс бөгөөс танил бус утга гарвал тэр зар
  //    баригдахгүй өнгөрнө ✗). ⚠️ 2026-10-07 (60)-д `services` 54 → 55 болсон
  //    («Нүүлгэлт ба тээвэр» → «Нүүлгэлт» + «Хүргэлт») тул `getSubtypes` БИШ —
  //    түүхэн snapshot ашиглана ✓
  const subtypes = SERVICES_AT_0034;
  assert.equal(subtypes.length, 54);
  subtypes.forEach((s) => assert.ok(sql.includes(`'${s}'`), `сүлжээнд «${s}» алга ✗`));
  // ④ ХАМГААЛАЛТ: зар УСТГАХГҮЙ ба `section` (DB утга) солигдохгүй ✓
  assert.ok(!/\bdelete\s+from\b/i.test(sql), '⚠️ зар УСТГАХГҮЙ (зөвхөн нэр солино)');
  assert.ok(!/\btruncate\b/i.test(sql), 'truncate хориглоно ✗');
  assert.ok(!/set section = /.test(sql), '`section` солигдох ЁСТОЙГҮЙ (нэр нь UI-д) ✗');
});

t('🛠 0035 migration: «Нүүлгэлт ба тээвэр» → «Нүүлгэлт» + «Хүргэлт» + модноос гадуур утга үлдээхгүй СҮЛЖЭЭ', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0035_services_household_subtypes.sql', import.meta.url), 'utf8',
  );
  // ① ЗӨВХӨН 🛠️ `services` хэсгийн мөрүүдэд хүрнэ (бусад хэсгийн зар ХӨНДӨГДӨХГҮЙ ✓)
  assert.ok(/section = 'services'/.test(sql), "`section = 'services'` алга ✗");
  assert.ok(
    !/section = '(hobby|travel|home|furniture|jobs|auto|computers|electric|construction|equipment)'/.test(sql),
    'өөр хэсэгт хүрсэн ✗',
  );
  // ② ХУУЧИН нэр файлд байх ЁСТОЙ + ШИНЭ 2 утга руу шилжинэ ✓
  assert.ok(sql.includes("'Нүүлгэлт ба тээвэр'"), 'хуучин «Нүүлгэлт ба тээвэр» алга ✗');
  assert.ok(/set property_type = 'Нүүлгэлт'/.test(sql), '«Нүүлгэлт» руу шилжүүлэлт алга ✗');
  assert.ok(sql.includes("'Хүргэлт'"), '🆕 «Хүргэлт» файлд алга ✗');
  // ③ 🕸 СҮЛЖЭЭ: `getSubtypes('services')`-ийн 55 нэр БҮГД `not in (…)`-д байх
  //    ЁСТОЙ (эс бөгөөс танил бус утга гарвал тэр зар баригдахгүй өнгөрнө ✗)
  const subtypes = SERVICES_AT_0035;
  assert.equal(subtypes.length, 55);
  subtypes.forEach((s) => assert.ok(sql.includes(`'${s}'`), `сүлжээнд «${s}» алга ✗`));
  // ④ ХАМГААЛАЛТ: зар УСТГАХГҮЙ ба `section` (DB утга) солигдохгүй ✓
  assert.ok(!/\bdelete\s+from\b/i.test(sql), '⚠️ зар УСТГАХГҮЙ (зөвхөн нэр солино)');
  assert.ok(!/\btruncate\b/i.test(sql), 'truncate хориглоно ✗');
  assert.ok(!/set section = /.test(sql), '`section` солигдох ЁСТОЙГҮЙ (нэр нь UI-д) ✗');
});

// ============================================================
// ⑯ 📋 2026-10-01 (16) — ХЭСГИЙН ҮЗҮҮЛЭЛТ (`attrs`) → ДЭЛГЭРЭНГҮЙ ХҮСНЭГТ
//
// 🎯 Хэрэглэгчийн хүсэлт: «Автомашин руу орход дэлгэрэнгүй мэдээлэл харуулаачээ,
//    2 багана болгоод оруулаарай».
// ⛔ Өмнө нь `ListingDetailClient.jsx`-ийн `features` нь ЗӨВХӨН үл хөдлөхийн
//    талбаруудтай байв → 🚗 машин зар руу ороход «Зарын дэлгэрэнгүй» карт ОГТ
//    ГАРАХГҮЙ байв ✗ (зөвхөн «Тайлбар»). `getAttrRows` нь `attrs`-ийг хэсгийн
//    `attrFields`-ийн шошго/icon/дарааллаар мөр болгоно — энэ тест гэрээг түгжинэ.
// ============================================================

t('📋 getAttrRows(auto) — 🚗 10 мөр, attrFields дараалал + «146,000» таслалттай', () => {
  // ⚠️ БОДИТ demo зарын `attrs` (`826210d7…` — 🚗 Toyota Sai)
  const rows = getAttrRows('auto', {
    brand: 'Toyota', model: 'Sai', color: 'Хар', year: '2010', importYear: '2020',
    mileage: '146000', transmission: 'Автомат', steering: 'Зөв',
    engine: '2.1л - 2.7л', fuel: 'Бензин',
    negotiable: 'yes', drive: 'Урд',   // ⚠️ ХОЁУЛАА ХАРАГДАХГҮЙ (доорх тест ✓)
  });
  // ① Түлхүүр ба дараалал нь `attrFields`-ийн дараалал (форм/sidebar-тай ижил)
  assert.deepEqual(rows.map((r) => r.key), [
    'brand', 'model', 'color', 'year', 'importYear', 'mileage', 'transmission',
    'steering', 'engine', 'fuel',
  ]);
  // ② Шошго нь `attrFields`-ээс (карт дээр харагдах нэртэй ЯГ ижил) + icon
  const byKey = Object.fromEntries(rows.map((r) => [r.key, r]));
  assert.equal(byKey.brand.label, 'Үйлдвэрлэгч');
  assert.equal(byKey.brand.icon, '🏷️');
  assert.equal(byKey.model.label, 'Загвар');
  assert.equal(byKey.mileage.label, 'Гүйлт (км)');
  // ③ Утга: гүйлт нь мянгатын таслалттай («км» шошгонд байгаа тул ДАВХАРДСАНГҮЙ)
  assert.equal(byKey.mileage.value, '146,000');
  assert.ok(!byKey.mileage.value.includes('км'), 'нэгж нь шошгонд — утгад дахин гарахгүй ✓');
  // ④ 🔧 Сонголттой «2.1л - 2.7л» нь нэгжээ өөрөө агуулна → «л» ДАВХАРДАХГҮЙ
  assert.equal(byKey.engine.value, '2.1л - 2.7л');
  // ⑤ Он ба бусад нь ЗӨВӨӨР нь (шошго тайлбарлана)
  assert.equal(byKey.year.value, '2010');
  assert.equal(byKey.importYear.value, '2020');
  assert.equal(byKey.color.value, 'Хар');
  // ⑥ ХУУЧИН/demo тоон хөдөлгүүр нь «2.5 л» болно (картын мөртэй ижил ✓)
  assert.equal(getAttrRows('auto', { engine: '2.5' })[0].value, '2.5 л');
});

t('📋 getAttrRows — хоосон утга ба `negotiable`/`drive` ХАРАГДАХГҮЙ', () => {
  const rows = getAttrRows('auto', {
    brand: 'Toyota', model: '   ', color: null, year: '', mileage: 0, negotiable: 'yes', drive: 'Урд',
  });
  // ⚠️ `attrFields`-д БАЙХГҮЙ түлхүүр (`negotiable`, 2026-10-01-д ХАСАГДСАН `drive`)
  //    нь `attrs`-д байсан ч мөр БОЛОХГҮЙ ✓
  // ⚠️ `0` нь ХООСОН БИШ (`formatAttrsLine`-тэй ижил дүрэм) — ШИНЭ машин 0 км-тэй
  //    байж болно тул «🛣️ Гүйлт (км): 0» гарах нь ЗӨВ ✓
  assert.deepEqual(rows.map((r) => r.key), ['brand', 'mileage']);
  assert.equal(rows[1].value, '0');
  // ⚠️ Утгагүй `attrs` (null/undefined) дээр КРАШ ХИЙХГҮЙ — хоосон массив ✓
  assert.deepEqual(getAttrRows('auto', null), []);
  assert.deepEqual(getAttrRows('auto', undefined), []);
  assert.deepEqual(getAttrRows('auto', {}), []);
  assert.deepEqual(getAttrRows('auto', 'Toyota'), []);
});

t('📋 getAttrRows — 💻 Notebook-ийн 🏷️/🖥️/📺/⚙️/🧠/💾 ГАРНА, Mouse дээр ГАРАХГҮЙ', () => {
  // ⚠️ `warranty` нь DB-д БАЙЖ болзошгүй ХУУЧИН утга (2026-10-01 (18)-д
  //    форм/шүүлтээс ХАСАГДСАН) — 2 баганат хүснэгтэд ГАРАХГҮЙ ЁСТОЙ ✓
  const attrs = { brand: 'Lenovo', model: 'ThinkPad T14', screen: '14 инч', cpu: 'Intel Core i5', ram: '16 GB', storage: '512 GB', condition: 'Шинэ', warranty: 'Байгаа' };
  // ① Notebook (🗑 2026-10-07 (57): дэд төрөл = 'Notebook') → бүх 7 мөр ✓
  const nb = getAttrRows('computers', attrs, 'Notebook');
  assert.deepEqual(nb.map((r) => r.key), ['brand', 'model', 'screen', 'cpu', 'ram', 'storage', 'condition']);
  assert.ok(!nb.some((r) => r.key === 'warranty'), '🛡️ `warranty` харагдаж байна ✗');
  // ② Холдуу дэд төрөл (Mouse) → 6 үзүүлэлт ХАРАГДАХГҮЙ (формтой ижил
  //    `onlySubtypes` ✓). 🆕 2026-10-05 (56): 🏷️ `brand`/🖥️ `model` Ч хасагдав
  //    ⇒ зөвхөн ✅ «Төлөв» үлдэв (⏳ өмнө 3 мөр: brand · model · condition)
  const mouse = getAttrRows('computers', attrs, 'Хулгана, Mouse');
  assert.deepEqual(mouse.map((r) => r.key), ['condition']);
});

// ---- ⑥-з 🛡️ 2026-10-01 (18): «Баталгаат хугацаа» (`warranty`) БҮРЭН ХАСАГДАВ ----
// Хэрэглэгчийн хүсэлт: «Баталгаат хугацаа ч билүү тэрийг хассан шүү».
// ⚠️ `warranty` («🛡️ Баталгаа» — Байгаа / Байхгүй) нь 💻 Компьютер хэсгийн бие
//    даасан талбар байв — ФОРМ (`attrFields`) ба SIDEBAR (`attrFilters`)
//    ХОЁУЛААС гарна; 🔀 «Хөтлөгч» (`drive`)-ийн 2026-10-01-ний хасалттай
//    ЯГ ИЖИЛ зарчим (хуучин заруудын `attrs.warranty` DB-д хэвээр ✓).

t('🛡️ 💻 «Баталгаа» (`warranty`) форм · шүүлт · карт · дэлгэрэнгүй ГУРВААС ХАСАГДАВ', () => {
  // ① Форм: аль ч дэд төрөлд талбар БАЙХГҮЙ (Notebook ба салбар бүгд) ✓
  for (const sub of ['Notebook', 'Иж бүрэн компьютер', 'Процессор, сервер', 'Mouse', '']) {
    assert.ok(!getAttrFields('computers', sub).some((f) => f.key === 'warranty'),
      `«${sub || '(хоосон)'}»: формоос хасагдаагүй ✗`);
  }
  // ② Sidebar: `?warranty=` шүүлт БАЙХГҮЙ ✓
  //    🖥 2026-10-03 (7): 📺/⚙️/🧠/💾 нэмэгдсэн ч `warranty` БУЦАЖ ОРООГҮЙ ✓
  //    🏷️ 2026-10-03 (20): 🏷️ «Брэнд» нь `filterSubtypes`-тай болов ⇒ дэд
  //       төрөл дамжуулахгүй үед ЗӨВХӨН `condition` үлдэнэ ✓
  assert.ok(!getAttrFilters('computers').some((f) => f.key === 'warranty'));
  assert.deepEqual(getAttrFilters('computers').map((f) => f.key), ['condition']);
  assert.ok(!getAttrFilters('computers', 'Notebook').some((f) => f.key === 'warranty'));
  // ③ `getAttrField` нь `null` → карт ба «Зарын дэлгэрэнгүй» хоёулаа алгасна ✓
  assert.equal(getAttrField('computers', 'warranty'), null);
  // ④ Хуучин заруудын `attrs.warranty` (DB-д 💻 690 зар, нийт 700) ДҮРСЛЭГДЭХГҮЙ ✓
  const old = { brand: 'Lenovo', model: 'ThinkPad T14', condition: 'Шинэ', warranty: 'Байгаа' };
  assert.equal(formatAttrsLine('computers', old), 'Lenovo ThinkPad T14 · ✅ Шинэ');
  assert.deepEqual(getAttrRows('computers', old, 'Notebook').map((r) => r.key),
    ['brand', 'model', 'condition']);
  // ⑤ Seed нь демо `attrs`-д `warranty` ҮҮСГЭХГҮЙ (форм дээр сонгогдохгүй ✗) ✓
  const seed = readFileSync(new URL('./seed-sections.mjs', import.meta.url), 'utf8');
  assert.ok(!/warranty:\s*pick/.test(seed), 'seed нь `warranty` демо утга үүсгэсээр байна ✗');
});

t('📋 getAttrRows — 🏠 ҮЛ ХӨДЛӨХ (`attrFields: []`) → 0 мөр, «Зарын дэлгэрэнгүй» ХӨНДӨГДӨХГҮЙ', () => {
  // ⚠️ Үл хөдлөхийн талбарууд нь ТУСДАА багана (rooms/area/floor…) дээр байдаг тул
  //    `attrs` нь ТОДОРХОЙЛОЛТГҮЙ талбаруудыг агуулж чадахгүй → 0 мөр ✓
  assert.deepEqual(getAttrRows('real-estate', { brand: 'Toyota', area: 75 }), []);
  // ⚠️ БУСАД 11 хэсэг бүгд КРАШГҮЙ ажиллана (хоосон `attrs` дээр 0 мөр)
  SECTIONS.forEach((s) => assert.deepEqual(getAttrRows(s.value, {}), []));
});

t('🖥📱 getSectionCategoryChoices — үл хөдлөхөд ЯГ 2 (sell→rent; «Бүгд» ХАСАГДСАН), бусад 11 хэсэгт `[]`', () => {
  // ⚠️ 2026-10-04 (хэрэглэгчийн хүсэлт): «🏠 Үл хөдлөх» рүү орох үед
  //    «💰 Зарах / 🔑 Түрээслэх» гэсэн БОГИНО шошго БИШ, «Үл хөдлөх зарна /
  //    Үл хөдлөх түрээслүүлнэ» гэсэн БҮТЭН шошго. 🗑 2026-10-07 (хэрэглэгчийн
  //    хүсэлт: «Бүгд гэсэн лалрыг ер нь байхгүй болго») — «Бүгд» ХАСАГДАВ
  assert.deepEqual(getSectionCategoryChoices('real-estate'), [
    { value: 'sell', label: 'Үл хөдлөх зарна', shortLabel: 'Зарна' },
    { value: 'rent', label: 'Үл хөдлөх түрээслүүлнэ', shortLabel: 'Түрээслүүлнэ' },
  ]);
  // ⚠️ Дараалал: sell → rent; 🗑 «Бүгд» ХАСАГДСАН ✓
  const vals = getSectionCategoryChoices('real-estate').map((c) => c.value);
  assert.deepEqual(vals, ['sell', 'rent']);
  assert.ok(!vals.includes('all'), '«Бүгд» (`all`) сонголт ҮЛДСЭН байна ✗');
  // ⚠️ `CATEGORIES` ХӨНДӨӨГДӨӨГҮЙ (форм хуучнаараа) — зөвхөн нүүр хуудсны туслах
  assert.deepEqual(getSectionCategories('real-estate').map((c) => c.value), ['all', 'sell', 'rent']);
  // ⚠️ Бусад 11 хэсэгт категори сонголт БАЙХГҮЙ ⇒ `[]` (крашгүй ✓)
  SECTIONS.filter((s) => s.value !== 'real-estate')
    .forEach((s) => assert.deepEqual(getSectionCategoryChoices(s.value), [], s.value));
});

t('🖥 ГЭРЭЭ: HomeClient — категори нь `getSectionCategoryChoices` + `data-category-value` (хавтгай линк)', () => {
  const home = readFileSync(new URL('../components/HomeClient.jsx', import.meta.url), 'utf8');
  // ① Шошго/дараалал нь НЭГ ЭХ СУРВАЛЖААС (`lib/locationData.js`) — хатуу бичсэн нэр БАЙХГҮЙ ✓
  assert.ok(/getSectionCategoryChoices\(section\)/.test(home),
    'HomeClient нь `getSectionCategoryChoices`-г дуудахгүй ✗');
  assert.ok(!/getSectionCategories\(/.test(home),
    'хуучин `getSectionCategories` дуудлага ҮЛДСЭН байна ✗');
  assert.ok(/data-category-value=\{c\.value\}/.test(home),
    'CDP дэгээ (`data-category-value`) алга ✗');
  // ② ✅ 2026-10-07 (хэрэглэгчийн хүсэлт: «background өнгийг байхгүй болгож,
  //    зүүн тийш том, маш minimal — жишиг сайт шиг») — ТӨВД байсан саарал
  //    дүүргэлттэй `segmented` pill ХАСАГДАВ → ЗҮҮН хавтгай текст линк.
  assert.ok(!/className="segmented"/.test(home),
    'хуучин `segmented` pill ҮЛДСЭН байна (хавтгай болох ёстой) ✗');
  assert.ok(!/segmented-item-active/.test(home),
    'хуучин `segmented-item-active` класс ҮЛДСЭН байна ✗');
  assert.ok(/aria-pressed=\{active\}/.test(home), '`aria-pressed` алга ✗');
  assert.ok(/className=\{`text-left text-\[15px\] font-semibold/.test(home),
    'хавтгай категори линкийн класс (`text-left text-[15px] font-semibold`) алга ✗');
  // ③ 📱 <640px богино шошго / 🖥 ≥640px бүтэн шошго (390px дээр гүйлэхгүй ✓)
  assert.ok(/hidden sm:inline/.test(home) && /sm:hidden/.test(home),
    'шошгын мобайл/десктоп солилт алга ✗');
  // ④ Хуучин БОГИНО шошго (`💰 Зарах` / `🔑 Түрээслэх`) нүүр хуудснаас БҮРЭН ХАСАГДАВ ✓
  assert.ok(!/💰 Зарах/.test(home) && !/🔑 Түрээслэх/.test(home),
    'хуучин категори шошго нүүр хуудсанд ҮЛДСЭН байна ✗');
});

t('🏠 showsSectionSubtypes — үл хөдлөхөд категори сонгомогц Л дэд төрөл; бусад 11 хэсэгт ДАНГААРУУ', () => {
  // ⚠️ 2026-10-04 (хэрэглэгчийн хүсэлт): «үл хөдлөх рүү ороход Үл хөдлөх зарна,
  //    Үл хөдлөх түрээслүүлнэ гэж харагдуул, түүний дотрох Орон сууц, Газар гэх
  //    мэтийг энэ үед бүү харуул» → хэсгийн панель 2 АЛХАМТ DRILL болов.
  //    🏠 үл хөдлөх нь анхдагч `category === 'all'` (ерөнхий харагдац) дээр
  //    дэд төрөл ХАРУУЛАХГҮЙ, зөвхөн sell/rent сонгомогц харагдана ✓
  // ① 🏠 үл хөдлөх (категори бий): 'all' → ХААЛТТАЙ; sell/rent → НЭЭЛТТЭЙ
  assert.equal(showsSectionSubtypes('real-estate', 'all'), false,
    'үл хөдлөх + категори сонгоогүй (`all`) → дэд төрөл ХАРАГДАХ ЁСТОЙ БИШ ✗');
  assert.equal(showsSectionSubtypes('real-estate', 'sell'), true, 'sell → НЭЭЛТТЭЙ ✗');
  assert.equal(showsSectionSubtypes('real-estate', 'rent'), true, 'rent → НЭЭЛТТЭЙ ✗');
  // ② Бусад 11 хэсэгт категори ОГТ БАЙХГҮЙ → `category`-г үл хайхран НЭЭЛТТЭЙ ✓
  SECTIONS.filter((s) => s.value !== 'real-estate').forEach((s) => {
    assert.ok(showsSectionSubtypes(s.value, 'all'),
      `${s.value}: категоригүй хэсэгт дэд төрөл ШУУД харагдах ЁСТОЙ ✗`);
    assert.ok(showsSectionSubtypes(s.value, 'sell'), s.value);
    assert.ok(showsSectionSubtypes(s.value, 'rent'), s.value);
  });
  // ③ ⚠️ Хоосон/буруу утга ч КРАШГҮЙ (`undefined !== 'all'` → НЭЭЛТТЭЙ ✓)
  assert.equal(showsSectionSubtypes('real-estate', undefined), true);
});

t('🏠 ГЭРЭЭ: HomeClient — дэд төрлийн блок `showSubtypes`-ээр хаалттай (2 алхамт drill)', () => {
  const home = readFileSync(new URL('../components/HomeClient.jsx', import.meta.url), 'utf8');
  // ① НЭГ ЭХ СУРВАЛЖ — `lib/locationData.js → showsSectionSubtypes` ✓
  assert.ok(/const showSubtypes = showsSectionSubtypes\(section, category\);/.test(home),
    'HomeClient нь `showsSectionSubtypes`-г дуудахгүй ✗');
  assert.ok(!/const showSubtypes = !showCategories/.test(home),
    'HomeClient дотор хатуу бичсэн `showSubtypes` логик ҮЛДСЭН байна ✗');
  assert.ok(/showsSectionSubtypes,/.test(home),
    '`showsSectionSubtypes` импорт арилсан байна ✗');
  // ② Хавтгай дэд төрлийн багана (🏠 үл хөдлөх гэх мэт) `showSubtypes`-ээр хаалттай
  assert.ok(/\{!subtypeGroups\.length && showSubtypes && \(/.test(home),
    'дэд төрлийн багана `showSubtypes`-ээр хаагдаагүй ✗');
  // ③ 🐍 CDP дэгээ — `npm run cdp:sections` үүгээр панелийг тоолно
  assert.ok(/data-section-panel/.test(home), '`data-section-panel` CDP дэгээ алга ✗');
});

t('🎓 ГЭРЭЭ: «Сургалт, курс» ХУРААНГУЙ — `showFirst` + «Илүү / Хураах» (2026-10-06 (12))', () => {
  // Хэрэглэгчийн хүсэлт: «Сургалт, курс -ийг хураангуй харуулдаг болгоё, эхний
  // 5-ыг харуулаад цааш харахыг хүсвэл Илүү гэж дар» ⇒ панель дээр 23 мөр БИШ,
  // эхний 5 мөр + «Илүү» товч; товчийг дарвал 23 мөр бүтнээрээ, дахин дарвал
  // «Хураах» болж буцаана ✓ (⚠️ зөвхөн ХАРАГДАЦ — DB/форм/breadcrumb хөндөгдөхгүй)
  const home = readFileSync(new URL('../components/HomeClient.jsx', import.meta.url), 'utf8');
  // ① Нөхцөл ба харагдах мөрүүд — `showFirst` тугтай, түүнээс олон мөртэй бүлэг
  assert.ok(
    /const many = !collapsible && !leaf && g\.showFirst > 0 && g\.items\.length > g\.showFirst;/.test(home),
    'хураангуйн нөхцөл (`many`) алга эсвэл өөрчлөгдсөн ✗');
  assert.ok(
    /const visible = many && !more \? g\.items\.slice\(0, g\.showFirst\) : g\.items;/.test(home),
    'харагдах мөрүүд `showFirst`-ээр таслагдахгүй байна ✗');
  // ② `role="tablist"` нь `visible`-ыг render хийнэ (БҮТЭН `g.items` БИШ)
  assert.ok(/\{visible\.map\(\(t\) => \(/.test(home),
    'дэд төрлийн мөрүүд `visible`-ээр render хийгдэхгүй байна ✗');
  assert.ok(!/\{g\.items\.map\(\(t\) => \(/.test(home),
    'tablist дотор БҮТЭН `g.items` render хийгдсээр байна (хураангуй эвдэрнэ) ✗');
  // ③ «Илүү ↔ Хураах» товч: төлөв + CDP дэгээ + `aria-expanded`
  assert.ok(/const \[moreGroups, setMoreGroups\] = useState\(\[\]\);/.test(home),
    '`moreGroups` төлөв алга ✗');
  assert.ok(/data-group-more=\{g\.label\}/.test(home),
    '`data-group-more` CDP дэгээ алга ✗');
  assert.ok(/aria-expanded=\{more\}/.test(home), '`aria-expanded` алга ✗');
  assert.ok(/\{more \? 'Хураах' : 'Илүү'\}/.test(home),
    'товчны бичиг «Илүү / Хураах» алга ✗ (хэрэглэгчийн хүсэлт)');
  // ④ Товч нь ШҮҮЛТ БИШ — `role="tab"` БАЙХГҮЙ тул CDP-ийн `tabs` тоололд
  //    ОРОХГҮЙ ✓ (эс бөгөөс панельд 34 БИШ 35 мөр болж гэрээ эвдэрнэ ✗)
  const mi = home.indexOf('{many && (');
  const bi = home.indexOf('data-group-more={g.label}');
  assert.ok(mi > 0 && bi > mi, '«Илүү» товчны markup олдсонгүй ✗');
  // ⚠️ Зүслэг нь `{many && (`-ээс эхэлнэ — түүнээс өмнөх ТАЙЛБАР дотор
  //    `role="tab"` гэсэн ҮГ байгаа тул түүнийг тооцохгүй ✓
  const btn = home.slice(mi, mi + 1000);
  assert.ok(/type="button"/.test(btn), 'товч `type="button"` биш ✗');
  assert.ok(!/role="tab"/.test(btn), 'товч `role="tab"`-тай (CDP тоололд орох ✗)');
  // ⑤ Товч нь `role="tablist"`-ийн ГАДНА — ARIA ёсоор tablist дотор ЗӨВХӨН
  //    `role="tab"` байх ЁСТОЙ тул «Илүү» нь tablist хаагдсаны дараа байрлана ✓
  const vi = home.indexOf('{visible.map((t) => (');
  assert.ok(vi > 0 && vi < mi, '`visible.map` блок олдсонгүй ✗');
  assert.ok(home.slice(vi, mi).includes('</div>'),
    '«Илүү» товч tablist-ийн ДОТОР байна (гадна байх ЁСТОЙ) ✗');
  assert.ok(bi > vi && bi < mi + 1000, 'CDP дэгээ нь «Илүү» товчны markup дотор биш ✗');
  // ⑥ Хэсэг солиход цэвэрлэнэ (`setGroupOpen(null)`-тай ижил зарчим) ✓
  assert.ok(/setMoreGroups\(\[\]\);/.test(home),
    'хэсэг солиход `moreGroups` цэвэрлэгдэхгүй байна (хуучин нэр үлдэнэ ✗)');
});

t('🛠 0036 migration: «Ажил, Үйлчилгээ» бүтэц ШИНЭЧЛЭГДЭВ + модноос гадуур утга үлдээхгүй СҮЛЖЭЭ', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0036_services_subtypes_v2.sql', import.meta.url), 'utf8',
  );
  // ① ЗӨВХӨН 🛠️ `services` хэсгийн мөрүүдэд хүрнэ (бусад хэсгийн зар ХӨНДӨГДӨХГҮЙ ✓)
  assert.ok(/section = 'services'/.test(sql), "`section = 'services'` алга ✗");
  assert.ok(
    !/section = '(hobby|travel|home|furniture|jobs|auto|computers|electric|construction|equipment)'/.test(sql),
    'өөр хэсэгт хүрсэн ✗',
  );
  // ② ХУУЧИН нэр → ШИНЭ нэр (rename map) файлд байх ЁСТОЙ ✓
  const RENAMES = [
    ['Гагнуурын үйлчилгээ', 'Гагнуур'],
    ['Үсчин гоо сайхан', 'Үсчин, гоо сайхан'],
    ['Мөнгө санхүү ба зээл', 'Зээл, Санхүү'],
    ['Өмгөөлөгч', 'Өмгөөлөл'],
    ['Авто засвар үйлчилгээ', 'Авто засвар'],
    ['Уул уурхай', 'Хүнд машин механизм, уул уурхай'],
    ['Хоол захиалга', 'Хоол хүргэлт'],
    ['Хэвлэл, реклам, медиа', 'Хэвлэл'],
    ['Барилгын бүх ажил', 'Зам барилгын ажил гүйцэтгэх'],
    ['Тавилга ба мужаан', 'Мужаан'],
  ];
  RENAMES.forEach(([old, next]) => {
    assert.ok(sql.includes(`'${old}'`), `хуучин «${old}» файлд алга ✗`);
    assert.ok(sql.includes(`'${next}'`), `шинэ «${next}» файлд алга ✗`);
  });
  assert.ok(/set property_type = 'Бусад'/.test(sql), '«Бусад» руу шилжүүлэлт (сүлжээ) алга ✗');
  // ③ 🕸 СҮЛЖЭЭ: 0036-ын үеийн `services`-ийн 81 нэр (`SERVICES_AT_0036`) БҮГД
  //    `not in (…)`-д байх ЁСТОЙ (эс бөгөөс танил бус утга гарвал тэр зар
  //    баригдахгүй өнгөрнө ✗). ⚠️ 2026-10-07 (62)-т `services` 81 → 79 болсон
  //    (4 хуучин нэр гарч, 2 шинэ нэр нэмэгдэв — 0036-ын SQL-д БАЙХГҮЙ) тул
  //    `getSubtypes` БИШ — түүхэн snapshot ашиглана ✓
  assert.ok(/not in \(/.test(sql), '`not in (…)` сүлжээ алга ✗');
  const subtypes = new Set(SERVICES_AT_0036);
  assert.equal(subtypes.size, 81);
  subtypes.forEach((s) => assert.ok(sql.includes(`'${s}'`), `сүлжээнд «${s}» алга ✗`));
  // ④ ХАМГААЛАЛТ: зар УСТГАХГҮЙ ба `section` (DB утга) солигдохгүй ✓
  assert.ok(!/\bdelete\s+from\b/i.test(sql), '⚠️ зар УСТГАХГҮЙ (зөвхөн нэр солино)');
  assert.ok(!/\btruncate\b/i.test(sql), 'truncate хориглоно ✗');
  assert.ok(!/set section = /.test(sql), '`section` солигдох ЁСТОЙГҮЙ (нэр нь UI-д) ✗');
});
t('🛠 0037 migration: «Сургалт, курс» дэд төрлүүд ШИНЭЧЛЭГДЭВ + модноос гадуур утга үлдээхгүй СҮЛЖЭЭ', () => {
  const sql = readFileSync(
    new URL('../supabase/migrations/0037_services_courses_subtypes.sql', import.meta.url), 'utf8',
  );
  // ① ЗӨВХӨН 🛠️ `services` хэсгийн мөрүүдэд хүрнэ (бусад хэсгийн зар ХӨНДӨГДӨХГҮЙ ✓)
  assert.ok(/section = 'services'/.test(sql), "`section = 'services'` алга ✗");
  assert.ok(
    !/section = '(hobby|travel|home|furniture|jobs|auto|computers|electric|construction|equipment)'/.test(sql),
    'өөр хэсэгт хүрсэн ✗',
  );
  // ② ХУУЧИН нэр → ШИНЭ нэр (rename map) файлд байх ЁСТОЙ ✓
  const RENAMES = [
    ['Компьютер ба интернэт', 'IT Программ хангамж'],
    ['Мужаан, гагнуурчин', 'Мужаан'],
    ['Тоо, ерөнхий боловсрол', 'Ерөнхий боловсрол'],
    ['Барилга, засал чимэглэл', 'Бусад'],
  ];
  RENAMES.forEach(([old, next]) => {
    assert.ok(sql.includes(`'${old}'`), `хуучин «${old}» файлд алга ✗`);
    assert.ok(sql.includes(`'${next}'`), `шинэ «${next}» файлд алга ✗`);
  });
  assert.ok(/set property_type = 'Бусад'/.test(sql), '«Бусад» руу шилжүүлэлт (сүлжээ) алга ✗');
  // ③ 🕸 СҮЛЖЭЭ: `getSubtypes('services')`-ийн 79 нэр БҮГД `not in (…)`-д байх ЁСТОЙ
  assert.ok(/not in \(/.test(sql), '`not in (…)` сүлжээ алга ✗');
  const subtypes = getSubtypes('services');
  assert.equal(subtypes.length, 79);
  subtypes.forEach((s) => assert.ok(sql.includes(`'${s}'`), `сүлжээнд «${s}» алга ✗`));
  // ④ ХАМГААЛАЛТ: зар УСТГАХГҮЙ ба `section` (DB утга) солигдохгүй ✓
  assert.ok(!/\bdelete\s+from\b/i.test(sql), '⚠️ зар УСТГАХГҮЙ (зөвхөн нэр солино)');
  assert.ok(!/\btruncate\b/i.test(sql), 'truncate хориглоно ✗');
  assert.ok(!/set section = /.test(sql), '`section` солигдох ЁСТОЙГҮЙ (нэр нь UI-д) ✗');
});

// ═══════════════ 🎨 НҮҮР ХУУДСНЫ КАТЕГОРИЙН TILE (2026-10-09) ═══════════════
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «category-ийн доторх зургийг иймэрхүү зураг болгоод,
//    нүүр хуудсны category уудыг үүн шиг болгож өгөөч» + жишээ зураг
//    ⇒ tile бүр = ДУГУЙ пастел дэвсгэр дотор АНГИЛЛЫН ЗУРАГ + ДООР нь BOLD нэр
//    (⏳ урьд нь ЦАГААН КАРТ дотор emoji байв ✗ — карт/хүрээ/сүүдэр АРИЛАВ)
// ⚠️ Эдгээр тест нь ЗУРАГ+ӨНГӨ+БҮТЦИЙН гэрээг барьдаг; бодит геометр/ачаалалтыг
//    `npm run cdp:tiles` (жинхэнэ Chrome) шалгана ✓
t('🎨 12 хэсэг бүрд tile-ийн ЗУРАГ байна (`public/categories/<value>.svg`)', () => {
  assert.equal(SECTIONS.length, 12);
  SECTIONS.forEach((s) => {
    const p = new URL(`../public/categories/${s.value}.svg`, import.meta.url);
    assert.ok(existsSync(p), `public/categories/${s.value}.svg АЛГА ✗ (tile дээр эвдэрсэн зураг харагдана)`);
    const svg = readFileSync(p, 'utf8');
    assert.ok(svg.startsWith('<svg '), `${s.value}.svg нь <svg>-ээр эхлээгүй ✗`);
    // ⚠️ viewBox БАЙХ ЁСТОЙ — үгүй бол `img` нь 44/56px-д тэгш хуваагдахгүй ✓
    assert.match(svg, /viewBox="0 0 200 200"/, `${s.value}.svg: viewBox 200×200 биш ✗`);
    // ⚠️ ГАДНЫ файл дуудахгүй (offline / R2-гүй орчинд ч зурагдана ✓)
    assert.ok(!/<image |xlink:href|<use /.test(svg), `${s.value}.svg гадны/дотоод линк ашиглаж байна ✗`);
    // ⚠️ ТЕКСТ БИЧИХГҮЙ — нэр нь HTML-ийн label (i18n/фолбэк алдаа гарахгүй ✓)
    assert.ok(!/<text/.test(svg), `${s.value}.svg дотор <text> байна ✗`);
  });
  // ⚠️ ЗӨВХӨН 12 — нэр солиход үлдсэн «өнчин» зураг баригдана ✓
  const files = readdirSync(new URL('../public/categories/', import.meta.url)).filter((f) => f.endsWith('.svg'));
  assert.equal(files.length, 12, `public/categories/ дотор ${files.length} svg байна (12 байх ёстой) ✗`);
});

t('🎨 `tileBg` — 12 хэсэгт БАЙНА, HEX формат, 12 нь ЯЛГААТАЙ пастел өнгө', () => {
  const tones = SECTIONS.map((s) => s.tileBg);
  SECTIONS.forEach((s, i) => assert.match(String(tones[i]), /^#[0-9A-F]{6}$/, `${s.value}: tileBg «${tones[i]}» HEX биш ✗`));
  // ⚠️ Хөрш хэсгүүд ижил өнгөтэй бол сүлжээ нэгэн хэвийн харагдана ✗
  assert.equal(new Set(tones).size, 12, 'tileBg давхардсан (2 хэсэг ижил өнгө) ✗');
  // ⚠️ ПАСТЕЛ (цайвар) байх ёстой — ханасан өнгө дээр ЦАГААН зураг уусана ✗
  tones.forEach((c, i) => {
    const sum = parseInt(c.slice(1, 3), 16) + parseInt(c.slice(3, 5), 16) + parseInt(c.slice(5, 7), 16);
    assert.ok(sum >= 500, `${SECTIONS[i].value}: tileBg «${c}» ХЭТ ХАНАСАН (≈пастел биш) ✗`);
  });
});

t('🖼 HomeClient: tile нь `<img>` (emoji БИШ) + нэр нь ДООР + КАРТ АРИЛСАН', () => {
  const home = readFileSync(new URL('../components/HomeClient.jsx', import.meta.url), 'utf8');
  // ⚠️ `className` нь `aria-label`-аас ӨМНӨ байдаг тул зүсэлт нь `tile-grid`-ээс ✓
  const at = home.indexOf('className="tile-grid');
  assert.ok(at > 0, 'tile-ийн сүлжээ (`className="tile-grid`) алга ✗');
  const grid = home.slice(at, home.indexOf('</section>', at));
  assert.match(grid, /aria-label="Зарын хэсэг"/, '`aria-label="Зарын хэсэг"` алга ✗');
  assert.match(grid, /role="tablist"/, '`role="tablist"` алга ✗');
  // ① ЗУРАГ: сүлжээний УТГААР зам тавина (12 хэсэг = 12 файл ✓)
  assert.match(grid, /data-tile-img/, '`data-tile-img` тэмдэг алга (CDP барихгүй) ✗');
  assert.match(grid, /<img\b/, 'tile нь `<img>` ашиглаагүй ✗');
  assert.match(grid, /src=\{`\/categories\/\$\{s\.value\}\.svg`\}/, 'зургийн зам `/categories/<value>.svg` биш ✗');
  // ② emoji БАЙХГҮЙ — tile нь зөвхөн ЗУРАГ + НЭР (⏳ `{s.icon}` байв ✗)
  assert.ok(!/\{s\.icon\}/.test(grid), 'tile дотор emoji (`{s.icon}`) ҮЛДСЭН ✗');
  // ③ ӨНГӨ: пастел дугуй — `tileBg` (нэг эх сурвалж) ✓
  assert.match(grid, /data-tile-badge/, '`data-tile-badge` тэмдэг алга (CDP барихгүй) ✗');
  assert.match(grid, /style=\{\{ backgroundColor: s\.tileBg \}\}/, 'дугуйн өнгө нь `s.tileBg` биш ✗');
  assert.match(grid, /rounded-full/, 'дугуй (`rounded-full`) биш ✗');
  // ④ КАРТ/ХҮРЭЭ/СҮҮДЭР БАЙХГҮЙ (хэрэглэгчийн жишээ зурагт карт байхгүй ✓)
  assert.ok(!/shadow-card|shadow-sm|shadow-md|border-2|min-h-\[104px\]/.test(grid),
    'хуучин КАРТ (сүүдэр/хүрээ) үлдсэн ✗');
  // ⑤ ДАРААЛАЛ: зураг ЭХЭНД, нэр ДООР нь (⏳ зураг доор нь байх ёстой ✓)
  const imgAt = grid.indexOf('<img');
  const labelAt = grid.lastIndexOf('{s.label}');
  assert.ok(imgAt > 0 && labelAt > imgAt, 'нэр нь зургийн ДООР биш ✗');
  assert.match(grid, /<span\b[\s\S]*?>\s*\{s\.label\}\s*<\/span>/, 'нэрийн `<span>{s.label}</span>` олдсонгүй ✗');
  // ⑥ СҮЛЖЭЭ: 3 (моб) → 4 (sm) → 6 (lg) багана
  assert.match(grid, /grid-cols-3[^"]*sm:grid-cols-4[^"]*lg:grid-cols-6/, 'баганын тоо 3/4/6 биш ✗');
  // ⑦ A11Y + CDP ГЭРЭЭ: `role="tab"` + `title` ХЭВЭЭР (cdp:sections/cdp:services ✓)
  assert.match(grid, /role="tab"/, '`role="tab"` алга ✗');
  assert.match(grid, /aria-selected=\{on\}/, '`aria-selected` алга ✗');
  assert.match(grid, /title=\{s\.label\}/, '`title={s.label}` алга (CDP гэрээ) ✗');
  assert.match(grid, /data-section-value=\{s\.value\}/, '`data-section-value` алга ✗');
});

t('🎨 `icon` (emoji) нь tile-ээс ГАДНА ХЭВЭЭР (форм/attr мөр) — 12 хэсэг бүрд', () => {
  assert.equal(SECTIONS.filter((s) => !s.icon).length, 0, '`icon` нь заавал байх ёстой ✗');
  const add = readFileSync(new URL('../components/AddListingClient.jsx', import.meta.url), 'utf8');
  // ⚠️ Зарын форм нь `SECTIONS[].icon`-ыг ХЭВЭЭР уншина (emoji-г ХӨНДӨӨГҮЙ ✓)
  assert.match(add, /icon: s\.icon/, 'форм нь `SECTIONS[].icon`-ыг ашиглахаа больсон ✗');
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);




