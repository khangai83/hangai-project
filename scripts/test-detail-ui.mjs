// ============================================================
// test-detail-ui.mjs — 📋 ЗАРЫН ФОРМ + ДЭЛГЭРЭНГҮЙ ХУУДСАНЫ ГЭРЭЭ (2026-10-07)
//
// 🎯 ХЭРЭГЛЭГЧИЙН 4 ХҮСЭЛТ:
//   ① «Зөвхөн Ажлын зар дээр Зураг оруулах хэсгийг болиулах»
//      ⇒ 💼 `jobs` хэсэгт 🖼 Зураг блок БҮРЭН ХАРАГДАХГҮЙ (`allowImages`)
//   ② «бүх хэсэгт Зар оруулах үед Нэр оруулдаг байх … байгууллагынхаа өмнөөс
//      зар оруулж байвал зарын мэдээлэл дээр өөрийх нь нэр нь гарах нь
//      зохимжгүй юм» ⇒ формд 👤 «Нэр» талбар (анхдагч нь хэрэглэгчийн нэр),
//      дэлгэрэнгүйд `contact_name` (форм дээр бичсэн нэр) ТҮРҮҮЛНЭ
//   ③ «хэрэглэгчийн Profile зургийг … тэгш өнцөгтөөр харуулаарай»
//      ⇒ `Avatar` нь `rounded-full` БИШ `rounded-lg`
//   ④ «газрын зургийг байж Unegui.mn шиг харуулдаг байя, Бүх зар дээр»
//      ⇒ дэлгэрэнгүйд «Байршил» гарчигтай газрын зураг ҮРГЭЛЖ
//
// ⚠️ Эдгээр нь БҮГД ХАРАГДАЦ/UI-ийн гэрээ — DB/query/migration 0 ✓
//
// ХАМРАХ ХҮРЭЭ (DB/React/CDP ХОЛБОГДОХГҮЙ — зөвхөн Node):
//   `components/AddListingClient.jsx` · `components/ListingDetailClient.jsx`
//   · `components/Avatar.jsx` · `components/MapView.jsx`
//
// АЖИЛЛУУЛАХ:  npm run test:detail-ui
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Комментгүй ЦЭВЭР КОД — тайлбар биш БОДИТ дүрмийг л шалгана ✓ */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n📋 Зарын форм + дэлгэрэнгүй хуудсан — 4 хүсэлтийн гэрээ\n');

const FORM = readSrc('components/AddListingClient.jsx');
const FORM_CODE = codeOnly(FORM);
const DET = readSrc('components/ListingDetailClient.jsx');
const DET_CODE = codeOnly(DET);
const AVATAR = readSrc('components/Avatar.jsx');
const AVATAR_CODE = codeOnly(AVATAR);
const MAP = readSrc('components/MapView.jsx');

// ---------- ① 💼 «Ажлын зар» дээр ЗУРАГ ХАРАГДАХГҮЙ ----------
t('① 💼 `allowImages` нь зөвхөн `jobs`-д `false` (`section !== \'jobs\'`) ✓', () => {
  assert.match(FORM_CODE, /const allowImages = \(form\.section \|\| 'real-estate'\) !== 'jobs'/,
    '`allowImages` тодорхойлолт алга/буруу ✗');
});

