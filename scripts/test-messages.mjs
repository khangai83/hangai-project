// ============================================================
// test-messages.mjs — МЕССЕЖИЙН логикийн тест (lib/messages.mjs)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Чат нь «хэн нөгөө тал вэ», «уншаагүй хэд вэ», «текст зөв үү» гэсэн
//   ГУРВАН газарт буруу болбол хэрэглэгч БУРУУ хүнд мессеж бичих, эсвэл
//   badge-ийн тоо буруу гарах гэсэн бодит алдаа үүснэ ✗ — энэ тест
//   тэр гэрээг түгждэг ✓
//
// ⚠️ ХАМГИЙН ЧУХАЛ: 0020_messages.sql-ийн `messages_body_len` CHECK нь
//    UI-ийн `validateMessageBody()`-тай ИЖИЛ байх ёстой. Зөрвөл хэрэглэгч
//    «товч идэвхтэй байтал DB `check constraint` алдаа» гэж гайхана ✗
//    → тест SQL файлыг уншиж харьцуулна.
//
// АЖИЛЛУУЛАХ:  npm run test:messages
// ============================================================
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_MESSAGE_LENGTH, partnerId, myRole, conversationTitle, previewText,
  previewWithSender, validateMessageBody, sortConversations,
  unreadByConversation, totalUnread, decorateThread, canMessage,
  readConversationParam, conversationHref,
} from '../lib/messages.mjs';

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🧪 Мессежийн логик (lib/messages.mjs)\n');

// ---------- Тогтмол утгууд ----------
const ME = '11111111-1111-1111-1111-111111111111';
const OTHER = '22222222-2222-2222-2222-222222222222';
const CONV = '33333333-3333-3333-3333-333333333333';

/** Би `buyer`, нөгөө нь `seller` — миний эхэлсэн яриа */
const asBuyer = { id: CONV, buyer_id: ME, seller_id: OTHER, listing_title: 'Орон сууц' };
/** Би `seller` — над руу мессеж ирсэн яриа */
const asSeller = { id: CONV, buyer_id: OTHER, seller_id: ME, listing_title: 'Орон сууц' };

// ---------- ① validateMessageBody ----------
t('✍️ Хоосон/зөвхөн зайтай мессеж — ЗОГСООНО', () => {
  for (const bad of ['', '   ', '\n\t ', null, undefined]) {
    const r = validateMessageBody(bad);
    assert.equal(r.ok, false);
    assert.equal(r.error, 'Мессеж хоосон байна.');
  }
});

t('✍️ Мессежийн зайг тайрч, \\r\\n-ийг \\n болгоно (телефон/PC-ийн Enter)', () => {
  const r = validateMessageBody('  Сайн байна уу\r\nБайр байгаа юу?  ');
  assert.equal(r.ok, true);
  assert.equal(r.value, 'Сайн байна уу\nБайр байгаа юу?');
  assert.equal(r.error, null);
});

t(`✍️ Хязгаар нь ЯГ ${MAX_MESSAGE_LENGTH} тэмдэгт (тэнцүү нь зөвшөөрөгдөнө)`, () => {
  assert.equal(validateMessageBody('а'.repeat(MAX_MESSAGE_LENGTH)).ok, true);
  const over = validateMessageBody('а'.repeat(MAX_MESSAGE_LENGTH + 1));
  assert.equal(over.ok, false);
  assert.match(over.error, /хэт урт/);
});

// ---------- ② partnerId / myRole ----------
t('👥 Нөгөө талыг ЗӨВ олно (хоёр талаас нь тэгш ажиллана)', () => {
  assert.equal(partnerId(asBuyer, ME), OTHER);   // би buyer → нөгөө нь seller
  assert.equal(partnerId(asSeller, ME), OTHER);  // би seller → нөгөө нь buyer
  assert.equal(partnerId(asBuyer, OTHER), ME);
});

t('👥 Оролцогч БИШ хүнд `null` (бусдын чат руу санамсаргүй орохгүй ✓)', () => {
  assert.equal(partnerId(asBuyer, 'unknown-id'), null);
  assert.equal(myRole(asBuyer, 'unknown-id'), null);
  assert.equal(partnerId(null, ME), null);
});

t('👥 myRole нь талыг тодорхойлно', () => {
  assert.equal(myRole(asBuyer, ME), 'buyer');
  assert.equal(myRole(asSeller, ME), 'seller');
  assert.equal(myRole(asBuyer, null), null);
});

