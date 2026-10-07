// ============================================================
// test-block.mjs — 🚫 ХЭРЭГЛЭГЧ БЛОКЛОХ ГЭРЭЭ (админ)
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «admin хэрэглэгч тухайн хэрэглэгчийг block хийх
//    боломжтой байх. Ингэснээр түүний зар нийтэд харагдахгүй болох ба
//    системд нэвтрэх боломжгүй болох юм»
//
// ГЭРЭЭ (эх файлыг ШУУД уншина — санамсаргүй салгахаас сэргийлнэ):
//   ① `supabase/migrations/0038_user_blocks.sql` — `profiles.blocked` багана,
//      `is_user_blocked()` SECURITY DEFINER функц, `listings_select` бодлого
//   ② `lib/adminAuth.js` — `isUserBlocked` (`banned_until`) + `setUserBlocked`
//      (`ban_duration` + `profiles.blocked` ХАМТ) + summary-д `blocked`
//   ③ `app/api/admin/users/[id]/route.js` — `blocked` хүлээн авах + өөрийгөө
//      блоклохоос хамгаалах
//   ④ `lib/adminApi.js` — `updateUserBlocked()` клиент туслах
//   ⑤ `components/AdminUsersClient.jsx` — «Блоклох» товч · БЛОКЛОГДСОН шошго ·
//      🚫 статистик
//   ⑥ `components/AppProviders.jsx` — бан алдааны монгол мессеж
//   ⑦ 📄 README-д бичигдсэн эсэх
//
// АЖИЛЛУУЛАХ:  npm run test:block
// ⚠️ DB/React/CDP ХОЛБОГДОХГҮЙ — зөвхөн Node (эх файлын статик гэрээ).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

/** 📄 Эх файлыг унших (ГЭРЭЭ/регрессийн шалгалтад) */
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/** 🧹 Зөвхөн КОД (коммент тайлбарыг хасна) — «кодод байхгүй» гэдгийг батлахад */
const codeOnly = (src) => src
  .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, '')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🚫 Хэрэглэгч блоклох — гэрээний тест\n');

const MIG = readSrc('supabase/migrations/0038_user_blocks.sql');
const AUTH = readSrc('lib/adminAuth.js');
const ROUTE = readSrc('app/api/admin/users/[id]/route.js');
const API = readSrc('lib/adminApi.js');
const UI = readSrc('components/AdminUsersClient.jsx');
const PROVIDERS = readSrc('components/AppProviders.jsx');
const README = readSrc('README.md');

// ────────────────────────────────────────────────────────────
// ① MIGRATION (`0038_user_blocks.sql`)
// ────────────────────────────────────────────────────────────
console.log('── ① supabase/migrations/0038_user_blocks.sql ──');

t('① `profiles.blocked` ба `blocked_at` багана (idempotent, `if not exists`)', () => {
  assert.ok(/add column if not exists blocked\b/.test(MIG), 'blocked багана алга ✗');
  assert.ok(/add column if not exists blocked_at/.test(MIG), 'blocked_at багана алга ✗');
  assert.ok(/alter column blocked set not null/.test(MIG), 'blocked NOT NULL болгоогүй ✗');
});

t('① `is_user_blocked(uuid)` нь SECURITY DEFINER (RLS-ээс АНГИД, profiles RLS-д найдахгүй)', () => {
  assert.ok(/function public\.is_user_blocked\(uid uuid\)/.test(MIG),
    'is_user_blocked функц алга ✗');
  assert.ok(/security definer/.test(MIG), 'SECURITY DEFINER алга ✗');
  assert.ok(/set search_path = public/.test(MIG), 'search_path тогтоогоогүй ✗');
  assert.ok(/grant execute on function public\.is_user_blocked/.test(MIG),
    'функцийн execute grant алга ✗');
});

t('① `listings_select` бодлого нь блоклогдсон эзний зарыг ХАСНА (`using (true)` БИШ)', () => {
  assert.ok(/drop policy if exists "listings_select"/.test(MIG), 'хуучин бодлогыг drop хийгээгүй ✗');
  assert.ok(/for select using \(not public\.is_user_blocked\(user_id\)\)/.test(MIG),
    'шинэ listings_select бодлого алга ✗');
  // ⚠️ `for select using (true)` нь listings дээр ҮЛДЭХ ЁСТОЙГҮЙ
  assert.equal(/on public\.listings[\s\S]*?for select using \(true\)/.test(MIG), false,
    'listings дээр `using (true)` ҮЛДСЭН ✗');
});

