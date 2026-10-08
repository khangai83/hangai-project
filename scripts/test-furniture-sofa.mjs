// ============================================================
// test-furniture-sofa.mjs — 🛏 «БУЙДАН БОЛДОГ» → Тийм / Үгүй (2026-10-08 (71))
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Зөвхөн Буйдан, кресло -ийн зар оруулах болон хайх
//    үед Буйдан болдог → Тийм/Үгүй гэсэн хэсэг нэмэх. Үүнийг Төлөв -ийн доор
//    оруулах» ✓
//
// 📐 ГУРВАН ГАЗАРТ НЭГ Л ДҮРМЭЭР (талбар нь 🛋️ `furniture`-ийн `attrFields`):
//    ① 📝 ФОРМ (`AddListingClient` → `getAttrFields(section, propertyType)`)
//    ② 🔎 ХАЙЛТ (`HomeClient` → `getAttrFilters(section, filters.propertyType)`)
//    ③ 👁 ДЭЛГЭРЭНГҮЙ (`ListingDetailClient` → `getAttrRows(section, attrs, property_type)`)
//    ⚠️ ГУРВУУЛАА `onlySubtypes: ['Буйдан, кресло']` дүрмийг ашигладаг тул
//       ЗӨВХӨН тэр дэд төрөлд гарна (дэд төрөл сонгоогүй/холдуу дэд төрөлд ✗) ✓
//    ⚠️ `simple: true` туг — 📝 «Тайлбар» нь 🏷️ гарчигны дараа ХЭВЭЭР байхын
//       тулд (`descriptionAfterTitle`; эс бөгөөс хэв гэнэт 💰 үнийн дараа шилжинэ ✗)
//
// 🗄 ХАДГАЛАЛТ: `listings.attrs` (jsonb, 0016) — **MIGRATION 0** ✓
//    URL `?attr_sofaBed=Тийм` → DB `attrs->>sofaBed` (`eq`, учир нь талбар нь
//    `filterable`/`searchable` БИШ энгийн сонголт ✓)
//
// ХАМРАХ ХҮРЭЭ (DB/React/CDP ХОЛБОГДОХГҮЙ — зөвхөн Node):
//   `lib/locationData.js` · `components/HomeClient.jsx` · `lib/queries.js`
//
// АЖИЛЛУУЛАХ:  npm run test:sofa
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  SECTIONS, getSection, getSubtypes, getAttrField, getAttrFields, getAttrFilters,
  getAttrRows, formatAttrsLine, descriptionAfterTitle, pruneGatedAttrs, hasSimpleForm,
} from '../lib/locationData.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const SOFA = 'Буйдан, кресло';

console.log('\n🛏 «Буйдан болдог» (Тийм / Үгүй) — 🛋️ «Буйдан, кресло» дэд төрөлд\n');

// ---------- ① ТАЛБАР ӨӨРӨӨ ----------
t('① Талбар: key `sofaBed` · шошго «Буйдан болдог» · icon 🛏 · Тийм/Үгүй', () => {
  const f = getAttrField('furniture', 'sofaBed');
  assert.ok(f, '`sofaBed` талбар БАЙХГҮЙ ✗');
  assert.equal(f.label, 'Буйдан болдог');
  assert.equal(f.icon, '🛏');
  assert.deepEqual(f.options, ['Тийм', 'Үгүй']);
  assert.equal(f.type, 'select');
  assert.equal(f.key, 'sofaBed');
  // ⚠️ Энгийн `<select>` (чип/олон сонголт БИШ · хайлт/хүрээ БИШ)
  assert.ok(!f.chips && !f.multi && !f.searchable && !f.filterable && !f.range,
    '`sofaBed` нь энгийн `<select>` байх ЁСТОЙ ✗');
});

t('② `onlySubtypes` = ЗӨВХӨН «Буйдан, кресло» (дахин бичсэн текст БИШ — либын утга)', () => {
  const f = getAttrField('furniture', 'sofaBed');
  assert.deepEqual(f.onlySubtypes, [SOFA]);
  // ⚠️ Утга нь `getSubtypes('furniture')`-ийн ЯГ тэр мөр байх ёстой
  //    (нэг үсэг зөрвөл форм/шүүлт чимээгүй ХАРАГДАХГҮЙ болно ✗)
  assert.ok(getSubtypes('furniture').includes(f.onlySubtypes[0]),
    '`onlySubtypes`-ийн утга нь дэд төрлүүдийн жагсаалтад БАЙХГҮЙ ✗');
});

