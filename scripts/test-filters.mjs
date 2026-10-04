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
  pruneGatedAttrs,   // 🖥 2026-10-03 (7): хүчингүй болсон attr шүүлтийг цэвэрлэх
  NOTEBOOK_SCREEN_OPTIONS, NOTEBOOK_CPU_OPTIONS, NOTEBOOK_RAM_OPTIONS, NOTEBOOK_STORAGE_OPTIONS,
  CAR_BRANDS,   // 🚗🌈 2026-10-01: CAR_MODELS-ийн түлхүүрүүд энд байгаа эсэхийг шалгана
  getAttrRows,  // 📋 2026-10-01 (16): зарын дэлгэрэнгүй хуудсанд `attrs` 2 баганаар
  // 💼 2026-10-03 (9): ажлын зарын шинэ талбарууд + «Цалин/Үнэ» үг
  JOB_TIME_OPTIONS, JOB_EXPERIENCE_OPTIONS, JOB_ADVERTISER_OPTIONS,
  JOB_LEVEL_OPTIONS, JOB_SALARY_TYPE_OPTIONS, priceWord, isJobsSection,
  // 🖥📱 2026-10-04: нүүр хуудсны хэсгийн панелийн «Зарах / Түрээслэх» сонголт
  getSectionCategoryChoices, getSectionCategories,
} from '../lib/locationData.js';
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
  // ① Талбар нь формоос (`attrFields`) олдоно: unegui.mn-ийн ЯГ ИЖИЛ 2 сонголт
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

