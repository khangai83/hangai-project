// ============================================================
// test-notifications.mjs — 🔔 МЭДЭГДЛИЙН логикийн тест (lib/notifications.mjs)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Хонхны тоо, «хэн ❤️ дарсан», «аль зараар бүлэглэх», «хэзээ» гэсэн дөрвөн
//   газарт буруу болбол хэрэглэгч БУРУУ хүнд залгах, эсвэл «шинэ» гэсэн badge
//   худал харагдах гэсэн бодит алдаа үүснэ ✗ — энэ тест тэр гэрээг түгждэг ✓
//
// ⚠️ ХАМГИЙН ЧУХАЛ: `supabase/migrations/0040_notifications.sql` нь UI-ийн
//    логиктой ЗОХИЦОХ ёстой:
//      • INSERT policy БАЙХГҮЙ (мөрийг зөвхөн триггер бичнэ) ✓
//      • UPDATE эрх нь ЗӨВХӨН `read_at` баганад ✓
//      • `notifications_type_valid` CHECK нь `NOTIFICATION_TYPE_META`-той ижил ✓
//    → тест SQL файлыг уншиж харьцуулна (test-messages.mjs-ийн ЯГ ИЖИЛ арга ✓)
//
// АЖИЛЛУУЛАХ:  npm run test:notifications
// ============================================================
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  NOTIFICATIONS_EVENT, NOTIFICATIONS_LIMIT, NOTIFICATION_PANEL_LIMIT,
  NOTIFICATION_TYPE_LIKE, NOTIFICATION_TYPE_META, UNKNOWN_ACTOR,
  actorInitial, actorLabel, badgeLabel, formatPhone, groupByListing,
  groupCountLabel, groupTitleLabel, listingLabel, listingTitleLabel,
  normalizeNotificationRow,
  notificationEmoji, notificationText, notificationTimeAgo, notificationTypeMeta,
  panelRows, phoneHref, sortNotifications, unreadCount,
} from '../lib/notifications.mjs';
import phoneEmail from '../lib/phoneEmail.js';

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🧪 Мэдэгдлийн логик (lib/notifications.mjs)\n');

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/** Комментгүй ЦЭВЭР КОД — тайлбар доторх жишээ бичвэр хуурамч ногоон өгөхгүй ✓ */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*--.*$/gm, '')
  .replace(/^\s*\/\/.*$/gm, '');

// ---------- Тогтмол утгууд ----------
const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const THIRD = '44444444-4444-4444-4444-444444444444';
const LISTING = '55555555-5555-5555-5555-555555555555';
const LISTING2 = '66666666-6666-6666-6666-666666666666';
const NOW = Date.parse('2026-10-08T12:00:00Z');
const at = (sec) => new Date(NOW - sec * 1000).toISOString();

/** DB-ийн мөр (snake_case) — `normalizeNotificationRow`-ий оролт */
const dbRow = (over = {}) => ({
  id: 'n1',
  type: 'like',
  user_id: ME,
  actor_id: OTHER,
  listing_id: LISTING,
  listing_title: '3 өрөө байр',
  actor_name: 'Бат',
  actor_phone: '+97688112233',
  read_at: null,
  created_at: at(60),
  ...over,
});

/** UI-ийн мөр (camelCase) — цэвэр функцүүдийн оролт */
const uiRow = (over = {}) => normalizeNotificationRow(dbRow(over));

// ---------- ① formatPhone / phoneHref ----------
t('📞 Утасны дугаар УНШИГДАХ хэлбэрт орно (+976 8811 2233)', () => {
  assert.equal(formatPhone('+97688112233'), '+976 8811 2233');
  assert.equal(formatPhone('88112233'), '+976 8811 2233');
  assert.equal(formatPhone('976 8811-2233'), '+976 8811 2233');
  assert.equal(formatPhone(''), '');
  assert.equal(formatPhone(null), '');
});

t('📞 Танихгүй формат (гадаад дугаар) — ХУЙВАРГҮЙ, утга нь үнэн хэвээр ✓', () => {
  assert.equal(formatPhone('+1 415 555 0100'), '+1 415 555 0100');
});

t('📞 `tel:` линк нь зөвхөн цифр + улсын код (залгахад ажиллана ✓)', () => {
  assert.equal(phoneHref('88112233'), 'tel:+97688112233');
  assert.equal(phoneHref('+976 8811 2233'), 'tel:+97688112233');
  assert.equal(phoneHref(''), '');
  assert.equal(phoneHref(null), '');
});