t('① 🖼 `media-images` блок нь `{allowImages && ( … )}`-д БҮРХЭГДСЭН ✓', () => {
  assert.match(FORM_CODE, /\{allowImages && \(\s*\n\s*<div data-step-block="media-images"/,
    '`media-images` блок нь `allowImages`-д бүрхэгдээгүй ✗');
  assert.ok(FORM_CODE.includes('Зураг оруулах'), '`Зураг оруулах` гарчиг алга ✗');
});

t('① 📦 Хадгалах үед `images` нь `allowImages`-аар хоослогдоно (jobs → []) ✓', () => {
  assert.match(FORM_CODE, /images: allowImages \? \[\.\.\.existingImages, \.\.\.uploaded\] : \[\]/,
    'payload-д `images` нөхцөлтэй болоогүй ✗');
});

// ---------- ② 👤 «Нэр» талбар (бүх хэсэгт) ----------
t('② 👤 Формд `<label>Нэр</label>` талбар ХАРАГДАНА (коммент БИШ) ✓', () => {
  assert.ok(FORM_CODE.includes('<label>Нэр</label>'),
    'формд «Нэр» label алга (комментод байж болзошгүй) ✗');
  assert.match(FORM_CODE, /value=\{form\.contactName\}/,
    '`form.contactName` руу холбогдсон input алга ✗');
  assert.match(FORM_CODE, /onChange=\{\(e\) => set\('contactName', e\.target\.value\)\}/,
    '`contactName` onChange алга ✗');
});

t('② 👤 `emptyForm()` нь нэвтэрсэн хэрэглэгчийн нэрээр бөглөнө (`contactName: displayName`) ✓', () => {
  assert.match(FORM_CODE, /contactName: displayName \|\| ''/,
    '`emptyForm` нь `contactName: displayName` БИШ ✗');
});

t('② 🏢 Дэлгэрэнгүйд `contact_name` ТҮРҮҮЛНЭ (формд бичсэн нэр → профайлын нэр) ✓', () => {
  assert.match(DET_CODE, /const sellerName =\s*\n\s*listing\.contact_name \|\| \(author && author\.displayName\) \|\| 'Холбоо барих хүн'/,
    '`sellerName` дараалал нь `contact_name → displayName` БИШ ✗');
  assert.ok(!DET_CODE.includes('(author && author.displayName) || listing.contact_name'),
    'хуучин `displayName || contact_name` дараалал буцсан ✗');
});

// ---------- ③ 👤 Profile зураг — ТЭГШ ӨНЦӨГТ ----------
t('③ 🖼 `Avatar` нь `rounded-lg` (тэгш өнцөгт), `rounded-full` (дугуй) БАЙХГҮЙ ✓', () => {
  assert.ok(!AVATAR_CODE.includes('rounded-full'),
    '`Avatar`-д `rounded-full` (дугуй) үлдсэн ✗');
  const count = (AVATAR_CODE.match(/rounded-lg/g) || []).length;
  assert.ok(count >= 2, `Avatar-д "rounded-lg" 2 газар (img + placeholder) байх ёстой ✗ (${count})`);
});


// ---------- ④ 🗺 Газрын зураг — БҮХ зарт (unegui хэв) ----------
t('④ 🗺 Дэлгэрэнгүйд «Байршил» гарчигтай газрын зураг ҮРГЭЛЖ ✓', () => {
  assert.ok(DET_CODE.includes("Байршил:{' '}"),
    '«Байршил» гарчиг алга ✗');
  assert.ok(DET_CODE.includes('data-component="ListingMap"'),
    '`data-component="ListingMap"` дэгээ алга ✗');
  assert.match(DET_CODE, /<MapView listings=\{\[mapListing\]\} \/>/,
    '`<MapView listings={[mapListing]} />` алга ✗');
});

t('④ 🗺 Нөөц төв: `mapCenterFor(listing)` (солбицолгүй зар ч газрын зурагтай) ✓', () => {
  assert.match(DET, /import \{ mapCenterFor \} from '\.\.\/lib\/locationGeo\.mjs'/,
    '`mapCenterFor` импорт алга ✗');
  assert.match(DET_CODE, /const mapPoint = mapCenterFor\(listing\)/,
    '`mapPoint = mapCenterFor(listing)` алга ✗');
});

t('④ 🗺 Хуучин БАРУУН баганын нөхцөлт газрын зураг БУЦАХГҮЙ (ЯГ 1 `<MapView`) ✓', () => {
  assert.ok(!DET_CODE.includes('MapView listings={[listing]}'),
    'хуучин sidebar газрын зураг (`MapView listings={[listing]}`) үлдсэн ✗');
  assert.equal((DET_CODE.match(/<MapView/g) || []).length, 1,
    '`<MapView` нь ЯГ 1 байх ёстой ✗');
});

t('④ 🎯 `MapView` — ГАНЦ пинд `fitBounds` БИШ тогтмол зум (`SINGLE_ZOOM`) ✓', () => {
  assert.match(MAP, /const SINGLE_ZOOM = 15/,
    '`SINGLE_ZOOM` тогтмол алга ✗');
  assert.match(MAP, /if \(points\.length === 1\) \{[\s\S]*?map\.setView\(\[points\[0\]\.latitude, points\[0\]\.longitude\], SINGLE_ZOOM\)/,
    'ганц пинд `setView(…, SINGLE_ZOOM)` алга ✗');
  assert.ok(MAP.includes('else if (markers.length)'),
    'олон пинд `fitBounds` салбар алга ✗');
  assert.ok(MAP.includes('filter((l) => l.latitude && l.longitude)'),
    'MapView-ийн солбицлын шүүлт өөрчлөгдсөн ✗');
});

// ---------- ⑤ README + package.json ----------
t('⑤ 📦 `package.json`-д `test:detail-ui` скрипт + README-д бүртгэл ✓', () => {
  const pkg = JSON.parse(readSrc('package.json'));
  assert.equal(pkg.scripts['test:detail-ui'], 'node scripts/test-detail-ui.mjs',
    '`test:detail-ui` скрипт алга/буруу ✗');
  const README = readSrc('README.md');
  assert.ok(README.includes('test:detail-ui'), 'README-д `test:detail-ui` алга ✗');
  assert.ok(README.includes('scripts/test-detail-ui.mjs'), 'README-д файлын нэр алга ✗');
});

console.log(`\n✅ БҮГД ОК: ${passed} тест — jobs зураггүй · Нэр талбар · тэгш өнцөгт Avatar · бүх зарт газрын зураг ✓\n`);

