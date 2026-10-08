// ============================================================
// test-search-history.mjs — 🕐 «ХАЙЛТЫН ТҮҮХ»-ийн тест
//
// ХАМРАХ ХҮРЭЭ:
//   ① `lib/searchHistory.mjs` — ЦЭВЭР логик: URL → картын мэдээлэл
//      (категорийн leaf, зам, байршил, түлхүүр үг), харьцангуй цаг,
//      бүртгэл (давхардал/дээд тоо), localStorage жагсаалт
//   ② ГЭРЭЭ: `HomeClient` (авто-бүртгэл), `HeaderIcons` (ClockIcon),
//      `AppProviders` (Мессежийн дараах товч), `SearchHistoryClient`,
//      `/history` хуудас, `lib/searchHistory.js` (hybrid) ба migration 0032
//      бүгд `lib/searchHistory.mjs`-ийг/хүснэгтийг ХЭРЭГЛЭЖ байгаа эсэх
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Картын ГОЛ шошго (категорийн СҮҮЛИЙН нэр) нь URL-ээс бодогддог тул
//   формат эвдэрвэл хэрэглэгч ХААНД хайснаа мэдэхгүй болно ✗. Мөн бүртгэлийн
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
  historyCategoryLeaf, historyDescriptor, historyKey, historyTimeAgo,
  isHistoryUrl, newHistoryId, normalizeHistoryRow, parseHistoryList,
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

/** Шалгах линк угсарна (encode-той — `HomeClient`-ийн URL эффекттэй ИЖИЛ) */
const link = (q) => `/?${new URLSearchParams(q).toString()}`;

console.log('\n🧪 Хайлтын түүх — URL → карт, харьцангуй цаг, бүртгэл\n');

// ---------- ① Картын мэдээлэл (URL → leaf/зам/байршил/түлхүүр үг) ----------
t('① descriptor: категорийн СҮҮЛИЙН нэр (ж: Цахилгаан бараа → Угаалгын машин)', () => {
  const d = historyDescriptor(link({ section: 'electric', type: 'Угаалгын машин' }));
  assert.equal(d.leaf, 'Угаалгын машин');
  assert.equal(d.category, 'Цахилгаан бараа — Угаалгын машин');
});

t('② leaf нь ӨРӨӨНИЙ мөрийг ҲАСАЖ бодогдоно (rooms нь категори БИШ)', () => {
  const d = historyDescriptor(link({
    category: 'sell', section: 'real-estate', type: 'Орон сууц', rooms: '3',
  }));
  assert.equal(d.leaf, 'Орон сууц зарна');
  assert.equal(d.category, 'Үл хөдлөх — Үл хөдлөх зарна — Орон сууц зарна — 3 өрөө');
});

t('③ descriptor: байршил + хайсан түлхүүр үг (`q`)', () => {
  const d = historyDescriptor(link({
    section: 'real-estate', district: 'Хан-Уул', khoroo: 'Нүхтийн ам', q: 'орон сууц',
  }));
  assert.equal(d.location, 'Хан-Уул, Нүхтийн ам');
  assert.equal(d.keyword, 'орон сууц');
});

t('④ descriptor: өрөө/үнийн нэмэлт (chip) ба «Бүх зар» → хоосон leaf', () => {
  const d = historyDescriptor(link({ section: 'real-estate', rooms: '2,3', minPrice: '1000000' }));
  assert.deepEqual(d.rooms, ['2', '3']);
  assert.equal(d.minPrice, '1000000');
  const empty = historyDescriptor('/?view=map');
  assert.equal(empty.leaf, '');
  assert.equal(empty.category, '');
});

t('⑤ historyKey/isHistoryUrl: «Бүх зар» (зөвхөн view/sort) → утгагүй', () => {
  assert.equal(isHistoryUrl('/?section=electric'), true);
  assert.equal(isHistoryUrl('/?q=ноутбук'), true);
  assert.equal(isHistoryUrl('/?view=map&sort=price_asc'), false);
  assert.equal(isHistoryUrl('/'), false);
  assert.equal(historyKey('/?section=electric&page=3'), 'section=electric');
});

// ---------- ② Харьцангуй цаг (time-ago) ----------
t('⑥ historyTimeAgo: Саяхан/минут/цаг/Өчигдөр/өдөр/огноо', () => {
  const now = Date.parse('2026-10-07T12:00:00Z');
  const at = (sec) => new Date(now - sec * 1000).toISOString();
  assert.equal(historyTimeAgo(at(5), now), 'Саяхан');
  assert.equal(historyTimeAgo(at(5 * 60), now), '5 минутын өмнө');
  assert.equal(historyTimeAgo(at(2 * 3600), now), '2 цагийн өмнө');
  assert.equal(historyTimeAgo(at(26 * 3600), now), 'Өчигдөр');
  assert.equal(historyTimeAgo(at(3 * 86400), now), '3 өдрийн өмнө');
  assert.equal(historyTimeAgo('', now), '');
  assert.match(historyTimeAgo(at(30 * 86400), now), /^\d{4}\.\d{2}\.\d{2}$/);
});

