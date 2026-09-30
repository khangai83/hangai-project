// ============================================================
// test-rooms.mjs — «ӨРӨӨНИЙ ТОО» шүүлтийн тест (2026-09-30)
//
// ХАМРАХ ХҮРЭЭ:
//   ① `lib/roomFilter.mjs` — цэвэр логик (normalize/parse/toggle/шошго/DB дүрэм)
//   ② `lib/queries.js`     — PostgREST-ийн мөр яг зөв үүсэх эсэх (ХУУЧИР builder)
//   ③ `lib/locationData.js`— `ROOM_OPTIONS` / `formatRoomsLabel` гэрээ (регресс)
//   ④ ЭХ ФАЙЛЫН ГЭРЭЭ: `HomeClient.jsx`, `breadcrumb.js` нь `roomFilter.mjs`-ийг
//      хэрэглэж, хоосон утга нь `''` БИШ `[]` байгаа эсэх
//
// ⚠️🗑 2026-09-30 (4) — ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «1 өрөө … +5 өрөө» ТОВЧНУУД
//    хуудсанд харагдахгүй байх → `components/HomeClient.jsx`-ийн өрөө сонгох
//    UI (sidebar-ийн блок БА үр дүнгийн мөр) БҮРЭН ХАСАГДАВ.
//    ⚠️ Гэхдээ модуль/URL/DB/breadcrumb БҮГД ХЭВЭЭР: `?rooms=1,3` линк
//    уншигдаж, DB дээр `rooms IN (1,3)` болж, breadcrumb «1, 3 өрөө» гэж
//    харуулсаар байна — ТИЙМЭЭС доорх тестүүд утгаа ХАДГАЛСАН ✓
//    (⑩ хэсэгт «UI байхгүй» гэсэн РЕГРЕСС тестүүд нэмэгдэв)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Олон сонголт нь 3 газарт нэгэн зэрэг бичигддэг: UI (чип), URL (`?rooms=1,3`)
//   ба DB (`rooms IN (…)/ >= 5/ OR …`). Аль нэг нь зөрвөл хэрэглэгч «1 өрөө»
//   дарсан ч 2 өрөөтэй зарууд гарна, эсвэл PostgREST нь `.or()`-ийн мөрний
//   синтаксис эвдэгдээд ХООСОН жагсаалт буцаана (хэрэглэгчид «зар байхгүй»
//   мэт харагдана) ✗ — энэ тест тэр эрсдэлийг бариулна ✓
//
// ⚠️ ХАМГИЙН ЧУХАЛ ШААРДЛАГА: НЭГ утгатай сонголт нь ХУУЧИН үр дүнтэй
//    ЯГ ИЖИЛ байх ЁСТОЙ (`?rooms=5` → `rooms >= 5`, `?rooms=3` → `rooms = 3`)
//    — хуучин линк, README, breadcrumb бүгд эвдрэхгүйн тулд ✓
//
// АЖИЛЛУУЛАХ:  npm run test:rooms
// ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (3 модуль нь импортгүй цэвэр).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

import {
  ROOM_VALUES, ROOM_PLUS_VALUE, ROOM_PLUS_MIN, ROOM_ACTUAL_MAX,
  applyRoomFilter, countRooms, isRoomValue, isRoomsEmpty, normalizeRoomValue,
  parseRoomList, roomOptionLabel, roomsFilterDescriptor, roomsFilterLabel,
  roomsUrlValue, toggleRoomValue,
} from '../lib/roomFilter.mjs';
import { ROOM_OPTIONS, formatRoomsLabel } from '../lib/locationData.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

/**
 * PostgREST query builder-ийн ХУУЧИР — дуудсан арга бүрийг бүртгэнэ.
 * ⚠️ `lib/queries.js`-ийн бодит builder-той ИЖИЛ гэрээтэй:
 *    `.gte()`, `.in()`, `.or()` нь дахин `this`-ээ буцаана ✓
 */