// ---------- ② actorLabel / actorInitial ----------
t('👤 Хоч нэр байвал НЭР, байхгүй бол УТАСНЫ ДУГААР (хэрэглэгчийн гол хүсэлт ✓)', () => {
  assert.equal(actorLabel(uiRow()), 'Бат');
  assert.equal(actorLabel(uiRow({ actor_name: '' })), '+976 8811 2233');
  assert.equal(actorLabel(uiRow({ actor_name: '  ', actor_phone: '  ' })), UNKNOWN_ACTOR);
  assert.equal(actorLabel(null), UNKNOWN_ACTOR);
});

t('👤 avatar-ийн эхний үсэг — нэргүй бол дугаарын эхний тэмдэгт', () => {
  assert.equal(actorInitial(uiRow()), 'Б');
  assert.equal(actorInitial(uiRow({ actor_name: '' })), '+');
  assert.equal(actorInitial(uiRow({ actor_name: '', actor_phone: '' })), 'Х'); // «Хэрэглэгч»
});


// ---------- ③ normalizeNotificationRow ----------
t('🔄 DB мөр → camelCase, зайг тайрна; `id` дутуу бол null (эвдэрхий мөр UI-д гарахгүй ✓)', () => {
  const r = normalizeNotificationRow(dbRow({ listing_title: '  3 өрөө  ', actor_name: ' Бат ' }));
  assert.deepEqual(r, {
    id: 'n1',
    type: NOTIFICATION_TYPE_LIKE,
    listingId: LISTING,
    listingTitle: '3 өрөө',
    actorId: OTHER,
    actorName: 'Бат',
    actorPhone: '+97688112233',
    readAt: null,
    createdAt: at(60),
  });
  assert.equal(normalizeNotificationRow({}), null);
  assert.equal(normalizeNotificationRow(null), null);
});

t('🔄 Төрөл дутуу бол `like`; танихгүй төрөлд ❤️ нөөц (UI хоосон болохгүй ✓)', () => {
  assert.equal(normalizeNotificationRow(dbRow({ type: null })).type, 'like');
  assert.equal(normalizeNotificationRow(dbRow({ type: 'weird' })).type, 'weird');
  assert.equal(notificationEmoji('weird'), NOTIFICATION_TYPE_META.like.emoji);
  assert.equal(notificationTypeMeta(undefined).label, 'Таалагдсан');
});

// ---------- ④ Текст ----------
t('🏷 Зарын нэр «»-тэй; хоосон гарчиг → «Зар» ✓', () => {
  assert.equal(listingLabel(uiRow()), '«3 өрөө байр»');
  assert.equal(listingLabel(uiRow({ listing_title: '   ' })), '«Зар»');
});

t('💬 Мөрний текст: «таны «3 өрөө байр» зарыг таалагдлав» (нэр ОРОХГҮЙ ✓)', () => {
  const text = notificationText(uiRow());
  assert.equal(text, 'таны «3 өрөө байр» зарыг таалагдлав');
  assert.ok(!text.includes('Бат'), 'хүний нэр текст дотор орсон ✗ (товч/мөрөнд тусдаа гарна)');
  assert.equal(notificationText(uiRow({ type: 'weird' })), 'таны «3 өрөө байр» зар дээр шинэ үйлдэл хийв');
  // ⚠️ Гарчиг нь ТУСДАА (товдсон 🏠) мөрөнд гардаг газарт давхардуулахгүй ✓
  assert.equal(notificationText(uiRow(), { withListing: false }), 'таны зарыг таалагдлав');
  assert.equal(
    notificationText(uiRow({ type: 'weird' }), { withListing: false }),
    'таны зар дээр шинэ үйлдэл хийв'
  );
});

t('🏠 `listingTitleLabel` — шошгогүй гарчиг; хоосон/байхгүй бол «Зар» (нэг эх сурвалж ✓)', () => {
  assert.equal(listingTitleLabel(uiRow()), '3 өрөө байр');
  assert.equal(listingTitleLabel(uiRow({ listing_title: '   ' })), 'Зар');
  assert.equal(listingTitleLabel(uiRow({ listing_title: null })), 'Зар');
  assert.equal(listingTitleLabel(null), 'Зар');
  // ⚠️ Бүлгийн гарчиг нь ЯГ ИЖИЛ функцийг ашиглана (хоёр газар зөрөхгүй ✓)
  assert.equal(listingTitleLabel({ listingTitle: ' Орон сууц · Баянгол ' }), 'Орон сууц · Баянгол');
  assert.equal(groupTitleLabel({ listingTitle: ' Орон сууц · Баянгол ' }), 'Орон сууц · Баянгол');
});

