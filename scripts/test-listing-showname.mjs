// ============================================================
// test-listing-showname.mjs — 👤 «ПРОФАЙЛ НЭРЭЭ ЗАР ДЭЭР ГАРГАХ УУ?» (2026-10-08 (71))
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «Зар оруулах үед Нэр гэсэн хэсэг байгаа.
//    Түүний доор нэг сонголт нэмье. Профайл нэрээ зар дээр гаргах уу?
//    гэсэн тийм эсвэл үгүй гэсэн хэсэг».
//
// 📐 ГЭРЭЭ (зар ТУС БҮРИЙН тохиргоо — `profiles.show_identity` (0017)
//    нь ХУВЬ ХҮНИЙ (бүх зарын) тохиргоо, энэ нь ЗАР ТУС БҮРИЙН):
//    ① 📝 ФОРМ (`components/AddListingClient.jsx`) — 👤 «Нэр» талбарын ЯГ
//       ДОР `<select>`: Тийм / Үгүй → `form.showName` (BOOLEAN) ✓
//    ② 🗄 DB (`supabase/migrations/0042_listing_show_name.sql`) —
//       `listings.show_name boolean not null default true` ✓
//    ③ 🔁 ХАДГАЛАЛТ (`lib/queries.js` → `listingPayloadToRow`) —
//       `show_name: payload.showName !== false` (⚠️ `Boolean(...)` БИШ:
//       утга ИЛГЭЭГДЭЭГҮЙ (`undefined`) бол АНХДАГЧ «харагдана» ✓)
//    ④ 👁 ХАРАГДАЦ (`ListingDetailClient` · `ListingCard`) —
//       `show_name !== false` үед нэр (`contact_name → display_name →
//       «Холбоо барих хүн»`) ба профайл зураг ГАРНА; `false` үед нэр
//       «Холбоо барих хүн» болж, профайл зураг ГАРАХГҮЙ ✓
//       ⚠️ Утас / ✉️ Мессеж ХӨНДӨӨГДӨХГҮЙ (холбоо барих боломж ХЭВЭЭР ✓)
//
// ХАМРАХ ХҮРЭЭ (DB/React/CDP ХОЛБОГДОХГҮЙ — зөвхөн Node):
//   `supabase/migrations/0042_listing_show_name.sql` · `lib/queries.js`
//   · `components/AddListingClient.jsx` · `components/ListingDetailClient.jsx`
//   · `components/ListingCard.jsx` · `package.json`
//
// АЖИЛЛУУЛАХ:  npm run test:showname
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Комментгүй ЦЭВЭР КОД — тайлбар биш БОДИТ дүрмийг л шалгана ✓ */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n👤 «Профайл нэрээ зар дээр гаргах уу?» (зар тус бүр, 0042) — гэрээ\n');

const MIG = readSrc('supabase/migrations/0042_listing_show_name.sql');
const Q_CODE = codeOnly(readSrc('lib/queries.js'));
const FORM_CODE = codeOnly(readSrc('components/AddListingClient.jsx'));
const DET_CODE = codeOnly(readSrc('components/ListingDetailClient.jsx'));
const CARD_CODE = codeOnly(readSrc('components/ListingCard.jsx'));
const PKG = JSON.parse(readSrc('package.json'));


// ---------- ① 🗄 MIGRATION ----------
t('① 0042 migration: `show_name boolean not null default true` + `if not exists` (idempotent)', () => {
  assert.match(MIG, /add column if not exists show_name boolean not null default true/,
    'багана нэмэх statement алга ✗');
  // ⚠️ Анхдагч `true` = ХУУЧИН зарууд «харагдана» хэвээр (нэг ч зар өөрчлөгдөхгүй ✓)
  assert.ok(/default true/.test(MIG), 'анхдагч нь `true` БИШ ✗');
  assert.ok(!/drop column/i.test(MIG), '`drop column` байх ЁСГҮЙ ✗');
  // ⚠️ АЖИЛЛУУЛАХ SQL нь ЗӨВХӨН 2 statement (мөр шинэчлэх шаардлагагүй —
  //    `default true` нь хуучин мөрүүдийг ч бөглөнө ✓). Коммент доторх
  //    «-- update public.listings …» нь ЖИШЭЭ (ажиллуулахгүй ✓)
  const code = MIG.split('\n').filter((l) => !/^\s*--/.test(l)).join('\n');
  assert.ok(!/update public\.listings/i.test(code), 'ажиллуулах хэсэгт `update` орсон ✗');
  // ⚠️ Ажиллуулах хэсэг нь ЯГ 2 statement: ① `alter table` ② `comment on column`
  assert.equal((code.match(/alter table/gi) || []).length, 1, '`alter table` 1 байх ёстой ✗');
  assert.equal((code.match(/comment on column/gi) || []).length, 1, '`comment on column` 1 байх ёстой ✗');
  assert.ok(!/\b(insert|delete|grant|create)\b/i.test(code), 'илүүц statement байна ✗');
});