// ────────────────────────────────────────────────────────────
// ② `lib/adminAuth.js`
// ────────────────────────────────────────────────────────────
console.log('\n── ② lib/adminAuth.js — сервер логик ──');

t('② `isUserBlocked` нь ИСТОУН `banned_until`-ыг шалгана (ирээдүйн огноо = блоклогдсон)', () => {
  assert.ok(/function isUserBlocked\(user\)/.test(AUTH), 'isUserBlocked алга ✗');
  assert.ok(/user\.banned_until/.test(AUTH), 'banned_until шалгахгүй байна ✗');
  assert.ok(/t > Date\.now\(\)/.test(AUTH), 'ирээдүй эсэхийг харьцуулахгүй байна ✗');
});

t('② `setUserBlocked` нь ① `profiles.blocked` БА ② `ban_duration` ХОЁРЫГ ХАМТ бичнэ', () => {
  assert.ok(/async function setUserBlocked\(userId, blocked\)/.test(AUTH), 'setUserBlocked алга ✗');
  assert.ok(/from\('profiles'\)/.test(AUTH) && /\.upsert\(/.test(AUTH),
    'profiles.blocked бичих upsert алга ✗');
  assert.ok(/ban_duration: on \? BLOCK_DURATION : 'none'/.test(AUTH),
    'ban_duration (бан/унбан) бичихгүй байна ✗');
  assert.ok(/const BLOCK_DURATION = '876000h'/.test(AUTH), 'BLOCK_DURATION тогтмол алга ✗');
  assert.ok(/app_metadata: \{ \.\.\.currentMeta, is_blocked: on \}/.test(AUTH),
    'app_metadata.is_blocked туг бичихгүй байна ✗');
});

t('② 0038 ороогүй үед ойлгомжтой монгол алдаа шиднэ (`blocked` багана дутуу)', () => {
  assert.ok(/0038_user_blocks\.sql/.test(AUTH), 'migration-ыг сануулсан мессеж алга ✗');
});

t('② summary нь хэрэглэгч бүрд `blocked` + статистикт `blocked` тоо өгнө', () => {
  assert.ok(/blocked: isUserBlocked\(u\)/.test(AUTH), 'rows-д blocked алга ✗');
  assert.ok(/blocked: rows\.filter\(\(r\) => r\.blocked\)\.length/.test(AUTH),
    'stats.blocked алга ✗');
});

t('② `isUserBlocked` ба `setUserBlocked` экспортлогдсон', () => {
  assert.ok(/\n\s+isUserBlocked,/.test(AUTH), 'isUserBlocked экспортгүй ✗');
  assert.ok(/\n\s+setUserBlocked,/.test(AUTH), 'setUserBlocked экспортгүй ✗');
});

// ────────────────────────────────────────────────────────────
// ③ `app/api/admin/users/[id]/route.js`
// ────────────────────────────────────────────────────────────
console.log('\n── ③ PATCH /api/admin/users/[id] ──');

t("③ `blocked` талбарыг хүлээн авна (typeof body.blocked === 'boolean')", () => {
  assert.ok(/typeof body\.blocked === 'boolean'/.test(ROUTE), 'blocked хүлээн авахгүй байна ✗');
  assert.ok(/await setUserBlocked\(id, body\.blocked\)/.test(ROUTE), 'setUserBlocked дуудахгүй ✗');
  assert.ok(/blocked: isUserBlocked\(user\)/.test(ROUTE), 'хариуд blocked буцаахгүй ✗');
});

t('③ өөрийгөө блоклохоос ХАМГААЛНА (системээс түгжихээс сэргийлж)', () => {
  assert.ok(/if \(self && hasBlocked && body\.blocked\)/.test(ROUTE),
    'өөрийгөө блоклох хамгаалалт алга ✗');
});

// ────────────────────────────────────────────────────────────
// ④ `lib/adminApi.js`
// ────────────────────────────────────────────────────────────
console.log('\n── ④ lib/adminApi.js — клиент туслах ──');

t('④ `updateUserBlocked(userId, blocked)` нь PATCH `{ blocked }` илгээнэ', () => {
  assert.ok(/export function updateUserBlocked\(userId, blocked\)/.test(API),
    'updateUserBlocked экспортгүй ✗');
  assert.ok(/JSON\.stringify\(\{ blocked \}\)/.test(API), '`{ blocked }` илгээхгүй ✗');
});

// ────────────────────────────────────────────────────────────
// ⑤ `components/AdminUsersClient.jsx`
// ────────────────────────────────────────────────────────────
console.log('\n── ⑤ components/AdminUsersClient.jsx — админ UI ──');

t('⑤ `updateUserBlocked` импортолж, `toggleBlock`-оор дуудна', () => {
  assert.ok(/import \{[^}]*updateUserBlocked[^}]*\} from '\.\.\/lib\/adminApi'/.test(codeOnly(UI)),
    'updateUserBlocked импортгүй ✗');
  assert.ok(/const toggleBlock = async \(row\) =>/.test(UI), 'toggleBlock алга ✗');
  assert.ok(/await updateUserBlocked\(row\.id, next\)/.test(UI), 'updateUserBlocked дуудахгүй ✗');
});

