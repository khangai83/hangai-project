// ============================================================
// test-search-history.mjs — 🕐 «ХАЙЛТЫН ТҮҮХ»-ийн тест
//
// ✏️ 2026-10-08 (68) ХҮСЭЛТ: «хайлтын түүх дээр орж үзсэн заруудыг л зөвхөн
//    гаргадаг болгоорой, одоо хайлтыг гаргаад байгаа, энэ нэрийг хэвээр үлдээ»
//    ⇒ тестийн ГОЛ ГЭРЭЭ: түүхэд ЗӨВХӨН `/listings/<id>` бичигдэж, ХАЙЛТЫН
//    линк (`/?section=…`) бичигдэхгүй; хуучин хайлтын мөрүүд ШҮҮГДЭНЭ ✓
//
// ХАМРАХ ХҮРЭЭ:
//   ① `lib/searchHistory.mjs` — ЦЭВЭР логик: линк → зарын id, каноник линк,
//      бүртгэл (давхардал/дээд тоо), харьцангуй цаг, картын нэгтгэл,
//      localStorage жагсаалт
//   ② ГЭРЭЭ: `ListingDetailClient` (зар нээх бүрд бүртгэнэ), `HomeClient`
//      (хайлт бүртгэх КОД БАЙХГҮЙ — хасагдсан), `HeaderIcons` (ClockIcon),
//      `AppProviders` (Мессежийн дараах товч), `SearchHistoryClient` (зарын
//      карт), `/history` хуудас (нэр ХЭВЭЭР), `lib/searchHistory.js` (hybrid),
//      migration 0032 бүгд зөв эсэх
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Хайлт дахин бүртгэгдэж эхэлбэл хэрэглэгчийн хүсэлт ЭВДЭРНЭ ✗; холбоосын
//   хэв өөрчлөгдвөл (`/listings/<id>` биш) түүх хоосон болно ✗. Мөн бүртгэлийн
//   давхардал/дээд тоо буруу бол түүх хавдана ✗. Энэ тест тэр гэрээнүүдийг
//   түгждэг ✓
//
// АЖИЛЛУУЛАХ:  npm run test:search-history
// ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (модуль нь `.mjs` цэвэр модулиудыг
//    л импортолно; React/window байхгүй ✓)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  SEARCH_HISTORY_KEY, SEARCH_HISTORY_LIMIT,
  historyKey, historyListingId, historyTimeAgo, isHistoryUrl, listingHistoryUrl,
  mergeHistoryListings, newHistoryId, normalizeHistoryRow, parseHistoryList,
  recordHistory, serializeHistoryList,
} from '../lib/searchHistory.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Комментгүй ЦЭВЭР КОД — «хасагдсан/тайлбарласан» текст нь хуурамч ногоон
 *  өгөхгүйн тулд шалгалтыг зөвхөн кодын мөрүүд дээр хийнэ ✓ */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

/** ХАЙЛТЫН линк (encode-той — `HomeClient`-ийн URL эффекттэй ИЖИЛ) —
 *  ⚠️ эдгээр нь түүхэд ОРОХГҮЙ (сөрөг тестэд хэрэглэнэ ✓) */
const link = (q) => `/?${new URLSearchParams(q).toString()}`;

console.log('\n🧪 Хайлтын түүх — ҮЗСЭН ЗАРУУД (линк → id, карт, бүртгэл)\n');

// ---------- ① Линк → зарын id (түүхэд ОРОХ утга) ----------
t('① historyListingId: `/listings/<id>` → id (бүтэн линк, query, `/`-тай ч)', () => {
  assert.equal(historyListingId('/listings/abc-123'), 'abc-123');
  assert.equal(historyListingId('https://zarbook.mn/listings/abc-123?utm=x#top'), 'abc-123');
  assert.equal(historyListingId('/listings/abc-123/'), 'abc-123');
  assert.equal(historyListingId('  /listings/abc-123  '), 'abc-123');
});