// ---------- ③ conversationTitle ----------
t('🏷 Гарчиг: нэр байвал нэрийг, байхгүй бол талаас хамаарч нөөц текст', () => {
  assert.equal(conversationTitle(asBuyer, ME, '  Бат  '), 'Бат');
  assert.equal(conversationTitle(asBuyer, ME, ''), 'Зар нийтлэгч'); // би buyer → нөгөө нь зар нийтлэгч
  assert.equal(conversationTitle(asSeller, ME, null), 'Хэрэглэгч'); // би seller → нөгөө нь хэрэглэгч
});

// ---------- ④ preview ----------
t('📝 preview нь «Та: » угтварыг ЗӨВХӨН өөрийн мессежид нэмнэ', () => {
  const mine = { ...asBuyer, last_message: 'Байр байгаа юу?', last_sender_id: ME };
  const theirs = { ...asBuyer, last_message: 'Тийм, байгаа', last_sender_id: OTHER };
  assert.equal(previewWithSender(mine, ME), 'Та: Байр байгаа юу?');
  assert.equal(previewWithSender(theirs, ME), 'Тийм, байгаа');
});

t('📝 Мессежгүй шинэ яриа нь «Мессеж бичих...» гэж харагдана', () => {
  assert.equal(previewWithSender({ ...asBuyer, last_message: null }, ME), 'Мессеж бичих...');
  assert.equal(previewWithSender(null, ME), 'Мессеж бичих...');
});

t('📝 Урт мессеж нь таслагдаж, шинэ мөр нэг зай болно (нэг мөрөнд багтана ✓)', () => {
  const long = previewText('а'.repeat(120), 80);
  assert.equal(long.length, 80);
  assert.ok(long.endsWith('…'));
  assert.equal(previewText('Нэг\nХоёр\tГурав', 80), 'Нэг Хоёр Гурав');
});

// ---------- ⑤ Уншаагүй тоолуур ----------
const unreadRows = [
  { conversation_id: CONV, sender_id: OTHER },
  { conversation_id: CONV, sender_id: OTHER },
  { conversation_id: CONV, sender_id: ME },      // ← өөрийнх нь тоологдохгүй
  { conversation_id: 'b2', sender_id: OTHER },
];

t('🔴 Уншаагүйг ЯРИА ТУС БҮРЭЭР тоолж, өөрийнхөө мессежийг ОРХИНО', () => {
  assert.deepEqual(unreadByConversation(unreadRows, ME), { [CONV]: 2, b2: 1 });
  assert.equal(totalUnread(unreadRows, ME), 3);
});

t('🔴 Уншаагүй мессежгүй бол 0 (badge ХАРАГДАХГҮЙ)', () => {
  assert.equal(totalUnread([], ME), 0);
  assert.equal(totalUnread([{ conversation_id: CONV, sender_id: ME }], ME), 0);
  assert.equal(totalUnread(null, ME), 0);
});

// ---------- ⑥ decorateThread ----------
t('🧵 Мессежүүд хуучин → ШИНЭ дараалалтай, `mine`/`read` тэмдэгтэй', () => {
  const rows = [
    { id: 'm3', sender_id: ME, created_at: '2026-09-28T10:00:00Z', read_at: null },
    { id: 'm1', sender_id: OTHER, created_at: '2026-09-28T08:00:00Z', read_at: '2026-09-28T09:00:00Z' },
    { id: 'm2', sender_id: OTHER, created_at: '2026-09-28T09:00:00Z', read_at: null },
  ];
  const out = decorateThread(rows, ME);
  assert.deepEqual(out.map((m) => m.id), ['m1', 'm2', 'm3']);
  assert.deepEqual(out.map((m) => m.mine), [false, false, true]);
  // ⚠️ Өөрийн мессеж нь read_at NULL байсан ч «уншсан» (миний зүгээс уншаагүй гэж байхгүй)
  assert.deepEqual(out.map((m) => m.read), [true, false, true]);
});

t('🧵 decorateThread нь анхны массивыг ЭВДЭХГҮЙ (React state-д аюулгүй ✓)', () => {
  const rows = [{ id: 'm2', created_at: '2026-09-28T10:00:00Z' }, { id: 'm1', created_at: '2026-09-28T09:00:00Z' }];
  const copy = [...rows];
  decorateThread(rows, ME);
  assert.deepEqual(rows, copy);
});

// ---------- ⑦ sortConversations ----------
t('🗂 Ярианы жагсаалт шинээрээ ЭХЭНД (last_message_at desc), мутацгүй', () => {
  const list = [
    { id: 'a', last_message_at: '2026-09-27T10:00:00Z' },
    { id: 'c', last_message_at: '2026-09-28T10:00:00Z' },
    { id: 'b', last_message_at: '2026-09-28T09:00:00Z' },
  ];
  const copy = [...list];
  assert.deepEqual(sortConversations(list).map((c) => c.id), ['c', 'b', 'a']);
  assert.deepEqual(list, copy);
  assert.deepEqual(sortConversations([{ id: 'x' }]).map((c) => c.id), ['x']); // огноо дутуу ч эвдрэхгүй
});

