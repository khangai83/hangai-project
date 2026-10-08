// ============================================================
// test-seller-avatar.mjs — 👤 НИЙТЛЭГЧИЙН ХУУДСАНЫ ПРОФАЙЛ ЗУРАГ (2026-10-08)
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ: «профайл зургийг … дахин нэмээ» —
//    `/sellers/<user_id>` (нийтлэгчийн хуудас) дээр профайл зураг
//    ХАРАГДАХГҮЙ байв: толгойн карт дээр зөвхөн нэрийн ЭХНИЙ ҮСЭГ
//    (`charAt(0)`, `rounded-full` дугуй) гардаг байсан бөгөөд
//    `profiles.avatar_url` ОГТ ашиглагдаагүй ✗
//
//    ⇒ Одоо зарын карттай (64)-ийн адил `Avatar` компонент:
//      ⓐ `src={seller.avatarUrl}` (profiles.avatar_url, 64px) ✓
//      ⓑ зураггүй бол үсэг (Avatar дотроо) ✓
//      ⓒ `show_identity = false` үед бусдын нүдээр ХАРАГДАХГҮЙ (0017) ✓
//      ⓓ `user.id === sellerId` (өөрийн хуудас) үед эзэн бүтнээрээ харна ✓
//
// ⚠️ Эдгээр нь ХАРАГДАЦ/UI-ийн гэрээ — DB/query/migration 0 ✓
//
// ХАМРАХ ХҮРЭЭ (DB/React/CDP ХОЛБОГДОХГҮЙ — зөвхөн Node):
//   `components/SellerListingsClient.jsx` · `components/Avatar.jsx`
//   · `components/ListingDetailClient.jsx` (⏳ (64)(66) — регресс хамгаалалт)
//
// АЖИЛЛУУЛАХ:  npm run test:seller-avatar
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

console.log('\n👤 Нийтлэгчийн хуудсан (sellers) дээрх ПРОФАЙЛ ЗУРАГ — гэрээ\n');

const SELLER = readSrc('components/SellerListingsClient.jsx');
const SELLER_CODE = codeOnly(SELLER);
const AVATAR = readSrc('components/Avatar.jsx');
const AVATAR_CODE = codeOnly(AVATAR);
const DET_CODE = codeOnly(readSrc('components/ListingDetailClient.jsx'));

// ---------- ① `Avatar` компонент ашиглаж байна ----------
t('① `Avatar` компонент IMPORT хийгдсэн', () => {
  assert.match(SELLER_CODE, /import\s+Avatar\s+from\s+'\.\/Avatar'/, 'Avatar import алга');
});

t('② Толгойн карт дээр `<Avatar …>` RENDER хийгдсэн (64px)', () => {
  assert.match(
    SELLER_CODE,
    /<Avatar\s+src=\{seller\.avatarUrl\}\s+name=\{seller\.name\}\s+size=\{64\}\s*\/>/,
    '`<Avatar src={seller.avatarUrl} name={seller.name} size={64} />` олдсонгүй'
  );
});

t('③ Хуучин ҮСЭГ-аватар (`charAt(0)` · `h-16 w-16 rounded-full`) ХАСАГДСАН', () => {
  assert.doesNotMatch(SELLER_CODE, /charAt\(0\)/, '`charAt(0)` ҮЛДСЭН байна');
  assert.doesNotMatch(SELLER_CODE, /h-16 w-16/, 'хуучин 64px үсэг-аватар (`h-16 w-16`) үлдсэн');
  assert.doesNotMatch(SELLER_CODE, /'👤'\)\.trim\(\)/, 'хуучин үсэг-автарын fallback үлдсэн');
});

// ---------- ② `profiles.avatar_url` → `seller.avatarUrl` ----------
t('④ Профайлаас `avatar_url` уншиж байна (`fetchProfile` → `p.avatar_url`)', () => {
  assert.match(SELLER_CODE, /const\s+p\s*=\s*await\s+fetchProfile\(sellerId\)/, 'fetchProfile(sellerId) алга');
  assert.match(SELLER_CODE, /setProfileAvatar\(\s*p\.avatar_url\s*\|\|\s*null\s*\)/, '`avatar_url` уншигдахгүй байна');
});

t('⑤ Зургийн ЭХ СУРВАЛЖ нь `profiles` — зарын `images`/`contact_name` БИШ', () => {
  assert.match(SELLER_CODE, /avatarUrl:\s*identityVisible\s*\?\s*profileAvatar\s*:\s*null/, '`avatarUrl` нь `profileAvatar`-аас ирэх ёстой');
  assert.doesNotMatch(SELLER_CODE, /avatarUrl:\s*rows\[0\]/, 'зургийг зарын мөрөөс авах ЁСГҮЙ');
});

