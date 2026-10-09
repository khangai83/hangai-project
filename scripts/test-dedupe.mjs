// ============================================================
// test-dedupe.mjs — 🚫 ЗАРЫН ДАВХАРДЛЫН хамгаалалт (0014 V2) — ГЭРЭЭ
//
//   npm run test:dedupe          ← энэ (хурдан, DB ХЭРЭГГҮЙ)
//   npm run test:dedupe:pg       ← БОДИТ PostgreSQL 16 дээр 52 тест
//                                  (scripts/dedupe-pg-tests.sql)
//
// ЮУ ШАЛГАДАГ ВЭ (статик — эх файлын гэрээ):
//   ① SQL (`supabase/migrations/0014_listing_dedupe.sql`):
//      · `dedupe_key` = section|төрөл|category|хот|дүүрэг|хороо|хаяг
//        + (үл хөдлөх: өрөө|талбай|давхар / бусад: attrs)
//        ⚠️ ҮНЭ/ТАЙЛБАР/УТАС түлхүүрт ОРОХГҮЙ (тойрохоос сэргийлнэ)
//      · 4 дүрэм: 30 хоног · tombstone · өдрийн лимит · cooldown 60 сек
//      · лимит нь `app_metadata.listing_daily_limit` (profiles БАГАНА БИШ —
//        хэрэглэгч өөрөө `profiles_update` policy-гоор тойрч чадна ✗)
//      · `dedupe_status()` RPC (+ anon/authenticated-д grant)
//      · `listing_history` RLS идэвхтэй + policy БАЙХГҮЙ
//      · засварын DELETE+INSERT fallback нь хязгаарт ОРОХГҮЙ (`v_fresh`)
//   ② `lib/queries.js → dedupeError()` — 4 мессежийг МОНГОЛООР дамжуулна
//      (SQL-ийн мессеж ↔ JS-ийн regex ХАМТ шалгагдана)
//   ③ Админ: API (`listingDailyLimit`) · `lib/adminApi.js` · UI · `dailyLimitOf`
//   ④ `check:supabase` — триггер унтарсан эсэхийг `dedupe_status()`-ээр хэлнэ
//
// АЖИЛЛУУЛАХ:  npm run test:dedupe
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');
const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Комментгүй ЦЭВЭР КОД — тайлбар биш БОДИТ дүрмийг л шалгана ✓ */
const codeOnly = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🚫 Зарын давхардлын хамгаалалт (0014 V2) — гэрээ\n');

const MIG = readSrc('supabase/migrations/0014_listing_dedupe.sql');
const MIG_CODE = codeOnly(MIG);
const Q = readSrc('lib/queries.js');
const ADMIN_ROUTE = readSrc('app/api/admin/users/[id]/route.js');
const ADMIN_API = readSrc('lib/adminApi.js');
const ADMIN_UI = readSrc('components/AdminUsersClient.jsx');
const CHECK = readSrc('scripts/check-supabase.js');
const PKG = JSON.parse(readSrc('package.json'));

// ════════════════════════════════════════════════════════════
// ① SQL — түлхүүрийн томъёо (V2)
// ════════════════════════════════════════════════════════════
const KEY_FN = MIG_CODE.slice(
  MIG_CODE.indexOf('create or replace function public.listing_dedupe_key'),
  MIG_CODE.indexOf('comment on function public.listing_dedupe_key')
);

t('① dedupe_key багана нэмэгдэнэ (add column if not exists)', () => {
  assert.match(MIG, /alter table public\.listings add column if not exists dedupe_key text/i);
});

t('① Түлхүүрт section/төрөл/category/хот/дүүрэг/хороо/хаяг ОРСОН', () => {
  ['l.section', 'l.property_type', 'l.category', 'l.city', 'l.district', 'l.khoroo', 'l.address_detail'].forEach(
    (f) => assert.ok(KEY_FN.includes(f), `түлхүүрт ${f} алга ✗`)
  );
});

t('① Үл хөдлөх: өрөө + талбай(бүхэл) + ДАВХАР (floor) — V2 шинэ', () => {
  assert.ok(/l\.section = 'real-estate'/.test(KEY_FN), "real-estate салаа алга ✗");
  assert.ok(KEY_FN.includes('coalesce(l.rooms, 0)'), 'rooms алга ✗');
  assert.ok(/round\(coalesce\(l\.area, 0\)\)::int/.test(KEY_FN), 'талбай бөөрөнхийлөлт алга ✗');
  assert.ok(KEY_FN.includes('coalesce(l.floor, 0)'), 'floor алга ✗ (ижил байрны 2 давхар ялгарахгүй)');
});

t('① Бусад хэсэг: attrs гарын үсэг (rooms/area нь 0 тул)', () => {
  assert.ok(/l\.attrs - 'negotiable' - 'payment_terms'/.test(KEY_FN),
    'attrs-аас negotiable/payment_terms хасагдсангүй ✗ (хүн бүр сольдог → хамгаалалт суларна)');
});