t('🚙 Загвар нь ЧӨЛӨӨТ ТЕКСТ шүүлт (filterable, select БИШ)', () => {
  const f = getAttrFilters('auto').find((x) => x.key === 'model');
  assert.equal(f.type, 'text');
  assert.equal(f.filterable, true);
  assert.equal(f.range, undefined);
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

t("Бусад хэсгийн шүүлт (jobs: 3, computers: 1, furniture/home/travel: 1, electric: 1, 🧱 1, 🏭 1, services: 3)", () => {
  const count = (s) => getAttrFilters(s).length;
  assert.equal(count('jobs'), 3);
  // 🛡️ 2026-10-01 (18): 💻 computers — 🛡️ «Баталгаа» (`warranty`) ХАСАГДСАН (3 → 2) ✓
  //    🖥 2026-10-03 (7): `attrFilters` нь 6 болов (📺/⚙️/🧠/💾 нэмэгдэв) — гэхдээ
  //       тэдгээр нь `onlySubtypes`-тай тул ДЭД ТӨРӨЛГҮЙ дуудлагад ОРОХГҮЙ ⇒ 2 ✓
  //       (Notebook брэнд дээр 6 — доорх «🖥» тестүүд ✓)
  //    🏷️ 2026-10-03 (20): 🏷️ «Брэнд» Ч `filterSubtypes`-тай ⇒ дэд төрөлгүй
  //       дуудлагад 1 л үлдэв (✅ Шинэ / Шинэвтэр / Хуучин) ✓
  assert.equal(count('computers'), 1);
  assert.equal(getAttrFilters('computers', 'Dell').length, 6);
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
t('⚽ hobby: ЗӨВХӨН «Шинэ / Шинэвтэр / Хуучин» (condition) шүүлттэй', () => {
  const keys = getAttrFilters('hobby').map((f) => f.key);
  assert.deepEqual(keys, ['condition']);
  const f = getAttrFilters('hobby')[0];
  assert.equal(f.label, 'Шинэ / Шинэвтэр / Хуучин');
  // ✅ 2026-10-02 (хэрэглэгчийн шаардлага): ЯГ 3 сонголт — 2026-09-29-д 2 байв
  assert.deepEqual(f.options, ['Шинэ', 'Шинэвтэр', 'Хуучин']);
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
    assert.equal(field.label, 'Шинэ / Шинэвтэр / Хуучин', `${s.value}: формоны нэр`);
    assert.deepEqual(field.options, ['Шинэ', 'Шинэвтэр', 'Хуучин'], `${s.value}: формоны сонголт`);
    /**
     * 🆕 2026-10-03 (21): хайлтын шүүлт нь ОЛОН СОНГОЛТТОЙ ЧИП (`chips`+`multi`,
     * «✅ 2 төлөв» шошго) — ⚠️ ФОРМ ХӨНДӨӨГДӨӨГҮЙ (`formChips` туг БАЙХГҮЙ тул
     * 3-р алхамд хэвээр `<select>` — `components/AddListingClient.jsx` ✓).
     * Дэлгэрэнгыг `scripts/test-attr-multi.mjs` (22 тест ✓) түгждэг
     */
    assert.equal(field.chips, true, `${s.value}: sidebar чип болоогүй ✗`);
    assert.equal(field.multi, true, `${s.value}: олон сонголт болоогүй ✗`);
    assert.equal(field.multiNoun, 'төлөв', `${s.value}: «N төлөв» шошго ✗`);
    assert.ok(!field.formChips, `${s.value}: форм дээр чип болжээ ✗`);
    // Шүүлтэд харагдах хувилбар нь МӨН ижил байх ёстой (нэг эх сурвалж ✓)
    const filter = getAttrFilters(s.value).find((f) => f.key === 'condition');
    if (filter) {
      assert.equal(filter.label, 'Шинэ / Шинэвтэр / Хуучин', `${s.value}: шүүлтийн нэр`);
      assert.deepEqual(filter.options, ['Шинэ', 'Шинэвтэр', 'Хуучин'], `${s.value}: шүүлтийн сонголт`);
      // 🆕 2026-10-03 (21): чип тугууд нь sidebar-ийн шүүлтэд ч ИЖИЛ ✓
      assert.equal(filter.chips, true, `${s.value}: шүүлт чип биш ✗`);
      assert.equal(filter.multi, true, `${s.value}: шүүлт нэг утгатай ✗`);
      assert.equal(filter.multiNoun, 'төлөв');
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
t('🛋️ home: ЗӨВХӨН «Шинэ / Шинэвтэр / Хуучин» шүүлттэй — 🚚 Хүргэлт ХАСАГДСАН', () => {
  const keys = getAttrFilters('home').map((f) => f.key);
  assert.deepEqual(keys, ['condition']);
  const f = getAttrFilters('home')[0];
  assert.equal(f.label, 'Шинэ / Шинэвтэр / Хуучин');
  assert.deepEqual(f.options, ['Шинэ', 'Шинэвтэр', 'Хуучин']);
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
  // 🛡️ 2026-10-01 (18): `warranty` ХАСАГДСАН → сүүлийн талбар нь `condition` ✓
  assert.deepEqual(getAttrFields('computers', 'Apple').map((f) => f.key),
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
  assert.deepEqual(getAttrFilters('computers', 'Apple').map((f) => f.key),
    ['brand', 'screen', 'cpu', 'ram', 'storage', 'condition']);
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
  // 🛡️ 2026-10-01 (18): `warranty` ХАСАГДСАН — үлдсэн 3 талбар ✓
  const base = ['brand', 'model', 'condition'];
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

// ---------- 🖥 2026-10-03 (7): 💻 NOTEBOOK-ИЙН ШҮҮЛТ SIDEBAR-д ----------
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (unegui.mn-ийн Notebook хайлтын зураг): «notebook хайх
// дээр Дэлгэцийн хэмжээ · CPU · RAM · SSD Hard шүүлтүүд гардаг байх».
// ⚠️ Шүүлт нь ФОРМТОЙ нэг эх сурвалж (`attrFields`/`attrFilters` + `onlySubtypes`)
//    тул дараах тестүүд 2 үүрэг хамгаална: ① Notebook дээр шүүлт ХАРАГДАХ
//    ② холдуу дэд төрөл (Mouse, тонер, чихэвч) ба дэд төрөл СОНГООГҮЙ үед ГАРАХГҮЙ
t("🖥 getAttrFilters('computers', 'Apple') — 📺/⚙️/🧠/💾 шүүлт НЭМЭГДЭВ (формтой ижил дараалал)", () => {
  const keys = getAttrFilters('computers', 'Apple').map((f) => f.key);
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
    const f = getAttrFilters('computers', 'Lenovo').find((x) => x.key === key);
    assert.ok(f, `«${key}» шүүлт ОЛДСОНГҮЙ ✗`);
    assert.equal(f.options, options, `«${key}»: сонголт нь либын экспорт БИШ (давхар хуулбар) ✗`);
    assert.equal(f.type, 'select', `«${key}»: энгийн сонголт (select) биш ✗`);
    // ⚠️ `searchable` БИШ — утга нь ЯГ тэнцүү (`attrs->>cpu=eq.…`); 6–19 сонголт
    //    богино тул combobox шаардлагагүй ✓ (форм ч `<select>` хэвээр)
    assert.equal(f.searchable, undefined, `«${key}»: combobox болсон ✗`);
  }
});

t('🖥 21 Notebook брэнд + 2 PC дэд төрөлд 4 шүүлт; ХОЛДУУ дэд төрөл ба СОНГООГҮЙ үед 0', () => {
  const spec = ['screen', 'cpu', 'ram', 'storage'];
  for (const sub of PC_SPEC_SUBTYPES) {
    assert.deepEqual(getAttrFilters('computers', sub).map((f) => f.key),
      ['brand', ...spec, 'condition'], `«${sub}»`);
  }
  // 🏷️ 2026-10-03 (20): холдуу дэд төрөл дээр 🏷️ «Брэнд» Ч ХАРАГДАХГҮЙ
  //    (`filterSubtypes` — Notebook-ийн гэр бүлд л шүүлт болно ✓)
  for (const sub of ['', 'Бусад', 'Mouse', 'Keyboard', 'Xbox', 'Чихэвч', 'Дэлгэц',
    'Принтер, Хувилагч, Сканнер, Ламинатор', 'iPad, Tablet, Kindle']) {
    assert.deepEqual(getAttrFilters('computers', sub).map((f) => f.key),
      ['condition'], `«${sub || '(хоосон)'}»: холдуу шүүлт гарч байна ✗`);
  }
});

// ---------- 🏷️ 2026-10-03 (20): 💻 «БРЭНД» НЬ ЗӨВХӨН ХАЙЛТАД хязгаарлагдав ----------
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Notebook ээс бусад хайлтын хэсэгт Брэнд гэж
// баймааргүй байна даа» ⇒ 🏷️ «Брэнд» нь `filterSubtypes: PC_SPEC_SUBTYPES` тугтай
// болж, SIDEBAR (хайлт)-д ЗӨВХӨН Notebook-ийн гэр бүлд гарна — ⚠️ ФОРМ
// ХӨНДӨӨГДӨХГҮЙ (iPad/принтер/Mouse дээр Брэнд бичих боломж ХЭВЭЭР ✓)
t('🏷️ 💻 «Брэнд» — ХАЙЛТАД Notebook-ийн гэр бүлд л; ФОРМ ХӨНДӨГДӨӨГҮЙ', () => {
  const brand = getAttrField('computers', 'brand');
  // ① Талбар нь `filterSubtypes`-тай (sidebar-only хязгаарлалт)
  assert.deepEqual(brand.filterSubtypes, PC_SPEC_SUBTYPES);
  assert.equal(brand.onlySubtypes, undefined, 'форм хөндөгдөх ёстой ✗');
  assert.equal(brand.searchable, true, 'хайлттай combobox хэвээр байх ёстой ✗');
  // ② Хайлт (sidebar): зөвхөн Notebook-ийн гэр бүлд
  for (const sub of PC_SPEC_SUBTYPES) {
    assert.ok(getAttrFilters('computers', sub).some((f) => f.key === 'brand'), `«${sub}»: Брэнд алга ✗`);
  }
  for (const sub of ['', 'Mouse', 'Keyboard', 'Дэлгэц', 'iPad, Tablet, Kindle',
    'Принтер, Хувилагч, Сканнер, Ламинатор', 'Принтер, Хувилагчийн хор',
    'PS, XBox, Nintendo тоглоом суулгана', 'Чихэвч', 'Бусад сэлбэг']) {
    assert.ok(!getAttrFilters('computers', sub).some((f) => f.key === 'brand'),
      `«${sub || '(хоосон)'}»: ХАЙЛТАД Брэнд гарч байна ✗`);
  }
  // ③ Форм: БҮХ дэд төрөлд хэвээр (зөвхөн sidebar хязгаарлагдав)
  for (const sub of ['', 'Mouse', 'iPad, Tablet, Kindle', 'Дэлгэц', 'Apple']) {
    assert.ok(getAttrFields('computers', sub).some((f) => f.key === 'brand'),
      `«${sub || '(хоосон)'}»: формоос Брэнд алга болсон ✗`);
  }
  // ④ `getAttrField` (картын мөр/«Зарын дэлгэрэнгүй») ХӨНДӨГДӨӨГҮЙ
  assert.equal(getAttrField('computers', 'brand').label, 'Брэнд');
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

t('🖥 Бусад 11 хэсгийн шүүлт ХӨНДӨГДӨӨГҮЙ (subtype дамжуулсан ч ЯГ ижил)', () => {
  for (const s of SECTIONS) {
    if (s.value === 'computers') continue;
    const sub = getSubtypes(s.value)[0] || '';
    assert.deepEqual(getAttrFilters(s.value, sub).map((f) => f.key),
      getAttrFilters(s.value).map((f) => f.key),
      `${s.value}: дэд төрөл дамжуулахад шүүлт өөрчлөгдөж байна ✗`);
    assert.ok(!(s.attrFields || []).some((f) => Array.isArray(f.onlySubtypes)), `${s.value}`);
  }
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
  assert.equal(pruneGatedAttrs('computers', 'Apple', attrs), attrs);
  // ⚠️ Дэд төрөл СОНГООГҮЙ (`''`) үед ч 5 шүүлт харагдахгүй ⇒ хасагдана
  //    (🏷️ 2026-10-03 (20): `filterSubtypes` — brand ч мөн ✓)
  assert.deepEqual(pruneGatedAttrs('computers', '', attrs), {});
});

t('🖥 pruneGatedAttrs: хүрээний түлхүүр, формойн `model`, бусад 11 хэсэг ХӨНДӨГДӨХГҮЙ + КРАШГҮЙ', () => {
  const auto = { brand: 'Toyota', model: 'Prius 30', year_from: '2015', year_to: '2020' };
  assert.equal(pruneGatedAttrs('auto', 'Суудлын машин', auto), auto);
  // ⚠️ 12 хэсэгт `onlySubtypes`/`filterSubtypes` БАЙХГҮЙ ⇒ ямар ч түлхүүр
  //    хасагдахгүй ✓ (💻-ийн эхний дэд төрөл «Иж бүрэн компьютер» нь
  //    `PC_SPEC_SUBTYPES`-д багтах тул 🏷️ brand ч хэвээр ✓)
  SECTIONS.forEach((s) => {
    const a = { brand: 'x', model: 'y', year_from: '2015' };
    assert.equal(pruneGatedAttrs(s.value, getSubtypes(s.value)[0] || '', a), a, s.value);
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

t('🧱/🏭 Хялбар форм (🛋️/⚡/⚽-той ижил): зөвхөн «Шинэ / Шинэвтэр / Хуучин» шүүлт', () => {
  for (const s of ['construction', 'equipment']) {
    assert.equal(hasSimpleForm(s), true);
    assert.deepEqual(getAttrFilters(s).map((f) => f.key), ['condition']);
    assert.deepEqual(getSection(s).attrFields.map((f) => f.key), ['condition']);
    const f = getAttrFilters(s)[0];
    assert.equal(f.label, 'Шинэ / Шинэвтэр / Хуучин');
    assert.deepEqual(f.options, ['Шинэ', 'Шинэвтэр', 'Хуучин']);
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

t('💼 jobs: 2 түвшин, 3 шүүлт (🕒 чип · 📊 · 📈), хялбар форм БИШ', () => {
  assert.equal(getSection('jobs').label, 'Ажлын зар');
  assert.equal(getSection('jobs').icon, '💼');
  assert.deepEqual(getAttrFilters('jobs').map((f) => f.key), ['jobType', 'experience', 'jobLevel']);
  // 🕒 «Ажлын цаг» нь ЧИП (`chips: true`) — бусад 2 нь энгийн select ✓
  assert.equal(getAttrField('jobs', 'jobType').chips, true);
  assert.equal(getAttrField('jobs', 'experience').chips, undefined);
  assert.equal(getAttrField('jobs', 'jobLevel').chips, undefined);
  // 🎛 2026-10-03 (11): ФОРМ дээр 4 талбар нь чип (`formChips`) —
  //    ⚠️ энэ нь sidebar-ийн `chips`-ээс ТУСДАА туг (sidebar хөндөгдөхгүй ✓)
  ['jobType', 'experience', 'advertiser', 'jobLevel'].forEach((k) => {
    assert.equal(getAttrField('jobs', k).formChips, true, `${k}.formChips ✗`);
  });
  assert.equal(getAttrField('jobs', 'salaryType').formChips, undefined);
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

t('📋 getAttrRows — 💻 Notebook-ийн 📺/⚙️/🧠/💾 ГАРНА, Mouse дээр ГАРАХГҮЙ', () => {
  // ⚠️ `warranty` нь DB-д БАЙЖ болзошгүй ХУУЧИН утга (2026-10-01 (18)-д
  //    форм/шүүлтээс ХАСАГДСАН) — 2 баганат хүснэгтэд ГАРАХГҮЙ ЁСТОЙ ✓
  const attrs = { brand: 'Lenovo', model: 'ThinkPad T14', screen: '14 инч', cpu: 'Intel Core i5', ram: '16 GB', storage: '512 GB', condition: 'Шинэ', warranty: 'Байгаа' };
  // ① Notebook (дэд төрөл = брэнд) → бүх 7 мөр, дараалал нь attrFields ✓
  const nb = getAttrRows('computers', attrs, 'Lenovo');
  assert.deepEqual(nb.map((r) => r.key), ['brand', 'model', 'screen', 'cpu', 'ram', 'storage', 'condition']);
  assert.ok(!nb.some((r) => r.key === 'warranty'), '🛡️ `warranty` харагдаж байна ✗');
  // ② Mouse (дэд төрөл) → 4 үзүүлэлт ХАРАГДАХГҮЙ (картын мөртэй ижил `onlySubtypes` ✓)
  const mouse = getAttrRows('computers', attrs, 'Хулгана, Mouse');
  assert.deepEqual(mouse.map((r) => r.key), ['brand', 'model', 'condition']);
});

// ---- ⑥-з 🛡️ 2026-10-01 (18): «Баталгаат хугацаа» (`warranty`) БҮРЭН ХАСАГДАВ ----
// Хэрэглэгчийн хүсэлт: «Баталгаат хугацаа ч билүү тэрийг хассан шүү».
// ⚠️ `warranty` («🛡️ Баталгаа» — Байгаа / Байхгүй) нь 💻 Компьютер хэсгийн бие
//    даасан талбар байв — ФОРМ (`attrFields`) ба SIDEBAR (`attrFilters`)
//    ХОЁУЛААС гарна; 🔀 «Хөтлөгч» (`drive`)-ийн 2026-10-01-ний хасалттай
//    ЯГ ИЖИЛ зарчим (хуучин заруудын `attrs.warranty` DB-д хэвээр ✓).

t('🛡️ 💻 «Баталгаа» (`warranty`) форм · шүүлт · карт · дэлгэрэнгүй ГУРВААС ХАСАГДАВ', () => {
  // ① Форм: аль ч дэд төрөлд талбар БАЙХГҮЙ (Notebook ба салбар бүгд) ✓
  for (const sub of ['Apple', 'Иж бүрэн компьютер', 'Процессор, сервер', 'Mouse', '']) {
    assert.ok(!getAttrFields('computers', sub).some((f) => f.key === 'warranty'),
      `«${sub || '(хоосон)'}»: формоос хасагдаагүй ✗`);
  }
  // ② Sidebar: `?warranty=` шүүлт БАЙХГҮЙ ✓
  //    🖥 2026-10-03 (7): 📺/⚙️/🧠/💾 нэмэгдсэн ч `warranty` БУЦАЖ ОРООГҮЙ ✓
  //    🏷️ 2026-10-03 (20): 🏷️ «Брэнд» нь `filterSubtypes`-тай болов ⇒ дэд
  //       төрөл дамжуулахгүй үед ЗӨВХӨН `condition` үлдэнэ ✓
  assert.ok(!getAttrFilters('computers').some((f) => f.key === 'warranty'));
  assert.deepEqual(getAttrFilters('computers').map((f) => f.key), ['condition']);
  assert.ok(!getAttrFilters('computers', 'HP').some((f) => f.key === 'warranty'));
  // ③ `getAttrField` нь `null` → карт ба «Зарын дэлгэрэнгүй» хоёулаа алгасна ✓
  assert.equal(getAttrField('computers', 'warranty'), null);
  // ④ Хуучин заруудын `attrs.warranty` (DB-д 💻 690 зар, нийт 700) ДҮРСЛЭГДЭХГҮЙ ✓
  const old = { brand: 'Lenovo', model: 'ThinkPad T14', condition: 'Шинэ', warranty: 'Байгаа' };
  assert.equal(formatAttrsLine('computers', old), 'Lenovo ThinkPad T14 · ✅ Шинэ');
  assert.deepEqual(getAttrRows('computers', old, 'Lenovo').map((r) => r.key),
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

t('🖥📱 getSectionCategoryChoices — үл хөдлөхөд ЯГ 3 (sell→rent→all), бусад 11 хэсэгт `[]`', () => {
  // ⚠️ 2026-10-04 (хэрэглэгчийн хүсэлт): «🏠 Үл хөдлөх» рүү орох үед
  //    «💰 Зарах / 🔑 Түрээслэх» гэсэн БОГИНО шошго БИШ, «Үл хөдлөх зарна /
  //    Үл хөдлөх түрээслүүлнэ» гэсэн БҮТЭН шошго — ба «Бүгд» ХАМГИЙН СҮҮЛД
  assert.deepEqual(getSectionCategoryChoices('real-estate'), [
    { value: 'sell', label: 'Үл хөдлөх зарна', shortLabel: 'Зарна' },
    { value: 'rent', label: 'Үл хөдлөх түрээслүүлнэ', shortLabel: 'Түрээслүүлнэ' },
    { value: 'all', label: 'Бүгд', shortLabel: 'Бүгд' },
  ]);
  // ⚠️ Дараалал нь `CATEGORIES` массив (`[all, sell, rent]`) БИШ —
  //    «Бүгд» ХАМГИЙН СҮҮЛД байх ЁСТОЙ ✓
  const vals = getSectionCategoryChoices('real-estate').map((c) => c.value);
  assert.deepEqual(vals, ['sell', 'rent', 'all']);
  // ⚠️ `CATEGORIES` ХӨНДӨӨГДӨӨГҮЙ (форм хуучнаараа) — зөвхөн нүүр хуудсны туслах
  assert.deepEqual(getSectionCategories('real-estate').map((c) => c.value), ['all', 'sell', 'rent']);
  // ⚠️ Бусад 11 хэсэгт категори сонголт БАЙХГҮЙ ⇒ `[]` (крашгүй ✓)
  SECTIONS.filter((s) => s.value !== 'real-estate')
    .forEach((s) => assert.deepEqual(getSectionCategoryChoices(s.value), [], s.value));
});

t('🖥 ГЭРЭЭ: HomeClient — категори нь `segmented` + `getSectionCategoryChoices` + `data-category-value`', () => {
  const home = readFileSync(new URL('../components/HomeClient.jsx', import.meta.url), 'utf8');
  // ① Шошго/дараалал нь НЭГ ЭХ СУРВАЛЖААС (`lib/locationData.js`) — хатуу бичсэн нэр БАЙХГҮЙ ✓
  assert.ok(/getSectionCategoryChoices\(section\)/.test(home),
    'HomeClient нь `getSectionCategoryChoices`-г дуудахгүй ✗');
  assert.ok(!/getSectionCategories\(/.test(home),
    'хуучин `getSectionCategories` дуудлага ҮЛДСЭН байна ✗');
  assert.ok(/data-category-value=\{c\.value\}/.test(home),
    'CDP дэгээ (`data-category-value`) алга ✗');
  // ② Харагдац нь `.segmented` (unegui.mn-ийн «Зарна / Түрээслүүлнэ» хэв) ✓
  assert.ok(/className="segmented"/.test(home), '`segmented` контроль алга ✗');
  assert.ok(/segmented-item-active/.test(home), 'идэвхтэй сегментийн класс алга ✗');
  assert.ok(/aria-pressed=\{active\}/.test(home), '`aria-pressed` алга ✗');
  // ③ 📱 <640px богино шошго / 🖥 ≥640px бүтэн шошго (390px дээр гүйлэхгүй ✓)
  assert.ok(/hidden sm:inline/.test(home) && /sm:hidden/.test(home),
    'шошгын мобайл/десктоп солилт алга ✗');
  // ④ Хуучин БОГИНО шошго (`💰 Зарах` / `🔑 Түрээслэх`) нүүр хуудснаас БҮРЭН ХАСАГДАВ ✓
  assert.ok(!/💰 Зарах/.test(home) && !/🔑 Түрээслэх/.test(home),
    'хуучин категори шошго нүүр хуудсанд ҮЛДСЭН байна ✗');
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);