function fakeQuery() {
  const calls = [];
  const q = {
    calls,
    gte(col, val) { calls.push(['gte', col, val]); return q; },
    in(col, val) { calls.push(['in', col, val]); return q; },
    or(str) { calls.push(['or', str]); return q; },
  };
  return q;
}
/** `applyRoomFilter`-ийг хуурамч builder дээр ажиллуулж, дуудлагыг буцаана */
const callsFor = (list) => {
  const q = fakeQuery();
  applyRoomFilter(q, list);
  return q.calls;
};

const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Комментгүй ЦЭВЭР КОД — «хасагдсан» гэсэн ТАЙЛБАР нь зүй ёсны тул
 *  шалгалтыг зөвхөн кодын мөрүүд дээр хийнэ (хуурамч улаан гарахгүй ✓) */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

console.log('\n🧪 Өрөөний тоо — олон сонголттой шүүлт (lib/roomFilter.mjs)\n');

// ---------- ① normalizeRoomValue — нэг утгыг цэвэрлэх ----------
t("normalizeRoomValue: '5+', '+5', 5, ' 5 ' бүгд → '5' (шошго нь «+5 өрөө»)", () => {
  ['5+', '+5', 5, ' 5 '].forEach((v) => assert.equal(normalizeRoomValue(v), '5', `«${v}» ✗`));
});

t("normalizeRoomValue: 5-аас ДЭЭШ тоо ч '5' болно (6, 9, 12 — «+5» хүрээнд)", () => {
  [6, 9, 12, '7'].forEach((v) => assert.equal(normalizeRoomValue(v), '5', `«${v}» ✗`));
});

t('normalizeRoomValue: 1..4 нь ШУУД хадгалагдана (тоо ба текст)', () => {
  assert.equal(normalizeRoomValue(3), '3');
  assert.equal(normalizeRoomValue('4'), '4');
});

t("normalizeRoomValue: хүчингүй утгууд → '' (0, 'abc', '', null, '-2', '2.5', {})", () => {
  [0, '0', 'abc', '', null, undefined, '-2', '2.5', {}].forEach((v) => {
    assert.equal(normalizeRoomValue(v), '', `«${JSON.stringify(v)}» ✗`);
  });
});

// ---------- ② parseRoomList — URL/массивыг цэвэрлэх ----------
t("parseRoomList: '3,1' → ['1','3'] (өсөх эрэмбэ → URL тогтвортой)", () => {
  assert.deepEqual(parseRoomList('3,1'), ['1', '3']);
});

t('parseRoomList: массив (тоо/текст холилдсон) болон скалярыг ч хүлээнэ', () => {
  assert.deepEqual(parseRoomList([3, '1']), ['1', '3']);
  assert.deepEqual(parseRoomList(3), ['3']);
  assert.deepEqual(parseRoomList('3'), ['3']);
});

t("parseRoomList: давхцал ХАСАГДАНА ('1,1,2' → ['1','2'])", () => {
  assert.deepEqual(parseRoomList('1,1,2'), ['1', '2']);
});

t("parseRoomList: хоосон/эвдэрсэн гишүүд ЧИМЭЭГҮЙ хасагдана ('abc,2,,0' · '')", () => {
  assert.deepEqual(parseRoomList('abc,2,,0'), ['2']);
  assert.deepEqual(parseRoomList(''), []);
  assert.deepEqual(parseRoomList(null), []);
});

t("parseRoomList: 5-аас дээш утгууд нэг «+5» болж НЭГТГЭНЭ ('5,6,7' → ['5'])", () => {
  assert.deepEqual(parseRoomList('5,6,7'), ['5']);
});

t('parseRoomList: шинэ массив буцаана (эх массивыг өөрчлөхгүй)', () => {
  const src = ['3', '1'];
  const out = parseRoomList(src);
  assert.deepEqual(src, ['3', '1']);
  assert.notEqual(out, src);
});

