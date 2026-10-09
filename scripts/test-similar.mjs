// ============================================================
// test-similar.mjs — 🔎 ТӨСТЭЙ ЗАРУУДЫН ГЭРЭЭ (2026-10-09 (79))
//
// ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «зарын карт руу ороход төстэй заруудыг харуулах»
//   → жишиг сайтын хэв: зарын дэлгэрэнгүй хуудсанд (`/listings/[id]`) үндсэн
//   агуулгын ДООР «🔎 Төстэй зарууд» — ижил ХЭСЭГ + category (Зарах/Түрээслэх),
//   дараа нь ижил ДҮҮРЭГ/ТӨРӨЛ, хамгийн сүүлийн 6 зар (өөрийгөө хасна).
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   ① Ранкийн дүрэм (жин: дүүрэг +3 · төрөл +2 · хороо +1 · хот +1) бүхэлдээ
//      `lib/similarListings.mjs` (цэвэр модуль) дотор — энд ФУНКЦЭЭР нь
//      шалгана (бодит утгаар, комментгүй ✓)
//   ② Гурван файлын ХОЛБОО санамсаргүй салбал блок ХАРАГДАХГҮЙ болно ✗
//      (`queries` → query · `SimilarListings` → UI · `ListingDetailClient` →
//      render) — тэр гэрээг эх кодоос бариулна ✓
//   ③ ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (эх кодын ГЭРЭЭ).
//
// АЖИЛЛУУЛАХ:  npm run test:similar
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  SIMILAR_LISTINGS_LIMIT,
  SIMILAR_CANDIDATE_POOL,
  similarityScore,
  rankSimilarListings,
  similarSection,
  similarCategoryFilter,
} from '../lib/similarListings.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Комментгүй ЦЭВЭР КОД — «хасагдсан» гэсэн тайлбар нь зүй ёсны тул
 *  шалгалтыг зөвхөн кодын мөрүүд дээр хийнэ (хуурамч улаан гарахгүй ✓) */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const QUERIES = readSrc('lib/queries.js');
const QUERIES_CODE = codeOnly(QUERIES);
const COMPONENT = readSrc('components/SimilarListings.jsx');
const COMPONENT_CODE = codeOnly(COMPONENT);
const DETAIL = readSrc('components/ListingDetailClient.jsx');
const DETAIL_CODE = codeOnly(DETAIL);

console.log('\n🧪 Төстэй зарууд — цэвэр логик (lib/similarListings.mjs)\n');

// ---- 📄 ТОГТМОЛУУД ----
t('SIMILAR_LISTINGS_LIMIT нь 6 (жишиг сайтын хэв — 3 багана × 2 мөр)', () => {
  assert.equal(SIMILAR_LISTINGS_LIMIT, 6);
});
t('SIMILAR_CANDIDATE_POOL нь 6-аас их (онооллын сан — нэр дэвшигч хангалттай)', () => {
  assert.ok(SIMILAR_CANDIDATE_POOL > SIMILAR_LISTINGS_LIMIT);
});

// ---- 🧩 similarSection ----
t('similarSection: section хоосон бол «real-estate» (хуучин зарын хэв)', () => {
  assert.equal(similarSection({}), 'real-estate');
  assert.equal(similarSection({ section: null }), 'real-estate');
  assert.equal(similarSection(null), 'real-estate');
});
t('similarSection: байгаа section-ыг хэвээр буцаана', () => {
  assert.equal(similarSection({ section: 'auto' }), 'auto');
});

// ---- 🧩 similarCategoryFilter ----
t('similarCategoryFilter: зөвхөн sell/rent-ыг шүүнэ, бусад нь null (шүүлтгүй)', () => {
  assert.equal(similarCategoryFilter({ category: 'sell' }), 'sell');
  assert.equal(similarCategoryFilter({ category: 'rent' }), 'rent');
  assert.equal(similarCategoryFilter({ category: 'all' }), null);
  assert.equal(similarCategoryFilter({ category: '' }), null);
  assert.equal(similarCategoryFilter({}), null);
  assert.equal(similarCategoryFilter(null), null);
});

// ---- 🎯 similarityScore ----
const target = {
  id: '11111111-1111-1111-1111-111111111111',
  section: 'real-estate',
  category: 'sell',
  city: 'Улаанбаатар',
  district: 'Баянгол',
  khoroo: '1-р хороо',
  property_type: 'Орон сууц',
  created_at: '2026-10-01T00:00:00Z',
};

