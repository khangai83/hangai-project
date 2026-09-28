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
  parseAttrRangeKey, getAttrRangeKeys, formatAttrsLine, getSection,
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

t("Бусад хэсгийн шүүлт ХЭВЭЭР (jobs: 3, computers: 3, home: 2, services: 3)", () => {
  const count = (s) => getAttrFilters(s).length;
  assert.equal(count('jobs'), 3);
  assert.equal(count('computers'), 3);
  assert.equal(count('home'), 2);
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

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);