t('① ⛔ ҮНЭ / ТАЙЛБАР / УТАС / ЗУРАГ түлхүүрт ОРООГҮЙ (тойрохоос сэргийлнэ)', () => {
  assert.ok(!/l\.price/.test(KEY_FN), 'price түлхүүрт орсон ✗');
  assert.ok(!/description|body|phone|images/i.test(KEY_FN), 'тайлбар/утас/зураг түлхүүрт орсон ✗');
});

t('① listing_dedupe_key нь IMMUTABLE (index/триггер дотор аюулгүй)', () => {
  assert.ok(/language sql\s+immutable/i.test(KEY_FN), 'immutable биш ✗');
});

// ════════════════════════════════════════════════════════════
// ① SQL — 4 дүрэм
// ════════════════════════════════════════════════════════════
const TRIG_FN = MIG_CODE.slice(
  MIG_CODE.indexOf('create or replace function public.prevent_duplicate_listing'),
  MIG_CODE.indexOf('comment on function public.prevent_duplicate_listing')
);

t('① Дүрэм 1: ижил user_id + ижил dedupe_key → 30 хоногт давхардуулахгүй', () => {
  assert.ok(/v_days\s+constant int\s*:=\s*30/.test(TRIG_FN), '30 хоногийн цонх алга ✗');
  assert.ok(/l\.user_id\s*=\s*new\.user_id/.test(TRIG_FN), 'user_id-ээр шалгахгүй байна ✗');
  assert.ok(/l\.id is distinct from new\.id/.test(TRIG_FN), 'өөрийн мөрийг хасахгүй байна ✗');
});

t('① Дүрэм 2: tombstone (`listing_history`) — устгаад дахин оруулахыг хаана', () => {
  assert.ok(/create table if not exists public\.listing_history/i.test(MIG), 'хүснэгт алга ✗');
  assert.ok(/public\.listing_history h[\s\S]{0,200}h\.dedupe_key = new\.dedupe_key/.test(TRIG_FN),
    'tombstone шалгалт алга ✗');
  assert.ok(/after delete on public\.listings/i.test(MIG), 'after delete триггер алга ✗');
});

t('① 🔒 listing_history: RLS идэвхтэй ба ЯМАР Ч policy БАЙХГҮЙ', () => {
  assert.ok(/alter table public\.listing_history enable row level security/i.test(MIG), 'RLS алга ✗');
  assert.ok(!/create policy[\s\S]{0,60}listing_history/i.test(MIG), 'policy нэмэгдсэн ✗ (client уншиж чадна)');
});

t('① Дүрэм 3: өдрийн лимит — `app_metadata.listing_daily_limit` (profiles БАГАНА БИШ!)', () => {
  assert.ok(/raw_app_meta_data ->> 'listing_daily_limit'/.test(TRIG_FN),
    'app_metadata-аас лимит уншихгүй байна ✗');
  assert.ok(!/from public\.profiles[\s\S]{0,80}listing_daily_limit/.test(TRIG_FN),
    'profiles багана ашигласан ✗ (хэрэглэгч өөрөө 0 болгож ТОЙРЧ чадна)');
  assert.ok(/v_daily_max\s+constant int\s*:=\s*3/.test(TRIG_FN), 'анхдагч 3 алга ✗');
  assert.ok(/v_limit > 0/.test(TRIG_FN), '0 = хязгааргүй дүрэм алга ✗');
  assert.ok(/\^\[0-9\]\+\$/.test(TRIG_FN), 'тоо биш утгыг шүүхгүй байна ✗');
});

t('① Дүрэм 4: cooldown 60 секунд — зөвхөн ШИНЭ зар (INSERT)', () => {
  assert.ok(/v_cooldown\s+constant interval\s*:=\s*interval '60 seconds'/.test(TRIG_FN), '60 сек алга ✗');
  assert.ok(/l\.created_at > now\(\) - v_cooldown/.test(TRIG_FN), 'cooldown шалгалт алга ✗');
  assert.ok(/if tg_op = 'INSERT' then/.test(TRIG_FN), 'INSERT-ээр хязгаарлахгүй байна ✗ (засварт саад болно)');
});

t('① Засварын DELETE+INSERT fallback нь хязгаарт ОРОХГҮЙ (зар алга болохоос сэргийлнэ)', () => {
  assert.ok(/v_fresh\s+constant interval\s*:=\s*interval '10 minutes'/.test(TRIG_FN), 'v_fresh алга ✗');
  assert.ok(/v_is_fallback := exists/.test(TRIG_FN), 'fallback илрүүлэлт алга ✗');
  assert.ok(/if not v_is_fallback then/.test(TRIG_FN), 'fallback-ыг хасахгүй байна ✗');
  assert.ok(/h\.listing_id = new\.id and h\.deleted_at > now\(\) - v_fresh/.test(TRIG_FN),
    'tombstone-оос fallback хасахгүй байна ✗');
});