// ---------- ⑤ Цаг ----------
t('🕒 Харьцангуй цаг нь «Хайлтын түүх»-тэй ЯГ ИЖИЛ (нэг эх сурвалж ✓)', () => {
  assert.equal(notificationTimeAgo(at(5), NOW), 'Саяхан');
  assert.equal(notificationTimeAgo(at(5 * 60), NOW), '5 минутын өмнө');
  assert.equal(notificationTimeAgo(at(2 * 3600), NOW), '2 цагийн өмнө');
  assert.equal(notificationTimeAgo(at(26 * 3600), NOW), 'Өчигдөр');
  assert.equal(notificationTimeAgo(at(3 * 86400), NOW), '3 өдрийн өмнө');
  assert.match(notificationTimeAgo(at(30 * 86400), NOW), /^\d{4}\.\d{2}\.\d{2}$/);
  assert.equal(notificationTimeAgo('', NOW), '');
});

// ---------- ⑥ Эрэмбэ ба тоо ----------
t('🗂 Шинэ нь ЭХЭНД; оролтын массив ХӨНДӨГДӨХГҮЙ; эвдэрхий огноо сүүлд ✓', () => {
  const list = [
    uiRow({ id: 'a', created_at: at(600) }),
    uiRow({ id: 'c', created_at: at(10) }),
    uiRow({ id: 'b', created_at: at(60) }),
    uiRow({ id: 'x', created_at: '' }),
  ];
  const copy = JSON.parse(JSON.stringify(list));
  assert.deepEqual(sortNotifications(list).map((r) => r.id), ['c', 'b', 'a', 'x']);
  assert.deepEqual(list, copy, 'sortNotifications мутац хийсэн ✗');
  assert.deepEqual(sortNotifications([]), []);
});

t('🔢 unreadCount — зөвхөн `read_at` хоосон мөрүүд', () => {
  const list = [uiRow({ id: 'a' }), uiRow({ id: 'b', read_at: at(5) }), uiRow({ id: 'c' })];
  assert.equal(unreadCount(list), 2);
  assert.equal(unreadCount([]), 0);
});

t(`🔔 panelRows — хамгийн сүүлийн ${NOTIFICATION_PANEL_LIMIT} мөр, шинэ нь эхэнд ✓`, () => {
  const list = Array.from({ length: 10 }, (_, i) => uiRow({ id: `n${i}`, created_at: at(i * 60) }));
  const rows = panelRows(list);
  assert.equal(rows.length, NOTIFICATION_PANEL_LIMIT);
  assert.equal(rows[0].id, 'n0');
  assert.deepEqual(panelRows(list, 2).map((r) => r.id), ['n0', 'n1']);
  assert.deepEqual(panelRows(list, 0), []);
});

t('🔢 badge: 0/сөрөг → хоосон, 99 хүртэл тоо, 99-өөс олон → «99+» ✓', () => {
  assert.equal(badgeLabel(0), '');
  assert.equal(badgeLabel(-3), '');
  assert.equal(badgeLabel(1), '1');
  assert.equal(badgeLabel(99), '99');
  assert.equal(badgeLabel(100), '99+');
  assert.equal(badgeLabel(undefined), '');
});

// ---------- ⑦ Зараар бүлэглэх ----------
t('🏠 Нэг зар дээрх хүмүүс НЭГ бүлэгт; `total`/`unread`/`lastAt` зөв ✓', () => {
  const list = [
    uiRow({ id: 'a', listing_id: LISTING, actor_id: OTHER, created_at: at(600) }),
    uiRow({ id: 'b', listing_id: LISTING, actor_id: THIRD, created_at: at(10) }),
    uiRow({ id: 'c', listing_id: LISTING2, actor_id: OTHER, created_at: at(30), read_at: at(5) }),
  ];
  const groups = groupByListing(list);
  assert.equal(groups.length, 2);
  // ⚠️ Хамгийн сүүлд ❤️ дарсан зар ЭХЭНД (lastAt буурна ✓)
  assert.equal(groups[0].listingId, LISTING, 'сүүлд идэвхтэй зар эхэнд биш ✗');
  assert.equal(groups[0].total, 2);
  assert.equal(groups[0].unread, 2, 'уншаагүйн тоо буруу ✗');
  assert.equal(groups[0].rows[0].id, 'b', 'бүлэг дотор шинэ нь эхэнд биш ✗');
  assert.equal(groups[0].lastAt, at(10));
  assert.equal(groups[1].listingId, LISTING2);
  assert.equal(groups[1].unread, 0, 'уншсан мөр уншаагүй гэж тоологдсон ✗');
});

