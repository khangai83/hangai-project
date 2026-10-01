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
  // Сүүлийн (одоогийн) мөр нь ЛИНК БИШ — `Breadcrumb.jsx` нь `isLast`-ээр
  // `<span>` болгоно (`linkLast` туг ЗААВАЛ байхгүй байх ёстой) ✓
  assert.equal(items[items.length - 1].linkLast, undefined);
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
  // Сүүлийн crumb нь ЛИНК БИШ (`linkLast` туггүй — `Breadcrumb.jsx` span болгоно) ✓
  assert.equal(items[items.length - 1].linkLast, undefined);
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

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест\n`);