t('similarityScore: дүүрэг+төрөл+хороо+хот БҮГД ижил ⇒ 7 (3+2+1+1)', () => {
  const c = { city: 'Улаанбаатар', district: 'Баянгол', khoroo: '1-р хороо', property_type: 'Орон сууц' };
  assert.equal(similarityScore(target, c), 7);
});
t('similarityScore: зөвхөн хот ижил ⇒ 1', () => {
  assert.equal(similarityScore(target, { city: 'Улаанбаатар', district: 'Сүхбаатар', property_type: 'Газар' }), 1);
});
t('similarityScore: огт тохирохгүй ⇒ 0', () => {
  assert.equal(similarityScore(target, { city: 'Дархан', district: 'Хонгор', property_type: 'Газар' }), 0);
});
t('similarityScore: ХООСОН утгууд хоорондоо ХЭЗЭЭ Ч тохирохгүй', () => {
  const empty = { city: '', district: '', khoroo: '', property_type: '' };
  assert.equal(similarityScore(empty, empty), 0);
  assert.equal(similarityScore(target, empty), 0);
});
t('similarityScore: жижиг/том үсэг ба илүүдэл зайг үл хайхран харьцуулна', () => {
  const c = { city: '  УЛААНБААТАР ', district: 'баянгол' };
  assert.equal(similarityScore(target, c), 1 + 3);
});
t('similarityScore: null/undefined оролтод 0 (уналтгүй)', () => {
  assert.equal(similarityScore(null, { city: 'Улаанбаатар' }), 0);
  assert.equal(similarityScore(target, null), 0);
});

const PURE = readSrc('lib/similarListings.mjs');

// ---- 🏆 rankSimilarListings ----
const cand = (id, over = {}) => ({
  id,
  section: 'real-estate',
  category: 'sell',
  city: 'Улаанбаатар',
  district: 'Баянгол',
  property_type: 'Орон сууц',
  created_at: '2026-09-01T00:00:00Z',
  ...over,
});

t('rankSimilarListings: одоогийн зарыг (өөрийгөө) ХАСНА', () => {
  const rows = [target, cand('22222222-2222-2222-2222-222222222222')];
  const out = rankSimilarListings(target, rows);
  assert.equal(out.length, 1);
  assert.ok(!out.some((l) => l.id === target.id));
});
t('rankSimilarListings: оноо БУУРАХААР эрэмбэлнэ (ижил дүүрэг+төрөл эхэнд)', () => {
  const near = cand('22222222-2222-2222-2222-222222222222'); // бүгд таарна → 7
  const mid = cand('33333333-3333-3333-3333-333333333333', { district: 'Сүхбаатар' }); // хот+төрөл → 3
  const far = cand('44444444-4444-4444-4444-444444444444', { city: 'Дархан', district: 'Хонгор', property_type: 'Газар' }); // 0
  const out = rankSimilarListings(target, [far, mid, near]);
  assert.deepEqual(out.map((l) => l.id), [near.id, mid.id, far.id]);
});
t('rankSimilarListings: оноо ТЭНЦВЭЛ шинэ (`created_at`) нь эхэнд', () => {
  const older = cand('22222222-2222-2222-2222-222222222222', { created_at: '2026-08-01T00:00:00Z' });
  const newer = cand('33333333-3333-3333-3333-333333333333', { created_at: '2026-09-20T00:00:00Z' });
  const out = rankSimilarListings(target, [older, newer]);
  assert.deepEqual(out.map((l) => l.id), [newer.id, older.id]);
});
t('rankSimilarListings: бүрэн тэнцэх үед `id` буурахаар (ТОГТВОРТОЙ дараалал)', () => {
  const a = cand('22222222-2222-2222-2222-222222222222');
  const b = cand('33333333-3333-3333-3333-333333333333');
  const out1 = rankSimilarListings(target, [a, b]);
  const out2 = rankSimilarListings(target, [b, a]);
  assert.deepEqual(out1.map((l) => l.id), out2.map((l) => l.id));
  assert.equal(out1[0].id, b.id); // uuid буурахаар
});
t('rankSimilarListings: анхдагчаар ХАМГИЙН ИХДЭЭ 6 зар буцаана', () => {
  const rows = Array.from({ length: 20 }, (_, i) =>
    cand(`${String(i).padStart(8, '0')}-1111-1111-1111-111111111111`));
  assert.equal(rankSimilarListings(target, rows).length, SIMILAR_LISTINGS_LIMIT);
});
t('rankSimilarListings: `limit`-ыг дагана (2 ⇒ 2)', () => {
  const rows = Array.from({ length: 10 }, (_, i) =>
    cand(`${String(i).padStart(8, '0')}-1111-1111-1111-111111111111`));
  assert.equal(rankSimilarListings(target, rows, 2).length, 2);
});
t('rankSimilarListings: массив БИШ/`null` оролтод [] (уналтгүй)', () => {
  assert.deepEqual(rankSimilarListings(target, null), []);
  assert.deepEqual(rankSimilarListings(target, undefined), []);
  assert.deepEqual(rankSimilarListings(null, [cand('22222222-2222-2222-2222-222222222222')]), []);
});
t('rankSimilarListings: `id`-гүй мөрийг хаяна (хамгаалалт)', () => {
  const out = rankSimilarListings(target, [{ district: 'Баянгол' }, null, cand('22222222-2222-2222-2222-222222222222')]);
  assert.equal(out.length, 1);
});


console.log('\n🧪 Төстэй зарууд — эх кодын ГЭРЭЭ (queries · UI · render)\n');