// ---------- ③ isRoomsEmpty / countRooms ----------
t("isRoomsEmpty: [] · '' · null · ['abc'] → true; ['1'] → false", () => {
  [[], '', null, undefined, 'abc'].forEach((v) => assert.equal(isRoomsEmpty(v), true, `${v} ✗`));
  assert.equal(isRoomsEmpty(['1']), false);
});

t('countRooms: сонгосон тоо ширхэг («N сонгосон» badge)', () => {
  assert.equal(countRooms([]), 0);
  assert.equal(countRooms('1,2,3'), 3);
  assert.equal(countRooms(['5', '1']), 2);
});

// ---------- ④ toggleRoomValue — checkbox мэт нэмэх/хасах ----------
t("toggleRoomValue: хоосон + '2' → ['2']; дахин '2' → [] (хасагдана)", () => {
  assert.deepEqual(toggleRoomValue([], '2'), ['2']);
  assert.deepEqual(toggleRoomValue(['2'], '2'), []);
});

t("toggleRoomValue: олон утга ӨСӨХ эрэмбээр нэмэгдэнэ (['3'] + '1' → ['1','3'])", () => {
  assert.deepEqual(toggleRoomValue(['3'], '1'), ['1', '3']);
  // ⚠️ «+5» (5 ба түүнээс дээш) нь ХАМГИЙН сүүлд — URL: `?rooms=1,5`
  assert.deepEqual(toggleRoomValue([], 9), ['5']);
});

t('toggleRoomValue: хүчингүй утга → жагсаалт ХЭВЭЭР, гэхдээ ШИНЭ массив', () => {
  const out = toggleRoomValue(['1'], 'abc');
  assert.deepEqual(out, ['1']);
  assert.notEqual(out, ['1']); // шинэ массив (React state-д чухал ✓)
});

t('toggleRoomValue: скаляр төлвөөс ч зөв (хуучин `rooms: "3"` → олон сонголт)', () => {
  assert.deepEqual(toggleRoomValue('3', '1'), ['1', '3']);
});

// ---------- ⑤ roomsUrlValue — URL-д бичих ----------
t("roomsUrlValue: ['3','1'] → '1,3' · [] → '' · '5' → '5'", () => {
  assert.equal(roomsUrlValue(['3', '1']), '1,3');
  assert.equal(roomsUrlValue([]), '');
  assert.equal(roomsUrlValue('5'), '5');
});

t('🔁 ТОЙРОГ: URL → массив → URL (parseRoomList ↔ roomsUrlValue тогтвортой)', () => {
  ['1', '5', '1,3', '1,2,3,4,5', '4,5'].forEach((raw) => {
    assert.equal(roomsUrlValue(parseRoomList(raw)), raw, `«${raw}» ✗`);
  });
});

// ---------- ⑥ roomsFilterLabel — дэлгэцийн шошго ----------
t("roomsFilterLabel: нэг утга нь ХУУЧИН хэлбэрээр ('3' → '3 өрөө', '5' → '+5 өрөө')", () => {
  assert.equal(roomsFilterLabel([]), '');
  assert.equal(roomsFilterLabel(['3']), '3 өрөө');
  assert.equal(roomsFilterLabel(['5']), '+5 өрөө');
});

t("roomsFilterLabel: олон утга → '1, 2 өрөө' · '1, 5+ өрөө'", () => {
  assert.equal(roomsFilterLabel(['1', '2']), '1, 2 өрөө');
  assert.equal(roomsFilterLabel(['1', '5']), '1, 5+ өрөө');
  assert.equal(roomsFilterLabel(['1', '2', '3', '4', '5']), '1, 2, 3, 4, 5+ өрөө');
});

t("roomsFilterLabel: скаляр (хуучин breadcrumb дуудлага) ч зөв (3 · 6)", () => {
  assert.equal(roomsFilterLabel(3), '3 өрөө');
  assert.equal(roomsFilterLabel(6), '+5 өрөө'); // 5 ба түүнээс дээш → «+5»
});

