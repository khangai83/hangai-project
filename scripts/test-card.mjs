// ============================================================
// test-card.mjs — 📇 ЗАРЫН КАРТЫН ДИЗАЙНЫ ГЭРЭЭ (2026-10-03)
//
// Хэрэглэгчийн хүсэлт: «зарын картын дизайн их зүгээр юмаа, ийм дизайнтай
// болгоорой» + **жишиг сайт**-ийн жишээ картууд (ажил · орон сууц) —
//   • зүүн талд ТОМ зураг (42%) + «🖼 1/16» зургийн тоо
//   • мэдээллийн хэсгийн ДЭЭД талд нийтлэгчийн band (Avatar + нэр + ✅)
//   • ТОМ bold ТОВЧ үнэ → 2 МӨРТ гарчиг → дэлгэрэнгүй мөр → доод мета мөр
//   • доод мета мөр: 🕒 огноо | 📍 хаяг  …  👁 үзсэн  ❤️/🤍
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Карт нь 4 ГАЗАРТ харагддаг (нүүр · Таалагдсан · Зар нийтлэгч · газрын
//   зураг) тул дизайны гол шинжүүд (өндөр, зургийн харьцаа, үнэ/гарчиг
//   дараалал, ❤️ toggle) санамсаргүй өөрчлөгдвөл олон хуудас зэрэг эвдэрнэ ✗
//   — энэ тест тэр гэрээг код дээр бариулна ✓
//
// ⚠️ ХАДГАЛАГДСАН ДҮРМҮҮД (регресс — өмнөх хэрэглэгчийн шийдвэрүүд):
//   ① «Үнэ тохирно» карт дээр ГАРАХГҮЙ (`hasRealPrice` хаалт)
//   ② «Зарах / Түрээслэх» badge ЗӨВХӨН үл хөдлөхөд
//   ③ ❤️/🤍 нь favourite toggle БА нийт тоо (listings.likes)
//   ④ Карт бүхэлдээ нэг `<Link>` — дотор нь өөр `<Link>` БАЙХГҮЙ
//   ⑤ Үнэ нь ТОВЧ форматтай — «760 сая ₮» (🆕 2026-10-06, `shortPriceLabel`;
//      «760,000,000» ХАРАГДАХГҮЙ — урт `priceLabel` нь зөвхөн экспорт/админд ✓)
//
// АЖИЛЛУУЛАХ:  npm run test:card
// ⚠️ DB/React ХОЛБОГДОХГҮЙ — зөвхөн Node (эх кодын ГЭРЭЭ).
// ============================================================
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(here, '..');

const readSrc = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** Комментгүй ЦЭВЭР КОД — «хасагдсан» гэсэн ТАЙЛБАР нь зүй ёсны тул
 *  шалгалтыг зөвхөн кодын мөрүүд дээр хийнэ (хуурамч улаан гарахгүй ✓) */
const codeOnly = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

let passed = 0;
const t = (name, fn) => {
  fn();
  passed += 1;
  console.log(`  ✓ ${name}`);
};

const CARD = readSrc('components/ListingCard.jsx');
const CARD_CODE = codeOnly(CARD);
const HOME = readSrc('components/HomeClient.jsx');

console.log('\n🧪 Зарын карт — жишиг сайт хэв (components/ListingCard.jsx)\n');

// ---------- ① БҮТЭЦ / ХЭМЖЭЭ ----------
t('📐 Карт нь хэвтээ (`sm:flex-row`) + өндөр `sm:h-[300px]` + `data-listing-card`', () => {
  assert.match(CARD_CODE, /sm:h-\[300px\]/, 'картын өндөр `sm:h-[300px]` алга ✗');
  assert.match(CARD_CODE, /sm:flex-row/, 'хэвтээ layout (`sm:flex-row`) алга ✗');
  assert.match(CARD_CODE, /data-listing-card/, 'CDP-ийн дэгээ (`data-listing-card`) алга ✗');
});

t('🖼 Зураг нь зүүн талд `sm:w-[42%]` + `sm:h-full` (мобайлд `h-52` auto)', () => {
  assert.match(CARD_CODE, /sm:w-\[42%\]/, 'зургийн өргөн `sm:w-[42%]` алга ✗');
  assert.match(CARD_CODE, /sm:h-full/, 'зураг картын өндрийг дүүргэхгүй ✗');
  assert.match(CARD_CODE, /h-52\b/, 'мобайл зургийн өндөр (`h-52`) алга ✗');
});

// ---------- ② МЭДЭЭЛЛИЙН ДАРААЛАЛ ----------
t('💰 Үнэ нь ТОМ bold (`text-[22px] font-extrabold`) + ТОВЧ формат (`shortPriceLabel`)', () => {
  assert.match(CARD_CODE, /text-\[22px\]/, 'үнийн хэмжээ `text-[22px]` алга ✗');
  assert.match(CARD_CODE, /font-extrabold/, 'үнэ bold (`font-extrabold`) биш ✗');
  // 🆕 2026-10-06 (хэрэглэгчийн хүсэлт): «760,000,000» БИШ «760 сая ₮» харагдана
  assert.match(CARD_CODE, /shortPriceLabel\(listing\)/, 'үнэ товч шошгоор (`shortPriceLabel`) гарахгүй ✗');
  // ⚠️ Урт хэлбэр (`priceLabel`) карт дээр БУЦАЖ ОРОХ ЁСГҮЙ (export/админ ХӨНДӨӨГДӨӨГҮЙ ✓)
  assert.ok(!/\bpriceLabel\b/.test(CARD_CODE), 'карт дээр урт `priceLabel` буцаж орсон ✗');
});

t('🏷️ Гарчиг нь 2 МӨР (`line-clamp-2`) — `listingTitle` (0027)', () => {
  assert.match(CARD_CODE, /line-clamp-2 text-\[15px\]/, 'гарчиг 2 мөр (`line-clamp-2 text-[15px]`) биш ✗');
  assert.match(CARD_CODE, /listingTitle\(listing\)/, '`listingTitle` ашиглахгүй ✗');
});

t('🗑 📝 Тайлбар (`listing.description`) карт дээр БАЙХГҮЙ (2026-10-06)', () => {
  // Хэрэглэгчийн хүсэлт: «Нүүр хуудас дээрх зарын карт дээрээс Тайлбарыг
  // байхгүй болго». ⏳ Хуучин `line-clamp-2 text-[14px]` тайлбарын `<p>` ба
  // `listing.description`-ыг унших код `ListingCard`-ээс ХАСАГДСАН ✓
  // ⚠️ Дэлгэрэнгүй хуудсанд (`ListingDetailClient`) Тайлбар ХЭВЭЭР ✓
  assert.ok(!/listing\.description/.test(CARD_CODE), 'карт дээр `listing.description` буцаж орсон ✗');
  assert.ok(!/line-clamp-2 text-\[14px\] leading-relaxed/.test(CARD_CODE), 'тайлбарын `<p>` буцаж орсон ✗');
});

t('👤 Нийтлэгчийн band нь 28px Avatar + нэр + ✅ VerifiedBadge', () => {
  assert.match(CARD_CODE, /author\?\.displayName/, '`author.displayName` шалгахгүй ✗');
  // 🆕 2026-10-08 (71): нэр/зураг нь `authorName`/`authorAvatar` хувьсагчаар дамжина
  //    — зар тус бүрийн «Профайл нэрээ зар дээр гаргах уу? → Үгүй»
  //    (`listing.show_name === false`) үед band БҮХЭЛДЭЭ ГАРАХГҮЙ ✓
  assert.match(CARD_CODE, /const\s+authorVisible\s*=\s*listing\.show_name\s*!==\s*false/,
    '`show_name` шалгалт алга ✗ (нэр нуух тохиргоо ажиллахгүй)');
  assert.match(CARD_CODE, /<Avatar src=\{authorAvatar\} name=\{authorName\} size=\{28\}/,
    'band-ий 28px Avatar алга ✗');
  assert.match(CARD_CODE, /<VerifiedBadge size=\{13\}/, 'band-ий ✅ badge алга ✗');
});

// ---------- ③ ЗУРАГ ДЭЭРХ ТЭМДЭГҮҮД ----------
t('🖼 Зургийн тоо «1/N» — `imageCount > 1` үед л', () => {
  assert.match(CARD_CODE, /imageCount > 1/, 'зургийн тооны хаалт (`imageCount > 1`) алга ✗');
  assert.match(CARD_CODE, /🖼 1\/\{imageCount\}/, '«🖼 1/N» текст алга ✗');
  assert.match(CARD_CODE, /images\.length/, '`images.length` уншихгүй ✗');
});

t('🎥 Видео badge — зөвхөн `listing.video_url` үед', () => {
  assert.match(CARD_CODE, /listing\.video_url &&/, 'видео badge-ийн хаалт алга ✗');
  assert.match(CARD_CODE, /🎥 Видео/, '«🎥 Видео» текст алга ✗');
});

t('🏷️ «Зарах / Түрээслэх» badge — ЗӨВХӨН үл хөдлөхөд (`isRealEstate`)', () => {
  assert.match(CARD_CODE, /isRealEstate &&/, 'badge нь `isRealEstate`-ээр хязгаарлагдахгүй ✗');
  assert.match(CARD_CODE, /badge-sell/, '`badge-sell` класс алга ✗');
  assert.match(CARD_CODE, /badge-rent/, '`badge-rent` класс алга ✗');
});


// ---------- ④ ДООД МЕТА МӨР ----------
t('📅 Доод мета мөр: 🕒 `timeAgo` | 📍 `formatAddress` + 👁 views + ❤️ toggle', () => {
  assert.match(CARD_CODE, /timeAgo\(listing\.created_at\)/, 'огноо (`timeAgo`) алга ✗');
  assert.match(CARD_CODE, /address &&/, 'хаягийн хаалт алга ✗');
  assert.match(CARD_CODE, /formatAddress\(listing\)/, 'хаяг (`formatAddress`) алга ✗');
  assert.match(CARD_CODE, /👁 \{views\}/, '👁 үзсэн тоо алга ✗');
});

t('❤️/🤍 нь favorite toggle — `preventDefault` + `stopPropagation` (Link доторх товч)', () => {
  assert.match(CARD_CODE, /toggleFavorite\(listing\.id\)/, '`toggleFavorite` дуудахгүй ✗');
  assert.match(CARD_CODE, /e\.preventDefault\(\)/, 'карт руу шилжихээс сэргийлэхгүй ✗');
  assert.match(CARD_CODE, /e\.stopPropagation\(\)/, '`stopPropagation` алга ✗');
  assert.match(CARD_CODE, /isFav \? '❤️' : '🤍'/, '❤️/🤍 сэлгэхгүй ✗');
});

t('🛡 /favorites-ийн «Хасах» товчтой мөргөлдөхгүй — доод мөр `max-sm:pr-20`', () => {
  assert.match(CARD_CODE, /pr-20/, 'доод мөрний `pr-20` нөөц алга ✗');
  assert.match(CARD_CODE, /sm:pr-0/, 'desktop дээр `sm:pr-0` (нөөцийг арилгах) алга ✗');
});

// ---------- ⑤ ХАДГАЛАГДСАН ДҮРМҮҮД (регресс) ----------
t('① «Үнэ тохирно» карт дээр ГАРАХГҮЙ — `hasRealPrice` хаалт + `negotiableNote` ОРУУЛААГҮЙ', () => {
  assert.match(CARD_CODE, /hasRealPrice\(listing\) &&/, 'үнийг `hasRealPrice`-ээр хаахгүй ✗');
  assert.ok(!/negotiableNote/.test(CARD_CODE), '`negotiableNote` карт дээр орох ёсгүй ✗');
  assert.ok(!/NEGOTIABLE_PRICE_LABEL/.test(CARD_CODE), '«Үнэ тохирно» шошго карт дээр бичигдэх ёсгүй ✗');
});

t('④ Карт нь НЭГ `<Link>` — дотор нь өөр `<Link>` БАЙХГҮЙ', () => {
  const links = CARD_CODE.match(/<Link\b/g) || [];
  assert.equal(links.length, 1, `карт дотор ${links.length} <Link> байна (1 байх ёстой) ✗`);
});

t('🧩 🔧 зургийн класс нь placeholder-т `getPropertyIcon` хэвээр (зураггүй зар эвдрэхгүй)', () => {
  assert.match(CARD_CODE, /getPropertyIcon\(listing\.property_type, listing\.section\)/,
    'зураггүй үеийн icon (`getPropertyIcon`) алга ✗');
});

// ---------- ⑥ HomeClient-тэй холбоос ----------
t('🔗 HomeClient нь `attrsLine` (formatAttrsLine) ба `author`-ыг дамжуулна', () => {
  assert.match(HOME, /<ListingCard/, 'HomeClient нь `ListingCard` render хийхгүй ✗');
  assert.match(HOME, /attrsLine=\{formatAttrsLine\(/, '`attrsLine` дамжуулахгүй ✗');
  assert.match(HOME, /author=\{authors\[l\.user_id\]\}/, '`author` дамжуулахгүй ✗');
});

console.log(`\n✅ БҮГД ОК: ${passed} тест\n`);

