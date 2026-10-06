// ============================================================
// test-saved-searches.mjs — 🔖 «ХАДГАЛСАН ХАЙЛТ»-ын тест
//
// ХАМРАХ ХҮРЭЭ:
//   ① `lib/savedSearch.mjs` — ЦЭВЭР логик: URL → шошго (Категори/Байршил),
//      давхардлын түлхүүр, хадгалах эсэх, localStorage жагсаалт
//   ② ГЭРЭЭ: `HomeClient` (🔖 товч), `SavedSearchesClient`, `FavoritesClient`
//      (таб), `lib/savedSearches.js` (hybrid) ба migration 0031 бүгд
//      `lib/savedSearch.mjs`-ийг/хүснэгтийг ХЭРЭГЛЭЖ байгаа эсэх
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Хадгалсан хайлтын гарчиг (unegui.mn-ийн «Категори: … / Байршил: …») нь
//   URL-ээс бодогддог тул формат эвдэрвэл хэрэглэгч ХААНД хадгалснаа
//   мэдэхгүй болно ✗. Мөн давхардлын түлхүүр буруу бол нэг хайлт 2 удаа
//   хадгалагдана ✗. Энэ тест тэр хоёр гэрээг түгждэг ✓
//
// АЖИЛЛУУЛАХ:  npm run test:saved-searches
// ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (модуль нь `locationData.js` +
//    `.mjs` цэвэр модулиудыг л импортолно; React/window байхгүй ✓)
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  SAVED_SEARCH_LIMIT, SAVED_SEARCH_URL_MAX, SAVED_SEARCHES_KEY,
  isSaveableSearch, newSavedSearchId, normalizeSavedSearchRow,
  normalizeSavedSearchUrl, parseSavedSearchList, savedSearchDescriptor,
  savedSearchKey, savedSearchQueryString, savedSearchState,
  serializeSavedSearchList,
} from '../lib/savedSearch.mjs';

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

console.log('\n🧪 Хадгалсан хайлт — URL → шошго, давхардал, hybrid хадгалалт\n');

// ---------- ① URL → шошго (unegui.mn-ийн ЯГ формат) ----------
t('① descriptor: «Категори» ба «Байршил» нь unegui.mn-ийн мөрүүдтэй ижил', () => {
  const d = savedSearchDescriptor(link({
    category: 'sell', section: 'real-estate', type: 'Орон сууц', rooms: '3',
    district: 'Хан-Уул', khoroo: 'Нүхтийн ам',
  }));
  assert.equal(d.category, 'Үл хөдлөх — Үл хөдлөх зарна — Орон сууц зарна — 3 өрөө');
  assert.equal(d.location, 'Хан-Уул, Нүхтийн ам');
  assert.equal(d.title, 'Үл хөдлөх — Үл хөдлөх зарна — Орон сууц зарна — 3 өрөө · Хан-Уул, Нүхтийн ам');
});

t('② descriptor: 3-р түвшний БҮЛЭГ (🛠 services) замад багтана', () => {
  const d = savedSearchDescriptor(link({ section: 'services', type: 'Гадаад хэл' }));
  assert.equal(d.category, 'Ажил, Үйлчилгээ — Сургалт, курс — Гадаад хэл');
});

t('③ descriptor: давхардсан шошго 1 Л удаа (авто хэсэгт «Автомашин»)', () => {
  const d = savedSearchDescriptor(link({ section: 'auto', category: 'sell', type: 'Суудлын машин' }));
  assert.equal(d.category, 'Автомашин — Суудлын машин');
  assert.ok(!/Автомашин — Автомашин/.test(d.category), 'давхардал ✗');
});

t('④ descriptor: хэсэг сонгоогүй → «Бүх зар» (category/location хоосон)', () => {
  const d = savedSearchDescriptor('/');
  assert.equal(d.category, '');
  assert.equal(d.location, '');
  assert.equal(d.title, 'Бүх зар');
});