t('🏠 Гарчиг нь бүлгийн мөрөөс (хуулбар) авна; хоосон оролт эвдрэхгүй ✓', () => {
  const groups = groupByListing([
    uiRow({ id: 'a', listing_title: '', created_at: at(60) }),
    uiRow({ id: 'b', listing_title: '3 өрөө байр', created_at: at(30) }),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].listingTitle, '3 өрөө байр');
  assert.deepEqual(groupByListing([]), []);
  assert.equal(groupByListing([null, undefined]).length, 0, 'эвдэрхий мөр бүлэг үүсгэсэн ✗');
});

t('🏠 `listing_id` дутуу мөрүүд НЭГ бүлэгт (зар устсан ч мэдэгдэл алга болохгүй ✓)', () => {
  const groups = groupByListing([
    uiRow({ id: 'a', listing_id: null, created_at: at(60) }),
    uiRow({ id: 'b', listing_id: null, created_at: at(30) }),
  ]);
  assert.equal(groups.length, 1);
  assert.equal(groups[0].listingId, null);
  assert.equal(groups[0].total, 2);
});

t('🏷 Бүлгийн шошго/гарчиг: «4 хүн таалагдлав» ба «Зар» нөөц ✓', () => {
  assert.equal(groupCountLabel({ total: 4 }), '4 хүн таалагдлав');
  assert.equal(groupCountLabel({ total: 1 }), '1 хүн таалагдлав');
  assert.equal(groupCountLabel({}), 'Таалагдсан хүн алга');
  assert.equal(groupTitleLabel({ listingTitle: ' 3 өрөө байр ' }), '3 өрөө байр');
  assert.equal(groupTitleLabel({ listingTitle: '   ' }), 'Зар');
  assert.equal(groupTitleLabel(null), 'Зар');
});



// ---------- ⑧ SQL-тэй ГЭРЭЭ (хамгийн чухал) ----------
const sqlRaw = readSrc('supabase/migrations/0040_notifications.sql');
const sql = codeOnly(sqlRaw);

t('🧱 Migration: хүснэгт + хуулбар (snapshot) баганууд байна ✓', () => {
  assert.ok(/create table if not exists public\.notifications/i.test(sql), 'notifications хүснэгт алга ✗');
  for (const col of ['user_id', 'actor_id', 'type', 'listing_id', 'listing_title', 'actor_name', 'actor_phone', 'read_at', 'created_at']) {
    assert.ok(new RegExp(`\\b${col}\\b`).test(sql), `${col} багана алга ✗`);
  }
  assert.ok(
    /constraint notifications_unique unique \(user_id, actor_id, type, listing_id\)/.test(sql),
    'давхардлын unique хязгаарлалт алга ✗ (like→unlike→like давхардана)'
  );
});

t('🧱 CHECK-ийн зөвшөөрөгдөх төрөл нь `NOTIFICATION_TYPE_META`-той ИЖИЛ ✓', () => {
  const types = Object.keys(NOTIFICATION_TYPE_META);
  const check = sql.match(/constraint notifications_type_valid check \(type in \(([^)]*)\)\)/);
  assert.ok(check, 'notifications_type_valid CHECK алга ✗');
  const sqlTypes = check[1].split(',').map((s) => s.trim().replace(/^'|'$/g, ''));
  assert.deepEqual(
    sqlTypes.sort(),
    types.sort(),
    `SQL-ийн төрлүүд (${sqlTypes}) нь UI-ийн мета (${types})-тай таарахгүй байна ✗`
  );
});

t('🔒 INSERT policy БАЙХГҮЙ — мөрийг ЗӨВХӨН триггер (security definer) бичнэ ✓', () => {
  assert.ok(!/for insert to authenticated/.test(sql), 'INSERT policy байна ✗ (клиент хуурамч мэдэгдэл бичиж чадна)');
  assert.ok(sql.includes('notifications_select_own'));
  assert.ok(sql.includes('notifications_update_own'));
  assert.ok(sql.includes('notifications_delete_own'));
  assert.ok(/auth\.uid\(\) = user_id/.test(sql), 'RLS нь хүлээн авагчид хатууруулаагүй ✗');
});