t('② historyListingId: ХАЙЛТЫН линк/бусад хуудас → `\'\'` (түүхэд ОРОХГҮЙ ✗)', () => {
  assert.equal(historyListingId(link({ section: 'electric', type: 'Угаалгын машин' })), '');
  assert.equal(historyListingId(link({ q: 'ноутбук' })), '');
  assert.equal(historyListingId('/'), '');
  assert.equal(historyListingId('/listings'), '');
  assert.equal(historyListingId('/listings/abc/extra'), '');
  assert.equal(historyListingId(''), '');
  assert.equal(historyListingId(null), '');
  assert.equal(historyListingId('https://'), '');
});

t('③ listingHistoryUrl/historyKey/isHistoryUrl: каноник линк нь `/listings/<id>`', () => {
  assert.equal(listingHistoryUrl('abc'), '/listings/abc');
  assert.equal(listingHistoryUrl(''), '');
  assert.equal(historyKey('/listings/abc?utm=x'), '/listings/abc', 'query хасагдах ёстой ✗');
  assert.equal(historyKey(link({ section: 'auto' })), '', 'хайлтын линк түлхүүр БОЛОХГҮЙ ✗');
  assert.equal(isHistoryUrl('/listings/abc'), true);
  assert.equal(isHistoryUrl(link({ section: 'auto' })), false);
  assert.equal(isHistoryUrl('/'), false);
});

// ---------- ② Харьцангуй цаг (time-ago) ----------
t('④ historyTimeAgo: Саяхан/минут/цаг/Өчигдөр/өдөр/огноо', () => {
  const now = Date.parse('2026-10-08T12:00:00Z');
  const at = (sec) => new Date(now - sec * 1000).toISOString();
  assert.equal(historyTimeAgo(at(5), now), 'Саяхан');
  assert.equal(historyTimeAgo(at(5 * 60), now), '5 минутын өмнө');
  assert.equal(historyTimeAgo(at(2 * 3600), now), '2 цагийн өмнө');
  assert.equal(historyTimeAgo(at(26 * 3600), now), 'Өчигдөр');
  assert.equal(historyTimeAgo(at(3 * 86400), now), '3 өдрийн өмнө');
  assert.equal(historyTimeAgo('', now), '');
  assert.match(historyTimeAgo(at(30 * 86400), now), /^\d{4}\.\d{2}\.\d{2}$/);
});

// ---------- ③ Бүртгэх (давхардал / утгагүй линк / дээд тоо) ----------
t('⑤ recordHistory: ижил ЗАР → давхардахгүй, ЭХЭНД шилжиж, id ХЭВЭЭР', () => {
  const first = recordHistory([], '/listings/abc', 't1');
  assert.equal(first.ok, true);
  assert.equal(first.entry.url, '/listings/abc', 'каноник линк бичигдэх ёстой ✗');
  assert.equal(first.entry.listingId, 'abc');
  const id = first.entry.id;
  const second = recordHistory(
    [...first.list, { id: 'z', url: '/listings/other', listingId: 'other', createdAt: 't0' }],
    '/listings/abc?utm=x', // ижил зар, өөр query → НЭГ мөр ✓
    't2'
  );
  assert.equal(second.list.length, 2, `2 байх ёстой, ${second.list.length} ✗`);
  assert.equal(second.list[0].createdAt, 't2', 'шинэ нь эхэнд ✗');
  assert.equal(second.list[0].id, id, 'ижил зарын id хэвээр байх ёстой ✗');
  assert.equal(second.list[0].url, '/listings/abc');
  assert.equal(second.list[1].url, '/listings/other');
});

t('⑥ recordHistory: ХАЙЛТЫН линк → ok:false, жагсаалт ХӨНДӨӨГДӨХГҮЙ ✓', () => {
  const base = [{ id: 'a', url: '/listings/auto', listingId: 'auto', createdAt: 't' }];
  [link({ section: 'electric' }), link({ q: 'ноутбук' }), '/', '', null].forEach((bad) => {
    const res = recordHistory(base, bad, 'now');
    assert.equal(res.ok, false, `«${bad}» бүртгэгдэх ёсгүй ✗`);
    assert.equal(res.list, base, 'ижил объект буцаах ёстой ✗');
    assert.equal(res.entry, null);
  });
});