t('⑤ descriptor: хайлтын үг (`q`) гарчигт орж, хэт урт таслагдана', () => {
  const d = savedSearchDescriptor(link({ section: 'real-estate', q: '3 өрөө' }));
  assert.equal(d.title, '«3 өрөө» · Үл хөдлөх');
  const long = savedSearchDescriptor(link({ section: 'real-estate', q: 'x'.repeat(400) }));
  assert.ok(long.title.length <= 140, `урт ${long.title.length} > 140 ✗`);
  assert.ok(long.title.endsWith('…'), 'таслалт «…»-гүй ✗');
});

t('⑥ state: URL-ийн утгууд ЗӨВ задранa (rooms/district массив)', () => {
  const s = savedSearchState(link({ section: 'real-estate', rooms: '1,3', district: 'Баянгол,Сүхбаатар' }));
  assert.deepEqual(s.rooms, ['1', '3']);
  assert.deepEqual(s.districts, ['Баянгол', 'Сүхбаатар']);
  assert.equal(s.section, 'real-estate');
});

// ---------- ② ДАВХАРДЛЫН түлхүүр ----------
t('⑦ key: `page`/`view`/`sort` нь давхардалд ОРОХГҮЙ (харагдац ≠ хайлт)', () => {
  const base = 'category=sell&section=real-estate&district=Баянгол';
  const k1 = savedSearchKey(`/?${base}`);
  const k2 = savedSearchKey(`/?${base}&page=3&view=map&sort=price_asc`);
  assert.equal(k1, k2, 'харагдацын параметр түлхүүрт нөлөөлж байна ✗');
});

t('⑧ key: параметрийн ДАРААЛАЛ хамаарахгүй (идэгдэл параметр эрэмбэлэгдэнэ)', () => {
  const a = savedSearchKey('/?rooms=3&section=real-estate');
  const b = savedSearchKey('/?section=real-estate&rooms=3');
  assert.equal(a, b, 'параметрийн дараалал давхардал үүсгэж байна ✗');
});

t('⑨ isSaveableSearch: «Бүх зар» (зөвхөн харагдац) → false', () => {
  assert.equal(isSaveableSearch('/'), false);
  assert.equal(isSaveableSearch('/?page=2'), false);
  assert.equal(isSaveableSearch('/?view=map&sort=price_asc'), false);
  assert.equal(isSaveableSearch('/?section=real-estate'), true);
  assert.equal(isSaveableSearch('/?q=орон сууц'), true);
});

// ---------- ③ localStorage жагсаалт ----------
t('⑩ parseSavedSearchList: давхардал/хог/хоосон URL-ыг шүүнэ', () => {
  const url = '/?section=real-estate&category=sell';
  const list = parseSavedSearchList(JSON.stringify([
    { id: 'a', url, createdAt: '2026-10-06T00:00:00Z' },
    { id: 'b', url: `${url}&page=4` },   // давхардал (page хасагдана) → хасагдана
    { id: 'c', url: '' },                // URL хоосон → хасагдана
    'x',                                  // объект биш → хасагдана
    { id: 'd', url: '/?section=auto' },
  ]));
  assert.equal(list.length, 2, `2 байх ёстой, ${list.length} ✗`);
  assert.equal(list[0].id, 'a');
  assert.equal(list[1].id, 'd');
});

t('⑪ parseSavedSearchList: эвдэрхий JSON/тэнэг утга → [] (краш БАЙХГҮЙ)', () => {
  assert.deepEqual(parseSavedSearchList('{bad json'), []);
  assert.deepEqual(parseSavedSearchList(null), []);
  assert.deepEqual(parseSavedSearchList('"текст"'), []);
  assert.deepEqual(parseSavedSearchList(JSON.stringify({ not: 'array' })), []);
});