t('① Засварын түлхүүр ӨӨРЧЛӨГДӨӨГҮЙ бол шалгалт хийхгүй (үнэ/тайлбар засах)', () => {
  assert.ok(/old\.dedupe_key is not distinct from new\.dedupe_key/.test(TRIG_FN), 'шалгалт алга ✗');
});

t('① Backfill нь триггер унтарсан үед л ажиллана (migration нурж болохгүй)', () => {
  assert.ok(/disable trigger listings_prevent_duplicate/.test(MIG), 'disable алга ✗');
  assert.ok(/enable trigger listings_prevent_duplicate/.test(MIG), 'enable алга ✗ (унтарсан үлдэнэ ✗)');
});

// ════════════════════════════════════════════════════════════
// ① SQL — 🩺 dedupe_status() RPC
// ════════════════════════════════════════════════════════════
const STATUS_FN = MIG_CODE.slice(MIG_CODE.indexOf('create or replace function public.dedupe_status'));

t('① dedupe_status() нь триггерүүдийн төлвийг (`tgenabled`) буцаана', () => {
  assert.ok(/t\.tgenabled = 'O'/.test(STATUS_FN), 'tgenabled шалгахгүй байна ✗');
  assert.ok(/listings_prevent_duplicate/.test(STATUS_FN), 'гол триггер алга ✗');
  assert.ok(/listings_log_delete/.test(STATUS_FN), 'устгалын триггер алга ✗');
});

t('① dedupe_status(): anon/authenticated-д grant (check:supabase дуудна)', () => {
  assert.ok(/grant execute on function public\.dedupe_status\(\) to anon, authenticated/i.test(MIG),
    'grant алга ✗ (PostgREST 403/PGRST202 буцаана)');
  assert.ok(/security definer/i.test(STATUS_FN), 'security definer алга ✗ (pg_trigger харагдахгүй)');
});

// ════════════════════════════════════════════════════════════
// ② dedupeError() — SQL мессеж ↔ JS regex
// ════════════════════════════════════════════════════════════
const RX_MATCH = codeOnly(Q).match(/const isOurs =\s*[\s\S]{0,120}?\/([^/\n]*)\/([a-z]*)\.test\(msg\)/);

t('② dedupeError() нь `23505` + монгол мессежээр шалгана (бусад 23505-ыг дамжуулахгүй)', () => {
  assert.ok(RX_MATCH, 'dedupeError-ийн regex олдсонгүй ✗');
  const RX = new RegExp(RX_MATCH[1], RX_MATCH[2]);
  assert.ok(RX.test('Ижил зар таны бүртгэлд аль хэдийн байна (30 хоногийн дотор давхардуулахгүй).'));
  assert.ok(RX.test('Энэ зарыг саяхан устгасан байна. 30 хоногийн дараа дахин оруулж болно.'));
  assert.ok(RX.test('Өдөрт 50 зарын хязгаар (SPAM хамгаалалт). Маргааш дахин оролдоно уу.'));
  assert.ok(RX.test('Хэт хурдан оруулж байна. 60 секунд хүлээгээд дахин оролдоно уу.'));
  assert.ok(!RX.test('duplicate key value violates unique constraint "listings_pkey"'),
    'гадны 23505-ыг монгол мессеж гэж андуурч байна ✗');
});

t('② SQL-ийн 4 дүрмийн мессеж БҮГД JS regex-т тохирно (SQL ↔ JS нийцэл)', () => {
  const RX = new RegExp(RX_MATCH[1], RX_MATCH[2]);
  const phrases = [
    { sql: 'давхардуулахгүй', msg: 'Ижил зар … 30 хоногийн дотор давхардуулахгүй …' },
    { sql: 'саяхан устгасан', msg: 'Энэ зарыг саяхан устгасан байна …' },
    { sql: 'зарын хязгаар', msg: 'Өдөрт 3 зарын хязгаар …' },
    { sql: 'хэт хурдан', msg: 'Хэт хурдан оруулж байна …' },
  ];
  phrases.forEach((p) => {
    assert.ok(TRIG_FN.toLowerCase().includes(p.sql.toLowerCase()),
      `SQL-д «${p.sql}» мессеж алга ✗`);
    assert.ok(RX.test(p.msg), `«${p.sql}» мессежийг JS regex танихгүй ✗ (хэрэглэгч (23505) харна)`);
  });
});