t('⑦ recordHistory: дээд тоо (`SEARCH_HISTORY_LIMIT`) хүндэтгэнэ', () => {
  let list = [];
  for (let i = 0; i < SEARCH_HISTORY_LIMIT + 25; i += 1) {
    list = recordHistory(list, `/listings/id-${i}`, 't').list;
  }
  assert.equal(list.length, SEARCH_HISTORY_LIMIT, `${list.length} ✗`);
});

// ---------- ④ Жагсаалтын түвшин (localStorage/DB) ----------
t('⑧ normalizeHistoryRow: зарын мөр OK (`last_seen_at`/`createdAt` хоёулаа)', () => {
  const db = normalizeHistoryRow({ id: '1', url: '/listings/abc', last_seen_at: 'S' });
  assert.equal(db.createdAt, 'S');
  assert.equal(db.listingId, 'abc');
  assert.equal(db.url, '/listings/abc');
  const local = normalizeHistoryRow({ id: '2', url: '/listings/def', createdAt: 'L' });
  assert.equal(local.createdAt, 'L');
  assert.equal(local.listingId, 'def');
});

t('⑨ normalizeHistoryRow: ХУУЧИН хайлтын мөр (`/?…`) → `null` (шүүгдэнэ ✓)', () => {
  assert.equal(normalizeHistoryRow({ id: '1', url: link({ section: 'electric' }), last_seen_at: 'S' }), null);
  assert.equal(normalizeHistoryRow({ id: '2', url: '/' }), null);
  assert.equal(normalizeHistoryRow({ id: '3', url: '   ' }), null);
  assert.equal(normalizeHistoryRow({ url: '' }), null);
  assert.equal(normalizeHistoryRow(null), null);
  assert.equal(normalizeHistoryRow('x'), null);
});

t('⑩ normalizeHistoryRow: бүтэн линк хадгалагдсан ч каноник болно ✓', () => {
  const r = normalizeHistoryRow({ id: '1', url: 'https://zarbook.mn/listings/xyz?utm=a', createdAt: 'T' });
  assert.equal(r.url, '/listings/xyz');
  assert.equal(r.listingId, 'xyz');
});

t('⑪ parseHistoryList: давхардал/хог/хайлтын мөрийг шүүнэ (эвдэрхий → [])', () => {
  const list = parseHistoryList(JSON.stringify([
    { id: 'a', url: '/listings/one', createdAt: 't1' },
    { id: 'b', url: '/listings/one?utm=x' },   // давхардал → хасагдана
    { id: 'c', url: link({ section: 'auto' }) }, // ХАЙЛТЫН мөр → хасагдана
    { id: 'd', url: '' },                      // хоосон → хасагдана
    'x',                                       // объект биш → хасагдана
    { id: 'e', url: '/listings/two' },
  ]));
  assert.equal(list.length, 2, `2 байх ёстой, ${list.length} ✗`);
  assert.equal(list[0].id, 'a');
  assert.equal(list[1].id, 'e');
  assert.deepEqual(parseHistoryList('{bad json'), []);
  assert.deepEqual(parseHistoryList(null), []);
  assert.deepEqual(parseHistoryList('"текст"'), []);
});

t('⑫ serializeHistoryList ↔ parseHistoryList тойрог', () => {
  const items = [{ id: 'x', url: '/listings/abc', listingId: 'abc', createdAt: '2026-10-08T00:00:00Z' }];
  const back = parseHistoryList(serializeHistoryList(items));
  assert.equal(back.length, 1);
  assert.equal(back[0].url, '/listings/abc');
  assert.equal(back[0].listingId, 'abc');
  assert.equal(back[0].createdAt, '2026-10-08T00:00:00Z');
});

t('⑬ newHistoryId: давтагдашгүй `h…` id; SEARCH_HISTORY_KEY мөр', () => {
  const a = newHistoryId();
  const b = newHistoryId();
  assert.match(a, /^h/);
  assert.notEqual(a, b);
  assert.equal(typeof SEARCH_HISTORY_KEY, 'string');
});