t('⑫ parseSavedSearchList: дээд тоо (`SAVED_SEARCH_LIMIT`) хүндэтгэнэ', () => {
  const many = Array.from({ length: SAVED_SEARCH_LIMIT + 20 }, (_, i) => ({
    id: `id${i}`, url: `/?section=real-estate&rooms=${(i % 9) + 1}&maxPrice=${i}`,
  }));
  const list = parseSavedSearchList(JSON.stringify(many));
  assert.ok(list.length <= SAVED_SEARCH_LIMIT, `${list.length} > ${SAVED_SEARCH_LIMIT} ✗`);
});

t('⑬ serializeSavedSearchList ↔ parseSavedSearchList тойрог', () => {
  const items = [{ id: 'x', url: '/?section=auto', createdAt: '2026-10-06T00:00:00Z' }];
  const back = parseSavedSearchList(serializeSavedSearchList(items));
  assert.equal(back.length, 1);
  assert.equal(back[0].url, '/?section=auto');
  assert.equal(back[0].createdAt, '2026-10-06T00:00:00Z');
});

// ---------- ④ Мөрийн хэлбэр ба URL хэвийн болгох ----------
t('⑭ normalizeSavedSearchRow: DB (`created_at`) ба local (`createdAt`) хоёулаа', () => {
  assert.equal(normalizeSavedSearchRow({ id: '1', url: '/?a=b', created_at: 'T' }).createdAt, 'T');
  assert.equal(normalizeSavedSearchRow({ id: '1', url: '/?a=b', createdAt: 'L' }).createdAt, 'L');
  assert.equal(normalizeSavedSearchRow({ url: '   ' }), null);
  assert.equal(normalizeSavedSearchRow(null), null);
});

t('⑮ normalizeSavedSearchUrl: trim + дээд урт (DB CHECK-тэй ИЖИЛ)', () => {
  assert.equal(normalizeSavedSearchUrl('  /?a=b  '), '/?a=b');
  assert.equal(normalizeSavedSearchUrl(''), '');
  assert.equal(normalizeSavedSearchUrl('x'.repeat(9999)).length, SAVED_SEARCH_URL_MAX);
});

t('⑯ savedSearchQueryString: харьцангуй/query-only/бүтэн URL гурвуулаа', () => {
  assert.equal(savedSearchQueryString('/?a=b&c=d'), 'a=b&c=d');
  assert.equal(savedSearchQueryString('a=b&c=d'), 'a=b&c=d');
  assert.equal(savedSearchQueryString('https://zar.mn/?a=b'), 'a=b');
  assert.equal(savedSearchQueryString('/'), '');
});

t('⑰ newSavedSearchId: давтагдашгүй `s…` id (2 удаа дуудвал өөр)', () => {
  const a = newSavedSearchId();
  const b = newSavedSearchId();
  assert.match(a, /^s/);
  assert.notEqual(a, b);
  assert.equal(typeof SAVED_SEARCHES_KEY, 'string');
});

// ---------- ⑤ ГЭРЭЭ: UI компонентууд ----------
t('⑱ ГЭРЭЭ: HomeClient нь «Хайлтыг хадгалах» товчтой (data-save-search)', () => {
  const home = codeOnly(readSrc('components/HomeClient.jsx'));
  assert.match(home, /useSavedSearches\(user\)/, 'hook дуудагдахгүй ✗');
  assert.match(home, /data-save-search/, 'CDP/тестийн дэгээ алга ✗');
  assert.match(home, /aria-pressed=\{currentSearchSaved\}/, 'aria-pressed алга ✗');
  assert.match(home, /'✓ Хадгалагдсан' : 'Хайлтыг хадгалах'/, 'товчны бичиг алга ✗');
  assert.match(home, /savedSearches\.save\(currentUrl\)/, 'хадгалах үйлдэл алга ✗');
  assert.match(home, /isSaveableSearch\(currentUrl\)/, 'хадгалах утга шалгахгүй ✗');
});

t('⑲ ГЭРЭЭ: HomeClient нь адресны URL-ыг `currentUrl`-д толь болгоно', () => {
  const home = codeOnly(readSrc('components/HomeClient.jsx'));
  assert.match(home, /const \[currentUrl, setCurrentUrl\] = useState\(''\)/, 'state алга ✗');
  assert.match(home, /setCurrentUrl\(next\)/, 'URL синкийн дотор толь бичихгүй ✗');
});