t('🔔 Триггер: `listing_likes`-д ❤️ ороход (after insert) мэдэгдэл үүснэ ✓', () => {
  assert.ok(sql.includes('notify_listing_like'), 'триггер функц алга ✗');
  assert.ok(/after insert on public\.listing_likes/.test(sql), 'триггер ХҮЧИНГҮЙ ✗');
  assert.ok(/security definer/.test(sql), 'security definer алга ✗ (RLS-д тээглэнэ)');
  // ⚠️ Зочин (user_id null) ба өөрийн зарын ❤️-д мэдэгдэл ҮҮСГЭХГҮЙ ✓
  assert.ok(/new\.user_id is null/.test(sql), 'зочинг шүүхгүй байна ✗');
  assert.ok(/owner_id is null or owner_id = new\.user_id/.test(sql), 'өөрийн зарын ❤️-г шүүхгүй байна ✗');
  // ⚠️ like→unlike→like үед дахин идэвхжинэ (шинэ мөр үүсэхгүй ✓)
  assert.ok(/on conflict \(user_id, actor_id, type, listing_id\) do update/.test(sql), 'дахин ❤️-д шинэчлэхгүй ✗');
});

t('🔒 «Уншсан» эрх нь ЗӨВХӨН `read_at` баганад (текст/дугаар дарж бичихгүй ✓)', () => {
  assert.ok(
    /^grant\s+update\s*\(\s*read_at\s*\)\s+on\s+public\.notifications\s+to\s+authenticated;/m.test(sql),
    '`grant update (read_at) on public.notifications to authenticated;` мөр олдсонгүй ✗'
  );
  assert.ok(!/grant\s+update\s+on\s+public\.notifications/i.test(sql), 'бүтэн мөр UPDATE эрх өгөгдсөн ✗');
});

