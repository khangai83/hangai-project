// ============================================================
// test-breadcrumb.mjs — BREADCRUMB-ийн логикийн тест (lib/breadcrumb.js)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ (2026-10-01):
//   `buildListingBreadcrumb` нь `listing.section`-ийг ОГТ тооцохгүй «Үл хөдлөх /
//   Үл хөдлөх зарна» гэж ХАТУУ бичсэн байв ✗ → `auto` хэсгийн зар (ж: «Суудлын
//   машин») дэлгэрэнгүй хуудсанд «Бүх зар › Үл хөдлөх › Үл хөдлөх зарна ›
//   Суудлын машин» гэж БУРУУ гарч, хэрэглэгч «худлаа» гэж гомдоллов.
//   Энэ тест ХЭСЭГ тус бүрийн замыг түгжиж, ийм буруу давхарлалтыг дахин
//   үүсэхээс сэргийлнэ ✓
//
//   🆕 2026-10-01 (15): сүүлийн crumb Ч ЛИНК болов (хэрэглэгчийн хүсэлт:
//   «Суудлын машин гэдэг дээр дархад Суудлын машин-ны зарлуу ордог байх, бусад
//   хэсгүүд ч мөн адил болгоорой») → ⑤ блок сүүлийн мөрийн `linkLast` + `href`-ийг
//   БҮХ 12 хэсэгт шалгана ✓
//
// АЖИЛЛУУЛАХ:  npm run test:breadcrumb
//
// ⚠️ ТЕХНИКИЙН ТЭМДЭГЛЭЛ: `lib/breadcrumb.js` нь `./locationData`-г
//    ӨРГӨТГӨЛГҮЙ (extensionless) импортолдог тул Node-ийн ESM resolver шууд
//    ажиллахгүй. `test-format.mjs`-ийн АДИЛ аргаар зөвхөн тэр импортын мөрийг
//    засаж (`.js` нэмж), `lib/` дотор түр `.mjs` файл үүсгэн ачаална
//    (түр файл нь `lib/` дотор байх ёстой — эс бөгөөс `./locationData.js`
//    харьцангуй зам эвдэрнэ ✗).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(here, '..', 'lib', 'breadcrumb.js');
const raw = fs.readFileSync(SRC, 'utf8');
// ⚠️ Зөвхөн extensionless импортыг засна (`.mjs` нь хэвээр — заавал биш)
const patched = raw.replace(/from '\.\/locationData';/g, "from './locationData.js';");
assert(!/from '\.\/locationData';/.test(patched), 'extensionless импорт засагдах ёстой');
const tmp = path.join(here, '..', 'lib', '.breadcrumb.test.tmp.mjs');
fs.writeFileSync(tmp, patched);

const { buildListingBreadcrumb, buildHomeBreadcrumb } = await import(`${tmp}?t=${Date.now()}`);
fs.unlinkSync(tmp);

// ⑤-ийн тест: БҮХ хэсгийг (12) шалгахын тулд жинхэнэ `SECTIONS`-ийг ачаална
// ⚠️ Гараар дэд төрөл бичихгүй — `lib/locationData.js` (нэг эх сурвалж) ✓
// ⚠️ Extensionless биш (`.js`) тул шууд import хийж болно (`lib/carModels.mjs`-ийг
//    өөрөө зөв заадаг ✓). Query БАЙХГҮЙ — доорх breadcrumb-ийн temp файлтай
//    НЭГ модулийн кэш (`locationData.js`) ашиглана ✓
const { SECTIONS } = await import(new URL('../lib/locationData.js', import.meta.url).href);

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};
const labels = (items) => items.map((i) => i.label);

console.log('\n🧪 Breadcrumb (lib/breadcrumb.js)\n');

t('buildListingBreadcrumb: хоосон/`null` → []', () => {
  assert.deepEqual(buildListingBreadcrumb(null), []);
  assert.deepEqual(buildListingBreadcrumb(undefined), []);
});