// ---------- ⑤ Картын нэгтгэл (түүх + `listings`) ----------
t('⑭ mergeHistoryListings: дараалал ХАДГАЛАГДАЖ, устсан зар ХАСАГДАНА', () => {
  const items = [
    { id: 'r1', url: '/listings/a', listingId: 'a', createdAt: '2026-10-08T10:00:00Z' },
    { id: 'r2', url: '/listings/b', listingId: 'b', createdAt: '2026-10-08T09:00:00Z' },
    { id: 'r3', url: '/listings/gone', listingId: 'gone', createdAt: '2026-10-08T08:00:00Z' },
  ];
  // ⚠️ `listings` нь өөр дараалалтай ирнэ (DB-ийн дараалалд найдахгүй ✓)
  const rows = mergeHistoryListings(items, [
    { id: 'b', title: 'B' }, { id: 'a', title: 'A' },
  ]);
  assert.equal(rows.length, 2, `2 байх ёстой, ${rows.length} ✗`);
  assert.deepEqual(rows.map((r) => r.listingId), ['a', 'b'], 'түүхийн дараалал эвдэрсэн ✗');
  assert.equal(rows[0].listing.title, 'A', 'зарын мэдээлэл холбогдоогүй ✗');
  assert.equal(rows[0].createdAt, items[0].createdAt);
  assert.equal(rows[0].url, '/listings/a');
});

t('⑮ mergeHistoryListings: `listingId` талбаргүй ч линкээс задалж холбоно', () => {
  const rows = mergeHistoryListings(
    [{ id: 'r1', url: '/listings/abc', createdAt: 't' }],
    [{ id: 'abc', title: 'X' }]
  );
  assert.equal(rows.length, 1);
  assert.equal(rows[0].listingId, 'abc');
  assert.equal(rows[0].listing.title, 'X');
});

t('⑯ mergeHistoryListings: хайлтын мөр/хоосон/эвдэрхий оролт → алдаагүй', () => {
  // хайлтын мөр карт БОЛОХГҮЙ (id-гүй, линк нь зарын биш) ✓
  assert.deepEqual(mergeHistoryListings([{ id: 'r', url: link({ section: 'auto' }) }], [{ id: 'auto' }]), []);
  assert.deepEqual(mergeHistoryListings([], [{ id: 'a' }]), []);
  assert.deepEqual(mergeHistoryListings([{ id: 'r', url: '/listings/a', listingId: 'a' }], []), []);
  assert.deepEqual(mergeHistoryListings(null, null), []);
  assert.deepEqual(mergeHistoryListings([null, undefined], [{ id: 'a' }]), []);
});

t('⑰ Модуль: хайлтын descriptor (`historyDescriptor`/`historyCategoryLeaf`) БАЙХГҮЙ ✓', () => {
  const src = readSrc('lib/searchHistory.mjs');
  assert.ok(!/export function historyDescriptor/.test(src), 'historyDescriptor ХАСАГДААГҮЙ ✗');
  assert.ok(!/export function historyCategoryLeaf/.test(src), 'historyCategoryLeaf ХАСАГДААГҮЙ ✗');
  assert.match(src, /export function historyListingId/);
  assert.match(src, /export function mergeHistoryListings/);
  assert.match(src, /export function recordHistory/);
});