t('🧱 Миграц нь idempotent (дахин ажиллуулж болно ✓) + хуучин ❤️-үүд бөглөгдөнө', () => {
  assert.ok(/revoke all on public\.notifications from anon, authenticated/.test(sql), 'revoke алга ✗ (Supabase-ийн default эрх)');
  assert.ok(/drop trigger if exists listing_likes_notify/.test(sql), 'trigger-ийг дахин үүсгэхгүй ✗');
  assert.ok(/drop policy if exists/.test(sql), 'policy-г дахин үүсгэхгүй ✗');
  assert.ok(/insert into public\.notifications/.test(sql), 'хуучин ❤️-ийн backfill алга ✗');
  assert.ok(/on conflict \(user_id, actor_id, type, listing_id\) do nothing/.test(sql), 'backfill давхардаж болно ✗');

// ---------- ⑧b 0041 — 📞 ДУГААР + 🏠 ГАРЧИГ (2026-10-08 (69)) ----------
const sql41 = codeOnly(readSrc('supabase/migrations/0041_notification_phone_title.sql'));
const phoneSrc = readSrc('lib/phoneEmail.js');

t('📞 0041: `phone_from_email()` нь `lib/phoneEmail.js`-ийн ЯГ ИЖИЛ дүрэмтэй ✓', () => {
  // ⚠️ Хоёр газарт хоёр өөр дүрэм үүсвэл DB-д нэг, UI-д нөгөө дугаар гарч
  //    «энэ хэн бэ» гэсэн эргэлзээ үүснэ ✗ — ижил домэйн + ижил «сүүлийн 8
  //    цифр» дүрмийг ХОЁУЛАНД нь түгжинэ ✓
  assert.ok(
    /create or replace function public\.phone_from_email\(p_email text\)/.test(sql41),
    'phone_from_email функц алга ✗'
  );
  assert.ok(sql41.includes("'%@phone.zarmn.mn'"), 'дотоод имэйлийн домэйн шалгалт алга ✗');
  assert.ok(phoneSrc.includes("const EMAIL_DOMAIN = 'phone.zarmn.mn'"), 'lib/phoneEmail.js-ийн домэйн өөрчлөгдсөн ✗');
  assert.ok(sql41.includes("'+976'"), "'+976' угтвар алга ✗");
  assert.ok(
    /right\(regexp_replace\(split_part\(p_email, '@', 1\), '\\D', '', 'g'\), 8\)/.test(sql41),
    'сүүлийн 8 цифрийн дүрэм алга ✗'
  );
  // ⚠️ Бодит жишээ: JS тал ба SQL тал ИЖИЛ утга өгнө ✓
  assert.equal(phoneEmail.emailToPhone('88093663@phone.zarmn.mn'), '+97688093663');
  assert.equal(phoneEmail.emailToPhone('97699112233@phone.zarmn.mn'), '+97699112233');
  assert.equal(phoneEmail.emailToPhone('bat@example.com'), null, 'гадаад имэйлээс дугаар гаргаж болохгүй ✗');
});

t('🏠 0041: гарчиг нь `title` → «төрөл · дүүрэг» → «Зар» дарааллаар нөөцлөгдөнө ✓', () => {
  // ⚠️ `listings.title` нь ЗААВАЛ БИШ (0027) ⇒ хуучин 0040 нь бараг үргэлж
  //    «Зар» гэж хадгалдаг байв — зарын эзэн АЛЬ ЗАР вэ гэдгээ мэдэхгүй байв ✗
  assert.ok(/nullif\(btrim\(l\.title\), ''\)/.test(sql41), 'жинхэнэ гарчиг ТҮРҮҮЛЭХГҮЙ байна ✗');
  assert.ok(/concat_ws\(' · '/.test(sql41), '«төрөл · дүүрэг» нөөц алга ✗');
  assert.ok(/nullif\(btrim\(l\.property_type\), ''\)/.test(sql41), 'property_type нөөц алга ✗');
  assert.ok(/nullif\(btrim\(l\.district\), ''\)/.test(sql41), 'district нөөц алга ✗');
  assert.ok(
    (sql41.match(/'Зар'/g) || []).length >= 3,
    '«Зар» эцсийн нөөц бүх газарт (триггер + бөглөлт) алга ✗'
  );
});

t('📞 0041: триггер дугаарыг `auth.users.phone` → хоосон бол ИМЭЙЛЭЭС авна ✓', () => {
  assert.ok(
    /create or replace function public\.notify_listing_like\(\)/.test(sql41),
    'триггер шинэчлэгдээгүй ✗ (хуучин бие хэвээр үлдвэл дугаар null хэвээр)'
  );
  assert.ok(/security definer/.test(sql41), 'security definer алга ✗ (auth.users унших/RLS тойрох)');
  assert.ok(
    /coalesce\(\s*nullif\(btrim\(u\.phone\), ''\),\s*public\.phone_from_email\(u\.email\)\s*\)/.test(sql41),
    '📞 `auth.users.phone` → имэйл нөөц алга ✗ (ГОЛ АЛДАА засагдахгүй)'
  );
  assert.ok(/from auth\.users u/.test(sql41), 'дугаар нь auth.users-ээс татагдахгүй ✗');
  // ⚠️ Триггер нь 0040-д үүссэн хэвээр (OID хадгалагдана) — дахин үүсгэх хэрэггүй ✓
  assert.ok(!/drop trigger/i.test(sql41), 'триггерийг дарж бичих шаардлагагүй ✗');
  assert.ok(/after insert on public\.listing_likes/.test(sql), '(0040) триггер `after insert` ХЭВЭЭР ✓');
  assert.ok(/owner_id is null or owner_id = new\.user_id/.test(sql41), 'зочин/өөрийн зарын шүүлт алга болсон ✗');
  assert.ok(
    /on conflict \(user_id, actor_id, type, listing_id\) do update/.test(sql41),
    're-like үед `created_at`/`read_at` шинэчлэгдэхгүй ✗'
  );
});

t('🧱 0041: хуучин мөрүүд БӨГЛӨГДӨНӨ (📞 + 🏠, idempotent) + RLS ХӨНДӨӨГДӨХГҮЙ ✓', () => {
  assert.equal(
    (sql41.match(/update public\.notifications n/g) || []).length,
    2,
    '📞 ба 🏠 гэсэн 2 бөглөлт байх ёстой ✗'
  );
  assert.ok(/and nullif\(btrim\(n\.actor_phone\), ''\) is null/.test(sql41), 'дугаартай мөрийг дарж бичиж байна ✗');
  assert.ok(
    /coalesce\(nullif\(btrim\(n\.listing_title\), ''\), 'Зар'\) = 'Зар'/.test(sql41),
    'жинхэнэ гарчигтай мөрийг дарж бичиж байна ✗'
  );
  assert.ok(/\) <> 'Зар';/.test(sql41), 'бөглөх утга байхгүй ч мөр шинэчлэгдэнэ ✗ (idempotent биш)');
  assert.ok(/public\.phone_from_email\(u\.email\)/.test(sql41), 'бөглөлт имэйлээс дугаар гаргахгүй байна ✗');
  // ⚠️ RLS/эрх/хүснэгт ХӨНДӨӨГДӨХГҮЙ — 0040-ийн хатуурал хэвээр ✓
  assert.ok(!/create policy|drop policy|revoke|grant/i.test(sql41), 'RLS/эрх ХӨНДӨӨГДӨЖ байна ✗');
  assert.ok(!/alter table/i.test(sql41), 'хүснэгтийн бүтэц ХӨНДӨӨГДӨЖ байна ✗');
});

// ---------- ⑨ UI-ийн холболт (файл бүрэн эсэх) ----------
t('🧩 queries.js: мэдэгдлийн DB функцууд бүгд байна ✓', () => {
  const q = readSrc('lib/queries.js');
  for (const fn of [
    'fetchNotifications', 'fetchUnreadNotificationCount',
    'markNotificationsRead', 'deleteNotification', 'clearNotifications',
  ]) {
    assert.ok(q.includes(`export async function ${fn}`), `queries.js → ${fn} алга ✗`);
  }
  assert.ok(q.includes("from('notifications')"), 'queries.js нь notifications хүснэгт рүү хандахгүй байна ✗');
  assert.ok(
    /fetchNotifications\(userId, \{ limit = NOTIFICATIONS_LIMIT \} = \{\}\)/.test(q),
    'мөрүүд хязгааргүй татагдана ✗ (хэт олон мөр UI-г дарна)'
  );
  assert.ok(/\.limit\(limit\)/.test(q), '`.limit()` дуудагдахгүй байна ✗');
});

t('🧩 notificationsClient.js: 2 hook + event (badge тэр даруй шинэчлэгдэнэ ✓)', () => {
  const cl = readSrc('lib/notificationsClient.js');
  assert.ok(cl.includes('export function useUnreadNotifications'), 'useUnreadNotifications алга ✗');
  assert.ok(cl.includes('export function useNotifications'), 'useNotifications алга ✗');
  assert.ok(cl.includes('notifyNotificationsChanged'), 'event dispatch алга ✗');
  assert.ok(cl.includes('addEventListener'), 'event сонсохгүй байна ✗');
  // ⚠️ Уншсан гэж тэмдэглэсний дараа хонхны тоо ХУУЧИРЧ үлдэхгүй ✓
  assert.ok(
    cl.includes("from './notifications.mjs'") && cl.includes('NOTIFICATIONS_EVENT'),
    'event-ийн нэр lib/notifications.mjs-ээс импортлогдоогүй ✗ (хоёр өөр мөр болж сална)'
  );
  assert.ok(cl.includes('notifyNotificationsChanged()'), 'үйлдлийн дараа badge-ийг шинэчлэхгүй ✗');
});

t('🧩 NotificationBell: badge + самбар + дугаар + 🏠 ГАРЧИГ (эзэн залгаж чадна ✓)', () => {
  const bell = readSrc('components/NotificationBell.jsx');
  for (const hook of [
    'data-notification-bell', 'data-notification-badge', 'data-notification-panel',
    'data-notification-row', 'data-notification-listing', 'data-notification-phone',
    'data-notification-remove',
  ]) {
    assert.ok(bell.includes(hook), `NotificationBell: ${hook} дэгээ алга ✗ (CDP тест ажиллахгүй)`);
  }
  assert.ok(bell.includes('href="/notifications"'), 'самбарт «Бүгдийг харах» линк алга ✗');
  assert.ok(/formatPhone|actorLabel/.test(bell), 'самбарт дугаар/нэр харуулахгүй байна ✗');
  // 🏠 АЛЬ ЗАР ВЭ (хэрэглэгчийн хүсэлт (69)) — товдсон, ТУСДАА мөрөнд ✓
  assert.ok(bell.includes('listingTitleLabel'), 'самбарт зарын гарчиг харуулахгүй байна ✗');
  assert.ok(
    /data-notification-listing[\s\S]{0,200}🏠 \{title\}/.test(bell),
    'гарчиг нь 🏠 тэмдэгтэй товдсон мөрөнд гарахгүй байна ✗'
  );
  assert.ok(
    /notificationText\(row, \{ withListing: false \}\)/.test(bell),
    'гарчиг нь өгүүлбэр дотор ДАВХАРДАЖ байна ✗ (мөр бүр 1 л гарчигтай байх ёстой)'
  );
  // 📞 Нэргүй хүний дугаар нь ч `tel:` линк (дан дарах → залгана ✓)
  assert.ok(/nameIsPhone && tel/.test(bell), 'нэргүй хүний дугаар линк биш байна ✗ (залгаж чадахгүй)');
});

t('🧩 NotificationsClient: бүлэглэлт + «бүгдийг уншсан»/«цэвэрлэх» ✓', () => {
  const c = readSrc('components/NotificationsClient.jsx');
  for (const hook of [
    'data-notifications-count', 'data-notifications-mark-all', 'data-notifications-clear',
    'data-notifications-group', 'data-notifications-row', 'data-notifications-phone',
    'data-notifications-remove',
  ]) {
    assert.ok(c.includes(hook), `NotificationsClient: ${hook} дэгээ алга ✗`);
  }
  assert.ok(c.includes('groupByListing'), 'хуудас зараар бүлэглэхгүй байна ✗');
  // ⚠️ Миграц ороогүй үед ойлгомжтой заавар (хоосон цагаан дэлгэц БИШ ✓)
  assert.ok(/0040|migration:copy/.test(c), 'миграцын заавар алга ✗');
  assert.ok(c.includes('phoneHref'), 'дугаар руу залгах линк алга ✗');
});

t('🧩 Толгойн мөр: хонх нь «Хайлтын түүх» иконы ДАРАА (хэрэглэгчийн хүсэлт ✓)', () => {
  const code = codeOnly(readSrc('components/AppProviders.jsx'));
  const clock = code.indexOf('<ClockIcon');
  const bell = code.indexOf('<NotificationBell');
  assert.ok(clock > -1, 'ClockIcon толгойн мөрөнд алга ✗');
  assert.ok(bell > -1, 'NotificationBell толгойн мөрөнд алга ✗');
  assert.ok(bell > clock, 'хонх нь хайлтын түүхийн ӨМНӨ байна ✗');
  // Мобайлд баруун дээд буланд (Facebook-ийн хэв ✓)
  assert.ok(/right-4 top-0/.test(code), 'мобайл хонх (баруун дээд) алга ✗');
  assert.ok(code.includes('href="/notifications"'), 'цэс/футерийн холбоос алга ✗');
  assert.ok(code.includes('useUnreadNotifications'), 'хонхны badge-ийн hook холбогдоогүй ✗');
});

t('🧩 HeaderIcons: BellIcon нь `currentColor` SVG (emoji биш — OS бүрд ижил зурагдана ✓)', () => {
  const hi = readSrc('components/HeaderIcons.jsx');
  const idx = hi.indexOf('export function BellIcon');
  assert.ok(idx > -1, 'BellIcon алга ✗');
  const next = hi.indexOf('export function', idx + 10);
  const icon = codeOnly(next > -1 ? hi.slice(idx, next) : hi.slice(idx));
  assert.ok(!/🔔/.test(icon), 'BellIcon нь emoji хэрэглэж байна ✗ (OS бүрд өөрөөр зурагдана)');
  // ⚠️ Бусад иконуудын адил `<Icon>` бүрхүүлээр (stroke/fill = currentColor) зурна ✓
  assert.ok(/<Icon className=/.test(icon), 'хуваалцсан `<Icon>` бүрхүүл ашиглаагүй ✗');
  assert.ok(!/(?:stroke|fill)="#/.test(icon), 'хатуу өнгө (#...) — header-ийн өнгөнд дагахгүй ✗');
  assert.ok(/stroke="currentColor"/.test(hi), '`Icon` бүрхүүл currentColor биш ✗');
});

t('🧩 app/notifications/page.jsx нь client компонентийг харуулна ✓', () => {
  const page = readSrc('app/notifications/page.jsx');
  assert.ok(page.includes('NotificationsClient'), 'хуудас компонентыг дуудахгүй ✗');
  assert.ok(/metadata|title/.test(page), 'хуудасны гарчиг (title) алга ✗');
});

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест (мэдэгдэл)\n`);

});