// ============================================================
// ① 🏠 ҮЛ ХӨДЛӨХ — ХУУЧИН зан төлөв ХӨНДӨӨГДӨХГҮЙ (regress-ийн хамгаалалт)
// ============================================================
t('🏠 үл хөдлөх ЗАРАХ: Бүх зар › Үл хөдлөх › Үл хөдлөх зарна › Орон сууц зарна › 3 өрөө', () => {
  const items = buildListingBreadcrumb({
    section: 'real-estate', category: 'sell', property_type: 'Орон сууц', rooms: 3,
  });
  assert.deepEqual(labels(items), [
    'Бүх зар', 'Үл хөдлөх', 'Үл хөдлөх зарна', 'Орон сууц зарна', '3 өрөө',
  ]);
  // 🔗 2026-10-01 (15): сүүлийн мөр Ч линк — `linkLast: true` + href байх ЁСТОЙ
  // (`Breadcrumb.jsx` → `clickable = !!href && (!isLast || !!linkLast)`)
  assert.equal(items[items.length - 1].linkLast, true);
});

t('🏠 үл хөдлөх ТҮРЭЭСЛЭХ: «түрээслүүлнэ» хувилбар', () => {
  const items = buildListingBreadcrumb({
    section: 'real-estate', category: 'rent', property_type: 'Орон сууц', rooms: 2,
  });
  assert.deepEqual(labels(items), [
    'Бүх зар', 'Үл хөдлөх', 'Үл хөдлөх түрээслүүлнэ', 'Орон сууц түрээслүүлнэ', '2 өрөө',
  ]);
});

t('🏠 үл хөдлөх: өрөө 0/хоосон бол «… өрөө» мөр НЭМЭГДЭХГҮЙ', () => {
  const items = buildListingBreadcrumb({
    section: 'real-estate', category: 'sell', property_type: 'Газар', rooms: 0,
  });
  assert.deepEqual(labels(items), ['Бүх зар', 'Үл хөдлөх', 'Үл хөдлөх зарна', 'Газар зарна']);
});

t('🏠 `section` байхгүй (хуучин зар) → үл хөдлөх гэж үзнэ (fallback)', () => {
  const items = buildListingBreadcrumb({ category: 'sell', property_type: 'Орон сууц' });
  assert.deepEqual(labels(items), ['Бүх зар', 'Үл хөдлөх', 'Үл хөдлөх зарна', 'Орон сууц зарна']);
});

// ============================================================
// ② 🚗 БУСАД ХЭСЭГ — ГОМДОЛЫН ГОЛ КЕЙС (зассан алдаа)
// ============================================================
t('🚗 auto «Суудлын машин»: Бүх зар › Автомашин › Суудлын машин  (ҮЛ ХӨДЛӨХ БАЙХГҮЙ!)', () => {
  const items = buildListingBreadcrumb({
    section: 'auto', category: 'sell', property_type: 'Суудлын машин',
  });
  assert.deepEqual(labels(items), ['Бүх зар', 'Автомашин', 'Суудлын машин']);
  // ⚠️ ГОМДОЛЫН ГОЛ ШАЛГАЛТ: «Үл хөдлөх» гэсэн crumb ОГТ БАЙХГҮЙ ✓
  assert.ok(!labels(items).some((l) => l.includes('Үл хөдлөх')), '«Үл хөдлөх» байх ёсгүй');
  assert.ok(!labels(items).join(' ').includes('зарна'), '«… зарна» гэж БАЙХ ЁСГҮЙ');
});

t('🚗 auto: линкүүд нь `section=auto`-г АГУУЛНА (үл хөдлөхийн нүүр рүү БУРУУ хөтлөхгүй)', () => {
  const items = buildListingBreadcrumb({
    section: 'auto', category: 'sell', property_type: 'Суудлын машин',
  });
  assert.equal(items[0].href, '/');                            // «Бүх зар»
  assert.ok(items[1].href.includes('section=auto'), items[1].href);
  assert.ok(items[2].href.includes('section=auto'), items[2].href);
  assert.ok(items[2].href.includes('type='), items[2].href);   // дэд төрөл шүүгдэнэ
});