t("roomOptionLabel: ROOM_VALUES-ийн утга бүрд шошго (1..4, «+5»)", () => {
  assert.deepEqual(ROOM_VALUES.map(roomOptionLabel), ['1 өрөө', '2 өрөө', '3 өрөө', '4 өрөө', '+5 өрөө']);
  assert.equal(roomOptionLabel('abc'), '');
});

t('isRoomValue: зөвхөн 1..5 (бусад нь false)', () => {
  ROOM_VALUES.forEach((v) => assert.equal(isRoomValue(v), true, `${v} ✗`));
  ['0', '6', '', null, 'abc'].forEach((v) => assert.equal(isRoomValue(v), false, `${v} ✗`));
});

// ---------- ⑦ roomsFilterDescriptor — DB дүрэм ----------
t("📌 РЕГРЕСС: ['5'] → gte 5 · ['3'] → in ['3'] (нэг сонголт ХУУЧИН үр дүнтэй ижил)", () => {
  assert.deepEqual(roomsFilterDescriptor(['5']), { mode: 'gte', min: 5 });
  assert.deepEqual(roomsFilterDescriptor(['3']), { mode: 'in', values: ['3'] });
  // ⚠️ Хуучин НЭГ утгатай (скаляр) дуудлага ч ЯГ ижил дүрэм
  assert.deepEqual(roomsFilterDescriptor('5'), { mode: 'gte', min: 5 });
});

t("roomsFilterDescriptor: хоосон → none (шүүлт ХИЙХГҮЙ)", () => {
  [[], '', null, 'abc'].forEach((v) => {
    assert.deepEqual(roomsFilterDescriptor(v), { mode: 'none' }, `${JSON.stringify(v)} ✗`);
  });
});

t("roomsFilterDescriptor: ['2','3'] → in (зэрэгцээ тоонууд)", () => {
  assert.deepEqual(roomsFilterDescriptor(['2', '3']), { mode: 'in', values: ['2', '3'] });
});

t("roomsFilterDescriptor: ['4','5'] → gte 4 (хүрээ НЭГТГЭНЭ — ≥4 нь 5+ -ыг багтаана)", () => {
  assert.deepEqual(roomsFilterDescriptor(['4', '5']), { mode: 'gte', min: 4 });
});

t("roomsFilterDescriptor: ['1','5'] → or (завсартай: 2 ба 3 орохгүй тул IN дангаараа болохгүй)", () => {
  assert.deepEqual(roomsFilterDescriptor(['1', '5']),
    { mode: 'or', values: ['1'], plusMin: 5 });
  assert.deepEqual(roomsFilterDescriptor(['1', '2', '5']),
    { mode: 'or', values: ['1', '2'], plusMin: 5 });
});

t('roomsFilterDescriptor: тогтмолууд уялдаатай (ROOM_PLUS_MIN=5, ROOM_ACTUAL_MAX=4)', () => {
  assert.equal(ROOM_PLUS_VALUE, '5');
  assert.equal(ROOM_PLUS_MIN, 5);
  assert.equal(ROOM_ACTUAL_MAX, 4);
});

// ---------- ⑧ applyRoomFilter — PostgREST-ийн БОДИТ дуудлага ----------
t("🛠 applyRoomFilter: [] → builder-т ОГТ хүрэхгүй (шүүлт хийхгүй)", () => {
  assert.deepEqual(callsFor([]), []);
});

t("🛠 applyRoomFilter: ['5'] → gte('rooms', 5)  ← «+5 өрөө» (хуучинтай ижил)", () => {
  assert.deepEqual(callsFor(['5']), [['gte', 'rooms', 5]]);
});

t("🛠 applyRoomFilter: ['3'] → in('rooms', [3])  (SQL: rooms = 3)", () => {
  assert.deepEqual(callsFor(['3']), [['in', 'rooms', [3]]]);
});