t('⑥ `seller` объект `avatarUrl`-ыг агуулж, зар байхгүй үед `null`', () => {
  const empty = SELLER_CODE.match(/if\s*\(!rows\.length\)\s*return\s*\{([^}]*)\}/);
  assert.ok(empty, '`!rows.length` эрт буцаалт олдсонгүй');
  assert.match(empty[1], /avatarUrl:\s*null/, '«зар байхгүй» салбарт `avatarUrl: null` байх ёстой');
});

// ---------- ③ 0017: `show_identity` ----------
t('⑦ 0017 `show_identity` нь `Avatar`-д хүртэл мөрдөгдөнө (бусдын нүдээр)', () => {
  assert.match(SELLER_CODE, /setIdentityHidden\(/, '`identityHidden` төлөв алга');
  assert.match(
    SELLER_CODE,
    /p\.show_identity\s*===\s*undefined\s*\?\s*false\s*:\s*p\.show_identity\s*!==\s*true/,
    '`show_identity`-ийн «багана байхгүй бол харагдана» дүрэм алга'
  );
  assert.match(SELLER_CODE, /const\s+identityVisible\s*=\s*isOwner\s*\|\|\s*!identityHidden/, '`identityVisible` тооцоо алга');
});

t('⑧ `user.id === sellerId` (ӨӨРИЙН хуудас) үед эзэн нь зургаа/нэрээ ҮРГЭЛЖ харна', () => {
  assert.match(SELLER_CODE, /const\s+isOwner\s*=\s*Boolean\(user\s*&&\s*user\.id\s*===\s*sellerId\)/, '`isOwner` шалгалт алга');
  assert.match(SELLER_CODE, /ТАНЫ БҮРТГЭЛ/, '«ТАНЫ БҮРТГЭЛ» шошго алга');
});

t('⑨ НИЙТЭД харагдах нэр нь `display_name` (хоч нэр) → хоосон бол `name`', () => {
  assert.match(
    SELLER_CODE,
    /setProfileName\(String\(p\.display_name\s*\|\|\s*p\.name\s*\|\|\s*''\)/,
    '`display_name || name` дараалал алга (жинхэнэ нэр нийтэд үлдэхээр байна)'
  );
});

// ---------- Зураггүй үеийн fallback — `Avatar` дотор ----------
t('⑩ `Avatar` нь зураггүй үед нэрийн ЭХНИЙ ҮСГИЙГ үзүүлнэ (мөр хоосон биш)', () => {
  assert.match(AVATAR_CODE, /if\s*\(src\)\s*\{/, '`src` шалгалт алга');
  assert.match(AVATAR_CODE, /charAt\(0\)\.toUpperCase\(\)\s*\|\|\s*'\?'/, 'үсгийн fallback алга');
});

t('⑪ `Avatar` нь `rounded-lg` (тэгш өнцөгт) — хэрэглэгчийн хэв (2026-10-07)', () => {
  assert.match(AVATAR_CODE, /rounded-lg/, '`rounded-lg` алга');
  assert.doesNotMatch(AVATAR_CODE, /rounded-full/, '`rounded-full` байх ЁСГҮЙ');
});

t('⑫ `Avatar` нь `next/image` БИШ `<img>` (Storage-ийн нийтийн URL)', () => {
  assert.doesNotMatch(AVATAR_CODE, /next\/image/, '`next/image` хэрэглэж болохгүй');
  assert.match(AVATAR_CODE, /<img/, '`<img>` алга');
});

// ---------- Регресс: өмнөх зүйлс хэвээр ----------
t('⑬ ⏳ (64)(66) Зарын дэлгэрэнгүй хуудсан дээрх карт ХӨНДӨӨГДӨӨГҮЙ (Avatar 96px)', () => {
  assert.match(DET_CODE, /<Avatar\s+src=\{author\s*&&\s*author\.avatarUrl\}\s+name=\{sellerName\}\s+size=\{96\}\s*\/>/, '(64)-ийн картын бүтэц өөрчлөгдсөн байна (🆕 (66): 64 → 96px)');
});

t('⑭ Нийтлэгчийн хуудасны бусад үйлдэл ХЭВЭЭР (утас · мессеж · зарын тоо)', () => {
  assert.match(SELLER_CODE, /Холбоо барих/, '«Холбоо барих» товч алга');
  assert.match(SELLER_CODE, /MessageButton/, '`MessageButton` алга');
  assert.match(SELLER_CODE, /📋 Нийт \{counts\.all\} зар/, 'зарын тоо алга');
});

console.log(`\n✅ ${passed}/${passed} шалгалт АМЖИЛТТАЙ\n`);