t('🚗 auto: `category` нь `sell` ч breadcrumb-д категори crumb ГАРАХГҮЙ (давхардал 0)', () => {
  const items = buildListingBreadcrumb({
    section: 'auto', category: 'sell', property_type: 'Авто сэлбэг, хэрэгсэл',
  });
  assert.deepEqual(labels(items), ['Бүх зар', 'Автомашин', 'Авто сэлбэг, хэрэгсэл']);
});

t('💼 jobs «Программист»: хэсгийн нэр «Ажлын зар» (үл хөдлөх БИШ)', () => {
  const items = buildListingBreadcrumb({ section: 'jobs', property_type: 'Программист' });
  assert.equal(items[1].label, 'Ажлын зар');
  assert.ok(!labels(items).some((l) => l.includes('Үл хөдлөх')));
});

// ============================================================
// ③ 🛠 БҮЛЭГ (3 дахь түвшин) — `computers`/`electric`/`services`…
// ============================================================
t('💻 computers «Apple»: бүлэг «Notebook» замд НЭМЭГДЭНЭ', () => {
  const items = buildListingBreadcrumb({ section: 'computers', property_type: 'Apple' });
  assert.deepEqual(labels(items), ['Бүх зар', 'Компьютер, Дагалдах хэрэгсэл', 'Notebook', 'Apple']);
  // 🔗 2026-10-01 (15): сүүлийн crumb («Apple») Ч линк — `linkLast: true` ✓
  assert.equal(items[items.length - 1].linkLast, true);
});

t('💻 computers «Apple»-ийн бүлэг crumb нь `section=computers` линктэй', () => {
  const items = buildListingBreadcrumb({ section: 'computers', property_type: 'Apple' });
  assert.ok(items[2].href.includes('section=computers'), items[2].href);
});

// ============================================================
// ④ 🔗 ГЭРЭЭ: нүүр ба дэлгэрэнгүй breadcrumb НЭГ хэсэгт НИЙЦНЭ
// ============================================================
t('🔗 «Автомашин» хэсэг — нүүр ба дэлгэрэнгүй хоёулаа «Автомашин»-ыг хэсэг болгоно', () => {
  const home = buildHomeBreadcrumb({ section: 'auto', propertyType: 'Суудлын машин' });
  const detail = buildListingBreadcrumb({ section: 'auto', property_type: 'Суудлын машин' });
  const homeSec = home.find((i) => i.label === 'Автомашин');
  const detailSec = detail.find((i) => i.label === 'Автомашин');
  assert.ok(homeSec, 'нүүр breadcrumb-д «Автомашин» байх ёстой');
  assert.ok(detailSec, 'дэлгэрэнгүй breadcrumb-д «Автомашин» байх ёстой');
  assert.equal(homeSec.href, detailSec.href, 'хэсгийн линк хоёуланд нь ИЖИЛ байх ёстой');
});

// ============================================================
// ⑤ 🔗 СҮҮЛИЙН CRUMB — ЛИНК (2026-10-01 (15))
//
// Хэрэглэгчийн хүсэлт: «Бүх зар › Автомашин › Суудлын машин — … Суудлын машин
// гэдэг дээр дархад Суудлын машин-ны зарлуу ордог байх, бусад хэсгүүд ч мөн
// адил болгоорой» → сүүлийн мөр нь `<span>` БИШ, `homeFilterHref` линк болно
// (`linkLast: true` — механизм нь нүүр хуудсанд 2026-09-30-аас байсан ЯГ ИЖИЛ).
// ⚠️ Дэлгэрэнгүй хуудсанд сүүлийн crumb нь «одоогийн хуудас» БИШ — зарын
//    ХАМААРАХ шүүлт тул дарахад тэр шүүлтийн ЗАРЛУУД руу шилжих нь зүйтэй ✓
// ============================================================
t('🔗 🚗 «Суудлын машин» (сүүлийн crumb) — ЛИНК: `section=auto` + `type=`', () => {
  const items = buildListingBreadcrumb({ section: 'auto', category: 'sell', property_type: 'Суудлын машин' });
  const last = items[items.length - 1];
  assert.equal(last.label, 'Суудлын машин');
  assert.equal(last.linkLast, true, 'сүүлийн crumb нь линк байх ёстой (дарж болно)');
  assert.ok(last.href.startsWith('/?'), `нүүр рүү заах ёстой: ${last.href}`);
  assert.ok(last.href.includes('section=auto'), last.href);
  // ⚠️ `URLSearchParams` нь зайг `+` гэж бичдэг тул `encodeURIComponent`-оор
  //    харьцуулж БОЛОХГҮЙ — зөв нь буцааж задлан (`get`) шалгах ✓
  const qs = new URLSearchParams(last.href.slice(last.href.indexOf('?')));
  assert.equal(qs.get('type'), 'Суудлын машин', last.href);
  assert.equal(qs.get('section'), 'auto', last.href);
});