// ---- 🧩 DB query (lib/queries.js) ----
t('queries: `fetchSimilarListings` экспортлогдсон', () => {
  assert.match(QUERIES_CODE, /export async function fetchSimilarListings\s*\(/);
});
t('queries: ижил ХЭСЭГ-ээр шүүнэ (`.eq(\'section\', similarSection(listing))`)', () => {
  assert.match(QUERIES_CODE, /\.eq\('section',\s*similarSection\(listing\)\)/);
});
t('queries: өөрийгөө ХАСНА (`.neq(\'id\', listing.id)`)', () => {
  assert.match(QUERIES_CODE, /\.neq\('id',\s*listing\.id\)/);
});
t('queries: ижил category-г шүүнэ (зөвхөн sell/rent үед)', () => {
  assert.match(QUERIES_CODE, /similarCategoryFilter\(listing\)/);
  assert.match(QUERIES_CODE, /\.eq\('category',\s*category\)/);
});
t('queries: нэр дэвшигчийн санг хязгаарлана (`SIMILAR_CANDIDATE_POOL`)', () => {
  assert.match(QUERIES_CODE, /\.limit\(SIMILAR_CANDIDATE_POOL\)/);
});
t('queries: UUID биш/хоосон зард query ИЛГЭЭХГҮЙ — [] буцаана', () => {
  assert.match(QUERIES_CODE, /if \(!listing \|\| !isUuid\(listing\.id\)\) return \[\];/);
});
t('queries: онооллыг цэвэр модулиар хийлгэнэ (`rankSimilarListings`)', () => {
  assert.match(QUERIES_CODE, /return rankSimilarListings\(listing, data \|\| \[\], size\);/);
});
t('queries: `lib/similarListings.mjs`-ээс импортолсон (нэг эх сурвалж)', () => {
  assert.match(QUERIES_CODE, /from '\.\/similarListings\.mjs'/);
});

// ---- 🎨 UI component (components/SimilarListings.jsx) ----
t('UI: «🔎 Төстэй зарууд» гарчигтай', () => {
  assert.match(COMPONENT, /🔎 Төстэй зарууд/);
});
t('UI: `data-similar-listings` тэмдэгтэй (CDP шалгалт бариулах)', () => {
  assert.match(COMPONENT, /data-similar-listings/);
});
t('UI: одоогийн ЗАРЫН КАРТ (`ListingCard`)-ыг дахин ашиглана', () => {
  assert.match(COMPONENT_CODE, /from '\.\/ListingCard'/);
  assert.match(COMPONENT_CODE, /<ListingCard/);
});
t('UI: хоосон бол блок БҮХЭЛДЭЭ ГАРАХГҮЙ (`return null`)', () => {
  assert.match(COMPONENT_CODE, /if \(!items \|\| items\.length === 0\) return null;/);
});
t('UI: алдаа гарвал зөвхөн warn хийнэ (үндсэн агуулгад нөлөөлөхгүй)', () => {
  assert.match(COMPONENT_CODE, /console\.warn\(normalizeError\(err\)\)/);
});
t('UI: баганат grid (мобайл 1 → sm 2 → lg 3 → 2xl 4)', () => {
  assert.match(COMPONENT_CODE, /grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4/);
});
t('UI: нийтлэгчийн нэр/зургийг 2 дахь query-ээр нэгтгэнэ (`fetchProfilesByIds`)', () => {
  assert.match(COMPONENT_CODE, /fetchProfilesByIds\(rows\.map\(\(l\) => l\.user_id\)\)/);
});
t('UI: онооллын дүрмийг дахин бичээгүй (цэвэр модулиас импортолсон)', () => {
  assert.match(COMPONENT_CODE, /from '\.\.\/lib\/similarListings\.mjs'/);
  assert.doesNotMatch(COMPONENT_CODE, /function similarityScore/);
});

// ---- 🖼 Дэлгэрэнгүй хуудас (components/ListingDetailClient.jsx) ----
t('detail: `SimilarListings`-ыг импортолсон', () => {
  assert.match(DETAIL_CODE, /import SimilarListings from '\.\/SimilarListings';/);
});
t('detail: `<SimilarListings listing={listing} />`-ыг render хийнэ', () => {
  assert.match(DETAIL_CODE, /<SimilarListings listing=\{listing\} \/>/);
});
t('detail: блок нь хоёр баганын grid-ийн ГАДНА (page-container дотор)', () => {
  // `</aside>` → `</div>` (grid) → (JSX коммент үлдэгдэл `{}`) →
  // `<SimilarListings … />` → `</div>` (page-container)
  const tail = DETAIL_CODE.slice(DETAIL_CODE.indexOf('</aside>'));
  assert.match(tail, /<\/aside>\s*<\/div>\s*\{\}\s*<SimilarListings[^>]*\/>\s*<\/div>/s);
});

// ---- 📜 ЦЭВЭР модуль ----
t('цэвэр модуль: `similarListings.mjs` — DB/React хамааралгүй (зөвхөн Node)', () => {
  assert.doesNotMatch(PURE, /^\s*import\s/m);
  assert.doesNotMatch(PURE, /supabase|react/i);
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);