t('③ `simple: true` — 📝 Тайлбар нь 🏷️ гарчигны дараа ХЭВЭЭР (форм хэвээ хамгаална)', () => {
  assert.equal(getAttrField('furniture', 'sofaBed').simple, true, '`simple` туг алга ✗');
  assert.equal(descriptionAfterTitle('furniture'), true, '🛋️: тайлбар гарчигны дараа БАЙХ ЁСТОЙ ✗');
  assert.equal(descriptionAfterTitle('furniture', SOFA), true, '🛋️ «Буйдан, кресло»: ✗');
  assert.equal(hasSimpleForm('furniture'), true, 'хялбар форм туг ХӨНДӨГДСӨН ✗');
});

// ---------- ② ①②③ ГУРВАН ГАЗАРТ ИЖИЛ ДҮРЭМ ----------
t('④ Дараалал: ✅ «Төлөв»-ийн ЯГ ДООР (attrFields ба attrFilters ХОЁУЛАА)', () => {
  assert.deepEqual(getSection('furniture').attrFields.map((f) => f.key), ['condition', 'sofaBed']);
  assert.deepEqual(getSection('furniture').attrFilters, ['condition', 'sofaBed']);
  const keys = getAttrFields('furniture', SOFA).map((f) => f.key);
  const at = (k) => keys.indexOf(k);
  assert.ok(at('condition') >= 0 && at('sofaBed') === at('condition') + 1,
    'форм дээр «Төлөв»-ийн ЯГ ДООР БИШ ✗');
  const fKeys = getAttrFilters('furniture', SOFA).map((f) => f.key);
  assert.deepEqual(fKeys, ['condition', 'sofaBed'], 'sidebar-д ХАРАГДАХГҮЙ/дараалал ✗');
});

t('⑤ Гурвуулаа `onlySubtypes`-аар шүүгдэнэ (форм · шүүлт · дэлгэрэнгүй)', () => {
  const only = (sub) => getAttrFields('furniture', sub).map((f) => f.key);
  assert.deepEqual(only(''), ['condition'], 'дэд төрөлгүй үед ГАРАХГҮЙ ✗');
  assert.deepEqual(only('Зочны өрөөний'), ['condition'], 'холдуу дэд төрөлд ГАРАХГҮЙ ✗');
  assert.deepEqual(only(SOFA), ['condition', 'sofaBed'], '«Буйдан, кресло» дээр ГАРАХ ЁСТОЙ ✗');
  assert.deepEqual(getAttrFilters('furniture').map((f) => f.key), ['condition']);
  assert.deepEqual(getAttrFilters('furniture', SOFA).map((f) => f.key), ['condition', 'sofaBed']);
  // 👁 Дэлгэрэнгүй: мөр нь зарын `property_type`-аас хамаарна
  const attrs = { condition: 'Шинэ', sofaBed: 'Тийм' };
  assert.deepEqual(getAttrRows('furniture', attrs, SOFA).map((r) => r.key), ['condition', 'sofaBed']);
  assert.deepEqual(getAttrRows('furniture', attrs, 'Ор, матрас').map((r) => r.key), ['condition']);
  assert.deepEqual(getAttrRows('furniture', attrs).map((r) => r.key), ['condition']);
});

t('⑥ 👁 Дэлгэрэнгүйд «🛏 Буйдан болдог: Тийм» мөр (icon + шошго + утга)', () => {
  const rows = getAttrRows('furniture', { sofaBed: 'Тийм' }, SOFA);
  assert.deepEqual(rows, [{ key: 'sofaBed', label: 'Буйдан болдог', icon: '🛏', value: 'Тийм' }]);
  // ⚠️ Хоосон утга мөр ҮҮСГЭХГҮЙ (хуучин зарууд «🛏 …» хоосон мөргүй ✓)
  assert.deepEqual(getAttrRows('furniture', { sofaBed: '' }, SOFA), []);
  assert.deepEqual(getAttrRows('furniture', {}, SOFA), []);
});


// ---------- ③ 🗄 URL → DB (query) ----------
t('⑦ `lib/queries.js`: attr шүүлт нь `attrs->>sofaBed` (`eq` — `ilike` БИШ ✓)', () => {
  const src = codeOnly(readSrc('lib/queries.js'));
  // талбар нь `filterable`/`searchable` БИШ тул `isTextLikeAttr` → false ⇒ `eq`
  assert.match(src, /query\.eq\(`attrs->>\$\{k\}`, term\)/, 'скаляр `eq` салбар алга ✗');
  assert.ok(!/sofaBed/.test(src), '`queries.js`-д `sofaBed` ХАТУУ бичих ШААРДЛАГАГҮЙ ✗ (түлхүүрээс хаммаарахгүй)');
});