// ---------- ⑥ ГЭРЭЭ: UI / модуль / миграц ----------
t('⑱ ГЭРЭЭ: HeaderIcons нь ClockIcon (цагийн) экспортолно', () => {
  const icons = codeOnly(readSrc('components/HeaderIcons.jsx'));
  assert.match(icons, /export function ClockIcon\(/, 'ClockIcon алга ✗');
  assert.match(icons, /<circle cx="12" cy="12"/, 'циферблат алга ✗');
  assert.match(icons, /M12 12V6\.8/, 'минутын зүү (дээшээ) алга ✗');
  assert.match(icons, /M12 12H16\.4/, 'цагийн зүү (баруушаа) алга ✗');
});

t('⑲ ГЭРЭЭ: AppProviders нь Мессежийн ДАРАА цагийн товч + цэс + footer', () => {
  const app = codeOnly(readSrc('components/AppProviders.jsx'));
  // ⚠️ 2026-10-08 (67): хонхны `BellIcon` нэмэгдсэн тул зөвхөн 3 иконыг
  //    ШААРДАЖ, нэмэлт икон байхыг ЗӨВШӨӨРНӨ (дараалал Heart→Chat→Clock ХЭВЭЭР ✓)
  assert.match(app, /import \{ [^}]*\bHeartIcon\b[^}]*\bChatIcon\b[^}]*\bClockIcon\b[^}]*\} from '\.\/HeaderIcons'/);
  const mi = app.indexOf('href="/messages"');
  const hi = app.indexOf('href="/history"');
  assert.ok(mi >= 0 && hi > mi, 'цагийн товч Мессежийн дараа БИШ ✗');
  assert.match(app, /<ClockIcon className="h-6 w-6/, 'толгойн ClockIcon (24px) алга ✗');
  assert.match(app, /key: 'history'/, 'цэсний зүйл (`key: history`) алга ✗');
  assert.match(app, /h-\[14px\] w-\[14px\]/, 'footer-ийн ClockIcon (14px) алга ✗');
});

t('⑳ ГЭРЭЭ: ListingDetailClient ЗАР НЭЭХ бүрд `recordListingView()` дуудна', () => {
  const c = codeOnly(readSrc('components/ListingDetailClient.jsx'));
  assert.match(c, /import \{ recordListingView \} from '\.\.\/lib\/searchHistory'/, 'импорт алга ✗');
  assert.match(c, /recordListingView\(\(user && user\.id\) \|\| null, id\)/, 'бүртгэлийн дуудалт алга ✗');
  assert.match(c, /\}, \[id, user\]\);/, 'эффектийн deps буруу ✗');
});

t('㉑ ГЭРЭЭ: HomeClient ХАЙЛТЫГ БҮРТГЭХЭЭ БОЛИВ (debounce/ref ХАСАГДСАН ✓)', () => {
  const home = codeOnly(readSrc('components/HomeClient.jsx'));
  assert.ok(!/useSearchHistory/.test(home), 'HomeClient дотор useSearchHistory ХЭВЭЭР ✗');
  assert.ok(!/historyRecordRef/.test(home), 'historyRecordRef ХЭСЭГЧЛЭН үлдсэн ✗');
  assert.ok(!/historyTimer/.test(home), 'historyTimer ХЭСЭГЧЛЭН үлдсэн ✗');
  // ⚠️ `isSaveableSearch` нь «🔖 Хайлт хадгалах» товчинд ХЭВЭЭР хэрэгтэй ✓
  assert.match(home, /isSaveableSearch/, '🔖 хадгалах товчны шалгалт эвдэрсэн ✗');
});


t('㉒ ГЭРЭЭ: SearchHistoryClient — ҮЗСЭН ЗАРЫН карт (ListingCard + «Хасах»)', () => {
  const c = codeOnly(readSrc('components/SearchHistoryClient.jsx'));
  assert.match(c, /import ListingCard from '\.\/ListingCard'/, 'зарын карт ашиглахгүй ✗');
  assert.match(c, /import \{ mergeHistoryListings, historyTimeAgo \} from '\.\.\/lib\/searchHistory\.mjs'/);
  assert.match(c, /fetchListingsByIds\(ids\)/, 'заруудыг id-аар татахгүй ✗');
  assert.match(c, /mergeHistoryListings\(items, listings\)/);
  assert.match(c, /historyTimeAgo\(it\.createdAt\)/, 'харьцангуй цаг алга ✗');
  assert.match(c, /<ListingCard listing=\{it\.listing\} \/>/, 'картад зарын мэдээлэл дамжуулахгүй ✗');
  assert.match(c, /data-search-history-list/);
  assert.match(c, /data-search-history-row/);
  assert.match(c, /data-search-history-remove/);
  assert.match(c, /data-search-history-clear/);
  assert.match(c, /Хасах/, '«Хасах» товч алга ✗');
  // ⚠️ ХАЙЛТЫН ШҮҮЛТҮҮР (leaf/descriptor) карт дээр ГАРАХГҮЙ болсон ✓
  assert.ok(!/historyDescriptor/.test(c), 'хуучин descriptor хэрэглэгдсээр ✗');
  assert.ok(!/desc\.leaf/.test(c), 'категорийн leaf карт дээр үлдсэн ✗');
});