// ---------- ③ Бүртгэх (давхардал/дээд тоо) ----------
t('⑦ recordHistory: ижил хайлт → давхардахгүй, ЭХЭНД шилжиж, id ХЭВЭЭР', () => {
  const first = recordHistory([], '/?section=electric', 't1');
  assert.equal(first.ok, true);
  const id = first.entry.id;
  const second = recordHistory(
    [...first.list, { id: 'z', url: '/?section=auto', createdAt: 't0' }],
    '/?section=electric&page=2', 't2'
  );
  assert.equal(second.list.length, 2, `2 байх ёстой, ${second.list.length} ✗`);
  assert.equal(second.list[0].createdAt, 't2', 'шинэ нь эхэнд ✗');
  assert.equal(second.list[0].id, id, 'ижил хайлтын id хэвээр байх ёстой ✗');
  assert.equal(second.list[1].url, '/?section=auto');
});

t('⑧ recordHistory: «Бүх зар» (утгагүй) → ok:false, жагсаалт ХӨНДӨӨГДӨХГҮЙ', () => {
  const base = [{ id: 'a', url: '/?section=auto', createdAt: 't' }];
  const res = recordHistory(base, '/?page=3', 'now');
  assert.equal(res.ok, false);
  assert.equal(res.list, base, 'ижил объект буцаах ёстой ✗');
  assert.equal(res.entry, null);
});

t('⑨ recordHistory: дээд тоо (`SEARCH_HISTORY_LIMIT`) хүндэтгэнэ', () => {
  let list = [];
  for (let i = 0; i < SEARCH_HISTORY_LIMIT + 25; i += 1) {
    list = recordHistory(list, `/?section=real-estate&maxPrice=${i}`, 't').list;
  }
  assert.equal(list.length, SEARCH_HISTORY_LIMIT, `${list.length} ✗`);
});

// ---------- ④ Жагсаалтын түвшин (localStorage/DB) ----------
t('⑩ normalizeHistoryRow: DB (`last_seen_at`) ба local (`createdAt`) хоёулаа', () => {
  assert.equal(normalizeHistoryRow({ id: '1', url: '/?a=b', last_seen_at: 'S' }).createdAt, 'S');
  assert.equal(normalizeHistoryRow({ id: '1', url: '/?a=b', createdAt: 'L' }).createdAt, 'L');
  assert.equal(normalizeHistoryRow({ url: '   ' }), null);
  assert.equal(normalizeHistoryRow(null), null);
});

t('⑪ parseHistoryList: давхардал/хог/хоосон URL-ыг шүүнэ (эвдэрхий → [])', () => {
  const url = '/?section=real-estate&category=sell';
  const list = parseHistoryList(JSON.stringify([
    { id: 'a', url, createdAt: 't1' },
    { id: 'b', url: `${url}&page=4` },   // давхардал (page хасагдана) → хасагдана
    { id: 'c', url: '' },                // URL хоосон → хасагдана
    'x',                                  // объект биш → хасагдана
    { id: 'd', url: '/?section=auto' },
  ]));
  assert.equal(list.length, 2, `2 байх ёстой, ${list.length} ✗`);
  assert.equal(list[0].id, 'a');
  assert.equal(list[1].id, 'd');
  assert.deepEqual(parseHistoryList('{bad json'), []);
  assert.deepEqual(parseHistoryList(null), []);
  assert.deepEqual(parseHistoryList('"текст"'), []);
});

t('⑫ serializeHistoryList ↔ parseHistoryList тойрог', () => {
  const items = [{ id: 'x', url: '/?section=auto', createdAt: '2026-10-07T00:00:00Z' }];
  const back = parseHistoryList(serializeHistoryList(items));
  assert.equal(back.length, 1);
  assert.equal(back[0].url, '/?section=auto');
  assert.equal(back[0].createdAt, '2026-10-07T00:00:00Z');
});

t('⑬ newHistoryId: давтагдашгүй `h…` id; SEARCH_HISTORY_KEY мөр', () => {
  const a = newHistoryId();
  const b = newHistoryId();
  assert.match(a, /^h/);
  assert.notEqual(a, b);
  assert.equal(typeof SEARCH_HISTORY_KEY, 'string');
});