t('⑧ `components/HomeClient.jsx`: шүүлт нь дэд төрлөөр (`getAttrFilters(section, filters.propertyType)`)', () => {
  const home = codeOnly(readSrc('components/HomeClient.jsx'));
  assert.match(home, /getAttrFilters\(section, filters\.propertyType\)/,
    'сайдбар дэд төрлийг дамжуулахгүй ✗');
  assert.match(home, /data-attr-filter=\{f\.key\}/, 'CDP дэгээ (`data-attr-filter`) алга ✗');
  assert.ok(!/sofaBed/.test(home), '`HomeClient`-д `sofaBed` ХАТУУ бичих ШААРДЛАГАГҮЙ ✗');
});

// ---------- ④ ♻️ ЦЭВЭРЛЭЛТ + МИГРАЦИ ----------
t('⑨ `pruneGatedAttrs`: дэд төрөл солиход `sofaBed` АВТОМАТААР ХАСАГДАНА', () => {
  const attrs = { condition: 'Шинэ', sofaBed: 'Тийм' };
  // ⚠️ «Буйдан, кресло» → «Зочны өрөөний»: харагдахгүй шүүлт үлдэхгүй ✓
  assert.deepEqual(pruneGatedAttrs('furniture', 'Зочны өрөөний', attrs), { condition: 'Шинэ' });
  assert.deepEqual(pruneGatedAttrs('furniture', '', attrs), { condition: 'Шинэ' });
  // ⚠️ «Буйдан, кресло» дээр ХӨНДӨӨГДӨХГҮЙ (2 талбар ч харагдана ✓)
  assert.deepEqual(pruneGatedAttrs('furniture', SOFA, attrs), attrs);
});

t('⑩ 🗄 **MIGRATION 0** — `listings.attrs` (jsonb, 0016) дээр хадгалагдана (шинэ SQL байхгүй)', () => {
  const mig = readSrc('supabase/migrations/0016_listing_sections.sql');
  assert.match(mig, /alter table public\.listings add column if not exists attrs\s+jsonb/, '`attrs` багана алга ✗');
  assert.match(mig, /gin/i, 'GIN индекс алга ✗');
  // ⚠️ (71)-ийн МӨР нь 0042 (show_name) — 🛏-д шинэ migration файл БАЙХГҮЙ ✓
  const files = fs.readdirSync(path.join(ROOT, 'supabase', 'migrations'));
  assert.deepEqual(files.filter((f) => /sofa/i.test(f)), [], '🛏-д зориулсан migration файл үүссэн ✗');
});

// ---------- ⑤ 📦 БҮРТГЭЛ ----------
t('⑪ 🛋️-ийн бусад зан ХӨНДӨӨГДӨӨГҮЙ (13 дэд төрөл · condition · нэр/icon)', () => {
  const sec = getSection('furniture');
  assert.equal(sec.label, 'Тавилга');
  assert.equal(sec.icon, '🛋️');
  assert.equal(getSubtypes('furniture').length, 13);
  assert.deepEqual(getAttrField('furniture', 'condition').options, ['Шинэ', 'Шинэвтэр', 'Хуучин']);
  assert.equal(getAttrField('furniture', 'condition').label, 'Төлөв');
  // ⚠️ Картын мөр (`formatAttrsLine`) — 🛏 нь `CARD_ATTR_ORDER`-д БАЙХГҮЙ нь
  //    зориуд (карт дээр хэт урт болохгүй; зөвхөн ✅ Төлөв ✓)
  assert.equal(formatAttrsLine('furniture', { condition: 'Шинэ', sofaBed: 'Тийм' }), '✅ Шинэ');
  // ⚠️ Зөвхөн 🛋️-д — бусад хэсэгт `sofaBed` БАЙХГҮЙ, 🛋️ дээр ДАВХАРДАЛГҮЙ
  const others = SECTIONS.filter((s) => (s.attrFields || []).some((f) => f.key === 'sofaBed'));
  assert.deepEqual(others.map((s) => s.value), ['furniture'], '`sofaBed` өөр хэсэгт/олон удаа орсон ✗');
  assert.equal(others[0].attrFields.filter((f) => f.key === 'sofaBed').length, 1, '`sofaBed` ДАВХАРДСАН ✗');
});

t('⑫ `npm run test:sofa` бүртгэгдсэн + README-д тест нэрээр бичигдсэн', () => {
  const pkg = JSON.parse(readSrc('package.json'));
  assert.equal(pkg.scripts['test:sofa'], 'node scripts/test-furniture-sofa.mjs',
    '`package.json`-д скрипт алга ✗');
  assert.ok(readSrc('README.md').includes('test-furniture-sofa.mjs'), 'README-д бүртгэл алга ✗');
});

console.log(`\n✅ ${passed}/${passed} шалгалт АМЖИЛТТАЙ\n`);