t('② 0042 migration: `comment on column` + хэрэглэгчийн эшлэл + ажиллуулах заавар', () => {
  assert.match(MIG, /comment on column public\.listings\.show_name is/, 'тайлбар (comment) алга ✗');
  assert.ok(MIG.includes('Холбоо барих хүн'), 'үйл ажиллагааны тайлбар алга ✗');
  assert.ok(MIG.includes('0042_listing_show_name.sql'), 'ажиллуулах заавар алга ✗');
  assert.ok(MIG.includes('npm run migration:copy'), '`migration:copy` заавар алга ✗');
});

// ---------- ② 🔁 ХАДГАЛАЛТ ----------
t('③ `DETAIL_COLUMNS`-д `show_name` (багана байхгүй орчинд retry-д унана ✓)', () => {
  assert.match(Q_CODE, /const DETAIL_COLUMNS = \[[^\]]*'show_name'[^\]]*\]/,
    '`DETAIL_COLUMNS`-д `show_name` алга ✗');
});

t('④ `listingPayloadToRow`: `show_name: payload.showName !== false` (`Boolean()` БИШ)', () => {
  assert.match(Q_CODE, /show_name:\s*payload\.showName !== false/,
    '`!== false` дүрэм алга ✗ (undefined → «харагдана» байх ёстой)');
  assert.ok(!/show_name:\s*Boolean\(/.test(Q_CODE), '`Boolean(payload.showName)` БУЦАЖ орсон ✗');
});

t('⑤ Багана байхгүй үеийн анхааруулгад 0042 нэрээр бичигдсэн', () => {
  assert.ok(/0042_listing_show_name\.sql/.test(Q_CODE), 'warn мессежид 0042 алга ✗');
  assert.ok(/missingDetailColumns/.test(Q_CODE), 'retry механизм алга ✗');
});

// ---------- ③ 📝 ФОРМ ----------
t('⑥ `emptyForm().showName = true` — шинэ зард АНХДАГЧ «Тийм»', () => {
  assert.match(FORM_CODE, /showName:\s*true/, '`emptyForm` анхдагч алга ✗');
});

t('⑦ `listingToForm().showName = l.show_name !== false` (засах горимд уншина)', () => {
  assert.match(FORM_CODE, /showName:\s*l\.show_name !== false/,
    'засах горимд `show_name` уншигдахгүй ✗');
});

t('⑧ Формд 👤 «Нэр» талбарын ЯГ ДОР `<select>` (Тийм / Үгүй, BOOLEAN хадгална)', () => {
  assert.match(FORM_CODE, /data-listing-show-name-block/, 'CDP дэгээ (block) алга ✗');
  assert.match(FORM_CODE, /data-listing-show-name(?![-\w])/, 'CDP дэгээ (`select`) алга ✗');
  assert.match(FORM_CODE, /value=\{form\.showName \? 'Тийм' : 'Үгүй'\}/, 'утга ↔ текстийн холбоо алга ✗');
  assert.match(FORM_CODE, /onChange=\{\(e\) => set\('showName', e\.target\.value === 'Тийм'\)\}/,
    'BOOLEAN хөрвүүлэлт алга ✗');
  // ⚠️ Талбар нь «Нэр» (contactName) оролтын ДАРАА байрлана (хэрэглэгчийн хүсэлт ✓)
  const name = FORM_CODE.indexOf("set('contactName', e.target.value)");
  const block = FORM_CODE.indexOf('data-listing-show-name-block');
  assert.ok(name > 0 && block > name, '«Профайл нэрээ …» блок нь Нэр талбарын ДООР БИШ ✗');
});

// ---------- ④ 👁 ХАРАГДАЦ ----------
t('⑨ `ListingDetailClient`: `show_name !== false` үед л нэр/профайл зураг', () => {
  assert.match(DET_CODE, /const showName = listing\.show_name !== false/, '`showName` дүрэм алга ✗');
  assert.match(DET_CODE, /const sellerAvatar = showName \? \(\(author && author\.avatarUrl\) \|\| null\) : null/,
    '`sellerAvatar` нь `showName`-оос хамаарахгүй байна ✗');
  assert.match(DET_CODE, /const sellerName = showName/, '`sellerName` нь `showName`-оос хамаарахгүй ✗');
  // ⚠️ Хоёр Avatar (үндсэн + толгойн карт) ХОЁУЛАА `sellerAvatar` ашиглана
  assert.equal((DET_CODE.match(/src=\{sellerAvatar\}/g) || []).length, 2,
    '`sellerAvatar` нь 2 Avatar дээр БАЙХГҮЙ ✗');
  assert.ok(!/src=\{author\.avatarUrl\}/.test(DET_CODE), 'хуучин `author.avatarUrl` буцсан ✗');
  // ⚠️ Утас / мессеж ХӨНДӨӨГДӨӨГҮЙ (холбоо барих боломж ХЭВЭЭР ✓)
  assert.ok(/Холбоо барих/.test(DET_CODE), '«Холбоо барих» товч алга ✗ (утсаар холбогдох хэвээр)');
  assert.ok(/MessageButton/.test(DET_CODE), '`MessageButton` алга ✗');
});

t('⑩ `ListingCard`: `show_name === false` үед нийтлэгчийн band ГАРАХГҮЙ', () => {
  assert.match(CARD_CODE, /const authorVisible = listing\.show_name !== false/, '`authorVisible` алга ✗');
  assert.match(CARD_CODE, /const authorName = authorVisible \? \(author\?\.displayName \|\| ''\) : ''/,
    '`authorName` нь `authorVisible`-оос хамаарахгүй ✗');
  assert.match(CARD_CODE, /const authorAvatar = authorVisible \? \(author\?\.avatarUrl \|\| null\) : null/,
    '`authorAvatar` нь `authorVisible`-оос хамаарахгүй байна ✗');
  // ⚠️ Band нь НЭРЭЭРЭЭ хаалттай (зураг байхгүй ч нэр гарвал band гарна ✓)
  assert.match(CARD_CODE, /\{authorName && \(/, 'band нь `authorName`-ээр хаалттай БИШ ✗');
  assert.match(CARD_CODE, /<Avatar src=\{authorAvatar\} name=\{authorName\} size=\{28\}/,
    'band-ий Avatar нь `authorAvatar`/`authorName` БИШ ✗');
});

// ---------- ⑤ 🔒 ХӨНДӨӨГДӨӨГҮЙ ЗҮЙЛС ----------
t('⑪ Форм: шошго нь хэрэглэгчийн хүсэлтийн ЯГ үг + 2 сонголт + `htmlFor` холбоо', () => {
  assert.ok(FORM_CODE.includes('Профайл нэрээ зар дээр гаргах уу?'), 'шошго алга ✗');
  assert.match(FORM_CODE, /htmlFor="listing-show-name"/, '`<label htmlFor>` холбоо алга ✗');
  assert.match(FORM_CODE, /id="listing-show-name"/, '`id` алга ✗');
  assert.match(FORM_CODE, /<option value="Тийм">Тийм<\/option>/, '«Тийм» сонголт алга ✗');
  assert.match(FORM_CODE, /<option value="Үгүй">Үгүй<\/option>/, '«Үгүй» сонголт алга ✗');
});

t('⑫ `npm run test:showname` бүртгэгдсэн + README-д тест нэрээр бичигдсэн', () => {
  assert.equal(PKG.scripts['test:showname'], 'node scripts/test-listing-showname.mjs',
    '`package.json`-д скрипт алга ✗');
  assert.ok(readSrc('README.md').includes('test-listing-showname.mjs'), 'README-д бүртгэл алга ✗');
});

console.log(`\n✅ ${passed}/${passed} шалгалт АМЖИЛТТАЙ\n`);

