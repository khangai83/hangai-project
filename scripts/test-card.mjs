// ============================================================
// test-card.mjs — 📇 ЗАРЫН КАРТЫН ДИЗАЙНЫ ГЭРЭЭ (2026-10-09: БОСОО хэв)
//
// Хэрэглэгчийн хүсэлт: «зарыг харуулж байгаа картын загварыг дуурааж
// хийнэ үү» + **жишиг сайт**-ын нүүр ба зарын дэлгэрэнгүй дээрх картууд:
//   • ЗУРАГ нь ДЭЭРЭЭ, БҮТЭН өргөн (`aspect-[4/3]`) + «🖼 1/16» (баруун доод)
//   • доор нь мэдээллийн багана: нийтлэгчийн band (Avatar + нэр + ✅)
//   • ҮНЭ (том bold) БА ❤️ НЭГ МӨРӨНД — үнэ зүүн, зүрхэн баруун
//   • 2 МӨРТ гарчиг → дэлгэрэнгүй мөр → доод мета мөр (🕒 огноо | 📍 хаяг | 👁)
//   • ЖАГСААЛТ нь БАГАНАТ GRID (нүүр · /favorites · /history · /sellers)
//
// ⏳ 2026-10-03 → 2026-10-09 ХЭВ СОЛИГДСОН: карт ХЭВТЭЭ байв (зураг зүүн
//    `sm:w-[42%]` + `sm:h-[300px]`, үнэ/гарчиг баруун, ❤️ доод мета мөрөнд).
//
// ЯАГААД ХЭРЭГТЭЙ ВЭ:
//   Карт нь 4 ГАЗАРТ харагддаг (нүүр · Таалагдсан · Үзсэн түүх · Нийтлэгч)
//   тул дизайны гол шинжүүд (зургийн харьцаа, үнэ/гарчиг дараалал, ❤️-ийн
//   байрлал, мета мөр) санамсаргүй өөрчлөгдвөл олон хуудас зэрэг эвдэрнэ ✗
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
t('📐 Карт нь БОСОО (`flex-col`) + `data-listing-card` (🆕 2026-10-09: хэвтээ ХЭВ ХАСАГДАВ)', () => {
  assert.match(CARD_CODE, /data-listing-card/, 'CDP-ийн дэгээ (`data-listing-card`) алга ✗');
  // ⚠️ ХЭВТЭЭ картын ул мөр БАЙХГҮЙ (регресс хориг) — карт одоо БОСОО ✓
  assert.ok(!/sm:flex-row/.test(CARD_CODE), 'хуучин хэвтээ layout (`sm:flex-row`) буцаж орсон ✗');
  assert.ok(!/sm:h-\[300px\]/.test(CARD_CODE), 'бэхлэгдсэн өндөр (`sm:h-[300px]`) буцаж орсон ✗');
});

t('🖼 Зураг нь ДЭЭРЭЭ бүтэн өргөн — `aspect-[4/3]` (`sm:w-[42%]`/`h-52` ХАСАГДСАН)', () => {
  assert.match(CARD_CODE, /aspect-\[4\/3\]/, 'зургийн харьцаа (`aspect-[4/3]`) алга ✗');
  assert.match(CARD_CODE, /aspect-\[4\/3\] w-full shrink-0/, 'зураг бүтэн өргөн (`w-full`) биш ✗');
  assert.ok(!/sm:w-\[42%\]/.test(CARD_CODE), 'хуучин зүүн баганын өргөн (`sm:w-[42%]`) үлдсэн ✗');
  assert.ok(!/h-52\b/.test(CARD_CODE), 'хуучин мобайл өндөр (`h-52`) үлдсэн ✗');
});

t('🧱 ЖАГСААЛТ нь БАГАНАТ GRID — нүүр · Таалагдсан · Түүх · Нийтлэгч (2026-10-09)', () => {
  // ⚠️ Босоо карт нь 1 БАГАНАД тохирохгүй (хэт өргөн) ⇒ хуудас бүр GRID-тэй
  assert.match(HOME, /className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"/,
    'нүүр хуудасны картын GRID алга ✗');
  assert.match(readSrc('components/FavoritesClient.jsx'), /grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3/,
    '/favorites-ийн картын GRID алга ✗');
  assert.match(readSrc('components/SearchHistoryClient.jsx'), /grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3/,
    '/history-ийн картын GRID алга ✗');
  assert.match(readSrc('components/SellerListingsClient.jsx'), /grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3/,
    'нийтлэгчийн заруудын GRID алга ✗');
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

t('❤️/🤍 нь ҮНИЙ МӨРӨНД (`ml-auto`) — ⏳ доод мета мөрөнд БАЙХГҮЙ (2026-10-09)', () => {
  // 🆕 Хэрэглэгчийн хүсэлт: жишиг сайт шиг — үнэ зүүн, зүрхэн БАРУУН
  assert.match(CARD_CODE, /<div className="flex items-start gap-2">/,
    'үнэ + ❤️-ийн НЭГ мөр (`flex items-start gap-2`) алга ✗');
  assert.match(CARD_CODE, /ml-auto inline-flex shrink-0 items-center gap-1 rounded-full/,
    '❤️ товчны `ml-auto` (баруун захад тогтоох) алга ✗');
  // ⚠️ Доод мета мөрөнд `toggleFavorite` БУЦАЖ ОРОХ ЁСГҮЙ (1 л удаа дуудагдана ✓)
  assert.equal((CARD_CODE.match(/toggleFavorite\(listing\.id\)/g) || []).length, 1,
    '`toggleFavorite` нь 1-ээс олон газар дуудагдаж байна ✗');
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
t('🖼 Зургийн тоо «1/N» — `imageCount > 1` үед л + БАРУУН ДООД буланд (2026-10-09)', () => {
  assert.match(CARD_CODE, /imageCount > 1/, 'зургийн тооны хаалт (`imageCount > 1`) алга ✗');
  assert.match(CARD_CODE, /🖼 1\/\{imageCount\}/, '«🖼 1/N» текст алга ✗');
  assert.match(CARD_CODE, /images\.length/, '`images.length` уншихгүй ✗');
  // ⚠️ Баруун ДЭЭД булан нь /favorites-ийн «Хасах» товчинд чөлөөтэй байх ёстой ✓
  assert.match(CARD_CODE, /absolute bottom-2 right-2 flex h-6/, 'тоо нь баруун доод буланд БИШ ✗');
  assert.ok(!/absolute right-2 top-2 flex h-6/.test(CARD_CODE), 'тоо баруун дээд буланд буцаж орсон ✗');
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
t('📅 Доод мета мөр: 🕒 `timeAgo` | 📍 `formatAddress` + 👁 views (❤️ ГАРАХГҮЙ)', () => {
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