t("🛠 applyRoomFilter: ['2','3'] → in('rooms', [2,3])", () => {
  assert.deepEqual(callsFor(['2', '3']), [['in', 'rooms', [2, 3]]]);
});

t("🛠 applyRoomFilter: ['4','5'] → gte('rooms', 4)  (нэг дуудлага — хүрээ нэгтгэсэн)", () => {
  assert.deepEqual(callsFor(['4', '5']), [['gte', 'rooms', 4]]);
});

t("🛠 applyRoomFilter: ['1','5'] → or('rooms.in.(1),rooms.gte.5')  ← мөрний синтаксис", () => {
  assert.deepEqual(callsFor(['1', '5']), [['or', 'rooms.in.(1),rooms.gte.5']]);
  assert.deepEqual(callsFor(['1', '2', '5']), [['or', 'rooms.in.(1,2),rooms.gte.5']]);
});

t('🛠 applyRoomFilter: builder-ээ БУЦААНА (гинжин дуудлага `q = applyRoomFilter(q, …)`)', () => {
  const q = fakeQuery();
  assert.equal(applyRoomFilter(q, ['1']), q);
});

// ---------- ⑨ locationData — UI-ийн гэрээ (регресс) ----------
t('ROOM_OPTIONS нь roomFilter.mjs-ээс үүснэ (нэг эх сурвалж, 5 сонголт)', () => {
  assert.equal(ROOM_OPTIONS.length, 5);
  assert.deepEqual(ROOM_OPTIONS.map((o) => o.value), ROOM_VALUES);
  assert.deepEqual(ROOM_OPTIONS.map((o) => o.label),
    ['1 өрөө', '2 өрөө', '3 өрөө', '4 өрөө', '+5 өрөө']);
  // ⚠️ Эхний сонголт нь ЗААВАЛ «1 өрөө» — «2 өрөө» болж хувирвал
  //    хэрэглэгч 1 өрөөтэй зарыг сонгож чадахгүй болно ✗ (2026-09-30 (4)-д
  //    тестэд гарсан алдаа: хүлээлт нь '2 өрөө', '2 өрөө' гэж бичигдсэн байв)
  assert.equal(ROOM_OPTIONS[0].label, '1 өрөө');
});

t('formatRoomsLabel нь ХУУЧИН гэрээгээ хадгална (5 → «+5 өрөө»)', () => {
  assert.equal(formatRoomsLabel(3), '3 өрөө');
  assert.equal(formatRoomsLabel(5), '+5 өрөө');
  assert.equal(formatRoomsLabel(8), '+5 өрөө');
  assert.equal(formatRoomsLabel(''), '');
  assert.equal(formatRoomsLabel(0), '');
});

t('formatRoomsLabel нь ОЛОН утгыг ч дэмжинэ (шинэ боломж)', () => {
  assert.equal(formatRoomsLabel([]), '');
  assert.equal(formatRoomsLabel(['1', '2']), '1, 2 өрөө');
  assert.equal(formatRoomsLabel('1,5'), '1, 5+ өрөө');
});

// ---------- ⑩ ЭХ ФАЙЛЫН ГЭРЭЭ (UI/URL/DB нэг эх сурвалжийг хэрэглэх) ----------
t('lib/queries.js: `applyRoomFilter`-ийг хэрэглэнэ (дүрмийг ДАХИН бичихгүй)', () => {
  const src = readSrc('lib/queries.js');
  assert.match(src, /import \{ applyRoomFilter \} from '\.\/roomFilter\.mjs'/, 'импорт алга ✗');
  assert.match(src, /applyRoomFilter\(query, filters\.rooms\)/, 'шүүлт холбогдоогүй ✗');
  assert.match(src, /applyRoomFilter\(q, \[value\]\)/, 'өрөөний тоо (fetchRoomCounts) ✗');
  // ⚠️ Хуучин `Number(value) >= 5 ? …` гэсэн ДАВХАР дүрэм үлдэх ЁСТОЙ
  assert.ok(!/Number\(value\) >= 5/.test(src), 'хуучин давхар дүрэм үлдсэн ✗');
});