t('㉓ ГЭРЭЭ: /history хуудас — НЭР ХЭВЭЭР (`Хайлтын түүх`) ✓', () => {
  const p = readSrc('app/history/page.jsx');
  assert.match(p, /import SearchHistoryClient from '\.\.\/\.\.\/components\/SearchHistoryClient'/);
  assert.match(p, /<SearchHistoryClient \/>/);
  assert.match(p, /title: 'Хайлтын түүх/);
});

t('㉔ ГЭРЭЭ: SearchHistoryClient гарчиг/товчны нэр ХЭВЭЭР (хэрэглэгчийн хүсэлт)', () => {
  const c = readSrc('components/SearchHistoryClient.jsx');
  assert.match(c, /🕐 Хайлтын түүх/, 'гарчиг солигдсон ✗');
  assert.match(c, /🗑 Бүгдийг цэвэрлэх/);
  assert.match(c, /үзсэн/, '«үзсэн» гэсэн тайлбар алга ✗');
});

t('㉕ ГЭРЭЭ: lib/searchHistory.js — hybrid (DB + local + миграц + upsert + устгал)', () => {
  const s = codeOnly(readSrc('lib/searchHistory.js'));
  assert.match(s, /export function useSearchHistory\(user\)/);
  assert.match(s, /export async function recordListingView\(userId, listingId\)/);
  assert.match(s, /const DB_TABLE = 'search_history'/);
  assert.match(s, /SEARCH_HISTORY_KEY/);
  assert.match(s, /migrateLocalToDb/);
  assert.match(s, /applyLocal\(\)/);
  assert.match(s, /\.upsert\(/, 'upsert (давхардал нэгтгэх) алга ✗');
  assert.match(s, /onConflict: 'user_id,key'/);
  // ⚠️ Хайлт бүртгэх `record()` ХАСАГДСАН; хуучин мөрүүд DB-ээс цэвэрлэгдэнэ ✓
  assert.ok(!/const record = useCallback/.test(s), 'hook дотор `record()` үлдсэн ✗');
  assert.match(s, /historyListingId\(r\.url\)/, 'хуучин хайлтын мөрийг DB-ээс шүүхгүй ✗');
});

t('㉖ ГЭРЭЭ: migration 0032 — хүснэгт + RLS + UPDATE policy БАЙНА + unique(key)', () => {
  const sql = readSrc('supabase/migrations/0032_search_history.sql');
  assert.match(sql, /create table if not exists public\.search_history/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /search_history_select_own/);
  assert.match(sql, /search_history_insert_own/);
  assert.match(sql, /search_history_delete_own/);
  assert.match(sql, /unique \(user_id, key\)/i);
  // ⚠️ 0031-ээс ЯЛГААТАЙ: түүхэд UPDATE policy ЗААВАЛ байна (upsert)
  assert.match(sql, /search_history_update_own/);
  assert.match(sql, /for update to authenticated/i);
  assert.match(sql, /revoke all on public\.search_history from anon/i);
  assert.match(sql, /grant select, insert, update, delete on public\.search_history/i);
});

t('㉗ ГЭРЭЭ: `npm run test:search-history` бүртгэгдсэн', () => {
  const pkg = JSON.parse(readSrc('package.json'));
  assert.equal(pkg.scripts['test:search-history'], 'node scripts/test-search-history.mjs');
});

console.log(`\n✅ Нийт ${passed} тест амжилттай — 🕐 хайлтын түүх (ЗӨВХӨН үзсэн зарууд)\n`);