t('⑤ блоклох нь баталгаа (window.confirm) + үр дагаврыг тайлбарласан', () => {
  assert.ok(/window\.confirm\(/.test(UI), 'баталгаа асуухгүй ✗');
  assert.ok(UI.includes('ХАРАГДАХГҮЙ'), 'зар харагдахгүй гэдэг тайлбар алга ✗');
  assert.ok(UI.includes('НЭВТРЭХ боломжгүй'), 'нэвтрэх боломжгүй тайлбар алга ✗');
});

t('⑤ «🚫 Блоклох» ба «✅ Блокыг авах» товч + БЛОКЛОГДСОН шошго + статистик', () => {
  assert.ok(UI.includes('🚫 Блоклох'), '«🚫 Блоклох» товч алга ✗');
  assert.ok(UI.includes('✅ Блокыг авах'), '«✅ Блокыг авах» товч алга ✗');
  assert.ok(UI.includes('БЛОКЛОГДСОН'), 'БЛОКЛОГДСОН шошго алга ✗');
  assert.ok(UI.includes('🚫 Блоклогдсон'), 'статистик «🚫 Блоклогдсон» алга ✗');
});

t('⑤ хүснэгтэд «Төлөв» багана нэмэгдэж, colSpan 7 болов', () => {
  assert.ok(/text-center">Төлөв</.test(UI), '«Төлөв» багана алга ✗');
  assert.ok(/colSpan=\{7\}/.test(UI), 'colSpan 7 болоогүй ✗');
});

// ────────────────────────────────────────────────────────────
// ⑥ `components/AppProviders.jsx` — нэвтрэлтийн алдаа
// ────────────────────────────────────────────────────────────
console.log('\n── ⑥ components/AppProviders.jsx — нэвтрэх алдаа ──');

t('⑥ бан (banned) алдааг ойлгомжтой монгол мессеж болгоно', () => {
  assert.ok(/msg\.includes\('banned'\)/.test(PROVIDERS), 'banned алдаа шалгахгүй байна ✗');
  assert.ok(PROVIDERS.includes('блоклогдсон байна'), 'монгол мессеж алга ✗');
});

// ────────────────────────────────────────────────────────────
// ⑦ 📄 README
// ────────────────────────────────────────────────────────────
console.log('\n── ⑦ README — баримт ──');

t('⑦ README: блоклох боломж + migration + тест бичигдсэн', () => {
  assert.ok(README.includes('0038_user_blocks.sql'), 'README-д 0038 migration алга ✗');
  assert.ok(README.includes('Блоклох'), 'README-д «Блоклох» тайлбар алга ✗');
  assert.ok(README.includes('test:block'), 'README-д test:block алга ✗');
});

console.log(`\n✅ Нийт ${passed} тест амжилттай — 🚫 хэрэглэгч блоклох гэрээ түгжигдэв\n`);
