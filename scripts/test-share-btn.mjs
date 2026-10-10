// ============================================================
// test-share-btn.mjs — 🔗 «ХУВААЛЦАХ» ТОВЧНЫ ГЭРЭЭ (2026-10-07)
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (эх): «зар хуваалцах буюу зарын link хуулж авах
//    товчийг Үзсэн, хуваалцахынхаа хажууд оруулаад ирвэл зүгээр л юм»
//    ⇒ дэлгэрэнгүй хуудасны gallery footer-т `🔗 Хуваалцах` ТОВЧ нэмэгдэв
//      (`components/ShareButton.jsx` — дарахад зарын линк clipboard-д).
//
// 🎯 ХЭРЭГЛЭГЧИЙН ХҮСЭЛТ (2 дахь засвар): «Хуваалцах ыг Таалагдсаны ард
//    талд нь хийчих л дээ»
//    ⇒ дараалал болов: 👁 үзсэн → 🤍/❤️ таалагдсан → 🔗 Хуваалцах (ХАМГИЙН АРД)
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Энэ footer нь хуудасны ЦОР ГАНЦ «үзсэн/таалагдсан/хуваалцах» мөр тул
//   товчнуудын ДАРААЛАЛ санамсаргүй өөрчлөгдвөл (ж: ШУУД «Хуваалцах» гарч
//   ирвэл) хэрэглэгчийн хүссэн хэв эвдэрнэ ✗ — энэ тест тэр гэрээг бариулна.
//
// ХАМРАХ ХҮРЭЭ (DB/React/CDP ХОЛБОГДОХГҮЙ — зөвхөн Node):
//   ① `components/ListingDetailClient.jsx` — footer дахь ДАРААЛАЛ
//   ② `components/ShareButton.jsx` — clipboard механизм (clipboard → execCommand)
//
// АЖИЛЛУУЛАХ:  npm run test:share-btn
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Комментгүй ЦЭВЭР КОД — «хасагдсан/шилжүүлсэн» гэсэн ТАЙЛБАР нь зүй ёсны
 *  тул дараалалын шалгалтыг зөвхөн кодын мөрүүд дээр хийнэ (хуурамч улаан ✗) */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

console.log('\n🔗 «Хуваалцах» товч — gallery footer дахь ДАРААЛАЛ\n');

const DET = readSrc('components/ListingDetailClient.jsx');
const DET_CODE = codeOnly(DET);
const SHARE = readSrc('components/ShareButton.jsx');

// ---------- ① ДАРААЛАЛ: 👁 үзсэн → 🤍/❤️ таалагдсан → 🔗 Хуваалцах ----------
t('📋 Мета мөрийн дараалал: `EyeIcon` үзсэн → `🤍/❤️ таалагдсан` → `🔗 Хуваалцах` ✓', () => {
  // 🆕 2026-10-10 (96): ⏳ `👁 {viewCount} үзсэн` → `<EyeIcon /> {viewCount}`
  // 🆕 2026-10-10 (97): ⏳ галерейн footer → ТОЛГОЙН мета мөр; текст нь зөвхөн
  //    тоо (`{viewCount}`) — жишиг сайтын «👁 37» хэв ⇒ байрлалыг түгжихэд
  //    `{viewCount}` текст хангалттай ✓
  const iViews = DET_CODE.indexOf('{viewCount}');
  const iLike = DET_CODE.indexOf('toggleFavorite(listing.id)');
  const iShare = DET_CODE.indexOf('<ShareButton');
  assert.ok(iViews >= 0, '`{viewCount}` span олдсонгүй ✗');
  assert.match(DET_CODE, /<EyeIcon\b/, '`EyeIcon` (👁 emoji биш) алга ✗');
  assert.ok(!/👁/.test(DET_CODE), '👁 emoji буцаж орсон ✗ ((96): `EyeIcon` байх ЁСТОЙ)');
  assert.ok(iLike > iViews, '`🤍/❤️ таалагдсан` нь `👁 үзсэн`-ий ДАРАА байх ёстой ✗');
  assert.ok(iShare > iLike,
    '`🔗 Хуваалцах` нь `🤍/❤️ таалагдсан`-ий ДАРАА байх ёстой ✗ '
    + '(хэрэглэгч: «Хуваалцах ыг Таалагдсаны ард талд нь хийчих л дээ»)');
});

t('🔗 `<ShareButton />` нь явган `👁 …`-ийн ЯГ ХАЖУУД БИШ (хуучин байрлал БУЦАХГҮЙ) ✓', () => {
  // ⚠️ Хуучин байрлалд 👁-ийн дараа ШУУД <ShareButton /> ирдэг байв ✗ —
  //    одоо 👁-ийн дараа эхлээд 🤍/❤️ таалагдсан товч орсон байх ёстой.
  const after = DET_CODE.slice(DET_CODE.indexOf('{viewCount}'));
  const iLike = after.indexOf('toggleFavorite(listing.id)');
  const iShare = after.indexOf('<ShareButton');
  assert.ok(iLike >= 0 && iLike < iShare, '👁-ийн дараа ШУУД Хуваалцах буцсан ✗');
});

t('🔢 `<ShareButton />` мета мөрөнд ЯГ 1 удаа (import-д биш, JSX-д) ✓', () => {
  assert.equal((DET_CODE.match(/<ShareButton/g) || []).length, 1,
    '`<ShareButton` нь ЯГ 1 байх ёстой ✗');
  assert.match(DET, /import ShareButton from '\.\/ShareButton'/,
    '`ShareButton` import дутуу ✗');
});

// ---------- ② ShareButton.jsx — clipboard гэрээ ----------
t('📋 `ShareButton` нь `navigator.clipboard` → `document.execCommand(\'copy\')` НӨӨЦ ✓', () => {
  assert.match(SHARE, /navigator\.clipboard\.writeText\(/, '`navigator.clipboard.writeText` алга ✗');
  assert.match(SHARE, /document\.execCommand\('copy'\)/, '`execCommand(\'copy\')` fallback алга ✗');
  assert.match(SHARE, /window\.isSecureContext/, 'secure context шалгалт алга ✗');
});

t('📋 Линк нь ЗӨВХӨН дарах МӨЧИД уншигдана (`window.location.href`) — SSR крашгүй ✓', () => {
  assert.match(SHARE, /window\.location\.href/, '`window.location.href` алга ✗');
  assert.match(SHARE, /typeof window !== 'undefined'/,
    'SSR хамгаалалт (`typeof window !== \'undefined\'`) алга ✗');
});

t('🔗 Товчны бичиг/дэгээ: `label = \'Хуваалцах\'` + `data-share-button` + `🔗` icon ✓', () => {
  assert.match(SHARE, /label = 'Хуваалцах'/, 'анхдагч `label` «Хуваалцах» алга ✗');
  assert.match(SHARE, /data-share-button/, 'CDP-ийн дэгээ (`data-share-button`) алга ✗');
  assert.match(SHARE, /\{copied \? '✓' : '🔗'\}/, '`🔗` → `✓` сэлгэлт алга ✗');
});

console.log(`\n✅ БҮГД ОК: ${passed} тест — «Хуваалцах» нь 🤍/❤️ таалагдсаны АРД; `
  + 'clipboard → execCommand fallback ✓\n');