t('🔗 🏠 үл хөдлөх «3 өрөө» (сүүлийн crumb) — ЛИНК: `section=real-estate` + `rooms=3`', () => {
  const items = buildListingBreadcrumb({
    section: 'real-estate', category: 'sell', property_type: 'Орон сууц', rooms: 3,
  });
  const last = items[items.length - 1];
  assert.equal(last.label, '3 өрөө');
  assert.equal(last.linkLast, true);
  assert.ok(last.href.includes('category=sell'), last.href);
  assert.ok(last.href.includes('rooms=3'), last.href);
  // ⚠️ `section=real-estate` БАЙХГҮЙ бол `HomeClient` нь `category`-г уншихгүй ✗
  assert.ok(last.href.includes('section=real-estate'), last.href);
});

t('🔗 🏠 үл хөдлөхийн БҮХ crumb `section=real-estate`-г агуулна (navigation Fix)', () => {
  const items = buildListingBreadcrumb({
    section: 'real-estate', category: 'rent', property_type: 'Орон сууц', rooms: 2,
  });
  // «Бүх зар» (items[0]) л ганцаараа `/` — бусад нь ЗААВАЛ хэсгийг заана ✓
  for (const it of items.slice(1)) {
    assert.ok(it.href.includes('section=real-estate'), `${it.label}: ${it.href}`);
  }
  assert.ok(items[2].href.includes('category=rent'), items[2].href);
  assert.ok(items[3].href.includes('category=rent'), items[3].href);
  assert.ok(items[4].href.includes('category=rent'), items[4].href);
});

t('🔗 🛋️ тавилга «Буйдан, кресло» (бүлэггүй хэсэг) — сүүлийн crumb линк', () => {
  const items = buildListingBreadcrumb({ section: 'furniture', property_type: 'Буйдан, кресло' });
  const last = items[items.length - 1];
  assert.equal(last.label, 'Буйдан, кресло');
  assert.equal(last.linkLast, true);
  assert.ok(last.href.includes('section=furniture'), last.href);
});

t('🔗 БҮХ хэсэг (12, жинхэнэ `SECTIONS`-ээр): сүүлийн crumb нь `linkLast` + `href`', () => {
  // ⚠️ `real-estate` нь `subtypes` массивгүй (`PROPERTY_TYPES` ашигладаг) — дээрх
  //    (🏠 «3 өрөө») ба ① блокууд үүнийг аль хэдийн хамарсан тул алгасна ✓
  let checked = 0;
  for (const s of SECTIONS) {
    if (s.value === 'real-estate' || !s.subtypes || !s.subtypes.length) continue;
    const type = s.subtypes[0];
    const items = buildListingBreadcrumb({ section: s.value, category: 'sell', property_type: type });
    const last = items[items.length - 1];
    assert.ok(last && last.href, `${s.value} (${type}): href байх ёстой`);
    assert.equal(last.linkLast, true, `${s.value} (${type}): linkLast=true байх ёстой`);
    // ⚠️ Сүүлийн мөр нь ЯГ тухайн дэд төрөл — бүлгийн нэр («Notebook») БИШ ✓
    assert.equal(last.label, type, `${s.value}: сүүлийн crumb нь дэд төрөл байх ёстой`);
    assert.ok(last.href.includes(`section=${s.value}`), `${s.value}: ${last.href}`);
    checked += 1;
  }
  assert.ok(checked >= 10, `дор хаяж 10 хэсэг шалгах ёстой (шалгав: ${checked})`);
});

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест\n`);