// ════════════════════════════════════════════════════════════
// ③ АДМИН — агентын лимит (`app_metadata`, client-ээс хамгаалагдсан)
// ════════════════════════════════════════════════════════════
t('③ PATCH /api/admin/users/[id] — `listingDailyLimit` хүлээнэ, `dailyLimit` буцаана', () => {
  assert.ok(/listingDailyLimit/.test(ADMIN_ROUTE), 'listingDailyLimit огт алга ✗');
  assert.ok(/setUserDailyLimit/.test(ADMIN_ROUTE), 'setUserDailyLimit дуудахгүй ✗');
  assert.ok(/dailyLimit: dailyLimitOf\(user\)/.test(ADMIN_ROUTE), 'хариултад dailyLimit алга ✗');
  assert.ok(/hasLimit/.test(ADMIN_ROUTE), 'hasLimit шалгалт алга ✗');
});

t('③ lib/adminApi.js — updateUserDailyLimit() PATCH илгээнэ', () => {
  assert.ok(/export function updateUserDailyLimit/.test(ADMIN_API), 'функц алга ✗');
  assert.ok(/listingDailyLimit/.test(ADMIN_API), 'body-д listingDailyLimit алга ✗');
});

t('③ Admin UI — «⚡ Лимит» багана + 3/50/∞ товч + ⚡ АГЕНТ шошго', () => {
  assert.ok(ADMIN_UI.includes('⚡ Лимит'), 'баганын гарчиг алга ✗');
  assert.ok(/v: 3, label: '3'/.test(ADMIN_UI), '3 товч алга ✗');
  assert.ok(/v: 50, label: '50'/.test(ADMIN_UI), '50 товч алга ✗');
  assert.ok(/v: 0, label: '∞'/.test(ADMIN_UI), '∞ товч алга ✗');
  assert.ok(ADMIN_UI.includes('⚡ АГЕНТ'), 'АГЕНТ шошго алга ✗ (агент харагдахгүй)');
  assert.ok(/colSpan=\{8\}/.test(ADMIN_UI), 'хүснэгтийн баганын тоо (colSpan) таарахгүй ✗');
});

t('③ `dailyLimitOf` — БОДИТ модулиас (env байхгүй бол SKIP)', () => {
  const require = createRequire(import.meta.url);
  let mod = null;
  try {
    mod = require(path.join(ROOT, 'lib/adminAuth.js'));
  } catch {
    mod = null;
  }
  if (!mod || typeof mod.dailyLimitOf !== 'function') {
    console.log('     ⚠️ SKIP: lib/adminAuth.js require хийгдсэнгүй (env дутуу)');
    return;
  }
  assert.equal(mod.dailyLimitOf({ app_metadata: {} }), 3, 'тохируулаагүй → 3 байх ёстой');
  assert.equal(mod.dailyLimitOf({ app_metadata: { listing_daily_limit: 50 } }), 50);
  assert.equal(mod.dailyLimitOf({ app_metadata: { listing_daily_limit: 0 } }), 0, '0 = хязгааргүй');
  assert.equal(mod.dailyLimitOf({ app_metadata: { listing_daily_limit: '50' } }), 50, 'string тоо ч ажиллана');
  assert.equal(mod.dailyLimitOf({ app_metadata: { listing_daily_limit: 'abc' } }), 3, 'тоо биш → анхдагч');
  assert.equal(mod.dailyLimitOf({ app_metadata: { listing_daily_limit: null } }), 3);
  assert.equal(mod.dailyLimitOf({ app_metadata: { listing_daily_limit: -5 } }), 3, 'сөрөг → анхдагч');
  assert.equal(mod.dailyLimitOf(null), 3);
  assert.equal(mod.DAILY_LIMIT_DEFAULT, 3);
});

// ════════════════════════════════════════════════════════════
// ④ check:supabase — триггер унтарсан эсэхийг ЧАНГААР хэлнэ
// ════════════════════════════════════════════════════════════
t('④ check:supabase нь `dedupe_status()`-ээр триггерийн төлвийг шалгана', () => {
  assert.ok(/rest\/v1\/rpc\/dedupe_status/.test(CHECK), 'dedupe_status дуудахгүй ✗');
  assert.ok(/trigger_enabled/.test(CHECK), 'trigger_enabled уншихгүй ✗');
  assert.ok(/УНТАРСАН/.test(CHECK), 'унтарсан үед анхааруулахгүй ✗');
});

t('④ npm scripts — test:dedupe + test:dedupe:pg бүртгэгдсэн', () => {
  assert.ok(PKG.scripts['test:dedupe'], 'test:dedupe алга ✗');
  assert.ok(PKG.scripts['test:dedupe:pg'], 'test:dedupe:pg алга ✗');
  assert.ok(fs.existsSync(path.join(ROOT, 'scripts/dedupe-pg-tests.sql')),
    'scripts/dedupe-pg-tests.sql алга ✗');
});

console.log(`\n✅ ${passed} тест давав ✓\n`);