t('🗑 РЕГРЕСС: HomeClient.jsx-д өрөө сонгох UI (товч) БАЙХГҮЙ — 2026-09-30 (4)', () => {
  // Хэрэглэгчийн хүсэлт: «1 өрөө … +5 өрөө» товчнууд хуудсанд харагдахгүй байх
  const ui = codeOnly(readSrc('components/HomeClient.jsx'));
  assert.doesNotMatch(ui, /data-room-filter/, 'өрөөний блок DOM-д үлдсэн ✗');
  assert.doesNotMatch(ui, /data-room-value/, 'өрөөний чип үлдсэн ✗');
  assert.doesNotMatch(ui, /ROOM_OPTIONS/, 'ROOM_OPTIONS импорт үлдсэн ✗');
  assert.doesNotMatch(ui, /toggleRooms|clearRooms/, 'чип дарах/цуцлах функц үлдсэн ✗');
  assert.doesNotMatch(ui, /toggleRoomValue/, 'toggleRoomValue импорт үлдсэн ✗');
  assert.doesNotMatch(ui, /showRooms/, 'showRooms нөхцөл үлдсэн ✗');
  assert.doesNotMatch(ui, /Өрөөний тоо/, '«Өрөөний тоо» блокын шошго үлдсэн ✗');
});

t('✅ ХАДГАЛАГДСАН: URL ба DB нь `rooms`-ыг ХЭВЭЭР дэмжинэ (хуучин линк эвдрэхгүй)', () => {
  const ui = readSrc('components/HomeClient.jsx');
  assert.match(ui, /rooms: \[\]/, 'хоосон утга нь массив байх ёстой ✗');
  assert.match(ui, /parseRoomList\(sp\.get\('rooms'\)\)/, 'URL-аас унших ✗');
  assert.match(ui, /roomsUrlValue\(filters\.rooms\)/, 'URL-д бичих ✗');
  assert.match(ui, /roomsFilterLabel\(filters\.rooms\)/, '«идэвхтэй шүүлт» чипийн шошго ✗');
  // ⚠️ Хуучин НЭГ утгатай (текст) логик үлдэх ЁСТОЙ
  assert.ok(!/setF\('rooms', ''\)/.test(ui), 'хуучин нэг утгатай цэвэрлэлт үлдсэн ✗');
  assert.ok(!/filters\.rooms ===/.test(ui), 'хуучин `===` харьцуулалт үлдсэн ✗');
});

t('🐍 CDP скрипт нь «DOM-д өрөөний товч ЯГ 0» гэж шалгана (дарах код үлдэхгүй)', () => {
  const cdp = readSrc('scripts/cdp-rooms.mjs');
  assert.match(cdp, /data-room-filter/, 'DOM-д байхгүйг CDP-ээр шалгана ✗');
  assert.match(cdp, /=== 0/, 'товшны тоо ЯГ 0 байх ёстой ✗');
  assert.doesNotMatch(cdp, /clickRoom\(/, 'чип дарах код үлдэх ёсгүй ✗');
});

t('lib/breadcrumb.js: URL ба «хоослох» нь модулиар (rooms: [] / isRoomsEmpty)', () => {
  const src = readSrc('lib/breadcrumb.js');
  assert.match(src, /import \{ roomsUrlValue, isRoomsEmpty \} from '\.\/roomFilter\.mjs'/, 'импорт алга ✗');
  assert.match(src, /roomsUrlValue\(rooms\)/, 'URL угсрах ✗');
  assert.match(src, /if \(!isRoomsEmpty\(rooms\)\)/, 'хоосон эсэхийг шалгах ✗');
  assert.match(src, /filters: \{ rooms: \[\] \}/, 'crumb дээр цэвэрлэх ✗');
  assert.ok(!/rooms: ''/.test(src), "`rooms: ''` (текст) үлдсэн ✗");
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);