// ---------- ⑧ canMessage ----------
t('🔐 Нэвтрээгүй бол мессеж бичихгүй + нэвтрэх цонх руу (reason: auth)', () => {
  const r = canMessage(null, OTHER);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'auth');
  assert.match(r.error, /эхлээд нэвтэрнэ үү/);
});

t('🔐 Өөрийн зар руу мессеж бичихгүй (reason: self)', () => {
  const r = canMessage(ME, ME);
  assert.equal(r.ok, false);
  assert.equal(r.reason, 'self');
  assert.match(r.error, /Өөрийн зар/);
});

t('🔐 Хоёр өөр хэрэглэгч — зөвшөөрөгдөнө', () => {
  assert.deepEqual(canMessage(ME, OTHER), { ok: true, reason: null, error: null });
});

// ---------- ⑨ `?c=` param + линк ----------
t('🔗 `?c=<uuid>`-г уншина; буруу/хоосон бол null (эвдэрсэн линкээр унахгүй ✓)', () => {
  assert.equal(readConversationParam(`?c=${CONV}`), CONV);
  assert.equal(readConversationParam(`c=${CONV}&x=1`), CONV);
  assert.equal(readConversationParam('?c=not-a-uuid'), null);
  assert.equal(readConversationParam(''), null);
  assert.equal(readConversationParam('?c='), null);
});

t('🔗 Ярианы линк нь /messages?c=<id> (refresh/хуваалцахад тогтвортой ✓)', () => {
  assert.equal(conversationHref(CONV), `/messages?c=${CONV}`);
});

// ---------- ⑩ SQL-тэй ГЭРЭЭ (хамгийн чухал) ----------
const sql = fs.readFileSync(
  path.join(process.cwd(), 'supabase/migrations/0020_messages.sql'),
  'utf8'
);

t(`🧱 Migration-ийн мессежийн хязгаар нь UI-тай ИЖИЛ (${MAX_MESSAGE_LENGTH})`, () => {
  assert.ok(
    sql.includes(`char_length(btrim(body)) between 1 and ${MAX_MESSAGE_LENGTH}`),
    '0020_messages.sql дэх messages_body_len CHECK нь MAX_MESSAGE_LENGTH-тай таарахгүй байна'
  );
});

t('🧱 RLS: мессеж/яриа нь ЗӨВХӨН оролцогчид (insert нь өөрийн нэрээр)', () => {
  for (const needle of [
    'conversations_select_participant',
    'conversations_insert_own',
    'messages_select_participant',
    'messages_insert_participant',
    'messages_mark_read',
    'is_conversation_participant',
  ]) {
    assert.ok(sql.includes(needle), `${needle} алга — RLS бүрэн биш ✗`);
  }
  assert.ok(sql.includes('with check (auth.uid() = buyer_id and buyer_id <> seller_id)'));
  assert.ok(sql.includes('sender_id = auth.uid()'));
});

t('🔒 «Уншсан» тэмдэглэх эрх нь ЗӨВХӨН `read_at` баганад (текст дарж бичихгүй ✓)', () => {
  // ⚠️ Эерэг шалгалтыг МӨРЭЭР (`^grant`) хайна: ингэснээр тайлбар доторх
  //    «grant update (read_at)» гэсэн ЖИШЭЭ бичвэр тестийг хуурамчаар
  //    давснаас сэргийлнэ ✓ (SQL доторх зай ч өөрчлөгдөж болно — `\s+`)
  assert.ok(
    /^grant\s+update\s*\(\s*read_at\s*\)\s+on\s+public\.messages\s+to\s+authenticated;/m.test(sql),
    '`grant update (read_at) on public.messages to authenticated;` мөр олдсонгүй ✗'
  );
  assert.ok(!/grant\s+update\s+on\s+public\.messages/i.test(sql), 'бүтэн мөр UPDATE эрх өгөгдсөн ✗');
});

t('🧱 Сүүлийн мессежийн триггер нь security definer (RLS-д тээглэхгүй ✓)', () => {
  assert.ok(sql.includes('touch_conversation_on_message'));
  assert.ok(sql.includes('after insert on public.messages'));
  assert.ok(/security definer/.test(sql));
});

console.log(`\n✅ БҮГД ТЭНЦСЭН — ${passed} тест (мессеж)\n`);