t('⑳ ГЭРЭЭ: SavedSearchesClient — «Категори/Байршил» + «Илэрц харуулах»/«устгах»', () => {
  const c = codeOnly(readSrc('components/SavedSearchesClient.jsx'));
  assert.match(c, /Категори:/, '«Категори:» мөр алга ✗');
  assert.match(c, /Байршил:/, '«Байршил:» мөр алга ✗');
  assert.match(c, /data-saved-search-open/, '«Илэрц харуулах» дэгээ алга ✗');
  assert.match(c, /Илэрц харуулах/, 'товчны бичиг алга ✗');
  assert.match(c, /data-saved-search-remove/, '«устгах» дэгээ алга ✗');
  assert.match(c, /savedSearchDescriptor\(it\.url\)/, 'шошгыг URL-ээс бодохгүй ✗');
});

t('㉑ ГЭРЭЭ: /favorites нь 2 ТАБТАЙ (unegui.mn шиг)', () => {
  const f = codeOnly(readSrc('components/FavoritesClient.jsx'));
  assert.match(f, /import SavedSearchesClient from '\.\/SavedSearchesClient'/, 'импорт алга ✗');
  assert.match(f, /data-fav-tab="ads"/, '«Таалагдсан зарууд» таб алга ✗');
  assert.match(f, /data-fav-tab="searches"/, '«Таалагдсан хайлтууд» таб алга ✗');
  assert.match(f, /role="tablist"/, 'a11y tablist алга ✗');
  assert.match(f, /<SavedSearchesClient \/>/, 'таб доторх панель холбогдоогүй ✗');
  assert.match(f, /export default function FavoritesClient\(\)/, 'default export алга ✗');
});

t('㉒ ГЭРЭЭ: lib/savedSearches.js — hybrid (DB + localStorage + миграц)', () => {
  const s = codeOnly(readSrc('lib/savedSearches.js'));
  assert.match(s, /export function useSavedSearches\(user\)/, 'hook export алга ✗');
  assert.match(s, /const DB_TABLE = 'saved_searches'/, 'DB хүснэгтийн нэр алга ✗');
  assert.match(s, /SAVED_SEARCHES_KEY/, 'localStorage түлхүүр (нэг эх сурвалж) алга ✗');
  assert.match(s, /migrateLocalToDb/, 'зочин → DB миграц алга ✗');
  assert.match(s, /applyLocal\(\)/, 'DB унасан үед localStorage fallback алга ✗');
});

t('㉓ ГЭРЭЭ: migration 0031 — хүснэгт + RLS + давхардлын хязгаар', () => {
  const sql = readSrc('supabase/migrations/0031_saved_searches.sql');
  assert.match(sql, /create table if not exists public\.saved_searches/i);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /saved_searches_select_own/);
  assert.match(sql, /saved_searches_insert_own/);
  assert.match(sql, /saved_searches_delete_own/);
  assert.match(sql, /unique \(user_id, url\)/i);
  assert.match(sql, /char_length\(btrim\(url\)\) between 1 and 2000/i);
  assert.match(sql, /revoke all on public\.saved_searches from anon/i);
  assert.match(sql, /grant select, insert, delete on public\.saved_searches/i);
  assert.doesNotMatch(sql, /for update to authenticated/i, 'UPDATE policy байх ЁСГҮЙ ✗');
});

t('㉔ ГЭРЭЭ: `npm run test:saved-searches` бүртгэгдсэн', () => {
  const pkg = JSON.parse(readSrc('package.json'));
  assert.equal(pkg.scripts['test:saved-searches'], 'node scripts/test-saved-searches.mjs');
});

console.log(`\n✅ Нийт ${passed} тест амжилттай — 🔖 хадгалсан хайлт (URL → шошго, давхардал, hybrid хадгалалт)\n`);