// ---------- ⑤ ГЭРЭЭ: UI / модуль / миграц ----------
t('⑭ ГЭРЭЭ: HeaderIcons нь ClockIcon (цагийн) экспортолно', () => {
  const icons = codeOnly(readSrc('components/HeaderIcons.jsx'));
  assert.match(icons, /export function ClockIcon\(/, 'ClockIcon алга ✗');
  assert.match(icons, /<circle cx="12" cy="12"/, 'циферблат алга ✗');
  assert.match(icons, /M12 12V6\.8/, 'минутын зүү (дээшээ) алга ✗');
  assert.match(icons, /M12 12H16\.4/, 'цагийн зүү (баруушаа) алга ✗');
});

t('⑮ ГЭРЭЭ: AppProviders нь Мессежийн ДАРАА цагийн товч + цэс + footer', () => {
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

t('⑯ ГЭРЭЭ: SearchHistoryClient — карт (leaf + БҮТЭН КАРТ линк + «Хасах»)', () => {
  const c = codeOnly(readSrc('components/SearchHistoryClient.jsx'));
  assert.match(c, /historyDescriptor\(it\.url\)/, 'шошгыг URL-ээс бодохгүй ✗');
  assert.match(c, /historyTimeAgo\(it\.createdAt\)/, 'харьцангуй цаг алга ✗');
  assert.match(c, /data-search-history-list/);
  assert.match(c, /data-search-history-row/);
  assert.match(c, /data-search-history-open/);
  assert.match(c, /data-search-history-remove/);
  assert.match(c, /desc\.leaf/, 'leaf харуулахгүй ✗');
  // ✏️ 2026-10-07: карт БҮХЭЛДЭЭ дарагдана — «Дахин хайх» товч ХАСАГДАВ ✓
  assert.ok(!/Дахин хайх/.test(c), '«Дахин хайх» товч ХАСАГДААГҮЙ ✗');
  assert.match(c, /absolute inset-0 z-10/, 'бүтэн картын overlay линк алга ✗');
  assert.match(c, /href=\{it\.url\}/, 'картын линк хайлтын URL рүү биш ✗');
  assert.match(c, /Хасах/, '«Хасах» товч алга ✗');
  assert.ok(!/>\s*устгах\s*</.test(c), '«устгах» товчны нэр ХӨНДӨӨГДӨӨГҮЙ ✗');
});

t('⑰ ГЭРЭЭ: /history хуудас SearchHistoryClient-ийг render хийнэ', () => {
  const p = codeOnly(readSrc('app/history/page.jsx'));
  assert.match(p, /import SearchHistoryClient from '\.\.\/\.\.\/components\/SearchHistoryClient'/);
  assert.match(p, /<SearchHistoryClient \/>/);
  assert.match(p, /export const metadata = \{ title: 'Хайлтын түүх/);
});

t('⑱ ГЭРЭЭ: lib/searchHistory.js — hybrid (DB + localStorage + миграц + upsert)', () => {
  const s = codeOnly(readSrc('lib/searchHistory.js'));
  assert.match(s, /export function useSearchHistory\(user\)/);
  assert.match(s, /const DB_TABLE = 'search_history'/);
  assert.match(s, /SEARCH_HISTORY_KEY/);
  assert.match(s, /migrateLocalToDb/);
  assert.match(s, /applyLocal\(\)/);
  assert.match(s, /\.upsert\(/, 'upsert (давхардал нэгтгэх) алга ✗');
  assert.match(s, /onConflict: 'user_id,key'/);
});

t('⑲ ГЭРЭЭ: HomeClient нь хайлтыг АВТОМАТААР бүртгэнэ (debounce)', () => {
  const home = codeOnly(readSrc('components/HomeClient.jsx'));
  assert.match(home, /useSearchHistory\(user\)/);
  assert.match(home, /historyRecordRef/, 'ref-ээр дуудахгүй ✗');
  assert.match(home, /isSaveableSearch\(next\)/, 'утгагүй хайлтыг шалгахгүй ✗');
  assert.match(home, /historyRecordRef\.current\(next\)/, 'бүртгэх дуудалт алга ✗');
  assert.match(home, /setTimeout\(/, 'debounce таймер алга ✗');
});

t('⑳ ГЭРЭЭ: migration 0032 — хүснэгт + RLS + UPDATE policy БАЙНА + unique(key)', () => {
  const sql = readSrc('supabase/migrations/0032_search_history.sql');
  assert.match(sql, /create table if not exists public\.search_history/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /search_history_select_own/);
  assert.match(sql, /search_history_insert_own/);
  assert.match(sql, /search_history_delete_own/);
  assert.match(sql, /unique \(user_id, key\)/i);
  // ⚠️ 0031-ээс ЯЛГААТАЙ: хайлтын түүхэд UPDATE policy ЗААВАЛ байна (upsert)
  assert.match(sql, /search_history_update_own/);
  assert.match(sql, /for update to authenticated/i);
  assert.match(sql, /revoke all on public\.search_history from anon/i);
  assert.match(sql, /grant select, insert, update, delete on public\.search_history/i);
});

t('㉑ ГЭРЭЭ: `npm run test:search-history` бүртгэгдсэн', () => {
  const pkg = JSON.parse(readSrc('package.json'));
  assert.equal(pkg.scripts['test:search-history'], 'node scripts/test-search-history.mjs');
});

console.log(`\n✅ Нийт ${passed} тест амжилттай — 🕐 хайлтын түүх (URL → карт, давхардал, hybrid хадгалалт)\n`);

